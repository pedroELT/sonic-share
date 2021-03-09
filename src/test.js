const { SonicShareClient } = require('./client');

const url = 'http://localhost:11219';


(async () => {
  try {
    const client = new SonicShareClient(url, 'titi');
    await client.authentify();
    console.log(await client.ls());
    client.currentPath = ['Documents'];
    console.log(await client.ls());
    console.log(await client.addFile('toto', 'lolo'));
    console.log(await client.getLink('toto'));
    
  } catch (err) {
    console.error(err);
  }
})();