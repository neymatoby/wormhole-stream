@echo off
echo =========================================
echo    Wormhole Stream v3.0 - Deploy
echo =========================================
echo.
echo Launching deploy script...
powershell -ExecutionPolicy Bypass -File "%~dp0deploy-demo.ps1"
pause
