# v0.9-4V DEPLOYED AUTHORITY PROBE ENABLEMENT ROUTE AVAILABILITY RESOLUTION CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_4V_DEPLOYED_AUTHORITY_PROBE_ENABLEMENT_ROUTE_AVAILABILITY_RESOLUTION_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the selected resolution candidate for the deployed authority probe route/env availability blocker.

v0.9-4T classified the deployed authority probe 404 as a probe-route unavailable blocker.

v0.9-4U inspected the local source and deployed runtime behavior:

- Local backend/server.js contains GET /internal/rehearsal/authority-probe.
- Local backend/server.js contains the NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS gate.
- Local backend/server.js contains fixture email restriction.
- Local backend/server.js contains explicit allowlisted caseId restriction.
- Deployed bare probe returned 404.
- Deployed protected fixture probe returned 404.

Therefore, deployed probe availability is not yet proven.

## Scope

Area:

- v0.9 runtime authority observability
- deployed authority probe enablement
- Render route/env availability
- protected rehearsal endpoint availability

Files / behavior involved:

- backend/server.js
- GET /internal/rehearsal/authority-probe
- NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS
- Render deployed runtime

Runtime behavior changed by this record:

- None.
- This is candidate only.
- No backend code is changed.
- No frontend code is changed.
- No Supabase schema, RLS, storage, payment, receipt, or verification behavior is changed.

## Prior Evidence

v0.9-4U local source inspection showed:

- DEFAULT_AUTHORITY_PROBE_EMAIL exists.
- DEFAULT_AUTHORITY_PROBE_CASE_ID exists.
- AUTHORITY_PROBE_ALLOWED_CASE_IDS exists.
- NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS gate exists.
- GET /internal/rehearsal/authority-probe route exists.
- fixture email restriction exists.
- fixture case ID allowlist restriction exists.

v0.9-4U deployed smoke showed:

- Bare deployed probe returned 404.
- Protected fixture deployed probe also returned 404.

## Candidate Decision

Selected candidate:

- First resolve deployed route/env availability before any further backend helper or schema work.

Preferred smallest action:

1. Inspect Render environment settings for the deployed Nimclea API service.
2. Confirm whether NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS exists and is set to true.
3. If the env var is missing or false, set NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true in Render for the backend service.
4. Let Render redeploy or restart the service.
5. Re-test only the protected fixture authority probe route.
6. Classify the result based on the new deployed response.

Why this candidate is selected:

- Local source already contains the route.
- Local source intentionally returns 404 when rehearsal endpoints are disabled.
- The deployed route returns 404 even with a valid protected fixture query.
- Therefore the smallest unresolved uncertainty is deployed env gate / route availability, not Supabase authority access.

## Expected Follow-Up Probe

After route/env enablement or confirmation, the protected fixture probe should be re-run with:

GET /internal/rehearsal/authority-probe?email=smoke%2Bcases-existing-001%40nimclea.test&caseId=00000000-0000-4000-8000-000000000024

Expected interpretation:

- 200 means the route is reachable and can classify deployed Supabase authority availability.
- 400 means the route is reachable but the fixture query contract needs correction.
- 404 means route/env availability is still not proven.
- 5xx means the route is reachable but runtime authority probe execution failed and needs separate classification.

## Non-Selected Actions

Do not do these in this candidate:

- Do not patch getCaseRecordsByEmail.
- Do not patch /cases lookup logic.
- Do not change Supabase schema.
- Do not change RLS or grants.
- Do not change frontend behavior.
- Do not change payment, receipt, verification, or storage behavior.
- Do not broaden the authority probe to arbitrary emails or arbitrary case IDs.
- Do not downgrade the deployed 404 to WARN.

## Acceptance Criteria

This candidate record is complete when:

- The selected candidate is recorded as route/env availability resolution.
- The record states that local route source exists.
- The record states that deployed protected fixture probe still returned 404.
- The record selects Render env/route availability as the next smallest uncertainty.
- The record explicitly rejects backend helper/schema patches at this step.
- The record defines the next follow-up probe and interpretation rules.

## Validation

Commands / checks already run in prior step:

- Local source inspection for authority-probe route and env gate.
- Deployed bare probe smoke.
- Deployed protected fixture probe smoke.

Result from prior inspection:

- Local source contains the route and safety guards.
- Deployed bare probe returned 404.
- Deployed protected fixture probe returned 404.

This record adds no new runtime validation.

## Risk / Stop Line

Stop line:

- Do not treat the current 404 as proof that Supabase authority access is unavailable.
- Do not treat the current 404 as proof that backend helper logic is wrong.
- Do not treat the current 404 as schema contract drift.
- Do not expose customer data through the probe.
- Do not remove fixture-only restrictions.
- Do not add public unrestricted diagnostic access.
- Do not proceed to helper/schema patches until the deployed probe route returns a non-404 response or Render route inclusion is otherwise proven.

Allowed next step:

- v0.9-4W deployed protected authority probe enablement execution / smoke record.

## Next Action

Next suitable work item:

- v0.9-4W deployed protected authority probe enablement execution / smoke record.

Suggested execution focus:

- Check Render service env.
- Enable NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true if missing or false.
- Re-test the protected fixture probe.
- Record the result without changing backend helper logic.