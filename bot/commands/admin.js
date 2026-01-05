module.exports = {
    command: 'admin',
    description: 'Tampilkan daftar admin komunitas',
    aliases: ['admins', 'listadmin'],
    async execute(msg, sock, msgHandler) {
        const settings = require('../settings');
        
        const adminList = settings.admin.map(admin => 
            `• ${admin} - Admin`
        ).join('\n');
        
        const ownerInfo = `• ${settings.owner} - Owner`;
        
        const message = `
🛡️ **Admin List - Forexter Network**

👑 **Owner:**
${ownerInfo}

🛠️ **Administrators:**
${adminList || 'Belum ada admin lain'}

📋 **Total:** ${settings.admin.length + 1} admin

⚠️ **Rules:**
1. Hormati semua admin
2. Laporkan admin yang menyalahgunakan wewenang
3. Follow instruksi admin untuk kenyamanan bersama

📞 **Contact Owner:** ${settings.owner}
        `.trim();
        
        await msgHandler.sendReply(msg, message);
    }
};
