@echo off
color 0B
echo.
echo    Wormhole Stream - Automated Demo Setup
echo    --------------------------------------
echo.
echo    This script will:
echo    1. Start your local NGINX Server
echo    2. Generate a fresh Cloudflare public link
echo    3. Build the frontend with the new link
echo    4. Deploy it live to GitHub Pages
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0deploy-demo.ps1"

echo.
pause
