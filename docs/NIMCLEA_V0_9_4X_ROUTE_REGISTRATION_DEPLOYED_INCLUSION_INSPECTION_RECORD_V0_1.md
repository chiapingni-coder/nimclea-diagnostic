# v0.9-4X ROUTE REGISTRATION DEPLOYED INCLUSION INSPECTION RECORD

## Record ID

NIMCLEA_V0_9_4X_ROUTE_REGISTRATION_DEPLOYED_INCLUSION_INSPECTION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the route registration / deployed inclusion inspection after v0.9-4W.

v0.9-4W showed that the protected deployed authority probe still returned 404.

This inspection checks whether that 404 means:

- the route is not deployed / not registered, or
- the route is deployed and intentionally returning 404 because the rehearsal env gate is not active.

## Scope

Area:

- v0.9 runtime authority observability
- deployed route registration
- deployed route inclusion
- rehearsal endpoint env gate behavior

Files / behavior inspected:

- backend/server.js
- GET /internal/rehearsal/authority-probe
- NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS
- Render deployed runtime
- deployed response body

Runtime behavior changed by this record:

- None.
- This is inspection only.
- No backend helper logic was changed.
- No frontend behavior was changed.
- No Supabase schema, RLS, storage, payment, receipt, or verification behavior was changed.

## Local Route Registration Inspection

Local backend/server.js includes:

- app.use middleware before the probe route
- NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS gate
- GET /internal/rehearsal/authority-probe route
- env-gated 404 response body: {"error":"not found"}
- fixture email guard
- fixture caseId allowlist guard
- root GET / route registered later in the file

Observed route order:

- probe route is registered before root GET /
- probe route is registered before later app routes
- no local evidence was found that a catch-all route should consume the probe before it reaches the probe handler

## Local Commit Inclusion Inspection

Recent local commits include:

- 6a94347 Add v0.9-4W deployed protected authority probe enablement smoke
- 0ec7d15 Add v0.9-4V deployed authority probe enablement route availability candidate
- 6721e87 Add v0.9-4U deployed authority probe route env inspection
- cb22b4a Add v0.9-4T deployed authority probe unavailable blocker
- b766220 Add v0.9-4S deployed authority probe implementation

This confirms the local branch contains the probe implementation and subsequent inspection records.

## Deployed Root Alive Check

Endpoint:

GET /

Observed deployed result:

- STATUS: 200
- BODY: {"status":"Nimclea Diagnostic API running"}

Interpretation:

- Render backend service is alive.
- The deployed service is responding from the expected Nimclea API host.

## Deployed Bare Probe Detail

Endpoint:

GET /internal/rehearsal/authority-probe

Observed deployed result:

- STATUS: 404
- BODY: {"error":"not found"}

Interpretation:

- The response body matches the probe route env-gate 404 response.
- This is not a generic Render 404 page.
- This strongly indicates the route is deployed / registered, but the rehearsal endpoint env gate is not active in deployed runtime.

## Deployed Protected Fixture Probe Detail

Endpoint:

GET /internal/rehearsal/authority-probe?email=smoke%2Bcases-existing-001%40nimclea.test&caseId=00000000-0000-4000-8000-000000000024

Observed deployed result:

- STATUS: 404
- BODY: {"error":"not found"}

Interpretation:

- The protected fixture query also hits the same env-gate 404 response.
- The request does not reach fixture_email_required.
- The request does not reach fixture_case_id_required.
- The request does not reach Supabase authority availability checks.
- The request does not reach backend helper execution.

## Classification

Result:

- INSPECTION COMPLETE

Route registration / deployed inclusion classification:

- DEPLOYED ROUTE LIKELY REGISTERED
- DEPLOYED ENV GATE NOT ACTIVE OR NOT TRUE

Current likely layer:

- Render env activation / service restart / deployed runtime env value

Important distinction:

- This is not proof that deployed Render lacks Supabase authority access.
- This is not proof that getCaseRecordsByEmail is wrong.
- This is not schema contract drift.
- This is not route missing / deployed inclusion missing based on the observed response body.
- This is not frontend, payment, receipt, verification, or storage failure.

## Decision / Change Summary

The deployed 404 body matches the application route env-gate response.

Therefore, the next smallest action should focus on Render env activation:

- confirm NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS exists in the deployed backend service
- confirm its value is exactly true
- confirm the correct Render service was updated
- trigger redeploy / restart after the env change
- re-run the protected fixture probe

Do not patch backend helper logic.

Do not patch Supabase schema.

Do not change frontend behavior.

## Acceptance Criteria

This inspection record is complete when:

- Local route registration/order evidence is documented.
- Local recent commit inclusion evidence is documented.
- Deployed root alive check is documented.
- Deployed bare probe body is documented.
- Deployed protected fixture probe body is documented.
- The result is classified as route likely registered but env gate not active.
- The next action is narrowed to Render env activation / service restart verification.

## Validation

Commands / checks run:

- Local Select-String route/order inspection.
- Local git log inspection.
- Deployed root alive check.
- Deployed bare authority probe response detail.
- Deployed protected authority probe response detail.

Observed result:

- Local route exists.
- Local route order does not show catch-all before the probe.
- Local commits include v0.9-4S through v0.9-4W.
- Deployed root endpoint returns 200.
- Deployed bare probe returns 404 with body {"error":"not found"}.
- Deployed protected fixture probe returns 404 with body {"error":"not found"}.

## Risk / Stop Line

Stop line:

- Do not treat this result as Supabase authority failure.
- Do not treat this result as backend helper failure.
- Do not treat this result as schema contract drift.
- Do not treat this result as route-not-deployed without further evidence, because the response body matches the app env-gate response.
- Do not broaden the probe to arbitrary customer emails or arbitrary case IDs.
- Do not change payment, receipt, verification, storage, or frontend runtime behavior.

Allowed next step:

- v0.9-4Y Render rehearsal env activation verification / protected probe re-smoke.

## Next Action

Next suitable work item:

- v0.9-4Y Render rehearsal env activation verification / protected probe re-smoke.

Suggested focus:

- Verify the exact Render service receiving NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true.
- Verify value is exactly true with no spaces or quotes.
- Redeploy / restart the backend service after env update.
- Re-run the protected fixture authority probe.
- If it still returns {"error":"not found"}, classify as Render env activation mismatch.