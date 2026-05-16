# Nimclea Supabase Clean Authority Migration Execution Rehearsal Plan v0.1

## 1. Title and Version

Document: Nimclea Supabase Clean Authority Migration Execution Rehearsal Plan

Version: v0.1

Status: Documentation-only rehearsal plan. This document does not authorize SQL execution, Supabase connection, database table creation, backend endpoint changes, frontend behavior changes, production cutover, migration file creation, or commit activity.

## 2. Current Protected State

The protected migration draft exists at:

```text
supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql
```

Current state:

- SQL has not been executed.
- Supabase has not been connected.
- Tables have not been created.
- This is a rehearsal plan only.
- The migration draft is not approved for direct production execution yet.
- Old Render JSON data remains test/dev data and should not be migrated.
- The migration draft includes `create extension if not exists pgcrypto;` before `gen_random_uuid()` usage.
- The migration draft includes 12 future clean authority tables.
- The migration draft has been accepted as a protected draft file only.

## 3. Why Rehearsal Is Required Before Execution

Rehearsal is required before execution because the migration draft still depends on final confirmation of environment, role behavior, identity mapping, RLS behavior, and rollback expectations.

The rehearsal must prove that:

- The target Supabase environment is isolated and non-production.
- `pgcrypto` is available before UUID defaults are used.
- Table creation succeeds in dependency order.
- Grants are limited to approved roles.
- RLS is enabled on all 12 future authority tables.
- Authenticated access is limited by RLS.
- `service_role` can perform controlled backend writes.
- No `anon` grants are present.
- No old Render JSON migration logic is introduced.
- Payment, receipt, verification, and trial lifecycle authority boundaries remain separate.

## 4. Target Environment Rule

The first execution rehearsal must use an isolated Supabase environment only.

Production execution is not the next immediate step. Production execution must remain blocked until an isolated rehearsal has passed, results have been reviewed, rollback expectations have been confirmed, and a separate production execution approval exists.

The isolated target must be explicitly identified before any SQL is run. Do not use production, shared customer data, or any environment connected to live backend authority for the first rehearsal.

## 5. Pre-Execution Checklist

Before any isolated rehearsal execution is approved, confirm:

- The isolated Supabase project or local isolated Supabase environment is named and documented.
- The migration file under review is exactly `supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql`.
- `pgcrypto` extension availability is confirmed for the isolated target.
- Final rehearsal owner and reviewer are identified.
- No backend endpoints will be rewired during the rehearsal.
- No frontend behavior will be changed during the rehearsal.
- No production secrets will be used.
- Old Render JSON data remains test/dev data and will not be imported.
- The expected 12 tables are listed before execution.
- The expected grant pattern is listed before execution.
- The expected RLS policy behavior is listed before execution.
- Rollback and stop-line rules are accepted before execution begins.

## 6. Execution Dry-Run Checklist

During a future isolated rehearsal, track each step without changing production behavior:

- Confirm the target is isolated before connecting.
- Confirm `create extension if not exists pgcrypto;` is available and runs before table creation.
- Apply the migration draft only to the isolated target.
- Do not run old Render JSON import logic.
- Do not seed production data.
- Do not connect application runtime traffic to the isolated schema.
- Record whether each table block follows: create table, explicit GRANT, enable RLS, create policy.
- Record any SQL errors, warnings, extension issues, grant issues, or policy issues.
- Stop immediately if the target is discovered to be production or production-adjacent.

## 7. Post-Execution Verification Checklist

After a future isolated rehearsal execution, verify:

- All 12 tables exist:
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
- RLS is enabled on all 12 tables.
- No `anon` grants exist on the 12 tables.
- No `grant all` exists on the 12 tables.
- `service_role` can write where controlled backend writes are expected.
- `authenticated` can only select through RLS-scoped policies.
- Authenticated users cannot bypass customer ownership restrictions.
- Event logs, audit trail, and hash ledger remain protected from broad authenticated writes.
- Payment state does not overwrite receipt eligibility.
- Payment state does not create verification eligibility.
- Trial lifecycle remains separate from receipt, verification, and payment authority.
- No old Render JSON data has been imported.
- No backend endpoint has been rewired to the isolated rehearsal database.
- No frontend behavior has been connected to the isolated rehearsal database.

## 8. Rollback / Stop-Line Rules

Rollback planning must be approved before isolated execution begins.

Stop immediately if:

- The target environment is production or production-adjacent.
- `pgcrypto` is unavailable or cannot be enabled in the isolated target.
- Any table is created in an unintended environment.
- Any broad `anon` grant appears.
- Any `grant all` appears.
- Any old Render JSON migration or import logic appears.
- Any application runtime is connected before separate backend rewiring approval.
- Payment, receipt, verification, or trial lifecycle authority boundaries are mixed.

Rollback expectations must account for table dependency order, RLS policies, grants, and extension behavior in the isolated target. Rollback must not rely on old Render JSON data becoming authority.

## 9. What Must Not Happen Yet

- Do not execute SQL.
- Do not connect to Supabase.
- Do not create database tables.
- Do not create new migration files.
- Do not modify backend code.
- Do not change backend endpoints.
- Do not modify frontend code.
- Do not change frontend behavior.
- Do not commit.
- Do not run production execution.
- Do not migrate old Render JSON data.
- Do not rewire backend runtime behavior without separate approval.

## 10. Acceptance Criteria

- This document clearly states that SQL has not been executed.
- This document clearly states that Supabase has not been connected.
- This document clearly states that tables have not been created.
- This document clearly states that this is a rehearsal plan only.
- This document clearly states that the migration draft is not approved for direct production execution yet.
- This document clearly states that old Render JSON data remains test/dev data and should not be migrated.
- The plan recommends an isolated Supabase environment first.
- The plan does not recommend production execution as the next immediate step.
- The plan requires confirmation that `pgcrypto` is available.
- The plan requires verification that all 12 tables exist after isolated execution.
- The plan requires verification that RLS is enabled on all 12 tables.
- The plan requires verification that no `anon` grants exist.
- The plan requires verification that `service_role` can write and `authenticated` can only select through RLS.
- The plan requires separate approval before backend rewiring.

## 11. Recommended Next Step

Perform a separate isolated rehearsal readiness review. That review should identify the isolated Supabase target, confirm `pgcrypto` availability, approve rollback expectations, and define the exact verification queries to run after isolated execution.
