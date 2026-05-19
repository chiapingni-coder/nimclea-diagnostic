param(
  [Parameter(Mandatory = $true)]
  [string]$Id,

  [Parameter(Mandatory = $true)]
  [string]$Kind,

  [Parameter(Mandatory = $false)]
  [string]$PromptFile,

  [Parameter(Mandatory = $false)]
  [string]$PromptText,

  [Parameter(Mandatory = $false)]
  [string]$Commit,

  [switch]$Push
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$RepoPath = "E:\Nimclea_Products\diagnostic"
Set-Location $RepoPath

$Id = [System.IO.Path]::GetFileNameWithoutExtension($Id)
$DocPath = Join-Path "docs" "$Id.md"
$NormalizedDocPath = $DocPath -replace "\\", "/"
$Auto2RecordId = "NIMCLEA_V0_9_AUTO2_CODEX_FILL_PIPELINE_SCRIPT_RECORD_V0_1"
$IsImplementingAuto2 = $Id -eq $Auto2RecordId
$BlankTemplatePattern = "This record documents the decision, implementation, rehearsal, or validation result for this Nimclea work item\.|^- Area:\s*$|^- Files inspected:\s*$|^- Files changed:\s*$|^- Runtime behavior affected:\s*$|^-\s*$"

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

function Get-ChangedRepoPath {
  $statusLines = git status --porcelain
  if ($LASTEXITCODE -ne 0) {
    throw "git status failed."
  }

  foreach ($line in $statusLines) {
    if ($line.Length -lt 4) {
      continue
    }

    $path = $line.Substring(3)
    if ($path -match " -> ") {
      $path = ($path -split " -> ", 2)[1]
    }

    $path.Trim('"') -replace "\\", "/"
  }
}

function Assert-AllowedChangedFiles {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$AllowedPaths,

    [Parameter(Mandatory = $true)]
    [string]$Phase
  )

  $changed = @(Get-ChangedRepoPath)
  $unexpected = @($changed | Where-Object { $AllowedPaths -notcontains $_ })

  if ($unexpected.Count -gt 0) {
    Write-Host ""
    Write-Host "FAILED: unexpected changed files during $Phase."
    Write-Host "Allowed:"
    $AllowedPaths | ForEach-Object { Write-Host "  - $_" }
    Write-Host "Found:"
    $changed | ForEach-Object { Write-Host "  - $_" }
    throw "Unexpected changed files during $Phase."
  }
}

function Assert-MeaningfulResultMarker {
  param([string]$Path)

  $lines = Get-Content -Path $Path
  $resultLineIndexes = @()

  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^Result:\s*(.*)$") {
      $resultLineIndexes += $i
    }
  }

  if ($resultLineIndexes.Count -eq 0) {
    throw "Target record is missing a Result marker."
  }

  foreach ($index in $resultLineIndexes) {
    $content = ([regex]::Match($lines[$index], "^Result:\s*(.*)$")).Groups[1].Value.Trim()

    if ([string]::IsNullOrWhiteSpace($content)) {
      for ($next = $index + 1; $next -lt $lines.Count; $next++) {
        $candidate = $lines[$next].Trim()
        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
          $content = $candidate
          break
        }
      }
    }

    $isPlaceholder =
      [string]::IsNullOrWhiteSpace($content) -or
      $content -eq "-" -or
      $content -match "^(TODO|TBD|N/A|NA|placeholder|pending)\b" -or
      $content -match "^#+\s+"

    if ($isPlaceholder) {
      throw "Target record has a blank or placeholder Result marker."
    }
  }
}

Write-Step "Nimclea v0.9 AUTO2 work item"
Write-Host "ID:          $Id"
Write-Host "Kind:        $Kind"
Write-Host "Doc:         $NormalizedDocPath"
if (-not [string]::IsNullOrWhiteSpace($PromptFile)) {
  Write-Host "PromptFile:  $PromptFile"
}
if (-not [string]::IsNullOrWhiteSpace($PromptText)) {
  Write-Host "PromptText:  inline"
}
Write-Host "Push:        $($Push.IsPresent)"

