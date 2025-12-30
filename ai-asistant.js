class AIAssistant {
    constructor() {
        this.forexterAI = {
            name: "Forexter AI",
            number: "+62 0",
            personality: "helpful_assistant",
            knowledge: {
                system: [
                    "ForexterChat adalah platform chat real-time canggih",
                    "Mendukung chat, call video, voice message, dan sharing file",
                    "Memiliki sistem keamanan berbasis approval device",
                    "Database lokal 100% - data tidak keluar dari server"
                ],
                features: [
                    "Real-time chat seperti WhatsApp",
                    "Video call dengan kamera enhancement",
                    "Voice message dengan recording",
                    "File sharing dengan preview",
                    "Link preview otomatis",
                    "Group, channel, dan community",
                    "AI assistant built-in"
                ],
                commands: {
                    help: "Saya bisa membantu dengan: info sistem, bantuan fitur, troubleshooting",
                    system: "Sistem ini dibangun dengan HTML5, CSS3, JavaScript, dan IndexedDB",
                    contact: "Untuk support hubungi: support@forexter.net"
                }
            }
        };

        this.namiAI = {
            name: "Nami AI",
            number: "+0 0",
            personality: "technical_expert",
            knowledge: {
                technical: [
                    "Arsitektur: Client-Server dengan WebSockets",
                    "Database: IndexedDB untuk penyimpanan lokal",
                    "Real-time: Socket.IO untuk komunikasi real-time",
                    "Media: WebRTC untuk video/voice call",
                    "Security: Device fingerprinting dan approval system"
                ],
                setup: [
                    "Jalankan dengan python run.py untuk server",
                    "Buka localhost:5000 di browser",
                    "Login dengan WhatsApp atau OTP",
                    "Admin dashboard di /admin"
                ],
                troubleshooting: [
                    "Cek koneksi internet",
                    "Clear cache browser",
                    "Restart aplikasi",
                    "Hubungi admin untuk device approval"
                ]
            }
        };
    }

    async getResponse(message, aiType = 'forexter') {
        const ai = aiType === 'forexter' ? this.forexterAI : this.namiAI;
        
        // Clean and analyze message
        const cleanedMessage = message.toLowerCase().trim();
        
        // Check for greetings
        if (this.isGreeting(cleanedMessage)) {
            return this.generateGreetingResponse(ai);
        }
        
        // Check for help request
        if (this.isHelpRequest(cleanedMessage)) {
            return this.generateHelpResponse(ai);
        }
        
        // Check for system info
        if (this.isSystemQuery(cleanedMessage)) {
            return this.generateSystemResponse(ai);
        }
        
        // Check for feature info
        if (this.isFeatureQuery(cleanedMessage)) {
            return this.generateFeatureResponse(ai);
        }
        
        // Check for technical query (Nami AI specific)
        if (aiType === 'nami' && this.isTechnicalQuery(cleanedMessage)) {
            return this.generateTechnicalResponse(ai);
        }
        
        // Default response
        return this.generateDefaultResponse(ai, cleanedMessage);
    }

    isGreeting(message) {
        const greetings = ['halo', 'hi', 'hello', 'hai', 'selamat', 'pagi', 'siang', 'sore', 'malam'];
        return greetings.some(greet => message.includes(greet));
    }

    isHelpRequest(message) {
        const helpWords = ['bantuan', 'help', 'tolong', 'caranya', 'cara', 'gimana', 'bagaimana'];
        return helpWords.some(word => message.includes(word));
    }

    isSystemQuery(message) {
        const systemWords = ['sistem', 'aplikasi', 'app', 'software', 'forexterchat', 'platform'];
        return systemWords.some(word => message.includes(word));
    }

    isFeatureQuery(message) {
        const featureWords = ['fitur', 'feature', 'kemampuan', 'bisa apa', 'apa saja'];
        return featureWords.some(word => message.includes(word));
    }

    isTechnicalQuery(message) {
        const technicalWords = ['teknis', 'technical', 'cara kerja', 'arsitektur', 'database', 'server', 'webrtc', 'socket'];
        return technicalWords.some(word => message.includes(word));
    }

    generateGreetingResponse(ai) {
        const greetings = [
            `Halo! Saya ${ai.name}, asisten virtual Anda. 😊`,
            `Hai! ${ai.name} di sini, ada yang bisa saya bantu? 🤖`,
            `Selamat datang! Saya ${ai.name}, siap membantu Anda. 🌟`
        ];
        
        const followUps = [
            "Anda bisa tanyakan tentang fitur sistem, cara penggunaan, atau bantuan teknis.",
            "Coba tanya 'apa fitur aplikasi ini?' atau 'bagaimana cara membuat group?'",
            "Ingin tahu lebih banyak tentang ForexterChat? Tanyakan saja! 💬"
        ];
        
        return `${greetings[Math.floor(Math.random() * greetings.length)]}\n\n${followUps[Math.floor(Math.random() * followUps.length)]}`;
    }

    generateHelpResponse(ai) {
        const responses = {
            forexter: `Saya bisa membantu dengan:\n\n` +
                     `📱 **Fitur Aplikasi**\n` +
                     `- Chat real-time dengan semua user\n` +
                     `- Video & voice call berkualitas tinggi\n` +
                     `- Kirim file, gambar, voice message\n` +
                     `- Buat group, channel, dan community\n\n` +
                     `🔧 **Bantuan Teknis**\n` +
                     `- Cara login & verifikasi device\n` +
                     `- Troubleshooting masalah\n` +
                     `- Pengaturan privacy & security\n\n` +
                     `Coba tanya: "Bagaimana cara video call?" atau "Cara buat group baru?"`,
                     
            nami: `Sebagai AI teknis, saya bisa bantu dengan:\n\n` +
                 `🏗️ **Arsitektur Sistem**\n` +
                 `- Client-server architecture\n` +
                 `- Real-time dengan Socket.IO\n` +
                 `- Database lokal IndexedDB\n\n` +
                 `🔐 **Security System**\n` +
                 `- Device fingerprinting\n` +
                 `- Admin approval system\n` +
                 `- End-to-end encryption\n\n` +
                 `🛠️ **Troubleshooting**\n` +
                 `- Connection issues\n` +
                 `- Media problems\n` +
                 `- Performance optimization`
        };
        
        return responses[ai.name.includes('Forexter') ? 'forexter' : 'nami'];
    }

    generateSystemResponse(ai) {
        const systemInfo = ai.knowledge.system.join('\n• ');
        
        return `**${ai.name} - System Information**\n\n` +
               `ForexterChat adalah:\n` +
               `• ${systemInfo}\n\n` +
               `**Teknologi:**\n` +
               `• Frontend: HTML5, CSS3, JavaScript ES6+\n` +
               `• Real-time: Socket.IO, WebRTC\n` +
               `• Database: IndexedDB (local storage)\n` +
               `• Security: Device approval system\n\n` +
               `**Keunggulan:**\n` +
               `✅ 100% lokal - privasi terjamin\n` +
               `✅ Real-time - pesan instan\n` +
               `✅ Multi-platform - bisa di semua browser\n` +
               `✅ Open source - bisa dikembangkan`;
    }

    generateFeatureResponse(ai) {
        const features = ai.knowledge.features.map((f, i) => `${i + 1}. ${f}`).join('\n');
        
        return `**${ai.name} - Fitur Lengkap**\n\n` +
               `${features}\n\n` +
               `**Detail Fitur:**\n\n` +
               `💬 **Chat System**\n` +
               `- Real-time messaging\n` +
               `- Link preview otomatis\n` +
               `- Emoji & formatting\n` +
               `- Read receipts & typing indicators\n\n` +
               `📞 **Call System**\n` +
               `- Voice call HD quality\n` +
               `- Video call dengan kamera enhancement\n` +
               `- Group call (coming soon)\n` +
               `- Screen sharing (coming soon)\n\n` +
               `👥 **Social Features**\n` +
               `- Buat group dengan custom link\n` +
               `- Channel untuk broadcast\n` +
               `- Community dengan multiple groups\n` +
               `- QR code untuk semua link`;
    }

    generateTechnicalResponse(ai) {
        const technicalInfo = ai.knowledge.technical.map((t, i) => `${i + 1}. ${t}`).join('\n');
        const setupInfo = ai.knowledge.setup.join('\n• ');
        const troubleshooting = ai.knowledge.troubleshooting.join('\n• ');
        
        return `**${ai.name} - Technical Documentation**\n\n` +
               `**Arsitektur Sistem:**\n` +
               `${technicalInfo}\n\n` +
               `**Setup & Deployment:**\n` +
               `• ${setupInfo}\n\n` +
               `**Troubleshooting:**\n` +
               `• ${troubleshooting}\n\n` +
               `**Performance Tips:**\n` +
               `• Gunakan browser terbaru\n` +
               `• Enable hardware acceleration\n` +
               `• Clear cache secara berkala\n` +
               `• Gunakan koneksi internet stabil`;
    }

    generateDefaultResponse(ai, message) {
        const responses = [
            `Saya tidak yakin memahami "${message}". Coba tanyakan tentang fitur sistem atau butuh bantuan teknis?`,
            `Maaf, sebagai ${ai.name}, saya fokus pada bantuan terkait sistem ForexterChat. Ada yang bisa saya bantu terkait aplikasi?`,
            `Pertanyaan menarik! Sebagai AI assistant, saya bisa bantu dengan:\n` +
            `1. Penjelasan fitur aplikasi\n` +
            `2. Bantuan teknis\n` +
            `3. Cara penggunaan\n` +
            `Mana yang Anda butuhkan?`
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Process AI command in group/channel
    async processGroupCommand(message, context) {
        const command = this.extractCommand(message);
        
        switch(command) {
            case '!help':
                return this.generateGroupHelpResponse();
            case '!rules':
                return this.generateGroupRules(context);
            case '!info':
                return this.generateGroupInfo(context);
            case '!admin':
                return this.generateAdminInfo(context);
            case '!stats':
                return this.generateGroupStats(context);
            default:
                return null;
        }
    }

    extractCommand(message) {
        const match = message.match(/^!(\w+)/);
        return match ? match[1].toLowerCase() : null;
    }

    generateGroupHelpResponse() {
        return `**Group Commands:**\n\n` +
               `!help - Tampilkan bantuan ini\n` +
               `!rules - Tampilkan aturan group\n` +
               `!info - Informasi group\n` +
               `!admin - List admin group\n` +
               `!stats - Statistik group\n\n` +
               `**AI Commands:**\n` +
               `@Forexter AI [pertanyaan] - Tanya Forexter AI\n` +
               `@Nami AI [pertanyaan] - Tanya Nami AI`;
    }

    generateGroupRules(context) {
        return `**Aturan Group ${context.groupName}:**\n\n` +
               `1. Hormati semua anggota\n` +
               `2. Dilarang spam\n` +
               `3. Konten positif saja\n` +
               `4. No SARA & hoax\n` +
               `5. Patuhi admin\n\n` +
               `Pelanggaran: Warning → Mute → Kick`;
    }

    generateGroupInfo(context) {
        return `**Informasi Group:**\n\n` +
               `Nama: ${context.groupName}\n` +
               `Anggota: ${context.memberCount}\n` +
               `Dibuat: ${context.createdDate}\n` +
               `Admin: ${context.admins.join(', ')}\n` +
               `Link: ${context.groupLink}`;
    }

    generateAdminInfo(context) {
        return `**Admin Group:**\n\n` +
               context.admins.map((admin, i) => 
                   `${i + 1}. ${admin.name} - ${admin.role}`
               ).join('\n');
    }

    generateGroupStats(context) {
        const stats = context.stats || {};
        return `**Statistik Group:**\n\n` +
               `Total Pesan: ${stats.totalMessages || 0}\n` +
               `Hari Ini: ${stats.todayMessages || 0}\n` +
               `Anggota Aktif: ${stats.activeMembers || 0}\n` +
               `Media Shared: ${stats.mediaCount || 0}\n` +
               `Aktivitas Tertinggi: ${stats.mostActive || 'N/A'}`;
    }

    // Learning and context
    async learnFromInteraction(userId, question, response) {
        // Store in IndexedDB for future reference
        const interaction = {
            userId,
            question,
            response,
            timestamp: new Date().toISOString(),
            ai: this.currentAI
        };
        
        // Could store in IndexedDB for personalized responses
        console.log('AI learned:', interaction);
    }

    // Context-aware responses
    getContextualResponse(message, context) {
        if (context.chatType === 'group') {
            return this.getGroupResponse(message, context);
        } else if (context.chatType === 'channel') {
            return this.getChannelResponse(message, context);
        } else {
            return this.getPersonalResponse(message, context);
        }
    }

    getGroupResponse(message, context) {
        return `👥 **Response untuk Group ${context.groupName}**\n\n` +
               `Pertanyaan Anda: "${message}"\n\n` +
               `Sebagai AI assistant group, saya bisa bantu dengan:\n` +
               `• Moderasi otomatis\n` +
               `• FAQ group\n` +
               `• Statistik aktivitas\n` +
               `• Pengingat aturan\n\n` +
               `Gunakan !help untuk command lengkap.`;
    }

    getChannelResponse(message, context) {
        return `📢 **Response untuk Channel ${context.channelName}**\n\n` +
               `Channel ini untuk broadcast messages.\n` +
               `Hanya admin yang bisa posting.\n\n` +
               `Untuk pertanyaan, hubungi admin atau buka chat pribadi.`;
    }

    getPersonalResponse(message, context) {
        return this.getResponse(message, context.aiType || 'forexter');
    }
}

// Export singleton
const aiAssistant = new AIAssistant();
export default aiAssistant;
