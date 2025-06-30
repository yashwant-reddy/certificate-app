@echo off
cd /d %~dp0

REM Optional: Stop any previous dev servers
REM npm run stop

REM Log the dev server start
echo [%DATE% %TIME%] Starting npm run dev >> dev-server-log.txt

REM Clean the dev log to last 7 days
powershell -ExecutionPolicy Bypass -File "%~dp0clean-log.ps1" "%~dp0dev-server-log.txt"

REM Start dev server in a new window
start cmd /k "npm run dev"
echo [%DATE% %TIME%] npm run dev started >> dev-server-log.txt
exit /b
