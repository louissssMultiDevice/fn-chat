module.exports = {
    command: 'listfitur',
    description: 'Daftar semua fitur bot',
    aliases: ['features', 'fitur'],
    async execute(msg, sock, msgHandler) {
        const features = [
            '🤖 **AI & TTS:**',
            '  • TTS dengan suara tokoh Indonesia (Jokowi, Megawati, Prabowo)',
            '  • AI chat dengan berbagai model',
            '  • Text processing dan analisis',
            
            '📁 **File & Media:**',
            '  • Upload media ke catbox.moe',
            '  • Convert gambar ke sticker',
            '  • Download video/audio dari berbagai platform',
            '  • File sharing dengan URL',
            
            '👥 **Community:**',
            '  • Auto join community',
            '  • Admin management system',
            '  • Report system dengan Discord integration',
            '  • User ranking dan level system',
            
            '🛠️ **Utility:**',
            '  • Server status monitoring',
            '  • Weather information',
            '  • Translation multiple languages',
            '  • Calculator dan konversi',
            '  • Reminder dan jadwal',
            
            '🎮 **Entertainment:**',
            '  • Mini games (quiz, tebak gambar)',
            '  • Random quotes dan fakta',
            '  • Musik player (coming soon)',
            '  • Meme generator',
            
            '🔧 **Admin Features:**',
            '  • Broadcast message ke semua user',
            '  • User management (ban, warn, mute)',
            '  • Group settings management',
            '  • Activity logs dan analytics',
            
            '🌐 **Integration:**',
            '  • Discord webhook integration',
            '  • WhatsApp API connection',
            '  • Database synchronization',
            '  • Real-time chat sync'
        ];
        
        const message = `
🚀 **All Features - Forexter Bot**

${features.join('\n')}

📊 **Total Categories:** 7
🔢 **Total Features:** 25+
⚡ **Update Frequency:** Regular

🆕 **Coming Soon:**
• Voice command recognition
• Image generation AI
• Custom plugin system
• Multi-language support

🔗 **Website:** https://forexternetwork.my.id
👨‍💻 **Developer:** NdiiClouD Team
📅 **Version:** ${require('../settings').bot.versi}
        `.trim();
        
        // Split message if too long
        if (message.length > 4000) {
            const parts = this.splitMessage(message, 2000);
            for (const part of parts) {
                await msgHandler.sendReply(msg, part);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } else {
            await msgHandler.sendReply(msg, message);
        }
    },
    
    splitMessage(text, maxLength) {
        const parts = [];
        let currentPart = '';
        
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (currentPart.length + line.length + 1 > maxLength) {
                parts.push(currentPart);
                currentPart = line;
            } else {
                currentPart += (currentPart ? '\n' : '') + line;
            }
        }
        
        if (currentPart) {
            parts.push(currentPart);
        }
        
        return parts;
    }
};
