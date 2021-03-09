const { v4 } = require('uuid');
const jws = require('jsonwebtoken');

const { FileManager } = require('./file-manager');

class TokenManager {
  static instance = new TokenManager();
  constructor() {
    this.tokens = [];
    this.secret = process.env.secret || v4();

    this.rootFolder = new FileManager().rootFolder;
  }

  static getToken(data, ttl = 24) {
    const signature = jws.sign(data || new FileManager().getData(), TokenManager.instance.secret, { expiresIn: `${ttl}h` });
    TokenManager.instance.tokens.push(signature);
    return signature;
  }

  decode(token) {
    if (!this.tokens.includes(token)) throw new Error('token not known by server');
    return jws.verify(
      token,
      this.secret
    );
  }

  static authentify() {
    return  function (req, res, next) {
      let token = req.query.token || req.body.token || req.params.token;
      if (req.formData) {
        token = req.formData.reduce((reducer, data) => {
          if (data.name === 'token') reducer = data.data.toString();
          return reducer;
        }, '');
      } 

      if (TokenManager.instance.tokens.includes(token)) {
        try {
          req.token = TokenManager.instance.decode(token);
          if (req.token.file && req.token.file !== `${TokenManager.instance.rootFolder}${req.url.split('?')[0]}`) {
            console.log('wrong file access');
            TokenManager.instance.unauthorised(req, res);
          } else {
            next();
          }
        } catch (err) {
          console.log('error token decoding', err);
          TokenManager.instance.unauthorised(req, res);
        }
      } else {
        console.log('token unknown');
        TokenManager.instance.unauthorised(req, res);
      }
    };
  }

  unauthorised(req, res) {
    if (req.accepts('html')) {
      res.status(401);
      res.redirect('/login');
    } else {
      res.sendStatus(401);
    }
  }

  authentifyApi = (req, res, next) => {
    if (
      this.apiToken &&
        (
          req.query.token === this.apiToken ||
          req.body.token === this.apiToken ||
          req.params.token === this.apiToken
        )
    ) {
      next();
    } else {
      res.sendStatus(401);
    }
  }
}
exports.authentify = TokenManager.authentify();
exports.getToken = TokenManager.getToken;