class LocalDatabase {
    constructor() {
        this.dbName = 'ForexterChatDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Users table
                if (!db.objectStoreNames.contains('users')) {
                    const usersStore = db.createObjectStore('users', { keyPath: 'id' });
                    usersStore.createIndex('phone', 'phone', { unique: true });
                    usersStore.createIndex('online', 'online', { unique: false });
                }

                // Messages table
                if (!db.objectStoreNames.contains('messages')) {
                    const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
                    messagesStore.createIndex('chatId', ['sender', 'receiver'], { unique: false });
                    messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Chats table
                if (!db.objectStoreNames.contains('chats')) {
                    const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
                    chatsStore.createIndex('type', 'type', { unique: false });
                    chatsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Contacts table
                if (!db.objectStoreNames.contains('contacts')) {
                    db.createObjectStore('contacts', { keyPath: 'id' });
                }

                // Groups table
                if (!db.objectStoreNames.contains('groups')) {
                    const groupsStore = db.createObjectStore('groups', { keyPath: 'id' });
                    groupsStore.createIndex('privacy', 'privacy', { unique: false });
                }

                // Channels table
                if (!db.objectStoreNames.contains('channels')) {
                    db.createObjectStore('channels', { keyPath: 'id' });
                }

                // Communities table
                if (!db.objectStoreNames.contains('communities')) {
                    db.createObjectStore('communities', { keyPath: 'id' });
                }

                // Approved devices table
                if (!db.objectStoreNames.contains('approved_devices')) {
                    const devicesStore = db.createObjectStore('approved_devices', { keyPath: 'id' });
                    devicesStore.createIndex('userId', 'userId', { unique: false });
                }

                // Login requests table
                if (!db.objectStoreNames.contains('login_requests')) {
                    const requestsStore = db.createObjectStore('login_requests', { keyPath: 'id' });
                    requestsStore.createIndex('status', 'status', { unique: false });
                }

                // Assigned numbers table
                if (!db.objectStoreNames.contains('assigned_numbers')) {
                    const numbersStore = db.createObjectStore('assigned_numbers', { keyPath: 'id' });
                    numbersStore.createIndex('userId', 'userId', { unique: true });
                    numbersStore.createIndex('number', 'number', { unique: true });
                }

                // Settings table
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Pending messages table (for offline)
                if (!db.objectStoreNames.contains('pending_messages')) {
                    db.createObjectStore('pending_messages', { keyPath: 'id' });
                }

                // Admin logs table
                if (!db.objectStoreNames.contains('admin_logs')) {
                    const logsStore = db.createObjectStore('admin_logs', { keyPath: 'id' });
                    logsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // User methods
    async saveUserData(userData) {
        return this.put('users', userData);
    }

    async getUserData() {
        return this.get('users', 'current_user');
    }

    async getAllUsers() {
        return this.getAll('users');
    }

    async getUser(userId) {
        return this.get('users', userId);
    }

    async updateUser(userId, updates) {
        const user = await this.get('users', userId);
        if (user) {
            const updatedUser = { ...user, ...updates };
            await this.put('users', updatedUser);
        }
    }

    async deleteUser(userId) {
        return this.delete('users', userId);
    }

    async verifyUser(userId) {
        await this.updateUser(userId, { verified: true });
    }

    // Message methods
    async saveMessage(message) {
        return this.put('messages', message);
    }

    async getMessages(chatId) {
        const allMessages = await this.getAll('messages');
        return allMessages.filter(msg => 
            (msg.sender === chatId && msg.receiver === this.currentUser?.id) ||
            (msg.receiver === chatId && msg.sender === this.currentUser?.id) ||
            (msg.receiver === 'public' && chatId === 'public')
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    async getMessage(messageId) {
        return this.get('messages', messageId);
    }

    // Chat methods
    async getChats() {
        return this.getAll('chats');
    }

    async saveChat(chat) {
        return this.put('chats', chat);
    }

    async updateChat(chatId, updates) {
        const chat = await this.get('chats', chatId);
        if (chat) {
            const updatedChat = { ...chat, ...updates };
            await this.put('chats', updatedChat);
        }
    }

    // Contact methods
    async getContacts() {
        return this.getAll('contacts');
    }

    async saveContact(contact) {
        return this.put('contacts', contact);
    }

    // Group methods
    async saveGroup(group) {
        await this.put('groups', group);
        await this.saveChat({
            id: group.id,
            name: group.name,
            type: 'group',
            avatar: group.avatar,
            lastMessage: 'Group created',
            timestamp: new Date().toISOString(),
            unread: 0
        });
    }

    async getGroups() {
        return this.getAll('groups');
    }

    // Channel methods
    async saveChannel(channel) {
        await this.put('channels', channel);
        await this.saveChat({
            id: channel.id,
            name: channel.name,
            type: 'channel',
            avatar: channel.avatar,
            lastMessage: 'Channel created',
            timestamp: new Date().toISOString(),
            unread: 0
        });
    }

    // Community methods
    async saveCommunity(community) {
        await this.put('communities', community);
        await this.saveChat({
            id: community.id,
            name: community.name,
            type: 'community',
            avatar: community.avatar,
            lastMessage: 'Community created',
            timestamp: new Date().toISOString(),
            unread: 0
        });
    }

    // Device approval methods
    async saveLoginRequest(request) {
        return this.put('login_requests', {
            ...request,
            id: 'req_' + Date.now(),
            status: 'pending'
        });
    }

    async getPendingRequests() {
        const requests = await this.getAll('login_requests');
        return requests.filter(req => req.status === 'pending');
    }

    async approveDevice(requestId) {
        const request = await this.get('login_requests', requestId);
        if (request) {
            await this.put('approved_devices', {
                id: request.deviceId,
                userId: request.userId,
                deviceInfo: request.deviceInfo,
                approvedAt: new Date().toISOString()
            });
            
            await this.updateRequestStatus(requestId, 'approved');
        }
    }

    async rejectDevice(requestId) {
        await this.updateRequestStatus(requestId, 'rejected');
    }

    async updateRequestStatus(requestId, status) {
        const request = await this.get('login_requests', requestId);
        if (request) {
            request.status = status;
            await this.put('login_requests', request);
        }
    }

    async getApprovedDevices() {
        return this.getAll('approved_devices');
    }

    async revokeDevice(deviceId) {
        return this.delete('approved_devices', deviceId);
    }

    // Custom number methods
    async assignCustomNumber(userId, number, type) {
        return this.put('assigned_numbers', {
            id: 'num_' + Date.now(),
            userId,
            number,
            type,
            assignedAt: new Date().toISOString()
        });
    }

    async getAssignedNumbers() {
        return this.getAll('assigned_numbers');
    }

    async unassignNumber(numberId) {
        return this.delete('assigned_numbers', numberId);
    }

    // Settings methods
    async getUserPreferences() {
        return this.get('settings', 'user_preferences');
    }

    async saveUserPreferences(preferences) {
        return this.put('settings', {
            key: 'user_preferences',
            ...preferences
        });
    }

    // Stats methods
    async getStats() {
        const users = await this.getAllUsers();
        const messages = await this.getAll('messages');
        const requests = await this.getPendingRequests();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayMessages = messages.filter(msg => 
            new Date(msg.timestamp) >= today
        );
        
        // Generate activity data for last 7 days
        const activityData = [];
        const activityLabels = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const dayMessages = messages.filter(msg => {
                const msgDate = new Date(msg.timestamp);
                return msgDate.toDateString() === date.toDateString();
            });
            
            activityLabels.push(dateStr);
            activityData.push(dayMessages.length);
        }
        
        // Message types distribution
        const messageTypes = ['text', 'image', 'video', 'voice', 'file'];
        const typeCounts = messageTypes.map(type => 
            messages.filter(msg => msg.type === type).length
        );
        
        return {
            totalUsers: users.length,
            onlineUsers: users.filter(u => u.online).length,
            totalMessages: messages.length,
            messagesToday: todayMessages.length,
            pendingRequests: requests.length,
            activityLabels,
            activityData,
            messageTypes: typeCounts
        };
    }

    // Generic IndexedDB methods
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Poll voting
    async voteOnPoll(pollId, userId, optionId) {
        const message = await this.getMessage(pollId);
        if (!message || message.type !== 'poll') return;

        // Check if user already voted
        if (message.poll.voters.includes(userId)) {
            throw new Error('User already voted');
        }

        // Update vote
        const option = message.poll.options.find(o => o.id === optionId);
        if (option) {
            option.votes += 1;
            option.voters.push(userId);
            message.poll.voters.push(userId);
            
            await this.put('messages', message);
        }
    }
}

// Export singleton instance
const db = new LocalDatabase();
export default db;
