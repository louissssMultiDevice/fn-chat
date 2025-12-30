const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const Database = require('./database');
const WhatsAppBridge = require('./whatsapp-bridge');

class ForexterChatServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: { origin: "*" },
            transports: ['websocket', 'polling']
        });
        
        this.db = new Database();
        this.waBridge = new WhatsAppBridge(this.db);
        this.activeSessions = new Map();
        this.onlineUsers = new Map();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketIO();
        this.setupAdminWebhook();
    }
    
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
        this.app.use('/admin', express.static('public/admin-panel'));
        this.app.use('/business', express.static('public/business-dashboard'));
    }
    
    setupRoutes() {
        // API Authentication
        this.app.post('/api/auth/pair', async (req, res) => {
            const { phone } = req.body;
            const code = this.generatePairingCode();
            
            // Simpan ke database
            await this.db.savePairingRequest(phone, code);
            
            // Kirim SMS via WhatsApp Bridge
            await this.waBridge.sendVerificationCode(phone, code);
            
            res.json({ success: true, code });
        });
        
        // API Verify Pairing
        this.app.post('/api/auth/verify', async (req, res) => {
            const { phone, code } = req.body;
            const isValid = await this.db.verifyPairingCode(phone, code);
            
            if (isValid) {
                const sessionToken = this.generateSessionToken();
                const userData = await this.db.createUserSession(phone, sessionToken);
                
                // Hubungkan ke WhatsApp
                await this.waBridge.linkUserToWhatsApp(phone, sessionToken);
                
                res.json({ 
                    success: true, 
                    token: sessionToken,
                    user: userData
                });
            } else {
                res.status(401).json({ success: false });
            }
        });
        
        // API Business Registration
        this.app.post('/api/business/register', async (req, res) => {
            const { userId, businessName, category, documents } = req.body;
            
            // Simpan permintaan bisnis
            const requestId = await this.db.createBusinessRequest({
                userId,
                businessName,
                category,
                documents,
                status: 'pending'
            });
            
            // Notify admin
            this.notifyAdmin('new_business_request', { requestId, businessName });
            
            res.json({ success: true, requestId });
        });
        
        // API Messages
        this.app.get('/api/messages/:chatId', async (req, res) => {
            const { chatId } = req.params;
            const { limit = 50, offset = 0 } = req.query;
            
            const messages = await this.db.getMessages(chatId, limit, offset);
            res.json({ messages });
        });
        
        // API Upload Media
        this.app.post('/api/upload', async (req, res) => {
            // Handle file upload dengan enkripsi
            const encryptedFile = await this.encryptFile(req.body.file);
            const fileId = await this.db.saveMedia(encryptedFile);
            
            res.json({ fileId, url: `/media/${fileId}` });
        });
        
        // WebSocket Health Check
        this.app.get('/ws-health', (req, res) => {
            const stats = {
                onlineUsers: this.onlineUsers.size,
                activeSessions: this.activeSessions.size,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            };
            res.json(stats);
        });
    }
    
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('User connected:', socket.id);
            
            // Authentication
            socket.on('authenticate', async (token) => {
                const user = await this.db.validateSession(token);
                if (user) {
                    socket.userId = user.id;
                    this.onlineUsers.set(user.id, socket.id);
                    
                    socket.join(`user_${user.id}`);
                    socket.join(`contacts_${user.id}`);
                    
                    // Notify contacts about online status
                    this.notifyUserPresence(user.id, 'online');
                    
                    socket.emit('authenticated', user);
                }
            });
            
            // Send Message
            socket.on('send_message', async (data) => {
                const { to, message, type = 'text', metadata = {} } = data;
                
                // Simpan ke database
                const msgId = await this.db.saveMessage({
                    from: socket.userId,
                    to,
                    message,
                    type,
                    metadata,
                    timestamp: Date.now(),
                    status: 'sent'
                });
                
                // Enkripsi pesan
                const encryptedMsg = this.encryptMessage(message, to);
                
                // Kirim via WhatsApp Bridge jika perlu
                if (metadata.viaWhatsApp) {
                    await this.waBridge.sendMessage(to, encryptedMsg);
                }
                
                // Broadcast via WebSocket
                socket.to(`user_${to}`).emit('new_message', {
                    id: msgId,
                    from: socket.userId,
                    message: encryptedMsg,
                    type,
                    timestamp: Date.now()
                });
                
                // Konfirmasi pengiriman
                socket.emit('message_sent', { id: msgId, status: 'delivered' });
            });
            
            // Typing Indicator
            socket.on('typing', (data) => {
                const { to, isTyping } = data;
                socket.to(`user_${to}`).emit('typing_indicator', {
                    from: socket.userId,
                    isTyping
                });
            });
            
            // Read Receipt
            socket.on('message_read', async (data) => {
                const { messageIds } = data;
                await this.db.updateMessageStatus(messageIds, 'read');
                
                // Notify sender
                messageIds.forEach(msgId => {
                    const msg = this.db.getMessage(msgId);
                    if (msg) {
                        socket.to(`user_${msg.from}`).emit('message_read', {
                            messageId: msgId,
                            readerId: socket.userId,
                            timestamp: Date.now()
                        });
                    }
                });
            });
            
            // Video/Audio Call Signaling
            socket.on('call_initiate', (data) => {
                const { to, type, offer } = data;
                socket.to(`user_${to}`).emit('incoming_call', {
                    from: socket.userId,
                    type,
                    offer,
                    callId: crypto.randomUUID()
                });
            });
            
            socket.on('call_answer', (data) => {
                const { to, answer } = data;
                socket.to(`user_${to}`).emit('call_accepted', {
                    answer,
                    from: socket.userId
                });
            });
            
            socket.on('call_ice_candidate', (data) => {
                const { to, candidate } = data;
                socket.to(`user_${to}`).emit('ice_candidate', {
                    candidate,
                    from: socket.userId
                });
            });
            
            // Business Features
            socket.on('business_broadcast', async (data) => {
                const { message, toContacts } = data;
                const businessId = socket.userId;
                
                // Validasi akun bisnis
                const isBusiness = await this.db.isBusinessAccount(businessId);
                if (!isBusiness) return;
                
                // Kirim broadcast ke semua kontak
                const broadcastId = await this.db.createBroadcast(businessId, message);
                
                toContacts.forEach(async contactId => {
                    await this.db.saveMessage({
                        from: businessId,
                        to: contactId,
                        message,
                        type: 'broadcast',
                        broadcastId,
                        timestamp: Date.now()
                    });
                    
                    socket.to(`user_${contactId}`).emit('new_message', {
                        from: businessId,
                        message,
                        type: 'broadcast',
                        timestamp: Date.now()
                    });
                });
            });
            
            // Disconnect
            socket.on('disconnect', () => {
                if (socket.userId) {
                    this.onlineUsers.delete(socket.userId);
                    this.notifyUserPresence(socket.userId, 'offline');
                }
                console.log('User disconnected:', socket.id);
            });
        });
    }
    
    setupAdminWebhook() {
        // Webhook untuk integrasi eksternal
        this.app.post('/webhook/admin', async (req, res) => {
            const { event, data } = req.body;
            
            switch(event) {
                case 'business_approved':
                    await this.handleBusinessApproval(data);
                    break;
                case 'system_alert':
                    this.broadcastSystemAlert(data);
                    break;
                case 'user_report':
                    await this.handleUserReport(data);
                    break;
            }
            
            res.json({ received: true });
        });
    }
    
    async handleBusinessApproval(data) {
        const { userId, businessData } = data;
        
        // Upgrade user ke akun bisnis
        await this.db.upgradeToBusiness(userId, businessData);
        
        // Kirim notifikasi ke user
        this.io.to(`user_${userId}`).emit('business_approved', {
            ...businessData,
            timestamp: Date.now()
        });
        
        // Aktifkan fitur bisnis premium
        this.activateBusinessFeatures(userId);
    }
    
    notifyUserPresence(userId, status) {
        const contacts = this.db.getUserContacts(userId);
        contacts.forEach(contactId => {
            this.io.to(`user_${contactId}`).emit('presence_update', {
                userId,
                status,
                timestamp: Date.now()
            });
        });
    }
    
    notifyAdmin(event, data) {
        // Kirim notifikasi ke semua admin online
        this.io.to('admin_room').emit('admin_notification', {
            event,
            data,
            timestamp: Date.now()
        });
    }
    
    encryptMessage(message, recipientId) {
        // Implementasi enkripsi end-to-end
        const key = this.db.getEncryptionKey(recipientId);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        let encrypted = cipher.update(message, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
            iv: iv.toString('hex'),
            content: encrypted,
            authTag: cipher.getAuthTag().toString('hex')
        };
    }
    
    generatePairingCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    start(port = 3000) {
        this.server.listen(port, () => {
            console.log(`🚀 ForexterChat Server running on port ${port}`);
            console.log(`🌐 Admin Panel: http://localhost:${port}/admin`);
            console.log(`💼 Business Portal: http://localhost:${port}/business`);
            console.log(`📱 Web App: http://localhost:${port}`);
        });
    }
}

