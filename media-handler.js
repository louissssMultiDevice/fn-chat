class MediaHandler {
    constructor() {
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.supportedFormats = {
            image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            video: ['video/mp4', 'video/webm', 'video/ogg'],
            audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
            document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                      'text/plain', 'application/zip', 'application/x-rar-compressed']
        };
    }

    async handleFileUpload(file, chatId) {
        try {
            // Validate file
            await this.validateFile(file);
            
            // Generate preview
            const preview = await this.generatePreview(file);
            
            // Upload to server (simulated)
            const uploadedFile = await this.uploadFile(file);
            
            // Create message object
            const message = {
                id: `file_${Date.now()}`,
                sender: app.userData.id,
                receiver: chatId,
                content: file.name,
                timestamp: new Date().toISOString(),
                type: this.getFileType(file),
                file: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: uploadedFile.url,
                    preview: preview
                },
                status: 'sent'
            };
            
            // Save and send message
            await app.db.saveMessage(message);
            app.socket.emit('send_message', message);
            
            // Update UI
            app.appendFileMessage(message, 'sent');
            
            return message;
        } catch (error) {
            console.error('File upload failed:', error);
            app.showNotification('Upload Failed', error.message, 'error');
            throw error;
        }
    }

    async validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            throw new Error(`File size exceeds ${this.formatFileSize(this.maxFileSize)} limit`);
        }
        
        // Check file type
        const fileType = this.getFileType(file);
        if (!fileType) {
            throw new Error('Unsupported file format');
        }
        
        // Check if format is supported
        const supportedTypes = this.supportedFormats[fileType];
        if (supportedTypes && !supportedTypes.includes(file.type)) {
            throw new Error(`Unsupported ${fileType} format: ${file.type}`);
        }
        
        // Additional validations based on file type
        switch(fileType) {
            case 'image':
                await this.validateImage(file);
                break;
            case 'video':
                await this.validateVideo(file);
                break;
            case 'audio':
                await this.validateAudio(file);
                break;
        }
        
        return true;
    }

    async validateImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Check dimensions
                if (img.width > 10000 || img.height > 10000) {
                    reject(new Error('Image dimensions too large'));
                } else {
                    resolve(true);
                }
            };
            img.onerror = () => reject(new Error('Invalid image file'));
            img.src = URL.createObjectURL(file);
        });
    }

    async validateVideo(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                URL.revokeObjectURL(video.src);
                
                // Check duration
                if (video.duration > 3600) { // 1 hour
                    reject(new Error('Video duration exceeds 1 hour limit'));
                } else {
                    resolve(true);
                }
            };
            
            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                reject(new Error('Invalid video file'));
            };
            
            video.src = URL.createObjectURL(file);
        });
    }

    async validateAudio(file) {
        return new Promise((resolve, reject) => {
            const audio = document.createElement('audio');
            audio.preload = 'metadata';
            
            audio.onloadedmetadata = () => {
                URL.revokeObjectURL(audio.src);
                
                // Check duration
                if (audio.duration > 7200) { // 2 hours
                    reject(new Error('Audio duration exceeds 2 hour limit'));
                } else {
                    resolve(true);
                }
            };
            
            audio.onerror = () => {
                URL.revokeObjectURL(audio.src);
                reject(new Error('Invalid audio file'));
            };
            
            audio.src = URL.createObjectURL(file);
        });
    }

    getFileType(file) {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        if (file.type === 'application/pdf') return 'document';
        if (file.type.includes('document') || file.type.includes('sheet')) return 'document';
        if (file.type.includes('zip') || file.type.includes('rar')) return 'document';
        return null;
    }

    async generatePreview(file) {
        const fileType = this.getFileType(file);
        
        switch(fileType) {
            case 'image':
                return await this.generateImagePreview(file);
            case 'video':
                return await this.generateVideoPreview(file);
            case 'audio':
                return await this.generateAudioPreview(file);
            case 'document':
                return await this.generateDocumentPreview(file);
            default:
                return null;
        }
    }

    async generateImagePreview(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Create thumbnail
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate dimensions for thumbnail
                const maxSize = 200;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw thumbnail
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    async generateVideoPreview(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadeddata = () => {
                // Seek to 25% for thumbnail
                video.currentTime = video.duration * 0.25;
            };
            
            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
                URL.revokeObjectURL(video.src);
                resolve(thumbnail);
            };
            
            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                reject(new Error('Failed to generate video preview'));
            };
            
            video.src = URL.createObjectURL(file);
        });
    }

    async generateAudioPreview(file) {
        // For audio files, return waveform or just icon
        return null; // Could generate waveform using Web Audio API
    }

    async generateDocumentPreview(file) {
        // For documents, return icon based on file type
        const icon = this.getDocumentIcon(file.type);
        return icon;
    }

    getDocumentIcon(mimeType) {
        const icons = {
            'application/pdf': 'fas fa-file-pdf',
            'application/msword': 'fas fa-file-word',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fas fa-file-word',
            'application/vnd.ms-excel': 'fas fa-file-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fas fa-file-excel',
            'text/plain': 'fas fa-file-alt',
            'application/zip': 'fas fa-file-archive',
            'application/x-rar-compressed': 'fas fa-file-archive'
        };
        
        return icons[mimeType] || 'fas fa-file';
    }

    async uploadFile(file) {
        // Simulated file upload
        return new Promise((resolve) => {
            setTimeout(() => {
                const objectUrl = URL.createObjectURL(file);
                resolve({
                    url: objectUrl,
                    id: `file_${Date.now()}`,
                    uploadedAt: new Date().toISOString()
                });
            }, 1000);
        });
    }

    async downloadFile(fileUrl, fileName) {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Track download
            this.trackDownload(fileName);
            
            return true;
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }

    trackDownload(fileName) {
        const downloadData = {
            fileName,
            timestamp: new Date().toISOString(),
            user: app.userData.id
        };
        
        // Save to IndexedDB
        app.db.saveDownload(downloadData);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Image editing
    async editImage(imageUrl) {
        const modal = document.createElement('div');
        modal.className = 'modal image-editor-modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Edit Image</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="image-editor-container">
                    <div class="editor-tools">
                        <button class="tool-btn" data-tool="crop"><i class="fas fa-crop"></i></button>
                        <button class="tool-btn" data-tool="rotate"><i class="fas fa-redo"></i></button>
                        <button class="tool-btn" data-tool="brightness"><i class="fas fa-sun"></i></button>
                        <button class="tool-btn" data-tool="contrast"><i class="fas fa-adjust"></i></button>
                        <button class="tool-btn" data-tool="filter"><i class="fas fa-filter"></i></button>
                        <button class="tool-btn" data-tool="text"><i class="fas fa-font"></i></button>
                        <button class="tool-btn" data-tool="draw"><i class="fas fa-pencil-alt"></i></button>
                    </div>
                    <div class="editor-canvas-container">
                        <canvas id="image-editor-canvas"></canvas>
                    </div>
                    <div class="editor-controls">
                        <input type="range" id="brightness-slider" min="0" max="200" value="100">
                        <input type="range" id="contrast-slider" min="0" max="200" value="100">
                        <div class="filter-buttons">
                            <button class="filter-btn" data-filter="none">None</button>
                            <button class="filter-btn" data-filter="grayscale">Grayscale</button>
                            <button class="filter-btn" data-filter="sepia">Sepia</button>
                            <button class="filter-btn" data-filter="invert">Invert</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel">Cancel</button>
                <button class="btn btn-primary save-image">Save</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Initialize editor
        const canvas = document.getElementById('image-editor-canvas');
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = imageUrl;
        
        // Add event listeners
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.cancel');
        const saveBtn = modal.querySelector('.save-image');
        
        const closeEditor = () => {
            modal.remove();
            document.getElementById('modal-overlay').classList.add('hidden');
        };
        
        closeBtn.addEventListener('click', closeEditor);
        cancelBtn.addEventListener('click', closeEditor);
        
        saveBtn.addEventListener('click', () => {
            const editedImage = canvas.toDataURL('image/jpeg', 0.9);
            this.sendEditedImage(editedImage);
            closeEditor();
        });
        
        // Tool functionality
        modal.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.applyTool(tool, canvas, ctx);
            });
        });
        
        // Slider functionality
        const brightnessSlider = document.getElementById('brightness-slider');
        const contrastSlider = document.getElementById('contrast-slider');
        
        brightnessSlider.addEventListener('input', () => {
            this.applyBrightness(canvas, ctx, brightnessSlider.value);
        });
        
        contrastSlider.addEventListener('input', () => {
            this.applyContrast(canvas, ctx, contrastSlider.value);
        });
        
        // Filter buttons
        modal.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.applyFilter(canvas, ctx, filter);
            });
        });
    }

    applyTool(tool, canvas, ctx) {
        switch(tool) {
            case 'crop':
                this.startCrop(canvas, ctx);
                break;
            case 'rotate':
                this.rotateImage(canvas, ctx);
                break;
            case 'draw':
                this.startDrawing(canvas, ctx);
                break;
            case 'text':
                this.addText(canvas, ctx);
                break;
        }
    }

    applyBrightness(canvas, ctx, value) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = (value - 100) / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = data[i] + (255 * factor);
            data[i + 1] = data[i + 1] + (255 * factor);
            data[i + 2] = data[i + 2] + (255 * factor);
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    applyContrast(canvas, ctx, value) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = (value - 100) / 100;
        const contrast = factor * 255;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = (data[i] - 128) * contrast + 128;
            data[i + 1] = (data[i + 1] - 128) * contrast + 128;
            data[i + 2] = (data[i + 2] - 128) * contrast + 128;
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    applyFilter(canvas, ctx, filter) {
        ctx.filter = filter === 'none' ? 'none' : 
                    filter === 'grayscale' ? 'grayscale(1)' :
                    filter === 'sepia' ? 'sepia(1)' :
                    filter === 'invert' ? 'invert(1)' : 'none';
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);
    }

    async sendEditedImage(imageData) {
        // Convert data URL to blob
        const response = await fetch(imageData);
        const blob = await response.blob();
        
        // Create file from blob
        const file = new File([blob], 'edited-image.jpg', { type: 'image/jpeg' });
        
        // Send as new message
        await app.handleFileUpload(file, app.currentChat?.id);
    }

    // Video trimming
    async trimVideo(videoUrl, startTime, endTime) {
        // This would require more complex implementation with MediaSource API
        console.log('Video trimming requested:', { videoUrl, startTime, endTime });
        
        // For now, just return original
        return videoUrl;
    }

    // Audio editing
    async editAudio(audioUrl) {
        // Simple audio editor
        const modal = document.createElement('div');
        modal.className = 'modal audio-editor-modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Edit Audio</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="audio-editor-container">
                    <div class="audio-player">
                        <audio controls src="${audioUrl}"></audio>
                    </div>
                    <div class="editor-controls">
                        <div class="form-group">
                            <label>Trim Start (seconds)</label>
                            <input type="number" id="trim-start" value="0" min="0">
                        </div>
                        <div class="form-group">
                            <label>Trim End (seconds)</label>
                            <input type="number" id="trim-end" value="0" min="0">
                        </div>
                        <div class="form-group">
                            <label>Volume</label>
                            <input type="range" id="volume-slider" min="0" max="200" value="100">
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary cancel">Cancel</button>
                <button class="btn btn-primary save-audio">Save</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.cancel').addEventListener('click', () => this.closeModal(modal));
        
        modal.querySelector('.save-audio').addEventListener('click', async () => {
            const startTime = parseFloat(modal.querySelector('#trim-start').value);
            const endTime = parseFloat(modal.querySelector('#trim-end').value);
            
            try {
                const editedAudio = await this.trimAudio(audioUrl, startTime, endTime);
                this.sendEditedAudio(editedAudio);
                this.closeModal(modal);
            } catch (error) {
                app.showNotification('Error', 'Failed to edit audio', 'error');
            }
        });
    }

    async trimAudio(audioUrl, startTime, endTime) {
        // Simple audio trimming using Web Audio API
        return new Promise((resolve, reject) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createBufferSource();
            
            fetch(audioUrl)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    // Trim audio
                    const sampleRate = audioBuffer.sampleRate;
                    const startSample = Math.floor(startTime * sampleRate);
                    const endSample = endTime > 0 ? 
                        Math.floor(endTime * sampleRate) : 
                        audioBuffer.length;
                    
                    const trimmedLength = endSample - startSample;
                    const trimmedBuffer = audioContext.createBuffer(
                        audioBuffer.numberOfChannels,
                        trimmedLength,
                        sampleRate
                    );
                    
                    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                        const channelData = audioBuffer.getChannelData(channel);
                        const trimmedData = trimmedBuffer.getChannelData(channel);
                        
                        for (let i = 0; i < trimmedLength; i++) {
                            trimmedData[i] = channelData[startSample + i];
                        }
                    }
                    
                    // Convert back to blob
                    const numberOfChannels = trimmedBuffer.numberOfChannels;
                    const length = trimmedBuffer.length * numberOfChannels * 2;
                    const buffer = new ArrayBuffer(44 + length);
                    
                    // Create WAV header
                    const view = new DataView(buffer);
                    
                    // RIFF identifier
                    this.writeString(view, 0, 'RIFF');
                    // RIFF chunk length
                    view.setUint32(4, 36 + length, true);
                    // RIFF type
                    this.writeString(view, 8, 'WAVE');
                    // Format chunk identifier
                    this.writeString(view, 12, 'fmt ');
                    // Format chunk length
                    view.setUint32(16, 16, true);
                    // Sample format (raw)
                    view.setUint16(20, 1, true);
                    // Channel count
                    view.setUint16(22, numberOfChannels, true);
                    // Sample rate
                    view.setUint32(24, sampleRate, true);
                    // Byte rate (sample rate * block align)
                    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
                    // Block align (channel count * bytes per sample)
                    view.setUint16(32, numberOfChannels * 2, true);
                    // Bits per sample
                    view.setUint16(34, 16, true);
                    // Data chunk identifier
                    this.writeString(view, 36, 'data');
                    // Data chunk length
                    view.setUint32(40, length, true);
                    
                    // Write audio samples
                    const offset = 44;
                    for (let i = 0; i < trimmedBuffer.length; i++) {
                        for (let channel = 0; channel < numberOfChannels; channel++) {
                            const sample = Math.max(-1, Math.min(1, trimmedBuffer.getChannelData(channel)[i]));
                            view.setInt16(offset + (i * numberOfChannels + channel) * 2, sample * 0x7FFF, true);
                        }
                    }
                    
                    const blob = new Blob([view], { type: 'audio/wav' });
                    resolve(URL.createObjectURL(blob));
                })
                .catch(reject);
        });
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    sendEditedAudio(audioUrl) {
        // Create audio file from URL
        fetch(audioUrl)
            .then(response => response.blob())
            .then(blob => {
                const file = new File([blob], 'edited-audio.wav', { type: 'audio/wav' });
                app.handleFileUpload(file, app.currentChat?.id);
            });
    }

    closeModal(modal) {
        modal.remove();
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    // Document viewer
    async viewDocument(fileUrl, fileName) {
        const modal = document.createElement('div');
        modal.className = 'modal document-viewer-modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>${fileName}</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="document-viewer">
                    <iframe src="${fileUrl}" frameborder="0"></iframe>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary close-btn">Close</button>
                <button class="btn btn-primary download-btn">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.close-btn').addEventListener('click', () => this.closeModal(modal));
        
        modal.querySelector('.download-btn').addEventListener('click', () => {
            this.downloadFile(fileUrl, fileName);
        });
    }

    // Media gallery
    async showMediaGallery(chatId, mediaType = 'all') {
        const messages = await app.db.getMessages(chatId);
        const mediaMessages = messages.filter(msg => 
            ['image', 'video', 'audio', 'document'].includes(msg.type) &&
            (mediaType === 'all' || msg.type === mediaType)
        );
        
        const modal = document.createElement('div');
        modal.className = 'modal media-gallery-modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Media Gallery</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="gallery-filters">
                    <button class="filter-btn ${mediaType === 'all' ? 'active' : ''}" data-type="all">All</button>
                    <button class="filter-btn ${mediaType === 'image' ? 'active' : ''}" data-type="image">Photos</button>
                    <button class="filter-btn ${mediaType === 'video' ? 'active' : ''}" data-type="video">Videos</button>
                    <button class="filter-btn ${mediaType === 'audio' ? 'active' : ''}" data-type="audio">Audio</button>
                    <button class="filter-btn ${mediaType === 'document' ? 'active' : ''}" data-type="document">Documents</button>
                </div>
                <div class="gallery-grid" id="gallery-grid">
                    <!-- Media items will be inserted here -->
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary close-btn">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Load media items
        this.loadGalleryItems(mediaMessages, 'gallery-grid');
        
        // Add filter event listeners
        modal.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const type = e.currentTarget.dataset.type;
                const filteredMessages = messages.filter(msg => 
                    type === 'all' || msg.type === type
                );
                
                this.loadGalleryItems(filteredMessages, 'gallery-grid');
                
                // Update active filter
                modal.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // Add close event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.close-btn').addEventListener('click', () => this.closeModal(modal));
    }

    loadGalleryItems(messages, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        messages.forEach(msg => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.dataset.id = msg.id;
            
            let thumbnail = '';
            let icon = '';
            
            switch(msg.type) {
                case 'image':
                    thumbnail = `<img src="${msg.file.preview || msg.file.url}" alt="${msg.file.name}">`;
                    break;
                case 'video':
                    thumbnail = `
                        <div class="video-thumbnail">
                            <i class="fas fa-play"></i>
                            <img src="${msg.file.preview || ''}" alt="${msg.file.name}">
                        </div>
                    `;
                    break;
                case 'audio':
                    icon = '<i class="fas fa-music"></i>';
                    break;
                case 'document':
                    icon = '<i class="fas fa-file"></i>';
                    break;
            }
            
            item.innerHTML = `
                <div class="gallery-item-content">
                    ${thumbnail || icon}
                    <div class="gallery-item-overlay">
                        <button class="view-btn"><i class="fas fa-eye"></i></button>
                        <button class="download-btn"><i class="fas fa-download"></i></button>
                    </div>
                </div>
            `;
            
            // Add event listeners
            const viewBtn = item.querySelector('.view-btn');
            const downloadBtn = item.querySelector('.download-btn');
            
            viewBtn.addEventListener('click', () => {
                this.viewMedia(msg);
            });
            
            downloadBtn.addEventListener('click', () => {
                this.downloadFile(msg.file.url, msg.file.name);
            });
            
            container.appendChild(item);
        });
    }

    viewMedia(message) {
        switch(message.type) {
            case 'image':
                this.viewImage(message.file.url);
                break;
            case 'video':
                this.viewVideo(message.file.url);
                break;
            case 'audio':
                this.playAudio(message.file.url);
                break;
            case 'document':
                this.viewDocument(message.file.url, message.file.name);
                break;
        }
    }

    viewImage(imageUrl) {
        const modal = document.createElement('div');
        modal.className = 'modal image-viewer-modal';
        modal.innerHTML = `
            <div class="modal-header">
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="image-viewer">
                    <img src="${imageUrl}" alt="Image">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary close-btn">Close</button>
                <button class="btn btn-primary download-btn">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.close-btn').addEventListener('click', () => this.closeModal(modal));
        
        modal.querySelector('.download-btn').addEventListener('click', () => {
            this.downloadFile(imageUrl, 'image.jpg');
        });
    }

    viewVideo(videoUrl) {
        const modal = document.createElement('div');
        modal.className = 'modal video-viewer-modal';
        modal.innerHTML = `
            <div class="modal-header">
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="video-viewer">
                    <video controls autoplay>
                        <source src="${videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary close-btn">Close</button>
                <button class="btn btn-primary download-btn">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.close-btn').addEventListener('click', () => this.closeModal(modal));
        
        modal.querySelector('.download-btn').addEventListener('click', () => {
            this.downloadFile(videoUrl, 'video.mp4');
        });
    }

    playAudio(audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
        
        // Show notification
        app.showNotification('Playing Audio', 'Audio is now playing', 'info');
    }

    // Bulk media download
    async downloadMedia(chatId, mediaType = 'all') {
        const messages = await app.db.getMessages(chatId);
        const mediaMessages = messages.filter(msg => 
            ['image', 'video', 'audio', 'document'].includes(msg.type) &&
            (mediaType === 'all' || msg.type === mediaType)
        );
        
        if (mediaMessages.length === 0) {
            app.showNotification('No Media', 'No media files found to download', 'info');
            return;
        }
        
        // Create zip file
        const JSZip = window.JSZip;
        const zip = new JSZip();
        
        // Show progress
        app.showNotification('Preparing Download', `Preparing ${mediaMessages.length} files...`, 'info');
        
        // Add files to zip
        for (let i = 0; i < mediaMessages.length; i++) {
            const msg = mediaMessages[i];
            try {
                const response = await fetch(msg.file.url);
                const blob = await response.blob();
                
                const folder = msg.type + 's';
                const filename = `${folder}/${msg.file.name}`;
                
                zip.file(filename, blob);
                
                // Update progress
                if (i % 5 === 0) {
                    app.showNotification(
                        'Download Progress',
                        `Processed ${i + 1}/${mediaMessages.length} files`,
                        'info'
                    );
                }
            } catch (error) {
                console.error('Failed to download:', msg.file.name, error);
            }
        }
        
        // Generate zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        
        // Download zip
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `forexter-media-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        URL.revokeObjectURL(zipUrl);
        
        app.showNotification(
            'Download Complete',
            `Downloaded ${mediaMessages.length} files`,
            'success'
        );
    }

    // Media compression
    async compressImage(file, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions (max 1920px)
                let width = img.width;
                let height = img.height;
                const maxSize = 1920;
                
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height *= maxSize / width;
                        width = maxSize;
                    } else {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    async compressVideo(file) {
        // Video compression is complex and requires WebCodecs API
        // For now, return original file
        return file;
    }

    // Media metadata extraction
    async extractMetadata(file) {
        return new Promise((resolve) => {
            const metadata = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            };
            
            if (file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    metadata.width = img.width;
                    metadata.height = img.height;
                    resolve(metadata);
                };
                img.onerror = () => resolve(metadata);
                img.src = URL.createObjectURL(file);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.onloadedmetadata = () => {
                    metadata.duration = video.duration;
                    metadata.width = video.videoWidth;
                    metadata.height = video.videoHeight;
                    resolve(metadata);
                };
                video.onerror = () => resolve(metadata);
                video.src = URL.createObjectURL(file);
            } else if (file.type.startsWith('audio/')) {
                const audio = document.createElement('audio');
                audio.onloadedmetadata = () => {
                    metadata.duration = audio.duration;
                    resolve(metadata);
                };
                audio.onerror = () => resolve(metadata);
                audio.src = URL.createObjectURL(file);
            } else {
                resolve(metadata);
            }
        });
    }
}

// Export singleton
const mediaHandler = new MediaHandler();
export default mediaHandler;
