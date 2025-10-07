@echo off
chcp 65001 >nul
echo ========================================
echo    BISTNEWS - The Student Voice
echo    Real-time Development Environment
echo ========================================
echo.

REM Navigate to the batch file's directory
cd /d "%~dp0"

echo [INFO] Current directory: %cd%
echo.

REM Check for Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version

REM Close any existing Node.js processes to free up ports
echo [INFO] Closing existing Node.js processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im live-server.exe >nul 2>&1
taskkill /f /im http-server.exe >nul 2>&1
timeout /t 1 /nobreak >nul

REM Install dependencies if node_modules folder is missing
if not exist "node_modules" (
    echo [INFO] Installing dependencies, this may take a moment...
    call npm install
)

echo.
echo ========================================
echo  BISTNEWS LAUNCHER
echo ========================================
echo Modalita':
echo   dev       = backend (nodemon) + live reload frontend (default)
echo   start     = production style (node server + static dist)
echo   frontend  = only static dist server
echo.
set MODE=%1
if "%MODE%"=="" set MODE=dev
echo [INFO] Selected mode: %MODE%
echo.

REM Build dist if missing
if not exist "dist" (
    if exist build.js (
        echo [INFO] dist missing: running build...
        call npm run build
    ) else (
        echo [WARN] dist missing and no build.js found.
    )
)

REM Quick port availability check
netstat -ano | findstr ":8080" >nul 2>&1 && echo [WARN] Port 8080 appears in use.

if /i "%MODE%"=="dev" goto :DEV
if /i "%MODE%"=="start" goto :START
if /i "%MODE%"=="frontend" goto :FRONT
echo [WARN] Unknown mode %MODE% - defaulting to dev
goto :DEV

:DEV
echo --- DEV MODE ---
where live-server >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] live-server not global: using npx
    call npx concurrently "npm:dev:backend" "npx live-server dist --port=8080"
) else (
    call npm run dev
)
goto :END

:START
echo --- START MODE ---
echo Starting backend...
start "backend" cmd /c "node server.js"
where http-server >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] http-server not global: using npx
    start "frontend" cmd /c "npx http-server dist -p 8080 -a 0.0.0.0 -c-1"
) else (
    start "frontend" cmd /c "http-server dist -p 8080 -a 0.0.0.0 -c-1"
)
echo Both processes launched. Press CTRL+C to end this wrapper.
goto :END

:FRONT
echo --- FRONTEND ONLY MODE ---
where http-server >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] http-server not global: using npx
    npx http-server dist -p 8080 -a 0.0.0.0 -c-1
) else (
    http-server dist -p 8080 -a 0.0.0.0 -c-1
)
goto :END

:END
echo.
echo [INFO] Launcher finished.
pause
