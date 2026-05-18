param(
  [Parameter(Mandatory = $true)]
  [string]$Id,

  [Parameter(Mandatory = $true)]
  [ValidateSet("inspection", "decision", "candidate", "implementation", "smoke", "blocker", "closure", "record")]
  [string]$Kind,

  [Parameter(Mandatory = $false)]
  [string]$Commit,

  [switch]$NoPush,
  [switch]$SkipCheck
)

$ErrorActionPreference = "Stop"

$RepoPath = Split-Path -Parent $PSScriptRoot
Set-Location $RepoPath

$Id = [System.IO.Path]::GetFileNameWithoutExtension($Id)
$DocPath = Join-Path "docs" "$Id.md"

function Write-Step {
  param([string]$Text)
  Write-Host ""
  Write-Host "=== $Text ==="
}

function Require-File {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "Missing required file: $Path"
  }
}

Write-Step "Nimclea v0.9 work item"
Write-Host "ID:     $Id"
Write-Host "Kind:   $Kind"
Write-Host "Doc:    $DocPath"

Require-File "scripts\new-record.ps1"
Require-File "scripts\gate-doc.ps1"
Require-File "scripts\release-check.ps1"
Require-File "scripts\release-push.ps1"

if (-not (Test-Path $DocPath)) {
  Write-Step "Create record"
  & ".\scripts\new-record.ps1" $Id

  Write-Host ""
  Write-Host "STOP: record was created but still needs content."
  Write-Host "Fill this file first:"
  Write-Host $DocPath
  Write-Host ""
  Write-Host "Then rerun the same v09-work-item command."
  exit 0
}

$DocContent = Get-Content $DocPath -Raw

$LooksUnfilled =
  $DocContent -match "(?m)^- Area:\s*$" -or
  $DocContent -match "(?m)^- Files inspected:\s*$" -or
  $DocContent -match "(?m)^- Files changed:\s*$" -or
  $DocContent -match "(?m)^- Runtime behavior affected:\s*$" -or
  $DocContent -match "(?m)^-\s*$"

if ($LooksUnfilled) {
  Write-Step "Record content check"
  Write-Host "STOP: record still appears to contain blank template fields."
  Write-Host "Fill this file first:"
  Write-Host $DocPath
  Write-Host ""
  Write-Host "Then rerun the same v09-work-item command."
  exit 0
}

Write-Step "Protect record in release gate"
& ".\scripts\gate-doc.ps1" $DocPath

if (-not $SkipCheck) {
  Write-Step "Run release check"
  & ".\scripts\release-check.ps1"

  if ($LASTEXITCODE -ne 0) {
    throw "release-check failed. Stop before push."
  }
} else {
  Write-Step "Run release check"
  Write-Host "SKIP: -SkipCheck was provided."
}

if ($NoPush) {
  Write-Step "Push"
  Write-Host "SKIP: -NoPush was provided."
  exit 0
}

if (-not $Commit -or $Commit.Trim().Length -eq 0) {
  throw "Missing -Commit. Provide a clear commit message or use -NoPush."
}

Write-Step "Release push"
& ".\scripts\release-push.ps1" $Commit

if ($LASTEXITCODE -ne 0) {
  throw "release-push failed."
}

Write-Step "Done"
git status --short
git log --oneline --decorate -3
