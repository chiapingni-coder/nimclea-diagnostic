# v0.9-4W DEPLOYED PROTECTED AUTHORITY PROBE ENABLEMENT EXECUTION SMOKE RECORD

## Record ID

NIMCLEA_V0_9_4W_DEPLOYED_PROTECTED_AUTHORITY_PROBE_ENABLEMENT_EXECUTION_SMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the deployed protected authority probe enablement execution / smoke result after v0.9-4V.

v0.9-4V selected the next smallest action as deployed route/env availability resolution:

- inspect / enable NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true in Render
- redeploy / restart the backend service
- re-test the protected fixture authority probe

This record captures the observed protected fixture probe result.

## Scope

Area:

- v0.9 runtime authority observability
- deployed protected authority probe
- Render route/env availability smoke

Runtime behavior changed by this record:

- None.
- This is a smoke record only.
- No backend helper logic was changed.
- No frontend behavior was changed.
- No Supabase schema, RLS, storage, payment, receipt, or verification behavior was changed.

## Smoke Command Summary

Protected fixture probe URL:

https://nimclea-api.onrender.com/internal/rehearsal/authority-probe?email=smoke%2Bcases-existing-001%40nimclea.test&caseId=00000000-0000-4000-8000-000000000024

## Observed Result

Observed deployed result:

STATUS: 404
ERROR: empty

## Classification

Result:

- FAIL

Failure type:

- deployed protected authority probe still unavailable

Current likely layer:

- route registration / deployed inclusion / Render env activation layer

Important distinction:

- This is still not proof that deployed Render lacks Supabase authority access.
- This is still not proof that getCaseRecordsByEmail is wrong.
- This is still not schema contract drift.
- This is still not frontend, payment, receipt, verification, or storage failure.

The protected fixture probe still returned 404, so the route did not reach:

- fixture_email_required guard
- fixture_case_id_required guard
- Supabase authority availability check
- backend helper execution path

## Decision / Change Summary

Do not patch backend helper logic based on this 404.

Do not patch Supabase schema based on this 404.

The next step should inspect whether the deployed runtime actually includes and registers the authority probe route, and whether the Render environment gate is active in the deployed service.

## Acceptance Criteria

This record is complete when:

- The protected fixture probe result is documented.
- The result is classified as FAIL / deployed protected probe still unavailable.
- The record explicitly avoids claiming Supabase authority failure.
- The next action is narrowed to route registration / deployed inclusion inspection.

## Validation

Commands / checks run:

- Protected fixture deployed authority probe smoke.

Result:

- STATUS: 404
- ERROR: empty

## Risk / Stop Line

Stop line:

- Do not treat this 404 as proof that Supabase authority access is unavailable.
- Do not treat this 404 as proof that backend helper logic is wrong.
- Do not treat this 404 as schema contract drift.
- Do not broaden the probe to arbitrary customer emails or arbitrary case IDs.
- Do not change payment, receipt, verification, storage, or frontend runtime behavior.
- Do not continue to helper/schema patches until route registration / deployed inclusion is inspected.

Allowed next step:

- v0.9-4X route registration / deployed inclusion inspection.

## Next Action

Next suitable work item:

- v0.9-4X route registration / deployed inclusion inspection.

Suggested focus:

- Confirm whether deployed backend/server.js includes the authority probe route.
- Confirm whether Render deployed the commit containing v0.9-4S.
- Confirm whether NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS is active in the deployed runtime.
- Confirm whether the route is registered before catch-all or fallback handling.