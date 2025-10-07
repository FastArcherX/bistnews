@echo off
chcp 65001 >nul
cls

echo ========================================
echo    BISTNEWS - Setup Automatico
echo    Installazione Dipendenze
echo ========================================
echo.

:: Verifica se Node.js è installato
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ [ERRORE] Node.js non trovato!
    echo.
    echo Per installare Node.js:
    echo 1. Vai su https://nodejs.org/
    echo 2. Scarica la versione LTS
    echo 3. Installa e riavvia il computer
    echo 4. Esegui nuovamente questo script
    echo.
    pause
    exit /b 1
)

echo [✓] Node.js trovato: 
node --version

:: Verifica se npm è disponibile
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ [ERRORE] npm non trovato!
    pause
    exit /b 1
)

echo [✓] npm trovato: 
npm --version
echo.

echo ========================================
echo  FASE 1: Pulizia opzionale (usa setup.bat clean per forzare)
echo ========================================

if /i "%1"=="clean" (
  echo [INFO] Modalita' CLEAN attiva: rimuovo node_modules e package-lock.json
  if exist "node_modules" (
      rmdir /s /q "node_modules" 2>nul && echo [✓] node_modules rimosso
  ) else (
      echo [INFO] node_modules non presente
  )
  if exist "package-lock.json" (
      del "package-lock.json" 2>nul && echo [✓] package-lock.json rimosso
  ) else (
      echo [INFO] package-lock.json non presente
  )
) else (
  echo [INFO] Nessuna pulizia forzata eseguita (passa argomento clean per forzarla)
)

echo.
echo ========================================
echo  FASE 2: Installazione dipendenze locali
echo ========================================

echo [INFO] Installazione dipendenze da package.json...
npm install
if %errorlevel% neq 0 (
    echo ❌ [ERRORE] Installazione fallita!
    echo.
    echo Possibili soluzioni:
    echo 1. Verifica la connessione internet
    echo 2. Prova: npm cache clean --force
    echo 3. Esegui come Amministratore
    pause
    exit /b 1
)

echo [✓] Dipendenze locali installate con successo!
echo.

echo ========================================
echo  FASE 3: Installazione strumenti globali (solo se mancanti)
echo ========================================
where http-server >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] http-server non trovato globalmente: uso npx quando necessario (salto install).
) else (
    echo [✓] http-server gia' presente
)

where nodemon >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] nodemon non globale (va bene, verra' usato da dipendenze locali)
) else (
    echo [✓] nodemon globale disponibile
)

echo.
echo ========================================
echo  FASE 4: Build (se previsto)
echo ========================================
if exist build.js (
    echo [INFO] Eseguo build...
    npm run build
    if %errorlevel% neq 0 (
        echo ⚠️  Build fallita (continua comunque se dist esiste)
    ) else (
        echo [✓] Build completata
    )
) else (
    echo [INFO] Nessun build.js trovato: salto fase build
)

echo  FASE 5: Verifica pacchetti chiave
echo ========================================
for %%M in (express socket.io multer cors fs-extra uuid) do (
    node -e "require('%%M')" 2>nul & if errorlevel 1 (echo ❌ %%M non trovato) else (echo [✓] %%M OK)
)

echo.
echo ========================================
echo  FASE 6: Creazione cartelle necessarie
echo ========================================

:: Crea cartella server-data se non esiste
if not exist "server-data" (
    mkdir "server-data" 2>nul
    echo [✓] Cartella server-data creata
) else (
    echo [✓] Cartella server-data già esistente
)

:: Crea cartella uploads in server-data se non esiste
if not exist "server-data\uploads" (
    mkdir "server-data\uploads" 2>nul
    mkdir "server-data\uploads\articles" 2>nul
    mkdir "server-data\uploads\announcements" 2>nul
    echo [✓] Cartelle server-data\uploads create
) else (
    echo [✓] Cartelle server-data\uploads già esistenti
)

:: Crea file JSON vuoti se non esistono
if not exist "server-data\articles.json" (
    echo {} > "server-data\articles.json"
    echo [✓] File articles.json creato
)

if not exist "server-data\announcements.json" (
    echo {} > "server-data\announcements.json"
    echo [✓] File announcements.json creato
)

if not exist "server-data\comments.json" (
    echo {} > "server-data\comments.json"
    echo [✓] File comments.json creato
)

if not exist "server-data\views.json" (
    echo {} > "server-data\views.json"
    echo [✓] File views.json creato
)

echo.
echo ========================================
echo  🎉 SETUP COMPLETATO!
echo ========================================
echo.
echo [✓] Tutte le dipendenze sono state installate
echo [✓] Le cartelle necessarie sono state create
echo [✓] Il sistema è pronto per l'uso
echo.
echo PROSSIMI PASSI:
echo 1. Esegui: avvia-sito.bat per avviare il sistema
echo 2. Apri: http://localhost:8080 nel browser
echo.
echo ========================================
echo   Sistema BIST News - Ready to Go! 🚀
echo ========================================
echo.
pause