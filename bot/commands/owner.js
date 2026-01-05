module.exports = {
    command: 'owner',
    description: 'Informasi pemilik bot dengan button call',
    aliases: ['creator', 'pemilik'],
    async execute(msg, sock, msgHandler) {
        const settings = require('../settings');
        
        const message = `
👑 **Owner Information - Forexter Bot**

📛 **Name:** Lan
🏷️ **Tag:** ${settings.owner}
💼 **Role:** Founder & Developer
📅 **Since:** ${settings.bot.createAt}

💻 **Development Team:**
• NdiiClouD Team
• Dev: ${settings.bot.dev}

📞 **Contact Options:**
1. Mention ${settings.owner} di chat
2. Call untuk hal penting
3. WhatsApp untuk diskusi

🔧 **Supported by:**
${settings.footer}
        `.trim();
        
        // Create buttons with call option
        const buttons = [
            {
                text: '📞 Call Owner',
                phone: '+6285800650661' // Replace with actual number
            },
            {
                text: '💬 Chat Owner',
                id: 'chat_owner'
            },
            {
                text: '🌐 Website',
                url: 'https://www.forexternetwork.my.id'
            }
        ];
        
        try {
            await msgHandler.sendButton(msg.key.remoteJid, message, buttons,
                'Contact owner untuk bantuan dan support');
        } catch (error) {
            // Fallback without buttons
            await msgHandler.sendReply(msg, message);
        }
    }
};
