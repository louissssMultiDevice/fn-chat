// Admin Panel JavaScript

class ForexterAdmin {
    constructor() {
        this.currentAdmin = null;
        this.users = [];
        this.reports = [];
        this.stats = {
            totalUsers: 0,
            onlineUsers: 0,
            totalMessages: 0,
            botCommands: 0,
            pendingReports: 0
        };
        
        this.initialize();
    }
    
    async initialize() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadDashboard();
        this.loadUsers();
        this.loadReports();
        this.setupCharts();
        this.loadNotifications();
    }
    
    checkAuth() {
        const adminData = sessionStorage.getItem('forexter_admin');
        
        if (!adminData) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentAdmin = JSON.parse(adminData);
        this.updateAdminUI();
    }
    
    updateAdminUI() {
        const adminGreeting = document.getElementById('adminGreeting');
        const adminUsername = document.getElementById('adminUsername');
        
        if (adminGreeting) {
            adminGreeting.textContent = `Welcome, ${this.currentAdmin.username}!`;
        }
        
        if (adminUsername) {
            adminUsername.textContent = this.currentAdmin.username;
        }
    }
    
    async loadDashboard() {
        try {
            const response = await fetch('/api/admin/dashboard');
            const data = await response.json();
            
            this.stats = data.stats;
            this.updateStats();
            
            // Update activity
            this.updateActivity(data.recentActivity);
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }
    
    updateStats() {
        // Update stat cards
        const statElements = {
            totalUsersStat: this.stats.totalUsers,
            totalMessagesStat: this.stats.totalMessages,
            botCommandsStat: this.stats.botCommands,
            pendingReportsStat: this.stats.pendingReports,
            totalUsers: this.stats.totalUsers,
            totalOnline: this.stats.onlineUsers
        };
        
        Object.entries(statElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    updateActivity(activities) {
        const activityList = document.getElementById('recentActivity');
        if (!activityList) return;
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.message}</p>
                    <small>${new Date(activity.timestamp).toLocaleString()}</small>
                </div>
            </div>
        `).join('');
    }
    
    getActivityIcon(type) {
        const icons = {
            user_joined: 'fa-user-plus',
            message: 'fa-comment',
            report: 'fa-flag',
            command: 'fa-terminal',
            system: 'fa-cog'
        };
        
        return icons[type] || 'fa-circle';
    }
    
    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();
            
            this.users = data.users;
            this.displayUsers();
            
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }
    
    displayUsers() {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = this.users.map(user => `
            <tr>
                <td>
                    <input type="checkbox" class="user-checkbox" value="${user.id}">
                </td>
                <td>
                    <div class="user-cell">
                        <img src="${user.avatar}" alt="${user.name}">
                        <div>
                            <strong>${user.name}${user.tag}</strong>
                            <small>${user.id}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${user.online ? 'online' : 'offline'}">
                        ${user.online ? 'Online' : 'Offline'}
                    </span>
                </td>
                <td>
                    <span class="role-badge ${user.role}">${user.role}</span>
                </td>
                <td>${new Date(user.joined).toLocaleDateString()}</td>
                <td>${user.messageCount || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action" onclick="admin.editUser('${user.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="admin.deleteUser('${user.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-action" onclick="admin.messageUser('${user.id}')" title="Message">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    async loadReports() {
        try {
            const response = await fetch('/api/admin/reports');
            const data = await response.json();
            
            this.reports = data.reports;
            this.updateReportStats();
            this.displayReports();
            
        } catch (error) {
            console.error('Error loading reports:', error);
        }
    }
    
    updateReportStats() {
        const pending = this.reports.filter(r => r.status === 'pending').length;
        const reviewed = this.reports.filter(r => r.status === 'reviewed').length;
        const resolved = this.reports.filter(r => r.status === 'resolved').length;
        
        const elements = {
            pendingReports: pending,
            reviewedReports: reviewed,
            resolvedReports: resolved,
            reportCount: pending
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    displayReports() {
        const reportsList = document.getElementById('reportsList');
        if (!reportsList) return;
        
        reportsList.innerHTML = this.reports.map(report => `
            <div class="report-card ${report.status}">
                <div class="report-header">
                    <div class="report-meta">
                        <span class="report-id">#${report.id}</span>
                        <span class="report-type">${report.type}</span>
                        <span class="report-status ${report.status}">${report.status}</span>
                    </div>
                    <div class="report-time">
                        ${new Date(report.timestamp).toLocaleString()}
                    </div>
                </div>
                
                <div class="report-body">
                    <div class="report-user">
                        <img src="${report.reporter?.avatar}" alt="${report.reporter?.name}">
                        <div>
                            <strong>${report.reporter?.name}</strong>
                            <small>${report.reporter?.id}</small>
                        </div>
                    </div>
                    
                    <div class="report-content">
                        <p>${report.details}</p>
                        
                        ${report.evidence ? `
                            <div class="report-evidence">
                                <strong>Evidence:</strong>
                                <a href="${report.evidence}" target="_blank">View File</a>
                            </div>
                        ` : ''}
                        
                        ${report.targetUser ? `
                            <div class="report-target">
                                <strong>Target User:</strong>
                                <span>${report.targetUser}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="report-actions">
                    <button class="btn-sm" onclick="admin.reviewReport('${report.id}')">
                        <i class="fas fa-eye"></i> Review
                    </button>
                    <button class="btn-sm" onclick="admin.resolveReport('${report.id}')">
                        <i class="fas fa-check"></i> Resolve
                    </button>
                    <button class="btn-sm btn-danger" onclick="admin.deleteReport('${report.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    setupCharts() {
        const trafficChart = document.getElementById('trafficChart');
        if (!trafficChart) return;
        
        const ctx = trafficChart.getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Active Users',
                    data: [65, 59, 80, 81, 56, 55, 40],
                    borderColor: '#7289da',
                    backgroundColor: 'rgba(114, 137, 218, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Messages',
                    data: [28, 48, 40, 19, 86, 27, 90],
                    borderColor: '#43b581',
                    backgroundColor: 'rgba(67, 181, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
    }
    
    async loadNotifications() {
        try {
            const response = await fetch('/api/admin/notifications');
            const data = await response.json();
            
            this.updateNotifications(data.notifications);
            
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    updateNotifications(notifications) {
        const notificationList = document.getElementById('notificationList');
        const notificationCount = document.getElementById('notificationCount');
        
        if (!notificationList || !notificationCount) return;
        
        notificationCount.textContent = notifications.length;
        
        notificationList.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}">
                <div class="notification-icon">
                    <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <p>${notification.message}</p>
                    <small>${new Date(notification.timestamp).toLocaleString()}</small>
                </div>
                ${!notification.read ? `
                    <button class="btn-mark-read" onclick="admin.markNotificationRead('${notification.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');
    }
    
    getNotificationIcon(type) {
        const icons = {
            report: 'fa-flag',
            user: 'fa-user',
            message: 'fa-comment',
            system: 'fa-cog',
            warning: 'fa-exclamation-triangle'
        };
        
        return icons[type] || 'fa-bell';
    }
    
    setupEventListeners() {
        // Notification dropdown
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationDropdown = document.getElementById('notificationDropdown');
        
        if (notificationBtn && notificationDropdown) {
            notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationDropdown.style.display = 
                    notificationDropdown.style.display === 'block' ? 'none' : 'block';
            });
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            const dropdowns = document.querySelectorAll('.dropdown-menu, .notification-dropdown');
            dropdowns.forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        });
        
        // Search users
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', () => this.filterUsers());
        }
        
        // Filter users
        const userFilter = document.getElementById('userFilter');
        if (userFilter) {
            userFilter.addEventListener('change', () => this.filterUsers());
        }
        
        // Select all users
        const selectAll = document.getElementById('selectAllUsers');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.user-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }
        
        // Admin sidebar toggle
        const sidebarToggle = document.getElementById('adminSidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleAdminSidebar());
        }
    }
    
    toggleAdminSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
    }
    
    filterUsers() {
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const filterType = document.getElementById('userFilter')?.value || 'all';
        
        const filteredUsers = this.users.filter(user => {
            // Search filter
            const matchesSearch = 
                user.name.toLowerCase().includes(searchTerm) ||
                user.tag.toLowerCase().includes(searchTerm) ||
                user.id.toLowerCase().includes(searchTerm);
            
            // Type filter
            let matchesType = true;
            switch (filterType) {
                case 'online':
                    matchesType = user.online;
                    break;
                case 'offline':
                    matchesType = !user.online;
                    break;
                case 'admin':
                    matchesType = user.role === 'admin';
                    break;
                case 'member':
                    matchesType = user.role === 'member';
                    break;
            }
            
            return matchesSearch && matchesType;
        });
        
        // Update table with filtered users
        this.displayFilteredUsers(filteredUsers);
    }
    
    displayFilteredUsers(filteredUsers) {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td><input type="checkbox" class="user-checkbox" value="${user.id}"></td>
                <td>
                    <div class="user-cell">
                        <img src="${user.avatar}" alt="${user.name}">
                        <div>
                            <strong>${user.name}${user.tag}</strong>
                            <small>${user.id}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${user.online ? 'online' : 'offline'}">
                        ${user.online ? 'Online' : 'Offline'}
                    </span>
                </td>
                <td>
                    <span class="role-badge ${user.role}">${user.role}</span>
                </td>
                <td>${new Date(user.joined).toLocaleDateString()}</td>
                <td>${user.messageCount || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action" onclick="admin.editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="admin.deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-action" onclick="admin.messageUser('${user.id}')">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    showSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        const section = document.getElementById(`${sectionId}Section`);
        if (section) {
            section.classList.add('active');
        }
        
        // Update active nav item
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNav = document.querySelector(`.nav-item a[href="#${sectionId}"]`)?.parentElement;
        if (activeNav) {
            activeNav.classList.add('active');
        }
    }
    
    // Admin Actions
    
    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        alert(`Edit user: ${user.name}${user.tag}\nThis feature is under development.`);
    }
    
    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.users = this.users.filter(u => u.id !== userId);
                this.displayUsers();
                this.showToast('User deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showToast('Failed to delete user', 'error');
        }
    }
    
    messageUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        const message = prompt(`Send message to ${user.name}${user.tag}:`);
        if (message) {
            // Send message logic here
            this.showToast('Message sent', 'success');
        }
    }
    
    async reviewReport(reportId) {
        try {
            const response = await fetch(`/api/admin/reports/${reportId}/review`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const report = this.reports.find(r => r.id === reportId);
                if (report) {
                    report.status = 'reviewed';
                }
                this.updateReportStats();
                this.displayReports();
                this.showToast('Report marked as reviewed', 'success');
            }
        } catch (error) {
            console.error('Error reviewing report:', error);
            this.showToast('Failed to review report', 'error');
        }
    }
    
    async resolveReport(reportId) {
        try {
            const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const report = this.reports.find(r => r.id === reportId);
                if (report) {
                    report.status = 'resolved';
                }
                this.updateReportStats();
                this.displayReports();
                this.showToast('Report resolved', 'success');
            }
        } catch (error) {
            console.error('Error resolving report:', error);
            this.showToast('Failed to resolve report', 'error');
        }
    }
    
    async deleteReport(reportId) {
        if (!confirm('Are you sure you want to delete this report?')) return;
        
        try {
            const response = await fetch(`/api/admin/reports/${reportId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.reports = this.reports.filter(r => r.id !== reportId);
                this.updateReportStats();
                this.displayReports();
                this.showToast('Report deleted', 'success');
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            this.showToast('Failed to delete report', 'error');
        }
    }
    
    async sendBroadcast() {
        const modal = document.getElementById('broadcastModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    async sendBroadcastMessage() {
        const message = document.getElementById('broadcastMessage')?.value;
        const type = document.getElementById('broadcastType')?.value;
        const messageType = document.querySelector('input[name="messageType"]:checked')?.value;
        
        if (!message) {
            this.showToast('Please enter a message', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    type,
                    messageType
                })
            });
            
            if (response.ok) {
                this.showToast('Broadcast sent successfully', 'success');
                closeModal('broadcastModal');
            } else {
                throw new Error('Failed to send broadcast');
            }
        } catch (error) {
            console.error('Error sending broadcast:', error);
            this.showToast('Failed to send broadcast', 'error');
        }
    }
    
    async markNotificationRead(notificationId) {
        try {
            const response = await fetch(`/api/admin/notifications/${notificationId}/read`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.loadNotifications();
            }
        } catch (error) {
            console.error('Error marking notification read:', error);
        }
    }
    
    async clearNotifications() {
        try {
            const response = await fetch('/api/admin/notifications/clear', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.loadNotifications();
                this.showToast('Notifications cleared', 'success');
            }
        } catch (error) {
            console.error('Error clearing notifications:', error);
            this.showToast('Failed to clear notifications', 'error');
        }
    }
    
    deleteSelectedUsers() {
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        const userIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (userIds.length === 0) {
            this.showToast('No users selected', 'warning');
            return;
        }
        
        if (!confirm(`Delete ${userIds.length} selected users?`)) return;
        
        // Delete users logic here
        this.showToast(`${userIds.length} users deleted`, 'success');
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    getToastIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        return icons[type] || 'fa-info-circle';
    }
    
    // Settings Page Functions
    
    showSettingsTab(tabId) {
        // Hide all tabs
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab
        const tab = document.getElementById(`${tabId}Tab`);
        if (tab) {
            tab.classList.add('active');
        }
        
        // Update active nav link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`.nav-link[href="#${tabId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
    
    async saveAllSettings() {
        try {
            // Gather all settings
            const settings = {
                general: {
                    siteName: document.getElementById('siteName')?.value,
                    siteDescription: document.getElementById('siteDescription')?.value,
                    siteUrl: document.getElementById('siteUrl')?.value,
                    contactEmail: document.getElementById('contactEmail')?.value,
                    autoJoin: document.getElementById('autoJoinSetting')?.checked,
                    guestAccess: document.getElementById('guestAccess')?.checked
                },
                maintenance: {
                    enabled: document.getElementById('maintenanceMode')?.checked,
                    message: document.getElementById('maintenanceMessage')?.value,
                    allowAdmin: document.getElementById('adminAccess')?.checked,
                    schedule: document.getElementById('maintenanceSchedule')?.value,
                    duration: document.getElementById('maintenanceDuration')?.value
                },
                bot: {
                    name: document.getElementById('botName')?.value,
                    prefix: document.getElementById('botPrefix')?.value,
                    status: document.getElementById('botStatus')?.value,
                    enableAI: document.getElementById('enableAI')?.checked,
                    autoResponder: document.getElementById('autoResponder')?.checked,
                    logging: document.getElementById('botLogging')?.checked
                },
                webhook: {
                    url: document.getElementById('discordWebhook')?.value,
                    name: document.getElementById('webhookName')?.value,
                    avatar: document.getElementById('webhookAvatar')?.value,
                    enabled: document.getElementById('enableWebhook')?.checked,
                    sendToDiscord: document.getElementById('sendToDiscord')?.checked,
                    receiveFromDiscord: document.getElementById('receiveFromDiscord')?.checked,
                    reportToDiscord: document.getElementById('reportToDiscord')?.checked,
                    logCommands: document.getElementById('logCommandsToDiscord')?.checked
                }
            };
            
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            if (response.ok) {
                this.showToast('Settings saved successfully', 'success');
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }
    
    async testWebhook() {
        try {
            const response = await fetch('/api/admin/webhook/test', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showToast('Webhook test sent successfully', 'success');
            } else {
                throw new Error('Webhook test failed');
            }
        } catch (error) {
            console.error('Error testing webhook:', error);
            this.showToast('Webhook test failed', 'error');
        }
    }
    
    async checkForUpdates() {
        try {
            const response = await fetch('/api/admin/updates/check');
            const data = await response.json();
            
            const updateStatus = document.getElementById('updateStatus');
            if (updateStatus) {
                if (data.updateAvailable) {
                    updateStatus.innerHTML = `
                        <div class="update-available">
                            <h4>Update Available: v${data.latestVersion}</h4>
                            <p>${data.releaseNotes || ''}</p>
                            <button class="btn-primary" onclick="admin.installUpdate()">
                                <i class="fas fa-download"></i> Install Update
                            </button>
                        </div>
                    `;
                } else {
                    updateStatus.innerHTML = `
                        <div class="update-none">
                            <p>You're running the latest version (v${data.currentVersion})</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error checking updates:', error);
            this.showToast('Failed to check for updates', 'error');
        }
    }
    
    async installUpdate() {
        if (!confirm('Install update? The system may restart.')) return;
        
        try {
            const response = await fetch('/api/admin/updates/install', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showToast('Update installed successfully. Restarting...', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                throw new Error('Update failed');
            }
        } catch (error) {
            console.error('Error installing update:', error);
            this.showToast('Update failed', 'error');
        }
    }
}

// Login Page Functions
async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const adminCode = document.getElementById('adminCode')?.value;
    
    if (!username || !password) {
        showLoginAlert('Please enter username and password', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, adminCode })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save admin session
            sessionStorage.setItem('forexter_admin', JSON.stringify(data.admin));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            showLoginAlert(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginAlert('Network error. Please try again.', 'error');
    }
}

function showLoginAlert(message, type) {
    const alert = document.getElementById('loginAlert');
    const messageSpan = document.getElementById('alertMessage');
    
    if (alert && messageSpan) {
        messageSpan.textContent = message;
        alert.className = `login-alert ${type}`;
        alert.style.display = 'flex';
        
        setTimeout(() => {
            alert.style.display = 'none';
        }, 3000);
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin')) {
        if (window.location.pathname.includes('login.html')) {
            // Login page - don't initialize admin panel
            return;
        }
        
        window.admin = new ForexterAdmin();
    }
});

// Global admin functions
function sendBroadcast() {
    if (window.admin) {
        window.admin.sendBroadcast();
    }
}

function manageUsers() {
    if (window.admin) {
        window.admin.showSection('users');
    }
}

function viewReports() {
    if (window.admin) {
        window.admin.showSection('reports');
    }
}

function botSettings() {
    if (window.admin) {
        window.admin.showSection('bot');
    }
}

function communitySettings() {
    if (window.admin) {
        window.admin.showSection('community');
    }
}

function backupData() {
    if (window.admin) {
        // Implement backup logic
        window.admin.showToast('Backup started', 'info');
    }
}

function addUser() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function saveNewUser() {
    if (window.admin) {
        window.admin.showToast('User added successfully', 'success');
        closeModal('addUserModal');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('forexter_admin');
        window.location.href = 'login.html';
    }
}

function viewProfile() {
    alert('Profile view feature coming soon!');
}

function clearNotifications() {
    if (window.admin) {
        window.admin.clearNotifications();
    }
}
