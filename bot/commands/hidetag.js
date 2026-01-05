module.exports = {
    command: 'hidetag', 'ht',
    description: 'Tag semua member tanpa @',
    aliases: ['tagall', 'hidetagall'],
    admin: true, // Only admins can use this
    usage: '!hidetag', '!ht',
    async execute(msg, sock, msgHandler, args) {
        try {
            const isGroup = msg.key.remoteJid.endsWith('@g.us');
            
            if (!isGroup) {
                return await msgHandler.sendReply(msg, '❌ Command ini hanya bisa digunakan di group.');
            }
            
            const text = args || 'Halo semua member!';
            
            // Get group participants
            const metadata = await sock.groupMetadata(msg.key.remoteJid);
            const participants = metadata.participants;
            
            // Create mentions array
            const mentions = participants.map(p => p.id);
            
            // Send message with hidden mentions
            await msgHandler.sendMention(msg.key.remoteJid, text, mentions);
            
        } catch (error) {
            console.error('Hidetag error:', error);
            
            if (error.message.includes('not an admin')) {
                await msgHandler.sendReply(msg, '❌ Hanya admin yang bisa menggunakan command ini.');
            } else {
                await msgHandler.sendReply(msg, '❌ Gagal melakukan hidetag.');
            }
        }
    }
};
