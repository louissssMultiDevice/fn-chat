#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { exec } = require('child_process');

class SetupForexterChat {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.config = {
            port: 3000,
            adminEmail: '',
            adminPhone: '',
            databasePath: './forexterchat.db',
            mediaPath: './media',
            backupPath: './backups',
            encryptionKey: null,
            whatsappSession: './whatsapp_sessions'
        };
    }
    
    async start() {
        console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         🚀 FOREXTERCHAT PRO SETUP WIZARD                 ║
║                                                          ║
║      Enterprise Chat Platform with WhatsApp Bridge       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
        `);
        
        await this.askQuestions();
        await this.generateKeys();
        await this.createFolders();
        await this.createConfigFiles();
        await this.installDependencies();
        await this.createAdminAccount();
        await this.displaySetupComplete();
        
        this.rl.close();
    }
    
    askQuestions() {
        return new Promise((resolve) => {
            const questions = [
                {
                    question: 'Enter port number (default: 3000): ',
                    field: 'port',
                    default: '3000',
                    validator: (val) => !isNaN(val) && val > 0 && val < 65536
                },
                {
                    question: 'Enter admin email address: ',
                    field: 'adminEmail',
                    validator: (val) => val.includes('@') && val.includes('.')
                },
                {
                    question: 'Enter admin phone number (with country code): ',
                    field: 'adminPhone',
                    validator: (val) => /^\+?[1-9]\d{1,14}$/.test(val.replace(/\s+/g, ''))
                },
                {
                    question: 'Enter database path (default: ./forexterchat.db): ',
                    field: 'databasePath',
                    default: './forexterchat.db'
                },
                {
                    question: 'Enter media storage path (default: ./media): ',
                    field: 'mediaPath',
                    default: './media'
                }
            ];
            
            let current = 0;
            
            const askNext = () => {
                if (current >= questions.length) {
                    resolve();
                    return;
                }
                
                const q = questions[current];
                this.rl.question(q.question, (answer) => {
                    const value = answer.trim() || q.default;
                    
                    if (q.validator && !q.validator(value)) {
                        console.log('⚠️  Invalid input. Please try again.');
                        askNext();
                        return;
                    }
                    
                    this.config[q.field] = value;
                    current++;
                    askNext();
                });
            };
            
            askNext();
        });
    }
    
    async generateKeys() {
        console.log('\n🔑 Generating encryption keys...');
        
        // Generate master encryption key
        this.config.encryptionKey = crypto.randomBytes(32).toString('hex');
        
        // Generate JWT secret
        const jwtSecret = crypto.randomBytes(64).toString('hex');
        
        // Save keys to .env file
        const envContent = `
PORT=${this.config.port}
NODE_ENV=production
ENCRYPTION_KEY=${this.config.encryptionKey}
JWT_SECRET=${jwtSecret}
ADMIN_EMAIL=${this.config.adminEmail}
ADMIN_PHONE=${this.config.adminPhone}
DATABASE_PATH=${this.config.databasePath}
MEDIA_PATH=${this.config.mediaPath}
BACKUP_PATH=${this.config.backupPath}
WHATSAPP_SESSION_PATH=${this.config.whatsappSession}
LOG_LEVEL=info
MAX_FILE_SIZE=52428800
SESSION_TIMEOUT=2592000000
        `.trim();
        
        fs.writeFileSync('.env', envContent);
        
        console.log('✅ Encryption keys generated and saved to .env');
    }
    
    async createFolders() {
        console.log('\n📁 Creating folder structure...');
        
        const folders = [
            this.config.mediaPath,
            this.config.backupPath,
            this.config.whatsappSession,
            './public',
            './public/assets',
            './public/admin-panel',
            './public/business-dashboard',
            './logs',
            './temp'
        ];
        
        folders.forEach(folder => {
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder, { recursive: true });
                console.log(`   Created: ${folder}`);
            }
        });
        
        console.log('✅ Folder structure created');
    }
    
    async createConfigFiles() {
        console.log('\n📄 Creating configuration files...');
        
        // Create database configuration
        const dbConfig = {
            database: this.config.databasePath,
            media: this.config.mediaPath,
            backups: this.config.backupPath,
            maxConnections: 10,
            timeout: 5000
        };
        
        fs.writeFileSync(
            'server/config/database.json',
            JSON.stringify(dbConfig, null, 2)
        );
        
        // Create server configuration
        const serverConfig = {
            port: parseInt(this.config.port),
            host: '0.0.0.0',
            cors: {
                origin: ['http://localhost:' + this.config.port],
                credentials: true
            },
            rateLimit: {
                windowMs: 15 * 60 * 1000,
                max: 100
            },
            upload: {
                maxFileSize: 50 * 1024 * 1024,
                allowedTypes: [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'video/mp4',
                    'audio/mpeg',
                    'application/pdf'
                ]
            }
        };
        
        fs.writeFileSync(
            'server/config/server.json',
            JSON.stringify(serverConfig, null, 2)
        );
        
        // Create business configuration
        const businessConfig = {
            plans: {
                free: {
                    max_products: 10,
                    max_broadcasts: 5,
                    support: 'email',
                    analytics: false
                },
                pro: {
                    max_products: 100,
                    max_broadcasts: 50,
                    support: 'priority',
                    analytics: true,
                    price: 50000
                },
                enterprise: {
                    max_products: 1000,
                    max_broadcasts: 500,
                    support: '24/7',
                    analytics: true,
                    price: 500000
                }
            },
            verification: {
                required_documents: ['business_license', 'id_card'],
                auto_approve: false,
                review_timeout: 48
            }
        };
        
        fs.writeFileSync(
            'server/config/business.json',
            JSON.stringify(businessConfig, null, 2)
        );
        
        console.log('✅ Configuration files created');
    }
    
    async installDependencies() {
        console.log('\n📦 Installing dependencies...');
        
        return new Promise((resolve, reject) => {
            exec('npm install', (error, stdout, stderr) => {
                if (error) {
                    console.log('⚠️  Some dependencies may have failed to install');
                    console.log('Error:', error.message);
                } else {
                    console.log('✅ Dependencies installed successfully');
                }
                resolve();
            });
        });
    }
    
    async createAdminAccount() {
        console.log('\n👑 Creating admin account...');
        
        // This will be done by the main server on first run
        // For now, just create a placeholder
        const adminData = {
            phone: this.config.adminPhone,
            email: this.config.adminEmail,
            is_admin: true,
            is_verified: true,
            account_type: 'admin'
        };
        
        fs.writeFileSync(
            'server/config/admin.json',
            JSON.stringify(adminData, null, 2)
        );
        
        console.log('✅ Admin account configured');
        console.log(`   Phone: ${this.config.adminPhone}`);
        console.log(`   Email: ${this.config.adminEmail}`);
    }
    
    async displaySetupComplete() {
        console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         🎉 SETUP COMPLETE!                               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

📋 Next Steps:
────────────────────────────────────────────────────────────

1. 🚀 Start the server:
   $ npm start

2. 🌐 Access the platform:
   • Web App: http://localhost:${this.config.port}
   • Admin Panel: http://localhost:${this.config.port}/admin
   • Business Portal: http://localhost:${this.config.port}/business

3. 📱 Configure WhatsApp Bridge:
   • Go to Admin Panel → WhatsApp Bridge
   • Scan the QR code with your phone
   • Bridge will connect automatically

4. 👑 Admin Login:
   • Phone: ${this.config.adminPhone}
   • Use "admin123" as initial password
   • Change password immediately

5. 🔧 Important Files:
   • Config: server/config/
   • Database: ${this.config.databasePath}
   • Logs: logs/

⚠️  SECURITY NOTES:
────────────────────────────────────────────────────────────
• Keep your .env file secure - NEVER commit it to Git
• Change default passwords immediately
• Enable firewall on your server
• Regular backups are in ./backups/
• Monitor logs for suspicious activity

📞 Support & Documentation:
────────────────────────────────────────────────────────────
• Docs: https://docs.forexterchat.id
• Support: support@forexterchat.id
• Community: https://community.forexterchat.id

        `);
        
        // Create first run flag
        fs.writeFileSync('.first-run', 'true');
    }
}

// Run setup
if (require.main === module) {
    const setup = new SetupForexterChat();
    setup.start().catch(console.error);
}

module.exports = SetupForexterChat;
