// Chat Application JavaScript

class ForexterChat {
    constructor() {
        this.user = null;
        this.messages = [];
        this.users = [];
        this.admins = [];
        this.typingUsers = new Set();
        this.socket = null;
        
        this.initialize();
    }
    
    async initialize() {
        this.loadUser();
        this.loadMessages();
        this.setupEventListeners();
        this.connectWebSocket();
        this.updateOnlineUsers();
        this.loadAdmins();
        
        // Auto join community if enabled
        if (this.getSetting('autoJoin')) {
            await this.joinCommunity();
        }
    }
    
    loadUser() {
        const savedUser = localStorage.getItem('forexter_user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
        } else {
            this.user = {
                id: 'guest_' + Math.random().toString(36).substr(2, 9),
                name: 'Guest',
                tag: '#' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
                avatar: `https://ui-avatars.com/api/?name=Guest&background=${this.getRandomColor()}`,
                color: '#7289da',
                bio: '',
                role: 'member',
                joined: new Date().toISOString()
            };
            this.saveUser();
        }
        
        this.updateUI();
    }
    
    saveUser() {
        localStorage.setItem('forexter_user', JSON.stringify(this.user));
    }
    
    loadMessages() {
        const savedMessages = localStorage.getItem('forexter_messages');
        if (savedMessages) {
            this.messages = JSON.parse(savedMessages);
            this.displayMessages();
        }
    }
    
    saveMessages() {
        localStorage.setItem('forexter_messages', JSON.stringify(this.messages.slice(-100))); // Keep last 100 messages
    }
    
