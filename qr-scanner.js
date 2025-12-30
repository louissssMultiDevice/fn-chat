class QRScanner {
    constructor() {
        this.scanner = null;
        this.isScanning = false;
    }

    async initialize(containerId) {
        try {
            // Check if browser supports camera
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera not supported');
            }

            // Request camera permission
            await navigator.mediaDevices.getUserMedia({ video: true });
            
            // Initialize scanner
            this.scanner = new Html5Qrcode(containerId);
            
            return true;
        } catch (error) {
            console.error('QR Scanner initialization failed:', error);
            return false;
        }
    }

    async startScanning(onSuccess) {
        if (!this.scanner || this.isScanning) return false;

        try {
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await this.scanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    this.handleScannedCode(decodedText, onSuccess);
                },
                (errorMessage) => {
                    console.log('QR scan error:', errorMessage);
                }
            );

            this.isScanning = true;
            return true;
        } catch (error) {
            console.error('Failed to start scanning:', error);
            return false;
        }
    }

    stopScanning() {
        if (this.scanner && this.isScanning) {
            this.scanner.stop();
            this.isScanning = false;
        }
    }

    handleScannedCode(decodedText, onSuccess) {
        try {
            // Parse QR data
            const qrData = JSON.parse(decodedText);
            
            // Stop scanning
            this.stopScanning();
            
            // Handle different QR types
            switch(qrData.type) {
                case 'login':
                    this.handleLoginQR(qrData);
                    break;
                case 'contact':
                    this.handleContactQR(qrData);
                    break;
                case 'group':
                    this.handleGroupQR(qrData);
                    break;
                case 'channel':
                    this.handleChannelQR(qrData);
                    break;
                case 'community':
                    this.handleCommunityQR(qrData);
                    break;
                case 'payment':
                    this.handlePaymentQR(qrData);
                    break;
                default:
                    console.warn('Unknown QR type:', qrData.type);
            }
            
            if (onSuccess) {
                onSuccess(qrData);
            }
        } catch (error) {
            console.error('Invalid QR code:', error);
            
            // Try to handle as plain URL
            this.handleAsUrl(decodedText);
        }
    }

    handleLoginQR(qrData) {
        // Handle login QR code
        const { sessionId } = qrData;
        
        // Send scan confirmation to server
        if (app.socket) {
            app.socket.emit('qr_scan_login', { sessionId });
        }
        
        // Show waiting message
        app.showNotification(
            'QR Code Scanned',
            'Waiting for login confirmation...',
            'info'
        );
        
        // Listen for login confirmation
        app.socket.once('qr_login_confirmed', () => {
            app.showNotification(
                'Login Confirmed',
                'You are now logged in!',
                'success'
            );
            
            // Auto login
            app.loginUser();
        });
    }

    handleContactQR(qrData) {
        // Handle contact QR code
        const contact = qrData.contact;
        
        // Show contact preview
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Add Contact</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="contact-preview">
                    <img src="${contact.avatar}" alt="${contact.name}" class="contact-avatar">
                    <div class="contact-info">
                        <h4>${contact.name}</h4>
                        <p>${contact.phone}</p>
                        <p class="contact-about">${contact.about || 'No bio'}</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel">Cancel</button>
                <button class="btn btn-primary save-contact">Save Contact</button>
                <button class="btn btn-success message-contact">Message</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.cancel').addEventListener('click', () => this.closeModal(modal));
        
        modal.querySelector('.save-contact').addEventListener('click', () => {
            app.saveContact(contact);
            this.closeModal(modal);
        });
        
        modal.querySelector('.message-contact').addEventListener('click', () => {
            app.startChatWithContact(contact);
            this.closeModal(modal);
        });
    }

    handleGroupQR(qrData) {
        // Handle group QR code
        const group = qrData.group;
        
        // Show group preview
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Join Group</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="group-preview">
                    <div class="group-avatar">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="group-info">
                        <h4>${group.name}</h4>
                        <p>${group.description || 'No description'}</p>
                        <div class="group-stats">
                            <span><i class="fas fa-users"></i> ${group.memberCount} members</span>
                            <span><i class="fas fa-lock"></i> ${group.privacy}</span>
                        </div>
                        <div class="group-admins">
                            <strong>Admins:</strong> ${group.admins.join(', ')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel">Cancel</button>
                <button class="btn btn-primary join-group">Join Group</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.cancel').addEventListener('click', () => this.closeModal(modal));
        
        modal.querySelector('.join-group').addEventListener('click', async () => {
            try {
                await app.joinGroup(group);
                this.closeModal(modal);
                app.showNotification('Success', `Joined ${group.name}`, 'success');
            } catch (error) {
                app.showNotification('Error', 'Failed to join group', 'error');
            }
        });
    }

    handleChannelQR(qrData) {
        // Handle channel QR code
        const channel = qrData.channel;
        
        // Show channel preview
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Subscribe to Channel</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="channel-preview">
                    <div class="channel-avatar">
                        <i class="fas fa-broadcast-tower"></i>
                    </div>
                    <div class="channel-info">
                        <h4>${channel.name}</h4>
                        <p>${channel.description || 'No description'}</p>
                        <div class="channel-stats">
                            <span><i class="fas fa-users"></i> ${channel.subscriberCount} subscribers</span>
                        </div>
                        <div class="channel-admins">
                            <strong>Admin:</strong> ${channel.admin}
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel">Cancel</button>
                <button class="btn btn-primary subscribe-channel">Subscribe</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.cancel').addEventListener('click', () => this.closeModal(modal));
        
        modal.querySelector('.subscribe-channel').addEventListener('click', async () => {
            try {
                await app.subscribeChannel(channel);
                this.closeModal(modal);
                app.showNotification('Success', `Subscribed to ${channel.name}`, 'success');
            } catch (error) {
                app.showNotification('Error', 'Failed to subscribe', 'error');
            }
        });
    }

    handleCommunityQR(qrData) {
        // Handle community QR code
        const community = qrData.community;
        
        // Show community preview
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Join Community</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="community-preview">
                    <div class="community-avatar">
                        <i class="fas fa-globe-asia"></i>
                    </div>
                    <div class="community-info">
                        <h4>${community.name}</h4>
                        <p>${community.description || 'No description'}</p>
                        <div class="community-stats">
                            <span><i class="fas fa-users"></i> ${community.memberCount} members</span>
                            <span><i class="fas fa-users"></i> ${community.groupCount} groups</span>
                        </div>
                        <div class="community-admins">
                            <strong>Admins:</strong> ${community.admins.join(', ')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel">Cancel</button>
                <button class="btn btn-primary join-community">Join Community</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.cancel').addEventListener('click', () => this.closeModal(modal));
        
        modal.querySelector('.join-community').addEventListener('click', async () => {
            try {
                await app.joinCommunity(community);
                this.closeModal(modal);
                app.showNotification('Success', `Joined ${community.name}`, 'success');
            } catch (error) {
                app.showNotification('Error', 'Failed to join community', 'error');
            }
        });
    }

    handlePaymentQR(qrData) {
        // Handle payment QR code
        const payment = qrData.payment;
        
        // Show payment preview
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Make Payment</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="payment-preview">
                    <div class="payment-info">
                        <div class="payment-amount">
                            <span class="currency">Rp</span>
                            <span class="amount">${payment.amount.toLocaleString()}</span>
                        </div>
                        <div class="payment-details">
                            <p><strong>To:</strong> ${payment.recipient}</p>
                            <p><strong>Note:</strong> ${payment.note || 'No note'}</p>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Payment Method</label>
                    <select id="payment-method">
                        <option value="balance">Forexter Balance</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="ewallet">E-Wallet</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel">Cancel</button>
                <button class="btn btn-primary confirm-payment">Pay Now</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.cancel').addEventListener('click', () => this.closeModal(modal));
        
        modal.querySelector('.confirm-payment').addEventListener('click', () => {
            this.processPayment(payment);
            this.closeModal(modal);
        });
    }

    processPayment(payment) {
        // Process payment
        app.showNotification(
            'Processing Payment',
            `Processing payment of Rp ${payment.amount.toLocaleString()}...`,
            'info'
        );
        
        // Simulate payment processing
        setTimeout(() => {
            app.showNotification(
                'Payment Successful',
                `Payment to ${payment.recipient} completed`,
                'success'
            );
        }, 2000);
    }

    handleAsUrl(url) {
        // Handle plain URL QR codes
        if (this.isValidUrl(url)) {
            // Show URL preview
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-header">
                    <h3>Open Link</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="url-preview">
                        <i class="fas fa-link"></i>
                        <p class="url">${url}</p>
                        <p class="warning">Make sure you trust this link before opening</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel">Cancel</button>
                    <button class="btn btn-primary open-url">Open Link</button>
                    <button class="btn btn-info copy-url">Copy</button>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.getElementById('modal-overlay').classList.remove('hidden');
            
            // Add event listeners
            modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
            modal.querySelector('.cancel').addEventListener('click', () => this.closeModal(modal));
            
            modal.querySelector('.open-url').addEventListener('click', () => {
                window.open(url, '_blank');
                this.closeModal(modal);
            });
            
            modal.querySelector('.copy-url').addEventListener('click', () => {
                navigator.clipboard.writeText(url);
                app.showNotification('Copied', 'URL copied to clipboard', 'success');
                this.closeModal(modal);
            });
        } else {
            // Show text content
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-header">
                    <h3>QR Content</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="text-content">
                        <pre>${url}</pre>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel">Close</button>
                    <button class="btn btn-info copy-text">Copy</button>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.getElementById('modal-overlay').classList.remove('hidden');
            
            // Add event listeners
            modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
            modal.querySelector('.cancel').addEventListener('click', () => this.closeModal(modal));
            
            modal.querySelector('.copy-text').addEventListener('click', () => {
                navigator.clipboard.writeText(url);
                app.showNotification('Copied', 'Text copied to clipboard', 'success');
                this.closeModal(modal);
            });
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    closeModal(modal) {
        modal.remove();
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    // Generate QR Code
    generateQRCode(data, containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        // Clear container
        container.innerHTML = '';

        // Default options
        const defaultOptions = {
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        };

        const qrOptions = { ...defaultOptions, ...options };

        // Generate QR code
        QRCode.toCanvas(
            JSON.stringify(data),
            qrOptions,
            (error, canvas) => {
                if (error) {
                    console.error('QR generation error:', error);
                    return;
                }
                
                container.appendChild(canvas);
                
                // Add download button
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'btn btn-sm btn-secondary mt-2';
                downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download QR';
                downloadBtn.onclick = () => this.downloadQR(canvas, data.type);
                
                container.appendChild(downloadBtn);
            }
        );
    }

    downloadQR(canvas, type) {
        const link = document.createElement('a');
        link.download = `forexter-${type}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Generate different types of QR codes
    generateLoginQR(sessionId) {
        return {
            type: 'login',
            sessionId,
            timestamp: Date.now(),
            expires: Date.now() + (5 * 60 * 1000) // 5 minutes
        };
    }

    generateContactQR(contact) {
        return {
            type: 'contact',
            contact: {
                id: contact.id,
                name: contact.name,
                phone: contact.phone,
                avatar: contact.avatar,
                about: contact.about
            },
            timestamp: Date.now()
        };
    }

    generateGroupQR(group) {
        return {
            type: 'group',
            group: {
                id: group.id,
                name: group.name,
                description: group.description,
                link: group.link,
                privacy: group.privacy,
                memberCount: group.members?.length || 0,
                admins: group.admins
            },
            timestamp: Date.now()
        };
    }

    generateChannelQR(channel) {
        return {
            type: 'channel',
            channel: {
                id: channel.id,
                name: channel.name,
                description: channel.description,
                link: channel.link,
                subscriberCount: channel.subscribers?.length || 0,
                admin: channel.admins?.[0] || 'Unknown'
            },
            timestamp: Date.now()
        };
    }

    generateCommunityQR(community) {
        return {
            type: 'community',
            community: {
                id: community.id,
                name: community.name,
                description: community.description,
                link: community.link,
                memberCount: community.members?.length || 0,
                groupCount: community.groups?.length || 0,
                admins: community.admins
            },
            timestamp: Date.now()
        };
    }

    generatePaymentQR(amount, recipient, note = '') {
        return {
            type: 'payment',
            payment: {
                amount,
                recipient,
                note,
                currency: 'IDR',
                timestamp: Date.now()
            }
        };
    }

    // Batch QR generation
    generateBatchQRCodes(items, type, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        items.forEach((item, index) => {
            const itemContainer = document.createElement('div');
            itemContainer.className = 'qr-item';
            
            const label = document.createElement('p');
            label.textContent = item.name || item.id;
            label.className = 'qr-label';
            
            const qrContainer = document.createElement('div');
            qrContainer.className = 'qr-code-container';
            qrContainer.id = `qr-${type}-${index}`;
            
            itemContainer.appendChild(label);
            itemContainer.appendChild(qrContainer);
            container.appendChild(itemContainer);
            
            // Generate QR for this item
            let qrData;
            switch(type) {
                case 'contact':
                    qrData = this.generateContactQR(item);
                    break;
                case 'group':
                    qrData = this.generateGroupQR(item);
                    break;
                case 'channel':
                    qrData = this.generateChannelQR(item);
                    break;
                case 'community':
                    qrData = this.generateCommunityQR(item);
                    break;
            }
            
            this.generateQRCode(qrData, `qr-${type}-${index}`, { width: 150, height: 150 });
        });
    }

    // Share QR code
    shareQR(canvas, title, text) {
        if (navigator.share) {
            canvas.toBlob(blob => {
                const file = new File([blob], 'qrcode.png', { type: 'image/png' });
                
                navigator.share({
                    title: title,
                    text: text,
                    files: [file]
                }).catch(error => {
                    console.log('Sharing failed:', error);
                    this.downloadQR(canvas, 'shared');
                });
            });
        } else {
            this.downloadQR(canvas, 'shared');
        }
    }

    // Scan from image file
    async scanFromImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Use html5-qrcode library to scan from image
                    Html5Qrcode.getCameras().then(cameras => {
                        const qrScanner = new Html5Qrcode("temp-scanner");
                        
                        qrScanner.scanFile(file, true)
                            .then(decodedText => {
                                resolve(decodedText);
                            })
                            .catch(error => {
                                reject(error);
                            });
                    });
                };
                img.src = event.target.result;
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Continuous scanning for multiple codes
    startContinuousScan(containerId, onScan) {
        let lastScanned = '';
        let scanCount = 0;
        
        return this.startScanning((decodedText) => {
            // Avoid duplicate scans
            if (decodedText !== lastScanned || scanCount > 5) {
                lastScanned = decodedText;
                scanCount = 0;
                onScan(decodedText);
            } else {
                scanCount++;
            }
            
            // Continue scanning
            setTimeout(() => {
                if (this.isScanning) {
                    this.scanner.resume();
                }
            }, 500);
        });
    }

    // Security: Validate QR code signature
    validateSignature(qrData, publicKey) {
        // In a real implementation, you would validate digital signatures
        // This is a simplified version
        if (!qrData.signature) {
            console.warn('QR code has no signature');
            return false;
        }
        
        // For now, just check if signature exists
        return true;
    }

    // Analytics: Track QR scans
    trackScan(type, source = 'scanner') {
        const scanData = {
            type,
            source,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        // Save to IndexedDB
        app.db.saveQRScan(scanData);
        
        // Send to analytics if online
        if (navigator.onLine) {
            fetch('/api/analytics/qr-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scanData)
            }).catch(console.error);
        }
    }
}

// Export singleton
const qrScanner = new QRScanner();
export default qrScanner;
