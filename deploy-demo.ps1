Write-Host "========================================="
Write-Host "   Wormhole Stream v3.0 - Deploy"
Write-Host "========================================="

# Step 1: Clean up old data
Write-Host ""
Write-Host "1. Cleaning old containers and stale data..."
docker stop wormhole-backend 2>$null
docker rm wormhole-backend 2>$null
docker stop wormhole-tunnel 2>$null
docker rm wormhole-tunnel 2>$null
docker volume rm wormhole-stream_wormhole-hls-data 2>$null
if (Test-Path "tunnel_log.txt") { Remove-Item "tunnel_log.txt" }
Write-Host "   Cleanup complete"

# Step 2: Build and Start NGINX-RTMP
Write-Host ""
Write-Host "2. Building and starting NGINX-RTMP server..."
docker-compose up -d --build --force-recreate

# Wait for NGINX to be healthy
Write-Host "   Waiting for NGINX to respond..."
$healthy = $false
$attempt = 1
while ($attempt -le 10) {
    Start-Sleep -Seconds 2
    $elapsed = $attempt * 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/stat" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $healthy = $true
            Write-Host "   NGINX is UP (after ${elapsed}s)"
            break
        }
    }
    catch {
        # NGINX not ready yet
    }
    Write-Host "   ... waiting (${elapsed}s)"
    $attempt++
}
if (-not $healthy) {
    Write-Host "   NGINX did not respond yet, continuing anyway..."
}

# Step 3: Start Cloudflare Quick Tunnel
Write-Host ""
Write-Host "3. Starting Cloudflare Quick Tunnel..."
$tunnelArgs = "/c docker run --rm --name wormhole-tunnel --add-host=host.docker.internal:host-gateway cloudflare/cloudflared:latest tunnel --url http://host.docker.internal:8080 2>&1"
$proc = Start-Process -FilePath "cmd" -ArgumentList $tunnelArgs -WindowStyle Hidden -RedirectStandardOutput "tunnel_log.txt" -PassThru

Write-Host "   Waiting for Cloudflare to assign a URL (up to 60s)..."
$tunnelUrl = $null
$attempt = 1
$regexPattern = 'https://[a-z0-9\-]+\.trycloudflare\.com'
while ($attempt -le 20) {
    Start-Sleep -Seconds 3
    $elapsed = $attempt * 3
    if (Test-Path "tunnel_log.txt") {
        $logContent = Get-Content "tunnel_log.txt" -Raw -ErrorAction SilentlyContinue
        if ($logContent) {
            $urlMatch = [regex]::Match($logContent, $regexPattern)
            if ($urlMatch.Success) {
                $tunnelUrl = $urlMatch.Value
                Write-Host "   Tunnel URL found after ${elapsed}s"
                break
            }
        }
    }
    Write-Host "   ... still waiting (${elapsed}s)"
    $attempt++
}

if ($tunnelUrl) {
    Write-Host ""
    Write-Host "   SUCCESS! Tunnel: $tunnelUrl"

    # Step 4: Build Frontend
    Write-Host ""
    Write-Host "4. Building frontend with new tunnel URL..."
    Set-Location -Path "wormhole-front"

    $env:VITE_TUNNEL_URL = $tunnelUrl
    npm run build

    # Step 5: Deploy to GitHub Pages
    Write-Host ""
    Write-Host "5. Deploying to GitHub Pages..."
    npx gh-pages -d dist
    Set-Location -Path ".."

    # Copy tunnel URL to clipboard
    $tunnelUrl | Set-Clipboard

    Write-Host ""
    Write-Host "========================================="
    Write-Host "  WORMHOLE IS LIVE!"
    Write-Host "========================================="
    Write-Host ""
    Write-Host "  Public App:   https://neymatoby.github.io/wormhole-stream/"
    Write-Host "  Login:        demo@bornebit.com / demo123"
    Write-Host ""
    Write-Host "  Tunnel URL:   $tunnelUrl (copied to clipboard)"
    Write-Host "  Stream HLS:   $tunnelUrl/hls/test.m3u8"
    Write-Host ""
    Write-Host "  OBS Settings:"
    Write-Host "    Server:     rtmp://localhost:1935/stream"
    Write-Host "    Stream Key: test"
    Write-Host ""
    Write-Host "-----------------------------------------"
    Write-Host "  Leave this window open while streaming."
    Write-Host "  Press Ctrl+C to stop."
    Write-Host "-----------------------------------------"

    # Keep running
    Wait-Process -Id $proc.Id
}
else {
    Write-Host ""
    Write-Host "ERROR: Could not get a URL from Cloudflare."
    Write-Host "Check tunnel_log.txt for details."
    Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
}
