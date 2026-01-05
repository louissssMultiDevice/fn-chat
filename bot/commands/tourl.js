const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
    command: 'tourl',
    description: 'Upload media ke catbox.moe dan dapatkan URL',
    usage: '!tourl [reply to media]',
    async execute(msg, sock, msgHandler) {
        try {
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMsg) {
                return await msgHandler.sendReply(msg,
                    `📤 **Cara Upload Media ke URL:**\n\n` +
                    `1. Reply media (gambar/video/audio) dengan command !tourl\n` +
                    `2. Bot akan upload ke catbox.moe\n` +
                    `3. Dapatkan link permanen\n\n` +
                    `📎 **Supported:** JPG, PNG, GIF, MP4, MP3, PDF`
                );
            }
            
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '⏳');
            
            // Download media
            const media = await msgHandler.downloadMedia(msg);
            
            if (!media) {
                return await msgHandler.sendReply(msg, '❌ Tidak dapat mendownload media.');
            }
            
            // Upload to catbox.moe
            const url = await this.uploadToCatbox(media);
            
            if (!url) {
                return await msgHandler.sendReply(msg, '❌ Gagal mengupload ke catbox.moe');
            }
            
            // Send result
            await msgHandler.sendReply(msg,
                `✅ **Media uploaded successfully!**\n\n` +
                `🔗 **URL:** ${url}\n` +
                `📁 **Type:** ${media.type}\n` +
                `💾 **Size:** ${(media.buffer.length / 1024).toFixed(2)}KB\n\n` +
                `📋 **Short URL:** ${await this.shortenUrl(url)}`
            );
            
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '✅');
            
            // Clean up temp file
            if (media.path) {
                try {
                    await fs.unlink(media.path);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
            
        } catch (error) {
            console.error('Tourl error:', error);
            await msgHandler.sendReply(msg, '❌ Gagal mengupload media.');
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '❌');
        }
    },
    
    async uploadToCatbox(media) {
        try {
            const formData = new FormData();
            formData.append('reqtype', 'fileupload');
            formData.append('userhash', '');
            formData.append('fileToUpload', media.buffer, {
                filename: `file_${Date.now()}.${this.getExtension(media.type)}`,
                contentType: this.getMimeType(media.type)
            });
            
            const response = await axios.post('https://catbox.moe/user/api.php', formData, {
                headers: formData.getHeaders(),
                timeout: 30000
            });
            
            return response.data.trim();
        } catch (error) {
            console.error('Catbox upload error:', error);
            return null;
        }
    },
    
    async shortenUrl(url) {
        try {
            // Use tinyurl for shortening
            const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
            return response.data;
        } catch (error) {
            return url; // Return original URL if shortening fails
        }
    },
    
    getExtension(type) {
        const extensions = {
            'imageMessage': 'jpg',
            'videoMessage': 'mp4',
            'audioMessage': 'mp3',
            'documentMessage': 'pdf',
            'stickerMessage': 'webp'
        };
        
        return extensions[type] || 'bin';
    },
    
    getMimeType(type) {
        const mimeTypes = {
            'imageMessage': 'image/jpeg',
            'videoMessage': 'video/mp4',
            'audioMessage': 'audio/mpeg',
            'documentMessage': 'application/pdf',
            'stickerMessage': 'image/webp'
        };
        
        return mimeTypes[type] || 'application/octet-stream';
    }
};
