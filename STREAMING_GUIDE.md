# Wormhole Stream v3.0 — Streaming Guide

## Quick Start

1. **Start the backend** (Docker required):
   ```
   deploy-demo.bat
   ```
   Or manually:
   ```powershell
   docker-compose up -d --build
   node start-tunnel.mjs
   ```

2. **Configure OBS** (one-time):
   - Server: `rtmp://localhost:1935/stream`
   - Stream Key: `test`
   - **Encoder Settings** (CRITICAL — must match exactly):
     - Video Encoder: x264
     - Rate Control: CBR
     - Bitrate: 1500 Kbps
     - Keyframe Interval: **1 second** ← MUST be 1s
     - CPU Preset: veryfast
     - Profile: baseline
     - Tune: zerolatency
     - Resolution: 1280x720

3. **Start streaming** in OBS — the player will auto-detect within 2-3 seconds.

4. **Share the link**:
   - Public: `https://neymatoby.github.io/wormhole-stream/`
   - Login: `demo@bornebit.com` / `demo123`

## How the Streaming Engine Works (v3.0)

```
OBS → RTMP → NGINX (1s HLS segments) → Cloudflare Tunnel → Player
```

### Player State Machine
```
DISCONNECTED → POLLING → CONNECTING → BUFFERING → LIVE → RECOVERING
                 ↑                                          ↓
                 └──────── (stream ends) ──────────────────┘
```

- **POLLING**: Lightweight fetch() to check if m3u8 exists (every 2s)
- **CONNECTING**: HLS.js initializing after m3u8 confirmed
- **BUFFERING**: First fragments loading
- **LIVE**: Playing live content
- **RECOVERING**: Temporary network issue, auto-recovering

### Why This Is Fast
- HLS.js is ONLY created after confirming the stream exists
- 1s fragments = 3s to first frame (3 fragment minimum for HLS)
- 500ms retry delay instead of 1-3s
- 5s manifest timeout instead of 15s
- No stale data — Docker tmpfs clears on every restart

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Stream never loads | OBS keyframe ≠ 1s | Set Keyframe Interval to exactly 1 second |
| Black video | Hardware encoder | Use x264 (software), NOT NVENC |
| 10+ second delay | Old config | Rebuild Docker: `docker-compose up -d --build` |
| Tunnel expired | Cloudflare temporary URL changed | Re-run `deploy-demo.bat` |
| Player keeps polling | OBS not streaming | Click "Start Streaming" in OBS |
