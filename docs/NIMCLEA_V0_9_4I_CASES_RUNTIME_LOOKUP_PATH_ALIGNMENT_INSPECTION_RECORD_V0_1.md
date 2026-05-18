# V0.9-4F CONTROLLED FIXTURE SEED SCRIPT IMPLEMENTATION RECORD

## Record ID

NIMCLEA_V0_9_4F_CONTROLLED_FIXTURE_SEED_SCRIPT_IMPLEMENTATION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record defines the controlled implementation boundary for the Nimclea v0.9-4 production read-only lighthouse fixture seed script.

## Scope

- Create or confirm one test-only canonical customer fixture.
- Resolve canonical customer_id.
- Create or confirm one stable test-only case fixture.
- Enable deterministic production read-only smoke validation.

## Fixture Identity

- Email:
  - smoke+cases-existing-001@nimclea.test
- Fixture type:
  - production read-only lighthouse fixture
- Customer classification:
  - test-only

## Canonical Authority Rule

- customers.customer_id is canonical.
- cases.customer_id must bind to canonical customer_id.
- Legacy customers.id must not be used.

## Planned Script

- scripts/v0-9-4f-seed-production-readonly-fixture.mjs

## Planned Runtime Path

1. Resolve existing customer by email.
2. If missing, create test-only customer fixture.
3. Resolve canonical customer_id.
4. Upsert one stable test-only case bound to customer_id.
5. Preserve explicit test-only source labeling.

## Planned Verification

`powershell
Invoke-RestMethod "https://nimclea-api.onrender.com/cases?email=smoke%2Bcases-existing-001%40nimclea.test" | ConvertTo-Json -Depth 20

# then:

Invoke-RestMethod "https://nimclea-api.onrender.com/case/<caseId>" | ConvertTo-Json -Depth 20
`",
",


- Backend-only authority path only.
- No frontend behavior change.
- No real customer data.
- No payment gating.
- No receipt PDF export.
- No verification unlock.
- No Supabase Storage.
- No broad RLS or migration changes.
- No release-blocking production smoke requirement.

## Stop Line

- Stop if implementation depends on legacy customers.id.
- Stop if the fixture cannot bind cases through customer_id.
- Stop if implementation requires real customer records.
- Stop if implementation expands into payment, receipt, verification, storage, or frontend behavior.

## Acceptance Criteria

- Stable test-only customer fixture exists.
- Stable test-only case fixture exists.
- /cases returns at least one fixture case.
- /case/:caseId reads back the same fixture case.
- Production read-only smoke becomes deterministic and repeatable.

## Next Action

- Protect this implementation record in the release gate.
- Then implement the narrow fixture seed script itself.
