# v0.9-4T DEPLOYED AUTHORITY PROBE UNAVAILABLE BLOCKER RECORD

## Record ID

NIMCLEA_V0_9_4T_DEPLOYED_AUTHORITY_PROBE_UNAVAILABLE_BLOCKER_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the deployed authority probe unavailable blocker observed after v0.9-4S.

v0.9-4S added a protected, read-only deployed authority availability probe route:

GET /internal/rehearsal/authority-probe

The intended purpose of the route is to prove whether deployed Render runtime has Supabase authority access before further runtime helper patches.

A deployed smoke against the route returned 404, so the probe is currently unavailable in deployed runtime.

## Scope

Area:

- v0.9 runtime authority observability
- deployed Render authority availability proof
- protected rehearsal/probe route availability

Files / behavior involved:

- backend/server.js
- GET /internal/rehearsal/authority-probe
- Render deployed runtime
- Supabase authority availability proof path

Runtime behavior affected:

- No new runtime behavior is changed by this record.
- This record only classifies the observed deployed probe unavailability blocker.

## Observed Result

Command used:

try {
  Invoke-RestMethod "https://nimclea-api.onrender.com/internal/rehearsal/authority-probe" | ConvertTo-Json -Depth 20
} catch {
  Write-Host "STATUS:" $_.Exception.Response.StatusCode.value__
  Write-Host "ERROR:" $_.ErrorDetails.Message
}

Observed deployed result:

STATUS: 404
ERROR:

## Classification

Result:

- BLOCKER CLASSIFIED

Blocker type:

- Deployed authority probe unavailable

Important distinction:

- This is not yet proof that Supabase authority access is unavailable in Render.
- This is proof that the deployed probe route is unavailable at the requested path.
- The current failure layer is route availability / deployment / rehearsal endpoint enablement, not schema contract drift and not helper logic.

## Decision / Change Summary

The deployed authority availability proof path cannot continue until the probe route is reachable.

Do not continue patching case lookup helper logic based on this 404.

The next work item should inspect the smallest possible causes:

1. Whether the deployed Render build includes the v0.9-4S route change.
2. Whether the route is registered in the actual deployed server path.
3. Whether NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS is enabled in Render.
4. Whether the route path or guard condition differs from the smoke command.
5. Whether a protected query shape is required before the route responds with anything other than 404.

## Acceptance Criteria

This blocker record is complete when:

- The 404 deployed authority probe result is documented.
- The failure is classified as probe-route unavailable, not Supabase unavailable.
- The stop line prevents further helper/schema patches until route availability is proven.
- The next action is narrowed to deployed probe route/env inspection.

## Validation

Commands / checks run:

- Deployed Invoke-RestMethod smoke against GET /internal/rehearsal/authority-probe.

Result:

- STATUS: 404
- ERROR: empty

## Risk / Stop Line

Stop line:

- Do not treat this as proof that Render lacks Supabase access.
- Do not treat this as proof that the cases helper is still wrong.
- Do not downgrade this to WARN just to pass.
- Do not expose arbitrary customer data through a diagnostic route.
- Do not add broad public probe access.
- Do not change payment, receipt, verification, storage, or frontend runtime behavior.

Allowed next step:

- Inspect and fix the narrow deployed probe availability path only.

## Next Action

Next suitable work item:

- v0.9-4U deployed authority probe route/env availability inspection.

Suggested focus:

- Confirm whether NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS is enabled in Render.
- Confirm whether the deployed server includes the v0.9-4S route.
- Confirm the exact protected route contract and required query parameters.
- Only after route availability is proven should the authority probe be used to classify Supabase deployed access.
