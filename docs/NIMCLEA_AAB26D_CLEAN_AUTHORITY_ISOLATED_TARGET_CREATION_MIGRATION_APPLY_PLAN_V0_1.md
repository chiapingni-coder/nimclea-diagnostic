# AAB-26D Clean-Authority Isolated Target Creation / Migration Apply Plan

## Status

PASS / CREATION AND MIGRATION APPLY PLAN RECORDED

## Relationship To AAB-26 / AAB-26A / AAB-26B / AAB-26C

AAB-26 attempted fixture creation preparation but did not execute SQL.

AAB-26A decided the current legacy/runtime-shaped target is not approved.

AAB-26B planned use of a true isolated clean-authority target.

AAB-26C verified that the currently selected target is blocked because `public.customers` is missing.

AAB-26D defines the plan for creating or selecting a clean isolated target and applying the reviewed clean-authority schema there.

## Problem Statement

- existing checked target is not clean-authority
- `public.customers` is missing
- `public.cases` shape does not satisfy AAB-24/AAB-26 fixture SQL expectations
- fixture creation and AAB-27 read-only smoke must remain blocked

## Decision

- use a separate isolated/rehearsal Supabase target dedicated to clean-authority schema validation
- do not use the legacy/runtime-shaped project for AAB fixture creation
- do not rewrite AAB-24 fixture SQL to fit the legacy table
- do not apply clean-authority migration to production or a Render-connected runtime target in this step

## Target Creation Plan

- create or select a separate isolated Supabase project dedicated to AAB clean-authority rehearsal
- use a non-production project name or label that makes rehearsal status obvious
- do not store secrets in docs
- do not connect this target to production Render until separately approved
- keep it free of real customer, payment, receipt, verification, or trial data

## Migration Apply Plan

- apply the reviewed clean-authority migration set to the isolated target only
- use existing reviewed migration files from `supabase/migrations`
- do not edit migration files inside AAB-26D
- apply migrations in a controlled manual session
- capture only non-secret evidence:
  - migration file names applied
  - target described generically as isolated/rehearsal clean-authority target
  - schema verification query outputs summarized
  - no keys or URLs

## Required Clean-Authority Schema After Migration

- `public.customers` exists
- `public.customers` includes `customer_id`, `email`, `source`, `metadata`, `created_at`, `updated_at` or the AAB-24 expected equivalent columns
- `public.cases` exists
- `public.cases` includes `case_id`, `customer_id`, `case_status`, `case_type`, `lifecycle_stage`, `source`, `case_schema`, `metadata`, `created_at`, `updated_at` or the AAB-24 expected equivalent columns
- optional related authority tables may include `case_events`, `receipts` or `receipt_records`, `verifications`, `payments`, `trial_lifecycle`, `audit_trail`, `hash_ledger` depending on the reviewed migration set

## Manual Read-Only Verification SQL

Run read-only SQL only after migration apply. Do not include insert, update, or delete statements here.

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'customers',
    'cases',
    'case_events',
    'receipts',
    'receipt_records',
    'verifications',
    'payments',
    'trial_lifecycle',
    'audit_trail',
    'hash_ledger'
  )
order by table_name;
```

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'customers'
order by ordinal_position;
```

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'cases'
order by ordinal_position;
```

```sql
select count(*) as existing_fixture_count
from public.customers
where email = 'smoke+cases-existing-001@nimclea.test'
   or customer_id = '00000000-0000-4000-8000-000000000023';
```

```sql
select count(*) as existing_fixture_count
from public.cases
where case_id = '00000000-0000-4000-8000-000000000024'
   or customer_id = '00000000-0000-4000-8000-000000000023';
```

## Evidence Required Before Fixture Creation Can Resume

- isolated clean-authority target identity confirmed without secrets
- migration apply completed in isolated target
- `public.customers` verified
- `public.cases` verified with clean-authority columns
- deterministic fixture IDs confirmed absent or safely upsertable
- rollback SQL from AAB-24 remains narrowly targeted
- no real customer or payment data present

## Rejected Options

- using the legacy/runtime-shaped target
- adapting AAB-24 fixture SQL to legacy `public.cases`
- running fixture insert before schema verification
- running AAB-27 before fixture creation
- applying clean-authority migration to a production or Render-connected runtime target in this step
- using Render/local JSON data as a shortcut
- including secrets in documentation

## Stop Line Conditions

Stop if:

- target identity is uncertain
- target is production or runtime-connected
- `public.customers` is missing after migration
- `public.cases` lacks AAB-24 expected clean-authority columns
- migration apply fails
- migration files require edits not separately reviewed
- real customer or payment data is present
- any secret would need to be pasted into docs
- rollback path for fixture is not narrow

## Next Action

Next action:

`AAB-26E clean-authority isolated target creation / migration apply execution record`

If manual target creation and migration apply are actually performed, AAB-26E should record the execution.

Otherwise AAB-26D remains a plan only.

Not next:

- AAB-27
- fixture insert yet
