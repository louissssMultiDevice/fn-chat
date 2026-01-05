module.exports = {
    command: 'ping',
    description: 'Cek status bot dan latency',
    usage: '!ping',
    async execute(msg, sock, msgHandler) {
        const start = Date.now();
        
        // Send typing indicator
        await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '⏳');
        
        const ping = Date.now() - start;
        
        await msgHandler.sendReply(msg,
            `🏓 **Pong!**\n` +
            `📶 **Latency:** ${ping}ms\n` +
            `🟢 **Status:** Online\n` +
            `⚡ **Speed:** ${ping < 100 ? 'Fast' : ping < 500 ? 'Normal' : 'Slow'}\n\n` +
            `💾 **Memory:** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB\n` +
            `⏱️ **Uptime:** ${this.formatUptime(process.uptime())}`
        );
        
        await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '✅');
    },
    
    formatUptime(seconds) {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        
        return parts.join(' ');
    }
};
