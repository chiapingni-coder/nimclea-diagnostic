# v0.9-4Q DEPLOYED AUTHORITY AVAILABILITY INSPECTION RECORD

## Record ID

NIMCLEA_V0_9_4Q_DEPLOYED_AUTHORITY_AVAILABILITY_INSPECTION_RECORD_V0_1

## Date

2026-05-18

## Purpose

Inspect deployed Render runtime authority availability after v0.9-4P showed deployed /cases?email= Count 0 and deployed /case/:caseId 404, while local helper smoke passed.

## Result

INSPECTION RECORDED.

Deployed runtime authority availability is not yet proven.

## Evidence

Git status before this record:

- HEAD/origin/master aligned at 38c27e5 Add v0.9-4P deployed cases email smoke blocker.
- Recent commits include v0.9-4O helper implementation and v0.9-4P deployed smoke blocker.
- Working tree only had this 4Q record untracked.

Render alive probe:

- GET https://nimclea-api.onrender.com/ returned: Nimclea Diagnostic API running.

Deployed authority case probe:

- GET https://nimclea-api.onrender.com/case/00000000-0000-4000-8000-000000000024 returned 404.

Prior local proof from v0.9-4O:

- getCaseRecordsByEmail(smoke+cases-existing-001@nimclea.test) returned ok true.
- Local helper smoke returned count 2.
- Case ids included 00000000-0000-4000-8000-000000000024 and 00000000-0000-4000-8000-000000009401.

## Interpretation

Render root alive check confirms the deployed API process is running.

However, deployed /case/:caseId still cannot read a Supabase authority fixture that local helper access can read.

Therefore the current blocker should not be attributed to getCaseRecordsByEmail(email) helper logic.

The likely unresolved layer is deployed runtime authority availability, such as Render Supabase env availability, service role configuration, or deployed authority read path.

## Scope

- Area: Deployed runtime authority inspection
- Routes inspected: / and /case/:caseId
- Runtime behavior changed in this record: No
- Supabase Storage included: No
- Schema/RLS/grants/migrations included: No
- Frontend/payment/receipt/verification/trial changes included: No

## Non-Goals

- No runtime patch in this record.
- No schema migration.
- No helper rewrite.
- No fallback removal.
- No frontend change.
- No PASS claim for deployed /cases?email= smoke.

## Acceptance Criteria

- Deployed root alive result is recorded.
- Deployed /case/:caseId 404 result is recorded.
- Local helper PASS is distinguished from deployed runtime failure.
- No runtime code is changed.
- Next action is a narrow deployed authority availability resolution candidate.

## Next Action

Proceed to v0.9-4R: decide the smallest safe way to prove deployed Render Supabase authority availability before patching runtime logic again.