$HasPromptFile = -not [string]::IsNullOrWhiteSpace($PromptFile)
$HasPromptText = -not [string]::IsNullOrWhiteSpace($PromptText)

if (-not $HasPromptFile -and -not $HasPromptText) {
  throw "Provide either -PromptFile or -PromptText."
}

if ($HasPromptFile -and $HasPromptText) {
  throw "Provide only one of -PromptFile or -PromptText."
}

Require-File "scripts\new-record.ps1"
Require-File "scripts\gate-doc.ps1"
Require-File "scripts\release-check.ps1"
Require-File "scripts\release-push.ps1"

if (-not (Test-Path $DocPath)) {
  Write-Step "Create record"
  & ".\scripts\new-record.ps1" $Id
  if ($LASTEXITCODE -ne 0) {
    throw "new-record failed."
  }
}

Require-File $DocPath

if ($HasPromptFile) {
  Require-File $PromptFile
  $PromptFullPath = (Resolve-Path $PromptFile).Path
  $PromptBody = Get-Content -Path $PromptFullPath -Raw
} else {
  $PromptBody = $PromptText
}

$GuardedPrompt = @"
Fill the Nimclea record at:
$NormalizedDocPath

Hard rules:
- Edit only this target docs record: $NormalizedDocPath
- Do not create the record file. This script already created or confirmed it exists.
- Do not modify frontend code.
- Do not modify backend runtime code.
- Do not modify runtime code.
- Do not modify Supabase migrations.
- Do not add Supabase Storage.
- Keep this work documentation-only unless the prompt explicitly names this AUTO2 script implementation record.

Record fill instructions:
$PromptBody
"@

Write-Step "Codex fill station"
$GuardedPrompt | & codex exec --sandbox workspace-write -
if ($LASTEXITCODE -ne 0) {
  throw "codex exec failed."
}

Write-Step "Blank-template marker check"
$markerOutput = @(Select-String -Path $DocPath -Pattern $BlankTemplatePattern)
if ($markerOutput.Count -gt 0) {
  $markerOutput | ForEach-Object { Write-Host $_ }
  throw "Target record still contains blank-template markers."
}
Assert-MeaningfulResultMarker -Path $DocPath
Write-Host "PASS: no blank-template markers found."

Write-Step "Changed-file guard before gate-doc"
$allowedBeforeGate = @($NormalizedDocPath)
if ($IsImplementingAuto2) {
  $allowedBeforeGate += "scripts/v09-work-item-auto2.ps1"
  $allowedBeforeGate += "docs/$Auto2RecordId.md"
}
Assert-AllowedChangedFiles -AllowedPaths $allowedBeforeGate -Phase "before gate-doc"

Write-Step "Protect record in release gate"
& ".\scripts\gate-doc.ps1" $DocPath
if ($LASTEXITCODE -ne 0) {
  throw "gate-doc failed."
}

Write-Step "Run release check"
& ".\scripts\release-check.ps1"
if ($LASTEXITCODE -ne 0) {
  throw "release-check failed. Stop before push."
}

Write-Step "Changed-file guard after release-check"
$allowedFinal = @($NormalizedDocPath, "scripts/check-release-gate.mjs")
if ($IsImplementingAuto2) {
  $allowedFinal += "scripts/v09-work-item-auto2.ps1"
}
Assert-AllowedChangedFiles -AllowedPaths $allowedFinal -Phase "after release-check"

if (-not $Push) {
  Write-Step "STOP before push"
  Write-Host "Checks completed. Review final git status, then push with:"
  Write-Host ".\scripts\release-push.ps1 ""<commit message>"""
  Write-Host ""
  Write-Host "Or rerun AUTO2 with -Push -Commit ""<commit message>"" after confirming the status."
  git status --short
  exit 0
}

if (-not $Commit -or $Commit.Trim().Length -eq 0) {
  throw "-Push requires a non-empty -Commit message."
}

Write-Step "Release push"
& ".\scripts\release-push.ps1" $Commit
if ($LASTEXITCODE -ne 0) {
  throw "release-push failed."
}

Write-Step "DONE"
git status --short
git log --oneline --decorate -3
