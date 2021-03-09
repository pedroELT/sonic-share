const os = require('os');

const debug = process.env.DEBUG || false;

class FileManager {
  constructor(data) {
    this.rootFolder = process.env.SONIC_SHARE_FOLDER || (debug ? 'shares' : os.homedir());
    this.foldersPath = data ? data.filter(dataPath => dataPath) : [];
  }

  getData() {
    return {
      root: this.rootFolder,
      path: this.foldersPath
    }
  }

  getCurrentPath() {
    return `${this.rootFolder}${this.foldersPath.length ? '/' : ''}${this.foldersPath.join('/')}`;
  }

  getCurrentFolder() {
    return !this.foldersPath.length ? this.rootFolder : this.foldersPath[this.foldersPath.length - 1];
  }

  up() {
    this.foldersPath.pop();
  }

  down(folder) {
    this.foldersPath.push(folder);
  }

}

exports.FileManager = FileManager;