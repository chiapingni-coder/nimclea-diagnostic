param(
  [Parameter(Mandatory=$true)]
  [string]$DocPath
)

$ErrorActionPreference = "Stop"

$RepoPath = "E:\Nimclea_Products\diagnostic"
$GatePath = Join-Path $RepoPath "scripts\check-release-gate.mjs"

Set-Location $RepoPath

$NormalizedDocPath = $DocPath.Trim() -replace "\\", "/"
$NormalizedDocPath = $NormalizedDocPath.TrimStart("./")

if (-not $NormalizedDocPath.StartsWith("docs/")) {
  Write-Host ""
  Write-Host "FAILED: document path must start with docs/"
  Write-Host "Example:"
  Write-Host '.\scripts\gate-doc.ps1 "docs/NIMCLEA_AAC03_EXAMPLE_RECORD_V0_1.md"'
  exit 1
}

$FullDocPath = Join-Path $RepoPath ($NormalizedDocPath -replace "/", "\")

if (-not (Test-Path $FullDocPath)) {
  Write-Host ""
  Write-Host "FAILED: document does not exist:"
  Write-Host $FullDocPath
  exit 1
}

if (-not (Test-Path $GatePath)) {
  Write-Host ""
  Write-Host "FAILED: release gate file not found:"
  Write-Host $GatePath
  exit 1
}

$GateContent = Get-Content -Path $GatePath -Raw

if ($GateContent.Contains($NormalizedDocPath)) {
  Write-Host ""
  Write-Host "DONE: document is already protected in release gate:"
  Write-Host $NormalizedDocPath
  exit 0
}

$ArrayStartPattern = "const\s+requiredDocs\s*=\s*\["
$ArrayStartMatch = [regex]::Match($GateContent, $ArrayStartPattern)

if (-not $ArrayStartMatch.Success) {
  Write-Host ""
  Write-Host "FAILED: could not find requiredDocs array in:"
  Write-Host $GatePath
  exit 1
}

$SearchStart = $ArrayStartMatch.Index + $ArrayStartMatch.Length
$ArrayEndIndex = $GateContent.IndexOf("];", $SearchStart)

if ($ArrayEndIndex -lt 0) {
  Write-Host ""
  Write-Host "FAILED: could not find end of requiredDocs array."
  exit 1
}

$LineToInsert = "  '$NormalizedDocPath',"
$Prefix = $GateContent.Substring(0, $ArrayEndIndex).TrimEnd("`r", "`n", " ", "`t")
$Suffix = $GateContent.Substring($ArrayEndIndex).TrimStart("`r", "`n")
$UpdatedGateContent = "$Prefix`r`n$LineToInsert`r`n$Suffix"
$UpdatedGateContent = $UpdatedGateContent.TrimEnd("`r", "`n") + "`r`n"

[System.IO.File]::WriteAllText($GatePath, $UpdatedGateContent, [System.Text.UTF8Encoding]::new($true))

Write-Host ""
Write-Host "DONE: added document to release gate:"
Write-Host $NormalizedDocPath

Write-Host ""
Write-Host "Next recommended check:"
Write-Host ".\scripts\release-check.ps1"
