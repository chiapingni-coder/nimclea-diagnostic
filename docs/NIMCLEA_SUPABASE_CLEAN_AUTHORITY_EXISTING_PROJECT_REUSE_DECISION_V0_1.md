# Nimclea Supabase Clean Authority Existing Project Reuse Decision v0.1

## Purpose

Record the decision about the existing Supabase project `nimclea-clean-authority` before using any rehearsal target.

## 1. Existing Projects Checked

- `nimclea-db` project ref: `nljnzjewucymgjvpmqfw`
- `nimclea-db` matches Render `SUPABASE_URL` and must not be touched.
- `nimclea-clean-authority` project ref: `zticvnrcvcjrbclldtl`
- `nimclea-clean-authority` does not match Render `SUPABASE_URL`.

## 2. Existing `nimclea-clean-authority` Table State

- `public.case_events` estimated 1 row
- `public.cases` estimated 1 row
- `public.customers` estimated 1 row
- `public.nimclea_schema_authority_smoke` estimated 1 row
- `public.receipt_records` estimated 1 row
- `public.trial_lifecycle` estimated 1 row
- archive pre-clean tables estimated 0 rows
- RLS is enabled on listed tables

## 3. Decision

Do not run the new clean authority rehearsal directly on this existing project state.

Reason: existing tables would pollute create-table, grant, RLS, and policy validation.

Treat `nimclea-clean-authority` as old test or smoke state, not a fresh throwaway target.

## 4. Recommended Next Action

- Do not touch `nimclea-db`.
- Either delete and recreate `nimclea-clean-authority` as `nimclea-clean-authority-rehearsal-v0-1`, or explicitly reset it only after a separate cleanup confirmation.
- No SQL execution until the fresh or clean target is confirmed and committed.

## 5. Stop-Line

- Do not run candidate SQL on the current dirty `nimclea-clean-authority` state.
- Do not create a migration file.
- Do not edit `supabase/migrations`.
- Do not remove JSON fallback.
- Do not rewire routes.
