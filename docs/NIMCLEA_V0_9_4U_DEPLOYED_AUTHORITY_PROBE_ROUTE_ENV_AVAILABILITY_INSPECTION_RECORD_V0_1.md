# v0.9-4U DEPLOYED AUTHORITY PROBE ROUTE ENV AVAILABILITY INSPECTION RECORD

## Record ID

NIMCLEA_V0_9_4U_DEPLOYED_AUTHORITY_PROBE_ROUTE_ENV_AVAILABILITY_INSPECTION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the deployed authority probe route/env availability inspection after v0.9-4T.

v0.9-4T classified the deployed authority probe 404 as a probe-route unavailable blocker.

This inspection checks whether the local source contains the protected probe route and whether the deployed Render runtime responds differently when called with the protected fixture query contract.

## Scope

Area:

- v0.9 runtime authority observability
- deployed authority probe route availability
- deployed rehearsal endpoint env gating
- protected probe query contract

Files / behavior inspected:

- backend/server.js
- GET /internal/rehearsal/authority-probe
- NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS
- AUTHORITY_PROBE_ALLOWED_CASE_IDS
- deployed Render runtime at https://nimclea-api.onrender.com

Runtime behavior changed:

- None.
- This is inspection only.
- No backend helper logic was changed.
- No frontend behavior was changed.
- No Supabase schema or RLS behavior was changed.

## Local Source Inspection

Local source contains the route and the env gate.

Observed local source markers:

- DEFAULT_AUTHORITY_PROBE_EMAIL exists.
- DEFAULT_AUTHORITY_PROBE_CASE_ID exists.
- AUTHORITY_PROBE_ALLOWED_CASE_IDS exists.
- NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS gate exists.
- GET /internal/rehearsal/authority-probe route exists.
- fixture email restriction exists.
- fixture case ID allowlist restriction exists.

Relevant local behavior:

- If NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS is not true, the route intentionally returns 404.
- If the route is enabled but the fixture email is invalid, it returns 400 fixture_email_required.
- If the route is enabled but the caseId is not allowlisted, it returns 400 fixture_case_id_required.
- If the route is enabled and the protected fixture query is valid, the route should proceed to Supabase authority availability checks.

## Deployed Bare Probe Result

Endpoint:

GET /internal/rehearsal/authority-probe

Observed deployed result:

STATUS: 404
ERROR: empty

## Deployed Protected Fixture Probe Result

Endpoint shape:

GET /internal/rehearsal/authority-probe?email=smoke%2Bcases-existing-001%40nimclea.test&caseId=00000000-0000-4000-8000-000000000024

Observed deployed result:

STATUS: 404
ERROR: empty

## Classification

Result:

- INSPECTION COMPLETE
- DEPLOYED PROBE AVAILABILITY NOT PROVEN

Current failure layer:

- route/env availability layer

Important distinction:

- This is still not proof that deployed Render lacks Supabase authority access.
- This is still not proof that the cases helper is wrong.
- This is still not schema contract drift.
- This is still not a frontend, payment, receipt, verification, or storage issue.

The deployed 404 can be explained by either:

1. NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS is not enabled in Render, causing the route to intentionally return 404.
2. The deployed runtime does not include/register the v0.9-4S route yet.
3. The deployed route path differs from the inspected source path.

Because the protected fixture query also returned 404, the request did not reach the later fixture guard responses or Supabase authority availability classification path.

## Decision / Change Summary

Do not patch cases lookup helper logic based on this result.

Do not classify Supabase deployed authority access as failed based on this result.

The next step should resolve the smallest route/env availability uncertainty before running the authority probe again.

Preferred next direction:

- v0.9-4V deployed authority probe enablement / route availability resolution candidate.

The candidate should decide whether the smallest safe next action is:

1. Enable NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true in Render for the protected rehearsal route, or
2. Add a narrow non-sensitive deployed route/version confirmation signal, or
3. Inspect Render deploy inclusion if the env is already enabled.

## Acceptance Criteria

This inspection record is complete when:

- The local source route/env gate inspection is documented.
- The deployed bare probe 404 is documented.
- The deployed protected fixture probe 404 is documented.
- The result is classified as route/env availability unresolved.
- The record explicitly does not claim Supabase authority failure.
- The next action is narrowed to route/env availability resolution.

## Validation

Commands / checks run:

- Local source Select-String inspection for authority-probe, NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS, AUTHORITY_PROBE_ALLOWED_CASE_IDS, and fixture_case_id_required.
- Deployed bare probe smoke.
- Deployed protected fixture probe smoke.

Observed result:

- Local source contains the route and safety guards.
- Deployed bare probe returned 404.
- Deployed protected fixture probe returned 404.

## Risk / Stop Line

Stop line:

- Do not treat the deployed 404 as proof that Supabase authority access is unavailable.
- Do not treat the deployed 404 as proof that getCaseRecordsByEmail is wrong.
- Do not patch cases helper logic based on this result.
- Do not expose arbitrary customer data through the probe.
- Do not broaden the probe beyond fixture-only / allowlisted-case-only access.
- Do not downgrade the blocker to WARN just to pass.
- Do not change payment, receipt, verification, storage, or frontend runtime behavior.

Allowed next step:

- Resolve deployed probe route/env availability only.

## Next Action

Next suitable work item:

- v0.9-4V deployed authority probe enablement / route availability resolution candidate.

Suggested focus:

- Confirm whether NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS is enabled in Render.
- If not enabled, enable only this protected rehearsal endpoint gate and re-test the protected fixture probe.
- If it is enabled, inspect deployed route registration / deploy inclusion.
- Only after the probe route returns a non-404 response should Supabase authority availability be classified.
