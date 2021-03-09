const { getToken } =require('./token-manager');

class Login {
  constructor(expressApp) {
    this.expressApp = expressApp;
    this.adminUser = process.env.SONIC_SHARE_USER || 'admin';
    this.adminPassword = process.env.SONIC_SHARE_PASSWORD || Buffer.from('nimda').toString('base64');

    this.expressApp.get('/login', (req, res) => {
      res.render(`login`, {});
    });
    
    this.expressApp.post('/login', (req, res) => {
      if (req.body.user === this.adminUser && Buffer.from(req.body.password).toString('base64') === this.adminPassword) {
        const token = getToken();
        if (req.accepts('html')) {
          res.redirect(`/?token=${token}`);
        } else {
          res.send(token);
        }
      } else {
        res.render(`login`);
      }
    });
  }
}
exports.Login = Login;