@echo off
cd /d %~dp0

REM Detect if already launched in a new window
if "%1" neq "run" (
    start "Git Pull Task" cmd /k "%~f0 run"
    exit /b
)

set BRANCH=local-storage
set MAX_RETRIES=3
set /a COUNT=0

echo.
echo =====================================
echo [INFO] Starting Git pull on %BRANCH%
echo =====================================
echo.

:RETRY
git checkout %BRANCH%
git pull -s recursive -X ours origin %BRANCH%
IF %ERRORLEVEL% EQU 0 (
    echo [%DATE% %TIME%] Pull SUCCESS >> git-pull-log.txt
    echo [SUCCESS] Git pull succeeded.
    goto CLEAN_LOG
) ELSE (
    set /a COUNT+=1
    echo [%DATE% %TIME%] Pull FAILED, attempt %COUNT% >> git-pull-log.txt
    echo [ERROR] Git pull failed. Attempt %COUNT% of %MAX_RETRIES%
    IF %COUNT% GEQ %MAX_RETRIES% (
        echo [%DATE% %TIME%] Pull failed %MAX_RETRIES% times, giving up. >> git-pull-log.txt
        echo [FAILED] Git pull failed %MAX_RETRIES% times. Aborting.
        goto CLEAN_LOG
    ) ELSE (
        echo [INFO] Retrying in 10 seconds...
        timeout /t 10 >nul
        goto RETRY
    )
)

:CLEAN_LOG
echo [INFO] Cleaning up old log entries...
powershell -ExecutionPolicy Bypass -File "%~dp0clean-log.ps1" "%~dp0git-pull-log.txt"
echo [DONE] Script finished.
exit /b
