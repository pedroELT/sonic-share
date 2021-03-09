exports.addInZip = (toZipFolder, zip, basePath = '') => {
  for (const file of readdirSync(toZipFolder)) {
    if (lstatSync(`${toZipFolder}/${file}`).isDirectory()) {
      addInZip(`${toZipFolder}/${file}`, zip, `${basePath ? basePath + '/' : ''}${file}`);
    } else {
      zip.addFile(`${toZipFolder}/${file}`, `${basePath ? basePath + '/' : ''}${file}`);
    }
  }
};