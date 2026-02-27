# Wormhole Stream - Complete Setup Guide

## Prerequisites (Install on each PC)

1. **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
2. **Node.js v18+** - [Download](https://nodejs.org/)
3. **OBS Studio** - [Download](https://obsproject.com/)
4. **ngrok** (for public streaming) - Install via: `winget install ngrok.ngrok`

---

## Installation (Copy Project)

### Option 1: Copy Folder
Copy the entire `wormhole-stream` folder to the other PC via USB or network share.

### Option 2: Clone from GitHub
```bash
git clone https://github.com/YOUR_USERNAME/wormhole-stream.git
```

---

## Quick Setup (Run Once)

1. **Double-click `setup.bat`** - This will:
   - Check prerequisites
   - Install dependencies
   - Configure environment
   - Start Docker container

---

## Daily Usage

**Double-click `start.bat`** to launch the app.

Or run manually:
```powershell
# Terminal 1: Start Docker
cd wormhole-stream
docker-compose up -d

# Terminal 2: Start Frontend
cd wormhole-front
npm run dev
```

Open: **http://localhost:5173/wormhole-stream/**

---

## OBS Settings (IMPORTANT - Must Match!)

### Output Settings (Settings → Output → Advanced)

| Setting | Value |
|---------|-------|
| **Output Mode** | `Advanced` |
| **Encoder** | `x264` |
| **Rate Control** | `CBR` |
| **Bitrate** | `2500 kbps` |
| **Keyframe Interval** | `2` |
| **Profile** | `baseline` |
| **Tune** | `zerolatency` |

### Video Settings (Settings → Video)

| Setting | Value |
|---------|-------|
| **Base Resolution** | `1280x720` |
| **Output Resolution** | `1280x720` |
| **FPS** | `30` |

### Stream Settings (Settings → Stream)

| Setting | Value |
|---------|-------|
| **Service** | `Custom...` |
| **Server** | `rtmp://localhost:1935/stream` |
| **Stream Key** | `test` |

---

## Watching the Stream

### Local (Same Network)
```
http://localhost:8080/hls/test.m3u8
```

### Public (Internet via ngrok)

1. Configure ngrok (one time):
   ```powershell
   ngrok config add-authtoken YOUR_TOKEN
   ```
   Get token from: https://dashboard.ngrok.com/get-started/your-authtoken

2. Start public tunnel:
   ```powershell
   ngrok http 8080
   ```

3. Share the URL with stakeholders:
   ```
   https://YOUR-NGROK-URL.ngrok-free.dev/hls/test.m3u8
   ```

---

## Ports Used

| Port | Purpose |
|------|---------|
| **1935** | RTMP (stream input) |
| **8080** | HLS (stream output) |
| **5173** | Web app |
| **4040** | ngrok dashboard |

---

## Troubleshooting

### Black screen, audio only?
- Check OBS encoder settings (must use x264, baseline profile)
- Set Keyframe Interval to 2 seconds
- Restart OBS and stream again

### Docker won't start?
```powershell
docker-compose down --remove-orphans
docker-compose up -d
```

### Stream not showing?
- Wait 5-10 seconds after starting OBS
- Check: `http://localhost:8080/stat` for stream status

---

## Environment Variables

The `.env` file in `wormhole-front` contains:
```
VITE_SUPABASE_URL=https://aaahvngxtmhfogcdecte.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

All PCs use the same Supabase database.
