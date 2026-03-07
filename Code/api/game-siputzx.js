import fetch from 'node-fetch'

const TIMER = 60000 // 1 minute
const REWARD_MONEY = 200
const REWARD_EXP = 500

const GAME_TYPES = {
    'asahotak': { endpoint: 'asahotak', title: '🧠 *ASAH OTAK*', q: 'soal', a: 'jawaban' },
    'caklontong': { endpoint: 'caklontong', title: '😂 *CAK LONTONG*', q: 'soal', a: 'jawaban', hint: 'deskripsi' },
    'lengkapikalimat': { endpoint: 'lengkapikalimat', title: '📝 *LENGKAPI KALIMAT*', q: 'pertanyaan', a: 'jawaban' },
    'susunkata': { endpoint: 'susunkata', title: '🔠 *SUSUN KATA*', q: 'soal', a: 'jawaban', type: 'tipe' },
    'tebaktebakan': { endpoint: 'tebaktebakan', title: '🤔 *TEBAK-TEBAKAN*', q: 'soal', a: 'jawaban' },
    'tebakbendera': { endpoint: 'tebakbendera', title: '🚩 *TEBAK BENDERA*', q: 'img', a: 'name', media: 'image' },
    'tebakgambar': { endpoint: 'tebakgambar', title: '🖼️ *TEBAK GAMBAR*', q: 'img', a: 'jawaban', media: 'image', hint: 'deskripsi' },
    'tebakgame': { endpoint: 'tebakgame', title: '🎮 *TEBAK GAME*', q: 'img', a: 'jawaban', media: 'image' },
    'tebakheroml': { endpoint: 'tebakheroml', title: '🛡️ *TEBAK HERO ML*', q: 'img', a: 'jawaban', media: 'image' },
    'tebakhewan': { endpoint: 'tebakhewan', title: '🦁 *TEBAK HEWAN*', q: 'img', a: 'jawaban', media: 'image' },
    'tebakjkt': { endpoint: 'tebakjkt', title: '✨ *TEBAK JKT48*', q: 'gambar', a: 'jawaban', media: 'image' },
    'kabupaten': { endpoint: 'kabupaten', title: '🗺️ *TEBAK KABUPATEN*', q: 'gambar', a: 'jawaban', media: 'image' },
    'tebakkalimat': { endpoint: 'tebakkalimat', title: '📋 *TEBAK KALIMAT*', q: 'soal', a: 'jawaban' },
    'tebakff': { endpoint: 'karakter-freefire', title: '🔫 *TEBAK FF*', q: 'gambar', a: 'jawaban', media: 'image' },
    'karakter-freefire': { endpoint: 'karakter-freefire', title: '🔫 *TEBAK FF*', q: 'gambar', a: 'jawaban', media: 'image' },
    'tebakkartun': { endpoint: 'tebakkartun', title: '🎥 *TEBAK KARTUN*', q: 'img', a: 'name', media: 'image' },
    'tebakkata': { endpoint: 'tebakkata', title: '💬 *TEBAK KATA*', q: 'soal', a: 'jawaban' },
    'tebakkimia': { endpoint: 'tebakkimia', title: '🧪 *TEBAK KIMIA*', q: 'unsur', a: 'lambang' },
    'tebaklagu': { endpoint: 'tebaklagu', title: '🎵 *TEBAK LAGU*', q: 'lagu', a: 'judul', media: 'audio' },
    'tebaklirik': { endpoint: 'tebaklirik', title: '🎤 *TEBAK LIRIK*', q: 'soal', a: 'jawaban' },
    'tebaklogo': { endpoint: 'tebaklogo', title: '🎭 *TEBAK LOGO*', q: 'gambar', a: 'jawaban', media: 'image' },
    'siapakahaku': { endpoint: 'siapakahaku', title: '🕵️ *SIAPAKAH AKU*', q: 'soal', a: 'jawaban' },
    'surah': { endpoint: 'surah', title: '📖 *TEBAK SURAH*', q: 'soal', a: 'jawaban' },
    'tebakwarna': { endpoint: 'tebakwarna', title: '🌈 *TEBAK WARNA*', q: 'image', a: 'correct', media: 'image' },
    'tekateki': { endpoint: 'tekateki', title: '🧩 *TEKA-TEKI*', q: 'soal', a: 'jawaban' }
}

