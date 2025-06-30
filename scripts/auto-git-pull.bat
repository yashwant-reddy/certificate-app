@echo off
cd /d %~dp0

set BRANCH=local-storage
set MAX_RETRIES=3
set /a COUNT=0

REM --- Git pull with retry and keep local changes in conflicts ---
:RETRY
git checkout %BRANCH%
git pull -s recursive -X ours origin %BRANCH%
IF %ERRORLEVEL% EQU 0 (
    echo [%DATE% %TIME%] Pull SUCCESS >> git-pull-log.txt
    goto CLEAN_LOG
) ELSE (
    set /a COUNT+=1
    echo [%DATE% %TIME%] Pull FAILED, attempt %COUNT% >> git-pull-log.txt
    IF %COUNT% GEQ %MAX_RETRIES% (
        echo [%DATE% %TIME%] Pull failed %MAX_RETRIES% times, giving up. >> git-pull-log.txt
        goto CLEAN_LOG
    ) ELSE (
        timeout /t 10 >nul
        goto RETRY
    )
)

:CLEAN_LOG
REM Clean log to keep only last 7 days
powershell -ExecutionPolicy Bypass -File "%~dp0clean-log.ps1" "%~dp0git-pull-log.txt"
exit /b
