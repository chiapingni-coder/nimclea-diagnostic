$ErrorActionPreference = "Stop"

$RepoPath = "E:\Nimclea_Products\diagnostic"

function Write-FailureAttributionBlock {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WhatFailed,

    [Parameter(Mandatory = $true)]
    [string]$LikelyLayer,

    [Parameter(Mandatory = $true)]
    [string]$SmallestProofCommand,

    [Parameter(Mandatory = $true)]
    [string]$StopLine
  )

  Write-Host ""
  Write-Host "=== Failure Attribution Block ==="
  Write-Host "What failed: $WhatFailed"
  Write-Host "Likely layer: $LikelyLayer"
  Write-Host "Smallest proof command: $SmallestProofCommand"
  Write-Host "Stop line: $StopLine"
}

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
  Write-FailureAttributionBlock `
    -WhatFailed "whitespace / diff issues" `
    -LikelyLayer "repo hygiene / release gate" `
    -SmallestProofCommand "git diff --check" `
    -StopLine "Do not push until whitespace or diff issues are resolved."
  exit 1
}

Write-Host ""
Write-Host "3) Running safe-to-commit check..."
.\scripts\check-safe-to-commit.ps1
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FAILED: safe-to-commit check failed. Stop."
  Write-FailureAttributionBlock `
    -WhatFailed "safe-to-commit check" `
    -LikelyLayer "repo hygiene / safety boundary" `
    -SmallestProofCommand ".\scripts\check-safe-to-commit.ps1" `
    -StopLine "Do not push until safe-to-commit returns FAIL 0."
  exit 1
}

Write-Host ""
Write-Host "3) Running frontend build..."
npm --prefix frontend run build
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FAILED: frontend build failed. Stop."
  Write-FailureAttributionBlock `
    -WhatFailed "frontend build" `
    -LikelyLayer "frontend / build" `
    -SmallestProofCommand "npm --prefix frontend run build" `
    -StopLine "Do not push until frontend build passes."
  exit 1
}

Write-Host ""
Write-Host "4) Running Golden Case release gate..."
node scripts/check-release-gate.mjs
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "FAILED: release gate failed. Stop."
  Write-FailureAttributionBlock `
    -WhatFailed "Golden Case release gate" `
    -LikelyLayer "release-gate / docs-or-guard" `
    -SmallestProofCommand "node scripts/check-release-gate.mjs" `
    -StopLine "Do not push until Golden Case release gate returns FAIL 0."
  exit 1
}

Write-Host ""
Write-Host "5) Final git status:"
git status --short

Write-Host ""
Write-Host "DONE: release check completed."
Write-Host "If the final git status only shows intended changes, you can run:"
Write-Host '.\scripts\release-push.ps1 "Your commit message here"'
