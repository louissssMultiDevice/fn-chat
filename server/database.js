const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ForexterDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, 'forexterchat.db');
        this.mediaPath = path.join(__dirname, 'media');
        this.backupPath = path.join(__dirname, 'backups');
        
        // Buat folder jika belum ada
        [this.mediaPath, this.backupPath].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });
        
        this.initSQLite();
        this.encryptionKey = this.generateMasterKey();
    }
    
    generateMasterKey() {
        // Generate atau load master key
        const keyPath = path.join(__dirname, '.encryption_key');
        if (fs.existsSync(keyPath)) {
            return fs.readFileSync(keyPath);
        } else {
            const key = crypto.randomBytes(32);
            fs.writeFileSync(keyPath, key);
            return key;
        }
    }
    
    initSQLite() {
        const sqlite3 = require('sqlite3').verbose();
        this.db = new sqlite3.Database(this.dbPath);
        
        // Enable foreign keys and WAL mode
        this.db.run("PRAGMA foreign_keys = ON");
        this.db.run("PRAGMA journal_mode = WAL");
        this.db.run("PRAGMA synchronous = NORMAL");
        
        this.createTables();
        this.createIndexes();
        this.createTriggers();
    }
    
    createTables() {
        const tables = [
            // Users table dengan kolom premium
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                phone TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                name TEXT,
                avatar TEXT,
                status TEXT DEFAULT 'offline',
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                about TEXT DEFAULT 'Hey there! I am using ForexterChat',
                privacy_settings TEXT DEFAULT '{"last_seen":"all","profile_photo":"all","about":"all"}',
                account_type TEXT DEFAULT 'personal',
                is_verified BOOLEAN DEFAULT 0,
                is_business BOOLEAN DEFAULT 0,
                is_admin BOOLEAN DEFAULT 0,
                business_data TEXT,
                subscription_data TEXT,
                encryption_key BLOB,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Sessions dengan device info lengkap
            `CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                device_name TEXT,
                device_type TEXT,
                device_id TEXT,
                browser_info TEXT,
                ip_address TEXT,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Messages dengan encryption metadata
            `CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                content_type TEXT DEFAULT 'text',
                content_text TEXT,
                content_encrypted BLOB,
                encryption_iv TEXT,
                encryption_auth_tag TEXT,
                file_id TEXT,
                reply_to TEXT,
                reactions TEXT DEFAULT '{}',
                is_edited BOOLEAN DEFAULT 0,
                edit_history TEXT,
                is_deleted BOOLEAN DEFAULT 0,
                delete_for_everyone BOOLEAN DEFAULT 0,
                status TEXT DEFAULT 'sent',
                read_at DATETIME,
                delivered_at DATETIME,
                metadata TEXT DEFAULT '{}',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(sender_id) REFERENCES users(id),
                FOREIGN KEY(receiver_id) REFERENCES users(id),
                FOREIGN KEY(file_id) REFERENCES media_files(id),
                FOREIGN KEY(reply_to) REFERENCES messages(id)
            )`,
            
            // Chats untuk grup dan percakapan
            `CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                type TEXT DEFAULT 'private',
                name TEXT,
                description TEXT,
                avatar TEXT,
                created_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_message_id TEXT,
                last_message_at DATETIME,
                settings TEXT DEFAULT '{}',
                FOREIGN KEY(created_by) REFERENCES users(id)
            )`,
            
            // Chat participants
            `CREATE TABLE IF NOT EXISTS chat_participants (
                chat_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT DEFAULT 'member',
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_read_message_id TEXT,
                notification_settings TEXT DEFAULT '{"mentions":true,"messages":true}',
                is_admin BOOLEAN DEFAULT 0,
                PRIMARY KEY(chat_id, user_id),
                FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Contacts dengan relationship levels
            `CREATE TABLE IF NOT EXISTS contacts (
                user_id TEXT NOT NULL,
                contact_id TEXT NOT NULL,
                alias TEXT,
                notes TEXT,
                category TEXT DEFAULT 'general',
                is_favorite BOOLEAN DEFAULT 0,
                is_blocked BOOLEAN DEFAULT 0,
        ceated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_contacted DATETIME,
                PRIMARY KEY(user_id, contact_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(contact_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Business accounts premium
            `CREATE TABLE IF NOT EXISTS business_accounts (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                business_name TEXT NOT NULL,
                business_type TEXT,
                category TEXT,
                description TEXT,
                website TEXT,
                address TEXT,
                verified_status TEXT DEFAULT 'pending',
                verified_at DATETIME,
                verified_by TEXT,
                documents TEXT,
                settings TEXT DEFAULT '{"auto_reply":false,"business_hours":"","away_message":""}',
                subscription_plan TEXT DEFAULT 'free',
                subscription_expires DATETIME,
                stats TEXT DEFAULT '{"total_customers":0,"messages_sent":0,"response_rate":0}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Business catalog/products
            `CREATE TABLE IF NOT EXISTS business_products (
                id TEXT PRIMARY KEY,
                business_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                price DECIMAL(10,2),
                currency TEXT DEFAULT 'IDR',
                images TEXT,
                category TEXT,
                stock INTEGER DEFAULT 0,
                variants TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(business_id) REFERENCES business_accounts(id) ON DELETE CASCADE
            )`,
            
            // Media/files management
            `CREATE TABLE IF NOT EXISTS media_files (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                original_name TEXT,
                storage_name TEXT UNIQUE,
                file_type TEXT,
                mime_type TEXT,
                size_bytes INTEGER,
                width INTEGER,
                height INTEGER,
                duration INTEGER,
                encryption_key BLOB,
                encryption_iv TEXT,
                thumbnail_path TEXT,
                compressed_path TEXT,
                upload_status TEXT DEFAULT 'processing',
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )`,
            
            // Calls history
            `CREATE TABLE IF NOT EXISTS calls (
                id TEXT PRIMARY KEY,
                call_type TEXT,
                caller_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                status TEXT,
                start_time DATETIME,
                end_time DATETIME,
                duration INTEGER,
                is_video BOOLEAN DEFAULT 0,
                participants TEXT,
                recording_path TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(caller_id) REFERENCES users(id),
                FOREIGN KEY(receiver_id) REFERENCES users(id)
            )`,
            
            // Status updates (stories)
            `CREATE TABLE IF NOT EXISTS status_updates (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT DEFAULT 'text',
                content TEXT,
                media_id TEXT,
                background_color TEXT,
                text_color TEXT,
                font_size INTEGER,
                views_count INTEGER DEFAULT 0,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(media_id) REFERENCES media_files(id)
            )`,
            
            // Status views
            `CREATE TABLE IF NOT EXISTS status_views (
                status_id TEXT NOT NULL,
                viewer_id TEXT NOT NULL,
                viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                reaction TEXT,
                PRIMARY KEY(status_id, viewer_id),
                FOREIGN KEY(status_id) REFERENCES status_updates(id) ON DELETE CASCADE,
                FOREIGN KEY(viewer_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Notifications
            `CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT,
                body TEXT,
                data TEXT,
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Admin audit logs
            `CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id TEXT,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(admin_id) REFERENCES users(id)
            )`,
            
            // Payment transactions
            `CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency TEXT DEFAULT 'IDR',
                payment_method TEXT,
                status TEXT DEFAULT 'pending',
                invoice_number TEXT UNIQUE,
                description TEXT,
                metadata TEXT,
                paid_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )`,
            
            // Backup schedules
            `CREATE TABLE IF NOT EXISTS backup_schedules (
                id TEXT PRIMARY KEY,
                schedule_type TEXT,
                frequency TEXT,
                last_run DATETIME,
                next_run DATETIME,
                status TEXT DEFAULT 'active',
                retention_days INTEGER DEFAULT 30,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];
        
        return new Promise((resolve, reject) => {
            let completed = 0;
            tables.forEach((sql, index) => {
                this.db.run(sql, (err) => {
                    if (err) {
                        console.error(`Error creating table ${index}:`, err);
                        reject(err);
                    }
                    completed++;
                    if (completed === tables.length) {
                        console.log('✅ All tables created successfully');
                        resolve();
                    }
                });
            });
        });
    }
    
    createIndexes() {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_chats_last_message ON chats(last_message_at DESC)',
            'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
            'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
            'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, is_active)',
            'CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id, is_favorite)',
            'CREATE INDEX IF NOT EXISTS idx_status_expires ON status_updates(expires_at)',
            'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at)',
            'CREATE INDEX IF NOT EXISTS idx_calls_participants ON calls(caller_id, receiver_id, start_time)',
            'CREATE INDEX IF NOT EXISTS idx_business_verified ON business_accounts(verified_status, subscription_plan)'
        ];
        
        indexes.forEach(sql => this.db.run(sql));
    }
    
    createTriggers() {
        // Trigger untuk update chat last_message
        this.db.run(`
            CREATE TRIGGER IF NOT EXISTS update_chat_last_message 
            AFTER INSERT ON messages
            BEGIN
                UPDATE chats 
                SET last_message_id = NEW.id,
                    last_message_at = NEW.timestamp
                WHERE id = NEW.chat_id;
            END;
        `);
        
        // Trigger untuk update user updated_at
        this.db.run(`
            CREATE TRIGGER IF NOT EXISTS update_user_timestamp 
            AFTER UPDATE ON users
            BEGIN
                UPDATE users 
                SET updated_at = CURRENT_TIMESTAMP 
                WHERE id = NEW.id;
            END;
        `);
        
        // Trigger untuk delete expired status
        this.db.run(`
            CREATE TRIGGER IF NOT EXISTS delete_expired_status
            AFTER INSERT ON status_updates
            BEGIN
                DELETE FROM status_updates 
                WHERE expires_at < CURRENT_TIMESTAMP;
            END;
        `);
    }
    
    // ==================== USER METHODS ====================
    
    async createUser(userData) {
        const userId = crypto.randomBytes(16).toString('hex');
        const encryptionKey = crypto.randomBytes(32);
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO users (
                    id, phone, name, email, avatar, 
                    encryption_key, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            
            this.db.run(sql, [
                userId,
                userData.phone,
                userData.name || '',
                userData.email || '',
                userData.avatar || this.generateAvatar(userData.phone),
                encryptionKey
            ], function(err) {
                if (err) reject(err);
                else resolve({ id: userId, ...userData });
            });
        });
    }
    
    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
    
    async getUserByPhone(phone) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
    
    async updateUser(userId, updates) {
        const setClause = Object.keys(updates)
            .map(key => `${key} = ?`)
            .join(', ');
        
        const values = [...Object.values(updates), userId];
        
        return new Promise((resolve, reject) => {
            const sql = `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            this.db.run(sql, values, function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }
    
    // ==================== SESSION METHODS ====================
    
    async createSession(userId, deviceInfo) {
        const sessionId = crypto.randomBytes(16).toString('hex');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 hari
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO sessions (
                    id, user_id, token, device_name, device_type, 
                    device_id, browser_info, ip_address, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [
                sessionId,
                userId,
                token,
                deviceInfo.deviceName || 'Unknown',
                deviceInfo.deviceType || 'desktop',
                deviceInfo.deviceId || '',
                deviceInfo.browser || '',
                deviceInfo.ip || '',
                expiresAt.toISOString()
            ], function(err) {
                if (err) reject(err);
                else resolve({ sessionId, token, expiresAt });
            });
        });
    }
    
    async validateSession(token) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT s.*, u.* 
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = ? AND s.is_active = 1 AND s.expires_at > CURRENT_TIMESTAMP
            `;
            
            this.db.get(sql, [token], (err, row) => {
                if (err) reject(err);
                
                if (row) {
                    // Update last activity
                    this.db.run('UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?', [row.id]);
                    resolve(row);
                } else {
                    resolve(null);
                }
            });
        });
    }
    
    async invalidateSession(token) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE sessions SET is_active = 0 WHERE token = ?', [token], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }
    
    // ==================== MESSAGE METHODS ====================
    
    async saveMessage(messageData) {
        const messageId = crypto.randomBytes(16).toString('hex');
        const chatId = messageData.chat_id || this.generateChatId(messageData.sender_id, messageData.receiver_id);
        
        // Enkripsi konten jika ada
        let encryptedContent = null;
        let encryptionIv = null;
        let encryptionTag = null;
        
        if (messageData.content_text) {
            const encrypted = this.encryptMessage(
                messageData.content_text,
                messageData.sender_id,
                messageData.receiver_id
            );
            encryptedContent = encrypted.content;
            encryptionIv = encrypted.iv;
            encryptionTag = encrypted.authTag;
        }
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO messages (
                    id, chat_id, sender_id, receiver_id, content_type,
                    content_text, content_encrypted, encryption_iv, encryption_auth_tag,
                    file_id, reply_to, status, metadata, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [
                messageId,
                chatId,
                messageData.sender_id,
                messageData.receiver_id,
                messageData.content_type || 'text',
                messageData.content_text || null,
                encryptedContent,
                encryptionIv,
                encryptionTag,
                messageData.file_id || null,
                messageData.reply_to || null,
                messageData.status || 'sent',
                JSON.stringify(messageData.metadata || {}),
                new Date(messageData.timestamp || Date.now()).toISOString()
            ], function(err) {
                if (err) reject(err);
                else resolve(messageId);
            });
        });
    }
    
    async getMessages(chatId, limit = 50, offset = 0) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT m.*, 
                    u1.name as sender_name,
                    u1.avatar as sender_avatar,
                    u2.name as receiver_name,
                    u2.avatar as receiver_avatar
                FROM messages m
                LEFT JOIN users u1 ON m.sender_id = u1.id
                LEFT JOIN users u2 ON m.receiver_id = u2.id
                WHERE m.chat_id = ? AND m.is_deleted = 0
                ORDER BY m.timestamp DESC
                LIMIT ? OFFSET ?
            `;
            
            this.db.all(sql, [chatId, limit, offset], (err, rows) => {
                if (err) reject(err);
                else {
                    // Dekripsi konten
                    const decryptedRows = rows.map(row => {
                        if (row.content_encrypted) {
                            try {
                                row.content_text = this.decryptMessage({
                                    content: row.content_encrypted,
                                    iv: row.encryption_iv,
                                    authTag: row.encryption_auth_tag
                                }, row.sender_id, row.receiver_id);
                            } catch (e) {
                                console.error('Decryption error:', e);
                                row.content_text = '[Encrypted message]';
                            }
                        }
                        return row;
                    });
                    resolve(decryptedRows.reverse()); // Return oldest first
                }
            });
        });
    }
    
    async updateMessageStatus(messageIds, status) {
        const placeholders = messageIds.map(() => '?').join(',');
        const now = new Date().toISOString();
        
        let updateField = 'status';
        let timestampField = 'timestamp';
        
        if (status === 'read') {
            updateField = 'status';
            timestampField = 'read_at';
        } else if (status === 'delivered') {
            updateField = 'status';
            timestampField = 'delivered_at';
        }
        
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE messages 
                SET ${updateField} = ?, ${timestampField} = ? 
                WHERE id IN (${placeholders})
            `;
            
            this.db.run(sql, [status, now, ...messageIds], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }
    
    // ==================== CHAT METHODS ====================
    
    async createChat(chatData) {
        const chatId = crypto.randomBytes(16).toString('hex');
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO chats (
                    id, type, name, description, avatar, 
                    created_by, settings
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [
                chatId,
                chatData.type || 'private',
                chatData.name || '',
                chatData.description || '',
                chatData.avatar || '',
                chatData.created_by,
                JSON.stringify(chatData.settings || {})
            ], function(err) {
                if (err) reject(err);
                else resolve(chatId);
            });
        });
    }
    
    async addChatParticipant(chatId, userId, role = 'member') {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO chat_participants 
                (chat_id, user_id, role, joined_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            this.db.run(sql, [chatId, userId, role], function(err) {
                if (err) reject(err);
                else resolve({ chatId, userId, role });
            });
        });
    }
    
    async getUserChats(userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT c.*, 
                    cp.last_read_message_id,
                    m.content_text as last_message_preview,
                    m.timestamp as last_message_time,
                    m.sender_id as last_message_sender,
                    COUNT(DISTINCT p.user_id) as participant_count,
                    GROUP_CONCAT(p.user_id) as participant_ids
                FROM chats c
                JOIN chat_participants cp ON c.id = cp.chat_id
                LEFT JOIN messages m ON c.last_message_id = m.id
                LEFT JOIN chat_participants p ON c.id = p.chat_id
                WHERE cp.user_id = ?
                GROUP BY c.id
                ORDER BY c.last_message_at DESC
            `;
            
            this.db.all(sql, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
    
    // ==================== BUSINESS METHODS ====================
    
    async createBusinessAccount(userId, businessData) {
        const businessId = crypto.randomBytes(16).toString('hex');
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO business_accounts (
                    id, user_id, business_name, business_type, category,
                    description, website, address, documents, settings
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [
                businessId,
                userId,
                businessData.business_name,
                businessData.business_type || 'retail',
                businessData.category || 'general',
                businessData.description || '',
                businessData.website || '',
                businessData.address || '',
                JSON.stringify(businessData.documents || []),
                JSON.stringify(businessData.settings || {})
            ], async function(err) {
                if (err) reject(err);
                else {
                    // Update user to business
                    await this.updateUser(userId, { is_business: 1 });
                    resolve(businessId);
                }
            }.bind(this));
        });
    }
    
    async verifyBusinessAccount(businessId, adminId) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE business_accounts 
                SET verified_status = 'verified',
                    verified_at = CURRENT_TIMESTAMP,
                    verified_by = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            this.db.run(sql, [adminId, businessId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }
    
    async addBusinessProduct(businessId, productData) {
        const productId = crypto.randomBytes(16).toString('hex');
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO business_products (
                    id, business_id, name, description, price,
                    currency, images, category, stock, variants
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [
                productId,
                businessId,
                productData.name,
                productData.description || '',
                productData.price || 0,
                productData.currency || 'IDR',
                JSON.stringify(productData.images || []),
                productData.category || 'uncategorized',
                productData.stock || 0,
                JSON.stringify(productData.variants || {})
            ], function(err) {
                if (err) reject(err);
                else resolve(productId);
            });
        });
    }
    
    // ==================== MEDIA METHODS ====================
    
    async saveMediaFile(userId, fileData) {
        const fileId = crypto.randomBytes(16).toString('hex');
        const storageName = `${fileId}_${Date.now()}_${fileData.originalName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storagePath = path.join(this.mediaPath, storageName);
        
        // Enkripsi file
        const encryptionKey = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);
        const encryptedData = this.encryptBuffer(fileData.buffer, encryptionKey, iv);
        
        // Simpan file terenkripsi
        fs.writeFileSync(storagePath, encryptedData);
        
        // Buat thumbnail jika gambar
        let thumbnailPath = null;
        if (fileData.mimeType.startsWith('image/')) {
            thumbnailPath = await this.createThumbnail(storagePath, fileId);
        }
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO media_files (
                    id, user_id, original_name, storage_name,
                    file_type, mime_type, size_bytes,
                    encryption_key, encryption_iv,
                    thumbnail_path, upload_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [
                fileId,
                userId,
                fileData.originalName,
                storageName,
                fileData.fileType,
                fileData.mimeType,
                fileData.size,
                encryptionKey,
                iv.toString('hex'),
                thumbnailPath,
                'completed'
            ], function(err) {
                if (err) {
                    // Clean up file if DB fails
                    fs.unlinkSync(storagePath);
                    reject(err);
                } else resolve(fileId);
            });
        });
    }
    
    async getMediaFile(fileId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM media_files WHERE id = ?', [fileId], (err, row) => {
                if (err) reject(err);
                else if (!row) resolve(null);
                else {
                    // Baca file dari disk
                    const filePath = path.join(this.mediaPath, row.storage_name);
                    if (fs.existsSync(filePath)) {
                        const encryptedData = fs.readFileSync(filePath);
                        const decryptedData = this.decryptBuffer(
                            encryptedData,
                            row.encryption_key,
                            Buffer.from(row.encryption_iv, 'hex')
                        );
                        
                        resolve({
                            ...row,
                            buffer: decryptedData,
                            filePath
                        });
                    } else {
                        resolve(null);
                    }
                }
            });
        });
    }
    
    // ==================== ENCRYPTION METHODS ====================
    
    encryptMessage(text, senderId, receiverId) {
        // Dapatkan encryption key untuk chat
        const chatKey = this.getChatEncryptionKey(senderId, receiverId);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', chatKey, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        
        return {
            content: encrypted,
            iv: iv.toString('hex'),
            authTag
        };
    }
    
    decryptMessage(encryptedData, senderId, receiverId) {
        const chatKey = this.getChatEncryptionKey(senderId, receiverId);
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm', 
            chatKey, 
            Buffer.from(encryptedData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
    
    encryptBuffer(buffer, key, iv) {
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        return Buffer.concat([cipher.update(buffer), cipher.final()]);
    }
    
    decryptBuffer(encryptedBuffer, key, iv) {
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    }
    
    getChatEncryptionKey(userId1, userId2) {
        // Generate consistent key untuk chat
        const sortedIds = [userId1, userId2].sort();
        const chatIdentifier = sortedIds.join('_');
        
        return crypto.createHash('sha256')
            .update(chatIdentifier + this.encryptionKey.toString('hex'))
            .digest();
    }
    
    // ==================== BACKUP METHODS ====================
    
    async createBackup() {
        const backupId = `backup_${Date.now()}`;
        const backupFile = path.join(this.backupPath, `${backupId}.db`);
        
        return new Promise((resolve, reject) => {
            // Backup database
            this.db.run('VACUUM INTO ?', [backupFile], (err) => {
                if (err) reject(err);
                else {
                    // Backup media folder
                    const mediaBackup = path.join(this.backupPath, `${backupId}_media.tar.gz`);
                    this.compressFolder(this.mediaPath, mediaBackup);
                    
                    // Log backup
                    this.db.run(
                        'INSERT INTO backup_schedules (id, schedule_type, last_run, status) VALUES (?, ?, ?, ?)',
                        [backupId, 'manual', new Date().toISOString(), 'completed']
                    );
                    
                    resolve({ backupId, backupFile, mediaBackup });
                }
            });
        });
    }
    
    async restoreBackup(backupId) {
        const backupFile = path.join(this.backupPath, `${backupId}.db`);
        
        if (!fs.existsSync(backupFile)) {
            throw new Error('Backup file not found');
        }
        
        // Tutup koneksi database saat ini
        this.db.close();
        
        // Ganti file database
        fs.copyFileSync(backupFile, this.dbPath);
        
        // Restart database connection
        this.initSQLite();
        
        return { success: true, message: 'Backup restored successfully' };
    }
    
    // ==================== UTILITY METHODS ====================
    
    generateAvatar(seed) {
        // Generate avatar berdasarkan phone number
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#fa709a', '#fee140', '#30cfd0', '#330867'
        ];
        
        const color = colors[parseInt(seed.slice(-2), 16) % colors.length];
        const initials = seed.slice(-2).toUpperCase();
        
        return JSON.stringify({
            type: 'generated',
            color,
            initials,
            seed
        });
    }
    
    generateChatId(userId1, userId2) {
        const sortedIds = [userId1, userId2].sort();
        return crypto.createHash('md5').update(sortedIds.join('_')).digest('hex');
    }
    
    async createThumbnail(filePath, fileId) {
        // Implementasi pembuatan thumbnail menggunakan sharp
        try {
            const sharp = require('sharp');
            const thumbnailPath = path.join(this.mediaPath, `thumb_${fileId}.jpg`);
            
            await sharp(filePath)
                .resize(200, 200, { fit: 'cover' })
                .jpeg({ quality: 70 })
                .toFile(thumbnailPath);
            
            return thumbnailPath;
        } catch (error) {
            console.error('Thumbnail creation failed:', error);
            return null;
        }
    }
    
    compressFolder(source, destination) {
        // Kompres folder menggunakan tar
        const { execSync } = require('child_process');
        try {
            execSync(`tar -czf "${destination}" -C "${path.dirname(source)}" "${path.basename(source)}"`);
            return true;
        } catch (error) {
            console.error('Compression failed:', error);
            return false;
        }
    }
    
    // ==================== STATISTICS METHODS ====================
    
    async getSystemStats() {
        return new Promise((resolve, reject) => {
            const queries = {
                totalUsers: 'SELECT COUNT(*) as count FROM users',
                totalMessages: 'SELECT COUNT(*) as count FROM messages',
                totalBusinesses: 'SELECT COUNT(*) as count FROM business_accounts WHERE verified_status = "verified"',
                activeSessions: 'SELECT COUNT(*) as count FROM sessions WHERE is_active = 1 AND expires_at > CURRENT_TIMESTAMP',
                storageUsage: 'SELECT SUM(size_bytes) as total FROM media_files',
                todayMessages: 'SELECT COUNT(*) as count FROM messages WHERE DATE(timestamp) = DATE("now")'
            };
            
            const stats = {};
            let completed = 0;
            const totalQueries = Object.keys(queries).length;
            
            Object.entries(queries).forEach(([key, sql]) => {
                this.db.get(sql, [], (err, row) => {
                    if (!err) stats[key] = row.count;
                    completed++;
                    
                    if (completed === totalQueries) {
                        resolve(stats);
                    }
                });
            });
        });
    }
    
    async getBusinessStats(businessId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(DISTINCT m.sender_id) as total_customers,
                    COUNT(*) as total_messages,
                    AVG(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END) * 100 as read_rate,
                    MIN(m.timestamp) as first_contact,
                    MAX(m.timestamp) as last_contact
                FROM messages m
                WHERE m.receiver_id = (SELECT user_id FROM business_accounts WHERE id = ?)
                AND DATE(m.timestamp) >= DATE('now', '-30 days')
            `;
            
            this.db.get(sql, [businessId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
    
    // ==================== CLEANUP METHODS ====================
    
    async cleanupExpiredData() {
        const cleanupTasks = [
            // Hapus session expired
            'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP',
            
            // Hapus status expired
            'DELETE FROM status_updates WHERE expires_at < CURRENT_TIMESTAMP',
            
            // Hapus media expired (jika ada expiry date)
            `DELETE FROM media_files WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP`,
            
            // Hapus backup lama
            `DELETE FROM backup_schedules WHERE last_run < DATE('now', '-? days')`
        ];
        
        return Promise.all(
            cleanupTasks.map(sql => 
                new Promise(resolve => {
                    this.db.run(sql, [90], () => resolve());
                })
            )
        );
    }
    
    // ==================== SEARCH METHODS ====================
    
    async searchMessages(userId, query, chatId = null) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT m.*, 
                    u1.name as sender_name,
                    u2.name as receiver_name,
                    c.name as chat_name
                FROM messages m
                LEFT JOIN users u1 ON m.sender_id = u1.id
                LEFT JOIN users u2 ON m.receiver_id = u2.id
                LEFT JOIN chats c ON m.chat_id = c.id
                WHERE (m.sender_id = ? OR m.receiver_id = ?)
                AND m.content_text LIKE ?
                AND m.is_deleted = 0
            `;
            
            const params = [userId, userId, `%${query}%`];
            
            if (chatId) {
                sql += ' AND m.chat_id = ?';
                params.push(chatId);
            }
            
            sql += ' ORDER BY m.timestamp DESC LIMIT 100';
            
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else {
                    // Dekripsi untuk pencarian
                    const decryptedRows = rows.map(row => {
                        if (row.content_encrypted) {
                            try {
                                row.content_text = this.decryptMessage({
                                    content: row.content_encrypted,
                                    iv: row.encryption_iv,
                                    authTag: row.encryption_auth_tag
                                }, row.sender_id, row.receiver_id);
                            } catch (e) {
                                row.content_text = '[Encrypted message]';
                            }
                        }
                        return row;
                    });
                    resolve(decryptedRows);
                }
            });
        });
    }
    
    async searchUsers(query) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT id, phone, name, avatar, about, 
                       is_verified, is_business, account_type
                FROM users 
                WHERE phone LIKE ? OR name LIKE ?
                LIMIT 50
            `;
            
            this.db.all(sql, [`%${query}%`, `%${query}%`], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

module.exports = ForexterDatabase;
