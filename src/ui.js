const { readFileSync, readdirSync, lstatSync } = require('fs');
const path = require('path');

const { FileManager } = require('./file-manager');
const { authentify, getToken } =require('./token-manager');

class UI {
  constructor(expressApp) {
    this.expressApp = expressApp;

    this.expressApp.get('/', authentify, (req, res) => {
      const fileManager = new FileManager(req.token.path);
      res.render(`index`, {
        token: getToken(fileManager.getData()), currentFolder: fileManager.getCurrentFolder(), path: fileManager.foldersPath, root: !fileManager.foldersPath.length,
        files: readdirSync(fileManager.getCurrentPath())
          .filter(file => !file.startsWith('.'))
          .map(file => {
            return {
              name: file,
              dir: lstatSync(`${fileManager.getCurrentPath()}/${file}`).isDirectory(),
              icon: this.chooseIcon(`${fileManager.getCurrentPath()}/${file}`)
            };
          })
      });
    });
    
    this.expressApp.get('/up',  authentify, (req, res) => {
      const fileManager = new FileManager(req.token.path);
      fileManager.up();
      res.redirect(`/?token=${getToken(fileManager.getData())}`);
    });
    
    this.expressApp.get('/down/:folder',  authentify, (req, res) => {
      const fileManager = new FileManager(req.token.path);
      fileManager.down(req.params.folder);
      res.redirect(`/?token=${getToken(fileManager.getData())}`);
    });
    
    this.expressApp.get('/logo.png', (req, res) => {
      res.send(readFileSync('./assets/logo.png'));
    });
    
  }

  chooseIcon(file) {
    const extension = path.extname(file);
    switch (extension.toLowerCase()) {
      case '':
        return 'unicorn';
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.svg':
      case '.gif':
      case '.tif':
      case '.tiff':
      case '.bmp':
      case '.eps':
        return 'file-image';
      case '.webm' :
      case '.mkv' :
      case '.flv' :
      case '.ogg' :
      case '.avi' :
      case '.mp4' :
      case '.mpg' :
      case '.mpeg' :
        return 'file-video';
      case '.aac' :
      case '.mp3' :
      case '.flac' :
      case '.ogg' :
      case '.webm' :
      case '.wav' :
        return 'file-music';
      case '.pdf':
        return 'file-pdf';
      case '.js':
      case '.ts':
      case '.java':
      case '.h':
      case '.c':
      case '.json':
      case '.yaml':
      case '.yml':
      case '.html':
      case '.css':
      case '.pug':
      case '.sh':
      case '.go':
        return 'file-code';
      case '.gz':
      case '.tar':
      case '.tar.gz':
      case '.rar':
      case '.zip':
      case '.gzip':
        return 'file-archive';
      default:
        return 'book';
    }
  }
}
exports.UI = UI;