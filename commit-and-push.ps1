# Blob Survivor — commit and push to GitHub
# Run in PowerShell from this folder:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   (once, if needed)
#   .\commit-and-push.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] '$name' not found." -ForegroundColor Red
    Write-Host "Install Git: https://git-scm.com/download/win"
    if ($name -eq "gh") {
      Write-Host "Install GitHub CLI: https://cli.github.com/"
    }
    exit 1
  }
}

Require-Command git

if (-not (Test-Path ".git")) {
  git init
  git branch -M main
}

git add .
git status

$msg = @"
Add Blob Survivor top-down wave survival game.

Phaser 3 + Vite game with weapon/powerup cards, wave combat,
explosive powerups, throwable bomb and grenade, and UI HUD.
"@

git commit -m $msg

if (-not (git remote get-url origin 2>$null)) {
  Require-Command gh
  Write-Host "Creating GitHub repo and pushing..." -ForegroundColor Cyan
  gh repo create blob-survivor --public --source=. --remote=origin --push
} else {
  Write-Host "Pushing to origin..." -ForegroundColor Cyan
  git push -u origin main
}

Write-Host "Done!" -ForegroundColor Green
git remote get-url origin
