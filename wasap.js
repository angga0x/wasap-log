const { DisconnectReason, makeWASocket, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys')
const fs = require('fs')
const moment = require('moment-timezone')


function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

let message

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: true
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connection closed due to', lastDisconnect.error, ', reconnecting:', shouldReconnect)
            if (shouldReconnect) {
                connectToWhatsApp()
            }
        } else if (connection === 'open') {
            console.log('Connection opened')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.key.fromMe && msg.message) {
            const sender = msg.key.remoteJid
            const pushname = msg.pushName

            let client_details = []
            client_details.push({
                client_info: {
                    client_phone: sender.replace('@s.whatsapp.net', ''),
                    client_name: pushname
                }
            })

            const folders = ['user_list', 'db_message']
            folders.forEach(folder => {
                if(!fs.existsSync(folder)) {
                    fs.mkdirSync(folder, { recursive: true })
                    console.log(`Folder ${folder} berhasil dibuat`)
                } else {
                    console.log(`Folder ${folder} sudah ada`)
                }
            })

            if(fs.existsSync('./user_list/users.json')) {
                const existingData = fs.readFileSync('./user_list/users.json')
                user_list = JSON.parse(existingData)
                console.log(user_list)
            }


            fs.writeFileSync(`./user_list/${sender.replace('@s.whatsapp.net', '')}.json`, JSON.stringify(client_details, null, 2))

            //batas

            const phone = sender.replace('@s.whatsapp.net', '')
            const filepath = `./db_message/${phone}.json`

            let client_message = [];
            if (fs.existsSync(filepath)) {
                const existingData = fs.readFileSync(filepath, 'utf-8');
                client_message = JSON.parse(existingData);
            }
            
            message = msg.message?.extendedTextMessage?.text || msg.message?.conversation || 'No text found';
            const now = moment.tz('Asia/Jakarta');
            
            // Hitung jarak waktu jika ada pesan sebelumnya
            let timeDifference = null;
            if (client_message.length > 0) {
                const lastMessage = client_message[client_message.length - 1];
                const lastTime = moment(lastMessage.client_message.time, 'DD/MM/YYYY - HH:mm:ss');
                timeDifference = now.diff(lastTime, 'seconds'); // Selisih waktu dalam detik
            }
            
            // Tambahkan pesan ke array client_message
            client_message.push({
                client_message: {
                    sender: pushname,
                    phone: sender.replace('@s.whatsapp.net', ''),
                    message,
                    time: now.format('DD/MM/YYYY - HH:mm:ss'),
                    timeDifference: timeDifference !== null ? `${timeDifference} detik` : 'First message'
                }
            });

            // console.log(client_message)

            fs.writeFileSync(filepath, JSON.stringify(client_message, null, 2))
            console.log(`Pesan berhasil disimpan di ${filepath}`)

            

            // if (message.includes('info') || message.includes('ada')) {
            //     await delay(3000)
            //     await sock.readMessages([msg.key])

            //     await delay(4000)
            //     await sock.sendMessage(sender, {
            //         text: `Halo kak *${pushname}* 👋,\n\nTerima kasih telah menghubungi *HRR Helmet*\nuntuk pemesanan dan detail produk lebih lanjut silahkan order melalui website kami berikut ini ya..\n\nhttps://venza.nearstore.id\n\nTerima kasih`
            //     })
            // } else {
            //     await delay(3000)
            //     await sock.readMessages([msg.key])

            //     await delay(4000)
            //     await sock.sendMessage(sender, {
            //         text: `Hai kak *${pushname}*,\n\nPesan kakak sudah kami terima dan akan kami balas sesuai antrian ya kak\n\nTerima kasih`
            //     })
            // }


            //

            await delay(3000)
            await sock.readMessages([msg.key])
            await delay(2000)

            //react
            // const reaction_msg = {
            //     react: {
            //         text: "❤",
            //         key: msg.key
            //     }
            // }

            //serlok

            // const serlok = await sock.sendMessage(sender, { location: { degreesLatitude: -4.24368718497867, degreesLongitude: 105.47848597733527 }})
            // console.log(serlok)

            // await sock.sendPresenceUpdate('composing', sender)
            // await sock.sendMessage(sender, { text: 'This is automatic reply from our system. Please wait for our response\n\nThank you' })

            // await sock.sendMessage(sender, reaction_msg)
        }
    })
}

connectToWhatsApp()
