# v0.9-4M EMAIL TO CASE AUTHORITY CONTRACT DIRECTION DECISION RECORD

## Record ID

NIMCLEA_V0_9_4M_EMAIL_TO_CASE_AUTHORITY_CONTRACT_DIRECTION_DECISION_RECORD_V0_1

## Date

2026-05-18

## Purpose

Decide the canonical authority contract for resolving /cases?email= after v0.9-4L exposed that the canonical cases table does not include a top-level email column.

## Result

DECISION RECORDED.

Selected direction: Option B - resolve customers.email to cases.customer_id.

## Background

v0.9-4K introduced getCaseRecordsByEmail(email).
v0.9-4L showed that direct email lookup cannot pass yet because cases.email does not exist.
Direct case lookup by case_id works, so the authority table exists and supports case_id lookup.
The failure is therefore schema-contract drift in the email-to-case lookup path.

## Options Considered

Option A - Add email to cases.
Rejected for now because it duplicates customer identity onto each case and weakens customer/case separation.

Option B - Resolve customers.email to cases.customer_id.
Selected because customer and case are separate entities, one customer can own multiple cases, and /cases?email= is a workspace entry lookup.

Option C - Use metadata.markerEmail.
Rejected as long-term direction. It may be useful only as a temporary smoke fixture bridge if separately documented.

## Selected Contract

1. Normalize requested email.
2. Look up matching customers by canonical customer email.
3. Collect customer_id values.
4. Load cases where cases.customer_id is in that customer_id set.
5. Preserve existing fallback and quarantine paths.
6. Do not change response shape.

## Scope

- Area: Runtime authority alignment
- Route target: /cases?email=
- Contract target: customers.email -> cases.customer_id
- Runtime behavior changed in this record: No
- Supabase Storage included: No
- Schema/RLS/grants/migrations included: No
- Payment/receipt/verification/trial/frontend changes included: No

## Non-Goals

- No runtime patch in this record.
- No schema migration in this record.
- No cases.email column added in this record.
- No fallback removal.
- No frontend change.
- No deterministic smoke PASS claim.

## Acceptance Criteria

- Email-to-case authority direction is selected.
- Rejected options are documented.
- Customer/case separation is preserved.
- No runtime code is changed.
- Next action is a narrow implementation candidate.

## Validation

Commands to run after protecting this record:

.\scripts\gate-doc.ps1 "docs/NIMCLEA_V0_9_4M_EMAIL_TO_CASE_AUTHORITY_CONTRACT_DIRECTION_DECISION_RECORD_V0_1.md"
.\scripts\release-check.ps1

Expected result: release-check returns FAIL 0. Existing WARN items may remain non-blocking.

## Risk / Stop Line

Stop if the next step attempts to silently add cases.email, treat metadata.markerEmail as canonical authority, remove fallback behavior, rewrite the whole /cases route, or mark v0.9-4L smoke PASS before implementing and validating the selected contract.

## Next Action

Proceed to v0.9-4N: create a narrow implementation candidate for customers.email -> cases.customer_id.
