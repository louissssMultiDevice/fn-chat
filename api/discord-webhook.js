const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');

// Discord Webhook URL from config
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || 'https://discord.com/api/webhooks/1447218191813316710/5BOwc4MKU9mNeEdDJ6a_gUH6MUBQeVeLh3QKKv1tuAd_1KBi2PtFBwpX-hBXLBJxIal7';
const DISCORD_NAME = process.env.DISCORD_NAME || 'Forexter Bot';
const DISCORD_AVATAR = process.env.DISCORD_AVATAR || 'https://files.catbox.moe/pvnz0v.jpg';

// Send message to Discord
router.post('/send', async (req, res) => {
    try {
        const { content, embed, file } = req.body;
        
        let payload = {
            username: DISCORD_NAME,
            avatar_url: DISCORD_AVATAR
        };
        
        if (content) {
            payload.content = content;
        }
        
        if (embed) {
            payload.embeds = [embed];
        }
        
        // If there's a file, send as multipart/form-data
        if (file) {
            const formData = new FormData();
            formData.append('payload_json', JSON.stringify(payload));
            
            if (file.buffer && file.filename) {
                formData.append('file', Buffer.from(file.buffer), {
                    filename: file.filename,
                    contentType: file.contentType
                });
            }
            
            const response = await axios.post(DISCORD_WEBHOOK, formData, {
                headers: formData.getHeaders()
            });
            
            return res.json({ success: true, messageId: response.data?.id });
        } else {
            const response = await axios.post(DISCORD_WEBHOOK, payload);
            return res.json({ success: true, messageId: response.data?.id });
        }
        
    } catch (error) {
        console.error('Error sending to Discord:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send to Discord',
            details: error.response?.data || error.message
        });
    }
});

// Send chat message to Discord
router.post('/chat-message', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        const embed = {
            title: '💬 New Chat Message',
            description: message.content || '[No content]',
            fields: [
                {
                    name: '👤 User',
                    value: `${message.userName}${message.userTag}`,
                    inline: true
                },
                {
                    name: '🆔 User ID',
                    value: message.userId || 'Unknown',
                    inline: true
                }
            ],
            timestamp: new Date(message.timestamp || Date.now()).toISOString(),
            color: 0x7289da,
            footer: {
                text: 'Forexter Network Chat'
            }
        };
        
        const response = await axios.post(DISCORD_WEBHOOK, {
            username: DISCORD_NAME,
            avatar_url: DISCORD_AVATAR,
            embeds: [embed]
        });
        
        res.json({ success: true, messageId: response.data?.id });
        
    } catch (error) {
        console.error('Error sending chat message:', error);
        res.status(500).json({ error: 'Failed to send chat message' });
    }
});

// Send report to Discord
router.post('/report', async (req, res) => {
    try {
        const { report } = req.body;
        
        if (!report) {
            return res.status(400).json({ error: 'Report is required' });
        }
        
        const embed = {
            title: '🚨 New Report',
            description: report.details || 'No details provided',
            fields: [
                {
                    name: '📋 Type',
                    value: report.type || 'Unknown',
                    inline: true
                },
                {
                    name: '👤 Reporter',
                    value: report.reporter?.name || 'Anonymous',
                    inline: true
                }
            ],
            timestamp: new Date(report.timestamp || Date.now()).toISOString(),
            color: 0xf04747,
            footer: {
                text: 'Forexter Network Report System'
            }
        };
        
        if (report.targetUser) {
            embed.fields.push({
                name: '🎯 Target User',
                value: report.targetUser,
                inline: true
            });
        }
        
        const response = await axios.post(DISCORD_WEBHOOK, {
            username: DISCORD_NAME,
            avatar_url: DISCORD_AVATAR,
            embeds: [embed]
        });
        
        res.json({ success: true, messageId: response.data?.id });
        
    } catch (error) {
        console.error('Error sending report:', error);
        res.status(500).json({ error: 'Failed to send report' });
    }
});

// Send bot command log to Discord
router.post('/bot-command', async (req, res) => {
    try {
        const { command, user, result } = req.body;
        
        const embed = {
            title: '🤖 Bot Command Executed',
            fields: [
                {
                    name: '⌨️ Command',
                    value: `\`${command}\``,
                    inline: true
                },
                {
                    name: '👤 User',
                    value: user?.name || 'Unknown',
                    inline: true
                },
                {
                    name: '🆔 User ID',
                    value: user?.id || 'Unknown',
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            color: 0x43b581,
            footer: {
                text: 'Forexter Bot Log'
            }
        };
        
        if (result) {
            embed.fields.push({
                name: '📊 Result',
                value: result.substring(0, 1000) + (result.length > 1000 ? '...' : ''),
                inline: false
            });
        }
        
        const response = await axios.post(DISCORD_WEBHOOK, {
            username: DISCORD_NAME,
            avatar_url: DISCORD_AVATAR,
            embeds: [embed]
        });
        
        res.json({ success: true, messageId: response.data?.id });
        
    } catch (error) {
        console.error('Error sending bot command log:', error);
        res.status(500).json({ error: 'Failed to send bot command log' });
    }
});

// Send user join notification to Discord
router.post('/user-join', async (req, res) => {
    try {
        const { user } = req.body;
        
        const embed = {
            title: '👋 New User Joined',
            description: `${user.name}${user.tag} has joined the community!`,
            fields: [
                {
                    name: '🆔 User ID',
                    value: user.id || 'Unknown',
                    inline: true
                },
                {
                    name: '📅 Joined',
                    value: new Date(user.joined || Date.now()).toLocaleDateString(),
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            color: 0x43b581,
            footer: {
                text: 'Forexter Network Welcome'
            }
        };
        
        const response = await axios.post(DISCORD_WEBHOOK, {
            username: DISCORD_NAME,
            avatar_url: DISCORD_AVATAR,
            embeds: [embed]
        });
        
        res.json({ success: true, messageId: response.data?.id });
        
    } catch (error) {
        console.error('Error sending user join notification:', error);
        res.status(500).json({ error: 'Failed to send user join notification' });
    }
});

// Test webhook endpoint
router.post('/test', async (req, res) => {
    try {
        const embed = {
            title: '✅ Webhook Test',
            description: 'This is a test message from Forexter Network.',
            fields: [
                {
                    name: 'Status',
                    value: '✅ Working',
                    inline: true
                },
                {
                    name: 'Time',
                    value: new Date().toLocaleString(),
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            color: 0x7289da,
            footer: {
                text: 'Forexter Network Test'
            }
        };
        
        const response = await axios.post(DISCORD_WEBHOOK, {
            username: DISCORD_NAME,
            avatar_url: DISCORD_AVATAR,
            embeds: [embed]
        });
        
        res.json({ 
            success: true, 
            message: 'Webhook test sent successfully',
            messageId: response.data?.id 
        });
        
    } catch (error) {
        console.error('Webhook test failed:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Webhook test failed',
            details: error.response?.data || error.message
        });
    }
});

module.exports = router;
