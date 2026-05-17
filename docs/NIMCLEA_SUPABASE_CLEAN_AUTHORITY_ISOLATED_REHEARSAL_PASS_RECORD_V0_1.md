# Nimclea Supabase Clean Authority Isolated Rehearsal Pass Record v0.1

## 1. Purpose

Record the isolated Supabase rehearsal result for the clean authority migration.

This record confirms isolated rehearsal pass only.

It does not approve production execution, backend rewiring, frontend changes, Render JSON migration, customer data migration, or live Supabase cutover.

## 2. Rehearsal Target

Rehearsal target:

- Project name: `nimclea-clean-authority-rehearsal-v0-1`
- Project ref: `lljzisjpgoeivptpuup`

Production/current backend project remains blocked:

- Production/current backend ref: `nljnzjewucymgjvpmqfw`
- Production/current backend project: `nimclea-db`

## 3. Migration Source

Migration file tested:

- `supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql`

Latest protected commit at pass time:

- `339a35f Restrict authenticated grants in Supabase clean authority migration`

## 4. Rehearsal Summary

The migration was executed in the isolated rehearsal project after prior failed checks revealed grant leakage.

Corrections made before final pass:

- aligned readiness table list from `event_logs` to `case_events`
- added explicit `revoke all ... from anon`
- added explicit `revoke all ... from public`
- added explicit `revoke all ... from authenticated`
- restored only `grant select ... to authenticated`
- preserved `service_role` controlled write grants

## 5. Verification Results

Final isolated rehearsal checks passed:

- 12 expected tables exist
- RLS is enabled on all 12 tables
- no `anon` grants remain
- no `public` grants remain
- no `ALL` grants exist
- `authenticated` has no non-SELECT table privileges
- all 12 tables have authenticated SELECT policy coverage
- `service_role` has SELECT / INSERT / UPDATE / DELETE privileges on all 12 tables

Expected tables verified:

- `customers`
- `cases`
- `diagnostics`
- `case_plans`
- `event_reviews`
- `case_events`
- `receipts`
- `verifications`
- `payments`
- `trial_lifecycle`
- `audit_trail`
- `hash_ledger`

## 6. What Remains Blocked

Still not approved:

- production SQL execution
- backend route rewiring
- frontend behavior changes
- Render JSON migration
- customer data migration
- live Supabase authority cutover
- removal of JSON fallback

## 7. Decision

Decision: isolated Supabase clean authority rehearsal passed.

Approved next step:

- prepare production migration readiness review or backend adapter rehearsal planning

Not approved:

- direct production migration
- connecting Render runtime to the new clean authority tables
- removing existing JSON fallback
