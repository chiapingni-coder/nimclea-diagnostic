# AAB-26G Controlled Existing-Case Fixture Creation Execution Update Record

## Status

PASS / CONTROLLED FIXTURE CREATED AND READBACK VERIFIED

## Relationship To AAB-26 Through AAB-26F

AAB-26 prepared the controlled fixture creation execution record, but the legacy/runtime-shaped target blocked fixture insertion.

AAB-26A rejected adapting the fixture SQL to the legacy/runtime-shaped target.

AAB-26B defined the clean-authority isolated target path.

AAB-26C recorded the old checked target as blocked because `public.customers` was missing.

AAB-26D defined the clean-authority isolated target creation / migration apply plan.

AAB-26E recorded the creation / migration apply execution record before actual fixture insertion.

AAB-26F verified the clean-authority isolated target schema.

AAB-26G resumes fixture creation only after AAB-26F verified the new clean-authority isolated target.

## Target Description

Target:

`isolated / rehearsal clean-authority Supabase target`

Target name:

`nimclea-aab-clean-authority-rehearsal`

No secrets, URLs, API keys, database passwords, or credentials are included in this record.

## SQL Execution Summary

- controlled fixture SQL was manually executed in Supabase SQL Editor
- execution committed successfully
- no rollback was executed

## Fixture Identity

- `customer_id`: `00000000-0000-4000-8000-000000000023`
- `case_id`: `00000000-0000-4000-8000-000000000024`
- `email`: `smoke+cases-existing-001@nimclea.test`
- `source`: `aab_existing_case_fixture`
- fixture type: `aab_existing_case_smoke`
- human case id: `CASE-AAB-EXISTING-001`

## Readback Verification Summary

Final compact readback query returned:

- `matched_rows = 1`
- `email_ok = true`
- `customer_source_ok = true`
- `customer_fixture_type_ok = true`
- `case_status_ok = true`
- `lifecycle_stage_ok = true`
- `case_source_ok = true`
- `human_case_id_ok = true`
- `smoke_email_ok = true`

## Rollback Plan

Rollback remains available from AAB-24 and AAB-26.

The rollback path must remain narrowly targeted and must not be broadened.

No rollback was executed by this record.

## Safety Confirmations

- no real customer data
- no payment data
- no receipt data
- no verification data
- no trial lifecycle data
- no secrets included
- no Render/local JSON migration
- no frontend runtime behavior change
- no backend runtime behavior change

## Stop Line Conditions

Stop future steps if:

- fixture readback disappears
- duplicate fixture rows appear
- target identity becomes uncertain
- rollback cannot be narrowly targeted
- any real customer or payment data is touched

## Next Action

Next action:

`AAB-27 existing-case read-only smoke execution record`

Do not run rollback.

Do not mutate production.

Do not connect this isolated target to Render unless separately approved.
