param(
  [string]$Url = "https://nimclea-api.onrender.com/",
  [string]$ExpectedStatus = "Nimclea Diagnostic API running"
)

Write-Host ""
Write-Host "=== Nimclea Render alive check ==="
Write-Host "URL: $Url"

try {
  $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 30
  $actualStatus = $response.status

  Write-Host "Returned status: $actualStatus"

  if ($actualStatus -eq $ExpectedStatus) {
    Write-Host "PASS: Render API is alive"
    exit 0
  }

  Write-Host "FAIL: Render API returned unexpected status"
  Write-Host "Expected: $ExpectedStatus"
  Write-Host "Actual:   $actualStatus"
  exit 1
}
catch {
  Write-Host "FAIL: Render API alive check failed"
  Write-Host $_.Exception.Message
  exit 1
}
