@echo off
cd /d "%~dp0"
set OUT=diagnose-output.txt
echo Blob Survivor Diagnostics > "%OUT%"
echo Generated: %date% %time% >> "%OUT%"
echo. >> "%OUT%"

echo === Port 3000 === >> "%OUT%"
netstat -ano | findstr ":3000" >> "%OUT%" 2>&1
if errorlevel 1 echo Nothing listening on port 3000 >> "%OUT%"

echo. >> "%OUT%"
echo === Node === >> "%OUT%"
where node >> "%OUT%" 2>&1
node --version >> "%OUT%" 2>&1

echo. >> "%OUT%"
echo === npm === >> "%OUT%"
where npm >> "%OUT%" 2>&1
npm --version >> "%OUT%" 2>&1

echo. >> "%OUT%"
echo === Python === >> "%OUT%"
where python >> "%OUT%" 2>&1
python --version >> "%OUT%" 2>&1
where py >> "%OUT%" 2>&1
py --version >> "%OUT%" 2>&1

echo. >> "%OUT%"
echo === Project files === >> "%OUT%"
if exist node_modules (echo node_modules: YES >> "%OUT%") else (echo node_modules: NO - run npm install >> "%OUT%")
if exist package.json (echo package.json: YES >> "%OUT%") else (echo package.json: NO >> "%OUT%")

echo.
echo Done! Results saved to diagnose-output.txt
type "%OUT%"
