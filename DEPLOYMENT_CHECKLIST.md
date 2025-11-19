# Receiver Deployment Checklist

## Issue: Timeout During WebRTC Connection

Your logs show the receiver loads but doesn't communicate with the sender. Follow these steps:

### 1. ✅ Update Receiver Code

I've just updated `receiver/index.html` with:
- ✅ Better logging (with emoji markers for easier debugging)
- ✅ 500ms delay before sending "receiver-ready" (gives sender time to attach listeners)
- ✅ Enhanced error handling
- ✅ Timestamps on status messages

### 2. 🔄 Deploy Updated Receiver

**You MUST redeploy the updated `index.html` to GitHub Pages:**

```bash
# Option A: Via GitHub Web UI
# 1. Go to your repo: https://github.com/kkartavenka/chromecast-screen-receiver-two
# 2. Click on index.html
# 3. Click the pencil icon to edit
# 4. Copy the updated content from your local receiver/index.html
# 5. Commit changes

# Option B: Via Git Command Line
cd /path/to/chromecast-screen-receiver-two
git add index.html
git commit -m "Update receiver with enhanced debugging and timing fix"
git push origin main
```

### 3. ⏱️ Wait for Deployment

GitHub Pages takes **1-5 minutes** to update after you push. You can check:
- Visit your receiver URL directly in a browser
- Look for the updated console logs with emoji markers (🚀, ✅, 📤, 📥)

### 4. 🧪 Test with Chrome Cast Debugger

Before running your C# app again, set up debugging:

1. Open Chrome browser
2. Navigate to: `chrome://inspect/#devices`
3. Make sure "Discover network targets" is checked
4. You should see your Chromecast device listed
5. Click "inspect" next to your Chromecast

This opens Chrome DevTools connected to your Chromecast!

### 5. 🎯 Run Your C# App and Monitor

Run your application:

```bash
dotnet run --project src/ScreenCaster.App/ScreenCaster.App.csproj
```

**Watch the Chromecast DevTools Console** for these logs:

✅ **Expected Success Log Sequence:**
```
🚀 Starting Cast Receiver...
🚀 Namespace: urn:x-cast:com.chromecast.screenmirror
✅ Cast Receiver initialized and ready
✅ Listening on namespace: urn:x-cast:com.chromecast.screenmirror
Sender connected: <sender-id>
📤 Sending message to sender: receiver-ready <sender-id>
✅ Message sent successfully
📥 Received custom message from: <sender-id>
📥 Processing event: webrtc-offer
✅ Handling WebRTC offer
📤 Sending message to sender: webrtc-answer <sender-id>
```

❌ **If You See Problems:**

**Problem 1: No "Sender connected" message**
- The Cast framework isn't connecting
- Verify App ID `1A520C0D` is correct in Cast Console
- Wait 15+ minutes after registering app ID (Cast CDN propagation)

**Problem 2: "Sender connected" but no "📤 Sending message"**
- JavaScript error preventing message sending
- Check for errors in DevTools console
- Verify sender ID is being captured

**Problem 3: "📤 Sending message" but sender never receives it**
- Namespace mismatch
- Check sender is listening on: `urn:x-cast:com.chromecast.screenmirror`
- Check C# app logs for "📨 Received signal from receiver: receiver-ready"

### 6. 🔍 Verify Namespace in Cast Console

Double-check your Cast Console registration:

1. Go to: https://cast.google.com/publish
2. Find your app with ID `1A520C0D`
3. Make sure:
   - Receiver URL is: `https://kkartavenka.github.io/chromecast-screen-receiver-two/index.html`
   - URL is **HTTPS** (not HTTP)
   - No extra spaces or typos

### 7. 🆕 Clear Chromecast Cache (If Needed)

If the old receiver is cached:

1. Unplug Chromecast
2. Wait 30 seconds
3. Plug back in
4. Wait for it to boot up completely
5. Try again

### 8. 📊 Compare Logs

**Your C# App Logs Should Show:**

```
✅ GOOD:
00:16:28 info: Custom receiver ready (transport 46b67827...)
00:16:28 info: 📨 Received signal from receiver: receiver-ready    <-- THIS LINE IS KEY
00:16:28 info: Receiver acknowledged custom app. Creating WebRTC offer...
00:16:28 dbug: Discovered ICE candidate...
00:16:30 info: Screen mirroring active. Press Ctrl+C to stop.
```

```
❌ BAD (your current logs):
00:16:28 info: Custom receiver ready (transport 46b67827...)
[NO "📨 Received signal" line]
00:16:39 fail: Timed out while waiting for WebRTC connection...
```

### 9. 🎬 Visual Confirmation

On your TV screen, you should see the status indicator change:

1. "Initializing..." → when receiver loads
2. "Ready - Waiting for sender..." → after Cast SDK starts
3. "Sender connected, sending ready signal..." → after 500ms delay
4. "Received offer, creating answer..." → when WebRTC negotiation starts
5. "Connected - Streaming" → when video starts
6. Status indicator auto-hides after 5 seconds

### Common Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Timed out" after 10 seconds | Receiver not sending "receiver-ready" | Redeploy updated index.html |
| Receiver shows old code | GitHub Pages cache | Wait 5 min, hard refresh receiver URL |
| App ID not found | Wrong ID or not published | Verify `1A520C0D` in Cast Console |
| Connection fails immediately | Network/firewall | Check both devices on same network |

### Quick Test

To verify the updated receiver is live:

1. Open in browser: `https://kkartavenka.github.io/chromecast-screen-receiver-two/index.html`
2. Open browser console (F12)
3. You should see logs with emoji markers like 🚀 and ✅
4. If you see plain "Cast Receiver initialized" without emojis, the old version is cached

### Still Not Working?

If it still times out after deploying:

1. **Verify deployment:**
   ```bash
   curl https://kkartavenka.github.io/chromecast-screen-receiver-two/index.html | grep "🚀"
   ```
   Should return lines with emoji. If not, old version is still deployed.

2. **Check Cast Console settings:**
   - Might need to republish or wait for CDN
   - Try changing receiver URL temporarily to force refresh

3. **Try the test.html page:**
   ```bash
   # Deploy test.html too
   # Visit: https://kkartavenka.github.io/chromecast-screen-receiver-two/test.html
   ```
   This validates the receiver locally before testing on Chromecast.

Good luck! The timing fix should resolve the issue. 🎉

