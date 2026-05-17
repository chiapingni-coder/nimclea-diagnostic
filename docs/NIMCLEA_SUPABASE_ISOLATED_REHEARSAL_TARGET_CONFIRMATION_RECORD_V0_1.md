# Nimclea Supabase Isolated Rehearsal Target Confirmation Record v0.1

## Purpose

Confirm the clean isolated Supabase rehearsal target before any SQL execution.

## 1. Confirmed Rehearsal Target

- Project name: `nimclea-clean-authority-rehearsal-v0-1`
- Project ref: `lljzisjpgoeivptpuup`
- Project URL: `https://lljzisjpgoeivptpuup.supabase.co`
- Organization: `Nimclea`
- This is the isolated rehearsal target.

## 2. Production Separation

- Render `SUPABASE_URL` points to project ref `nljnzjewucymgjvpmqfw`.
- `nljnzjewucymgjvpmqfw` is `nimclea-db`.
- `nimclea-db` must not be touched.
- The rehearsal target ref `lljzisjpgoeivptpuup` does not match the production or current backend ref.

## 3. Clean Target Confirmation

- Table Editor public schema shows no tables or views.
- No candidate SQL has been executed yet.
- No migration file has been created.
- `supabase/migrations` has not been edited.
- JSON fallback remains unchanged.
- Routes remain unchanged.

## 4. Prior Dirty Target Decision

The previous `nimclea-clean-authority` project was deleted or replaced because it contained existing tables and test rows.

The old project was not suitable for clean create-table, grants, RLS, or policy validation.

## 5. Stop-Line

- Do not execute candidate SQL until this confirmation record is committed.
- Do not use production credentials.
- Do not remove JSON fallback.
- Do not rewire routes.
- Do not create a real migration file before isolated rehearsal passes.

## 6. Next Allowed Step

After this record is committed, prepare the SQL execution checklist for the isolated target.

The SQL source remains `docs/NIMCLEA_SUPABASE_CORE_TABLES_MIGRATION_CANDIDATE_V0_1.md`.
