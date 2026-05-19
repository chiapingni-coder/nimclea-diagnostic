# v0.9-5AA CASES EMAIL FINAL ASSEMBLY EMISSION IMPLEMENTATION CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5AA_CASES_EMAIL_FINAL_ASSEMBLY_EMISSION_IMPLEMENTATION_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

v0.9-5AA selects the narrow implementation candidate after v0.9-5Z classified the remaining /cases?email blocker as final assembly emission.

v0.9-5Y-A proved that the deployed protected observability route can reach the backend, the rehearsal gate is enabled, Supabase core authority is available, the clean authority helper returns both expected fixture case IDs, but the final assembled allowlisted output remains empty.

The purpose of 5AA is to define the smallest safe implementation direction before changing runtime code.

## Scope

- Area: backend /cases?email final assembly emission.
- Files inspected: backend/server.js, backend/utils/supabaseCoreAuthorityStore.js, v0.9-5Y-A record, v0.9-5Z record.
- Files changed: this 5AA candidate record only, plus scripts/check-release-gate.mjs through gate-doc protection.
- Runtime behavior affected: none in 5AA. This is a candidate record only.

## Current Evidence

- Deployed route availability: PASS.
- Deployed rehearsal env gate: PASS.
- Deployed Supabase core authority availability: PASS.
- Deployed authority helper email lookup: PASS.
- helperLookup.rowCount: 2.
- helperLookup.allowlistedCaseIds: 00000000-0000-4000-8000-000000009401, 00000000-0000-4000-8000-000000000024.
- helperLookup.missingExpectedCaseIds: none.
- assembly.finalAllowlistedCaseIds: none.
- assembly.missingExpectedCaseIds: 00000000-0000-4000-8000-000000000024, 00000000-0000-4000-8000-000000009401.

## Candidate Direction

- Implement the next runtime change narrowly in backend/server.js.
- Focus only on final assembly emission after loadSupabaseCaseSourcesForEmail returns helper-scoped clean authority rows.
- Permit internally helper-scoped clean authority rows to enter final assembled /cases?email output even when the row itself does not carry direct row-level email.
- Preserve strict direct-email gating for local JSON rows and broad fallback rows.
- Preserve deleted and tombstone filtering.
- Strip or avoid exposing private internal markers in public responses.
- Do not change public response shape beyond restoring expected fixture case emission.
- Do not expose raw records or secrets.

## Implementation Requirements For Next Work Item

- Inspect backend/server.js final assembly code after loadSupabaseCaseSourcesForEmail.
- Identify the exact condition that excludes helper-visible clean authority rows from finalCaseMap, durableCandidates, or finalCases.
- Add the smallest safe internal marker or predicate if needed.
- The marker must only apply to rows returned by the clean authority helper path.
- The marker must not apply to local JSON rows.
- The marker must not apply to broad fallback rows.
- The marker must not be exposed in public /cases?email response JSON.
- Deleted and tombstone filtering must remain active.
- Public /cases?email for smoke+cases-existing-001@nimclea.test should return both expected fixture case IDs after the fix.
- Protected observability route should show both expected fixture IDs in assembly.finalAllowlistedCaseIds after the fix.

## Rejected Directions

- Rejected: change Supabase schema.
- Rejected: insert or modify fixture data.
- Rejected: change Render env.
- Rejected: weaken email filtering globally.
- Rejected: allow arbitrary rows without email scoping.
- Rejected: expose helper markers publicly.
- Rejected: change frontend behavior.
- Rejected: change payment, receipt, verification, trial, or storage behavior.

## Acceptance Criteria For Next Work Item

- backend/server.js is the only runtime file changed unless inspection proves otherwise.
- Protected observability route shows finalAllowlistedCaseIds containing both expected fixture IDs.
- Public deployed /cases?email=smoke+cases-existing-001@nimclea.test returns both expected fixture case IDs.
- Authority probe remains PASS.
- release-check passes with FAIL 0.
- Render alive check passes after push.
- No Supabase schema or data is changed.
- No frontend behavior is changed.
- No payment, receipt, verification, trial, or storage behavior is changed.

## Validation

- 5AA record status: CANDIDATE RECORDED.
- Runtime code changed in 5AA: none.
- Frontend code changed in 5AA: none.
- Supabase schema or data changed in 5AA: none.
- Payment, receipt, verification, trial, or storage behavior changed in 5AA: none.
- Expected wrapper validation: release-check passes with FAIL 0, GitHub push completes, Render alive check passes.

## Risk / Stop Line

- Stop if the next implementation weakens direct-email gating for local JSON or broad fallback rows.
- Stop if the next implementation allows unscoped rows into /cases?email.
- Stop if the next implementation exposes private internal markers.
- Stop if the next implementation exposes raw customer or case records.
- Stop if the next implementation weakens deleted or tombstone filtering.
- Stop if the next implementation changes frontend, payment, receipt, verification, trial, Supabase schema, or Supabase Storage behavior.

## Next Action

- Proceed to v0.9-5AB final assembly emission implementation smoke.
- Patch backend/server.js narrowly after inspecting final assembly logic.
- Verify local protected observability route first.
- Then verify deployed protected observability route and public /cases?email fixture output.
