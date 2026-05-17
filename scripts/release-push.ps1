param(
  [Parameter(Mandatory=$true)]
  [string]$Message
)

$ErrorActionPreference = "Stop"

$RepoPath = "E:\Nimclea_Products\diagnostic"

Write-Host ""
Write-Host "=== Nimclea release push ==="

Set-Location $RepoPath

Write-Host ""
Write-Host "1) Current git status:"
git status --short

Write-Host ""
Write-Host "2) Checking whitespace / diff issues..."
git diff --check
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FAILED: git diff --check found issues. Stop."
  exit 1
}

Write-Host ""
Write-Host "3) Adding files..."
git add .

Write-Host ""
Write-Host "4) Committing..."
git commit -m "$Message"
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FAILED: commit failed or there was nothing to commit. Stop."
  exit 1
}

Write-Host ""
Write-Host "5) Pushing to GitHub master..."
git push origin master
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FAILED: git push failed. Stop."
  exit 1
}

Write-Host ""
Write-Host "6) Final status:"
git status --short

Write-Host ""
Write-Host "7) Latest commits:"
git log --oneline --decorate -3

Write-Host ""
Write-Host "DONE: GitHub push completed."
Write-Host "Render should auto-deploy if it is connected to GitHub master."
Write-Host "Supabase Storage is not included yet."