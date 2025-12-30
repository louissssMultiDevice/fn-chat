const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppBridge {
    constructor(db) {
        this.db = db;
        this.clients = new Map(); // Map userId -> WhatsApp client
        this.init();
    }
    
    async init() {
        // Inisialisasi WhatsApp Web client
        this.masterClient = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: { 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
        
        this.masterClient.on('qr', (qr) => {
            console.log('QR Code untuk WhatsApp Bridge:');
            qrcode.generate(qr, { small: true });
            
            // Simpan QR ke file untuk admin
            require('qrcode').toFile('./whatsapp-qr.png', qr);
        });
        
        this.masterClient.on('ready', () => {
            console.log('✅ WhatsApp Bridge Ready!');
            this.broadcastToAdmins('WhatsApp Bridge aktif');
        });
        
        this.masterClient.on('message', async (msg) => {
            await this.handleIncomingMessage(msg);
        });
        
        await this.masterClient.initialize();
    }
    
    async linkUserToWhatsApp(userPhone, sessionToken) {
        // Simpan mapping user -> WhatsApp
        this.db.saveWhatsAppLink(userPhone, sessionToken);
        
        // Kirim welcome message via WhatsApp
        await this.sendWelcomeMessage(userPhone);
    }
    
    async sendMessage(to, message) {
        try {
            // Format: +628123456789
            const formattedNumber = this.formatPhoneNumber(to);
            
            if (typeof message === 'object' && message.iv) {
                // Pesan terenkripsi - kirim sebagai text
                message = `🔐 Pesan terenkripsi dari ForexterChat`;
            }
            
            await this.masterClient.sendMessage(formattedNumber, message);
            return true;
        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            return false;
        }
    }
    
    async sendVerificationCode(phone, code) {
        const message = `*ForexterChat Verification*\n\nYour pairing code: *${code}*\n\nThis code expires in 10 minutes.`;
        return await this.sendMessage(phone, message);
    }
    
    async handleIncomingMessage(msg) {
        // Proses pesan masuk dari WhatsApp
        const from = msg.from.replace('@c.us', '');
        const content = msg.body;
        
        // Cari user terkait
        const user = await this.db.findUserByWhatsApp(from);
        
        if (user) {
            // Teruskan ke sistem ForexterChat
            this.forwardToForexterChat(user.id, content, msg);
        } else {
            // Auto-reply untuk non-user
            await this.sendMessage(from, 
                "Halo! Saya adalah sistem ForexterChat.\n\n" +
                "Untuk menggunakan layanan ini, silakan install aplikasi ForexterChat.\n" +
                "Download: https://forexterchat.id"
            );
        }
    }
    
    async broadcastToAdmins(message) {
        const admins = await this.db.getAllAdmins();
        admins.forEach(async admin => {
            await this.sendMessage(admin.phone, `🔔 ${message}`);
        });
    }
    
    formatPhoneNumber(phone) {
        // Konversi ke format WhatsApp
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1);
        }
        return cleaned + '@c.us';
    }
}

module.exports = WhatsAppBridge;
