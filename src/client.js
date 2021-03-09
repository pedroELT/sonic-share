const got = require('got');

class Client {
  constructor(shareServerUrl, key) {
    this.url = shareServerUrl;
    this.currentPath = [];
    this.apiKey = key;
    this.token;
  }

  async authentify() {
    this.token = (await got(`${this.url}/api/auth`, {
      method: 'POST',
      json: {
        apiKey: this.apiKey
      }
    })).body;
    console.log(this.token);
    return this.token;
  }

  async ls() {
    return JSON.parse((await got(`${this.url}/api/folder`, {
      searchParams: {
        path: this.currentPath.join('/'),
        token: this.token
      },
      headers: {
        'Accept': 'application/json'
      }
    })).body);
  }

  async addFile(name, content) {
    return (await got(`${this.url}/api/folder`, {
      method: 'POST',
      searchParams: {
        path: this.currentPath.join('/'),
        token: this.token
      },
      json: {
        file: {
          name,
          content
        }
      },
      headers: {
        'Accept': 'application/json'
      }
    })).body;
  }

  async getLink(file = '') {
    return (await got(`${this.url}/api/link`, {
      searchParams: {
        path: this.currentPath.join('/'),
        file,
        token: this.token
      },
      headers: {
        'Accept': 'application/json'
      }
    })).body;
  }

}
exports.SonicShareClient = Client;