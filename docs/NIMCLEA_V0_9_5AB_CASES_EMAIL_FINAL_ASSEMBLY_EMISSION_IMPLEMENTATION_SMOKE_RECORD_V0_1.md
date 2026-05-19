# v0.9-5AB CASES EMAIL FINAL ASSEMBLY EMISSION IMPLEMENTATION SMOKE RECORD

## Record ID

NIMCLEA_V0_9_5AB_CASES_EMAIL_FINAL_ASSEMBLY_EMISSION_IMPLEMENTATION_SMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

v0.9-5AB implements the narrow backend final assembly emission fix selected by v0.9-5AA.

v0.9-5Y-A and v0.9-5Z proved that route availability, rehearsal env, Supabase core authority, fixture visibility, and clean authority helper lookup all pass, but helper-visible clean authority rows are not emitted into final assembled /cases?email output.

The purpose of 5AB is to patch backend/server.js so helper-scoped clean authority rows can be emitted into /cases?email while preserving direct-email gating for local JSON and broad fallback rows.

## Scope

- Area: backend /cases?email final assembly emission.
- Files inspected: backend/server.js, backend/utils/supabaseCoreAuthorityStore.js, v0.9-5Y-A record, v0.9-5Z record, v0.9-5AA record.
- Files changed: backend/server.js, this 5AB record, and scripts/check-release-gate.mjs through gate-doc protection.
- Runtime behavior affected: public /cases?email final assembly for helper-scoped clean authority rows only.

## Decision / Change Summary

- Implemented the smallest safe final assembly emission fix in backend/server.js.
- Helper-scoped clean authority rows returned by loadSupabaseCaseSourcesForEmail can now enter final assembled /cases?email output.
- Preserve strict direct-email matching for local JSON rows.
- Preserve strict direct-email matching for broad fallback rows.
- Preserve deleted and tombstone filtering.
- Strip or avoid exposing private internal markers in public response JSON.
- Do not change frontend behavior.
- Do not change Supabase schema or data.
- Do not change payment, receipt, verification, trial, or storage behavior.

## Required Implementation Behavior

- Clean authority helper rows already scoped through customers.email to cases.customer_id may pass final assembly without direct row-level email.
- This bypass must apply only to internally marked helper-scoped rows.
- Local JSON rows must still require direct email match.
- Broad fallback rows must still require direct email match.
- Deleted or tombstoned case IDs must remain excluded.
- Public response must not expose any private helper marker.

## Implementation Summary

- `loadSupabaseCaseSourcesForEmail` keeps the broad fallback path direct-email gated.
- Helper-success rows are internally marked with `_emailScopedByCleanAuthority`.
- `canSeedWorkspaceCase` now treats only `_emailScopedByCleanAuthority` rows as seedable canonical cases, even when the row lacks a legacy direct email/source.
- Canonical case ID collection now uses the shared email visibility predicate so helper-scoped rows participate in final assembly.
- The private marker is stripped from public `/cases?email` response mapping.
- The protected final assembly observability route now reports allowlisted IDs after the final seeding gate.

## Fixture Inputs

- Fixture email: smoke+cases-existing-001@nimclea.test.
- Expected case ID: 00000000-0000-4000-8000-000000000024.
- Expected case ID: 00000000-0000-4000-8000-000000009401.

## Acceptance Criteria

- backend/server.js is modified.
- Protected authority probe remains PASS.
- Protected final assembly observability route shows helperLookup.rowCount equals 2.
- Protected final assembly observability route shows assembly.finalAllowlistedCaseIds contains both expected fixture case IDs.
- Public /cases?email for the fixture email returns both expected fixture case IDs.
- Private internal markers are not exposed in public /cases?email response.
- release-check passes with FAIL 0.
- GitHub push completes.
- Render alive check passes.
- Deployed protected observability smoke passes after Render reflects the commit.
- Deployed public /cases?email fixture smoke passes after Render reflects the commit.

## Validation

- Implementation status: PASS locally.
- backend/server.js modified: PASS.
- node --check backend\server.js: PASS.
- Local backend started with NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true: PASS.
- Local authority probe: PASS.
- Local final assembly observability route: PASS.
- Local public /cases?email fixture smoke: PASS.
- release-check result: PENDING.
- Deployed Render alive result: PENDING.
- Deployed protected observability smoke: PENDING.
- Deployed public /cases?email fixture smoke: PENDING.

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

Local protected final assembly observability result:

- success: true.
- routeReachable: true.
- helperLookup.attempted: true.
- helperLookup.ok: true.
- helperLookup.rowCount: 2.
- helperLookup.allowlistedCaseIds: 00000000-0000-4000-8000-000000009401, 00000000-0000-4000-8000-000000000024.
- helperLookup.missingExpectedCaseIds: none.
- assembly.finalAllowlistedCaseIds: 00000000-0000-4000-8000-000000009401, 00000000-0000-4000-8000-000000000024.
- assembly.missingExpectedCaseIds: none.

Local public /cases?email fixture smoke result:

- Count: 2.
- Returned case ID: 00000000-0000-4000-8000-000000009401.
- Returned case ID: 00000000-0000-4000-8000-000000000024.
- Private marker exposure: PASS, _emailScopedByCleanAuthority was not observed in public response.

Classification:

- Final assembly emission local fix: PASS.
- Remaining required proof: release-check plus deployed protected observability smoke and deployed public /cases?email fixture smoke after Render reflects the commit.

## Risk / Stop Line

- Stop if the implementation weakens direct-email gating for local JSON or broad fallback rows.
- Stop if the implementation allows unscoped rows into /cases?email.
- Stop if the implementation exposes private internal markers.
- Stop if the implementation exposes raw customer or case records.
- Stop if the implementation weakens deleted or tombstone filtering.
- Stop if the implementation changes frontend, payment, receipt, verification, trial, Supabase schema, or Supabase Storage behavior.

## Next Action

- Patch backend/server.js narrowly.
- Verify local protected observability route first.
- Verify local public /cases?email fixture output.
- Update this record with actual smoke evidence.
- Run release-check.
- Rerun v09-work-item only after backend/server.js is modified and release-check has FAIL 0.

