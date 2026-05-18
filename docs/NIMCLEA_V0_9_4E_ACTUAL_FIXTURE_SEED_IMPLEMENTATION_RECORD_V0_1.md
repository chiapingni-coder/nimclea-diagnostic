# V0.9-4E ACTUAL FIXTURE SEED IMPLEMENTATION RECORD

## Record ID

NIMCLEA_V0_9_4E_ACTUAL_FIXTURE_SEED_IMPLEMENTATION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record defines the narrow production read-only fixture seed implementation path for Nimclea v0.9-4.

## Scope

- Create or confirm one test-only canonical customer.
- Resolve canonical customer_id.
- Seed one stable test-only case bound to that customer_id.
- Verify production read-only smoke through /cases and /case/:caseId.

## Fixture Identity

- Email:
  - smoke+cases-existing-001@nimclea.test
- Customer type:
  - test-only
- Environment:
  - production read-only smoke fixture

## Canonical Rule

- customers.customer_id is the canonical customer authority key.
- cases.customer_id must bind to the canonical customer_id.
- Legacy customers.id must not be used.

## Planned Seed Path

1. Resolve or create the test-only customer.
2. Obtain canonical customer_id.
3. Seed one stable test-only case referencing customer_id.
4. Verify:
   - GET /cases?email=smoke%2Bcases-existing-001%40nimclea.test
   - GET /case/:caseId

## Planned Implementation Boundary

- Use backend-only authority path.
- Reuse existing Supabase service-role boundary.
- Prefer existing authority helpers such as upsertCaseRecord(...).
- Keep implementation explicit and auditable.

## Non-Scope

- No real customer data.
- No frontend behavior change.
- No payment gating.
- No receipt PDF export.
- No verification unlock.
- No Supabase Storage.
- No broad RLS relaxation.
- No release-blocking production smoke.

## Stop Line

- Stop if implementation depends on legacy customers.id.
- Stop if /cases lookup cannot bind cases through customer_id.
- Stop if implementation requires real customer records.
- Stop if implementation expands into payment, receipt, verification, storage, or frontend behavior.

## Acceptance Criteria

- A stable production fixture customer exists.
- A stable production fixture case exists.
- /cases returns the seeded case for the fixture email.
- /case/:caseId successfully reads back the same case.
- v0.9-4 production read-only smoke becomes resumable after successful read-back.

## Validation

Planned checks:

`powershell
Invoke-RestMethod "https://nimclea-api.onrender.com/cases?email=smoke%2Bcases-existing-001%40nimclea.test" | ConvertTo-Json -Depth 20

# then:

Invoke-RestMethod "https://nimclea-api.onrender.com/case/<caseId>" | ConvertTo-Json -Depth 20
`",
",


- Protect this implementation record in the release gate.
- Then implement the narrow fixture seed script in a separate controlled step.