    setupEventListeners() {
        // Message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', (e) => this.handleInput(e));
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        // Send button
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Close sidebar
        const closeSidebar = document.getElementById('closeSidebar');
        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Profile button
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProfileMenu();
            });
        }
        
        // Close profile menu when clicking outside
        document.addEventListener('click', () => {
            const profileMenu = document.getElementById('profileMenu');
            if (profileMenu) {
                profileMenu.style.display = 'none';
            }
        });
        
        // Command hints
        messageInput?.addEventListener('input', () => this.showCommandHints());
        
        // Initialize emoji picker
        this.initEmojiPicker();
        
        // Load commands list
        this.loadCommandsList();
    }
    
    updateUI() {
        // Update user info
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const avatarPreview = document.getElementById('avatarPreview');
        
        if (userName) userName.textContent = `${this.user.name}${this.user.tag}`;
        if (userAvatar) userAvatar.src = this.user.avatar;
        if (avatarPreview) avatarPreview.querySelector('img').src = this.user.avatar;
        
        // Update profile form
        const profileName = document.getElementById('profileName');
        const profileTag = document.getElementById('profileTag');
        const profileBio = document.getElementById('profileBio');
        
        if (profileName) profileName.value = this.user.name;
        if (profileTag) profileTag.value = this.user.tag;
        if (profileBio) profileBio.value = this.user.bio || '';
        
        // Apply user color
        this.applyUserColor();
    }
    
    applyUserColor() {
        document.documentElement.style.setProperty('--user-color', this.user.color);
    }
    
    async joinCommunity() {
        try {
            // Send join notification to Discord
            await this.sendToDiscord({
                title: '👋 New Member Joined',
                description: `${this.user.name}${this.user.tag} has joined the community!`,
                color: 0x43b581,
                fields: [
                    {
                        name: 'User ID',
                        value: this.user.id,
                        inline: true
                    }
                ]
            });
            
            // Add welcome message
            this.addSystemMessage(`Welcome ${this.user.name}${this.user.tag} to Forexter Network!`);
            
            // Update user list
            this.users.push({
                ...this.user,
                online: true,
                lastSeen: new Date().toISOString()
            });
            
            this.updateOnlineUsers();
            
        } catch (error) {
            console.error('Error joining community:', error);
        }
    }
    
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput?.value.trim();
        
        if (!message) return;
        
        // Clear input
        messageInput.value = '';
        
        // Hide command hints
        this.hideCommandHints();
        
        // Check if it's a bot command
        if (message.startsWith('!')) {
            await this.handleBotCommand(message);
            return;
        }
        
        // Create message object
        const messageObj = {
            id: Date.now().toString(),
            userId: this.user.id,
            userName: this.user.name,
            userTag: this.user.tag,
            userAvatar: this.user.avatar,
            content: message,
            timestamp: new Date().toISOString(),
            type: 'text'
        };
        
        // Add to messages
        this.messages.push(messageObj);
        this.displayMessage(messageObj);
        this.saveMessages();
        
        // Send to WebSocket
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'message',
                data: messageObj
            }));
        }
        
        // Send to Discord webhook
        await this.sendMessageToDiscord(messageObj);
    }
    
    async handleBotCommand(command) {
        const [cmd, ...args] = command.slice(1).split(' ');
        
        // Show typing indicator
        this.showTypingIndicator('Forexter Bot is typing...');
        
        try {
            // Send command to backend
            const response = await fetch('/api/bot-command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: cmd.toLowerCase(),
                    args: args.join(' '),
                    user: this.user
                })
            });
            
            if (!response.ok) {
                throw new Error('Command failed');
            }
            
            const data = await response.json();
            
            // Add bot response
            setTimeout(() => {
                this.hideTypingIndicator();
                this.addBotResponse(cmd, args.join(' '), data);
            }, 1000);
            
        } catch (error) {
            console.error('Command error:', error);
            this.hideTypingIndicator();
            this.addSystemMessage(`❌ Command "${cmd}" failed. Please try again.`);
        }
    }
    
    addBotResponse(command, args, data) {
        let responseText = '';
        
        switch (command.toLowerCase()) {
            case 'ping':
                responseText = '🏓 Pong! Bot is online and responsive.';
                break;
                
            case 'menu':
                responseText = this.getMenuResponse();
                break;
                
            case 'admin':
                responseText = this.getAdminList();
                break;
                
            case 'owner':
                responseText = this.getOwnerInfo();
                break;
                
            case 'status':
                responseText = this.getServerStatus();
                break;
                
            default:
                responseText = data?.response || `✅ Command "${command}" executed successfully.`;
        }
        
        this.addBotMessage(responseText);
    }
    
    getMenuResponse() {
        return `
🤖 **Forexter Bot Menu**

📋 **Basic Commands:**
• !ping - Check bot status
• !menu - Show this menu
• !status - Server status
• !owner - Contact owner

👥 **Community Commands:**
• !admin - List admins
• !hidetag - Tag all members
• !listfitur - List all features

🎤 **AI Commands:**
• !tts text,tokoh - TTS with Indonesian figures
• !ai [query] - AI chat

📁 **File Commands:**
• !tourl - Upload media to URL
• !getcode [file] - View bot code

💡 **Type !help [command] for details**
        `;
    }
    
    getAdminList() {
        const admins = this.admins.map(admin => 
            `• ${admin.name}${admin.tag} - ${admin.role}`
        ).join('\n');
        
        return `
🛡️ **Admin List:**

${admins || 'No admins found'}

⚠️ Please respect all admins and follow community rules.
        `;
    }
    
    getOwnerInfo() {
        return `
👑 **Owner Information:**

• Name: Lan
• Tag: @lan
• Contact: [Click to Call](tel:)

📞 You can contact the owner for important matters.
        `;
    }
    
    async getServerStatus() {
        try {
            // Fetch server status from API
            const response = await fetch('https://api.mcstatus.io/v2/status/bedrock/play.forexternetwork.my.id:25300');
            const data = await response.json();
            
            if (data.online) {
                return `
🟢 **Server Status: ONLINE**

• Players: ${data.players?.online || 0}/${data.players?.max || 100}
• Version: ${data.version?.name || 'Unknown'}
• MOTD: ${data.motd?.clean || 'Welcome to Forexter Network!'}

🌐 **Website Status:** ✅ Online
🤖 **Bot Status:** ✅ Online
                `;
            } else {
                return `
🔴 **Server Status: OFFLINE**

The server is currently offline for maintenance.
Please check back later.

🌐 **Website Status:** ✅ Online
🤖 **Bot Status:** ✅ Online
                `;
            }
        } catch (error) {
            return `
❓ **Server Status: UNKNOWN**

Unable to fetch server status.
Please try again later.

🌐 **Website Status:** ✅ Online
🤖 **Bot Status:** ✅ Online
            `;
        }
    }
    
    addBotMessage(content) {
        const messageObj = {
            id: Date.now().toString(),
            userId: 'bot',
            userName: 'Forexter Bot',
            userAvatar: 'https://files.catbox.moe/pvnz0v.jpg',
            content: content,
            timestamp: new Date().toISOString(),
            type: 'bot'
        };
        
        this.messages.push(messageObj);
        this.displayMessage(messageObj);
        this.saveMessages();
    }
    
    addSystemMessage(content) {
        const messageObj = {
            id: Date.now().toString(),
            userId: 'system',
            userName: 'System',
            userAvatar: 'https://cdn-icons-png.flaticon.com/512/929/929429.png',
            content: content,
            timestamp: new Date().toISOString(),
            type: 'system'
        };
        
        this.messages.push(messageObj);
        this.displayMessage(messageObj);
        this.saveMessages();
    }
    
    displayMessages() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.messages.forEach(message => {
            this.displayMessage(message, false);
        });
        
        // Scroll to bottom
        this.scrollToBottom();
    }
    
    displayMessage(message, scroll = true) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        const messageElement = this.createMessageElement(message);
        container.appendChild(messageElement);
        
        if (scroll) {
            this.scrollToBottom();
        }
    }
    
    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message-bubble ${message.userId === this.user.id ? 'user' : 
                        message.userId === 'bot' ? 'bot' : 
                        message.userId === 'system' ? 'system' : 'other'}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        div.innerHTML = `
            <div class="message-header">
                <img src="${message.userAvatar}" alt="${message.userName}">
                <span class="name">${message.userName}${message.userTag}</span>
                <span class="time">${time}</span>
            </div>
            <div class="message-content">${this.formatMessageContent(message.content)}</div>
        `;
        
        return div;
    }
    
    formatMessageContent(content) {
        // Convert URLs to links
        content = content.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Convert newlines to <br>
        content = content.replace(/\n/g, '<br>');
        
        // Convert **bold** to <strong>
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert *italic* to <em>
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Convert `code` to <code>
        content = content.replace(/`(.*?)`/g, '<code>$1</code>');
        
        return content;
    }
    
    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
    
    handleInput(e) {
        // Send typing indicator
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'typing',
                userId: this.user.id,
                userName: this.user.name
            }));
        }
    }
    
    showTypingIndicator(text) {
        const indicator = document.getElementById('typingIndicator');
        const typingUser = document.getElementById('typingUser');
        
        if (indicator && typingUser) {
            typingUser.textContent = text;
            indicator.style.display = 'flex';
        }
    }
    
    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
    }
    
    toggleProfileMenu() {
        const menu = document.getElementById('profileMenu');
        if (menu) {
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
    }
    
    async loadAdmins() {
        try {
            const response = await fetch('/api/admins');
            const data = await response.json();
            this.admins = data;
            this.displayAdmins();
        } catch (error) {
            console.error('Error loading admins:', error);
        }
    }
    
    displayAdmins() {
        const adminList = document.getElementById('adminList');
        if (!adminList) return;
        
        adminList.innerHTML = this.admins.map(admin => `
            <div class="admin-item">
                <i class="fas fa-shield-alt"></i>
                <div>
                    <strong>${admin.name}</strong>
                    <small>${admin.role}</small>
                </div>
            </div>
        `).join('');
    }
    
    updateOnlineUsers() {
        const onlineUsers = document.getElementById('onlineUsers');
        if (!onlineUsers) return;
        
        onlineUsers.innerHTML = this.users
            .filter(user => user.online)
            .map(user => `
                <div class="user-item">
                    <img src="${user.avatar}" alt="${user.name}">
                    <div>
                        <strong>${user.name}${user.tag}</strong>
                        <small>${user.role}</small>
                    </div>
                    <div class="status online"></div>
                </div>
            `).join('');
        
        // Update online count
        const onlineCount = this.users.filter(user => user.online).length;
        const totalCount = this.users.length;
        
        const onlineCountElement = document.getElementById('onlineCount');
        const totalMembersElement = document.getElementById('totalMembers');
        const totalOnlineElement = document.getElementById('totalOnline');
        
        if (onlineCountElement) {
            onlineCountElement.textContent = `${onlineCount} users online`;
        }
        
        if (totalMembersElement) {
            totalMembersElement.textContent = totalCount;
        }
        
        if (totalOnlineElement) {
            totalOnlineElement.textContent = onlineCount;
        }
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('WebSocket connected');
            
            // Send user info
            this.socket.send(JSON.stringify({
                type: 'join',
                user: this.user
            }));
        };
        
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'message':
                        if (data.data.userId !== this.user.id) {
                            this.messages.push(data.data);
                            this.displayMessage(data.data);
                            this.saveMessages();
                            
                            // Play notification sound
                            this.playNotificationSound();
                        }
                        break;
                        
                    case 'user_joined':
                        this.users.push({
                            ...data.user,
                            online: true
                        });
                        this.updateOnlineUsers();
                        this.addSystemMessage(`${data.user.name}${data.user.tag} joined the chat`);
                        break;
                        
                    case 'user_left':
                        const userIndex = this.users.findIndex(u => u.id === data.userId);
                        if (userIndex > -1) {
                            this.users[userIndex].online = false;
                            this.updateOnlineUsers();
                        }
                        break;
                        
                    case 'typing':
                        if (data.userId !== this.user.id) {
                            this.showTypingIndicator(`${data.userName} is typing...`);
                            
                            // Clear typing indicator after 3 seconds
                            clearTimeout(this.typingTimeout);
                            this.typingTimeout = setTimeout(() => {
                                this.hideTypingIndicator();
                            }, 3000);
                        }
                        break;
                        
                    case 'users_update':
                        this.users = data.users;
                        this.updateOnlineUsers();
                        break;
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };
        
        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            
            // Try to reconnect after 5 seconds
            setTimeout(() => {
                this.connectWebSocket();
            }, 5000);
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    playNotificationSound() {
        if (this.getSetting('enableSounds')) {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        }
    }
    
    showCommandHints() {
        const input = document.getElementById('messageInput');
        const hints = document.getElementById('commandHints');
        
        if (!input || !hints) return;
        
        const value = input.value;
        
        if (value.startsWith('!') && value.length > 1) {
            const command = value.slice(1).toLowerCase();
            const matchingCommands = this.commands.filter(cmd => 
                cmd.command.startsWith(command) || 
                cmd.aliases?.some(alias => alias.startsWith(command))
            );
            
            if (matchingCommands.length > 0) {
                hints.innerHTML = matchingCommands.map(cmd => `
                    <div class="hint-item" onclick="forexterChat.selectCommandHint('${cmd.command}')">
                        <strong>!${cmd.command}</strong>
                        <small>${cmd.description}</small>
                    </div>
                `).join('');
                hints.style.display = 'block';
            } else {
                hints.style.display = 'none';
            }
        } else {
            hints.style.display = 'none';
        }
    }
    
    hideCommandHints() {
        const hints = document.getElementById('commandHints');
        if (hints) {
            hints.style.display = 'none';
        }
    }
    
    selectCommandHint(command) {
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = `!${command} `;
            input.focus();
            this.hideCommandHints();
        }
    }
    
    initEmojiPicker() {
        const emojiCategories = {
            smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇'],
            people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟'],
            nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'],
            food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈'],
            activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱'],
            objects: ['💡', '🔦', '🕯️', '🔌', '🔋', '📱', '💻', '⌚', '🖥️', '🖨️'],
            symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔'],
            flags: ['🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇳', '🇮🇩', '🇺🇸', '🇬🇧', '🇯🇵']
        };
        
        const emojiGrid = document.getElementById('emojiGrid');
        if (!emojiGrid) return;
        
        // Load default category
        this.loadEmojiCategory('smileys', emojiCategories);
        
        // Setup category buttons
        const categoryButtons = document.querySelectorAll('.emoji-category');
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.dataset.category;
                
                // Update active button
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Load emojis for category
                this.loadEmojiCategory(category, emojiCategories);
            });
        });
    }
    
    loadEmojiCategory(category, emojiCategories) {
        const emojiGrid = document.getElementById('emojiGrid');
        if (!emojiGrid) return;
        
        const emojis = emojiCategories[category] || [];
        
        emojiGrid.innerHTML = emojis.map(emoji => `
            <button class="emoji-item" onclick="forexterChat.insertEmoji('${emoji}')">
                ${emoji}
            </button>
        `).join('');
    }
    
    insertEmoji(emoji) {
        const input = document.getElementById('messageInput');
        if (input) {
            const cursorPos = input.selectionStart;
            const text = input.value;
            const newText = text.substring(0, cursorPos) + emoji + text.substring(cursorPos);
            
            input.value = newText;
            input.focus();
            input.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
        }
        
        this.toggleEmojiPicker();
    }
    
    toggleEmojiPicker() {
        const picker = document.getElementById('emojiPicker');
        if (picker) {
            picker.style.display = picker.style.display === 'block' ? 'none' : 'block';
        }
    }
    
    async sendMessageToDiscord(message) {
        try {
            const response = await fetch('/api/discord-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'chat_message',
                    message: message
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send to Discord');
            }
        } catch (error) {
            console.error('Error sending to Discord:', error);
        }
    }
    
    async sendToDiscord(embed) {
        try {
            const response = await fetch('/api/discord-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'embed',
                    embed: embed
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send to Discord');
            }
        } catch (error) {
            console.error('Error sending to Discord:', error);
        }
    }
    
    loadCommandsList() {
        this.commands = [
            { command: 'menu', description: 'Show bot menu', aliases: ['help'] },
            { command: 'ping', description: 'Check bot status', aliases: ['status'] },
            { command: 'tts', description: 'Text-to-speech with Indonesian figures', aliases: [] },
            { command: 'admin', description: 'List community admins', aliases: [] },
            { command: 'owner', description: 'Show owner information', aliases: ['creator'] },
            { command: 'hidetag', description: 'Tag all members without @', aliases: ['tagall'] },
            { command: 'status', description: 'Check server status', aliases: ['server'] },
            { command: 'tourl', description: 'Upload media to URL', aliases: ['upload'] },
            { command: 'listfitur', description: 'List all bot features', aliases: ['features'] },
            { command: 'getcode', description: 'View bot source code', aliases: ['code'] },
            { command: 'ai', description: 'Chat with AI', aliases: ['ask'] }
        ];
    }
    
    getRandomColor() {
        const colors = ['7289da', '43b581', 'faa61a', 'f04747', '593695', '202225'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    getSetting(key) {
        const settings = JSON.parse(localStorage.getItem('forexter_settings') || '{}');
        return settings[key] !== undefined ? settings[key] : true;
    }
    
    setSetting(key, value) {
        const settings = JSON.parse(localStorage.getItem('forexter_settings') || '{}');
        settings[key] = value;
        localStorage.setItem('forexter_settings', JSON.stringify(settings));
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.forexterChat = new ForexterChat();
});

// Global functions for HTML onclick attributes
function sendBotCommand(command) {
    if (window.forexterChat) {
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = command;
            window.forexterChat.sendMessage();
        }
    }
}

