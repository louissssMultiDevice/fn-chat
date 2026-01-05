module.exports = {
    command: 'menu',
    description: 'Tampilkan menu utama bot',
    aliases: ['help', 'start'],
    async execute(msg, sock, msgHandler) {
        const settings = require('../settings');
        
        const menu = `
🤖 **Forexter Bot Menu**

📋 **Basic Commands:**
• !ping - Cek status bot
• !menu - Tampilkan menu ini
• !status - Cek status server
• !owner - Info pemilik

👥 **Community Commands:**
• !admin - Daftar admin
• !hidetag - Tag semua member
• !listfitur - Daftar semua fitur

🎤 **AI & TTS Commands:**
• !tts teks,tokoh - TTS suara tokoh
• !ai [pertanyaan] - Chat dengan AI

📁 **File & Media:**
• !tourl - Upload media ke URL
• !getcode [file] - Lihat kode bot
• !chat [pesan] - Kirim pesan ke Discord

🛠️ **Admin Commands:**
• !broadcast [pesan] - Broadcast ke semua user
• !addadmin [@user] - Tambah admin
• !deladmin [@user] - Hapus admin

📊 **Info:**
• Bot: ${settings.bot.name} v${settings.bot.versi}
• Dev: ${settings.bot.dev}
• Created: ${settings.bot.createAt}
• Owner: ${settings.owner}

💡 **Ketik:** !help [command] untuk detail lebih lanjut
📞 **Support:** @lan (Owner)
        `.trim();
        
        // Create buttons for quick access
        const buttons = [
            {
                text: '📋 Basic Commands',
                id: 'basic_cmds'
            },
            {
                text: '🎤 AI Commands',
                id: 'ai_cmds'
            },
            {
                text: '📁 Media Commands',
                id: 'media_cmds'
            },
            {
                text: '👥 Community',
                id: 'community_cmds'
            }
        ];
        
        try {
            await msgHandler.sendButton(msg.key.remoteJid, menu, buttons, 
                `${settings.footer}\nPowered by NdiiClouD Team`);
        } catch (error) {
            // Fallback to simple text if buttons fail
            await msgHandler.sendReply(msg, menu);
        }
    }
};
