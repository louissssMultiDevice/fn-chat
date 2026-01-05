const axios = require('axios');

module.exports = {
    command: 'status',
    description: 'Cek status server Minecraft dan website',
    usage: '!status',
    async execute(msg, sock, msgHandler) {
        try {
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '⏳');
            
            // Check Minecraft server status
            const mcStatus = await this.checkMinecraftStatus();
            
            // Check website status
            const webStatus = await this.checkWebsiteStatus();
            
            // Bot status
            const botStatus = {
                status: '🟢 Online',
                uptime: this.formatUptime(process.uptime()),
                memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`,
                commands: 'Ready'
            };
            
            const statusMessage = `
🌐 **Forexter Network Status**

🎮 **Minecraft Server:**
   • Status: ${mcStatus.online ? '🟢 Online' : '🔴 Offline'}
   ${mcStatus.online ? `• Players: ${mcStatus.players.online}/${mcStatus.players.max}` : ''}
   ${mcStatus.online ? `• Version: ${mcStatus.version}` : ''}
   ${mcStatus.online ? `• MOTD: ${mcStatus.motd}` : ''}

🌍 **Website:**
   • Status: ${webStatus.online ? '🟢 Online' : '🔴 Offline'}
   • URL: https://forexternetwork.my.id
   • Response: ${webStatus.ping}ms

🤖 **Forexter Bot:**
   • Status: ${botStatus.status}
   • Uptime: ${botStatus.uptime}
   • Memory: ${botStatus.memory}
   • Commands: ${botStatus.commands}

📊 **Overall Status:** ${mcStatus.online && webStatus.online ? '🟢 All Systems Operational' : '🟡 Partial Outage'}
            `.trim();
            
            await msgHandler.sendReply(msg, statusMessage);
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '✅');
            
        } catch (error) {
            console.error('Status check error:', error);
            await msgHandler.sendReply(msg, '❌ Gagal mengambil status server.');
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '❌');
        }
    },
    
    async checkMinecraftStatus() {
        try {
            const response = await axios.get('https://api.mcstatus.io/v2/status/bedrock/play.forexternetwork.my.id:25300', {
                timeout: 5000
            });
            
            return {
                online: response.data.online,
                players: {
                    online: response.data.players?.online || 0,
                    max: response.data.players?.max || 100
                },
                version: response.data.version?.name || 'Unknown',
                motd: response.data.motd?.clean || 'Unknown'
            };
        } catch (error) {
            return {
                online: false,
                players: { online: 0, max: 100 },
                version: 'Unknown',
                motd: 'Server offline or unreachable'
            };
        }
    },
    
    async checkWebsiteStatus() {
        try {
            const start = Date.now();
            const response = await axios.get('https://www.forexternetwork.my.id/status', {
                timeout: 5000,
                validateStatus: () => true
            });
            const end = Date.now();
            
            return {
                online: response.status < 400,
                ping: end - start,
                statusCode: response.status
            };
        } catch (error) {
            return {
                online: false,
                ping: 0,
                statusCode: 0
            };
        }
    },
    
    formatUptime(seconds) {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (parts.length === 0) parts.push('<1m');
        
        return parts.join(' ');
    }
};
