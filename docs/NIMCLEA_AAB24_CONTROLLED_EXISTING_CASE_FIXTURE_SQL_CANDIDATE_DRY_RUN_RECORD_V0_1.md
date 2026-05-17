# AAB-24 Controlled Existing-Case Fixture SQL Candidate / Dry-Run Record

## Status

PASS / READY FOR CONTROLLED FIXTURE INSERT REVIEW

## Purpose

This record defines a controlled SQL candidate for creating one existing-case smoke fixture for future read-only validation of `GET /case/:caseId` and `GET /cases?email=...`.

AAB-24 is a dry-run and review record only. It does not execute SQL, write Supabase data, create a migration, modify runtime code, modify frontend code, include secrets, use customer data, or migrate Render/local JSON data.

## Relationship To AAB-21 / AAB-22 / AAB-23

AAB-21 defined the future existing-case fixture creation plan and required rollback boundaries.

AAB-22 selected the first target environment: an `isolated / rehearsal Supabase project`.

AAB-23 preflighted the target project and payload requirements, including the need for a deterministic non-customer identity, a minimal existing-case payload, and a narrow rollback path.

AAB-24 converts that preflight into a SQL candidate for controlled insert review. It does not authorize execution.

## Target Environment Reference

Target environment:

`isolated / rehearsal Supabase project`

This target is selected by AAB-22. This record does not duplicate target URLs, service-role values, credentials, or other secrets.

Render production is not approved for fixture creation by AAB-24.

## Fixture Payload Reference

Payload requirements are inherited from AAB-23:

- one non-customer smoke email
- one deterministic case identity
- no payment, receipt, PDF, verification, or trial lifecycle dependency
- rollback based only on deterministic fixture identifiers
- no Render JSON or local JSON migration

## Proposed Deterministic Fixture Identity

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

The current clean-authority migration uses UUID identifiers for `customers.customer_id` and `cases.case_id`, so the SQL candidate stores the human-readable label in JSON metadata and case schema rather than using it as the UUID primary key.

## Schema Alignment Basis

Files inspected:

- `docs/NIMCLEA_AAB21_EXISTING_CASE_FIXTURE_CREATION_PLAN_V0_1.md`
- `docs/NIMCLEA_AAB22_EXISTING_CASE_FIXTURE_TARGET_ENVIRONMENT_SELECTION_RECORD_V0_1.md`
- `docs/NIMCLEA_AAB23_EXISTING_CASE_FIXTURE_TARGET_PROJECT_PAYLOAD_PREFLIGHT_RECORD_V0_1.md`
- `backend/routes/caseRoutes.js`
- `backend/utils/supabaseCoreAuthorityStore.js`
- `supabase/migrations/001_nimclea_clean_authority_base.sql`
- `supabase/migrations/002_nimclea_clean_authority_service_role_grants.sql`
- `supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql`

SQL candidate basis:

- `public.customers` columns from `20260516000100_create_nimclea_clean_authority_tables.sql`
- `public.cases` columns from `20260516000100_create_nimclea_clean_authority_tables.sql`

The SQL candidate intentionally avoids columns that are not present in that clean-authority migration, including mirror-row-only fields such as `email`, `raw_record`, `case_data`, and `saved_at` on `public.cases`.

## SQL Candidate

Dry-run only. Do not execute until AAB-25 or a later controlled fixture insert review explicitly approves the target project, schema, and rollback.

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

## Read-Only Smoke Expectation

After a later approved fixture creation, `GET /case/:caseId` should be able to return a single case authority record for the deterministic fixture case identity used by the selected backend adapter/read path.

Expected single-case meaning:

- success response when the selected case identifier is requested
- stable case identity
- status/stage equivalent to `diagnostic_completed`
- event count of `0`
- no receipt, payment, PDF, verification, or trial lifecycle state created

After a later approved fixture creation, `GET /cases?email=smoke%2Bcases-existing-001%40nimclea.test` should include one case corresponding to the fixture identity.

Expected case-list meaning:

- response count greater than `0`
- one stable fixture case
- no duplicate case rows
- no deleted or tombstoned case appears
- no mutation during read
- response shape remains compatible with CasesPage expectations

Dry-run compatibility note:

- The SQL candidate uses only the current clean-authority migration columns.
- Current backend list and single-case readers also contain mirror-row assumptions in places.
- AAB-25 must confirm the selected rehearsal project schema and read adapter mapping before SQL execution. If the backend read path cannot consume the clean-authority payload without runtime changes, fixture insertion must stop until the read boundary is reviewed.

## Rollback SQL Candidate

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

Rollback review must keep `rollback` in place until the controlled execution record explicitly changes it to `commit`.

## Dry-Run Checks

- schema alignment checked against current clean-authority migration columns
- no customer data included
- no payment data included
- no receipt data included
- no verification data included
- no trial lifecycle data included
- no frontend change proposed
- no runtime behavior change proposed
- no Render migration proposed
- no local JSON migration proposed
- no secrets included
- rollback path defined with deterministic IDs and email

## Stop Line Conditions

Stop before execution if:

- target schema columns do not match this SQL candidate
- SQL requires schema mutation
- fixture identity is not deterministic
- rollback cannot be narrowly targeted
- backend read path cannot consume the proposed payload
- target project is not the AAB-22 isolated/rehearsal Supabase project
- any customer data is involved
- any payment, receipt, PDF, verification, or trial lifecycle authority is added
- any Render/local JSON data migration is proposed
- any secret must be pasted into documentation

## Next Action

Next action:

`AAB-25 controlled fixture insert review or controlled fixture creation`

Smoke 3 is not next unless the fixture exists and rollback has been confirmed.
