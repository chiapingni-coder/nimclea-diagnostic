# AAB-26 Controlled Existing-Case Fixture Creation Execution Record

## Status

PENDING / READY FOR MANUAL FIXTURE CREATION

## Execution Mode

No fixture SQL was executed by this record.

No database write has occurred.

AAB-26 is prepared for manual controlled fixture creation only. It does not claim that the fixture exists, does not claim readback success, and does not authorize Smoke 3 yet.

## Manual Pre-Execution Stop-Line Result

Record that manual Supabase SQL precheck was performed before fixture insert.

Observed result:

- `public.customers` does not exist in the selected target project.
- `public.cases` exists, but its columns match the legacy/current runtime schema, not the AAB-24 clean-authority SQL candidate.
- observed `public.cases` columns include `case_id`, `user_id`, `email`, `title`, `status`, `stage`, `receipt_eligible`, `case_receipt_eligible`, `verification_eligible`, `event_count`, `source`, `created_at`, `updated_at`, `raw_payload`, `result`, `case_data`, `raw_record`, `company`, and `name`.
- Therefore the selected target project does not match the clean-authority schema expected by AAB-24/AAB-25/AAB-26.

Decision:

- Do not execute the AAB-24/AAB-26 insert SQL.
- Do not replace rollback with commit.
- Do not proceed to AAB-27.
- Keep AAB-26 status as `PENDING / READY FOR MANUAL FIXTURE CREATION`, but blocked by schema mismatch until the correct isolated clean-authority target exists or the target schema is migrated in a separately approved step.

Next action:

- Create a separate target schema alignment decision record before any fixture creation.
- Do not adapt the fixture SQL to this legacy cases table inside AAB-26.

## Relationship To AAB-21 / AAB-22 / AAB-23 / AAB-24 / AAB-25

AAB-21 defined the existing-case fixture creation plan and rollback boundary.

AAB-22 selected the first target environment as an `isolated / rehearsal Supabase project`.

AAB-23 preflighted the target project and minimum payload needed for the backend read path.

AAB-24 provided the controlled SQL candidate and rollback SQL.

AAB-25 reviewed and approved the AAB-24 SQL candidate for controlled fixture creation, provided the selected target project schema matches the reviewed clean-authority columns.

AAB-26 records that manual fixture creation is ready, but has not yet been executed.

## Target Environment Reference

Target environment:

`isolated / rehearsal Supabase project`

The target environment is selected by AAB-22. This record does not duplicate project URLs, service-role values, credentials, or other secrets.

Render production is not approved for fixture creation by this record.

## Fixture Identity

Smoke email:

`smoke+cases-existing-001@nimclea.test`

Deterministic database customer id:

`00000000-0000-4000-8000-000000000023`

Deterministic database case id:

`00000000-0000-4000-8000-000000000024`

Human-readable fixture case label:

`CASE-AAB-EXISTING-001`

Non-customer test label:

`AAB existing-case non-customer smoke fixture`

## Schema And Read-Path Review

Files inspected:

- `docs/NIMCLEA_AAB21_EXISTING_CASE_FIXTURE_CREATION_PLAN_V0_1.md`
- `docs/NIMCLEA_AAB22_EXISTING_CASE_FIXTURE_TARGET_ENVIRONMENT_SELECTION_RECORD_V0_1.md`
- `docs/NIMCLEA_AAB23_EXISTING_CASE_FIXTURE_TARGET_PROJECT_PAYLOAD_PREFLIGHT_RECORD_V0_1.md`
- `docs/NIMCLEA_AAB24_CONTROLLED_EXISTING_CASE_FIXTURE_SQL_CANDIDATE_DRY_RUN_RECORD_V0_1.md`
- `docs/NIMCLEA_AAB25_CONTROLLED_EXISTING_CASE_FIXTURE_INSERT_REVIEW_RECORD_V0_1.md`
- `backend/routes/caseRoutes.js`
- `backend/utils/supabaseCoreAuthorityStore.js`
- `supabase/migrations/001_nimclea_clean_authority_base.sql`
- `supabase/migrations/002_nimclea_clean_authority_service_role_grants.sql`
- `supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql`

