const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// TTS Tokoh Configuration
const TOKOH = {
    jokowi: {
        speed: -30,
        model: "id-ID-ArdiNeural-Male",
        tune: -3
    },
    megawati: {
        speed: -20,
        model: "id-ID-GadisNeural-Female",
        tune: -3
    },
    prabowo: {
        speed: -30,
        model: "id-ID-ArdiNeural-Male",
        tune: -3
    }
};

async function ttsTokoh(text, tokoh) {
    const session_hash = Math.random().toString(36).slice(2);
    
    // Prepare request payload
    const payload = {
        data: [
            tokoh,
            TOKOH[tokoh].speed,
            text,
            TOKOH[tokoh].model,
            TOKOH[tokoh].tune,
            "rmvpe",
            0.5,
            0.33
        ],
        event_data: null,
        fn_index: 0,
        trigger_id: 20,
        session_hash
    };

    // Send initial request
    await axios.post(
        "https://deddy-tts-rvc-tokoh-indonesia.hf.space/queue/join?",
        payload
    );

    // Poll for result
    const { data } = await axios.get(
        `https://deddy-tts-rvc-tokoh-indonesia.hf.space/queue/data?session_hash=${session_hash}`
    );

    let audioUrl = null;
    const lines = data.split("\n\n");
    
    for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        
        try {
            const json = JSON.parse(line.slice(6));
            if (json.msg === "process_completed") {
                audioUrl = json.output.data[2].url;
                break;
            }
        } catch (error) {
            continue;
        }
    }

    return audioUrl;
}

module.exports = {
    command: 'tts',
    description: 'Generate TTS with Indonesian figures voice',
    usage: '!tts text,tokoh\nExample: !tts halo semua,jokowi',
    async execute(msg, sock, msgHandler, args) {
        try {
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const [, ...rest] = text.split(' ');
            const fullText = rest.join(' ');
            
            if (!fullText) {
                const listTokoh = Object.keys(TOKOH)
                    .map(v => `• ${v}`)
                    .join('\n');
                    
                return await msgHandler.sendReply(msg,
                    `🎤 *TTS Tokoh Indonesia*\n\n` +
                    `📌 *Cara Pakai:*\n` +
                    `!tts teks,tokoh\n\n` +
                    `📝 *Contoh:*\n` +
                    `!tts halo semua,jokowi\n` +
                    `!tts selamat pagi,megawati\n` +
                    `!tts indonesia kuat,prabowo\n\n` +
                    `👤 *Tokoh Tersedia:*\n${listTokoh}`
                );
            }

            const [kalimat, tokoh] = fullText.split(',').map(v => v?.trim().toLowerCase());

            if (!kalimat || !tokoh) {
                return await msgHandler.sendReply(msg,
                    `*Format salah!*\nGunakan: !tts teks,tokoh\nContoh: !tts halo semua,jokowi`
                );
            }

            if (!TOKOH[tokoh]) {
                return await msgHandler.sendReply(msg,
                    `*Tokoh tidak tersedia!*\nTersedia: ${Object.keys(TOKOH).join(', ')}`
                );
            }

            // Show typing indicator
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '⏳');

            // Generate TTS
            const audioUrl = await ttsTokoh(kalimat, tokoh);
            
            if (!audioUrl) {
                await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '❌');
                return await msgHandler.sendReply(msg, '*🍂 Gagal membuat TTS*');
            }

            // Download audio
            const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
            const audioBuffer = Buffer.from(response.data);

            // Send audio
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    ptt: false
                },
                { quoted: msg }
            );

            // Clear typing indicator
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '');

        } catch (error) {
            console.error('TTS Error:', error);
            
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '❌');
            await msgHandler.sendReply(msg, '*🍂 Gagal membuat TTS*');
        }
    }
};
