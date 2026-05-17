# Nimclea Supabase Isolated Rehearsal Target Decision v0.1

## Purpose

Record the isolated rehearsal target decision before any SQL execution.

## 1. Selected Target

Use a new throwaway Supabase project as the rehearsal target.

- Not production
- Not current Nimclea production Supabase
- Not local-only rehearsal

## 2. Reason

The throwaway Supabase project is required to validate real Supabase `GRANT`, row level security, policy behavior, `anon` blocking, authenticated limits, and `service_role` write behavior.

Local rehearsal is useful for SQL shape, but it is not sufficient for authority-boundary confidence.

## 3. Stop-Line

- Do not execute SQL until the throwaway project name or ref is recorded.
- Do not use production credentials.
- Do not create a real migration file.
- Do not edit `supabase/migrations`.
- Do not remove JSON fallback.
- Do not rewire routes.

## 4. Required Before Execution

- Record the throwaway project name or ref.
- Confirm no production env is loaded.
- Confirm SQL source remains `docs/NIMCLEA_SUPABASE_CORE_TABLES_MIGRATION_CANDIDATE_V0_1.md`.
- Confirm the runbook is `docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_ISOLATED_REHEARSAL_RUNBOOK_V0_1.md`.

## 5. Next Allowed Step

Create a target confirmation record after the throwaway Supabase project exists.

Still no SQL execution until the target confirmation is committed.
