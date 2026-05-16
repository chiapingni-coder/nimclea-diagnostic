# Nimclea Supabase Clean Authority SQL Review Checklist v0.1

## 1. Title and Version

Document: Nimclea Supabase Clean Authority SQL Review Checklist

Version: v0.1

Status: Pre-execution review only. This checklist does not authorize SQL execution, database table creation, backend endpoint changes, frontend behavior changes, production cutover, or commit activity.

## 2. Scope

This checklist reviews the documentation-only SQL draft for the future Nimclea Supabase clean authority database. It is intended to be completed before any migration candidate is created or executed.

The review assumes the accepted clean authority principles:

- Old Render JSON data is test/dev data.
- Old test data is not migrated unless explicitly needed later.
- Supabase clean database becomes the future source of truth after controlled cutover.
- Current production behavior must not be mixed with the future clean authority database before cutover.

## 3. Files Reviewed

- `docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_SCHEMA_PLAN_V0_1.md`
- `docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_SQL_DRAFT_V0_1.md`

## 4. Checklist Table

| Area | Required review item | Pass criteria | Status |
| --- | --- | --- | --- |
| All tables | SQL order | Each table follows: create table, explicit GRANT per role, enable row level security, create policy. | Review required |
| All tables | Primary key | Each table has a clear primary key. | Review required |
| All tables | Ownership columns | `customer_id` and `case_id` are present where appropriate for authority and RLS. | Review required |
| All tables | Timestamps | `created_at` exists on every table; `updated_at` exists where mutable records are expected. | Review required |
| All tables | JSONB usage | JSONB is limited to flexible snapshots, payloads, raw event data, and metadata. | Review required |
| Core data | Anon access | No broad `anon` grants exist for core Nimclea data. | Review required |
| Core data | Preferred roles | Core tables prefer authenticated ownership access or backend `service_role`. | Review required |
| Supporting data | Protected access | Event logs, audit trail, and hash ledger remain protected and are not broadly writable. | Review required |
| Migration | Old Render data | No old Render JSON migration logic is included. | Review required |
| Payments | Authority boundary | Payment state does not overwrite receipt eligibility or create verification eligibility by itself. | Review required |
| Receipts | Authority boundary | Receipt eligibility remains evidence/readiness based. | Review required |
| Verifications | Authority boundary | Verification remains downstream from issued or eligible receipt logic. | Review required |
| Trial lifecycle | Authority boundary | Trial status does not override paid receipt or verification records. | Review required |
| Trial lifecycle | Dedicated authority | Trial lifecycle has its own table and does not live inside payment, receipt, or verification records. | Review required |

## 5. Security Review

Core tables to review for authenticated or `service_role` authority:

- `customers`
- `cases`
- `diagnostics`
- `case_plans`
- `event_reviews`
- `receipts`
- `verifications`
- `payments`
- `trial_lifecycle`

Security checks:

- No broad `anon` access exists for core Nimclea data.
- Any authenticated access is scoped by customer ownership or another approved identity mapping.
- `service_role` access is backend-only and never exposed to browser clients.
- Restrictive placeholder policies are acceptable only if clearly marked for later adjustment.
- Authenticated insert/update access must be reviewed table by table before execution.
- Payment, receipt, verification, and trial lifecycle mutations should default to backend-controlled writes unless a specific authenticated write path is approved.

Audit/supporting tables to review for protection:

- `event_logs`
- `audit_trail`
- `hash_ledger`

Supporting-table checks:

- Authenticated insert/update/delete should not be granted unless explicitly justified.
- Customer-visible reads should be scoped and should not expose staff-only, system-only, or sensitive records.
- Append-oriented behavior should be preferred for event and audit history.
- Hash ledger visibility must be intentionally scoped; public readability is not assumed.

## 6. Authority Boundary Review

Payment boundary:

- Stripe or other payment processor state must not overwrite receipt eligibility.
- Payment success alone must not create verification eligibility.
- Payment records should store payment authority and processor references only.
- Payment metadata must not contain raw card data, card security codes, or processor secrets.

Receipt boundary:

- Receipt eligibility remains evidence/readiness based.
- Receipt issuance should be represented in receipt authority records, not inferred only from payment state.
- Receipt records should not replace diagnostic, case plan, event review, or verification authority.

Verification boundary:

- Verification remains downstream from issued or eligible receipt logic.
- Verification decisions should not be created by payment state alone.
- Verification records should preserve review status, decision, evidence summary, and decision payload without becoming a payment or receipt authority table.

Trial lifecycle boundary:

- Trial status does not override paid receipt records.
- Trial status does not override verification records.
- Trial lifecycle has its own authority boundary and should not be embedded as mutable payment, receipt, or verification state.

Event review boundary:

- Event reviews remain case-level review, recovery, and defensibility records.
- Event reviews do not replace append-only event logs, audit trail, receipt authority, payment authority, or verification authority.

## 7. Open Questions

- What is the final user identity mapping between Supabase `auth.users.id`, `customers.auth_user_id`, and Nimclea `customer_id`?
- Where is `customer_id` generated: database default, backend service, or a controlled account creation flow?
- Should authenticated users be allowed to insert or update `customers`, `cases`, `diagnostics`, `case_plans`, or `event_reviews` directly?
- Should backend `service_role` write all core authority records?
- Is any `anon` access needed at all?
- Should `hash_ledger` be public-readable, customer-readable only, or backend-only?
- Should status fields become database enums or check constraints before execution?
- Should `updated_at` be maintained by triggers or by backend writes?
- Should audit and event log tables be insert-only, including for normal service workflows?

## 8. Execution Stop Line

Do not execute the SQL draft until all open questions are resolved or explicitly deferred in writing.

Do not create Supabase tables until the final reviewed SQL confirms:

1. Table order is correct for every table.
2. Grants are explicit and role-scoped.
3. RLS is enabled before policies are relied on.
4. Policies match the approved identity model.
5. No broad `anon` access exists for core data.
6. Payment, receipt, verification, trial lifecycle, audit, and hash ledger boundaries are preserved.

## 9. Acceptance Criteria

- The checklist covers every required future table from the schema plan and SQL draft.
- The required table order is explicitly reviewed.
- Core table access is reviewed for authenticated or `service_role` authority.
- Audit/supporting tables are reviewed for protected access.
- Required primary keys, ownership columns, timestamps, and JSONB boundaries are reviewed.
- No old Render JSON migration logic is allowed.
- Payment, receipt, verification, and trial lifecycle authority boundaries are explicitly reviewed.
- Open questions are listed before execution.
- The document remains documentation-only and does not authorize SQL execution.

## 10. Recommendation

Use this checklist as the review gate before converting the SQL draft into a migration candidate. The next document should be a reviewed execution decision record that either approves a revised migration candidate for isolated Supabase testing or sends the SQL draft back for another documentation-only revision.
