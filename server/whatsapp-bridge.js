const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class WhatsAppBridge {
    constructor(db, io) {
        this.db = db;
        this.io = io;
        this.client = null;
        this.isReady = false;
        this.messageQueue = [];
        this.webhookUrl = null;
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing WhatsApp Bridge...');
        
        // Buat folder untuk session data
        const sessionDir = path.join(__dirname, 'whatsapp_sessions');
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        
        // Inisialisasi WhatsApp client
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "forexterchat-bridge",
                dataPath: sessionDir
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            },
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
            }
        });
        
        // Event Handlers
        this.client.on('qr', async (qrCode) => {
            console.log('📱 WhatsApp QR Code generated');
            
            // Generate QR untuk admin panel
            const qrImage = await qrcode.toDataURL(qrCode);
            
            // Simpan QR code ke file
            const qrPath = path.join(__dirname, 'whatsapp_qr.png');
            await qrcode.toFile(qrPath, qrCode);
            
            // Broadcast ke admin panel
            this.io.to('admin_room').emit('whatsapp_qr', {
                qr: qrImage,
                qrPath: `/whatsapp_qr.png?t=${Date.now()}`
            });
            
            // Kirim notifikasi ke admin
            this.sendAdminNotification('WhatsApp Bridge membutuhkan scan QR code');
        });
        
        this.client.on('ready', () => {
            console.log('✅ WhatsApp Bridge is READY!');
            this.isReady = true;
            
            // Broadcast status ke admin
            this.io.to('admin_room').emit('whatsapp_status', {
                status: 'connected',
                phone: this.client.info.wid.user,
                timestamp: new Date()
            });
            
            // Proses message queue
            this.processMessageQueue();
            
            // Mulai health check
            this.startHealthCheck();
        });
        
        this.client.on('authenticated', (session) => {
            console.log('🔐 WhatsApp authenticated');
        });
        
        this.client.on('auth_failure', (msg) => {
            console.error('❌ WhatsApp auth failure:', msg);
            this.isReady = false;
            this.io.to('admin_room').emit('whatsapp_status', {
                status: 'auth_failure',
                message: msg,
                timestamp: new Date()
            });
        });
        
        this.client.on('disconnected', (reason) => {
            console.log('📵 WhatsApp disconnected:', reason);
            this.isReady = false;
            this.io.to('admin_room').emit('whatsapp_status', {
                status: 'disconnected',
                reason,
                timestamp: new Date()
            });
            
            // Coba reconnect setelah 10 detik
            setTimeout(() => {
                console.log('🔄 Attempting to reconnect WhatsApp...');
                this.client.initialize();
            }, 10000);
        });
        
        this.client.on('message', async (message) => {
            await this.handleIncomingMessage(message);
        });
        
        this.client.on('message_create', async (message) => {
            // Handle outgoing messages kita sendiri
            if (message.fromMe) {
                await this.handleOutgoingMessage(message);
            }
        });
        
        // Inisialisasi client
        await this.client.initialize();
    }
    
    async handleIncomingMessage(message) {
        try {
            console.log('📥 Incoming WhatsApp message:', {
                from: message.from,
                type: message.type,
                hasMedia: message.hasMedia,
                body: message.body?.substring(0, 100)
            });
            
            const phone = this.normalizePhone(message.from);
            const user = await this.db.getUserByPhone(phone);
            
            if (user) {
                // User terdaftar di ForexterChat
                await this.forwardToForexterChat(user, message);
            } else {
                // User belum terdaftar - auto response
                await this.handleUnknownUser(message);
            }
            
            // Update message stats
            await this.updateMessageStats('incoming');
            
        } catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }
    
    async forwardToForexterChat(user, whatsappMessage) {
        let content = '';
        let type = 'text';
        let fileData = null;
        
        // Handle different message types
        if (whatsappMessage.hasMedia) {
            const media = await whatsappMessage.downloadMedia();
            
            if (media) {
                type = this.mapMediaType(media.mimetype);
                content = `[${type.toUpperCase()}] ${whatsappMessage.body || ''}`;
                
                // Simpan media ke database
                fileData = {
                    buffer: Buffer.from(media.data, 'base64'),
                    mimetype: media.mimetype,
                    filename: `${Date.now()}_${whatsappMessage.id.filename || 'file'}`
                };
            }
        } else {
            content = whatsappMessage.body;
        }
        
        // Cari atau buka chat dengan admin
        const admin = await this.db.getUserById('admin_001'); // ID admin default
        if (!admin) return;
        
        // Generate chat ID
        const chatId = this.db.generateChatId(user.id, admin.id);
        
        // Simpan ke database
        const messageData = {
            sender_id: user.id,
            receiver_id: admin.id,
            chat_id: chatId,
            content_text: content,
            content_type: type,
            metadata: {
                viaWhatsApp: true,
                whatsappId: whatsappMessage.id.id,
                timestamp: whatsappMessage.timestamp * 1000,
                from: whatsappMessage.from
            }
        };
        
        // Jika ada file, simpan dulu
        if (fileData) {
            const fileId = await this.db.saveMediaFile(user.id, fileData);
            messageData.file_id = fileId;
        }
        
        const messageId = await this.db.saveMessage(messageData);
        
        // Broadcast via WebSocket ke admin
        this.io.to(`user_${admin.id}`).emit('new_message', {
            id: messageId,
            from: user.id,
            to: admin.id,
            content,
            type,
            timestamp: Date.now(),
            viaWhatsApp: true
        });
        
        // Kirim konfirmasi ke user
        if (whatsappMessage.fromMe === false) {
            await this.sendDeliveryReceipt(whatsappMessage.id);
        }
    }
    
    async handleUnknownUser(whatsappMessage) {
        const welcomeMessage = `Halo! 👋

Saya adalah *ForexterChat Assistant* 🤖

Anda menerima pesan ini karena nomor Anda belum terdaftar di ForexterChat.

📲 *Untuk menggunakan ForexterChat:*
1. Download aplikasi ForexterChat
2. Daftar dengan nomor WhatsApp ini
3. Nikmati fitur chat premium!

🔗 *Download:* https://forexterchat.id
📞 *Admin:* +62 8123 4567 890

*Pesan ini dikirim otomatis. Untuk bantuan, hubungi admin.*`;

        try {
            await this.client.sendMessage(
                whatsappMessage.from,
                welcomeMessage
            );
            
            // Notify admin tentang user baru
            const phone = this.normalizePhone(whatsappMessage.from);
            this.io.to('admin_room').emit('whatsapp_new_user', {
                phone,
                message: whatsappMessage.body?.substring(0, 200),
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }
    
    async sendMessage(toPhone, content, options = {}) {
        if (!this.isReady || !this.client) {
            console.log('WhatsApp client not ready, queuing message');
            this.messageQueue.push({ toPhone, content, options });
            return false;
        }
        
        try {
            const formattedPhone = this.formatPhoneNumber(toPhone);
            
            let result;
            if (options.media) {
                // Handle media message
                const media = MessageMedia.fromFilePath(options.media.path);
                result = await this.client.sendMessage(formattedPhone, media, {
                    caption: content
                });
            } else if (options.location) {
                // Handle location
                result = await this.client.sendMessage(
                    formattedPhone,
                    `${content}\n\n📍 Lokasi: ${options.location.latitude}, ${options.location.longitude}`
                );
            } else {
                // Text message
                result = await this.client.sendMessage(formattedPhone, content);
            }
            
            // Update stats
            await this.updateMessageStats('outgoing');
            
            // Log success
            console.log('✅ WhatsApp message sent to:', toPhone);
            
            return {
                success: true,
                messageId: result.id.id,
                timestamp: new Date()
            };
            
        } catch (error) {
            console.error('❌ Error sending WhatsApp message:', error);
            
            // Add to retry queue
            this.messageQueue.push({ toPhone, content, options });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async sendBulkMessages(contacts, message, options = {}) {
        if (!this.isReady) {
            throw new Error('WhatsApp client not ready');
        }
        
        const results = [];
        const batchSize = 10; // Untuk menghindari rate limit
        const delay = 2000; // Delay 2 detik antar batch
        
        for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (contact) => {
                try {
                    const result = await this.sendMessage(contact.phone, message, {
                        ...options,
                        contactId: contact.id
                    });
                    
                    results.push({
                        contact,
                        success: true,
                        ...result
                    });
                    
                } catch (error) {
                    results.push({
                        contact,
                        success: false,
                        error: error.message
                    });
                }
            });
            
            await Promise.all(batchPromises);
            
            // Delay antar batch
            if (i + batchSize < contacts.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return results;
    }
    
    async sendVerificationCode(phone, code) {
        const message = `*Kode Verifikasi ForexterChat*\n\n` +
                       `Kode Anda: *${code}*\n\n` +
                       `Gunakan kode ini untuk verifikasi perangkat baru. ` +
                       `Kode berlaku 10 menit.\n\n` +
                       `Jangan bagikan kode ini kepada siapapun.\n\n` +
                       `_Pesan otomatis - jangan dibalas_`;
        
        return await this.sendMessage(phone, message);
    }
    
    async sendBusinessNotification(business, notification) {
        const message = `*📊 Notifikasi Bisnis ForexterChat*\n\n` +
                       `*${notification.title}*\n` +
                       `${notification.message}\n\n` +
                       `🔗 Dashboard: https://forexterchat.id/business\n` +
                       `⏰ ${new Date().toLocaleString('id-ID')}\n\n` +
                       `_Pesan otomatis - jangan dibalas_`;
        
        // Kirim ke pemilik bisnis
        await this.sendMessage(business.owner_phone, message);
        
        // Kirim ke semua admin bisnis jika ada
        if (business.admins) {
            for (const admin of business.admins) {
                await this.sendMessage(admin.phone, message);
            }
        }
    }
    
    async sendAdminAlert(alert) {
        const admins = await this.db.getAllAdmins();
        
        const message = `*🚨 Alert System ForexterChat*\n\n` +
                       `*${alert.title}*\n` +
                       `${alert.message}\n\n` +
                       `🕒 ${new Date().toLocaleString('id-ID')}\n` +
                       `🔧 Priority: ${alert.priority}\n\n` +
                       `_Segera cek admin dashboard_`;
        
        for (const admin of admins) {
            await this.sendMessage(admin.phone, message);
        }
    }
    
    async processMessageQueue() {
        if (this.messageQueue.length === 0 || !this.isReady) return;
        
        console.log(`Processing ${this.messageQueue.length} queued messages...`);
        
        const successMessages = [];
        const failedMessages = [];
        
        for (const msg of this.messageQueue) {
            try {
                const result = await this.sendMessage(msg.toPhone, msg.content, msg.options);
                
                if (result.success) {
                    successMessages.push(msg);
                } else {
                    failedMessages.push(msg);
                }
                
                // Delay untuk hindari rate limit
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                failedMessages.push({ ...msg, error: error.message });
            }
        }
        
        // Update queue
        this.messageQueue = failedMessages;
        
        console.log(`Queue processed: ${successMessages.length} success, ${failedMessages.length} failed`);
        
        // Jika ada yang gagal, coba lagi nanti
        if (failedMessages.length > 0) {
            setTimeout(() => this.processMessageQueue(), 60000); // Coba lagi 1 menit
        }
    }
    
    async handleOutgoingMessage(message) {
        // Update database dengan status terkirim
        if (message.metadata?.forexterMessageId) {
            await this.db.updateMessageStatus(
                [message.metadata.forexterMessageId],
                'delivered'
            );
        }
    }
    
    async sendDeliveryReceipt(messageId) {
        try {
            await this.client.sendSeen(messageId.remote);
        } catch (error) {
            console.error('Error sending receipt:', error);
        }
    }
    
    async updateMessageStats(direction) {
        const statsFile = path.join(__dirname, 'whatsapp_stats.json');
        let stats = {
            total_incoming: 0,
            total_outgoing: 0,
            today_incoming: 0,
            today_outgoing: 0,
            last_updated: new Date()
        };
        
        try {
            if (fs.existsSync(statsFile)) {
                stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
            }
            
            const today = new Date().toDateString();
            const lastUpdated = new Date(stats.last_updated).toDateString();
            
            // Reset daily stats jika beda hari
            if (today !== lastUpdated) {
                stats.today_incoming = 0;
                stats.today_outgoing = 0;
            }
            
            // Update stats
            if (direction === 'incoming') {
                stats.total_incoming++;
                stats.today_incoming++;
            } else {
                stats.total_outgoing++;
                stats.today_outgoing++;
            }
            
            stats.last_updated = new Date();
            
            // Save to file
            fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
            
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
    
    async getConnectionStatus() {
        if (!this.client) {
            return {
                status: 'not_initialized',
                isReady: false
            };
        }
        
        const info = this.client.info;
        const statsFile = path.join(__dirname, 'whatsapp_stats.json');
        let stats = {};
        
        try {
            if (fs.existsSync(statsFile)) {
                stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error reading stats:', error);
        }
        
        return {
            status: this.isReady ? 'connected' : 'disconnected',
            isReady: this.isReady,
            phone: info?.wid?.user || 'Unknown',
            name: info?.pushname || 'Unknown',
            platform: info?.platform || 'Unknown',
            stats: {
                ...stats,
                queue_length: this.messageQueue.length
            },
            timestamp: new Date()
        };
    }
    
    async restartBridge() {
        console.log('🔄 Restarting WhatsApp Bridge...');
        
        try {
            if (this.client) {
                await this.client.destroy();
            }
            
            // Tunggu sebentar
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Initialize ulang
            await this.init();
            
            return { success: true, message: 'Bridge restarted' };
            
        } catch (error) {
            console.error('Error restarting bridge:', error);
            return { success: false, error: error.message };
        }
    }
    
    async backupSession() {
        const sessionDir = path.join(__dirname, 'whatsapp_sessions');
        const backupDir = path.join(__dirname, 'whatsapp_backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupName = `whatsapp_session_${Date.now()}.tar.gz`;
        const backupPath = path.join(backupDir, backupName);
        
        return new Promise((resolve, reject) => {
            const command = `tar -czf "${backupPath}" -C "${sessionDir}" .`;
            
            exec(command, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        success: true,
                        backupPath,
                        backupName,
                        size: fs.statSync(backupPath).size
                    });
                }
            });
        });
    }
    
    startHealthCheck() {
        setInterval(async () => {
            try {
                // Cek koneksi dengan ping sederhana
                const isAlive = this.client && this.isReady;
                
                if (!isAlive) {
                    console.log('⚠️ WhatsApp Bridge health check failed');
                    
                    this.io.to('admin_room').emit('whatsapp_health', {
                        status: 'unhealthy',
                        timestamp: new Date()
                    });
                    
                    // Coba reconnect
                    if (this.client) {
                        await this.client.initialize();
                    }
                }
                
            } catch (error) {
                console.error('Health check error:', error);
            }
        }, 30000); // Setiap 30 detik
    }
    
    // Utility methods
    normalizePhone(phone) {
        // Konversi dari format WhatsApp ke format standar
        return phone.replace('@c.us', '').replace('+', '');
    }
    
    formatPhoneNumber(phone) {
        // Format ke nomor WhatsApp
        let cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1);
        }
        
        if (!cleaned.includes('@c.us')) {
            cleaned += '@c.us';
        }
        
        return cleaned;
    }
    
    mapMediaType(mimetype) {
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        if (mimetype.includes('pdf')) return 'document';
        if (mimetype.includes('vnd.openxmlformats')) return 'document';
        return 'file';
    }
    
    sendAdminNotification(message) {
        this.io.to('admin_room').emit('admin_notification', {
            type: 'whatsapp',
            message,
            timestamp: new Date()
        });
    }
}

module.exports = WhatsAppBridge;
