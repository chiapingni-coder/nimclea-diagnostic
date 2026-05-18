# v0.9-4P CASES EMAIL LOOKUP DEPLOYED DETERMINISTIC SMOKE RECORD

## Record ID

NIMCLEA_V0_9_4P_CASES_EMAIL_LOOKUP_DEPLOYED_DETERMINISTIC_SMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

Record the deployed deterministic smoke result for /cases?email= after v0.9-4O fixed getCaseRecordsByEmail(email) locally.

## Result

BLOCKER CLASSIFIED.

The deployed /cases?email= smoke did not pass. The failure is not attributed to the 4O helper logic yet, because local helper smoke already passed.

## Smoke Target

- Endpoint: https://nimclea-api.onrender.com/cases?email=smoke%2Bcases-existing-001%40nimclea.test
- Expected case ids:
  - 00000000-0000-4000-8000-000000000024
  - 00000000-0000-4000-8000-000000009401

## Observed Result

/cases?email= returned:

- Count: 0

Direct deployed /case/:caseId checks returned:

- 00000000-0000-4000-8000-000000000024 -> 404
- 00000000-0000-4000-8000-000000009401 -> 404

## Failure Attribution Block

What failed:

- Deployed deterministic runtime smoke for /cases?email=

Likely layer:

- Deployed runtime authority availability / environment / deployment path

Smallest proof:

- Local getCaseRecordsByEmail(email) passed after v0.9-4O with ok true and count 2.
- Local Supabase authority contains both fixture cases through customers.email -> cases.customer_id.
- Deployed /case/:caseId returns 404 for both fixture case ids.
- Therefore the deployed runtime is not currently reading the same authority fixture path.

Stop line:

- Do not mark 4P PASS.
- Do not keep patching getCaseRecordsByEmail(email) until deployed authority availability is explained.
- Do not add schema/RLS/migration changes inside this smoke record.
- Do not change frontend, payment, receipt, verification, or trial behavior.

## Scope

- Area: Deployed runtime authority smoke
- Route target: /cases?email=
- Related route: /case/:caseId
- Runtime behavior changed in this record: No
- Supabase Storage included: No
- Schema/RLS/grants/migrations included: No
- Frontend/payment/receipt/verification/trial changes included: No

## Interpretation

v0.9-4O local helper smoke proved the selected contract works locally:

- customers.email -> customers.customer_id -> cases.customer_id
- count 2
- case ids 00000000-0000-4000-8000-000000009401 and 00000000-0000-4000-8000-000000000024

But deployed Render runtime currently returns 404 for both case ids. This means the next step should inspect deployed authority configuration or deployed runtime path before any further helper patch.

## Acceptance Criteria

- Failed deployed smoke is documented.
- The failure is not mislabeled as a 4O helper logic failure.
- Direct /case/:caseId 404 evidence is recorded.
- No runtime patch is made in this record.
- Next action is a deployed authority availability inspection/candidate.

## Next Action

Proceed to v0.9-4Q: inspect deployed Render/Supabase authority availability and decide the smallest alignment step.
