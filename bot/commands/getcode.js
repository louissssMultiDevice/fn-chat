const fs = require('fs').promises;
const path = require('path');

module.exports = {
    command: 'getcode',
    description: 'Lihat kode source bot',
    usage: '!getcode [filename] atau !getcode list',
    async execute(msg, sock, msgHandler, args) {
        try {
            const commandsDir = path.join(__dirname, '..', 'commands');
            
            if (!args || args.toLowerCase() === 'list') {
                // List all available files
                const files = await fs.readdir(commandsDir);
                const jsFiles = files.filter(f => f.endsWith('.js'));
                
                const fileList = jsFiles.map(f => 
                    `• ${f.replace('.js', '')}`
                ).join('\n');
                
                return await msgHandler.sendReply(msg,
                    `📁 **Available Bot Files:**\n\n` +
                    `${fileList}\n\n` +
                    `📝 **Usage:** !getcode [filename]\n` +
                    `**Example:** !getcode ping\n\n` +
                    `📊 **Total:** ${jsFiles.length} files`
                );
            }
            
            const filename = args.toLowerCase() + '.js';
            const filepath = path.join(commandsDir, filename);
            
            try {
                await fs.access(filepath);
            } catch {
                return await msgHandler.sendReply(msg,
                    `❌ File "${args}" tidak ditemukan.\n` +
                    `Ketik !getcode list untuk melihat daftar file.`
                );
            }
            
            const code = await fs.readFile(filepath, 'utf8');
            
            // Format code for WhatsApp
            const formattedCode = this.formatCode(code, args);
            
            // Split if too long
            if (formattedCode.length > 4000) {
                const parts = this.splitCode(formattedCode);
                
                await msgHandler.sendReply(msg,
                    `📄 **File:** ${filename}\n` +
                    `📏 **Size:** ${code.length} characters\n` +
                    `📋 **Lines:** ${code.split('\n').length}\n` +
                    `📤 **Sending in ${parts.length} parts...**`
                );
                
                for (let i = 0; i < parts.length; i++) {
                    await msgHandler.sendReply(msg,
                        `📄 **Part ${i + 1}/${parts.length}**\n\n` +
                        '```javascript\n' + parts[i] + '\n```'
                    );
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                await msgHandler.sendReply(msg,
                    `📄 **File:** ${filename}\n` +
                    `📏 **Size:** ${code.length} characters\n` +
                    `📋 **Lines:** ${code.split('\n').length}\n\n` +
                    '```javascript\n' + formattedCode + '\n```'
                );
            }
            
        } catch (error) {
            console.error('Getcode error:', error);
            await msgHandler.sendReply(msg, '❌ Gagal membaca file.');
        }
    },
    
    formatCode(code, filename) {
        // Truncate if too long, keep important parts
        if (code.length > 3000) {
            const lines = code.split('\n');
            
            // Keep first 50 lines and last 20 lines
            const firstPart = lines.slice(0, 50).join('\n');
            const lastPart = lines.slice(-20).join('\n');
            
            return `${firstPart}\n\n// ... ${lines.length - 70} lines truncated ...\n\n${lastPart}`;
        }
        
        return code;
    },
    
    splitCode(code, maxLength = 2000) {
        const parts = [];
        const lines = code.split('\n');
        let currentPart = '';
        
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
