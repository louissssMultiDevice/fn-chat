const axios = require('axios');

module.exports = {
    command: 'ai',
    description: 'Chat dengan AI (various models)',
    aliases: ['ask', 'chatgpt', 'gpt'],
    async execute(msg, sock, msgHandler, args) {
        try {
            if (!args) {
                return await msgHandler.sendReply(msg,
                    `🤖 **AI Chat Assistant**\n\n` +
                    `Chat dengan AI menggunakan berbagai model:\n\n` +
                    `📝 **Usage:** !ai [pertanyaan]\n` +
                    `**Examples:**\n` +
                    `• !ai Apa itu JavaScript?\n` +
                    `• !ai Buatkan puisi tentang alam\n` +
                    `• !ai Jelaskan teori relativitas\n\n` +
                    `🧠 **Models Available:**\n` +
                    `• GPT-3.5 (default)\n` +
                    `• Gemini (Google)\n` +
                    `• Claude (Anthropic)\n\n` +
                    `⚠️ **Note:** API keys required for full functionality`
                );
            }
            
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '⏳');
            
            // Try different AI APIs
            const response = await this.getAIResponse(args);
            
            if (!response) {
                return await msgHandler.sendReply(msg,
                    '❌ Gagal mendapatkan respon dari AI.\n' +
                    'API mungkin sedang offline atau rate limited.'
                );
            }
            
            await msgHandler.sendReply(msg,
                `🤖 **AI Response:**\n\n` +
                `${response}\n\n` +
                `📊 **Model:** ${response.model || 'GPT-3.5'}\n` +
                `⏱️ **Response Time:** ${response.time || 'N/A'}ms\n` +
                `🔢 **Tokens:** ${response.tokens || 'N/A'}`
            );
            
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '✅');
            
        } catch (error) {
            console.error('AI command error:', error);
            await msgHandler.sendReply(msg, '❌ Terjadi kesalahan saat memproses request AI.');
            await msgHandler.sendReaction(msg.key.remoteJid, msg.key, '❌');
        }
    },
    
    async getAIResponse(query) {
        try {
            // Try OpenAI API first
            if (process.env.OPENAI_API_KEY) {
                return await this.callOpenAI(query);
            }
            
            // Try Gemini API
            if (process.env.GEMINI_API_KEY) {
                return await this.callGemini(query);
            }
            
            // Fallback to free API
            return await this.callFreeAI(query);
            
        } catch (error) {
            console.error('AI API error:', error);
            return null;
        }
    },
    
    async callOpenAI(query) {
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "Kamu adalah asisten AI untuk Forexter Bot. Jawablah dengan ramah dan informatif dalam bahasa Indonesia."
                    },
                    {
                        role: "user",
                        content: query
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            const answer = response.data.choices[0].message.content;
            
            return {
                text: answer,
                model: 'GPT-3.5 Turbo',
                tokens: response.data.usage.total_tokens,
                time: response.headers['openai-processing-ms']
            };
            
        } catch (error) {
            throw error;
        }
    },
    
    async callGemini(query) {
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                    contents: [{
                        parts: [{
                            text: query
                        }]
                    }]
                },
                {
                    timeout: 10000
                }
            );
            
            const answer = response.data.candidates[0].content.parts[0].text;
            
            return {
                text: answer,
                model: 'Gemini Pro',
                time: 'N/A'
            };
            
        } catch (error) {
            throw error;
        }
    },
    
    async callFreeAI(query) {
        try {
            // Using free AI API (example)
            const response = await axios.get('https://api.weirdgpt.org/v1/chat', {
                params: {
                    message: query,
                    language: 'id'
                },
                timeout: 10000
            });
            
            return {
                text: response.data.response,
                model: 'Free AI',
                time: response.data.time
            };
            
        } catch (error) {
            // Return default response if all APIs fail
            return {
                text: `Maaf, saya tidak bisa menjawab pertanyaan "${query}" saat ini. Silakan coba lagi nanti atau hubungi admin untuk bantuan.`,
                model: 'Fallback',
                time: 0
            };
        }
    }
};
