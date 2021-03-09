const { writeFileSync, existsSync, lstatSync } = require('fs');
const parseMp = require('express-parse-multipart');
const yazl = require("yazl");
const querystring = require('querystring');
const express = require('express');
const { authentify, getToken } =require('./token-manager');

const { FileManager } = require('./file-manager');

const { addInZip } = require('./utils');

class Share {
  constructor(expressApp, url) {
    this.expressApp = expressApp;
    this.rootFolder = new FileManager().rootFolder;
    this.url = url;

    this.expressApp.post('/', parseMp, authentify, (req, res) => {
      const fileManager = new FileManager(req.token.path);
      req.formData.forEach(data => {
        if (data.filename) writeFileSync(`${fileManager.getCurrentPath()}/${data.filename}`, data.data);
      });
      if (req.accepts('html')) {
        res.redirect(`/?token=${getToken(fileManager.getData())}`);
      } else {
        res.sendStatus(200);
      }
    });


    this.expressApp.get('/share/:file', authentify, (req, res) => {
      const fileManager = new FileManager(req.token.path);
      const file = `${fileManager.getCurrentPath()}/${req.params.file !== 'archive' ? req.params.file : ''}`;
      const token = getToken({ file }, 1);

      if (existsSync(file)) {
        res.send(`${this.url}/${file}?${querystring.encode({ token })}`);
      } else {
        res.sendStatus(404);
      }
    });

    this.expressApp.use(`/${this.rootFolder}`, authentify, express.static(this.rootFolder), (req, res, next) => {
      const possibleFolder = req.url.split('?')[0];
      if (existsSync(`${this.rootFolder}/${possibleFolder}`) && lstatSync(`${this.rootFolder}/${possibleFolder}`).isDirectory()) {
        res.header('Content-Type', 'application/zip')
        res.header('Content-Disposition', `attachment; filename="${possibleFolder.split('/').slice(-2, -1)}.zip"`);
        const zipfile = new yazl.ZipFile();
        zipfile.outputStream.on('data', (data) => {
          res.write(data);
        });
        zipfile.outputStream.on('end', (data) => {
          res.end();
        });
        addInZip(`${this.rootFolder}/${possibleFolder}`, zipfile);
        zipfile.end();


      } else {
        next();
      }
    });
  }
}
exports.Share = Share;