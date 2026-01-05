const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');

// Import routers
const discordWebhook = require('./api/discord-webhook');
const authRoutes = require('./api/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database simulation
let db = {
    users: [],
    messages: [],
    reports: [],
    admins: [
        { username: 'ndii', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye' }, // ndii123
        { username: 'lan', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye' }, // lanyz123
        { username: 'lez', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye' }, // lez123
        { username: 'karin', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye' }, // karin123
        { username: 'kenzz', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye' }, // kenzz123
        { username: 'fanks', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye' }  // fanks123
    ],
    settings: {
        maintenance: false,
        theme: 'dark',
        autoJoin: true,
        allowGuest: true,
        botName: 'Forexter Bot',
        botPrefix: '!',
        discordWebhook: 'https://discord.com/api/webhooks/1447218191813316710/5BOwc4MKU9mNeEdDJ6a_gUH6MUBQeVeLh3QKKv1tuAd_1KBi2PtFBwpX-hBXLBJxIal7'
    }
};

// Routes
app.use('/api/discord-webhook', discordWebhook);
app.use('/api/auth', authRoutes);

// WebSocket connections
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('join', (userData) => {
        connectedUsers.set(socket.id, {
            ...userData,
            socketId: socket.id,
            online: true,
            joined: new Date().toISOString()
        });
        
        // Add to database if not exists
        const existingUser = db.users.find(u => u.id === userData.id);
        if (!existingUser) {
            db.users.push({
                ...userData,
                online: true,
                messageCount: 0,
                joined: new Date().toISOString()
            });
        } else {
            existingUser.online = true;
        }
        
        // Broadcast user joined
        socket.broadcast.emit('user_joined', {
            user: userData,
            timestamp: new Date().toISOString()
        });
        
        // Send updated user list
        updateUserList();
    });
    
    socket.on('message', (messageData) => {
        const user = connectedUsers.get(socket.id);
        
        if (!user) return;
        
        const message = {
            ...messageData,
            userId: user.id,
            userName: user.name,
            userTag: user.tag,
            userAvatar: user.avatar,
            timestamp: new Date().toISOString()
        };
        
        // Save to database
        db.messages.push(message);
        
        // Update user message count
        const dbUser = db.users.find(u => u.id === user.id);
        if (dbUser) {
            dbUser.messageCount = (dbUser.messageCount || 0) + 1;
        }
        
        // Broadcast message
        io.emit('message', message);
    });
    
    socket.on('typing', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            socket.broadcast.emit('typing', {
                userId: user.id,
                userName: user.name
            });
        }
    });
    
    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        
        if (user) {
            // Update user status
            user.online = false;
            
            // Update in database
            const dbUser = db.users.find(u => u.id === user.id);
            if (dbUser) {
                dbUser.online = false;
            }
            
            // Broadcast user left
            socket.broadcast.emit('user_left', {
                userId: user.id,
                userName: user.name,
                timestamp: new Date().toISOString()
            });
            
            connectedUsers.delete(socket.id);
            updateUserList();
        }
        
        console.log('Client disconnected:', socket.id);
    });
});

function updateUserList() {
    const onlineUsers = Array.from(connectedUsers.values()).map(user => ({
        id: user.id,
        name: user.name,
        tag: user.tag,
        avatar: user.avatar,
        online: true
    }));
    
    io.emit('users_update', {
        users: [...onlineUsers, ...db.users.filter(u => !u.online).map(u => ({
            ...u,
            online: false
        }))]
    });
}

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        users: connectedUsers.size,
        messages: db.messages.length,
        uptime: process.uptime()
    });
});

app.get('/api/users', (req, res) => {
    res.json({
        users: db.users,
        online: Array.from(connectedUsers.values()).length
    });
});

app.get('/api/admins', (req, res) => {
    res.json(db.admins.map(admin => ({
        username: admin.username,
        role: 'admin'
    })));
});

app.post('/api/report', async (req, res) => {
    try {
        const report = req.body;
        
        if (!report) {
            return res.status(400).json({ error: 'Report data is required' });
        }
        
        // Generate report ID
        const reportId = 'RPT' + Date.now().toString(36).toUpperCase();
        
        const fullReport = {
            id: reportId,
            ...report,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        
        // Save to database
        db.reports.push(fullReport);
        
        // Send to Discord
        try {
            const discordRes = await fetch('http://localhost:3000/api/discord-webhook/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ report: fullReport })
            });
        } catch (error) {
            console.error('Failed to send report to Discord:', error);
        }
        
        res.json({ 
            success: true, 
            reportId,
            message: 'Report submitted successfully' 
        });
        
    } catch (error) {
        console.error('Error submitting report:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

app.get('/api/status', async (req, res) => {
    try {
        // Check Minecraft server status
        const mcResponse = await fetch('https://api.mcstatus.io/v2/status/bedrock/play.forexternetwork.my.id:25300');
        const mcData = await mcResponse.json();
        
        res.json({
            website: {
                status: 'online',
                uptime: process.uptime()
            },
            minecraft: mcData,
            bot: {
                status: 'online',
                commands: db.messages.filter(m => m.content?.startsWith('!')).length
            },
            stats: {
                users: db.users.length,
                online: connectedUsers.size,
                messages: db.messages.length,
                reports: db.reports.length
            }
        });
    } catch (error) {
        res.json({
            website: {
                status: 'online',
                uptime: process.uptime()
            },
            minecraft: {
                online: false,
                error: 'Unable to fetch status'
            },
            bot: {
                status: 'online'
            },
            stats: {
                users: db.users.length,
                online: connectedUsers.size,
                messages: db.messages.length,
                reports: db.reports.length
            }
        });
    }
});

// Admin API Routes
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    const admin = db.admins.find(a => a.username === username);
    
    if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // In production, use bcrypt to compare passwords
    // For demo, we'll use simple comparison
    const isValid = password === `${username}123`;
    
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({
        success: true,
        admin: {
            username: admin.username,
            role: 'admin'
        }
    });
});

app.get('/api/admin/dashboard', (req, res) => {
    const stats = {
        totalUsers: db.users.length,
        onlineUsers: connectedUsers.size,
        totalMessages: db.messages.length,
        botCommands: db.messages.filter(m => m.content?.startsWith('!')).length,
        pendingReports: db.reports.filter(r => r.status === 'pending').length
    };
    
    const recentActivity = db.messages
        .slice(-10)
        .reverse()
        .map(msg => ({
            type: 'message',
            message: `${msg.userName}: ${msg.content?.substring(0, 50)}${msg.content?.length > 50 ? '...' : ''}`,
            timestamp: msg.timestamp
        }));
    
    res.json({ stats, recentActivity });
});

app.get('/api/admin/users', (req, res) => {
    res.json({ users: db.users });
});

app.get('/api/admin/reports', (req, res) => {
    res.json({ reports: db.reports });
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/admin/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'settings.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`🤖 Bot: http://localhost:${PORT}/bot`);
    console.log(`🔧 Admin: http://localhost:${PORT}/admin/login`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});
