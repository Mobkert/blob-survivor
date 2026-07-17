Set-Location $PSScriptRoot
$log = Join-Path $PSScriptRoot "start-log.txt"

"Blob Survivor start $(Get-Date)" | Out-File $log
"Folder: $(Get-Location)" | Out-File $log -Append

Write-Host ""
Write-Host " Blob Survivor" -ForegroundColor Green
Write-Host " ============" -ForegroundColor Green
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERROR] Node not found. Restart Cursor after installing Node." -ForegroundColor Red
  exit 1
}

Write-Host "Node: $(node --version)"
Write-Host "npm:  $(npm --version)"
Write-Host ""

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies (first time may take 1-2 min)..." -ForegroundColor Yellow
  npm install 2>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed. See start-log.txt" -ForegroundColor Red
    exit 1
  }
  Write-Host "Install done." -ForegroundColor Green
} else {
  Write-Host "Dependencies OK."
}

Write-Host ""
Write-Host "Starting http://localhost:3000" -ForegroundColor Cyan
Write-Host "Keep this terminal OPEN. Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

npm run dev
