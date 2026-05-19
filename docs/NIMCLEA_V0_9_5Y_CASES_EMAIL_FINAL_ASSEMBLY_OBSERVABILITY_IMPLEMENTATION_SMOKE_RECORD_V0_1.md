# v0.9-5Y CASES EMAIL FINAL ASSEMBLY OBSERVABILITY IMPLEMENTATION SMOKE RECORD

## Record ID

NIMCLEA_V0_9_5Y_CASES_EMAIL_FINAL_ASSEMBLY_OBSERVABILITY_IMPLEMENTATION_SMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

v0.9-5Y implements protected fixture-only observability for the deployed /cases?email final assembly path.

This work item exists because v0.9-5W showed that deployed public /cases?email still returned HTTP 200 with an empty result after the v0.9-5V marker-path implementation.

The goal is to determine whether deployed runtime is executing the v0.9-5V clean authority marker path and to identify the exact layer where expected fixture case rows are dropped before becoming public /cases?email results.

## Scope

- Area: deployed /cases?email read path, final assembly observability, fixture-only protected rehearsal endpoint.
- Files inspected: backend/server.js, backend/utils/supabaseCoreAuthorityStore.js, v0.9-5X candidate record.
- Files changed: backend/server.js, this 5Y record, and scripts/check-release-gate.mjs through gate-doc protection.
- Runtime behavior affected: protected rehearsal observability route only. Public /cases?email behavior must not change except for shared internal instrumentation with no intended public response impact.

## Decision / Change Summary

- Implement a protected fixture-only observability endpoint for the /cases?email final assembly pipeline.
- Gate the endpoint behind NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true.
- Restrict input to @nimclea.test fixture email only.
- Restrict case visibility to explicit allowlisted fixture case IDs.
- Return only sanitized counts, booleans, allowlisted case IDs, and sanitized error strings.
- Do not expose raw customer records, raw case records, secrets, Supabase keys, payment data, receipt data, verification data, trial data, or storage data.
- Do not change frontend behavior.
- Do not change Supabase schema or data.
- Do not change payment, receipt, verification, trial, or storage behavior.

## Implementation Target

- Add or extend a protected internal route in backend/server.js.
- Suggested route: GET /internal/rehearsal/cases-email-final-assembly-observability.
- The route should inspect the same deployed backend logic path used by /cases?email as closely as possible.
- The route should report whether helper-scoped clean authority rows are found, marked, admitted into candidate assembly, promoted into durable candidates, and emitted in final assembled cases.
- The route should report expected allowlisted case IDs and missing expected allowlisted case IDs.
- The route should return sanitized error text only if an exception occurs.

## Fixture Inputs

- Fixture email: smoke+cases-existing-001@nimclea.test.
- Expected case ID: 00000000-0000-4000-8000-000000000024.
- Expected case ID: 00000000-0000-4000-8000-000000009401.

## Acceptance Criteria

- Protected observability route returns HTTP 200 when rehearsal endpoints are enabled and fixture input is valid.
- Protected observability route rejects non-fixture emails.
- Protected observability route does not support arbitrary production emails.
- Protected observability route does not expose raw records.
- Protected observability route does not expose secrets.
- Protected observability route reports sanitized helper lookup status.
- Protected observability route reports sanitized marker/final assembly status.
- Protected observability route reports allowlisted final assembled case IDs if present.
- Protected observability route reports missing expected allowlisted case IDs if absent.
- release-check passes with FAIL 0.
- Deployed smoke result is recorded honestly as PASS or FAIL.

## Validation

- Implementation validation will be completed after backend/server.js is patched.
- Local release-check should pass with FAIL 0 before push.
- Deployed Render alive check should pass after push.
- Deployed protected observability smoke should be run after Render reflects the commit.

## Risk / Stop Line

- Stop if the patch exposes raw case or customer records.
- Stop if the patch exposes secrets.
- Stop if the patch allows arbitrary production emails.
- Stop if the patch allows arbitrary case IDs.
- Stop if the patch weakens deleted or tombstone filtering.
- Stop if the patch changes frontend behavior.
- Stop if the patch changes payment, receipt, verification, trial, Supabase schema, or Supabase Storage behavior.
- Stop if the patch changes public /cases?email output without explicit evidence and documentation.

## Smoke Result

- Status: PENDING IMPLEMENTATION.
- Local result: PENDING.
- Deployed result: PENDING.
- Observed helper row count: PENDING.
- Observed marker path status: PENDING.
- Observed final assembled case IDs: PENDING.
- Missing expected case IDs: PENDING.

## Next Action

- Patch backend/server.js with protected fixture-only final assembly observability.
- Run local release-check.
- Push through v09-work-item after this record is updated with actual implementation and smoke evidence.
- Then use the observability result to decide v0.9-5Z.
