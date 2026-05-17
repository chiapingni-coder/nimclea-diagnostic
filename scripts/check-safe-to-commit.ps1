$ErrorActionPreference = "Stop"

$RepoPath = "E:\Nimclea_Products\diagnostic"
Set-Location $RepoPath

Write-Host ""
Write-Host "=== Nimclea safe-to-commit check ==="

$Failed = 0
$Warned = 0
$Passed = 0

function Add-Pass {
  param([string]$Message)
  Write-Host "PASS: $Message"
  $script:Passed++
}

function Add-Warn {
  param([string]$Message)
  Write-Host "WARN: $Message"
  $script:Warned++
}

function Add-Fail {
  param([string]$Message)
  Write-Host "FAIL: $Message"
  $script:Failed++
}

Write-Host ""
Write-Host "1) Checking git status..."

$StatusLines = git status --short

if (-not $StatusLines) {
  Add-Pass "working tree is clean"
} else {
  Write-Host "Current git status:"
  $StatusLines | ForEach-Object { Write-Host $_ }
}

Write-Host ""
Write-Host "2) Checking dangerous file paths..."

$DangerousPatterns = @(
  "\.env$",
  "\.env\.local$",
  "\.env\.production$",
  "\.env\.development$",
  "\.pem$",
  "\.key$",
  "\.p12$",
  "\.pfx$",
  "service_role",
  "service-role",
  "secret",
  "secrets",
  "node_modules/",
  "/dist/",
  "^dist/",
  "frontend/dist/",
  "backend/dist/",
  "\.DS_Store$",
  "Thumbs\.db$"
)

$DangerousHits = @()

foreach ($line in $StatusLines) {
  $path = $line.Substring(3).Trim() -replace "\\", "/"

  foreach ($pattern in $DangerousPatterns) {
    if ($path -match $pattern) {
      $DangerousHits += $path
    }
  }
}

$DangerousHits = $DangerousHits | Sort-Object -Unique

if ($DangerousHits.Count -gt 0) {
  Add-Fail "dangerous files appear in git status"
  $DangerousHits | ForEach-Object { Write-Host "  $_" }
} else {
  Add-Pass "no dangerous file paths found in git status"
}

Write-Host ""
Write-Host "3) Checking staged files..."

$StagedFiles = git diff --cached --name-only

if ($StagedFiles) {
  Write-Host "Currently staged files:"
  $StagedFiles | ForEach-Object { Write-Host "  $_" }

  $DangerousStagedHits = @()

  foreach ($path in $StagedFiles) {
    $normalizedPath = $path -replace "\\", "/"

    foreach ($pattern in $DangerousPatterns) {
      if ($normalizedPath -match $pattern) {
        $DangerousStagedHits += $normalizedPath
      }
    }
  }

  $DangerousStagedHits = $DangerousStagedHits | Sort-Object -Unique

  if ($DangerousStagedHits.Count -gt 0) {
    Add-Fail "dangerous files are staged"
    $DangerousStagedHits | ForEach-Object { Write-Host "  $_" }
  } else {
    Add-Pass "no dangerous staged files found"
  }
} else {
  Add-Pass "no staged files"
}

Write-Host ""
Write-Host "4) Checking for common secret-looking content in staged diff..."

$StagedDiff = git diff --cached

if ($StagedDiff) {
  $SecretPatterns = @(
    "SUPABASE_SERVICE_ROLE_KEY\s*=",
    "STRIPE_SECRET_KEY\s*=",
    "OPENAI_API_KEY\s*=",
    "BEGIN PRIVATE KEY",
    "BEGIN RSA PRIVATE KEY",
    "password\s*=",
    "secret\s*=",
    "token\s*="
  )

  $SecretHits = @()

  foreach ($pattern in $SecretPatterns) {
    if ($StagedDiff -match $pattern) {
      $SecretHits += $pattern
    }
  }

  $SecretHits = $SecretHits | Sort-Object -Unique

  if ($SecretHits.Count -gt 0) {
    Add-Fail "secret-looking content found in staged diff"
    $SecretHits | ForEach-Object { Write-Host "  pattern: $_" }
  } else {
    Add-Pass "no obvious secret-looking content found in staged diff"
  }
} else {
  Add-Pass "no staged diff to inspect"
}

Write-Host ""
Write-Host "=== Safe-to-commit summary ==="
Write-Host "PASS: $Passed"
Write-Host "WARN: $Warned"
Write-Host "FAIL: $Failed"

if ($Failed -gt 0) {
  Write-Host ""
  Write-Host "FAILED: safe-to-commit check found risky files or content."
  Write-Host "Remove the risky files from git status/staging before release-push."
  exit 1
}

Write-Host ""
Write-Host "DONE: safe-to-commit check completed."