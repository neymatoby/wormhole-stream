# Wormhole Stream - Docker Setup Guide

## Quick Start

### 1. Start the streaming server
```bash
cd "C:\Users\neyma\Desktop\toby wrk\.gemini\antigravity\scratch\wormhole-stream"
docker-compose up -d
```

### 2. Verify the container is running
```bash
docker ps
```
You should see `wormhole-backend` running.

### 3. Start the frontend
```bash
cd wormhole-front
npm run dev
```

---

## Streaming Setup

### Stream to Wormhole (using OBS, drone software, etc.)

| Setting | Value |
|---------|-------|
| **RTMP Server** | `rtmp://localhost:1935/stream` |
| **Stream Key** | `test` (or any name you want) |

### View the Stream

- **HLS URL (Local):** `http://localhost:8080/hls/test.m3u8`
- **HLS URL (with ngrok):** `https://YOUR_NGROK_URL/hls/test.m3u8`

---

## Expose to Internet (ngrok)

If you want to share your stream publicly:

```bash
ngrok http 8080
```

Then use the ngrok HTTPS URL in your frontend's "Server" field.

---

## Docker Commands

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start the streaming server |
| `docker-compose down` | Stop the streaming server |
| `docker-compose logs -f` | View live logs |
| `docker-compose restart` | Restart the server |

---

## Ports

| Port | Purpose |
|------|---------|
| **1935** | RTMP input (stream your video here) |
| **8080** | HTTP/HLS output (watch stream here) |

---

## Troubleshooting

### Stream not showing?
1. Check if container is running: `docker ps`
2. Check logs: `docker-compose logs -f`
3. Verify you're streaming to `rtmp://localhost:1935/stream/YOUR_KEY`
4. Wait 5-10 seconds after starting stream for HLS segments to generate

### CORS issues?
The nginx_custom.conf includes CORS headers. Make sure docker-compose is using it as a volume mount.
