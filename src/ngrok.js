const ngrok = require('ngrok');
const { authentify } =require('./token-manager');


class Ngrok {
  constructor(expressApp, port) {
    this.expressApp = expressApp;
    this.port = port;
    this.urlChangedCallback = undefined;
    this.url = `http://localhost:${this.port}`;

    this.expressApp.get('/share', authentify, async (req, res) => {
      res.send(this.url !== undefined);
    });

    this.expressApp.post('/share', authentify, async (req, res) => {
      try {
        if (this.url === `http://localhost:${this.port}`) {
          this.connect(this.port);
          res.send(true);
        } else {
          console.log(`Ngrok disconnecting`);
          await ngrok.disconnect();
          this.url = `http://localhost:${this.port}`;
          res.send(false);
        }
      } catch (err) {
        console.error(err);
        res.sendStatus(500, err);
      }
    });
  }

  async connect() {
    this.url = await ngrok.connect(this.port);
    if (this.urlChangedCallback) this.urlChangedCallback(this.url);
    console.log(`Ngrok connection established : ${this.url} -> http://localhost:${this.port}`);
  }

  onUrlChanged(callback) {
    this.urlChangedCallback = callback;
  }
}
exports.Ngrok = Ngrok;