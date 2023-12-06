import got from 'got';
import { program } from 'commander';
import FormData from 'form-data';
import { createReadStream, readFileSync, rmSync, writeFileSync } from 'fs';
import generator from 'generate-password';
import inquirer from 'inquirer';
import { v4 } from 'uuid';
import nodemailer from 'nodemailer';
import pug from 'pug';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import syno from './syno.json' assert { type: "json" };
import mail from './mail.json' assert { type: "json" };
import passwords from './passwords.json' assert { type: "json" };

const login = async () => {
    if (!syno.user || !syno.password) throw new Error('missing synology credentials, please execute : sonic-share conf syno <user> <password>')

    const sidResp = await got('https://files.sonic-tools.xyz/webapi/auth.cgi', {
        searchParams: {
            api: 'SYNO.API.Auth',
            version: '2',
            method: 'login',
            account: syno.user,
            passwd: syno.password,
            session: 'sonic-share',
            format: 'sid'
        }
    }).json()

    if (!sidResp.success) throw new Error('authentication error')

    return sidResp.data.sid
}

const logUploadShare = async (sharedContent, addPassword, expires, email) => {
    const sid = await login()
    const uploadForm = new FormData()

    uploadForm.append('api', 'SYNO.FileStation.Upload');
    uploadForm.append('version', '2');
    uploadForm.append('method', 'upload');
    uploadForm.append('create_parents', "true");
    uploadForm.append('_sid', sid);
    uploadForm.append('path', `/home/sonic-share`);
    uploadForm.append('overwrite', 'overwrite')
    uploadForm.append('file', createReadStream(sharedContent)); //


    const upload = await got.post('https://files.sonic-tools.xyz/webapi/entry.cgi', {
        body: uploadForm,
        searchParams: {
            _sid: sid
        }
    }).json()

    if (!upload.success) throw new Error(`upload failed: ${JSON.stringify(upload)}`,)

    const filename = upload.data.file
    let passwordLink;

    if (addPassword) { // cmdObj.password
        passwordLink = generator.generate({
            length: 16,
            numbers: true,
            symbols: false,
            excludeSimilarCharacters: true
        })
    }

    let expireDate = new Date()
    if (expires) { // cmdObj.expires
        expireDate = new Date(expireDate.getTime() + 1000 * 3600 * 24 * cmdObj.expires)
    }
    const expiresStr = `"${expireDate.getFullYear()}-${expireDate.getMonth() + 1 < 10 ? '0' : ''}${expireDate.getMonth() + 1}-${expireDate.getDate() < 10 ? '0' : ''}${expireDate.getDate()}"`

    const share = await got('https://files.sonic-tools.xyz/webapi/entry.cgi', {
        searchParams: {
            _sid: sid,
            api: 'SYNO.FileStation.Sharing',
            version: '3',
            method: "create",
            path: `/home/sonic-share/${filename}`,
            password: passwordLink,
            date_expired: expiresStr
        }
    }).json()

    await got('https://files.sonic-tools.xyz/webapi/auth.cgi', {
        searchParams: {
            api: 'SYNO.API.Auth',
            version: '1',
            method: 'logout',
            session: 'sonic-share'
        }
    }).json()

    if (!upload.success) throw new Error('sharing link failed')
    console.log(`https://files.sonic-tools.xyz/sharing/${share.data.links[0].id}`, 'will expires at', expiresStr)
    if (passwordLink) {
        console.log('Password:', passwordLink)
        const passwordsContent = JSON.parse(readFileSync(`${__dirname}/passwords.json`).toString())
        passwordsContent[share.data.links[0].id] = passwordLink
        writeFileSync(`${__dirname}/passwords.json`, JSON.stringify(passwordsContent, null, 4))
    }

    if (email) {
        if (!mail.user || !mail.password || !mail.host || !mail.port) throw new Error('missing mail credentials, host or port; please execute : sonic-share conf mail <host> <port> <user> <password>')

        let transporter = nodemailer.createTransport({
            host: mail.host,
            port: parseInt(mail.port),
            secure: parseInt(mail.port) === 465,
            auth: {
                user: mail.user,
                pass: mail.password
            }
        });

        let text = `A ${email.type} was shared with you.\n Here is the link: https://files.sonic-tools.xyz/sharing/${share.data.links[0].id}\nThis sharing will expires at ${expiresStr}`
        let html = pug.renderFile('./mail.pug', { link: `https://files.sonic-tools.xyz/sharing/${share.data.links[0].id}`, expires: expiresStr, type: email.type, password: passwordLink })

        let info = await transporter.sendMail({
            from: 'Sonic Share <share@sonic-tools.xyz>',
            to: email.to,
            subject: `${email.type} shared with you`,
            text,
            html
        });
        console.log("Message sent: %s", info.messageId);
    }
}

const cleanShares = async () => {
    const sid = await login()
    const shares = await got('https://files.sonic-tools.xyz/webapi/entry.cgi', {
        searchParams: {
            api: 'SYNO.FileStation.Sharing',
            version: '3',
            method: 'list',
            _sid: sid
        }
    }).json()
    
    shares.data.links.filter(share => share.status === 'expired').forEach(link => console.log(`${link.path} should be deleted`))
    await got('https://files.sonic-tools.xyz/webapi/entry.cgi', {
        searchParams: {
            api: 'SYNO.FileStation.Sharing',
            version: '3',
            method: 'clear_invalid',
            _sid: sid
        }
    }).json()
}

program.command('file <path>')
    .option('-p, --password', 'Share Link password')
    .option('-e, --expires <expires>', 'Expires In days')
    .option('-m, --mail <mail>', 'Email to shares with')
    .action(async (path, cmdObj) => {
        await logUploadShare(path, cmdObj.password, cmdObj.expires, cmdObj.mail ? { type: 'secret', to: cmdObj.mail } : undefined)
    })

program.command('secret [secret]')
    .option('-p, --password', 'Share Link password')
    .option('-e, --expires <expires>', 'Expires In days')
    .option('-m, --mail <mail>', 'Email to shares with')
    .action(async (secret, cmdObj) => {
        if (!secret) {
            process.env.VISUAL = 'vi'
            const answer = await inquirer.prompt([
                {
                    "name": "secret",
                    "type": "editor"
                }
            ])
            secret = answer.secret
        }
        let secretFile = `secret-${v4()}`
        let secretPath = `/tmp/${secretFile}`
        writeFileSync(secretPath, secret)
        await logUploadShare(secretPath, cmdObj.password, cmdObj.expires, cmdObj.mail ? { type: 'secret', to: cmdObj.mail } : undefined)
        rmSync(secretPath)
    })

program.command('pwd <linkId>')
    .action((linkId) => {
        console.log(passwords[linkId])
    })

const clean = program.command('clean')

clean.command('shares')
    .action(async () => {
        await cleanShares()
    })

clean.command('files')
    .action(async () => {
        console.log('command is not yet working')
    })

const configure = program.command('conf')

configure.command('syno <user> <password>')
    .action((user, password) => {
        writeFileSync(`${__dirname}/syno.json`, JSON.stringify({ user, password }))
    })

configure.command('mail <host> <port> <user> <password>')
    .action((user, password) => {
        writeFileSync(`${__dirname}/mail.json`, JSON.stringify({ host, port, user, password }))
    })

program.parse()