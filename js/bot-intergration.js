// Bot Integration for Web Interface

class BotIntegration {
    constructor() {
        this.botStatus = 'offline';
        this.commands = [];
        this.lastResponse = null;
        
        this.init();
    }
    
    async init() {
        await this.loadCommands();
        await this.checkBotStatus();
        this.setupEventListeners();
    }
    
    async loadCommands() {
        try {
            const response = await fetch('/api/bot/commands');
            const data = await response.json();
            
            if (data.success) {
                this.commands = data.commands;
                this.updateCommandList();
            }
        } catch (error) {
            console.error('Failed to load commands:', error);
        }
    }
    
    async checkBotStatus() {
        try {
            const response = await fetch('/api/bot/status');
            const data = await response.json();
            
            this.botStatus = data.status;
            this.updateBotStatusUI();
            
            // Auto-reconnect if offline
            if (this.botStatus === 'offline') {
                setTimeout(() => this.checkBotStatus(), 5000);
            }
            
        } catch (error) {
            console.error('Failed to check bot status:', error);
            this.botStatus = 'error';
            this.updateBotStatusUI();
            
            // Retry after 10 seconds
            setTimeout(() => this.checkBotStatus(), 10000);
        }
    }
    
    updateBotStatusUI() {
        const statusElement = document.getElementById('botStatus');
        const statusIndicator = document.getElementById('botStatusIndicator');
        
        if (!statusElement || !statusIndicator) return;
        
        const statusConfig = {
            online: { text: '🟢 Online', color: '#43b581', icon: 'fa-circle' },
            offline: { text: '🔴 Offline', color: '#f04747', icon: 'fa-circle' },
            error: { text: '🟡 Error', color: '#faa61a', icon: 'fa-exclamation-triangle' }
        };
        
        const config = statusConfig[this.botStatus] || statusConfig.offline;
        
        statusElement.textContent = config.text;
        statusIndicator.style.backgroundColor = config.color;
        statusIndicator.innerHTML = `<i class="fas ${config.icon}"></i>`;
    }
    
    updateCommandList() {
        const commandList = document.getElementById('commandList');
        if (!commandList) return;
        
        commandList.innerHTML = this.commands.map(cmd => `
            <div class="command-item" onclick="botIntegration.executeCommand('${cmd.command}')">
                <div class="command-icon">
                    <i class="fas ${cmd.icon || 'fa-terminal'}"></i>
                </div>
                <div class="command-info">
                    <h4>!${cmd.command}</h4>
                    <p>${cmd.description}</p>
                </div>
                <div class="command-arrow">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `).join('');
    }
    
