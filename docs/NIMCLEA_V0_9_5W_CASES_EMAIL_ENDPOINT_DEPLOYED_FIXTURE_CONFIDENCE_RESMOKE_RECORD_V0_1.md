# v0.9-5W CASES EMAIL ENDPOINT DEPLOYED FIXTURE CONFIDENCE RESMOKE RECORD

## Record ID

NIMCLEA_V0_9_5W_CASES_EMAIL_ENDPOINT_DEPLOYED_FIXTURE_CONFIDENCE_RESMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record captures the deployed fixture-only `/cases?email=` confidence re-smoke after v0.9-5V implemented the clean authority final assembly promotion marker path.

Prior evidence:

- v0.9-5H protected authority probe PASS proved deployed clean authority access.
- v0.9-5O aligned helper-scoped rows inside `loadSupabaseCaseSourcesForEmail(...)`.
- v0.9-5T identified the final assembly / durable candidate promotion drop point.
- v0.9-5U selected the clean authority final assembly promotion candidate.
- v0.9-5V implemented the marker-based final assembly promotion path in `backend/server.js`.

This v0.9-5W smoke checks whether the deployed public `/cases?email=` endpoint now returns expected fixture case evidence for:

- `smoke+cases-existing-001@nimclea.test`

Expected fixture case IDs:

- `00000000-0000-4000-8000-000000009401`
- `00000000-0000-4000-8000-000000000024`

## Scope

- Area: Deployed public `/cases?email=` fixture confidence re-smoke.
- Files inspected: deployed endpoint response only.
- Files changed: this v0.9-5W re-smoke record only.
- Runtime behavior affected: none in this record; smoke evidence only.
- Endpoint inspected: `GET https://nimclea-api.onrender.com/cases?email=smoke%2Bcases-existing-001%40nimclea.test`
- Runtime target: deployed Render backend.
- Fixture-only scope: yes.
- Supabase Storage: not included.
- Payment / receipt / verification / frontend: not included.
- Runtime code change in this record: none.
- Schema change: none.
- RLS / permission change: none.
- Secret exposure: none.

## Decision / Change Summary

Result:

- FAIL / BLOCKER CLASSIFIED.

Observed deployed response after v0.9-5V:

- HTTP status: 200.
- Raw backend response: `[]`.
- Raw content length: 2.
- Found expected case IDs: none.
- Missing expected case IDs:
  - `00000000-0000-4000-8000-000000009401`
  - `00000000-0000-4000-8000-000000000024`

Conclusion:

- Deployed public `/cases?email=` endpoint confidence is still not established after v0.9-5V.
- This is not a route availability failure because the endpoint returned HTTP 200.
- This is not a response wrapper issue because the raw backend response is `[]`.
- This record does not prove the v0.9-5V code is wrong.
- The next likely layer is deployed runtime reflection, route-specific instrumentation, final assembly observability, or a protected public-route diagnostic probe.

## Acceptance Criteria

PASS would require:

- Deployed endpoint returns HTTP 200.
- Raw response contains fixture evidence for `smoke+cases-existing-001@nimclea.test`.
- Response contains expected case ID `00000000-0000-4000-8000-000000009401`.
- Response contains expected case ID `00000000-0000-4000-8000-000000000024`.
- Smoke remains read-only and fixture-only.

Actual result:

- HTTP 200: PASS.
- Raw response is `[]`: FAIL.
- Expected case ID `00000000-0000-4000-8000-000000009401` present: FAIL.
- Expected case ID `00000000-0000-4000-8000-000000000024` present: FAIL.
- Overall deployed endpoint confidence: FAIL.

## Validation

Commands / checks run:

```powershell
$Email = "smoke+cases-existing-001@nimclea.test"
$EncodedEmail = [System.Uri]::EscapeDataString($Email)
$Url = "https://nimclea-api.onrender.com/cases?email=$EncodedEmail"

$ExpectedCaseIds = @(
  "00000000-0000-4000-8000-000000009401",
  "00000000-0000-4000-8000-000000000024"
)

$Response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing
$BodyText = $Response.Content

try {
  $Body = $BodyText | ConvertFrom-Json
} catch {
  $Body = $null
}

$BodyJson = if ($Body -ne $null) {
  $Body | ConvertTo-Json -Depth 40
} else {
  $BodyText
}

$FoundCaseIds = @()
foreach ($Id in $ExpectedCaseIds) {
  if ($BodyJson -match [regex]::Escape($Id)) {
    $FoundCaseIds += $Id
  }
}

[pscustomobject]@{
  ok = $true
  status = $Response.StatusCode
  url = $Url
  fixtureEmail = $Email
  expectedCaseIds = $ExpectedCaseIds
  foundCaseIds = $FoundCaseIds
  missingCaseIds = @($ExpectedCaseIds | Where-Object { $_ -notin $FoundCaseIds })
  rawContentLength = $BodyText.Length
  rawContent = $BodyText
  parsedBody = $Body
} | ConvertTo-Json -Depth 40
```

Observed sanitized output:

```json
{
  "ok": true,
  "status": 200,
  "url": "https://nimclea-api.onrender.com/cases?email=smoke%2Bcases-existing-001%40nimclea.test",
  "fixtureEmail": "smoke+cases-existing-001@nimclea.test",
  "expectedCaseIds": [
    "00000000-0000-4000-8000-000000009401",
    "00000000-0000-4000-8000-000000000024"
  ],
  "foundCaseIds": [],
  "missingCaseIds": [
    "00000000-0000-4000-8000-000000009401",
    "00000000-0000-4000-8000-000000000024"
  ],
  "rawContentLength": 2,
  "rawContent": "[]",
  "parsedBody": {
    "value": [],
    "Count": 0
  }
}
```

Important note:

- `parsedBody` appears as `{ "value": [], "Count": 0 }` because PowerShell wraps an empty JSON array during conversion.
- The raw backend response is `[]`.
- Therefore the blocker is not a wrapper-shape issue.

## Risk / Stop Line

Stop line:

- Do not patch runtime inside this smoke record.
- Do not alter Supabase schema, RLS, grants, service role keys, payment, receipt, verification, frontend, or storage behavior as part of this record.
- Do not downgrade missing fixture evidence to WARN.
- Do not claim deployed public `/cases?email=` confidence until expected fixture case IDs are returned.
- Do not assume v0.9-5V is wrong without inspecting deployed runtime reflection and final assembly observability.
- Do not read or expose production customer data.

## Next Action

Next suitable work item:

- v0.9-5X deployed `/cases?email=` post-5V runtime reflection / final assembly observability candidate.

Suggested focus:

- Confirm whether Render deployed runtime reflects commit `05cbacc`.
- Confirm whether public `/cases?email=` is executing the v0.9-5V marker path.
- Add or reuse a protected fixture-only diagnostic probe if needed.
- Inspect whether `supabaseSources.cases`, `_emailScopedByCleanAuthority`, `candidateMap`, `finalCaseMap`, and `finalCases` are populated in deployed runtime.
- Keep probe output sanitized:
  - counts
  - case IDs from allowlisted fixture IDs only
  - booleans for marker presence
  - no production customer data
- Select the next smallest blocker before another runtime fix.

Not included:

- No runtime code change.
- No schema change.
- No RLS / permission change.
- No Supabase Storage change.
- No payment / receipt / verification / frontend change.
- No production customer data read.