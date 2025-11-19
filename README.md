# Custom ChromeCast Receiver

This is a custom ChromeCast receiver application for screen mirroring.

## Setup Instructions

### Step 1: Host the Receiver

You need to host `index.html` on an **HTTPS** server. Options:

#### Option A: GitHub Pages (Recommended - Free)

1. Create a new GitHub repository (e.g., `chromecast-receiver`)
2. Upload `index.html` to the repository
3. Go to Settings > Pages
4. Enable GitHub Pages from main branch
5. Your receiver URL will be: `https://yourusername.github.io/chromecast-receiver/index.html`

#### Option B: Firebase Hosting (Free)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Copy index.html to public folder
firebase deploy
```

#### Option C: ngrok (For Testing - Temporary)

```bash
# Install ngrok from https://ngrok.com
cd receiver
python3 -m http.server 8000
# In another terminal:
ngrok http 8000
# Use the HTTPS URL provided by ngrok
```

#### Option D: Local Testing (Chrome only)

```bash
cd receiver
python3 -m http.server 8000
# Open http://localhost:8000 in Chrome
# Note: This won't work with actual ChromeCast, only for debugging
```

### Step 2: Register the Receiver with Google

1. Go to [Google Cast SDK Developer Console](https://cast.google.com/publish)
2. Sign in with your Google account
3. Click "Add New Application"
4. Select "Custom Receiver"
5. Fill in the form:
   - **Name**: Screen Mirroring Receiver (or your choice)
   - **Receiver Application URL**: Your HTTPS URL from Step 1
   - **Guest Mode**: Optional (allows casting without WiFi)
6. Click "Save"
7. **Copy the Application ID** (e.g., `ABCD1234`)

### Step 3: Update the C# Application

Open `ChromeCastApp/Services/WebRTCStreamingService.cs` and update the `DefaultReceiverAppId`
constant (or set the `CHROMECAST_RECEIVER_APP_ID` environment variable) so it matches the App ID
from Step 2.

### Step 4: Install FFmpeg libraries for the desktop sender

The WebRTC sender uses SIPSorcery's FFmpeg bindings. Make sure the native FFmpeg libraries are installed
and discoverable:

1. Install ffmpeg (`brew install ffmpeg` on macOS, `sudo apt install ffmpeg` on Linux, or download the
   Windows builds from https://www.gyan.dev/ffmpeg/builds/).
2. If the dylibs/so files live outside a standard location, point the sender to the folder that contains
   `libavcodec`, `libavformat`, `libavutil`, `libswscale`, and `libswresample` by setting
   `FFMPEG_LIBRARY_PATH=/path/to/ffmpeg/lib`.

### Step 5: Host the receiver over HTTPS (required)

The CAF runtime will refuse to load required libraries when the page is opened via `file://`.
Always host the receiver on an HTTPS origin (GitHub Pages, Firebase Hosting, ngrok, etc.) and use
the Cast SDK Developer Console to load it on your Chromecast. The desktop browser should only be
used for remote inspection via `chrome://inspect`, not for directly running the receiver.

#### Previewing in a regular browser

- If you open `index.html` directly (for example, from GitHub Pages without using the Cast
  Developer Console’s `__castAppId__` parameter) the app now stays in **preview mode**. This avoids the repeated
  `ws://localhost:8008` WebSocket errors emitted by the Cast SDK when no Cast transport is available.
- To exercise the full WebRTC flow, either:
  - Launch the receiver through the Cast Developer Console so Chrome adds the `__castAppId__` query parameter and proxies traffic via the Cast extension, or
  - Deploy the receiver to a Cast device that was registered with your custom App ID.
- In preview mode you will still see the UI overlay, but the CAF runtime and custom namespace stay inactive—this is expected and confirms that the page is only being used for visual inspection.

### Step 4: Test

1. Make sure your ChromeCast is on the same network
2. Run your C# application
3. Select your ChromeCast device
4. Choose "Cast your screen"
5. The custom receiver should load on your ChromeCast
6. Your screen should appear!

## Receiver Features

- **Live streaming support**: Designed specifically for continuous streams
- **Multiple format support**: WebM, MPEG-TS, HLS
- **Visual feedback**: Shows connection status and buffering indicators
- **Error handling**: Displays meaningful error messages
- **Auto-reconnect**: Handles temporary disconnections gracefully
- **Low latency**: Optimized for real-time streaming

## Debugging

### Check Receiver Logs

1. Open Chrome browser
2. Go to `chrome://inspect/#devices`
3. Find your ChromeCast device
4. Click "inspect"
5. View console logs from the receiver

### Common Issues

**"Receiver not found"**
- Make sure you registered the receiver in Google Cast Console
- Wait 15-30 minutes after registration for it to propagate
- Verify the App ID is correct in your C# code

**"Failed to load receiver"**
- Ensure receiver URL is HTTPS (not HTTP)
- Check that index.html is accessible at the URL
- Verify CORS headers if using custom hosting

**"Video not playing"**
- Check Chrome inspect console for video errors
- Verify stream URL is accessible from ChromeCast's network
- Test the stream URL in VLC to ensure it's valid

**"Connection timeout"**
- Ensure ChromeCast and computer are on same network
- Check firewall isn't blocking the HTTP server port
- Verify the local IP address is correct

## Advanced Configuration

### Custom Styling

Edit the CSS in `index.html` to customize:
- Background color
- Status overlay appearance
- Video scaling/positioning
- Error message styling

### Additional Features

You can extend the receiver to add:
- Playback controls
- Volume adjustment
- Stream quality selection
- Recording functionality
- Overlays (clock, widgets, etc.)

### Performance Tuning

Adjust in `index.html`:
- `autoResumeDuration`: How long to wait before resuming (seconds)
- `maxInactivity`: Maximum idle time before closing (seconds)
- Video element attributes: `preload`, `crossorigin`, etc.

## Files

- `index.html` - The custom receiver application
- `README.md` - This file

## Support

For Google Cast SDK documentation:
- [Cast SDK Developer Guide](https://developers.google.com/cast/docs/web_receiver)
- [CAF Receiver API Reference](https://developers.google.com/cast/docs/reference/web_receiver)
- [Debugging Guide](https://developers.google.com/cast/docs/debugging)

## Security Notes

- The receiver runs in a sandboxed environment on ChromeCast
- All communication is encrypted
- Only devices on the same network can cast
- The receiver URL must be HTTPS in production

## License

This receiver is provided as-is for use with your screen mirroring application.

