# AAB-26C Clean-Authority Target Schema Verification Record

## Status

PENDING / READY FOR MANUAL SCHEMA VERIFICATION

## Relationship To AAB-26, AAB-26A, And AAB-26B

AAB-26 recorded the controlled fixture creation execution record and the manual pre-execution stop line.

AAB-26A decided not to adapt the fixture SQL to the legacy/runtime-shaped target.

AAB-26B defined the plan to confirm or create a true isolated clean-authority target.

AAB-26C verifies whether the selected isolated/rehearsal target actually matches the clean-authority schema required by AAB-24 and AAB-26 before any fixture insert can happen.

## Verification Purpose

- confirm that the selected isolated/rehearsal target matches the clean-authority schema expected by AAB-24/AAB-26
- prevent fixture insert into legacy/runtime-shaped schema

## Target Identity

Target:

`isolated / rehearsal clean-authority Supabase target`

This record deliberately omits project URLs, service-role keys, anon keys, and other credentials.

## Required Table Checks

- `public.customers` exists
- `public.cases` exists

## Required Customer Column Checks

- `customer_id`
- `email`
- `source`
- `metadata`
- `created_at`
- `updated_at`

## Required Case Column Checks

- `case_id`
- `customer_id`
- `case_status`
- `case_type`
- `lifecycle_stage`
- `source`
- `case_schema`
- `metadata`
- `created_at`
- `updated_at`

## Optional Clean-Authority Table Checks

If present, also verify:

- `case_events`
- `receipts` or `receipt_records`, depending on current migration naming
- `verifications`
- `payments`
- `trial_lifecycle`
- `audit_trail`
- `hash_ledger`

## Manual Read-Only Verification SQL

Use read-only SQL only. Do not execute insert, update, or delete statements here.

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

## Verification Result

No actual schema verification SQL output is available in this record.

Verification has not yet been executed.

## Decision

PENDING

This record cannot confirm clean-authority schema alignment until the read-only verification SQL is run and reviewed.

## Stop Line Conditions

Stop if:

- `public.customers` is missing
- `public.cases` is missing
- `public.cases` exists but uses the legacy/runtime shape
- required AAB-24 columns are missing
- target identity is uncertain
- target contains real customer or payment data
- any secret would need to be pasted into docs
- any schema migration is proposed without a separate approved plan

## Next Action

If PASS:

- `AAB-26D controlled fixture creation execution update` or `AAB-26 fixture creation PASS update`

If PENDING:

- manually run schema verification SQL first

If BLOCKED:

- return to target creation or migration plan

Not next:

- AAB-27
- fixture insert yet unless schema verification passes
