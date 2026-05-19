param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [string]$Kind = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Path)) {
  throw "AUTO2B small-fix target does not exist: $Path"
}

$ResolvedPath = (Resolve-Path $Path).Path
$Text = Get-Content -Path $ResolvedPath -Raw

$GitStatus = @(git status --short)
$ChangedFiles = @()

foreach ($Line in $GitStatus) {
  if ($Line.Length -ge 4) {
    $ChangedFiles += $Line.Substring(3).Trim()
  }
}

$ChangedFiles = @($ChangedFiles | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$RuntimeFiles = @($ChangedFiles | Where-Object { $_ -match '^(frontend|backend|supabase)[/\\]' })

if ($ChangedFiles.Count -eq 0) {
  $ChangedText = "current AUTO2 target record only; no additional git changes detected when AUTO2B small-fix ran"
} else {
  $ChangedText = ($ChangedFiles -join "; ")
}

$RuntimeText = ($RuntimeFiles -join "; ")

$HasRuntimeFiles = $RuntimeFiles.Count -gt 0

if ($Text -match '(?m)^- Files inspected:\s*$') {
  if ($HasRuntimeFiles) {
    throw "AUTO2B small-fix stopped: Files inspected is blank while runtime files changed: $RuntimeText"
  }

  $Text = $Text -replace '(?m)^- Files inspected:\s*$',
    '- Files inspected: AUTO2 prompt/context, current target record, current git status, and release gate protection state; no runtime files were changed when AUTO2B small-fix filled this deterministic field.'
}

if ($Text -match '(?m)^- Files changed:\s*$') {
  if ($HasRuntimeFiles) {
    throw "AUTO2B small-fix stopped: Files changed is blank while runtime files changed: $RuntimeText"
  }

  $Text = $Text -replace '(?m)^- Files changed:\s*$',
    "- Files changed: $ChangedText."
}

if ($Text -match '(?m)^- Runtime behavior affected:\s*$') {
  if ($HasRuntimeFiles) {
    throw "AUTO2B small-fix stopped: Runtime behavior affected is blank while runtime files changed: $RuntimeText"
  }

  $Text = $Text -replace '(?m)^- Runtime behavior affected:\s*$', '- Runtime behavior affected: none.'
}

#
# AUTO2B markdown spacing cleanup
#
$Text = $Text -replace "(?m)^(- Runtime behavior affected: none\.)\r?\n(## )", "`$1`r`n`r`n`$2"

$Text = $Text.TrimEnd("`r", "`n") + "`r`n"

[System.IO.File]::WriteAllText(
  $ResolvedPath,
  $Text,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "DONE: AUTO2B small-fix completed for $Path"

