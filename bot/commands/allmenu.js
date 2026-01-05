module.exports = {
    command: 'allmenu',
    description: 'Tampilkan semua command yang tersedia',
    aliases: ['allcmd', 'commands'],
    async execute(msg, sock, msgHandler) {
        const commands = [
            // Basic
            { cmd: '!ping', desc: 'Cek status bot dan latency' },
            { cmd: '!menu', desc: 'Menu utama bot' },
            { cmd: '!status', desc: 'Status server Minecraft dan website' },
            { cmd: '!owner', desc: 'Informasi pemilik bot' },
            
            // Community
            { cmd: '!admin', desc: 'Daftar admin komunitas' },
            { cmd: '!hidetag', desc: 'Tag semua member tanpa @' },
            { cmd: '!listfitur', desc: 'Daftar semua fitur bot' },
            
            // AI & TTS
            { cmd: '!tts text,tokoh', desc: 'Text-to-speech dengan suara tokoh Indonesia' },
            { cmd: '!ai [query]', desc: 'Chat dengan AI (coming soon)' },
            
            // File & Media
            { cmd: '!tourl', desc: 'Upload media ke catbox.moe' },
            { cmd: '!getcode [file]', desc: 'Lihat kode file bot' },
            { cmd: '!chat [pesan]', desc: 'Kirim pesan terfilter ke Discord' },
            
            // Admin Only
            { cmd: '!broadcast [msg]', desc: 'Broadcast ke semua user (admin only)' },
            { cmd: '!addadmin [@user]', desc: 'Tambah admin (owner only)' },
            { cmd: '!deladmin [@user]', desc: 'Hapus admin (owner only)' },
            { cmd: '!maintenance [on/off]', desc: 'Mode maintenance (admin only)' },
            
            // Utility
            { cmd: '!sticker', desc: 'Buat sticker dari gambar' },
            { cmd: '!translate [text]', desc: 'Terjemahkan teks (coming soon)' },
            { cmd: '!weather [kota]', desc: 'Cek cuaca (coming soon)' },
            { cmd: '!covid [negara]', desc: 'Data COVID-19 (coming soon)' }
        ];
        
        const sections = [
            {
                title: '📋 BASIC COMMANDS',
                rows: commands.slice(0, 4).map(cmd => ({
                    title: cmd.cmd,
                    description: cmd.desc,
                    rowId: cmd.cmd.split(' ')[0]
                }))
            },
            {
                title: '👥 COMMUNITY COMMANDS',
                rows: commands.slice(4, 7).map(cmd => ({
                    title: cmd.cmd,
                    description: cmd.desc,
                    rowId: cmd.cmd.split(' ')[0]
                }))
            },
            {
                title: '🎤 AI & TTS COMMANDS',
                rows: commands.slice(7, 9).map(cmd => ({
                    title: cmd.cmd,
                    description: cmd.desc,
                    rowId: cmd.cmd.split(' ')[0]
                }))
            },
            {
                title: '📁 FILE & MEDIA',
                rows: commands.slice(9, 12).map(cmd => ({
                    title: cmd.cmd,
                    description: cmd.desc,
                    rowId: cmd.cmd.split(' ')[0]
                }))
            }
        ];
        
        try {
            await msgHandler.sendList(
                msg.key.remoteJid,
                '🤖 All Commands - Forexter Bot',
                'Berikut adalah semua command yang tersedia:\n\nPilih command untuk melihat detail:',
                '📋 View Commands',
                sections
            );
        } catch (error) {
            // Fallback to simple text
            const allCommands = commands.map(c => `• ${c.cmd.padEnd(20)} - ${c.desc}`).join('\n');
            
            await msgHandler.sendReply(msg,
                `🤖 **All Commands - Forexter Bot**\n\n` +
                `${allCommands}\n\n` +
                `💡 **Total:** ${commands.length} commands\n` +
                `📖 **Ketik:** !help [command] untuk detail`
            );
        }
    }
};
