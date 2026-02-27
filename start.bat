@echo off
echo ========================================
echo   Wormhole Stream - Quick Start
echo ========================================
echo.

:: Start Docker container
echo Starting Docker streaming server...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker!
    echo Make sure Docker Desktop is running.
    pause
    exit /b 1
)
echo Docker container is running!
echo.

:: Start frontend
echo Starting frontend...
cd wormhole-front
start cmd /k "npm run dev"

echo.
echo ========================================
echo   Wormhole Stream is Starting!
echo ========================================
echo.
echo Frontend will open at: http://localhost:5173/wormhole-stream/
echo.
echo Streaming settings:
echo   RTMP Server: rtmp://localhost:1935/stream
echo   Stream Key: test
echo   HLS URL: http://localhost:8080/hls/test.m3u8
echo.

:: Wait a moment then open browser
timeout /t 5 /nobreak >nul
start http://localhost:5173/wormhole-stream/

echo Press any key to exit this window...
pause >nul
