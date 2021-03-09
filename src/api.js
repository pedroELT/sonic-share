const { writeFileSync, existsSync, lstatSync, readdirSync } = require('fs');
const { v4 } = require('uuid');
const querystring = require('querystring');

const { FileManager } = require('./file-manager');

const { authentify, getToken } =require('./token-manager');

class Api {
  constructor(expressApp, url) {
    this.expressApp = expressApp;
    this.url = url;

    this.apiKey = process.env.SONIC_SHARE_API_KEY || v4();

    
    this.expressApp.get('/api/folder', authentify, (req, res) => {
      const fileManager = new FileManager(req.query.path.split('/'));
      if(!existsSync(fileManager.getCurrentPath())) {
        res.status(404);
        res.send('Path does not exists');
      } else {
        res.header('Content-Type','application/json');
        res.send({
            name: fileManager.getCurrentFolder(),
            path: fileManager.getCurrentPath(),
            isRoot: fileManager.getCurrentFolder() === fileManager.rootFolder,
            content: readdirSync(fileManager.getCurrentPath())
            .filter(file => !file.startsWith('.'))
            .map(file => {
              return {
                name: file,
                dir: lstatSync(`${fileManager.getCurrentPath()}/${file}`).isDirectory()
              };
            })
          }
        );
      }
    });

    this.expressApp.post('/api/folder', authentify, (req, res) => {
      const fileManager = new FileManager(req.query.path.split('/'));
      if (!req.query.path) {
        res.status(400);
        res.send('Missing path in query');
      } else if(!req.body.file) {
        res.status(400);
        res.send('Missing file object in body');
      } else if(!req.body.file.name) {
        res.status(400);
        res.send('Missing name in file object');
      } else if(!req.body.file.content) {
        res.status(400);
        res.send('Missing content in file object');
      } else if(!existsSync(fileManager.getCurrentPath())) {
        res.status(404);
        res.send('Path does not exists');
      } else if(existsSync(`${fileManager.getCurrentPath()}/${req.body.file.name}`)) {
        res.status(400);
        res.send('File already exists');
      } else {
        writeFileSync(`${fileManager.getCurrentPath()}/${req.body.file.name}`, req.body.file.content);
        res.sendStatus(200);
      }
    });

    
    this.expressApp.get('/api/link', authentify, (req, res) => {
      if (req.query.path) {
        const fileManager = new FileManager(req.query.path.split('/'));
        const file = `${fileManager.getCurrentPath()}/${req.query.file ? req.query.file : ''}`;
        const token = getToken({ file }, 1);

        if (existsSync(file)) {
          res.send(`${this.url}/${file}?${querystring.encode({ token })}`);
        } else {
          res.sendStatus(404);
        }
      } else {
        res.status(400);
        res.send('Missing path in query');
      }
    });
    
    this.expressApp.post('/api/auth', (req, res) => {
      if (req.body.apiKey === this.apiKey) {
        res.send(getToken());
      } else {
        res.status(401);
      }
    });
  }
}
exports.Api = Api;