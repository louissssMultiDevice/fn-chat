const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin credentials (in production, use database)
const ADMINS = [
    { username: 'ndii', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeMRYI6Ykz7Z8JQ.7Qa7Jq3JqLk2ZvX9a' }, // ndii123
    { username: 'lan', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeMRYI6Ykz7Z8JQ.7Qa7Jq3JqLk2ZvX9a' }, // lanyz123
    { username: 'lez', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeMRYI6Ykz7Z8JQ.7Qa7Jq3JqLk2ZvX9a' }, // lez123
    { username: 'karin', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeMRYI6Ykz7Z8JQ.7Qa7Jq3JqLk2ZvX9a' }, // karin123
    { username: 'kenzz', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeMRYI6Ykz7Z8JQ.7Qa7Jq3JqLk2ZvX9a' }, // kenzz123
    { username: 'fanks', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeMRYI6Ykz7Z8JQ.7Qa7Jq3JqLk2ZvX9a' }  // fanks123
];

const JWT_SECRET = process.env.JWT_SECRET || 'forexter-secret-key-2026';

// Login admin
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password, adminCode } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username dan password diperlukan' 
            });
        }
        
        // Find admin
        const admin = ADMINS.find(a => a.username === username);
        
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                error: 'Username atau password salah' 
            });
        }
        
        // Check password (in production, use bcrypt.compare)
        // For demo, we'll use simple comparison
        const isValidPassword = password === `${username}123`;
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Username atau password salah' 
            });
        }
        
        // Check admin code if provided
        if (adminCode && adminCode !== 'FOREXTER2026') {
            return res.status(401).json({ 
                success: false, 
                error: 'Kode admin salah' 
            });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { 
                username: admin.username,
                role: 'admin',
                timestamp: Date.now()
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            admin: {
                username: admin.username,
                role: 'admin'
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Terjadi kesalahan saat login' 
        });
    }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Token diperlukan' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            error: 'Token tidak valid' 
        });
    }
};

// Check auth status
router.get('/check', verifyToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Get admin list (public)
router.get('/admins', (req, res) => {
    res.json({
        success: true,
        admins: ADMINS.map(admin => ({
            username: admin.username,
            role: 'admin'
        }))
    });
});

// Logout (client-side only, just clear token)
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logout berhasil' });
});

module.exports = router;
