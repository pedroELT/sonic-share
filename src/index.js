#!/usr/bin/env node
const express = require('express');
const bodyParser = require('body-parser');

const { FileManager } = require('./file-manager');
const { Login } = require('./login');
const { Share } = require('./share');
const { UI } = require('./ui');
const { Ngrok } = require('./ngrok');
const { Api } = require('./api');

const debug = process.env.DEBUG || false;

class App {
  constructor() {
    this.expressApp = express();

    this.expressApp.use(bodyParser.json());
    this.expressApp.use(bodyParser.urlencoded({ extended: true }));
    this.expressApp.set('view engine', 'pug');
    this.expressApp.set('views', ['assets']);

    this.port = process.env.SONIC_SHARE_PORT || 11219;

    this.fileManager = new FileManager();
    this.login = new Login(this.expressApp);
    this.ui = new UI(this.expressApp);
    this.ngrok = new Ngrok(this.expressApp, this.port);
    this.api = new Api(this.expressApp, this.ngrok.url);
    this.share = new Share(this.expressApp, this.ngrok.url);   
    
    this.ngrok.onUrlChanged((url) => this.urlChanged(url));
  }

  urlChanged(url) {
    this.share.url = url;
    this.api.url = url;
  }

  serve() {
    this.expressApp.listen(this.port, async () => {
      console.log(`Start serving sonic share on port ${this.port}`);
      if (!debug) await this.ngrok.connect();
    });
  }
}

const shareApp = new App();
shareApp.serve();