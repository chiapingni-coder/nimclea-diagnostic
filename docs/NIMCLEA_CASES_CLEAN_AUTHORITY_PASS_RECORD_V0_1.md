# Nimclea Cases Clean Authority Pass Record v0.1

## Purpose

Record that `public.cases` passed the Supabase clean authority baseline check.

## Findings

- The old empty `public.cases` table was archived as `public.cases_archive_pre_clean_authority_v0_1`.
- The new `public.cases` table was created cleanly.
- RLS is enabled.
- Expected columns are present:
  - `id`
  - `case_id`
  - `user_email`
  - `customer_id`
  - `case_title`
  - `status`
  - `stage`
  - `diagnostic_payload`
  - `result_payload`
  - `case_metadata`
  - `authority_source`
  - `created_at`
  - `updated_at`
- `anon` has no grants.
- `authenticated` has no grants.
- `service_role` has only `DELETE`, `INSERT`, `SELECT`, `UPDATE`.
- The smoke row exists:
  - `case_id = schema-smoke-cases-v0-1`
  - `user_email = schema-smoke@nimclea.test`
- No legacy Render JSON data was migrated.
- This table is not yet connected to frontend or backend business writes.

## Boundaries

- Do not modify application code.
- Do not modify release gate yet.
