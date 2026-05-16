# Nimclea Supabase Clean Authority Migration Prep Plan v0.1

## 1. Title and Version

Document: Nimclea Supabase Clean Authority Migration Prep Plan

Version: v0.1

Status: Documentation-only preparation plan. This document does not authorize SQL execution, database table creation, migration file creation, backend endpoint changes, frontend behavior changes, production cutover, or commit activity.

## 2. Current Accepted State

- `docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_SCHEMA_PLAN_V0_1.md` defines the accepted clean authority schema plan.
- `docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_SQL_DRAFT_V0_1.md` exists as a documentation-only SQL draft.
- `docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_SQL_REVIEW_CHECKLIST_V0_1.md` exists as the pre-execution SQL review checklist.
- `docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_SQL_REVIEW_PASS_RECORD_V0_1.md` records that the SQL draft is ready for future controlled migration-file preparation, but not ready for direct execution.
- SQL has not been executed.
- Tables have not been created.
- A migration file has not been created yet.
- Old Render JSON data remains test/dev data and should not be migrated.

## 3. Why Migration Prep Is Needed Before Execution

The SQL draft is intentionally not an executable migration yet. It still contains placeholder policy assumptions and open implementation decisions.

Migration preparation is needed to:

- Convert draft SQL into a controlled migration candidate.
- Resolve final Supabase auth user to Nimclea `customer_id` identity mapping.
- Confirm whether core records are written by authenticated users, backend `service_role`, or a combination of both.
- Confirm role grants and RLS policies table by table.
- Add final constraints, indexes, and timestamp maintenance strategy.
- Define rollback expectations before any table is created.
- Verify that no old Render JSON migration logic is introduced.

## 4. Proposed Migration Naming Convention

Future migration files should use a clear timestamp and purpose-based name.

Recommended pattern:

`YYYYMMDDHHMMSS_create_nimclea_clean_authority_schema.sql`

Example placeholder:

`20260516000000_create_nimclea_clean_authority_schema.sql`

The final timestamp should be generated at migration creation time by the selected migration workflow. The migration file should not be created until a separate migration-file review pass is requested and completed.

## 5. Execution Stop Line

Do not execute SQL from the draft.

Do not create Supabase tables.

Do not create a migration file yet.

Any actual SQL execution must happen only after a separate migration file review pass approves a concrete migration candidate for an isolated Supabase environment.

Production cutover is not authorized by this plan.

## 6. Rollback Planning Principle

Rollback planning must exist before execution.

The migration candidate should define how to safely reverse table creation if isolated-environment testing fails. Rollback planning should consider:

- Dependency order between tables.
- Foreign key relationships.
- RLS policy removal.
- Role grant revocation.
- Table drop order for isolated test environments.
- Whether any generated data must be preserved for audit or debugging before rollback.

Rollback planning must not rely on old Render JSON data becoming authority.

## 7. Pre-Execution Checklist

- Confirm final `customer_id` generation strategy.
- Confirm final Supabase authenticated user binding.
- Confirm whether authenticated users may insert or update any core authority records directly.
- Confirm whether backend `service_role` writes all core records.
- Confirm no broad `anon` access is needed for core Nimclea data.
- Confirm whether `hash_ledger` is backend-only, customer-readable, or public-readable.
- Confirm all future public schema tables follow this order: create table, explicit GRANT per role, enable RLS, create policy.
- Confirm all core tables have primary keys, ownership columns, timestamps, and authority flags where appropriate.
- Confirm JSONB is used only for flexible snapshots, payloads, raw events, and metadata.
- Confirm payment state does not overwrite receipt eligibility.
- Confirm payment state does not create verification eligibility.
- Confirm receipt eligibility remains evidence/readiness based.
- Confirm verification remains downstream from issued/eligible receipt logic.
- Confirm trial lifecycle remains separate from receipt, verification, and payment authority.
- Confirm no old Render JSON migration logic is included.
- Confirm isolated Supabase environment target before execution.
- Confirm rollback plan and rollback review.

## 8. Post-Execution Verification Checklist

These checks apply only after a future migration candidate is reviewed and executed in an isolated Supabase environment.

- Confirm all expected tables exist.
- Confirm grants are present only for approved roles.
- Confirm RLS is enabled on every future public schema table.
- Confirm policies exist and match the approved identity model.
- Confirm no broad `anon` access exists for core Nimclea data.
- Confirm authenticated access is ownership-scoped where allowed.
- Confirm backend `service_role` can perform required controlled writes.
- Confirm audit/supporting tables remain protected.
- Confirm payment, receipt, verification, and trial lifecycle boundaries remain separate.
- Confirm no old Render JSON data has been imported.
- Confirm rollback procedure is still valid after execution.

## 9. What Must Not Happen Yet

- Do not execute SQL.
- Do not create database tables.
- Do not create migration files yet.
- Do not change backend endpoints.
- Do not change frontend behavior.
- Do not move production authority to Supabase.
- Do not migrate old Render JSON data.
- Do not grant broad `anon` access to core Nimclea data.
- Do not connect production runtime behavior to the clean authority database.

## 10. Recommended Next Step

Create a separate migration-file review request when ready. That request should authorize only the creation of a concrete migration candidate from the reviewed SQL draft, not execution.

After the migration candidate exists, perform a separate migration file review pass before any SQL is run. Any actual SQL execution must happen only after that separate migration file review pass.
