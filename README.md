# Custom Chromecast Receiver for Screen Mirroring

This is a simple custom Chromecast receiver application for WebRTC-based screen mirroring.

## Features

- ✅ WebRTC video streaming
- ✅ Full-screen video display
- ✅ Automatic connection handling
- ✅ Status indicators
- ✅ ICE candidate exchange
- ✅ Connection state monitoring

## Setup Instructions

### 1. Host the Receiver

The receiver needs to be hosted on a publicly accessible HTTPS server. You have several options:

#### Option A: GitHub Pages (Easiest)

1. Create a new GitHub repository
2. Upload `index.html` to the repository
3. Go to Settings → Pages
4. Enable GitHub Pages from the main branch
5. Your receiver will be available at `https://yourusername.github.io/reponame/index.html`

#### Option B: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in the receiver directory
cd receiver
firebase init hosting

# Deploy
firebase deploy
```

#### Option C: Any HTTPS Web Server

- Upload `index.html` to any web server with HTTPS
- Note: Chromecast **requires HTTPS** (HTTP will not work)

### 2. Register Your Custom Receiver

1. Go to the [Google Cast SDK Developer Console](https://cast.google.com/publish)
2. Sign in with your Google account
3. Click "Add New Application"
4. Select "Custom Receiver"
5. Enter your receiver details:
   - **Name**: Screen Mirror Receiver (or any name)
   - **Receiver Application URL**: Your hosted URL (must be HTTPS)
   - **Category**: Entertainment or Utility
6. Save and note down your **Application ID** (e.g., `A1B2C3D4`)

### 3. Update Your C# Application

Update the Application ID in your code:

**Option 1: Environment Variable (Recommended)**
```bash
set CHROMECAST_APP_ID=A1B2C3D4
```

**Option 2: Code (ApplicationOptions.cs)**
```csharp
public string ChromecastAppId { get; init; } = "A1B2C3D4"; // Your App ID
```

### 4. Test Your Receiver

1. Make sure your Chromecast is on the same network
2. Run your C# application
3. The receiver should load on your Chromecast and start streaming

## Customization

### Change Video Fit Mode

In `index.html`, modify the `#video` style:

```css
#video {
    object-fit: contain;  /* Options: contain, cover, fill, scale-down */
}
```

### Hide Status Indicator

To permanently hide the status, add:

```css
#status {
    display: none;
}
```

### Change Background Color

```css
body {
    background-color: #1a1a1a;  /* Any color you want */
}
```

### Add a Logo

Add this HTML before the `<video>` tag:

```html
<img id="logo" src="your-logo.png" alt="Logo">
```

And this CSS:

```css
#logo {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 100px;
    height: auto;
    z-index: 1000;
    opacity: 0.8;
}
```

## Protocol Details

The receiver implements the following message protocol:

### Receiver → Sender

- `receiver-ready` - Sent when receiver is ready to accept offers
- `webrtc-answer` - SDP answer in response to offer
- `ice-candidate` - ICE candidates for NAT traversal
- `ice-complete` - All ICE candidates have been sent

### Sender → Receiver

- `webrtc-offer` - SDP offer to initiate connection
- `ice-candidate` - ICE candidates from sender
- `ice-complete` - Sender's ICE gathering complete
- `stop-stream` - Request to stop streaming

## Troubleshooting

### Receiver doesn't load
- Verify the URL is HTTPS (not HTTP)
- Check that the Application ID is correct
- Try accessing the receiver URL in a browser to verify it loads

### Video doesn't appear
- Check browser console in Chrome Cast Developer Tools
- Verify the sender is using the same namespace: `urn:x-cast:com.chromecast.screenmirror`
- Check network connectivity between sender and receiver

### Connection fails
- Ensure STUN servers are reachable
- Check firewall settings
- Try adding TURN servers if behind strict NAT

### How to debug
1. Use Chrome Cast Debugger: `chrome://inspect/#devices`
2. Find your Chromecast device
3. Click "inspect" to open DevTools
4. View console logs and network activity

## Performance Tips

1. **Reduce Frame Rate**: Lower the `SCREEN_CAPTURE_FPS` environment variable (e.g., 24 or 30)
2. **Reduce Resolution**: Set `SCREEN_CAPTURE_REGION` to a smaller area
3. **Network**: Use wired Ethernet for Chromecast if possible

## File Size

The entire receiver is a single HTML file (~8KB) with no external dependencies except the Cast SDK, making it extremely lightweight and fast to load.

## Browser Compatibility

The receiver runs on the Chromecast's built-in Chrome browser, which supports:
- WebRTC
- ES6+ JavaScript
- Modern CSS3

No transpilation or polyfills needed.

