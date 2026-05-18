# v0.9-5P CASES EMAIL ENDPOINT DEPLOYED FIXTURE CONFIDENCE RESMOKE RECORD

## Record ID

NIMCLEA_V0_9_5P_CASES_EMAIL_ENDPOINT_DEPLOYED_FIXTURE_CONFIDENCE_RESMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record captures the deployed fixture-only `/cases?email=` confidence re-smoke after v0.9-5O implemented the public cases email clean authority helper alignment.

Prior evidence:

- v0.9-5H protected authority probe PASS proved deployed clean authority helper access.
- v0.9-5K public `/cases?email=` smoke returned HTTP 200 but `Count 0`.
- v0.9-5M identified the likely public route post-helper filtering path.
- v0.9-5N selected the helper alignment candidate.
- v0.9-5O implemented the narrow helper success path alignment in `backend/server.js`.

This v0.9-5P smoke checks whether the deployed Render runtime now returns expected fixture case evidence for:

- `smoke+cases-existing-001@nimclea.test`

Expected fixture case IDs:

- `00000000-0000-4000-8000-000000009401`
- `00000000-0000-4000-8000-000000000024`

## Scope

- Area: Deployed public `/cases?email=` fixture confidence re-smoke.
- Files inspected: deployed endpoint response only.
- Files changed: this v0.9-5P re-smoke record only.
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

Observed deployed response after v0.9-5O:

- HTTP status: 200.
- Response body: `{ "value": [], "Count": 0 }`.
- Found expected case IDs: none.
- Missing expected case IDs:
  - `00000000-0000-4000-8000-000000009401`
  - `00000000-0000-4000-8000-000000000024`

Conclusion:

- Deployed public `/cases?email=` endpoint confidence is still not established after v0.9-5O.
- This is not a route availability failure because the endpoint returned HTTP 200.
- This record does not prove the v0.9-5O code is wrong.
- The next likely layer is deployed runtime reflection, route inclusion, response shape compatibility, wrapper normalization, or another public `/cases?email=` path still returning empty data.

## Acceptance Criteria

PASS would require:

- Deployed endpoint returns HTTP 200.
- Response contains fixture evidence for `smoke+cases-existing-001@nimclea.test`.
- Response contains expected case ID `00000000-0000-4000-8000-000000009401`.
- Response contains expected case ID `00000000-0000-4000-8000-000000000024`.
- Smoke remains read-only and fixture-only.

Actual result:

- HTTP 200: PASS.
- Expected case ID `00000000-0000-4000-8000-000000009401` present: FAIL.
- Expected case ID `00000000-0000-4000-8000-000000000024` present: FAIL.
- Response count: 0.
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
$Body = $BodyText | ConvertFrom-Json

$BodyJson = $Body | ConvertTo-Json -Depth 30

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
  rawSanitizedBody = $Body
} | ConvertTo-Json -Depth 30
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
  "rawSanitizedBody": {
    "value": [],
    "Count": 0
  }
}
```

Result:

- Endpoint reachable: yes.
- Endpoint confidence established: no.
- Fixture-only scope: preserved.
- Read-only scope: preserved.

## Risk / Stop Line

Stop line:

- Do not patch runtime inside this smoke record.
- Do not alter Supabase schema, RLS, grants, service role keys, payment, receipt, verification, frontend, or storage behavior as part of this record.
- Do not downgrade missing fixture evidence to WARN.
- Do not claim deployed public `/cases?email=` confidence until expected fixture case IDs are returned.
- Do not assume v0.9-5O is wrong without inspecting deployed runtime reflection and route inclusion.
- Do not read or expose production customer data.

## Next Action

Next suitable work item:

- v0.9-5Q deployed runtime reflection / public route inclusion inspection candidate.

Suggested focus:

- Confirm whether Render deployed runtime has picked up commit `169bbeb`.
- Confirm whether public `/cases?email=` is executing the patched `loadSupabaseCaseSourcesForEmail(...)` logic.
- Compare deployed public route behavior against protected authority probe behavior.
- Inspect response shape compatibility, including whether deployed route returns an array directly or a `{ value, Count }` wrapper through a client or proxy layer.
- Identify whether the remaining issue is deploy reflection, route inclusion, response assembly, final candidate map assembly, durable candidate promotion, or another filter after `loadSupabaseCaseSourcesForEmail(...)`.

Not included:

- No runtime code change.
- No schema change.
- No RLS / permission change.
- No Supabase Storage change.
- No payment / receipt / verification / frontend change.
- No production customer data read.