    setupEventListeners() {
        // Command execution from web
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cmd-btn')) {
                const command = e.target.closest('.cmd-btn').dataset.command;
                if (command) {
                    this.executeCommand(command);
                }
            }
        });
        
        // TTS form submission
        const ttsForm = document.getElementById('ttsForm');
        if (ttsForm) {
            ttsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.executeTTS();
            });
        }
        
        // Report form submission
        const reportForm = document.getElementById('reportForm');
        if (reportForm) {
            reportForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitReport();
            });
        }
    }
    
    async executeCommand(command, args = '') {
        try {
            this.showLoading(`Executing: !${command} ${args}`);
            
            const response = await fetch('/api/bot/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: command,
                    args: args,
                    user: window.forexterChat?.user
                })
            });
            
            const data = await response.json();
            
            this.hideLoading();
            
            if (data.success) {
                this.showResponse(data.response);
                this.lastResponse = data;
            } else {
                this.showError(data.error || 'Command failed');
            }
            
        } catch (error) {
            console.error('Command execution error:', error);
            this.hideLoading();
            this.showError('Failed to execute command');
        }
    }
    
    async executeTTS() {
        const text = document.getElementById('ttsText')?.value;
        const tokoh = document.getElementById('ttsTokoh')?.value;
        
        if (!text || !tokoh) {
            this.showError('Please enter text and select a character');
            return;
        }
        
        try {
            this.showLoading('Generating TTS...');
            
            const response = await fetch('/api/bot/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    tokoh: tokoh,
                    user: window.forexterChat?.user
                })
            });
            
            const data = await response.json();
            
            this.hideLoading();
            
            if (data.success) {
                this.playAudio(data.audioUrl);
                this.showResponse('TTS generated successfully!');
            } else {
                this.showError(data.error || 'TTS generation failed');
            }
            
        } catch (error) {
            console.error('TTS error:', error);
            this.hideLoading();
            this.showError('Failed to generate TTS');
        }
    }
    
    async submitReport() {
        const type = document.getElementById('reportType')?.value;
        const details = document.getElementById('reportDetails')?.value;
        const evidence = document.getElementById('reportEvidence')?.files[0];
        const targetUser = document.getElementById('reportUser')?.value;
        
        if (!type || !details) {
            this.showError('Please fill in required fields');
            return;
        }
        
        try {
            this.showLoading('Submitting report...');
            
            const formData = new FormData();
            formData.append('type', type);
            formData.append('details', details);
            formData.append('targetUser', targetUser || '');
            formData.append('reporter', JSON.stringify(window.forexterChat?.user));
            
            if (evidence) {
                formData.append('evidence', evidence);
            }
            
            const response = await fetch('/api/report', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            this.hideLoading();
            
            if (data.success) {
                this.showSuccess('Report submitted successfully!');
                this.resetReportForm();
                closeModal('reportModal');
            } else {
                this.showError(data.error || 'Report submission failed');
            }
            
        } catch (error) {
            console.error('Report error:', error);
            this.hideLoading();
            this.showError('Failed to submit report');
        }
    }
    
    playAudio(url) {
        const audio = new Audio(url);
        audio.play().catch(e => {
            console.error('Audio play failed:', e);
            this.showError('Failed to play audio. Click the link to download.');
        });
    }
    
    showLoading(message = 'Loading...') {
        const loading = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (loading && loadingText) {
            loadingText.textContent = message;
            loading.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    
    showResponse(response) {
        const modal = document.getElementById('botResponseModal');
        const content = document.getElementById('botResponseContent');
        
        if (modal && content) {
            content.innerHTML = this.formatResponse(response);
            modal.style.display = 'flex';
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showWarning(message) {
        this.showNotification(message, 'warning');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        return icons[type] || 'fa-info-circle';
    }
    
    formatResponse(response) {
        if (typeof response === 'string') {
            return response.replace(/\n/g, '<br>');
        }
        
        if (typeof response === 'object') {
            let html = '';
            
            if (response.text) {
                html += `<p>${response.text.replace(/\n/g, '<br>')}</p>`;
            }
            
            if (response.fields) {
                html += '<div class="response-fields">';
                response.fields.forEach(field => {
                    html += `
                        <div class="response-field">
                            <strong>${field.name}:</strong>
                            <span>${field.value}</span>
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            if (response.buttons) {
                html += '<div class="response-buttons">';
                response.buttons.forEach(button => {
                    html += `
                        <button class="btn-response" data-action="${button.action}">
                            ${button.text}
                        </button>
                    `;
                });
                html += '</div>';
            }
            
            return html;
        }
        
        return JSON.stringify(response);
    }
    
    resetReportForm() {
        document.getElementById('reportType').value = '';
        document.getElementById('reportDetails').value = '';
        document.getElementById('reportEvidence').value = '';
        document.getElementById('reportUser').value = '';
        document.getElementById('fileName').textContent = 'No file chosen';
    }
}

// Initialize bot integration
document.addEventListener('DOMContentLoaded', () => {
    window.botIntegration = new BotIntegration();
});

// Global functions for HTML
function sendBotCommand(command, args = '') {
    if (window.botIntegration) {
        window.botIntegration.executeCommand(command, args);
    }
}

function previewTTS() {
    const text = document.getElementById('ttsText')?.value;
    const tokoh = document.getElementById('ttsTokoh')?.value;
    
    if (!text || !tokoh) {
        alert('Please enter text and select a character');
        return;
    }
    
    // Play preview audio
    const audio = document.getElementById('ttsAudio');
    const previewBtn = document.getElementById('previewTTSBtn');
    
    previewBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    previewBtn.disabled = true;
    
    fetch('/api/bot/tts/preview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, tokoh })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            audio.src = data.audioUrl;
            audio.play();
        } else {
            alert('Failed to generate preview');
        }
    })
    .catch(error => {
        console.error('Preview error:', error);
        alert('Failed to generate preview');
    })
    .finally(() => {
        previewBtn.innerHTML = '<i class="fas fa-play"></i> Preview';
        previewBtn.disabled = false;
    });
}

function selectTokoh(tokoh) {
    const options = document.querySelectorAll('.tokoh-option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    const selected = document.querySelector(`.tokoh-option[onclick*="${tokoh}"]`);
    if (selected) {
        selected.classList.add('selected');
        document.getElementById('ttsTokoh').value = tokoh;
    }
}

function sendTTS() {
    if (window.botIntegration) {
        window.botIntegration.executeTTS();
    }
}

function toggleReportFields() {
    const type = document.getElementById('reportType').value;
    const userField = document.getElementById('reportUserField');
    const evidenceField = document.getElementById('reportEvidenceField');
    
    if (userField) {
        userField.style.display = type === 'harassment' || type === 'scam' ? 'block' : 'none';
    }
    
    if (evidenceField) {
        evidenceField.style.display = type === 'scam' || type === 'inappropriate' ? 'block' : 'none';
    }
}

function attachEvidence() {
    const input = document.getElementById('reportEvidence');
    const fileName = document.getElementById('fileName');
    
    input.click();
    
    input.addEventListener('change', () => {
        if (input.files.length > 0) {
            fileName.textContent = input.files[0].name;
        } else {
            fileName.textContent = 'No file chosen';
        }
    });
}
