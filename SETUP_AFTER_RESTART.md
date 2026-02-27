# Wormhole Stream - Setup Instructions (After Restart)

## Step 1: Fix PowerShell (Run Once as Administrator)
Open PowerShell **as Administrator** and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Type `Y` to confirm.

---

## Step 2: Start Docker Container
Open **cmd** or **PowerShell**:
```cmd
cmd
cd /d "C:\Users\neyma\Desktop\toby wrk\.gemini\antigravity\scratch\wormhole-stream"
docker-compose up -d
```

You should see **"wormhole-backend"** container in Docker Desktop.

---

## Step 3: Start the Frontend
```cmd
cd wormhole-front
npm run dev
```

Open browser to: **http://localhost:5173**

---

## Streaming Setup (OBS / Drone Software)

| Setting | Value |
|---------|-------|
| **RTMP Server** | `rtmp://localhost:1935/stream` |
| **Stream Key** | `test` |
| **HLS Playback URL** | `http://localhost:8080/hls/test.m3u8` |

---

## Changes Made
- ✅ Night map globe background added
- ✅ Docker config with volume mounts
- ✅ Custom nginx config with CORS support

---

## If Docker Fails to Pull Image
1. Check internet connection: `ping google.com`
2. Restart Docker Desktop
3. Try again: `docker-compose up -d`
