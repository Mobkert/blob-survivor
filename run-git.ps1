Set-Location 'C:\Users\user\Documents\blob-survivor'
$log = New-Object System.Collections.ArrayList
function Add-Log([string]$s) { [void]$log.Add($s) }

Add-Log '=== STEP 1: git status ==='
Add-Log (git -C 'C:\Users\user\Documents\blob-survivor' status 2>&1 | Out-String)

if (-not (Test-Path 'C:\Users\user\Documents\blob-survivor\.git')) {
  Add-Log '=== STEP 2: git init ==='
  Add-Log (git init 2>&1 | Out-String)
}

Add-Log '=== STEP 3: gh auth status ==='
Add-Log (gh auth status 2>&1 | Out-String)
Add-Log '=== remotes ==='
Add-Log (git remote -v 2>&1 | Out-String)

Add-Log '=== STEP 4: git status ==='
Add-Log (git status 2>&1 | Out-String)
Add-Log '=== git diff (stat) ==='
Add-Log (git diff --stat 2>&1 | Out-String)
Add-Log '=== git log -3 ==='
Add-Log (git log -3 2>&1 | Out-String)

Add-Log '=== STEP 5: git add . ==='
Add-Log (git add . 2>&1 | Out-String)

$commitMsg = @'
Initial commit: Blob Survivor Phaser 3 game

Wave-based survival game with weapons, powerups, upgrade cards, and enemy waves.
'@

Add-Log '=== STEP 6: git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" ==='
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m $commitMsg 2>&1 | ForEach-Object { Add-Log $_ }
$commitExit = $LASTEXITCODE
Add-Log "commit exit code: $commitExit"
if ($commitExit -eq 0) {
  Add-Log ('commit hash: ' + (git rev-parse HEAD 2>&1 | Out-String).Trim())
}

$remotes = git remote 2>&1
if ($remotes -match 'origin') {
  Add-Log '=== STEP 7: push to existing origin ==='
  Add-Log (git push -u origin HEAD 2>&1 | Out-String)
} else {
  Add-Log '=== STEP 7: gh repo create ==='
  Add-Log (gh repo create blob-survivor --public --source=. --remote=origin --push 2>&1 | Out-String)
}

Add-Log '=== final remote -v ==='
Add-Log (git remote -v 2>&1 | Out-String)

$log | Out-File 'C:\Users\user\Documents\blob-survivor\git-output.txt' -Encoding utf8
