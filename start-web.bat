@echo off
setlocal

title DeltaPets Web Server

REM Move to the directory where this .bat lives
cd /d "%~dp0"

echo ==============================
echo  Starting DeltaPets Web Server
echo ==============================
echo.

REM Use npx to guarantee pnpm is found
npx pnpm -C frontend\web dev

echo.
echo ==============================
echo  Server stopped
echo ==============================
pause


//start-web.bat to run