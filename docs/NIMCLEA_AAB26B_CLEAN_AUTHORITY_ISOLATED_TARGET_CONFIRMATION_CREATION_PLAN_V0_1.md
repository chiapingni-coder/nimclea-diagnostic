# AAB-26B Clean-Authority Isolated Target Confirmation / Creation Plan

## Status

PASS / TARGET CREATION PLAN RECORDED

## Relationship To AAB-26 And AAB-26A

AAB-26 recorded the controlled fixture creation execution record and the manual pre-execution stop-line result.

AAB-26A recorded the target schema alignment decision after the manual precheck found that the selected target project is legacy/runtime-shaped and not compatible with the AAB-24 clean-authority SQL candidate.

AAB-26B responds to that decision by defining the path to a true isolated clean-authority target before any future fixture insert can occur.

## Problem Statement

- the selected target was legacy/runtime-shaped
- clean-authority fixture SQL cannot safely run there
- AAB-26 remains `PENDING / READY FOR MANUAL FIXTURE CREATION`, but blocked by schema mismatch

## Decision

- use a true isolated/rehearsal clean-authority Supabase target
- do not use the legacy/runtime-shaped project for AAB fixture creation
- do not rewrite AAB-24 fixture SQL for the legacy table

## Target Options

1. Confirm an existing isolated clean-authority target if it already exists and schema matches.
2. Create a new isolated clean-authority Supabase project.

## Preferred Path

- create or confirm a separate isolated clean-authority target
- apply or rehearse the reviewed clean-authority migration in a separately approved step
- verify schema before fixture creation

## Required Target Schema Checks

- `public.customers` exists
- `public.customers` has `customer_id`, `email`, `source`, `metadata`, `created_at`, `updated_at` or the columns expected by AAB-24
- `public.cases` has `case_id`, `customer_id`, `case_status`, `case_type`, `lifecycle_stage`, `source`, `case_schema`, `metadata`, `created_at`, `updated_at` or the columns expected by AAB-24
- target does not contain real customer or payment data

## Manual Verification SQL Candidates

Use read-only SQL to verify table existence and column shape before any fixture work.

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('customers', 'cases');
```

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('customers', 'cases')
order by table_name, ordinal_position;
```

Do not include insert SQL in this record.

## Required Evidence Before AAB-26 Can Be Updated To PASS

- clean-authority target identity confirmed without secrets
- schema shape confirmed
- fixture SQL compatibility confirmed
- rollback path remains narrow

## Rejected Options

- adapting AAB-24 SQL to legacy `public.cases`
- running fixture insert in the current legacy/runtime-shaped target
- running Smoke 3 without fixture creation
- using Render or local JSON data as a shortcut
- changing runtime schema inside AAB-26B

## Stop Line Conditions

Stop if:

- target identity is uncertain
- `public.customers` is missing
- `public.cases` lacks clean-authority columns
- a schema migration is needed but has no separately approved plan
- any real customer or payment data is present
- any secret would need to be pasted into docs

## Next Action

Next action:

`AAB-26C clean-authority target schema verification record`

Not next:

- AAB-27
- fixture insert yet
