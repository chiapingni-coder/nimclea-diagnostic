# v0.9-5Y-A CASES EMAIL FINAL ASSEMBLY OBSERVABILITY ROUTE IMPLEMENTATION RECORD

## Record ID

NIMCLEA_V0_9_5Y_A_CASES_EMAIL_FINAL_ASSEMBLY_OBSERVABILITY_ROUTE_IMPLEMENTATION_RECORD_V0_1

## Date

2026-05-18

## Purpose

v0.9-5Y-A is the corrective implementation follow-up after v0.9-5Y was pushed as a doc/gate-only smoke record.

v0.9-5Y proved that the protected route /internal/rehearsal/cases-email-final-assembly-observability was still unavailable locally, returning Cannot GET. Therefore 5Y did not implement runtime observability.

The purpose of 5Y-A is to actually implement the protected fixture-only final assembly observability route in backend/server.js before moving to v0.9-5Z.

## Scope

- Area: backend protected rehearsal route for /cases?email final assembly observability.
- Files inspected: backend/server.js, backend/utils/supabaseCoreAuthorityStore.js, v0.9-5X record, v0.9-5Y record.
- Files changed: backend/server.js, this 5Y-A record, and scripts/check-release-gate.mjs through gate-doc protection.
- Runtime behavior affected: protected rehearsal observability route only. Public /cases?email behavior must not be intentionally changed.

## Decision / Change Summary

- Implemented GET /internal/rehearsal/cases-email-final-assembly-observability in backend/server.js.
- Gate the route behind NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true.
- Restrict the route to fixture email smoke+cases-existing-001@nimclea.test.
- Restrict visible case IDs to explicit allowlisted fixture case IDs only.
- Return sanitized counts, booleans, allowlisted case IDs, missing expected IDs, and sanitized errors only.
- Do not expose raw customer records, raw case records, secrets, service role keys, payment data, receipt data, verification data, trial data, or storage data.
- Do not change frontend behavior.
- Do not change Supabase schema or data.
- Do not change payment, receipt, verification, trial, or storage behavior.
- Do not intentionally change public /cases?email or /case behavior.
- Do not weaken deleted/tombstone filtering.

## Required Route

- GET /internal/rehearsal/cases-email-final-assembly-observability

## Fixture Inputs

- Fixture email: smoke+cases-existing-001@nimclea.test.
- Expected case ID: 00000000-0000-4000-8000-000000000024.
- Expected case ID: 00000000-0000-4000-8000-000000009401.

## Acceptance Criteria

- backend/server.js is modified.
- Local route no longer returns Cannot GET after backend restart.
- Route rejects non-fixture emails.
- Route is gated behind NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true.
- Route returns sanitized helper lookup and final assembly observability fields.
- Route reports expected case IDs and missing expected case IDs.
- Route reports only allowlisted fixture case IDs:
  - 00000000-0000-4000-8000-000000000024
  - 00000000-0000-4000-8000-000000009401
- No raw records are exposed.
- No secrets are exposed.
- Public /cases?email behavior is not intentionally changed.
- release-check passes with FAIL 0.
- GitHub push completes.
- Render alive check passes.

## Validation

- backend/server.js modified: PASS.
- node --check backend\server.js: PASS.
- Local backend restart with NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true: PASS.
- Local authority probe route: PASS.
- Local final assembly observability route: PASS / BLOCKER OBSERVED.

Local authority probe result:

- success: true.
- rehearsal: true.
- supabaseCoreAuthorityEnabled: true.
- emailLookup.ok: true.
- emailLookup.count: 2.
- emailLookup.caseIds: 00000000-0000-4000-8000-000000009401, 00000000-0000-4000-8000-000000000024.
- caseLookup.ok: true.
- caseLookup.found: true.
- caseLookup.caseId: 00000000-0000-4000-8000-000000000024.

Local final assembly observability result:

- success: true.
- routeReachable: true.
- helperLookup.attempted: true.
- helperLookup.ok: true.
- helperLookup.rowCount: 2.
- helperLookup.allowlistedCaseIds: 00000000-0000-4000-8000-000000009401, 00000000-0000-4000-8000-000000000024.
- helperLookup.missingExpectedCaseIds: none.
- assembly.finalAllowlistedCaseIds: none.
- assembly.missingExpectedCaseIds: 00000000-0000-4000-8000-000000000024, 00000000-0000-4000-8000-000000009401.

Classification:

- Route availability: PASS.
- Rehearsal env gate: PASS.
- Supabase authority helper lookup: PASS.
- Fixture data availability: PASS.
- Final assembly emission: FAIL / BLOCKER OBSERVED.

Interpretation:

The expected fixture case rows are visible through the clean authority helper, but they are not emitted into the final assembled allowlisted output. The remaining drop layer is after helper lookup and before or inside final assembly emission.

## Risk / Stop Line

- Stop if backend/server.js is not modified.
- Stop if local route still returns Cannot GET after patch and backend restart.
- Stop if the patch exposes raw records.
- Stop if the patch exposes secrets.
- Stop if the patch allows arbitrary production emails.
- Stop if the patch allows arbitrary case IDs.
- Stop if the patch changes frontend, payment, receipt, verification, trial, Supabase schema, or Supabase Storage behavior.
- Stop if the patch weakens deleted or tombstone filtering.

## Next Action

- Patch backend/server.js to add the protected fixture-only observability route.
- Verify git status includes M backend/server.js before rerunning the v09 wrapper.
- Run local route smoke after backend restart.
- Run release-check.
- Then rerun the v09 wrapper only if backend/server.js is modified and release-check has FAIL 0.

