# AAB-27 Existing-Case Read-Only Smoke Execution Record

## Status

PENDING / READY FOR READ-ONLY SMOKE EXECUTION

## Relationship To AAB-26F And AAB-26G

AAB-26F verified the clean-authority isolated target schema.

AAB-26G recorded the controlled existing-case fixture creation execution update and readback verification for the deterministic smoke fixture.

AAB-27 records the read-only endpoint smoke step that should confirm the fixture is readable through the backend read paths.

## Target Description

Target:

`isolated / rehearsal clean-authority Supabase target`

Target identity remains recorded generically and without secrets.

## Fixture Identity

- `customer_id`: `00000000-0000-4000-8000-000000000023`
- `case_id`: `00000000-0000-4000-8000-000000000024`
- `email`: `smoke+cases-existing-001@nimclea.test`
- `source`: `aab_existing_case_fixture`
- human case id: `CASE-AAB-EXISTING-001`

## Smoke Scope

This record is read-only only.

No insert, update, delete, or rollback SQL is part of this record.

No fixture mutation is part of this record.

No production mutation is part of this record.

No frontend or backend runtime behavior change is part of this record.

No secrets are included.

## Smoke Commands Or Request Descriptions

Not yet executed in this record.

Planned read-only endpoint smoke:

- `GET /case/00000000-0000-4000-8000-000000000024`
- `GET /cases?email=smoke%2Bcases-existing-001%40nimclea.test`

## Expected Result

If executed, the smoke should show:

- `/case/:caseId` returns the controlled fixture case
- `/cases?email=...` includes the controlled fixture case
- returned case identity matches the fixture id and email
- status/stage is `diagnostic_completed` or equivalent
- source is `aab_existing_case_fixture` or equivalent authority source
- no duplicate fixture cases
- no deleted or tombstoned fixture case
- no write side effects

## Observed Results

No endpoint smoke has been executed in this record.

No observed results are claimed.

## Decision

PENDING

This record is ready for read-only smoke execution but does not yet prove the endpoint result.

## Safety Confirmations

- no fixture mutation
- no rollback
- no production mutation
- no secrets included
- no Render/local JSON migration
- no frontend/backend runtime behavior change

## Stop Line Conditions

Stop if:

- endpoint cannot read the fixture
- backend is not pointed to the isolated clean-authority target
- fixture identity mismatches
- duplicate fixture records appear
- any write or mutation is required
- any secret would need to be documented

## Next Action

If PASS:

- `AAB-28 existing-case smoke result protection / regression guard plan`

If PENDING:

- manually run read-only endpoint smoke first

If BLOCKED:

- troubleshoot backend target/env wiring before continuing
