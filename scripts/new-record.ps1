param(
  [Parameter(Mandatory=$true, Position=0)]
  [string]$Name,

  [Parameter(Mandatory=$false, Position=1)]
  [string]$Slug,

  [Parameter(Mandatory=$false, Position=2)]
  [string]$Title
)

$ErrorActionPreference = "Stop"
$RepoPath = "E:\Nimclea_Products\diagnostic"
$DocsPath = Join-Path $RepoPath "docs"
Set-Location $RepoPath

if (-not (Test-Path $DocsPath)) {
  New-Item -ItemType Directory -Path $DocsPath | Out-Null
}

$UsingOneArgMode = [string]::IsNullOrWhiteSpace($Slug) -and [string]::IsNullOrWhiteSpace($Title)

if ($UsingOneArgMode) {
  $CleanStem = $Name.Trim() -replace "\.md$", ""
  $CleanStem = $CleanStem.ToUpper() -replace "[^A-Z0-9_]+", "_"
  $CleanStem = $CleanStem.Trim("_")
  if (-not $CleanStem.StartsWith("NIMCLEA_")) { $CleanStem = "NIMCLEA_$CleanStem" }
  if (-not $CleanStem.EndsWith("_V0_1")) { $CleanStem = "${CleanStem}_V0_1" }
  $FileName = "${CleanStem}.md"
  $RecordId = $CleanStem
  $DocTitle = ($CleanStem -replace "^NIMCLEA_", "" -replace "_V0_1$", "" -replace "_", " ")
} elseif (-not [string]::IsNullOrWhiteSpace($Slug) -and -not [string]::IsNullOrWhiteSpace($Title)) {
  $CleanCode = $Name.Trim().ToUpper()
  $CleanSlug = $Slug.Trim().ToUpper() -replace "[^A-Z0-9]+", "_"
  $CleanSlug = $CleanSlug.Trim("_")
  $FileName = "NIMCLEA_${CleanCode}_${CleanSlug}_V0_1.md"
  $RecordId = $CleanCode
  $DocTitle = $Title
} else {
  Write-Host ""
  Write-Host "FAILED: use either one full document stem, or all three arguments: Code Slug Title"
  exit 1
}

$FilePath = Join-Path $DocsPath $FileName
if (Test-Path $FilePath) {
  Write-Host ""
  Write-Host "FAILED: document already exists:"
  Write-Host $FilePath
  exit 1
}

$Today = Get-Date -Format "yyyy-MM-dd"

$DocLines = @(
  "# $DocTitle",
  "",
  "## Record ID",
  "",
  "$RecordId",
  "",
  "## Date",
  "",
  "$Today",
  "",
  "## Purpose",
  "",
  "This record documents the decision, implementation, rehearsal, or validation result for this Nimclea work item.",
  "",
  "## Scope",
  "",
  "- Area:",
  "- Files inspected:",
  "- Files changed:",
  "- Runtime behavior affected:",
  "",
  "## Decision / Change Summary",
  "",
  "-",
  "",
  "## Acceptance Criteria",
  "",
  "-",
  "",
  "## Validation",
  "",
  "Commands / checks run:",
  "",
  "``````powershell",
  "``````",
  "",
  "Result:",
  "",
  "-",
  "",
  "## Risk / Stop Line",
  "",
  "-",
  "",
  "## Next Action",
  "",
  "-"
)

Set-Content -Path $FilePath -Value $DocLines -Encoding UTF8

Write-Host ""
Write-Host "Created:"
Write-Host ""
Write-Host "  - docs/$FileName"
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Fill the record."
Write-Host "  2. Run scripts/gate-doc.ps1 to protect it."
Write-Host "  3. Run scripts/release-check.ps1."
