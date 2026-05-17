# AAB-26E Clean-Authority Isolated Target Creation / Migration Apply Execution Record

## Status

PENDING / READY FOR MANUAL TARGET CREATION AND MIGRATION APPLY

## Relationship To AAB-26 / AAB-26A / AAB-26B / AAB-26C / AAB-26D

AAB-26 fixture creation was prepared but not executed.

AAB-26A rejected the legacy/runtime-shaped target.

AAB-26B selected the clean-authority isolated target path.

AAB-26C recorded the checked target as blocked because `public.customers` was missing.

AAB-26D defined the plan for creating or selecting a clean isolated target and applying the reviewed clean-authority migration there.

AAB-26E records whether that creation and migration execution actually occurred.

## Execution Evidence

No Supabase project was created by this record.

No migration was applied by this record.

No SQL was executed by this record.

No fixture was inserted by this record.

No AAB-27 smoke was run by this record.

This record does not claim clean-authority target creation or migration apply PASS evidence.

## Migration Files Reviewed

Reviewed clean-authority migration files relevant to this execution record:

- `supabase/migrations/001_nimclea_clean_authority_base.sql`
- `supabase/migrations/002_nimclea_clean_authority_service_role_grants.sql`
- `supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql`

## Manual Execution Checklist

- create or select isolated/rehearsal Supabase target
- confirm it is not production and not Render-connected runtime
- apply reviewed clean-authority migration set
- do not paste secrets into docs
- run read-only schema verification SQL
- confirm deterministic fixture rows are absent or safely upsertable
- keep AAB-24 rollback SQL available
- do not insert fixture yet

## Required Post-Migration Schema Expectation

- `public.customers` exists
- `public.customers` includes `customer_id`, `email`, `source`, `metadata`, `created_at`, `updated_at` or the AAB-24 expected equivalents
- `public.cases` exists
- `public.cases` includes `case_id`, `customer_id`, `case_status`, `case_type`, `lifecycle_stage`, `source`, `case_schema`, `metadata`, `created_at`, `updated_at` or the AAB-24 expected equivalents
- optional related tables may include `case_events`, `receipts` or `receipt_records`, `verifications`, `payments`, `trial_lifecycle`, `audit_trail`, `hash_ledger` depending on the reviewed migration set

## Read-Only Verification SQL

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

## Decision

PENDING

Manual target creation and migration apply still need to be performed before this record can become a PASS execution record.

## Stop Line Conditions

Stop if:

- target identity is uncertain
- target is production or runtime-connected
- migration apply was not actually performed
- `public.customers` is missing after migration
- `public.cases` lacks AAB-24 expected clean-authority columns
- migration files require unreviewed edits
- real customer or payment data is present
- any secret would need to be pasted into docs
- fixture insert is attempted before schema verification
- AAB-27 is attempted before fixture creation and readback

## Next Action

If PASS:

- `AAB-26F clean-authority target schema verification pass record`, or update the appropriate schema verification record with evidence

If PENDING:

- manually create or confirm isolated target and apply migration first

If BLOCKED:

- return to target creation or migration troubleshooting

Not next:

- AAB-27
- fixture insert yet unless schema verification passes
