Write-Host "========================================="
Write-Host "   Wormhole Stream - Demo Deployer"
Write-Host "========================================="

Write-Host "`n1. Starting NGINX-RTMP Media Server..."
docker-compose up -d

Write-Host "`n2. Cleaning up old tunnels..."
docker stop wormhole-tunnel 2>$null
docker rm wormhole-tunnel 2>$null
if (Test-Path "tunnel_log.txt") { Remove-Item "tunnel_log.txt" }

Write-Host "`n3. Starting New Cloudflare Quick Tunnel..."
# Start the tunnel in the background and pipe output to a file
$proc = Start-Process -FilePath "cmd" -ArgumentList "/c docker run --rm --name wormhole-tunnel --add-host=host.docker.internal:host-gateway cloudflare/cloudflared:latest tunnel --url http://host.docker.internal:8080 2>&1" -WindowStyle Hidden -RedirectStandardOutput "tunnel_log.txt" -PassThru

Write-Host "   Waiting 15 seconds for Cloudflare to assign a URL..."
Start-Sleep -Seconds 15

# Read the log file to extract the URL
$logContent = Get-Content "tunnel_log.txt" -Raw
$urlMatch = [regex]::Match($logContent, 'https://[a-z0-9-]+\.trycloudflare\.com')

if ($urlMatch.Success) {
    $tunnelUrl = $urlMatch.Value
    Write-Host "`n   ✅ SUCCESS! New Tunnel URL: $tunnelUrl"
    
    Write-Host "`n4. Injecting new URL into Frontend code..."
    $appJsxPath = "wormhole-front\src\App.jsx"
    $appJsxContent = Get-Content $appJsxPath -Raw
    $appJsxContent = $appJsxContent -replace "const MEDIA_SERVER = 'https://.*trycloudflare\.com';", "const MEDIA_SERVER = '$tunnelUrl';"
    Set-Content -Path $appJsxPath -Value $appJsxContent
    
    Write-Host "`n5. Building and Deploying Frontend to GitHub Pages (This takes 1 minute)..."
    Set-Location -Path "wormhole-front"
    $env:DEPLOY_TARGET = "ghpages"
    npm run build
    npx gh-pages -d dist
    Set-Location -Path ".."
    
    Write-Host "`n========================================="
    Write-Host "🎉 DEMO IS LIVE AND READY! 🎉"
    Write-Host "========================================="
    Write-Host "1. Share this link: https://neymatoby.github.io/wormhole-stream/"
    Write-Host "2. Login details:   demo@bornebit.com / demo123"
    Write-Host "3. Start OBS stream to: rtmp://localhost:1935/stream (Key: test)"
    Write-Host "-----------------------------------------"
    Write-Host "Leave this blue window open while streaming."
    Write-Host "To stop the tunnel, just close this window."
    
    # Keep the script running so the user knows the tunnel is active
    Wait-Process -Id $proc.Id
} else {
    Write-Host "`n❌ ERROR: Could not get a URL from Cloudflare. Check tunnel_log.txt."
    Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
}
