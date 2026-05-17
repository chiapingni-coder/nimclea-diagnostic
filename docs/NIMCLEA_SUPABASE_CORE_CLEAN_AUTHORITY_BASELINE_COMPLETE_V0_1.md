# Nimclea Supabase Core Clean Authority Baseline Complete v0.1

## Purpose

Record that the Supabase core clean authority baseline is complete for Nimclea.

## Findings

- The following core tables have passed clean authority checks:
  - `public.case_events`
  - `public.cases`
  - `public.receipt_records`
- Each table has RLS enabled.
- Each table currently grants business data access only to `service_role`.
- `anon` and `authenticated` have no grants on these three core tables.
- Smoke rows exist only for schema authority verification.
- Old empty tables were archived rather than dropped.
- No legacy Render JSON test data was migrated.
- These tables are not yet connected to frontend or backend business writes.
- The next phase should be backend service-layer integration, not direct frontend Supabase access.

## Boundaries

- Do not modify application code.
- Do not modify SQL.
- Do not modify release gate yet.