function showTTSModal() {
    const modal = document.getElementById('ttsModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function showSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function editProfile() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function toggleEmojiPicker() {
    if (window.forexterChat) {
        window.forexterChat.toggleEmojiPicker();
    }
}

function shareCommunity() {
    const shareUrl = `${window.location.origin}/chat.html?ref=${window.forexterChat?.user?.id || 'share'}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Forexter Network Chat',
            text: 'Join me in Forexter Network Chat community!',
            url: shareUrl
        });
    } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

function attachFile() {
    // Implement file attachment
    alert('File attachment feature coming soon!');
}

function attachImage() {
    // Implement image attachment
    alert('Image attachment feature coming soon!');
}

function recordAudio() {
    // Implement audio recording
    alert('Audio recording feature coming soon!');
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (window.forexterChat) {
            window.forexterChat.sendMessage();
        }
    }
}

function clearChat() {
    if (confirm('Are you sure you want to clear all messages?')) {
        window.forexterChat.messages = [];
        window.forexterChat.saveMessages();
        window.forexterChat.displayMessages();
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    window.forexterChat?.setSetting('theme', newTheme);
}

function showHelp() {
    alert(`Forexter Chat Help:

1. Type messages in the input box and press Enter to send
2. Use ! before commands to interact with the bot
3. Click on user avatars to view profiles
4. Use the sidebar to see online users and bot commands
5. Report inappropriate content using the flag button
6. Share the community using the share button

Enjoy chatting!`);
}
