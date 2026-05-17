$ErrorActionPreference = "Stop"

$RepoPath = "E:\Nimclea_Products\diagnostic"
$BackendEnvPath = Join-Path $RepoPath "backend\.env"
$FrontendEnvLocalPath = Join-Path $RepoPath "frontend\.env.local"
$FrontendEnvPath = Join-Path $RepoPath "frontend\.env"

Set-Location $RepoPath

Write-Host ""
Write-Host "=== Nimclea environment check ==="

$Passed = 0
$Warned = 0
$Failed = 0

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

function Read-EnvFile {
  param([string]$Path)

  $result = @{}

  if (-not (Test-Path $Path)) {
    return $result
  }

  $lines = Get-Content $Path

  foreach ($line in $lines) {
    $trimmed = $line.Trim()

    if ($trimmed.Length -eq 0) {
      continue
    }

    if ($trimmed.StartsWith("#")) {
      continue
    }

    $parts = $trimmed -split "=", 2

    if ($parts.Count -eq 2) {
      $key = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"').Trim("'")
      $result[$key] = $value
    }
  }

  return $result
}

Write-Host ""
Write-Host "1) Backend .env file"

if (Test-Path $BackendEnvPath) {
  Add-Pass "backend/.env exists"
} else {
  Add-Fail "backend/.env is missing"
}

$BackendEnv = Read-EnvFile $BackendEnvPath

Write-Host ""
Write-Host "2) Supabase backend variables"

if ($BackendEnv.ContainsKey("SUPABASE_URL") -and $BackendEnv["SUPABASE_URL"].Length -gt 0) {
  Add-Pass "SUPABASE_URL exists"
} else {
  Add-Fail "SUPABASE_URL is missing or empty"
}

if ($BackendEnv.ContainsKey("SUPABASE_SERVICE_ROLE_KEY") -and $BackendEnv["SUPABASE_SERVICE_ROLE_KEY"].Length -gt 0) {
  Add-Pass "SUPABASE_SERVICE_ROLE_KEY exists"
} else {
  Add-Fail "SUPABASE_SERVICE_ROLE_KEY is missing or empty"
}

Write-Host ""
Write-Host "3) Frontend API base"

$FrontendEnv = @{}

if (Test-Path $FrontendEnvLocalPath) {
  Add-Pass "frontend/.env.local exists"
  $FrontendEnv = Read-EnvFile $FrontendEnvLocalPath
} elseif (Test-Path $FrontendEnvPath) {
  Add-Warn "frontend/.env.local is missing; using frontend/.env instead"
  $FrontendEnv = Read-EnvFile $FrontendEnvPath
} else {
  Add-Warn "frontend/.env.local and frontend/.env are both missing"
}

if ($FrontendEnv.ContainsKey("VITE_API_BASE_URL") -and $FrontendEnv["VITE_API_BASE_URL"].Length -gt 0) {
  Add-Pass "VITE_API_BASE_URL exists"
  Write-Host "Current VITE_API_BASE_URL:"
  Write-Host $FrontendEnv["VITE_API_BASE_URL"]

  if ($FrontendEnv["VITE_API_BASE_URL"] -match "onrender\.com") {
    Add-Pass "VITE_API_BASE_URL appears to point to Render"
  } elseif ($FrontendEnv["VITE_API_BASE_URL"] -match "localhost") {
    Add-Warn "VITE_API_BASE_URL points to localhost"
  } else {
    Add-Warn "VITE_API_BASE_URL does not look like Render or localhost"
  }
} else {
  Add-Warn "VITE_API_BASE_URL is missing or empty"
}

Write-Host ""
Write-Host "4) Local backend smoke hint"

Write-Host "To check local backend endpoints, run:"
Write-Host ".\scripts\smoke-backend.ps1"

Write-Host ""
Write-Host "=== Environment check summary ==="
Write-Host "PASS: $Passed"
Write-Host "WARN: $Warned"
Write-Host "FAIL: $Failed"

if ($Failed -gt 0) {
  Write-Host ""
  Write-Host "FAILED: environment check found missing required backend settings."
  exit 1
}

Write-Host ""
Write-Host "DONE: environment check completed."