Review summary:

- AAB-24 remains the source of truth for fixture SQL and rollback SQL.
- The SQL candidate is aligned to `20260516000100_create_nimclea_clean_authority_tables.sql`.
- The older `001_nimclea_clean_authority_base.sql` has a smaller schema and is not sufficient for the AAB-24 SQL candidate without revision.
- `backend/utils/supabaseCoreAuthorityStore.js` reads `cases` by `case_id`.
- `backend/routes/caseRoutes.js` includes the `GET /case/:caseId` read path and Supabase case lookup by `case_id`.
- The current backend read paths must be verified against the selected target project schema before any fixture insert is committed.

## SQL Prepared

The following SQL is copied from AAB-24 for manual controlled execution review.

Do not execute unless the selected Supabase target project is confirmed to match the reviewed clean-authority schema.

```sql
begin;

insert into public.customers (
  customer_id,
  auth_user_id,
  email,
  display_name,
  organization_name,
  customer_status,
  source,
  is_authority_record,
  metadata,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000023',
  null,
  'smoke+cases-existing-001@nimclea.test',
  'AAB Existing Case Smoke Fixture',
  'Nimclea Non-Customer Test Data',
  'active',
  'aab_existing_case_fixture',
  true,
  jsonb_build_object(
    'fixtureType', 'aab_existing_case_smoke',
    'fixtureOwner', 'AAB-24',
    'nonCustomerTestData', true,
    'customerData', false,
    'humanCaseId', 'CASE-AAB-EXISTING-001'
  ),
  now(),
  now()
)
on conflict (email) do update set
  display_name = excluded.display_name,
  organization_name = excluded.organization_name,
  customer_status = excluded.customer_status,
  source = excluded.source,
  is_authority_record = excluded.is_authority_record,
  metadata = excluded.metadata,
  updated_at = now()
where public.customers.email = 'smoke+cases-existing-001@nimclea.test'
  and public.customers.customer_id = '00000000-0000-4000-8000-000000000023';

insert into public.cases (
  case_id,
  customer_id,
  case_status,
  case_type,
  lifecycle_stage,
  source,
  is_authority_record,
  case_schema,
  metadata,
  archived_at,
  deleted_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000024',
  '00000000-0000-4000-8000-000000000023',
  'diagnostic_completed',
  'aab_existing_case_smoke',
  'diagnostic_completed',
  'aab_existing_case_fixture',
  true,
  jsonb_build_object(
    'caseId', 'CASE-AAB-EXISTING-001',
    'email', 'smoke+cases-existing-001@nimclea.test',
    'title', 'AAB existing-case non-customer smoke fixture',
    'status', 'diagnostic_completed',
    'stage', 'diagnostic_completed',
    'eventCount', 0
  ),
  jsonb_build_object(
    'fixtureType', 'aab_existing_case_smoke',
    'fixtureOwner', 'AAB-24',
    'nonCustomerTestData', true,
    'customerData', false,
    'humanCaseId', 'CASE-AAB-EXISTING-001',
    'smokeEmail', 'smoke+cases-existing-001@nimclea.test'
  ),
  null,
  null,
  now(),
  now()
)
on conflict (case_id) do update set
  customer_id = excluded.customer_id,
  case_status = excluded.case_status,
  case_type = excluded.case_type,
  lifecycle_stage = excluded.lifecycle_stage,
  source = excluded.source,
  is_authority_record = excluded.is_authority_record,
  case_schema = excluded.case_schema,
  metadata = excluded.metadata,
  archived_at = excluded.archived_at,
  deleted_at = excluded.deleted_at,
  updated_at = now()
where public.cases.case_id = '00000000-0000-4000-8000-000000000024'
  and public.cases.customer_id = '00000000-0000-4000-8000-000000000023';

rollback;
```

