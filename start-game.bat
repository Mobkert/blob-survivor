@echo off
cd /d "%~dp0"

echo.
echo  Blob Survivor
echo  ============
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [FEHLER] Node.js nicht gefunden. Cursor neu starten.
  pause
  exit /b 1
)

echo Node:
node --version
echo npm:
npm --version
echo.

if not exist "node_modules" (
  echo Installiere Pakete - beim ersten Mal 1-2 Minuten warten...
  call npm install
  if errorlevel 1 (
    echo.
    echo [FEHLER] npm install fehlgeschlagen.
    pause
    exit /b 1
  )
  echo Fertig installiert.
  echo.
)

echo Starte Server: http://localhost:3000
echo Dieses Fenster OFFEN lassen. Strg+C zum Beenden.
echo.

call npm run dev
pause
