# v0.9-4N EMAIL TO CASE AUTHORITY IMPLEMENTATION CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_4N_EMAIL_TO_CASE_AUTHORITY_IMPLEMENTATION_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

Record the narrow implementation candidate for the v0.9-4M selected contract: resolve /cases?email= through customers.email -> cases.customer_id.

## Result

CANDIDATE RECORDED.

Selected implementation candidate: update getCaseRecordsByEmail(email) so it resolves matching customers by email, collects customer_id values, then loads cases by cases.customer_id.

## Background

v0.9-4L classified a schema-contract drift blocker because cases.email does not exist.
v0.9-4M selected Option B: customers.email -> cases.customer_id.
v0.9-4N inspected the live canonical authority shape before implementation.

## Inspection Result

Direct customer lookup by customer_id returned count 1.
The customer record contains email smoke+cases-existing-001@nimclea.test.
The customer record contains customer_id 00000000-0000-4000-8000-000000000023.

Email-to-cases proof query returned:

- customerOk: true
- customerCount: 1
- customerIds: 00000000-0000-4000-8000-000000000023
- casesOk: true
- caseCount: 2
- caseIds:
  - 00000000-0000-4000-8000-000000000024
  - 00000000-0000-4000-8000-000000009401

Interpretation: the selected Option B contract is supported by the current canonical schema and data.

## Candidate Direction

Implement getCaseRecordsByEmail(email) as:

1. Normalize email.
2. Query customers where customers.email equals normalized email.
3. Collect customer_id values.
4. Query cases where cases.customer_id is in that customer_id set.
5. Return the matching cases ordered by created_at descending if safe.
6. Preserve existing fallback behavior in backend/server.js.
7. Do not change /cases?email= response shape.

## Scope

- Area: Runtime authority alignment
- Route target: /cases?email=
- Helper target: backend/utils/supabaseCoreAuthorityStore.js getCaseRecordsByEmail(email)
- Runtime behavior changed in this record: No
- Supabase Storage included: No
- Schema/RLS/grants/migrations included: No
- Payment/receipt/verification/trial/frontend changes included: No

## Non-Goals

- No runtime patch in this record.
- No schema migration.
- No cases.email column.
- No metadata.markerEmail authority path.
- No fallback removal.
- No frontend change.
- No payment, receipt, verification, or trial change.

## Acceptance Criteria

- Candidate uses customers.email -> cases.customer_id.
- Candidate is backed by live authority inspection.
- Candidate preserves one customer to many cases.
- Candidate avoids cases.email.
- No runtime code is changed in this record.
- Next action is narrow implementation.

## Validation

Commands run before this record:

Direct customers lookup by customer_id.
Direct customers.email -> cases.customer_id proof query.

Observed result:

customers.email lookup found one customer.
cases.customer_id lookup found two cases.
Therefore the selected contract is implementable without schema migration.

## Risk / Stop Line

Stop if implementation attempts to add cases.email, use metadata.markerEmail as canonical authority, remove fallback behavior, rewrite the whole /cases route, or change payment, receipt, verification, trial, or frontend behavior.

## Next Action

Proceed to v0.9-4O: implement the narrow customers.email -> cases.customer_id helper change, then run deterministic /cases?email= smoke.
