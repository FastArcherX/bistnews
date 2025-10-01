@echo off
chcp 65001 >nul
echo ========================================
echo    BISTNEWS - The Student Voice
echo    Real-time Edition
echo ========================================
echo.

REM Naviga alla directory del file batch
cd /d "%~dp0"

echo [INFO] Directory corrente: %cd%
echo.

REM Verifica Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRORE] Node.js non trovato!
    echo Installa Node.js da: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js trovato: 
node --version

REM Chiudi eventuali processi Node.js esistenti
echo [INFO] Chiusura processi Node.js esistenti...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im http-server.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Verifica se le porte sono libere
echo [INFO] Verifica porte disponibili...
netstat -an | find "0.0.0.0:3001" >nul
if not errorlevel 1 (
    echo [WARNING] Porta 3001 occupata, tentativo di liberarla...
    for /f "tokens=5" %%i in ('netstat -ano ^| find "0.0.0.0:3001"') do taskkill /f /pid %%i >nul 2>&1
)

netstat -an | find "0.0.0.0:5000" >nul
if not errorlevel 1 (
    echo [WARNING] Porta 5000 occupata, tentativo di liberarla...
    for /f "tokens=5" %%i in ('netstat -ano ^| find "0.0.0.0:5000"') do taskkill /f /pid %%i >nul 2>&1
)

timeout /t 2 /nobreak >nul

REM Installa dipendenze se necessario
if not exist "node_modules\express" (
    echo [INFO] Installazione dipendenze...
    call npm install
)

REM Build del frontend
echo [INFO] Build del frontend...
call node build.js
if errorlevel 1 (
    echo [ERRORE] Build fallito!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  AVVIO SISTEMA BISTNEWS
echo ========================================

REM Avvia backend in una nuova finestra
echo [1/2] Avvio Backend Server...
start "BIST Backend" cmd /k "node server.js"

REM Pausa per far avviare il backend
echo [INFO] Attesa avvio backend (10 secondi)...
timeout /t 10 /nobreak >nul

REM Verifica che il backend sia attivo
echo [INFO] Verifica backend...
curl -s http://localhost:3001/api/health >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Backend potrebbe non essere ancora pronto
    echo Continuando comunque...
)

REM Avvia frontend
echo [2/2] Avvio Frontend Server...
echo.
echo ✅ SISTEMA PRONTO!
echo 🌐 Frontend: http://localhost:5000
echo 📡 Backend: http://localhost:3001
echo 🔐 Password Admin: admin123
echo.
echo Premi CTRL+C per fermare
echo.

call npm run frontend

echo.
echo [INFO] Frontend fermato.
pause