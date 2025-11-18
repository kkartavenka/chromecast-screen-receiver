// Chromecast Custom Receiver for WebRTC Screen Streaming
// This receiver establishes a WebRTC connection to receive low-latency screen stream

const DEBUG = true;

let peerConnection = null;
let signalingServerUrl = null;
let pollingInterval = null;
let context = null;

// DOM Elements
const videoElement = document.getElementById('remote-video');
const statusElement = document.getElementById('status');
const statusTextElement = document.getElementById('status-text');
const debugInfoElement = document.getElementById('debug-info');
const loadingElement = document.getElementById('loading');

// Initialize Cast Receiver
function initializeCastReceiver() {
    log('Initializing Cast Receiver...');
    
    // Check if running on Chromecast
    if (typeof cast !== 'undefined' && cast.framework) {
        log('Running on Chromecast device');
        
        context = cast.framework.CastReceiverContext.getInstance();
        
        // Set up custom message namespace
        const CUSTOM_CHANNEL = 'urn:x-cast:com.screencast.webrtc';
        
        context.addCustomMessageListener(CUSTOM_CHANNEL, (customEvent) => {
            log('Received custom message:', customEvent);
            handleCustomMessage(customEvent.data);
        });
        
        // Start the receiver
        const options = new cast.framework.CastReceiverOptions();
        options.disableIdleTimeout = true;
        
        context.start(options);
        
        log('Cast Receiver started');
        updateStatus('Cast receiver ready', false);
    } else {
        log('Not running on Chromecast - using standalone mode');
        // For testing in browser, get signaling server URL from query params
        const urlParams = new URLSearchParams(window.location.search);
        signalingServerUrl = urlParams.get('signaling') || 'http://localhost:8888';
        initializeWebRTC();
    }
    
    loadingElement.style.display = 'none';
}

// Handle custom messages from sender
function handleCustomMessage(data) {
    try {
        const message = typeof data === 'string' ? JSON.parse(data) : data;
        log('Handling message:', message);
        
        if (message.type === 'init' && message.signalingUrl) {
            signalingServerUrl = message.signalingUrl;
            updateStatus('Connecting to signaling server...', false);
            initializeWebRTC();
        } else if (message.type === 'offer' && message.sdp) {
            handleOffer(message.sdp);
        } else if (message.type === 'candidate' && message.candidate) {
            handleIceCandidate(message.candidate);
        }
    } catch (error) {
        log('Error handling custom message:', error);
    }
}

// Initialize WebRTC
async function initializeWebRTC() {
    log('Initializing WebRTC...');
    
    try {
        // Create peer connection with STUN servers
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        peerConnection = new RTCPeerConnection(configuration);
        
        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
            log('Received remote track:', event.track.kind);
            if (event.track.kind === 'video') {
                videoElement.srcObject = event.streams[0];
                updateStatus('Connected - Streaming', true);
                log('Video stream connected');
            }
        };
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                log('ICE Candidate:', event.candidate);
                sendSignalingMessage({
                    type: 'candidate',
                    candidate: {
                        candidate: event.candidate.candidate,
                        sdpMid: event.candidate.sdpMid,
                        sdpMLineIndex: event.candidate.sdpMLineIndex
                    }
                });
            }
        };
        
        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            log('Connection state:', peerConnection.connectionState);
            updateDebugInfo();
            
            switch (peerConnection.connectionState) {
                case 'connected':
                    updateStatus('Connected - Streaming', true);
                    break;
                case 'disconnected':
                    updateStatus('Disconnected', false);
                    break;
                case 'failed':
                    updateStatus('Connection failed', false, true);
                    break;
                case 'closed':
                    updateStatus('Connection closed', false);
                    break;
            }
        };
        
        peerConnection.oniceconnectionstatechange = () => {
            log('ICE Connection state:', peerConnection.iceConnectionState);
            updateDebugInfo();
        };
        
        log('WebRTC peer connection created');
        updateStatus('WebRTC ready - Waiting for offer', false);
        
        // Start polling for signaling messages
        startPolling();
        
    } catch (error) {
        log('Error initializing WebRTC:', error);
        updateStatus('WebRTC initialization failed', false, true);
    }
}

// Handle incoming offer
async function handleOffer(sdp) {
    log('Handling offer...');
    
    try {
        await peerConnection.setRemoteDescription({
            type: 'offer',
            sdp: sdp
        });
        
        log('Remote description set');
        
        // Create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        log('Answer created');
        
        // Send answer back
        sendSignalingMessage({
            type: 'answer',
            sdp: answer.sdp
        });
        
        updateStatus('Negotiating connection...', false);
        
    } catch (error) {
        log('Error handling offer:', error);
        updateStatus('Failed to process offer', false, true);
    }
}

// Handle ICE candidates
async function handleIceCandidate(candidate) {
    log('Adding ICE candidate...');
    
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate({
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }));
        log('ICE candidate added');
    } catch (error) {
        log('Error adding ICE candidate:', error);
    }
}

// Send signaling message
function sendSignalingMessage(message) {
    if (!signalingServerUrl) {
        log('No signaling server URL configured');
        return;
    }
    
    log('Sending signaling message:', message);
    
    fetch(`${signalingServerUrl}/signal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
    })
    .then(response => response.json())
    .then(data => log('Signaling response:', data))
    .catch(error => log('Error sending signaling message:', error));
}

// Poll for messages from signaling server
function startPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    pollingInterval = setInterval(async () => {
        if (!signalingServerUrl) return;
        
        try {
            const response = await fetch(`${signalingServerUrl}/poll`);
            const messages = await response.json();
            
            if (Array.isArray(messages) && messages.length > 0) {
                for (const messageJson of messages) {
                    const message = JSON.parse(messageJson);
                    log('Polled message:', message);
                    
                    if (message.type === 'offer') {
                        await handleOffer(message.sdp);
                    } else if (message.type === 'candidate') {
                        await handleIceCandidate(message.candidate);
                    }
                }
            }
        } catch (error) {
            // Ignore polling errors (server might not be ready)
        }
    }, 1000);
}

// Update status display
function updateStatus(text, isConnected, isError = false) {
    statusTextElement.textContent = text;
    statusElement.classList.remove('connected', 'error');
    
    if (isConnected) {
        statusElement.classList.add('connected');
    } else if (isError) {
        statusElement.classList.add('error');
    }
    
    log('Status:', text);
}

// Update debug info
function updateDebugInfo() {
    if (!DEBUG || !peerConnection) return;
    
    const info = {
        connectionState: peerConnection.connectionState,
        iceConnectionState: peerConnection.iceConnectionState,
        iceGatheringState: peerConnection.iceGatheringState,
        signalingState: peerConnection.signalingState
    };
    
    debugInfoElement.textContent = JSON.stringify(info, null, 2);
    debugInfoElement.style.display = 'block';
}

// Logging
function log(...args) {
    if (DEBUG) {
        console.log('[Receiver]', ...args);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCastReceiver);
} else {
    initializeCastReceiver();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    if (peerConnection) {
        peerConnection.close();
    }
});

