# Nimclea Case Events Clean Authority Pass Record v0.1

## Purpose

Record that `public.case_events` passed the Supabase clean authority baseline check.

## Findings

- The old empty `public.case_events` table was archived as `public.case_events_archive_pre_clean_authority_v0_1`.
- The new `public.case_events` table was created cleanly.
- RLS is enabled.
- Expected columns are present:
  - `id`
  - `case_id`
  - `event_type`
  - `event_source`
  - `event_payload`
  - `event_review`
  - `authority_source`
  - `created_at`
- `anon` has no grants.
- `authenticated` has no grants.
- `service_role` has only `DELETE`, `INSERT`, `SELECT`, `UPDATE`.
- The smoke row exists:
  - `case_id = schema-smoke-case-events-v0-1`
  - `event_type = schema_authority_smoke`
- No legacy Render JSON data was migrated.
- This table is not yet connected to frontend or backend business writes.

## Boundaries

- Do not modify application code.
- Do not modify release gate yet.
