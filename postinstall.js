import { existsSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

( () => {
    if (!existsSync(`${__dirname}/syno.json`)) writeFileSync(`${__dirname}/syno.json`, '{}')
    if (!existsSync(`${__dirname}/mail.json`)) writeFileSync(`${__dirname}/mail.json`, '{}')
    if (!existsSync(`${__dirname}/passwords.json`)) writeFileSync(`${__dirname}/passwords.json`, '{}')
})()
