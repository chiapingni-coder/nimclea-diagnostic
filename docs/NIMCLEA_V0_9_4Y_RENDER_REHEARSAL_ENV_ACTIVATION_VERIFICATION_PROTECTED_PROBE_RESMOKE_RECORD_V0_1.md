# v0.9-4Y RENDER REHEARSAL ENV ACTIVATION VERIFICATION PROTECTED PROBE RESMOKE RECORD

## Record ID

NIMCLEA_V0_9_4Y_RENDER_REHEARSAL_ENV_ACTIVATION_VERIFICATION_PROTECTED_PROBE_RESMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the Render rehearsal env activation verification and protected authority probe re-smoke after v0.9-4X.

v0.9-4X classified the deployed probe route as likely registered because the deployed response body matched the app env-gate 404 response:

{"error":"not found"}

The next smallest action was to verify that NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true was active in the correct Render backend service, redeploy / restart, and re-run the protected fixture authority probe.

## Scope

Area:

- v0.9 runtime authority observability
- Render rehearsal endpoint env activation
- deployed protected authority probe
- deployed Supabase core authority availability

Files / behavior involved:

- backend/server.js
- GET /internal/rehearsal/authority-probe
- NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS
- Render deployed runtime
- Supabase core authority availability check

Runtime behavior changed by this record:

- None.
- This is a smoke record only.
- No backend helper logic was changed.
- No frontend behavior was changed.
- No Supabase schema, RLS, storage, payment, receipt, or verification behavior was changed.

## Execution Summary

Render environment action:

- NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS was verified / enabled as true in the deployed Nimclea backend API service.
- The deployed backend service was redeployed / restarted.
- The protected fixture authority probe was re-run.

Protected fixture probe target:

https://nimclea-api.onrender.com/internal/rehearsal/authority-probe?email=smoke%2Bcases-existing-001%40nimclea.test&caseId=00000000-0000-4000-8000-000000000024

## Observed Result

Observed deployed result:

- StatusCode: 200
- success: true
- probe: deployed_authority_availability
- rehearsal: true
- supabaseCoreAuthorityEnabled: true

The displayed content began with:

{"success":true,"probe":"deployed_authority_availability","rehearsal":true,"supabaseCoreAuthorityEnabled":true,"emailLookup":{"email":"smoke+...

## Classification

Result:

- PASS

Pass type:

- deployed protected authority probe reachable
- Render rehearsal env activation verified
- deployed Supabase core authority availability confirmed at the probe level

Current confirmed layer:

- deployed route is reachable
- rehearsal env gate is active
- Supabase core authority is enabled in deployed runtime

Important distinction:

- This confirms the protected deployed authority probe can run.
- This confirms the deployed runtime can reach the Supabase core authority path at the probe level.
- This does not claim full production fixture stability.
- This does not claim payment, receipt, verification, storage, or frontend readiness.
- This does not remove the need for future scoped read/write smokes.

## Decision / Change Summary

The prior 404 blocker path is resolved for the protected authority probe availability scope.

The deployed authority probe route is now reachable after Render rehearsal env activation.

The next step can move from route/env availability to deployed authority read path confidence using the protected fixture probe output and existing safe fixture constraints.

Do not broaden the probe beyond fixture-only and allowlisted case ID constraints.

## Acceptance Criteria

This smoke record is complete when:

- Render rehearsal env activation is documented.
- The protected fixture authority probe result is documented.
- StatusCode 200 is recorded.
- success true is recorded.
- rehearsal true is recorded.
- supabaseCoreAuthorityEnabled true is recorded.
- The result is classified as PASS.
- The record does not overclaim payment, receipt, verification, storage, or full production fixture readiness.

## Validation

Commands / checks run:

- Render env activation / redeploy verification.
- Protected fixture authority probe re-smoke.

Observed result:

- StatusCode: 200
- success: true
- rehearsal: true
- supabaseCoreAuthorityEnabled: true

## Risk / Stop Line

Stop line:

- Do not expose arbitrary customer data through the probe.
- Do not remove fixture email restriction.
- Do not remove allowlisted case ID restriction.
- Do not treat this as full end-to-end production readiness.
- Do not claim payment, receipt, verification, storage, or frontend readiness from this probe alone.
- Do not skip future scoped deployed authority smokes.

Allowed next step:

- v0.9-4Z deployed authority probe PASS closure / next-scope decision record.

## Next Action

Next suitable work item:

- v0.9-4Z deployed authority probe PASS closure / next-scope decision record.

Suggested focus:

- Close the route/env availability blocker.
- State exactly what 4Y proved.
- State what remains unproven.
- Decide whether the next scope is deployed read-path confidence, production fixture stability, or return to AAC receipt/payment authority work.