Manual execution instruction:

- Confirm target project is the AAB-22 isolated/rehearsal Supabase project.
- Confirm target schema matches `20260516000100_create_nimclea_clean_authority_tables.sql`.
- Replace the final `rollback;` with `commit;` only in the controlled execution session after schema and target checks pass.
- Record execution result in this AAB-26 record before proceeding to AAB-27.

## Readback Verification

SQL-level readback verification expected after manual creation:

```sql
select
  c.customer_id,
  c.email,
  c.source,
  c.metadata ->> 'fixtureType' as fixture_type,
  k.case_id,
  k.case_status,
  k.lifecycle_stage,
  k.source as case_source,
  k.metadata ->> 'humanCaseId' as human_case_id,
  k.metadata ->> 'smokeEmail' as smoke_email
from public.customers c
join public.cases k
  on k.customer_id = c.customer_id
where c.customer_id = '00000000-0000-4000-8000-000000000023'
  and c.email = 'smoke+cases-existing-001@nimclea.test'
  and k.case_id = '00000000-0000-4000-8000-000000000024'
  and k.source = 'aab_existing_case_fixture';
```

Expected `GET /case/:caseId` readiness after creation:

- selected backend-readable case identity returns a case record
- stable fixture identity is present
- status/stage is `diagnostic_completed` or equivalent
- event count remains `0`
- no payment, receipt, PDF, verification, or trial lifecycle authority appears

Expected `GET /cases?email=...` readiness after creation:

- `GET /cases?email=smoke%2Bcases-existing-001%40nimclea.test` includes the fixture case
- response count is greater than `0`
- no duplicate fixture rows appear
- no deleted or tombstoned case appears
- read does not mutate data

No readback result is recorded yet because fixture SQL has not been executed.

## Rollback Plan

The following rollback SQL is copied from AAB-24.

Delete only deterministic fixture rows. Do not broaden these filters.

```sql
begin;

delete from public.cases
where case_id = '00000000-0000-4000-8000-000000000024'
  and customer_id = '00000000-0000-4000-8000-000000000023'
  and source = 'aab_existing_case_fixture'
  and metadata ->> 'fixtureType' = 'aab_existing_case_smoke'
  and metadata ->> 'smokeEmail' = 'smoke+cases-existing-001@nimclea.test';

delete from public.customers
where customer_id = '00000000-0000-4000-8000-000000000023'
  and email = 'smoke+cases-existing-001@nimclea.test'
  and source = 'aab_existing_case_fixture'
  and metadata ->> 'fixtureType' = 'aab_existing_case_smoke';

rollback;
```

Rollback instructions:

- Keep deterministic `case_id`, `customer_id`, email, source, and fixture metadata filters.
- Do not use broad deletes.
- Replace `rollback;` with `commit;` only in a controlled rollback execution session after confirming the fixture row exists and matches the deterministic filters.

## Safety Confirmations

- no real customer data used
- no payment data used
- no receipt data used
- no verification data used
- no trial lifecycle data used
- no secrets included
- no service-role keys included
- no schema mutation performed
- no frontend change made
- no backend runtime behavior changed
- no Render/local JSON migration performed
- no Supabase write performed by this record

## Stop Line Conditions

Stop before manual execution if:

- Supabase target is uncertain
- SQL candidate differs from AAB-24 without review
- selected target schema does not match the AAB-24 reviewed clean-authority columns
- insert fails
- rollback cannot be narrowly targeted
- SQL-level readback cannot confirm the deterministic fixture
- backend read path cannot consume the proposed payload
- any real customer data would be touched
- any payment, receipt, PDF, verification, or trial lifecycle data would be touched
- any secret must be pasted into documentation
- any Render/local JSON migration is proposed

## Next Action

Because fixture SQL has not been executed, next action remains:

`manually execute fixture SQL first, then update or replace AAB-26 with actual execution evidence`

Smoke 3 is not next until the fixture exists and rollback path is confirmed.
