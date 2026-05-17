# Nimclea Supabase Schema Clean Authority Smoke Pass Record v0.1

## Purpose

Record that the Supabase clean schema authority smoke table passed the baseline authority check.

## Findings

- `public.nimclea_schema_authority_smoke` has RLS enabled.
- `anon` has `SELECT` only.
- `authenticated` has `DELETE`, `INSERT`, `SELECT`, `UPDATE` only.
- `service_role` has `DELETE`, `INSERT`, `SELECT`, `UPDATE` only.
- No legacy Render JSON test data is migrated.

## Forward Creation Order

`cases`, `case_events`, and `receipt_records` should be created later using the same order:

`create table → explicit GRANT → enable RLS → create policy → smoke test → document → release gate`

## Boundaries

- Do not modify application code.
- Do not modify release gate yet.
