const SIGNAL_NAMESPACE = 'urn:x-cast:com.chromecast.screenmirror';
const MESSAGE_TYPE = 'SCREEN_MIRROR_SIGNAL';
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const videoElement = document.getElementById('videoPlayer');
const statusOverlay = document.getElementById('statusOverlay');
const statusMessage = document.getElementById('statusMessage');
const errorOverlay = document.getElementById('errorOverlay');
const errorMessage = document.getElementById('errorMessage');

videoElement.autoplay = true;
videoElement.playsInline = true;
videoElement.muted = true;

let hideStatusTimeout = null;
let peerConnection = null;
let activeSenderId = null;
let castContext = null;
let castPlayerManager = null;
const runningFromFile = window.location.protocol === 'file:';

function showStatus(message) {
    console.log('[Status]', message);
    statusMessage.textContent = message;
    statusOverlay.classList.add('show');

    if (hideStatusTimeout) {
        clearTimeout(hideStatusTimeout);
    }
    hideStatusTimeout = setTimeout(() => statusOverlay.classList.remove('show'), 3000);
}

function showError(message) {
    console.error('[Error]', message);
    errorMessage.textContent = message;
    errorOverlay.classList.add('show');
    statusOverlay.classList.remove('show');
}

function hideError() {
    errorOverlay.classList.remove('show');
}

function getConnectedSenderIds() {
    if (!castContext || typeof castContext.getSenders !== 'function') {
        return [];
    }

    try {
        const senders = castContext.getSenders() || [];
        return senders
            .map(sender => sender.id)
            .filter(Boolean);
    } catch (err) {
        console.warn('[System] Failed to enumerate connected senders.', err);
        return [];
    }
}

function sendSignal(event, payload, explicitSenderId) {
    if (!castContext) {
        return;
    }

    const targets = [];

    if (explicitSenderId) {
        targets.push(explicitSenderId);
    } else if (activeSenderId) {
        targets.push(activeSenderId);
    } else {
        targets.push(...getConnectedSenderIds());
    }

    if (!targets.length) {
        console.debug('[Signal] No connected senders to deliver event', event);
        return;
    }

    targets.forEach(senderId => {
        castContext.sendCustomMessage(SIGNAL_NAMESPACE, senderId, {
            type: MESSAGE_TYPE,
            event,
            payload
        });
    });
}

function notifySenderReady(targetSenderId) {
    const targets = targetSenderId ? [targetSenderId] : getConnectedSenderIds();
    if (!targets.length) {
        return;
    }

    targets.forEach(senderId => {
        activeSenderId = senderId;
        sendSignal('receiver-ready', undefined, senderId);
    });

    showStatus('Sender connected. Waiting for offer...');
}

function teardown(reason) {
    if (peerConnection) {
        peerConnection.ontrack = null;
        peerConnection.onicecandidate = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close();
        peerConnection = null;
    }

    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }

    if (reason) {
        showStatus(reason);
    }
}

function createPeerConnection() {
    if (peerConnection) {
        return peerConnection;
    }

    peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Remote track added.');
        hideError();
        showStatus('Streaming...');
        if (!videoElement.srcObject) {
            videoElement.srcObject = event.streams[0];
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal('ice-candidate', event.candidate);
        } else {
            sendSignal('ice-complete');
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state', peerConnection.connectionState);
        switch (peerConnection.connectionState) {
            case 'connected':
                showStatus('Screen mirroring active');
                break;
            case 'failed':
            case 'disconnected':
                showError('Connection lost');
                teardown('Waiting for offer...');
                break;
        }
    };

    return peerConnection;
}

async function handleOffer(payload) {
    try {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal('webrtc-answer', { type: answer.type, sdp: answer.sdp });
        showStatus('Negotiating WebRTC...');
    } catch (err) {
        console.error('[WebRTC] Failed to handle offer', err);
        showError('Failed to process offer: ' + err.message);
    }
}

async function handleRemoteCandidate(payload) {
    try {
        if (!peerConnection) {
            createPeerConnection();
        }
        await peerConnection.addIceCandidate(payload);
    } catch (err) {
        console.warn('[WebRTC] Failed to add ICE candidate', err);
    }
}

function registerCastListeners() {
    if (!castContext) {
        return;
    }

    castContext.addCustomMessageListener(SIGNAL_NAMESPACE, async (event) => {
        activeSenderId = event.senderId;
        const data = event.data || {};
        if (data.type !== MESSAGE_TYPE) {
            return;
        }

        switch (data.event) {
            case 'webrtc-offer':
                showStatus('Offer received, creating answer...');
                await handleOffer(data.payload);
                break;
            case 'ice-candidate':
                await handleRemoteCandidate(data.payload);
                break;
            case 'ice-complete':
                console.log('[WebRTC] ICE gathering completed by sender');
                break;
            case 'stop-stream':
                teardown('Sender stopped streaming');
                break;
        }
    });

    castContext.addEventListener(cast.framework.system.EventType.SENDER_CONNECTED, (event) => {
        console.log('[System] Sender connected', event.senderId);
        notifySenderReady(event.senderId);
    });

    castContext.addEventListener(cast.framework.system.EventType.SENDER_DISCONNECTED, () => {
        console.log('[System] Sender disconnected');
        activeSenderId = null;
        teardown('Sender disconnected');
        notifySenderReady();
    });
}

function startReceiver() {
    if (!window.cast || !cast.framework) {
        console.error('[Receiver] Cast framework is not available yet.');
        return;
    }

    castContext = cast.framework.CastReceiverContext.getInstance();
    castPlayerManager = castContext.getPlayerManager();

    const options = new cast.framework.CastReceiverOptions();
    options.disableIdleTimeout = true;
    options.maxInactivity = 3600;
    options.customNamespaces = {
        [SIGNAL_NAMESPACE]: cast.framework.system.MessageType.JSON
    };

    castPlayerManager.setMessageInterceptor(cast.framework.messages.MessageType.LOAD, request => {
        showStatus('Use the desktop sender to start WebRTC streaming.');
        return null;
    });

    castContext.start(options);
    registerCastListeners();
    notifySenderReady();
    console.log('[Receiver] Started CAF context');
    showStatus('Waiting for sender...');
}

if (runningFromFile) {
    showError('Receiver must be hosted via HTTPS or loaded on a Cast device.');
} else if (window.cast && cast.framework) {
    startReceiver();
} else {
    window.__onGCastApiAvailable = function(isAvailable) {
        if (isAvailable) {
            startReceiver();
        } else {
            showError('Cast API failed to load.');
        }
    };
}

