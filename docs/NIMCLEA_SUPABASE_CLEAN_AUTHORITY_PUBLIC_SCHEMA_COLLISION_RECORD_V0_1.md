# NIMCLEA Supabase Clean Authority Public Schema Collision Record v0.1

## Purpose

This record documents why the original clean authority migration must not be applied directly to the public schema.

## Finding

During live pre-apply inspection, the target Supabase project already contained:

- `public.cases`
- `public.hash_ledger`

Row counts:

- `public.cases`: 66 rows
- `public.hash_ledger`: 0 rows

## Existing public.cases Status Distribution

Observed `public.cases` status counts:

- `workspace_active`: 28
- `diagnostic_completed`: 14
- `draft`: 9
- `result_ready`: 5
- `receipt_ready`: 4
- `receipt_issued`: 3
- blank or null status: 2
- `verification_completed`: 1

Total observed rows: 66.

## Existing public.cases Shape

Observed columns include:

- `case_id` text
- `user_id` uuid
- `email` USER-DEFINED
- `title` text
- `status` text default `'draft'::text`

## Collision

The clean authority migration expects to create a new `public.cases` table with a different structure, including:

- `case_id` uuid primary key default `gen_random_uuid()`
- `customer_id` uuid references `public.customers(customer_id)`
- `case_schema` jsonb
- `metadata` jsonb

Therefore, the existing `public.cases` table is not the clean authority table.

## Decision

The original public-schema clean authority migration is blocked.

Do not:

- rerun the original migration
- drop `public.cases`
- alter `public.cases`
- overwrite existing case data
- force clean authority columns into the existing table

## Recommended Direction

Use an isolated clean authority schema, such as:

`nimclea_authority`

This keeps existing `public` data untouched while allowing the clean authority foundation to be created safely.

## Status

Original public-schema apply: BLOCKED

Next required action: prepare an isolated-schema migration plan before any further database execution.