// Database Layer
class Database {
    constructor() {
        const sqlite3 = require('sqlite3').verbose();
        this.db = new sqlite3.Database('./forexterchat.db');
        this.initDatabase();
    }
    
    initDatabase() {
        // Create tables
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                phone TEXT UNIQUE,
                name TEXT,
                avatar TEXT,
                status TEXT DEFAULT 'offline',
                is_verified BOOLEAN DEFAULT 0,
                is_business BOOLEAN DEFAULT 0,
                business_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT,
                device_info TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT,
                sender_id TEXT,
                receiver_id TEXT,
                content TEXT,
                encrypted_content TEXT,
                type TEXT DEFAULT 'text',
                status TEXT DEFAULT 'sent',
                timestamp DATETIME,
                read_at DATETIME,
                metadata TEXT,
                FOREIGN KEY(sender_id) REFERENCES users(id),
                FOREIGN KEY(receiver_id) REFERENCES users(id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS contacts (
                user_id TEXT,
                contact_id TEXT,
                alias TEXT,
                is_blocked BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY(user_id, contact_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS business_requests (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                business_name TEXT,
                category TEXT,
                documents TEXT,
                status TEXT DEFAULT 'pending',
                reviewed_by TEXT,
                reviewed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS broadcast_campaigns (
                id TEXT PRIMARY KEY,
                business_id TEXT,
                message TEXT,
                sent_count INTEGER DEFAULT 0,
                delivered_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'scheduled',
                scheduled_for DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS media (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                filename TEXT,
                original_name TEXT,
                size INTEGER,
                mime_type TEXT,
                encrypted_path TEXT,
                thumbnail TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];
        
        tables.forEach(table => this.db.run(table));
    }
    
    // Implementasi methods database...
}

module.exports = ForexterChatServer;

// Start server
if (require.main === module) {
    const server = new ForexterChatServer();
    server.start(3000);
}
