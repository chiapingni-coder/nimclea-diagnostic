# Nimclea Supabase Isolated Rehearsal Readiness Review v0.1

## 1. Purpose

Approve readiness for isolated Supabase rehearsal review only.

This document does not approve production execution, backend rewiring, frontend changes, Render data migration, or Supabase production cutover.

## 2. Rehearsal Target

Approved isolated rehearsal target:

- Project name: `nimclea-clean-authority-rehearsal-v0-1`
- Project ref: `lljzisjpgoeivptpuup`
- Project URL: `https://lljzisjpgoeivptpuup.supabase.co`

Production project must not be touched:

- Production/current backend ref: `nljnzjewucymgjvpmqfw`
- Production/current backend project: `nimclea-db`

## 3. SQL Source

Approved rehearsal SQL source:

- `supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql`

This migration draft is approved for isolated rehearsal execution only.

It is not approved for production execution.

## 4. Pre-Execution Conditions

Before execution, confirm:

- The Supabase dashboard target project ref is `lljzisjpgoeivptpuup`.
- No production credentials are used.
- No Render environment variables are changed.
- No backend routes are rewired.
- No frontend behavior is changed.
- No old Render JSON data is imported.
- `pgcrypto` is available or can be enabled in the isolated target.
- The expected 12 tables are listed before execution.

Expected tables:

- `customers`
- `cases`
- `diagnostics`
- `case_plans`
- `event_reviews`
- `event_logs`
- `receipts`
- `verifications`
- `payments`
- `trial_lifecycle`
- `audit_trail`
- `hash_ledger`

## 5. Rollback / Stop-Line

Stop immediately if:

- The target ref is not `lljzisjpgoeivptpuup`.
- Any production project or production credential appears.
- `pgcrypto` cannot be enabled.
- Any broad `anon` grant appears.
- Any `grant all` appears.
- Any old Render JSON import logic appears.
- Any backend runtime is connected to the rehearsal database.
- Any frontend runtime is connected to the rehearsal database.

Rollback expectation:

Because this is an isolated throwaway rehearsal target, rollback may be handled by dropping the rehearsal tables or deleting/recreating the isolated project. No customer data or production data should exist in this target.

## 6. Post-Execution Verification Queries

After isolated execution, verify tables:

    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name;

Verify RLS:

    select schemaname, tablename, rowsecurity
    from pg_tables
    where schemaname = 'public'
    order by tablename;

Verify grants:

    select grantee, table_name, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
    order by table_name, grantee, privilege_type;

Verify policies:

    select schemaname, tablename, policyname, roles, cmd
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname;

Verify no anon grants:

    select grantee, table_name, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
    order by table_name, privilege_type;

## 7. Decision

Approved next step:

Run the protected migration draft in the isolated rehearsal target only.

Not approved:

- production execution
- backend rewiring
- frontend rewiring
- Render JSON migration
- customer data migration
- live Supabase cutover

## 8. Acceptance Criteria

This readiness review passes if:

- the isolated target is explicitly identified
- production separation is explicit
- the SQL source is explicit
- `pgcrypto` is called out
- rollback / stop-line expectations are documented
- verification queries are defined
- production execution remains blocked
