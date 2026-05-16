# NIMCLEA Supabase Clean Authority Migration Apply Plan v0.1

## Purpose

This document defines the pre-live apply boundary for the Supabase clean authority migration.

It does not authorize immediate execution by itself.

## Current Status

The clean authority schema plan, SQL draft, SQL review pass record, migration draft pass record, and execution rehearsal plan already exist.

The migration guard has passed.

The next step is to define the live apply boundary before running the migration against the target Supabase database.

## Scope

Target migration:

`supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql`

This apply plan covers the first clean authority schema foundation only.

## Must Pass Before Apply

Before live apply, all of the following must be true:

- `git status --short` returns clean.
- `node scripts/check-supabase-clean-authority-migration-draft.mjs` returns PASS.
- `node scripts/check-release-gate.mjs` returns FAIL 0.
- Target Supabase project is confirmed.
- Target database environment is confirmed.
- No old Render JSON data is being migrated into these tables during this apply.
- No customer production data is expected to be overwritten.
- Migration SQL contains explicit grants.
- Migration SQL enables row level security.
- Migration SQL creates policies.
- No broad anon authority grants are introduced.
- `case_schema jsonb` remains the official embedded case schema snapshot field.
- No standalone `case_snapshots` table is introduced in v0.1.

## Stop Conditions

Stop immediately if any of the following occurs:

- Target Supabase project is uncertain.
- Environment is uncertain.
- Migration guard fails.
- Release gate shows FAIL.
- SQL file has been modified after the latest guard pass.
- Any destructive operation appears in the migration unexpectedly.
- Any table creation conflicts with existing live tables.
- Any policy or grant creates broader access than intended.

## Apply Boundary

This migration may create clean authority foundation tables.

This migration must not:

- Import old Render JSON data.
- Delete existing production data.
- Rename existing live authority tables.
- Add fake customer data.
- Add bypass states.
- Change frontend routing.
- Change payment behavior.
- Change Receipt PDF behavior.

## Expected Result

After successful apply, the Supabase database should contain the clean authority foundation tables with:

- explicit grants
- RLS enabled
- policies created
- authority boundaries preserved
- `case_schema jsonb` present where required
- no standalone `case_snapshots` table

## Post-Apply Required Record

If the migration is applied successfully, create:

`docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_MIGRATION_LIVE_PASS_RECORD_V0_1.md`

If the migration is not applied, do not create a live pass record.

## Decision

This apply plan authorizes preparation for live migration execution only after all pre-apply checks pass.

It does not authorize uncontrolled manual SQL edits in the Supabase dashboard.
