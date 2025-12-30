class WebRTCManager {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.dataChannel = null;
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        this.callType = null;
        this.callWith = null;
    }

    async startLocalVideo() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            });
            
            const videoElement = document.getElementById('local-video-element');
            if (videoElement) {
                videoElement.srcObject = this.localStream;
            }
            
            // Apply camera enhancement if enabled
            this.applyCameraEnhancement();
            
            return this.localStream;
        } catch (error) {
            console.error('Error accessing camera:', error);
            throw error;
        }
    }

    applyCameraEnhancement() {
        const video = document.getElementById('local-video-element');
        if (video) {
            // Apply filters for camera enhancement
            video.style.filter = `
                contrast(1.1)
                brightness(1.1)
                saturate(1.2)
                hue-rotate(-5deg)
            `;
            
            // Apply WebGL filters if available
            this.applyWebGLFilters(video);
        }
    }

    async applyWebGLFilters(video) {
        // Simple WebGL filter for enhancement
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw video frame with enhancement
            ctx.filter = 'contrast(1.1) brightness(1.1) saturate(1.2)';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Apply additional processing
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            this.enhanceImageData(imageData);
            ctx.putImageData(imageData, 0, 0);
            
            // Update video source
            const stream = canvas.captureStream(30);
            video.srcObject = stream;
        } catch (error) {
            console.warn('WebGL enhancement failed:', error);
        }
    }

    enhanceImageData(imageData) {
        // Simple image enhancement algorithm
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // Enhance contrast
            data[i] = this.adjustContrast(data[i]);
            data[i + 1] = this.adjustContrast(data[i + 1]);
            data[i + 2] = this.adjustContrast(data[i + 2]);
            
            // Enhance brightness
            data[i] = Math.min(255, data[i] * 1.1);
            data[i + 1] = Math.min(255, data[i + 1] * 1.1);
            data[i + 2] = Math.min(255, data[i + 2] * 1.1);
        }
    }

    adjustContrast(value) {
        const factor = 1.2;
        return Math.min(255, Math.max(0, ((value - 128) * factor) + 128));
    }

    async stopLocalVideo() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
            
            const videoElement = document.getElementById('local-video-element');
            if (videoElement) {
                videoElement.srcObject = null;
            }
        }
    }

    async startCall(callType, userId) {
        this.callType = callType;
        this.callWith = userId;
        
        try {
            // Create peer connection
            this.peerConnection = new RTCPeerConnection(this.config);
            
            // Add local stream
            if (callType === 'video') {
                await this.startLocalVideo();
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            } else {
                // Audio only for voice call
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, audioStream);
                });
            }
            
            // Create data channel for additional data
            this.dataChannel = this.peerConnection.createDataChannel('chat');
            this.setupDataChannel();
            
            // Set up event handlers
            this.setupPeerConnectionEvents();
            
            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // Send offer via signaling
            this.sendSignal({
                type: 'offer',
                offer: offer,
                callType: callType,
                from: app.userData.id,
                to: userId
            });
            
            return offer;
        } catch (error) {
            console.error('Error starting call:', error);
            throw error;
        }
    }

    async answerCall(offer, callType, fromUser) {
        this.callType = callType;
        this.callWith = fromUser;
        
        try {
            // Create peer connection
            this.peerConnection = new RTCPeerConnection(this.config);
            
            // Add local stream
            if (callType === 'video') {
                await this.startLocalVideo();
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            } else {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, audioStream);
                });
            }
            
            // Set up event handlers
            this.setupPeerConnectionEvents();
            
            // Set remote description
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Create answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // Send answer via signaling
            this.sendSignal({
                type: 'answer',
                answer: answer,
                callType: callType,
                from: app.userData.id,
                to: fromUser
            });
            
            return answer;
        } catch (error) {
            console.error('Error answering call:', error);
            throw error;
        }
    }

    async handleAnswer(answer) {
        try {
            const remoteDesc = new RTCSessionDescription(answer);
            await this.peerConnection.setRemoteDescription(remoteDesc);
        } catch (error) {
            console.error('Error handling answer:', error);
            throw error;
        }
    }

    async handleIceCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    setupPeerConnectionEvents() {
        if (!this.peerConnection) return;
        
        // ICE candidate event
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    from: app.userData.id,
                    to: this.callWith
                });
            }
        };
        
        // Track event for remote stream
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            
            const videoElement = document.getElementById('remote-video-element');
            if (videoElement) {
                videoElement.srcObject = this.remoteStream;
            }
            
            // Also handle audio if voice call
            if (this.callType === 'voice') {
                const audio = new Audio();
                audio.srcObject = this.remoteStream;
                audio.play();
            }
        };
        
        // Connection state change
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            
            switch(this.peerConnection.connectionState) {
                case 'connected':
                    app.showNotification('Call Connected', 'You are now connected', 'success');
                    break;
                case 'disconnected':
                case 'failed':
                case 'closed':
                    app.endCall();
                    break;
            }
        };
        
        // Data channel events
        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };
    }

    setupDataChannel() {
        if (!this.dataChannel) return;
        
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            
            // Send initial data
            this.sendData({
                type: 'user-info',
                user: app.userData
            });
        };
        
        this.dataChannel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleDataMessage(data);
        };
        
        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
        };
    }

    sendData(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(data));
        }
    }

    handleDataMessage(data) {
        switch(data.type) {
            case 'user-info':
                console.log('Remote user:', data.user);
                break;
            case 'chat-message':
                app.showNotification('Call Message', data.message, 'info');
                break;
            case 'file-transfer':
                this.handleFileTransfer(data);
                break;
            case 'call-control':
                this.handleCallControl(data);
                break;
        }
    }

    handleFileTransfer(data) {
        // Handle file transfer during call
        const file = data.file;
        const blob = new Blob([file.data], { type: file.type });
        const url = URL.createObjectURL(blob);
        
        // Show notification
        app.showNotification('File Received', `${file.name} (${this.formatFileSize(file.size)})`, 'info');
        
        // Auto-download or show preview
        if (app.userPreferences.autoDownload) {
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.click();
        }
    }

    handleCallControl(data) {
        switch(data.action) {
            case 'mute':
                this.muteLocalAudio(data.muted);
                break;
            case 'video-off':
                this.toggleLocalVideo(data.enabled);
                break;
            case 'hold':
                this.holdCall(data.hold);
                break;
            case 'transfer':
                this.transferCall(data.target);
                break;
        }
    }

    muteLocalAudio(muted) {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !muted;
            }
        }
    }

    toggleLocalVideo(enabled) {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = enabled;
            }
        }
    }

    holdCall(hold) {
        if (this.peerConnection) {
            const senders = this.peerConnection.getSenders();
            senders.forEach(sender => {
                if (sender.track) {
                    sender.track.enabled = !hold;
                }
            });
        }
    }

    transferCall(targetUser) {
        // Implement call transfer
        this.sendSignal({
            type: 'call-transfer',
            from: app.userData.id,
            to: this.callWith,
            target: targetUser
        });
    }

    sendSignal(data) {
        // Send signaling data via Socket.IO
        if (app.socket) {
            app.socket.emit('webrtc-signal', data);
        }
    }

    async endCall() {
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        // Close data channel
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        
        // Reset variables
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.dataChannel = null;
        this.callType = null;
        this.callWith = null;
        
        // Clear video elements
        const localVideo = document.getElementById('local-video-element');
        const remoteVideo = document.getElementById('remote-video-element');
        
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
    }

    async toggleVideo() {
        if (!this.localStream) return;
        
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            const enabled = !videoTrack.enabled;
            videoTrack.enabled = enabled;
            
            // Notify remote
            this.sendData({
                type: 'call-control',
                action: 'video-off',
                enabled: enabled
            });
            
            return enabled;
        }
        
        return false;
    }

    async toggleAudio() {
        if (!this.localStream) return;
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            const enabled = !audioTrack.enabled;
            audioTrack.enabled = enabled;
            
            // Notify remote
            this.sendData({
                type: 'call-control',
                action: 'mute',
                muted: !enabled
            });
            
            return enabled;
        }
        
        return false;
    }

    async switchCamera() {
        try {
            // Get all video devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length < 2) {
                throw new Error('No alternate camera found');
            }
            
            // Find current camera
            const currentTrack = this.localStream.getVideoTracks()[0];
            const currentDevice = currentTrack.getSettings().deviceId;
            
            // Find next camera
            const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDevice);
            const nextIndex = (currentIndex + 1) % videoDevices.length;
            const nextDevice = videoDevices[nextIndex];
            
            // Stop current track
            currentTrack.stop();
            
            // Get new track
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: nextDevice.deviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            const newTrack = newStream.getVideoTracks()[0];
            
            // Replace track
            const sender = this.peerConnection.getSenders().find(s => 
                s.track && s.track.kind === 'video'
            );
            
            if (sender) {
                sender.replaceTrack(newTrack);
            }
            
            // Update local stream
            this.localStream.removeTrack(currentTrack);
            this.localStream.addTrack(newTrack);
            
            // Update video element
            const videoElement = document.getElementById('local-video-element');
            if (videoElement) {
                videoElement.srcObject = this.localStream;
            }
            
            return nextDevice.label || 'Camera ' + (nextIndex + 1);
        } catch (error) {
            console.error('Error switching camera:', error);
            throw error;
        }
    }

    async shareScreen() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            
            // Get video track from screen
            const screenTrack = screenStream.getVideoTracks()[0];
            
            // Replace current video track with screen track
            const sender = this.peerConnection.getSenders().find(s => 
                s.track && s.track.kind === 'video'
            );
            
            if (sender) {
                sender.replaceTrack(screenTrack);
            }
            
            // Handle screen track ending
            screenTrack.onended = () => {
                this.stopScreenShare();
            };
            
            this.screenTrack = screenTrack;
            
            return true;
        } catch (error) {
            console.error('Error sharing screen:', error);
            throw error;
        }
    }

    async stopScreenShare() {
        if (this.screenTrack) {
            this.screenTrack.stop();
            
            // Switch back to camera
            const cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true
            });
            
            const cameraTrack = cameraStream.getVideoTracks()[0];
            
            const sender = this.peerConnection.getSenders().find(s => 
                s.track && s.track.kind === 'video'
            );
            
            if (sender) {
                sender.replaceTrack(cameraTrack);
            }
            
            this.screenTrack = null;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Group call functionality
    async startGroupCall(participants) {
        // Create mesh network for small groups or use SFU for larger groups
        if (participants.length <= 4) {
            return this.startMeshGroupCall(participants);
        } else {
            return this.startSFUGroupCall(participants);
        }
    }

    async startMeshGroupCall(participants) {
        // Mesh network: each participant connects to every other participant
        const connections = [];
        
        for (const participant of participants) {
            if (participant !== app.userData.id) {
                const connection = await this.startCall('video', participant);
                connections.push(connection);
            }
        }
        
        return connections;
    }

    async startSFUGroupCall(participants) {
        // SFU (Selective Forwarding Unit) architecture
        // In a real implementation, you would connect to a media server
        console.log('Starting SFU group call with', participants.length, 'participants');
        
        // Simulated implementation
        return {
            type: 'sfu',
            participants: participants,
            server: 'wss://sfu.forexter.net'
        };
    }

    // Recording functionality
    async startRecording() {
        try {
            if (!this.remoteStream) {
                throw new Error('No remote stream available');
            }
            
            // Combine local and remote streams
            const mixedStream = new MediaStream();
            
            // Add audio from remote
            const remoteAudio = this.remoteStream.getAudioTracks()[0];
            if (remoteAudio) {
                mixedStream.addTrack(remoteAudio.clone());
            }
            
            // Add video from remote or local (depending on preference)
            const remoteVideo = this.remoteStream.getVideoTracks()[0];
            if (remoteVideo) {
                mixedStream.addTrack(remoteVideo.clone());
            }
            
            // Start recording
            this.mediaRecorder = new MediaRecorder(mixedStream, {
                mimeType: 'video/webm;codecs=vp8,opus'
            });
            
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, {
                    type: 'video/webm'
                });
                
                // Save recording
                this.saveRecording(blob);
            };
            
            this.mediaRecorder.start(1000); // Collect data every second
            
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            throw error;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    saveRecording(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-recording-${Date.now()}.webm`;
        a.click();
        
        // Also save to IndexedDB for history
        app.db.saveRecording({
            id: 'rec_' + Date.now(),
            url: url,
            duration: this.getRecordingDuration(),
            timestamp: new Date().toISOString(),
            participants: [app.userData.id, this.callWith]
        });
    }

    getRecordingDuration() {
        // Calculate recording duration
        return this.recordedChunks.length; // seconds
    }

    // Picture-in-Picture
    async togglePictureInPicture() {
        const videoElement = document.getElementById('remote-video-element');
        if (!videoElement) return;
        
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoElement.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Picture-in-Picture error:', error);
        }
    }

    // Background blur (experimental)
    async enableBackgroundBlur() {
        // This would require a more complex implementation with TensorFlow.js
        // or a media processing library
        console.log('Background blur requested');
        
        // For now, just apply a CSS blur filter
        const video = document.getElementById('local-video-element');
        if (video) {
            video.style.filter += ' blur(10px)';
            video.style.transition = 'filter 0.3s ease';
        }
    }

    disableBackgroundBlur() {
        const video = document.getElementById('local-video-element');
        if (video) {
            video.style.filter = video.style.filter.replace('blur(10px)', '');
        }
    }
}

// Export singleton
const webrtcManager = new WebRTCManager();
export default webrtcManager;
