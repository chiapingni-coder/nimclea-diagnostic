$ErrorActionPreference = "Stop"

$RepoPath = "E:\Nimclea_Products\diagnostic"

Write-Host ""
Write-Host "=== Nimclea release check ==="

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
Write-Host "3) Running safe-to-commit check..."
.\scripts\check-safe-to-commit.ps1
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FAILED: safe-to-commit check failed. Stop."
  exit 1
}

Write-Host ""
Write-Host "3) Running frontend build..."
npm --prefix frontend run build
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FAILED: frontend build failed. Stop."
  exit 1
}

Write-Host ""
Write-Host "4) Running Golden Case release gate..."
node scripts/check-release-gate.mjs
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FAILED: release gate failed. Stop."
  exit 1
}

Write-Host ""
Write-Host "5) Final git status:"
git status --short

Write-Host ""
Write-Host "DONE: release check completed."
Write-Host "If the final git status only shows intended changes, you can run:"
Write-Host '.\scripts\release-push.ps1 "Your commit message here"'