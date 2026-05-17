param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Email = "smoke+backend@nimclea.test",
  [string]$CaseId = ""
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Nimclea backend smoke ==="

Write-Host ""
Write-Host "Base URL:"
Write-Host $BaseUrl

Write-Host ""
Write-Host "Email:"
Write-Host $Email

$Passed = 0
$Failed = 0
$Skipped = 0

function Test-Endpoint {
  param(
    [string]$Name,
    [string]$Url,
    [int[]]$AllowedStatusCodes = @(200)
  )

  Write-Host ""
  Write-Host "Checking: $Name"
  Write-Host $Url

  try {
    $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing
    $statusCode = [int]$response.StatusCode

    if ($AllowedStatusCodes -contains $statusCode) {
      Write-Host "PASS: $Name returned HTTP $statusCode"
      return $true
    }

    Write-Host "FAIL: $Name returned HTTP $statusCode"
    return $false
  }
  catch {
    $statusCode = $null

    if ($_.Exception.Response -ne $null) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    if ($statusCode -ne $null -and ($AllowedStatusCodes -contains $statusCode)) {
      Write-Host "PASS: $Name returned expected HTTP $statusCode"
      return $true
    }

    Write-Host "FAIL: $Name request failed."
    Write-Host $_.Exception.Message
    return $false
  }
}

$EncodedEmail = [uri]::EscapeDataString($Email)

$TrialStatusUrl = "$BaseUrl/trial-status?email=$EncodedEmail"
if (Test-Endpoint -Name "trial-status endpoint" -Url $TrialStatusUrl -AllowedStatusCodes @(200)) {
  $Passed++
} else {
  $Failed++
}

$CasesUrl = "$BaseUrl/cases?email=$EncodedEmail"
if (Test-Endpoint -Name "cases by email endpoint" -Url $CasesUrl -AllowedStatusCodes @(200)) {
  $Passed++
} else {
  $Failed++
}

if ($CaseId.Trim().Length -gt 0) {
  $CaseUrl = "$BaseUrl/case/$CaseId"
  if (Test-Endpoint -Name "case detail endpoint" -Url $CaseUrl -AllowedStatusCodes @(200)) {
    $Passed++
  } else {
    $Failed++
  }
} else {
  Write-Host ""
  Write-Host "SKIP: case detail endpoint because no CaseId was provided."
  $Skipped++
}

Write-Host ""
Write-Host "=== Backend smoke summary ==="
Write-Host "PASS: $Passed"
Write-Host "FAIL: $Failed"
Write-Host "SKIP: $Skipped"

if ($Failed -gt 0) {
  Write-Host ""
  Write-Host "FAILED: backend smoke found problems."
  Write-Host "Make sure the backend is running, then rerun this script."
  exit 1
}

Write-Host ""
Write-Host "DONE: backend smoke completed."