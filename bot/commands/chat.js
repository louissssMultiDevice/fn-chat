const axios = require('axios');

module.exports = {
    command: 'chat',
    description: 'Kirim pesan dengan filter ke Discord',
    aliases: ['say', 'broadcast'],
    async execute(msg, sock, msgHandler, args) {
        try {
            const text = args.trim();
            
            if (!text) {
                return await msgHandler.sendReply(msg,
                    `💬 **Chat dengan Filter:**\n\n` +
                    `Kirim pesan yang akan difilter dan dikirim ke Discord\n\n` +
                    `📝 **Contoh:**\n` +
                    `!chat Halo semua, apa kabar?\n` +
                    `!chat [gambar] Upload gambar dengan caption\n` +
                    `!chat [audio] Kirim audio\n\n` +
                    `⚠️ **Filter otomatis:**\n` +
                    `• Konten tidak pantas\n` +
                    `• Spam\n` +
                    `• Link berbahaya`
                );
            }
            
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '⏳');
            
            // Apply filters
            const filteredText = this.applyFilters(text);
            
            // Check if content is allowed
            if (!this.isContentAllowed(filteredText)) {
                return await msgHandler.sendReply(msg,
                    '❌ Pesan mengandung konten yang dilarang.'
                );
            }
            
            // Send to Discord via webhook
            await this.sendToDiscord(msg, filteredText);
            
            // Send confirmation
            await msgHandler.sendReply(msg,
                `✅ **Pesan terkirim ke Discord!**\n\n` +
                `📝 **Isi:** ${filteredText.substring(0, 100)}${filteredText.length > 100 ? '...' : ''}\n` +
                `📊 **Status:** Filtered & Sent\n` +
                `🔗 **Discord:** Check #forexter-chat`
            );
            
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '✅');
            
        } catch (error) {
            console.error('Chat command error:', error);
            await msgHandler.sendReply(msg, '❌ Gagal mengirim pesan.');
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '❌');
        }
    },
    
    applyFilters(text) {
        // Remove bad words
        const badWords = ['kontol', 'memek', 'anjing', 'bangsat', 'jancok', 'asu'];
        let filteredText = text;
        
        badWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            filteredText = filteredText.replace(regex, '***');
        });
        
        // Remove excessive spaces
        filteredText = filteredText.replace(/\s+/g, ' ').trim();
        
        // Limit length
        if (filteredText.length > 1000) {
            filteredText = filteredText.substring(0, 1000) + '... [truncated]';
        }
        
        return filteredText;
    },
    
    isContentAllowed(text) {
        const forbiddenPatterns = [
            /http(s)?:\/\/.*(phishing|malware|virus)/i,
            /[0-9]{16}/, // Credit card numbers
            /\+?[0-9\s\-\(\)]{10,}/, // Phone numbers
            /[\w\.-]+@[\w\.-]+\.\w{2,}/ // Email addresses
        ];
        
        return !forbiddenPatterns.some(pattern => pattern.test(text));
    },
    
    async sendToDiscord(msg, text) {
        const settings = require('../settings');
        
        if (!settings.discordHook.discordWebhook) {
            throw new Error('Discord webhook not configured');
        }
        
        const sender = msg.key.participant || msg.key.remoteJid;
        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        
        const embed = {
            title: '💬 Chat dari WhatsApp',
            description: text,
            fields: [
                {
                    name: '👤 Pengirim',
                    value: sender.split('@')[0],
                    inline: true
                },
                {
                    name: '📍 Lokasi',
                    value: isGroup ? 'Group Chat' : 'Private Chat',
                    inline: true
                },
                {
                    name: '🛡️ Status',
                    value: '✅ Filtered & Safe',
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            color: 0x7289da,
            footer: {
                text: 'Forexter Network Chat Filter'
            }
        };
        
        await axios.post(settings.discordHook.discordWebhook, {
            username: settings.discordHook.discordName,
            avatar_url: settings.discordHook.discordAvatar,
            embeds: [embed]
        });
    }
};
