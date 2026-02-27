@echo off
echo ========================================
echo   Wormhole Stream - Auto Setup Script
echo ========================================
echo.

:: Check if Docker is running
echo [1/5] Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo Docker is running!
echo.

:: Check if Node.js is installed
echo [2/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found!
echo.

:: Setup environment file
echo [3/5] Setting up environment...
cd wormhole-front
if not exist .env (
    copy .env.example .env
    echo Created .env file from template.
    echo.
    echo IMPORTANT: Edit wormhole-front\.env and add your Supabase credentials!
    echo.
) else (
    echo .env file already exists.
)
echo.

:: Install npm dependencies
echo [4/5] Installing dependencies (this may take a few minutes)...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo Dependencies installed!
echo.

:: Go back to root and start Docker
cd ..
echo [5/5] Starting Docker streaming server...
docker-compose down --remove-orphans >nul 2>&1
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker container!
    pause
    exit /b 1
)
echo Docker container started!
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo To start the app, run:
echo   cd wormhole-front
echo   npm run dev
echo.
echo Then open: http://localhost:5173/wormhole-stream/
echo.
echo Streaming settings:
echo   RTMP Server: rtmp://localhost:1935/stream
echo   Stream Key: test
echo.
pause
