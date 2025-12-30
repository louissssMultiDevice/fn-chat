// Main Application Controller
class ForexterChat {
    constructor() {
        this.init();
    }

    async init() {
        // Initialize components
        await this.initializeDatabase();
        this.initializeSocket();
        this.initializeUI();
        this.initializeEventListeners();
        this.initializeServiceWorker();
        this.loadUserPreferences();
        
        // Show loading screen for 2 seconds
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            this.showPage('login-page');
        }, 2000);
    }

    async initializeDatabase() {
        // Initialize IndexedDB
        this.db = new LocalDatabase();
        await this.db.init();
        
        // Load initial data
        await this.loadInitialData();
    }

    initializeSocket() {
        // Connect to Socket.IO server (local simulation)
        this.socket = io('http://localhost:3000', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        // Socket event listeners
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.showNotification('Connected', 'You are now online', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showNotification('Disconnected', 'You are offline', 'warning');
        });

        this.socket.on('new_message', this.handleNewMessage.bind(this));
        this.socket.on('user_status', this.handleUserStatus.bind(this));
        this.socket.on('call_incoming', this.handleIncomingCall.bind(this));
        this.socket.on('notification', this.handleNotification.bind(this));
    }

    initializeUI() {
        // Initialize all UI components
        this.currentPage = 'login-page';
        this.currentChat = null;
        this.currentCall = null;
        
        // Initialize emoji picker
        this.initializeEmojiPicker();
        
        // Initialize link detector
        this.initializeLinkDetector();
        
        // Initialize QR scanner
        this.initializeQRScanner();
        
        // Initialize voice recorder
        this.voiceRecorder = new VoiceRecorder();
        
        // Initialize WebRTC
        this.webrtc = new WebRTCManager();
        
        // Initialize AI
        this.ai = new AIAssistant();
    }

    initializeEventListeners() {
        // Login Page
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchLoginTab(e.target.dataset.tab));
        });

        document.getElementById('request-otp-wa').addEventListener('click', () => this.requestWhatsAppOTP());
        document.getElementById('verify-otp').addEventListener('click', () => this.verifyOTP());
        document.getElementById('admin-login-btn').addEventListener('click', () => this.adminLogin());
        document.getElementById('generate-qr').addEventListener('click', () => this.generateQRCode());

        // Chat Interface
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.getElementById('attach-btn').addEventListener('click', () => this.toggleAttachmentPreview());
        document.getElementById('voice-record-btn').addEventListener('click', () => this.startVoiceRecording());
        document.getElementById('voice-call-btn').addEventListener('click', () => this.startVoiceCall());
        document.getElementById('video-call-btn').addEventListener('click', () => this.startVideoCall());
        document.getElementById('emoji-btn').addEventListener('click', () => this.toggleEmojiPicker());
        document.getElementById('link-btn').addEventListener('click', () => this.insertLink());

        // Sidebar tabs
        document.querySelectorAll('.sidebar-tabs .tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchChatTab(e.target.dataset.tab));
        });

        // AI assistants
        document.querySelectorAll('.ai-item').forEach(ai => {
            ai.addEventListener('click', (e) => this.startAIChat(e.target.dataset.ai));
        });

        // Admin
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAdminSection(e.target.dataset.section));
        });

        document.getElementById('assign-number').addEventListener('click', () => this.assignCustomNumber());

        // Modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        document.getElementById('modal-overlay').addEventListener('click', () => this.closeModal());

        // Settings
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchSettingsTab(e.target.dataset.tab));
        });

        // Quick actions
        document.getElementById('quick-group').addEventListener('click', () => this.showCreateGroupModal());
        document.getElementById('quick-channel').addEventListener('click', () => this.showCreateChannelModal());
        document.getElementById('quick-community').addEventListener('click', () => this.showCreateCommunityModal());
    }

    async loadInitialData() {
        // Load user data from local storage
        this.userData = await this.db.getUserData();
        this.chats = await this.db.getChats();
        this.contacts = await this.db.getContacts();
        
        // Update UI
        this.updateUserProfile();
        this.updateChatList();
        this.updateContactsList();
    }

    // Page Navigation
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
        document.getElementById(pageId).classList.remove('hidden');
        this.currentPage = pageId;
        
        if (pageId === 'main-chat') {
            this.updateUnreadCounts();
        }
    }

    // Login System
    switchLoginTab(tab) {
        document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tab}-login`).classList.add('active');
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    }

    async requestWhatsAppOTP() {
        const phone = document.getElementById('wa-number').value;
        if (!phone) {
            this.showNotification('Error', 'Please enter phone number', 'error');
            return;
        }

        // Show loading
        this.showNotification('Sending OTP', 'Sending OTP to your WhatsApp...', 'info');

        // Simulate OTP sending
        setTimeout(() => {
            document.querySelector('.otp-input').classList.remove('hidden');
            this.showNotification('OTP Sent', 'Check your WhatsApp for OTP code', 'success');
        }, 2000);
    }

    async verifyOTP() {
        const otp = Array.from(document.querySelectorAll('.otp-digit'))
            .map(input => input.value)
            .join('');

        if (otp.length !== 6) {
            this.showNotification('Error', 'Please enter 6-digit OTP', 'error');
            return;
        }

        // Verify OTP (simulated)
        this.showNotification('Verifying', 'Verifying OTP...', 'info');

        setTimeout(async () => {
            // Generate device fingerprint
            const deviceId = await this.generateDeviceFingerprint();
            
            // Check if device is approved
            const isApproved = await this.checkDeviceApproval(deviceId);
            
            if (isApproved) {
                await this.loginUser();
            } else {
                await this.requestDeviceApproval(deviceId);
            }
        }, 1500);
    }

    async generateDeviceFingerprint() {
        // Generate unique device ID
        const fingerprint = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookiesEnabled: navigator.cookieEnabled
        };

        // Create hash
        const fingerprintString = JSON.stringify(fingerprint);
        const hash = await this.hashString(fingerprintString);
        
        // Store in local storage
        localStorage.setItem('device_id', hash);
        localStorage.setItem('device_info', fingerprintString);
        
        return hash;
    }

    async hashString(str) {
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    async checkDeviceApproval(deviceId) {
        // Check if device is approved
        const approvedDevices = await this.db.getApprovedDevices();
        return approvedDevices.some(device => device.id === deviceId);
    }

    async requestDeviceApproval(deviceId) {
        // Send approval request to admin
        const request = {
            deviceId,
            deviceInfo: JSON.parse(localStorage.getItem('device_info')),
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        await this.db.saveLoginRequest(request);
        
        // Show pending approval screen
        this.showNotification(
            'Device Approval Required',
            'Your device needs admin approval. Please wait...',
            'warning'
        );

        // Listen for approval
        this.socket.on('device_approved', async (data) => {
            if (data.deviceId === deviceId) {
                await this.loginUser();
            }
        });
    }

    async loginUser() {
        // Complete login
        this.userData = {
            id: 'user_' + Date.now(),
            phone: document.getElementById('wa-number').value,
            name: 'User ' + document.getElementById('wa-number').value,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('User')}&background=075e54&color=fff`,
            status: 'Online',
            customNumber: null,
            isVerified: false
        };

        await this.db.saveUserData(this.userData);
        
        // Update UI
        this.updateUserProfile();
        this.showPage('main-chat');
        this.showNotification('Login Successful', 'Welcome to ForexterChat!', 'success');
    }

    adminLogin() {
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;

        if (username === 'admin' && password === 'admin123') {
            this.showPage('admin-dashboard');
            this.loadAdminData();
        } else {
            this.showNotification('Error', 'Invalid admin credentials', 'error');
        }
    }

    // Chat System
    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Clear input
        input.value = '';

        // Create message object
        const messageObj = {
            id: 'msg_' + Date.now(),
            sender: this.userData.id,
            receiver: this.currentChat?.id || 'public',
            content: message,
            timestamp: new Date().toISOString(),
            type: 'text',
            status: 'sent'
        };

        // Save to database
        await this.db.saveMessage(messageObj);

        // Send via Socket.IO
        this.socket.emit('send_message', messageObj);

        // Update UI
        this.appendMessage(messageObj, 'sent');

        // If chat is with AI, get response
        if (this.currentChat?.type === 'ai') {
            this.getAIResponse(message);
        }
    }

    async getAIResponse(message) {
        // Show typing indicator
        this.showTypingIndicator();

        // Get AI response
        const response = await this.ai.getResponse(message, this.currentChat.ai);
        
        // Remove typing indicator
        this.hideTypingIndicator();

        // Create AI message
        const aiMessage = {
            id: 'ai_' + Date.now(),
            sender: this.currentChat.id,
            receiver: this.userData.id,
            content: response,
            timestamp: new Date().toISOString(),
            type: 'text',
            status: 'delivered'
        };

        // Save and display
        await this.db.saveMessage(aiMessage);
        this.appendMessage(aiMessage, 'received');

        // Send via Socket.IO
        this.socket.emit('ai_response', aiMessage);
    }

    handleNewMessage(message) {
        // Check if message is for current chat
        if (message.receiver === this.currentChat?.id || 
            (message.receiver === 'public' && this.currentChat?.type === 'public')) {
            this.appendMessage(message, 'received');
        }

        // Update chat list
        this.updateChatList();

        // Show notification if not in chat
        if (document.hidden || this.currentChat?.id !== message.sender) {
            this.showMessageNotification(message);
        }
    }

    appendMessage(message, type) {
        const messagesContainer = document.getElementById('chat-messages');
        
        // Remove welcome message if exists
        const welcomeMsg = messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        // Create message element
        const messageElement = this.createMessageElement(message, type);
        messagesContainer.appendChild(messageElement);
        
        // Auto scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(message, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.dataset.id = message.id;

        let content = message.content;
        
        // Check for links and create previews
        if (message.type === 'text') {
            content = this.parseLinks(content);
        }

        div.innerHTML = `
            <div class="message-content">
                <div class="message-text">${content}</div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
            ${type === 'sent' ? `<div class="message-status">✓✓</div>` : ''}
        `;

        return div;
    }

    parseLinks(text) {
        // URL regex pattern
        const urlRegex = /(https?:\/\/[^\s]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(www\.[^\s]+)/g;
        
        return text.replace(urlRegex, (url) => {
            // Create link preview
            return this.createLinkPreview(url);
        });
    }

    createLinkPreview(url) {
        // Determine link type
        let type = 'website';
        let icon = 'fas fa-globe';
        let title = 'Website';
        let description = 'Visit this website';

        // Check for user links
        if (url.includes('@s.forexter.net')) {
            type = 'user';
            icon = 'fas fa-user';
            title = 'User Profile';
            description = 'Contact this user';
        }
        // Check for group links
        else if (url.includes('@group.forexter.net')) {
            type = 'group';
            icon = 'fas fa-users';
            title = 'Group Chat';
            description = 'Join this group';
        }
        // Check for channel links
        else if (url.includes('@newsletter.forexter.net')) {
            type = 'channel';
            icon = 'fas fa-broadcast-tower';
            title = 'Channel';
            description = 'Subscribe to this channel';
        }
        // Check for community links
        else if (url.includes('@comunitry.forexter.net')) {
            type = 'community';
            icon = 'fas fa-globe-asia';
            title = 'Community';
            description = 'Join this community';
        }

        return `
            <div class="link-preview-box" data-url="${url}" data-type="${type}">
                <div class="link-preview-image">
                    <i class="${icon}"></i>
                </div>
                <div class="link-preview-info">
                    <div class="link-preview-title">${title}</div>
                    <div class="link-preview-description">${description}</div>
                    <div class="link-preview-url">${url}</div>
                    <div class="link-preview-actions">
                        <button class="link-action-btn copy-link" onclick="app.copyToClipboard('${url}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="link-action-btn secondary visit-link" onclick="app.visitLink('${url}')">
                            <i class="fas fa-external-link-alt"></i> Visit
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Call System
    async startVoiceCall() {
        if (!this.currentChat) {
            this.showNotification('Error', 'Select a chat first', 'error');
            return;
        }

        this.currentCall = {
            type: 'voice',
            with: this.currentChat,
            status: 'calling'
        };

        this.showCallInterface();
        this.socket.emit('start_call', this.currentCall);
    }

    async startVideoCall() {
        if (!this.currentChat) {
            this.showNotification('Error', 'Select a chat first', 'error');
            return;
        }

        this.currentCall = {
            type: 'video',
            with: this.currentChat,
            status: 'calling'
        };

        this.showCallInterface();
        
        // Start local video
        await this.webrtc.startLocalVideo();
        
        // Start call
        this.socket.emit('start_call', this.currentCall);
    }

    async handleIncomingCall(callData) {
        // Show incoming call notification
        this.showIncomingCallNotification(callData);
    }

    async answerCall() {
        if (this.currentCall?.type === 'video') {
            await this.webrtc.startLocalVideo();
        }
        
        this.currentCall.status = 'connected';
        this.updateCallUI();
        
        this.socket.emit('answer_call', this.currentCall);
    }

    async endCall() {
        if (this.currentCall?.type === 'video') {
            await this.webrtc.stopLocalVideo();
        }
        
        this.socket.emit('end_call', this.currentCall);
        this.currentCall = null;
        this.showPage('main-chat');
    }

    // Group/Channel/Community Creation
    async showCreateGroupModal() {
        this.showModal('create-group-modal');
    }

    async createGroup() {
        const name = document.getElementById('group-name').value;
        const description = document.getElementById('group-description').value;
        const privacy = document.getElementById('group-privacy').value;

        if (!name) {
            this.showNotification('Error', 'Group name is required', 'error');
            return;
        }

        const group = {
            id: 'group_' + Date.now(),
            name,
            description,
            privacy,
            type: 'group',
            link: `group_${Date.now()}@group.forexter.net`,
            members: [this.userData.id],
            admins: [this.userData.id],
            createdAt: new Date().toISOString()
        };

        await this.db.saveGroup(group);
        
        // Add to chat list
        this.chats.unshift({
            ...group,
            lastMessage: 'Group created',
            unread: 0,
            timestamp: new Date().toISOString()
        });

        this.updateChatList();
        this.closeModal();
        this.showNotification('Success', 'Group created successfully', 'success');
    }

    async showCreateChannelModal() {
        this.showModal('create-channel-modal');
    }

    async createChannel() {
        const name = document.getElementById('channel-name').value;
        const description = document.getElementById('channel-description').value;

        if (!name) {
            this.showNotification('Error', 'Channel name is required', 'error');
            return;
        }

        const channel = {
            id: 'channel_' + Date.now(),
            name,
            description,
            type: 'channel',
            link: `channel_${Date.now()}@newsletter.forexter.net`,
            subscribers: [this.userData.id],
            admins: [this.userData.id],
            createdAt: new Date().toISOString()
        };

        await this.db.saveChannel(channel);
        
        // Add to chat list
        this.chats.unshift({
            ...channel,
            lastMessage: 'Channel created',
            unread: 0,
            timestamp: new Date().toISOString()
        });

        this.updateChatList();
        this.closeModal();
        this.showNotification('Success', 'Channel created successfully', 'success');
    }

    async showCreateCommunityModal() {
        this.showModal('create-community-modal');
    }

    async createCommunity() {
        const name = document.getElementById('community-name').value;
        const description = document.getElementById('community-description').value;

        if (!name) {
            this.showNotification('Error', 'Community name is required', 'error');
            return;
        }

        const community = {
            id: 'community_' + Date.now(),
            name,
            description,
            type: 'community',
            link: `community_${Date.now()}@comunitry.forexter.net`,
            members: [this.userData.id],
            admins: [this.userData.id],
            groups: [],
            createdAt: new Date().toISOString()
        };

        await this.db.saveCommunity(community);
        
        // Add to chat list
        this.chats.unshift({
            ...community,
            lastMessage: 'Community created',
            unread: 0,
            timestamp: new Date().toISOString()
        });

        this.updateChatList();
        this.closeModal();
        this.showNotification('Success', 'Community created successfully', 'success');
    }

    // QR Code System
    async generateQRCode() {
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = '';
        
        // Generate random session ID
        const sessionId = 'session_' + Date.now();
        
        // Create QR data
        const qrData = JSON.stringify({
            type: 'login',
            sessionId,
            timestamp: new Date().toISOString(),
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        // Generate QR code
        QRCode.toCanvas(qrData, { width: 200, height: 200 }, (err, canvas) => {
            if (err) {
                this.showNotification('Error', 'Failed to generate QR code', 'error');
                return;
            }
            
            qrContainer.appendChild(canvas);
            document.getElementById('qr-display').classList.remove('hidden');
        });

        // Listen for QR scan
        this.socket.on('qr_scanned', async (data) => {
            if (data.sessionId === sessionId) {
                // Complete login
                await this.loginUser();
                this.socket.emit('qr_verified', { sessionId });
            }
        });
    }

    initializeQRScanner() {
        // Initialize QR scanner for login
        const qrScanner = new Html5Qrcode("qr-scanner");
        
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 } 
        };

        qrScanner.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                // Handle scanned QR code
                this.handleScannedQR(decodedText);
                qrScanner.stop();
            }
        ).catch(err => {
            console.error('QR Scanner failed:', err);
        });
    }

    async handleScannedQR(qrData) {
        try {
            const data = JSON.parse(qrData);
            
            if (data.type === 'login') {
                // Send scan confirmation
                this.socket.emit('scan_qr', data);
                
                // Wait for verification
                this.showNotification('Scan Successful', 'Waiting for verification...', 'info');
                
                this.socket.on('qr_verified', () => {
                    this.loginUser();
                });
            } else if (data.type === 'contact') {
                // Add contact
                await this.addContact(data.contact);
            } else if (data.type === 'group') {
                // Join group
                await this.joinGroup(data.group);
            } else if (data.type === 'channel') {
                // Subscribe to channel
                await this.subscribeChannel(data.channel);
            }
        } catch (error) {
            console.error('Invalid QR code:', error);
            this.showNotification('Error', 'Invalid QR code', 'error');
        }
    }

    // Notification System
    showNotification(title, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        
        let icon = 'fas fa-info-circle';
        if (type === 'success') icon = 'fas fa-check-circle';
        if (type === 'error') icon = 'fas fa-exclamation-circle';
        if (type === 'warning') icon = 'fas fa-exclamation-triangle';

        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        const container = document.getElementById('notification-container');
        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    showMessageNotification(message) {
        // Check if notifications are enabled
        if (!this.userPreferences?.notifications) return;

        // Create notification
        const title = message.senderName || 'New Message';
        const body = message.type === 'text' ? message.content : `New ${message.type}`;

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/assets/icon.png' });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body, icon: '/assets/icon.png' });
                }
            });
        }
    }

    // Utility Methods
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        if (date.toDateString() === now.toDateString()) {
            return 'Today';
        }
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        
        return date.toLocaleDateString();
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied', 'Text copied to clipboard', 'success');
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showNotification('Error', 'Failed to copy text', 'error');
        }
    }

    async visitLink(url) {
        // Handle different link types
        if (url.includes('@s.forexter.net')) {
            // Open user profile
            this.showUserProfile(url);
        } else if (url.includes('@group.forexter.net')) {
            // Join group
            this.joinGroupByLink(url);
        } else if (url.includes('@newsletter.forexter.net')) {
            // Subscribe to channel
            this.subscribeChannelByLink(url);
        } else if (url.includes('@comunitry.forexter.net')) {
            // Join community
            this.joinCommunityByLink(url);
        } else {
            // Open website in new tab
            window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
        }
    }

    // Modal System
    showModal(modalId) {
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById(modalId).classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden'));
    }

    // Admin Methods
    async loadAdminData() {
        // Load admin data
        const users = await this.db.getAllUsers();
        const requests = await this.db.getPendingRequests();
        const stats = await this.db.getStats();

        // Update UI
        this.updateAdminDashboard(users, requests, stats);
    }

    async assignCustomNumber() {
        const userId = document.getElementById('user-select').value;
        const number = document.getElementById('custom-number').value;
        const type = document.getElementById('verification-level').value;

        if (!userId || !number) {
            this.showNotification('Error', 'Please select user and enter number', 'error');
            return;
        }

        // Validate number format
        if (!this.validatePhoneNumber(number)) {
            this.showNotification('Error', 'Invalid phone number format', 'error');
            return;
        }

        // Assign number
        await this.db.assignCustomNumber(userId, number, type);
        
        // Update UI
        this.loadAdminData();
        this.showNotification('Success', 'Number assigned successfully', 'success');
    }

    validatePhoneNumber(number) {
        // Simple phone number validation
        const regex = /^\+?[\d\s\-\(\)]{10,}$/;
        return regex.test(number);
    }

    // Service Worker
    async initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // User Preferences
    async loadUserPreferences() {
        this.userPreferences = await this.db.getUserPreferences() || {
            notifications: true,
            linkPreview: true,
            cameraEnhancement: true,
            autoDownload: true,
            readReceipts: true,
            lastSeenPrivacy: 'contacts',
            profilePhotoPrivacy: 'contacts'
        };

        // Apply preferences
        this.applyUserPreferences();
    }

    applyUserPreferences() {
        // Apply camera enhancement
        if (this.userPreferences.cameraEnhancement) {
            this.enableCameraEnhancement();
        }

        // Apply link preview
        if (!this.userPreferences.linkPreview) {
            document.querySelectorAll('.link-preview-box').forEach(el => el.style.display = 'none');
        }
    }

    enableCameraEnhancement() {
        // Apply camera enhancement filters
        const video = document.getElementById('local-video-element');
        if (video) {
            video.style.filter = 'contrast(1.1) brightness(1.1) saturate(1.2)';
        }
    }

    // Update UI Methods
    updateUserProfile() {
        if (!this.userData) return;

        document.getElementById('user-name').textContent = this.userData.name;
        document.getElementById('user-status').textContent = this.userData.status;
        document.getElementById('user-profile-pic').querySelector('img').src = this.userData.avatar;
    }

    updateChatList() {
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '';

        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${this.currentChat?.id === chat.id ? 'active' : ''}`;
            chatItem.dataset.id = chat.id;
            chatItem.addEventListener('click', () => this.selectChat(chat));

            chatItem.innerHTML = `
                <div class="chat-avatar">
                    <img src="${chat.avatar || this.getDefaultAvatar(chat.type)}" alt="${chat.name}">
                    ${chat.online ? '<div class="online-status online"></div>' : ''}
                </div>
                <div class="chat-info">
                    <h4>
                        <span>${chat.name}</span>
                        <span class="chat-time">${this.formatTime(chat.timestamp)}</span>
                    </h4>
                    <p>${chat.lastMessage || ''}</p>
                </div>
                ${chat.unread ? `<div class="chat-unread">${chat.unread}</div>` : ''}
            `;

            chatList.appendChild(chatItem);
        });
    }

    getDefaultAvatar(type) {
        const avatars = {
            user: 'https://ui-avatars.com/api/?name=U&background=075e54&color=fff',
            group: 'https://ui-avatars.com/api/?name=G&background=2196f3&color=fff',
            channel: 'https://ui-avatars.com/api/?name=C&background=ff9800&color=fff',
            community: 'https://ui-avatars.com/api/?name=C&background=4caf50&color=fff',
            ai: 'https://ui-avatars.com/api/?name=AI&background=ff6b00&color=fff'
        };
        return avatars[type] || avatars.user;
    }

    selectChat(chat) {
        this.currentChat = chat;
        this.updateChatList();
        
        // Update chat header
        document.getElementById('chat-partner-name').textContent = chat.name;
        document.getElementById('chat-partner-status').textContent = chat.online ? 'Online' : 'Offline';
        document.getElementById('chat-partner-pic').src = chat.avatar || this.getDefaultAvatar(chat.type);
        document.getElementById('partner-status').className = `partner-status ${chat.online ? 'online' : 'offline'}`;
        
        // Load messages
        this.loadChatMessages(chat.id);
    }

    async loadChatMessages(chatId) {
        const messages = await this.db.getMessages(chatId);
        const container = document.getElementById('chat-messages');
        
        container.innerHTML = '';
        
        if (messages.length === 0) {
            // Show welcome message
            container.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-content">
                        <i class="fas fa-comments"></i>
                        <h2>Start a conversation</h2>
                        <p>Send your first message to ${this.currentChat.name}</p>
                    </div>
                </div>
            `;
        } else {
            messages.forEach(msg => {
                const type = msg.sender === this.userData.id ? 'sent' : 'received';
                this.appendMessage(msg, type);
            });
        }
    }

    updateUnreadCounts() {
        const unread = this.chats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
        document.getElementById('unread-count').textContent = unread > 0 ? unread : '';
    }

    showTypingIndicator() {
        const status = document.getElementById('chat-partner-status');
        status.textContent = 'typing...';
        status.classList.add('typing');
    }

    hideTypingIndicator() {
        const status = document.getElementById('chat-partner-status');
        status.textContent = this.currentChat?.online ? 'Online' : 'Offline';
        status.classList.remove('typing');
    }

    // Voice Recording
    async startVoiceRecording() {
        try {
            await this.voiceRecorder.start();
            document.getElementById('voice-recorder').classList.remove('hidden');
            
            // Update timer
            let seconds = 0;
            const timer = setInterval(() => {
                seconds++;
                const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
                const secs = (seconds % 60).toString().padStart(2, '0');
                document.querySelector('.recording-time').textContent = `${mins}:${secs}`;
            }, 1000);

            // Store timer reference
            this.recordingTimer = timer;

            // Stop recording on button release
            document.getElementById('send-record').addEventListener('click', async () => {
                clearInterval(this.recordingTimer);
                await this.sendVoiceMessage();
            });

            document.getElementById('cancel-record').addEventListener('click', () => {
                clearInterval(this.recordingTimer);
                this.voiceRecorder.stop();
                document.getElementById('voice-recorder').classList.add('hidden');
            });

        } catch (error) {
            console.error('Recording failed:', error);
            this.showNotification('Error', 'Microphone access denied', 'error');
        }
    }

    async sendVoiceMessage() {
        const audioBlob = await this.voiceRecorder.stop();
        document.getElementById('voice-recorder').classList.add('hidden');

        // Create voice message
        const messageObj = {
            id: 'voice_' + Date.now(),
            sender: this.userData.id,
            receiver: this.currentChat?.id || 'public',
            content: 'Voice message',
            timestamp: new Date().toISOString(),
            type: 'voice',
            audioUrl: URL.createObjectURL(audioBlob),
            duration: this.voiceRecorder.getDuration(),
            status: 'sent'
        };

        // Save and send
        await this.db.saveMessage(messageObj);
        this.socket.emit('send_message', messageObj);
        this.appendVoiceMessage(messageObj, 'sent');
    }

    appendVoiceMessage(message, type) {
        const messagesContainer = document.getElementById('chat-messages');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.dataset.id = message.id;
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="voice-message">
                    <button class="play-pause-btn">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="voice-progress">
                        <div class="voice-progress-bar">
                            <div class="voice-progress-fill"></div>
                        </div>
                        <span class="voice-duration">${this.formatDuration(message.duration)}</span>
                    </div>
                </div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;

        // Add audio playback
        const audio = new Audio(message.audioUrl);
        const playBtn = messageElement.querySelector('.play-pause-btn');
        const progressFill = messageElement.querySelector('.voice-progress-fill');

        let isPlaying = false;
        
        playBtn.addEventListener('click', () => {
            if (!isPlaying) {
                audio.play();
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                isPlaying = true;
                
                // Update progress
                audio.addEventListener('timeupdate', () => {
                    const percent = (audio.currentTime / audio.duration) * 100;
                    progressFill.style.width = `${percent}%`;
                });
                
                audio.addEventListener('ended', () => {
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                    progressFill.style.width = '0%';
                    isPlaying = false;
                });
            } else {
                audio.pause();
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
                isPlaying = false;
            }
        });

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    // Link Detector
    initializeLinkDetector() {
        const input = document.getElementById('message-input');
        
        input.addEventListener('input', (e) => {
            const text = e.target.value;
            const links = this.detectLinks(text);
            
            if (links.length > 0 && this.userPreferences.linkPreview) {
                this.showLinkPreview(links[0]);
            }
        });
    }

    detectLinks(text) {
        const urlRegex = /(https?:\/\/[^\s]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(www\.[^\s]+)/g;
        return text.match(urlRegex) || [];
    }

    async showLinkPreview(url) {
        try {
            // Fetch link metadata
            const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
            const metadata = await response.json();
            
            // Show preview modal
            this.showLinkPreviewModal(metadata);
        } catch (error) {
            console.error('Failed to fetch link preview:', error);
        }
    }

    showLinkPreviewModal(metadata) {
        this.showModal('link-preview-modal');
        
        const container = document.getElementById('link-preview-container');
        container.innerHTML = `
            <div class="link-preview-header">
                <div class="link-type-icon ${metadata.type}">
                    <i class="${metadata.icon}"></i>
                </div>
                <div class="link-preview-details">
                    <h4>${metadata.title}</h4>
                    <p>${metadata.description}</p>
                </div>
            </div>
            <div class="link-preview-content">
                ${metadata.image ? `
                    <div class="link-preview-image-large">
                        <img src="${metadata.image}" alt="${metadata.title}">
                    </div>
                ` : ''}
                <div class="link-preview-actions-large">
                    <button class="btn btn-primary" onclick="app.copyToClipboard('${metadata.url}')">
                        <i class="fas fa-copy"></i> Copy Link
                    </button>
                    <button class="btn btn-secondary" onclick="app.visitLink('${metadata.url}')">
                        <i class="fas fa-external-link-alt"></i> Open
                    </button>
                </div>
            </div>
        `;
    }

    // Emoji Picker
    initializeEmojiPicker() {
        // Simple emoji picker implementation
        const emojis = ['😀', '😂', '😍', '😎', '👍', '❤️', '🔥', '🎉', '👏', '🙏'];
        
        const emojiBtn = document.getElementById('emoji-btn');
        const input = document.getElementById('message-input');
        
        emojiBtn.addEventListener('click', () => {
            const rect = emojiBtn.getBoundingClientRect();
            this.showEmojiPicker(rect, emojis, (emoji) => {
                input.value += emoji;
                input.focus();
            });
        });
    }

    showEmojiPicker(position, emojis, callback) {
        // Create emoji picker element
        const picker = document.createElement('div');
        picker.className = 'emoji-picker';
        picker.style.position = 'fixed';
        picker.style.top = `${position.bottom}px`;
        picker.style.left = `${position.left}px`;
        picker.style.background = 'var(--card-bg)';
        picker.style.borderRadius = '8px';
        picker.style.padding = '0.5rem';
        picker.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        picker.style.zIndex = '1000';
        picker.style.display = 'grid';
        picker.style.gridTemplateColumns = 'repeat(5, 1fr)';
        picker.style.gap = '0.25rem';
        
        // Add emojis
        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.textContent = emoji;
            btn.style.fontSize = '1.5rem';
            btn.style.background = 'none';
            btn.style.border = 'none';
            btn.style.cursor = 'pointer';
            btn.style.padding = '0.25rem';
            btn.style.borderRadius = '4px';
            btn.addEventListener('click', () => {
                callback(emoji);
                document.body.removeChild(picker);
            });
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(255,255,255,0.1)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'none';
            });
            picker.appendChild(btn);
        });
        
        document.body.appendChild(picker);
        
        // Close on outside click
        setTimeout(() => {
            const closePicker = (e) => {
                if (!picker.contains(e.target) && e.target !== document.getElementById('emoji-btn')) {
                    document.body.removeChild(picker);
                    document.removeEventListener('click', closePicker);
                }
            };
            document.addEventListener('click', closePicker);
        }, 0);
    }

    // Insert Link
    insertLink() {
        const url = prompt('Enter URL:');
        if (url) {
            const input = document.getElementById('message-input');
            input.value += ` ${url} `;
            input.focus();
        }
    }

    // Tab Switching
    switchChatTab(tab) {
        document.querySelectorAll('.sidebar-tabs .tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Filter chat list based on tab
        this.filterChatsByType(tab);
    }

    filterChatsByType(type) {
        const filteredChats = this.chats.filter(chat => {
            switch(type) {
                case 'chats': return chat.type === 'user' || chat.type === 'ai';
                case 'groups': return chat.type === 'group';
                case 'channels': return chat.type === 'channel';
                case 'communities': return chat.type === 'community';
                default: return true;
            }
        });
        
        this.updateFilteredChatList(filteredChats);
    }

    updateFilteredChatList(chats) {
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '';
        
        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${this.currentChat?.id === chat.id ? 'active' : ''}`;
            chatItem.dataset.id = chat.id;
            chatItem.addEventListener('click', () => this.selectChat(chat));

            chatItem.innerHTML = `
                <div class="chat-avatar">
                    <img src="${chat.avatar || this.getDefaultAvatar(chat.type)}" alt="${chat.name}">
                    ${chat.online ? '<div class="online-status online"></div>' : ''}
                </div>
                <div class="chat-info">
                    <h4>
                        <span>${chat.name}</span>
                        <span class="chat-time">${this.formatTime(chat.timestamp)}</span>
                    </h4>
                    <p>${chat.lastMessage || ''}</p>
                </div>
                ${chat.unread ? `<div class="chat-unread">${chat.unread}</div>` : ''}
            `;

            chatList.appendChild(chatItem);
        });
    }

    switchAdminSection(section) {
        document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Load section data
        this.loadAdminSection(section);
    }

    async loadAdminSection(section) {
        switch(section) {
            case 'users':
                await this.loadUsersSection();
                break;
            case 'devices':
                await this.loadDevicesSection();
                break;
            case 'numbers':
                await this.loadNumbersSection();
                break;
            case 'analytics':
                await this.loadAnalyticsSection();
                break;
        }
    }

    switchSettingsTab(tab) {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        document.querySelectorAll('.settings-section').forEach(section => section.classList.remove('active'));
        document.getElementById(`${tab}-settings`).classList.add('active');
    }

    // Start AI Chat
    startAIChat(aiType) {
        const aiChat = {
            id: aiType === 'forexter' ? 'forexter_ai' : 'nami_ai',
            name: aiType === 'forexter' ? 'Forexter AI' : 'Nami AI',
            type: 'ai',
            ai: aiType,
            avatar: aiType === 'forexter' ? 
                'https://ui-avatars.com/api/?name=F&background=ff6b00&color=fff' :
                'https://ui-avatars.com/api/?name=N&background=00bcd4&color=fff',
            online: true,
            lastMessage: 'Hello! How can I help you today?',
            timestamp: new Date().toISOString()
        };

        this.selectChat(aiChat);
    }

    // Toggle Attachment Preview
    toggleAttachmentPreview() {
        const preview = document.getElementById('attachment-preview');
        preview.classList.toggle('hidden');
        
        if (!preview.classList.contains('hidden')) {
            // Initialize attachment options
            document.querySelectorAll('.attachment-options .option').forEach(option => {
                option.addEventListener('click', (e) => {
                    const type = e.currentTarget.dataset.type;
                    this.handleAttachmentType(type);
                });
            });
        }
    }

    async handleAttachmentType(type) {
        const input = document.getElementById('file-input');
        
        switch(type) {
            case 'image':
                input.accept = 'image/*,video/*';
                input.click();
                break;
            case 'document':
                input.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx';
                input.click();
                break;
            case 'camera':
                await this.takePhotoWithCamera();
                break;
            case 'location':
                this.shareLocation();
                break;
            case 'contact':
                this.shareContact();
                break;
            case 'poll':
                this.createPoll();
                break;
        }

        // Close preview
        this.toggleAttachmentPreview();
    }

    async takePhotoWithCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            
            // Create canvas for photo
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            video.addEventListener('loadedmetadata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Take photo after 1 second
                setTimeout(() => {
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const photo = canvas.toDataURL('image/jpeg');
                    this.sendPhoto(photo);
                    
                    // Stop stream
                    stream.getTracks().forEach(track => track.stop());
                }, 1000);
            });
        } catch (error) {
            console.error('Camera error:', error);
            this.showNotification('Error', 'Camera access denied', 'error');
        }
    }

    async sendPhoto(photoData) {
        // Convert data URL to blob
        const response = await fetch(photoData);
        const blob = await response.blob();
        
        const messageObj = {
            id: 'img_' + Date.now(),
            sender: this.userData.id,
            receiver: this.currentChat?.id || 'public',
            content: 'Photo',
            timestamp: new Date().toISOString(),
            type: 'image',
            imageUrl: URL.createObjectURL(blob),
            status: 'sent'
        };

        await this.db.saveMessage(messageObj);
        this.socket.emit('send_message', messageObj);
        this.appendImageMessage(messageObj, 'sent');
    }

    appendImageMessage(message, type) {
        const messagesContainer = document.getElementById('chat-messages');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.dataset.id = message.id;
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="media-message">
                    <div class="media-preview">
                        <img src="${message.imageUrl}" alt="Photo">
                        <div class="media-controls">
                            <div class="media-info">
                                <h5>Photo</h5>
                                <p>${this.formatTime(message.timestamp)}</p>
                            </div>
                            <button class="media-action-btn download-btn">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add download functionality
        const downloadBtn = messageElement.querySelector('.download-btn');
        downloadBtn.addEventListener('click', () => {
            this.downloadFile(message.imageUrl, 'photo.jpg');
        });

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    shareLocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
                    
                    const messageObj = {
                        id: 'loc_' + Date.now(),
                        sender: this.userData.id,
                        receiver: this.currentChat?.id || 'public',
                        content: 'Location shared',
                        timestamp: new Date().toISOString(),
                        type: 'location',
                        location: { latitude, longitude },
                        mapUrl: `https://maps.google.com/maps?q=${latitude},${longitude}&z=15`,
                        status: 'sent'
                    };

                    this.sendLocationMessage(messageObj);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    this.showNotification('Error', 'Failed to get location', 'error');
                }
            );
        } else {
            this.showNotification('Error', 'Geolocation not supported', 'error');
        }
    }

    async sendLocationMessage(message) {
        await this.db.saveMessage(message);
        this.socket.emit('send_message', message);
        
        // Create location message element
        const messagesContainer = document.getElementById('chat-messages');
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message sent';
        messageElement.dataset.id = message.id;
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="location-message">
                    <div class="location-preview">
                        <i class="fas fa-map-marker-alt"></i>
                        <div class="location-info">
                            <h5>Location Shared</h5>
                            <p>${message.location.latitude}, ${message.location.longitude}</p>
                        </div>
                    </div>
                    <a href="${message.mapUrl}" target="_blank" class="location-link">
                        Open in Maps
                    </a>
                </div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    shareContact() {
        // Show contact picker
        this.showContactPicker();
    }

    showContactPicker() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Share Contact</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="contacts-list">
                    ${this.contacts.map(contact => `
                        <div class="contact-item" data-id="${contact.id}">
                            <img src="${contact.avatar}" alt="${contact.name}">
                            <div class="contact-info">
                                <h4>${contact.name}</h4>
                                <p>${contact.phone}</p>
                            </div>
                            <button class="btn btn-primary share-contact-btn">Share</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.getElementById('modal-overlay').classList.remove('hidden');
        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
            document.getElementById('modal-overlay').classList.add('hidden');
        });

        modal.querySelectorAll('.share-contact-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const contactId = e.target.closest('.contact-item').dataset.id;
                const contact = this.contacts.find(c => c.id === contactId);
                this.sendContactMessage(contact);
                modal.remove();
                document.getElementById('modal-overlay').classList.add('hidden');
            });
        });
    }

    async sendContactMessage(contact) {
        const messageObj = {
            id: 'contact_' + Date.now(),
            sender: this.userData.id,
            receiver: this.currentChat?.id || 'public',
            content: 'Contact shared',
            timestamp: new Date().toISOString(),
            type: 'contact',
            contact: contact,
            status: 'sent'
        };

        await this.db.saveMessage(messageObj);
        this.socket.emit('send_message', messageObj);
        this.appendContactMessage(messageObj, 'sent');
    }

    appendContactMessage(message, type) {
        const messagesContainer = document.getElementById('chat-messages');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.dataset.id = message.id;
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="contact-message">
                    <div class="contact-preview">
                        <img src="${message.contact.avatar}" alt="${message.contact.name}">
                        <div class="contact-info">
                            <h5>${message.contact.name}</h5>
                            <p>${message.contact.phone}</p>
                        </div>
                    </div>
                    <div class="contact-actions">
                        <button class="btn btn-primary save-contact-btn">Save Contact</button>
                        <button class="btn btn-secondary message-contact-btn">Message</button>
                    </div>
                </div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;

        // Add contact actions
        const saveBtn = messageElement.querySelector('.save-contact-btn');
        const messageBtn = messageElement.querySelector('.message-contact-btn');

        saveBtn.addEventListener('click', () => {
            this.saveContact(message.contact);
        });

        messageBtn.addEventListener('click', () => {
            this.startChatWithContact(message.contact);
        });

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async saveContact(contact) {
        await this.db.saveContact(contact);
        this.showNotification('Success', 'Contact saved', 'success');
    }

    async startChatWithContact(contact) {
        const chat = {
            id: contact.id,
            name: contact.name,
            type: 'user',
            avatar: contact.avatar,
            online: true,
            lastMessage: '',
            timestamp: new Date().toISOString()
        };

        this.selectChat(chat);
    }

    createPoll() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Create Poll</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Poll Question</label>
                    <input type="text" id="poll-question" placeholder="Ask a question">
                </div>
                <div class="form-group">
                    <label>Options</label>
                    <div class="poll-options">
                        <input type="text" class="poll-option" placeholder="Option 1">
                        <input type="text" class="poll-option" placeholder="Option 2">
                    </div>
                    <button class="btn btn-secondary add-option-btn">Add Option</button>
                </div>
                <div class="form-group">
                    <label>Poll Duration</label>
                    <select id="poll-duration">
                        <option value="3600">1 hour</option>
                        <option value="86400">1 day</option>
                        <option value="604800">1 week</option>
                        <option value="0">No limit</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel">Cancel</button>
                <button class="btn btn-primary create-poll">Create Poll</button>
            </div>
        `;

        document.getElementById('modal-overlay').classList.remove('hidden');
        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closePollModal(modal));
        modal.querySelector('.cancel').addEventListener('click', () => this.closePollModal(modal));
        modal.querySelector('.create-poll').addEventListener('click', () => this.sendPoll(modal));
        modal.querySelector('.add-option-btn').addEventListener('click', () => this.addPollOption(modal));
    }

    closePollModal(modal) {
        modal.remove();
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    addPollOption(modal) {
        const optionsContainer = modal.querySelector('.poll-options');
        const optionCount = optionsContainer.querySelectorAll('.poll-option').length;
        
        if (optionCount < 10) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'poll-option';
            input.placeholder = `Option ${optionCount + 1}`;
            optionsContainer.appendChild(input);
        } else {
            this.showNotification('Error', 'Maximum 10 options allowed', 'error');
        }
    }

    async sendPoll(modal) {
        const question = modal.querySelector('#poll-question').value;
        const options = Array.from(modal.querySelectorAll('.poll-option'))
            .map(input => input.value.trim())
            .filter(value => value);
        const duration = modal.querySelector('#poll-duration').value;

        if (!question || options.length < 2) {
            this.showNotification('Error', 'Please enter question and at least 2 options', 'error');
            return;
        }

        const poll = {
            question,
            options: options.map((option, index) => ({
                id: index,
                text: option,
                votes: 0,
                voters: []
            })),
            duration: parseInt(duration),
            expiresAt: duration > 0 ? Date.now() + (duration * 1000) : null,
            voters: [],
            multipleChoice: false
        };

        const messageObj = {
            id: 'poll_' + Date.now(),
            sender: this.userData.id,
            receiver: this.currentChat?.id || 'public',
            content: 'Poll created',
            timestamp: new Date().toISOString(),
            type: 'poll',
            poll: poll,
            status: 'sent'
        };

        await this.db.saveMessage(messageObj);
        this.socket.emit('send_message', messageObj);
        this.appendPollMessage(messageObj, 'sent');
        
        this.closePollModal(modal);
    }

    appendPollMessage(message, type) {
        const messagesContainer = document.getElementById('chat-messages');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.dataset.id = message.id;
        
        const totalVotes = message.poll.options.reduce((sum, option) => sum + option.votes, 0);
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="poll-message">
                    <div class="poll-header">
                        <h5>${message.poll.question}</h5>
                        ${totalVotes > 0 ? `<span class="poll-votes">${totalVotes} votes</span>` : ''}
                    </div>
                    <div class="poll-options-list">
                        ${message.poll.options.map(option => `
                            <div class="poll-option-item" data-option="${option.id}">
                                <div class="poll-option-text">${option.text}</div>
                                ${totalVotes > 0 ? `
                                    <div class="poll-results">
                                        <div class="poll-bar" style="width: ${(option.votes / totalVotes) * 100}%"></div>
                                        <span class="poll-percentage">${Math.round((option.votes / totalVotes) * 100)}%</span>
                                    </div>
                                ` : ''}
                                <button class="vote-btn">Vote</button>
                            </div>
                        `).join('')}
                    </div>
                    ${message.poll.expiresAt ? `
                        <div class="poll-timer">
                            <i class="fas fa-clock"></i>
                            <span>Ends in ${this.formatTimeRemaining(message.poll.expiresAt)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;

        // Add voting functionality
        messageElement.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const optionId = parseInt(e.target.closest('.poll-option-item').dataset.option);
                await this.voteOnPoll(message.id, optionId);
            });
        });

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async voteOnPoll(pollId, optionId) {
        // Update poll in database
        await this.db.voteOnPoll(pollId, this.userData.id, optionId);
        
        // Update message in UI
        this.updatePollMessage(pollId);
        
        // Broadcast vote
        this.socket.emit('poll_vote', { pollId, userId: this.userData.id, optionId });
    }

    async updatePollMessage(pollId) {
        const message = await this.db.getMessage(pollId);
        if (!message || message.type !== 'poll') return;

        const messageElement = document.querySelector(`[data-id="${pollId}"]`);
        if (!messageElement) return;

        const totalVotes = message.poll.options.reduce((sum, option) => sum + option.votes, 0);
        
        messageElement.querySelector('.poll-votes').textContent = `${totalVotes} votes`;
        
        messageElement.querySelectorAll('.poll-option-item').forEach(item => {
            const optionId = parseInt(item.dataset.option);
            const option = message.poll.options.find(o => o.id === optionId);
            
            if (option && totalVotes > 0) {
                const percentage = Math.round((option.votes / totalVotes) * 100);
                item.querySelector('.poll-bar').style.width = `${percentage}%`;
                item.querySelector('.poll-percentage').textContent = `${percentage}%`;
            }
        });
    }

    formatTimeRemaining(timestamp) {
        const remaining = timestamp - Date.now();
        if (remaining <= 0) return 'Ended';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    // File Input Handler
    initializeFileInput() {
        const input = document.getElementById('file-input');
        
        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            
            for (const file of files) {
                await this.sendFile(file);
            }
            
            // Reset input
            input.value = '';
        });
    }

    async sendFile(file) {
        // Create object URL for preview
        const objectUrl = URL.createObjectURL(file);
        
        const messageObj = {
            id: 'file_' + Date.now(),
            sender: this.userData.id,
            receiver: this.currentChat?.id || 'public',
            content: file.name,
            timestamp: new Date().toISOString(),
            type: this.getFileType(file),
            file: {
                name: file.name,
                size: file.size,
                type: file.type,
                url: objectUrl
            },
            status: 'sent'
        };

        await this.db.saveMessage(messageObj);
        this.socket.emit('send_message', messageObj);
        this.appendFileMessage(messageObj, 'sent');
    }

    getFileType(file) {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        return 'document';
    }

    appendFileMessage(message, type) {
        const messagesContainer = document.getElementById('chat-messages');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.dataset.id = message.id;
        
        const fileTypeIcon = this.getFileTypeIcon(message.type);
        const fileSize = this.formatFileSize(message.file.size);
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="file-message">
                    <div class="file-preview">
                        <div class="file-icon">
                            <i class="${fileTypeIcon}"></i>
                        </div>
                        <div class="file-info">
                            <h5>${message.file.name}</h5>
                            <p>${fileSize}</p>
                        </div>
                        <button class="download-btn">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;

        // Add download functionality
        const downloadBtn = messageElement.querySelector('.download-btn');
        downloadBtn.addEventListener('click', () => {
            this.downloadFile(message.file.url, message.file.name);
        });

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    getFileTypeIcon(fileType) {
        const icons = {
            image: 'fas fa-image',
            video: 'fas fa-video',
            audio: 'fas fa-music',
            document: 'fas fa-file'
        };
        return icons[fileType] || 'fas fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Call Interface
    showCallInterface() {
        this.showPage('call-interface');
        
        // Update caller info
        document.getElementById('caller-name').textContent = this.currentCall.with.name;
        document.getElementById('call-status').textContent = 'Calling...';
        
        // Start call timer
        this.startCallTimer();
    }

    startCallTimer() {
        let seconds = 0;
        this.callTimer = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
            document.getElementById('call-timer').textContent = `${mins}:${secs}`;
            document.getElementById('call-status').textContent = 'Connected';
        }, 1000);
    }

    updateCallUI() {
        if (!this.currentCall) return;

        document.getElementById('call-status').textContent = 
            this.currentCall.status === 'connected' ? 'Connected' : 'Calling...';
    }

    // Incoming Call Notification
    showIncomingCallNotification(callData) {
        const notification = document.createElement('div');
        notification.className = 'notification incoming-call';
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-phone"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">Incoming ${callData.type} call</div>
                <div class="notification-message">${callData.callerName}</div>
            </div>
            <div class="call-actions">
                <button class="btn btn-success answer-call">Answer</button>
                <button class="btn btn-danger decline-call">Decline</button>
            </div>
        `;

        const container = document.getElementById('notification-container');
        container.appendChild(notification);

        // Add event listeners
        notification.querySelector('.answer-call').addEventListener('click', () => {
            this.answerCall();
            notification.remove();
        });

        notification.querySelector('.decline-call').addEventListener('click', () => {
            this.endCall();
            notification.remove();
        });

        // Auto remove after 30 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
                this.endCall();
            }
        }, 30000);
    }

    // Admin Methods Implementation
    async loadUsersSection() {
        const users = await this.db.getAllUsers();
        const container = document.querySelector('.admin-content');
        
        let html = `
            <div class="users-section">
                <h3>User Management</h3>
                <div class="users-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Verified</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        users.forEach(user => {
            html += `
                <tr>
                    <td>${user.id}</td>
                    <td>
                        <div class="user-cell">
                            <img src="${user.avatar}" alt="${user.name}" class="user-avatar">
                            <span>${user.name}</span>
                        </div>
                    </td>
                    <td>${user.phone}</td>
                    <td>
                        <span class="status-badge ${user.online ? 'online' : 'offline'}">
                            ${user.online ? 'Online' : 'Offline'}
                        </span>
                    </td>
                    <td>
                        <span class="verification-badge ${user.verified ? 'verified' : 'unverified'}">
                            ${user.verified ? 'Verified' : 'Unverified'}
                        </span>
                    </td>
                    <td>
                        <div class="user-actions">
                            <button class="btn btn-sm btn-primary" onclick="app.verifyUser('${user.id}')">
                                Verify
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="app.editUser('${user.id}')">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.deleteUser('${user.id}')">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    async verifyUser(userId) {
        await this.db.verifyUser(userId);
        this.showNotification('Success', 'User verified', 'success');
        this.loadUsersSection();
    }

    async editUser(userId) {
        const user = await this.db.getUser(userId);
        
        // Show edit modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Edit User</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="edit-user-name" value="${user.name}">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" id="edit-user-phone" value="${user.phone}">
                </div>
                <div class="form-group">
                    <label>Custom Number</label>
                    <input type="text" id="edit-user-custom-number" value="${user.customNumber || ''}">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="edit-user-status">
                        <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                        <option value="banned" ${user.status === 'banned' ? 'selected' : ''}>Banned</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel">Cancel</button>
                <button class="btn btn-primary save-user">Save Changes</button>
            </div>
        `;
        
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeEditUserModal(modal));
        modal.querySelector('.cancel').addEventListener('click', () => this.closeEditUserModal(modal));
        modal.querySelector('.save-user').addEventListener('click', async () => {
            const updatedUser = {
                name: modal.querySelector('#edit-user-name').value,
                phone: modal.querySelector('#edit-user-phone').value,
                customNumber: modal.querySelector('#edit-user-custom-number').value,
                status: modal.querySelector('#edit-user-status').value
            };
            
            await this.db.updateUser(userId, updatedUser);
            this.closeEditUserModal(modal);
            this.showNotification('Success', 'User updated', 'success');
            this.loadUsersSection();
        });
    }

    closeEditUserModal(modal) {
        modal.remove();
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            await this.db.deleteUser(userId);
            this.showNotification('Success', 'User deleted', 'success');
            this.loadUsersSection();
        }
    }

    async loadDevicesSection() {
        const requests = await this.db.getPendingRequests();
        const devices = await this.db.getApprovedDevices();
        
        const container = document.querySelector('.admin-content');
        
        let html = `
            <div class="devices-section">
                <div class="pending-requests">
                    <h3>Pending Device Approvals</h3>
                    <div class="requests-list">
        `;
        
        if (requests.length === 0) {
            html += `<p class="empty-state">No pending requests</p>`;
        } else {
            requests.forEach(request => {
                html += `
                    <div class="request-item" data-id="${request.id}">
                        <div class="request-info">
                            <h5>${request.userName}</h5>
                            <p>${request.deviceInfo}</p>
                            <small>${new Date(request.timestamp).toLocaleString()}</small>
                        </div>
                        <div class="request-actions">
                            <button class="btn btn-sm btn-success" onclick="app.approveDevice('${request.id}')">
                                Approve
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.rejectDevice('${request.id}')">
                                Reject
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                    </div>
                </div>
                
                <div class="approved-devices">
                    <h3>Approved Devices</h3>
                    <div class="devices-list">
        `;
        
        if (devices.length === 0) {
            html += `<p class="empty-state">No approved devices</p>`;
        } else {
            devices.forEach(device => {
                html += `
                    <div class="device-item">
                        <div class="device-info">
                            <h5>${device.userName}</h5>
                            <p>${device.deviceInfo}</p>
                            <small>Approved: ${new Date(device.approvedAt).toLocaleString()}</small>
                        </div>
                        <div class="device-actions">
                            <button class="btn btn-sm btn-danger" onclick="app.revokeDevice('${device.id}')">
                                Revoke
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    async approveDevice(requestId) {
        await this.db.approveDevice(requestId);
        this.showNotification('Success', 'Device approved', 'success');
        this.loadDevicesSection();
    }

    async rejectDevice(requestId) {
        await this.db.rejectDevice(requestId);
        this.showNotification('Success', 'Device rejected', 'success');
        this.loadDevicesSection();
    }

    async revokeDevice(deviceId) {
        await this.db.revokeDevice(deviceId);
        this.showNotification('Success', 'Device access revoked', 'success');
        this.loadDevicesSection();
    }

    async loadNumbersSection() {
        const numbers = await this.db.getAssignedNumbers();
        const users = await this.db.getAllUsers();
        
        const container = document.querySelector('.admin-content');
        
        // Update user select
        const userSelect = document.getElementById('user-select');
        userSelect.innerHTML = '<option value="">Select User</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name} (${user.phone})`;
            userSelect.appendChild(option);
        });
        
        // Update numbers table
        const tableBody = document.getElementById('numbers-table').querySelector('tbody');
        tableBody.innerHTML = '';
        
        numbers.forEach(number => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${number.userName}</td>
                <td>${number.number}</td>
                <td>
                    <span class="number-type ${number.type}">${number.type}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="app.unassignNumber('${number.id}')">
                        Unassign
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    async unassignNumber(numberId) {
        await this.db.unassignNumber(numberId);
        this.showNotification('Success', 'Number unassigned', 'success');
        this.loadNumbersSection();
    }

    async loadAnalyticsSection() {
        const stats = await this.db.getStats();
        
        // Update stats
        document.getElementById('total-users').textContent = stats.totalUsers;
        document.getElementById('online-users').textContent = stats.onlineUsers;
        document.getElementById('total-messages').textContent = stats.totalMessages;
        document.getElementById('pending-requests').textContent = stats.pendingRequests;
        
        // Load charts
        this.loadCharts(stats);
    }

    loadCharts(stats) {
        // Activity chart
        const activityCtx = document.getElementById('activityChart').getContext('2d');
        new Chart(activityCtx, {
            type: 'line',
            data: {
                labels: stats.activityLabels,
                datasets: [{
                    label: 'Messages',
                    data: stats.activityData,
                    borderColor: '#075e54',
                    backgroundColor: 'rgba(7, 94, 84, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#a0a0a0'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#a0a0a0'
                        }
                    }
                }
            }
        });

        // Message type chart
        const typeCtx = document.getElementById('messageTypeChart').getContext('2d');
        new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Text', 'Image', 'Video', 'Voice', 'File'],
                datasets: [{
                    data: stats.messageTypes,
                    backgroundColor: [
                        '#075e54',
                        '#2196f3',
                        '#ff9800',
                        '#4caf50',
                        '#9c27b0'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }

    // Settings
    saveSettings() {
        const settings = {
            notifications: document.getElementById('read-receipts').checked,
            linkPreview: document.getElementById('link-preview-toggle').checked,
            cameraEnhancement: document.getElementById('camera-enhancement').checked,
            autoDownload: document.getElementById('auto-download').checked,
            lastSeenPrivacy: document.getElementById('last-seen-privacy').value,
            profilePhotoPrivacy: document.getElementById('profile-photo-privacy').value
        };

        this.db.saveUserPreferences(settings);
        this.userPreferences = settings;
        this.applyUserPreferences();
        this.showNotification('Success', 'Settings saved', 'success');
        this.closeModal();
    }

    // Utility Methods
    showRightSidebar(content) {
        const sidebar = document.getElementById('right-sidebar');
        const contentContainer = sidebar.querySelector('.sidebar-content');
        
        contentContainer.innerHTML = content;
        sidebar.classList.remove('hidden');
    }

    closeRightSidebar() {
        document.getElementById('right-sidebar').classList.add('hidden');
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('active');
    }

    // Handle Back Button
    handleBackButton() {
        switch(this.currentPage) {
            case 'call-interface':
                this.endCall();
                break;
            case 'admin-dashboard':
                this.showPage('main-chat');
                break;
            default:
                if (document.getElementById('right-sidebar').classList.contains('hidden')) {
                    this.showPage('login-page');
                } else {
                    this.closeRightSidebar();
                }
        }
    }

    // Export for global access
    static getInstance() {
        if (!ForexterChat.instance) {
            ForexterChat.instance = new ForexterChat();
        }
        return ForexterChat.instance;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = ForexterChat.getInstance();
});

// Handle back button
window.addEventListener('popstate', () => {
    app.handleBackButton();
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(
            registration => {
                console.log('ServiceWorker registration successful');
            },
            error => {
                console.log('ServiceWorker registration failed: ', error);
            }
        );
    });
}

// Handle offline/online status
window.addEventListener('online', () => {
    app.showNotification('You are back online', 'Connection restored', 'success');
});

window.addEventListener('offline', () => {
    app.showNotification('You are offline', 'Check your internet connection', 'warning');
});

// Prevent drag and drop default behavior
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => app.sendFile(file));
});

// Handle beforeunload
window.addEventListener('beforeunload', (e) => {
    // Save current state
    localStorage.setItem('forexterchat_last_state', JSON.stringify({
        currentPage: app.currentPage,
        currentChat: app.currentChat?.id,
        userData: app.userData
    }));
    
    // End call if active
    if (app.currentCall) {
        app.socket.emit('end_call', app.currentCall);
    }
    
    // Notify server about disconnection
    app.socket.emit('user_disconnect', app.userData?.id);
});

// Load last state
window.addEventListener('load', () => {
    const lastState = localStorage.getItem('forexterchat_last_state');
    if (lastState) {
        try {
            const state = JSON.parse(lastState);
            // Restore state if needed
        } catch (e) {
            console.error('Failed to restore state:', e);
        }
    }
});
