const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const FormData = require('form-data');

// Import settings and handlers
const config = require('../config');
const MessageHandler = require('./function');
const CommandHandler = require('./handler');

class ForexterBot {
    constructor() {
        this.sock = null;
        this.msgHandler = null;
        this.cmdHandler = null;
        this.isConnected = false;
        this.commands = new Map();
        
        // Initialize express server for webhooks
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        
        this.setupWebhookRoutes();
    }
    
    async initialize() {
        console.log('🚀 Initializing Forexter Bot...');
        
        try {
            // Setup WhatsApp connection
            await this.connectToWhatsApp();
            
            // Initialize message handler
            this.msgHandler = new MessageHandler(this.sock);
            
            // Initialize command handler
            this.cmdHandler = new CommandHandler(this.sock, this.msgHandler);
            
            // Load commands
            await this.loadCommands();
            
            // Start web server
            this.startWebServer();
            
            console.log('✅ Forexter Bot initialized successfully!');
            
        } catch (error) {
            console.error('❌ Bot initialization failed:', error);
            process.exit(1);
        }
    }
    
    async connectToWhatsApp() {
        const { state, saveCreds } = await useMultiFileAuthState('./auth');
        const { version } = await fetchLatestBaileysVersion();
        
        this.sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: true,
            auth: state,
            browser: ['Forexter Bot', 'Chrome', '1.0.0']
        });
        
        // Handle connection updates
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect) {
                    console.log('🔄 Connection closed, reconnecting...');
                    await this.connectToWhatsApp();
                } else {
                    console.log('❌ Connection closed, logged out.');
                }
            } else if (connection === 'open') {
                console.log('✅ Connected to WhatsApp!');
                this.isConnected = true;
                
                // Send connection notification to Discord
                await this.sendToDiscord({
                    title: '🤖 Bot Connected',
                    description: `Forexter Bot is now online!\nTime: ${new Date().toLocaleString()}`,
                    color: 0x43b581
                });
            }
        });
        
        // Save credentials
        this.sock.ev.on('creds.update', saveCreds);
        
        // Handle incoming messages
        this.sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                if (msg.key.fromMe) continue;
                
                try {
                    await this.handleIncomingMessage(msg);
                } catch (error) {
                    console.error('Error handling message:', error);
                }
            }
        });
    }
    
    async handleIncomingMessage(msg) {
        if (!msg.message) return;
        
        const messageType = Object.keys(msg.message)[0];
        const sender = msg.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');
        
        // Forward to Discord webhook
        await this.forwardToDiscord(msg);
        
        // Check for bot commands
        if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
            const text = messageType === 'conversation' 
                ? msg.message.conversation 
                : msg.message.extendedTextMessage?.text;
            
            if (text && text.startsWith('!')) {
                await this.cmdHandler.handleCommand(msg, text);
            }
        }
    }
    
    async forwardToDiscord(msg) {
        if (!config.DISCORD_WEBHOOK) return;
        
        try {
            const messageType = Object.keys(msg.message)[0];
            let content = '';
            
            switch (messageType) {
                case 'conversation':
                    content = msg.message.conversation;
                    break;
                case 'extendedTextMessage':
                    content = msg.message.extendedTextMessage?.text;
                    break;
                case 'imageMessage':
                    content = '[Image Message]';
                    break;
                case 'videoMessage':
                    content = '[Video Message]';
                    break;
                case 'audioMessage':
                    content = '[Audio Message]';
                    break;
                default:
                    return;
            }
            
            const sender = msg.key.participant || msg.key.remoteJid;
            const isGroup = msg.key.remoteJid.endsWith('@g.us');
            
            const payload = {
                username: config.BOT.name,
                avatar_url: config.BOT.avatar || 'https://files.catbox.moe/pvnz0v.jpg',
                embeds: [{
                    title: isGroup ? '💬 Group Message' : '💭 Private Message',
                    description: content,
                    fields: [
                        {
                            name: '👤 Sender',
                            value: sender.split('@')[0],
                            inline: true
                        },
                        {
                            name: '📍 Location',
                            value: isGroup ? 'Group Chat' : 'Private Chat',
                            inline: true
                        }
                    ],
                    timestamp: new Date().toISOString(),
                    color: isGroup ? 0x7289da : 0x43b581
                }]
            };
            
            await axios.post(config.DISCORD_WEBHOOK, payload);
            
        } catch (error) {
            console.error('Error forwarding to Discord:', error);
        }
    }
    
    async sendToDiscord(embed) {
        if (!config.DISCORD_WEBHOOK) return;
        
        try {
            const payload = {
                username: config.BOT.name,
                avatar_url: config.BOT.avatar || 'https://files.catbox.moe/pvnz0v.jpg',
                embeds: [{
                    ...embed,
                    timestamp: new Date().toISOString()
                }]
            };
            
            await axios.post(config.DISCORD_WEBHOOK, payload);
        } catch (error) {
            console.error('Error sending to Discord:', error);
        }
    }
    
    async loadCommands() {
        const commandsDir = path.join(__dirname, 'commands');
        
        try {
            const files = await fs.readdir(commandsDir);
            
            for (const file of files) {
                if (file.endsWith('.js')) {
                    try {
                        const command = require(path.join(commandsDir, file));
                        
                        if (command.command && command.execute) {
                            this.commands.set(command.command, command);
                            console.log(`✅ Loaded command: ${command.command}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error loading command ${file}:`, error);
                    }
                }
            }
            
            console.log(`📁 Total commands loaded: ${this.commands.size}`);
        } catch (error) {
            console.error('Error loading commands:', error);
        }
    }
    
    setupWebhookRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                bot: this.isConnected ? 'online' : 'offline',
                version: config.BOT.version 
            });
        });
        
        // Send message endpoint (from web to WhatsApp)
        this.app.post('/send-message', async (req, res) => {
            try {
                const { to, message, type = 'text' } = req.body;
                
                if (!to || !message) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                
                let result;
                
                switch (type) {
                    case 'text':
                        result = await this.msgHandler.sendText(to, message);
                        break;
                    case 'image':
                        result = await this.msgHandler.sendImage(to, message.buffer, message.caption || '');
                        break;
                    case 'audio':
                        result = await this.msgHandler.sendAudio(to, message.buffer);
                        break;
                    default:
                        return res.status(400).json({ error: 'Invalid message type' });
                }
                
                res.json({ success: true, messageId: result.key.id });
            } catch (error) {
                console.error('Error sending message:', error);
                res.status(500).json({ error: 'Failed to send message' });
            }
        });
        
        // Bot command endpoint
        this.app.post('/bot-command', async (req, res) => {
            try {
                const { command, args, user } = req.body;
                
                if (!command) {
                    return res.status(400).json({ error: 'Command is required' });
                }
                
                // Find and execute command
                const cmd = this.commands.get(command.toLowerCase());
                
                if (!cmd) {
                    return res.status(404).json({ error: 'Command not found' });
                }
                
                // Simulate message object for command execution
                const fakeMsg = {
                    key: {
                        remoteJid: 'web@forexter',
                        participant: user?.id || 'web-user'
                    },
                    message: {
                        conversation: `!${command} ${args || ''}`
                    }
                };
                
                await cmd.execute(fakeMsg, this.sock, this.msgHandler, args);
                
                res.json({ success: true });
            } catch (error) {
                console.error('Error executing command:', error);
                res.status(500).json({ error: 'Command execution failed' });
            }
        });
        
        // Discord webhook endpoint (for Discord to web)
        this.app.post('/discord-webhook', async (req, res) => {
            try {
                const { content, author, channel } = req.body;
                
                // Broadcast Discord message to all web clients
                // This would require WebSocket implementation
                
                res.json({ success: true });
            } catch (error) {
                console.error('Error handling Discord webhook:', error);
                res.status(500).json({ error: 'Webhook processing failed' });
            }
        });
    }
    
    startWebServer() {
        const PORT = process.env.PORT || 3000;
        
        this.app.listen(PORT, () => {
            console.log(`🌐 Web server listening on port ${PORT}`);
        });
    }
}

// Start the bot
const bot = new ForexterBot();
bot.initialize().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down bot...');
    
    await bot.sendToDiscord({
        title: '🤖 Bot Disconnected',
        description: `Forexter Bot is going offline.\nTime: ${new Date().toLocaleString()}`,
        color: 0xf04747
    });
    
    process.exit(0);
});

module.exports = { ForexterBot };
