[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [string]$Id,

  [ValidateSet("candidate","closure","inspection","smoke","implementation","boundary","template","record")]
  [string]$Kind = "record",

  [Parameter(Mandatory=$true)]
  [string]$Area,

  [Parameter(Mandatory=$true)]
  [string]$Purpose,

  [string]$Decision = "",
  [string]$Result = "",
  [string]$NextStep = "",

  [string[]]$FilesInspected = @("none"),
  [string[]]$FilesChanged = @("documentation only"),

  [string]$RuntimeBehaviorAffected = "none",

  [switch]$Force
)

$ErrorActionPreference = "Stop"

$RepoRoot = Get-Location
$DocsDir = Join-Path $RepoRoot "docs"

if (-not (Test-Path $DocsDir)) {
  throw "docs directory not found. Run this script from the repo root."
}

$DocPath = Join-Path $DocsDir "$Id.md"

if ((Test-Path $DocPath) -and -not $Force) {
  throw "Document already exists: $DocPath. Use -Force only after reviewing the existing file."
}

function Convert-Items {
  param([string[]]$Items)

  if (-not $Items -or $Items.Count -eq 0) {
    return "- none"
  }

  return ($Items | ForEach-Object { "- $_" }) -join [Environment]::NewLine
}

function Value-OrDefault {
  param(
    [string]$Value,
    [string]$Default
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $Default
  }

  return $Value.Trim()
}

$Today = Get-Date -Format "yyyy-MM-dd"
$Title = ($Id -replace "_", " ").Trim()

$DecisionText = Value-OrDefault $Decision "No decision inferred by this helper."
$ResultText = Value-OrDefault $Result "RECORDED. No runtime claim is made by this template helper."
$NextText = Value-OrDefault $NextStep "Select the next work item manually using current-state judgment."

$DocLines = @(
  "# $Title",
  "",
  "## Record ID",
  "",
  $Id,
  "",
  "## Date",
  "",
  $Today,
  "",
  "## Purpose",
  "",
  $Purpose.Trim(),
  "",
  "## Scope",
  "",
  "- Area: $($Area.Trim())",
  "- Kind: $Kind",
  "- Files inspected:",
  (Convert-Items $FilesInspected),
  "- Files changed:",
  (Convert-Items $FilesChanged),
  "- Runtime behavior affected: $RuntimeBehaviorAffected",
  "",
  "## Mode C Boundary",
  "",
  "Mode C terminal template helper may format explicit user-provided facts into a standard record.",
  "",
  "It must not infer PASS/FAIL, invent smoke evidence, select schema direction, modify runtime behavior, or push changes by itself.",
  "",
  "## Explicit Decision / Direction",
  "",
  $DecisionText,
  "",
  "## Result",
  "",
  $ResultText,
  "",
  "## Next Recommended Step",
  "",
  $NextText,
  "",
  "## EOF",
  "",
  "EOF"
)

Set-Content -Path $DocPath -Value $DocLines -Encoding UTF8

Write-Host "DONE: created Mode C template record:"
Write-Host $DocPath