let handler = async (m, { fukusima, usedPrefix, command }) => {
    fukusima.game = fukusima.game || {}
    let id = m.chat
    let msg
    if (id in fukusima.game) return m.reply('Masih ada game yang belum selesai di chat ini!')

    let gameCmd = command.toLowerCase()
    let conf = GAME_TYPES[gameCmd]
    if (!conf) return // Should not happen if command regex is right

    try {
        const res = await fetch(`https://api.siputzx.my.id/api/games/${conf.endpoint}`)
        const json = await res.json()
        if (!json.status) throw new Error('Gagal mengambil data game')

        const data = json.data
        if (!data) throw new Error('Data game kosong')

        const question = data[conf.q]
        if (!question) throw new Error('Soal game tidak ditemukan')

        const answer = (data[conf.a] || '').toString().trim()
        if (!answer) throw new Error('Jawaban game tidak ditemukan dalam data')

        const hintText = data[conf.hint] || data[conf.type] || ''

        let caption = `${conf.title}\n\n`
        if (conf.media) {
            caption += `Tebaklah ${conf.media === 'audio' ? 'judul lagu' : 'gambar'} berikut!\n\n`
        } else {
            caption += `*Pertanyaan:* ${question}\n\n`
        }

        if (hintText) caption += `_Hint: ${hintText}_\n`
        caption += `\n_Waktu 60 detik. Balas pesan ini untuk menjawab!_`

        const nativeButtons = [
            {
                buttonId: '.gameclue',
                buttonText: { displayText: '💡 CLUE' },
                type: 1
            },
            {
                buttonId: '.gamesurrender',
                buttonText: { displayText: '🏳️ MENYERAH' },
                type: 1
            }
        ]

        if (conf.media === 'image') {
            msg = await fukusima.sendMessage(m.chat, {
                image: { url: question },
                caption: caption,
                footer: 'Alkam Games',
                buttons: nativeButtons,
                viewOnce: true
            }, { quoted: m })
        } else if (conf.media === 'audio') {
            await fukusima.sendMessage(m.chat, { audio: { url: question }, mimetype: 'audio/mpeg' }, { quoted: m })
            msg = await fukusima.sendMessage(m.chat, {
                text: caption,
                footer: 'Alkam Games',
                buttons: nativeButtons,
                viewOnce: true
            }, { quoted: m })
        } else {
            msg = await fukusima.sendMessage(m.chat, {
                text: caption,
                footer: 'Alkam Games',
                buttons: nativeButtons,
                viewOnce: true
            }, { quoted: m })
        }

        fukusima.game[id] = {
            id,
            msg,
            conf,
            data,
            answer: answer.toLowerCase(),
            clue: answer.replace(/[A-Za-z0-9]/g, (v, i) => i % 2 === 0 ? v : '_'),
            timer: setTimeout(() => {
                if (fukusima.game[id]) {
                    fukusima.reply(id, `⌛ *WAKTU HABIS!*\n\nJawaban: *${answer.toUpperCase()}*`, fukusima.game[id].msg)
                    delete fukusima.game[id]
                }
            }, TIMER)
        }

    } catch (e) {
        console.error('[GAME ERROR]', e)
        m.reply('❌ Terjadi kesalahan saat mengambil soal. Coba lagi.')
    }
}

handler.before = async function (m) {
    this.game = this.game || {}
    let id = m.chat
    if (!(id in this.game)) return false
    let game = this.game[id]

    // Handle Buttons
    if (m.text === '.gameclue') {
        m.reply(`💡 Clue: *${game.clue.toUpperCase()}*`)
        return true
    }

    if (m.text === '.gamesurrender') {
        await this.reply(id, `🏳️ *MENYERAH!*\n\nJawaban: *${game.answer.toUpperCase()}*`, m)
        clearTimeout(game.timer)
        delete this.game[id]
        return true
    }

    // Handle Answer
    let text = m.text.toLowerCase().trim()
    if (text === game.answer) {
        let user = global.db.data.users[m.sender]
        if (user) {
            user.exp += REWARD_EXP
            user.money += REWARD_MONEY
        }
        await m.reply(`✅ *BENAR!*\n\nSelamat @${m.sender.split('@')[0]}! 🎉\nHadiah: +${REWARD_MONEY} 💰, +${REWARD_EXP} ✨`)
        clearTimeout(game.timer)
        delete this.game[id]
        return true
    } else {
        // Similarity Check
        if (getSimilarity(text, game.answer) >= 0.8) {
            m.reply(` sedikit lagi! jawaban *${text}* hampir benar.`)
            return true
        }
    }

    return false
}

// Similarity helpers
const getSimilarity = (s1, s2) => {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    let longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

const editDistance = (s1, s2) => {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i == 0) costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

handler.help = Object.keys(GAME_TYPES)
handler.tags = ['game']
handler.command = new RegExp(`^(${Object.keys(GAME_TYPES).join('|')})$`, 'i')
handler.group = true

export default handler
