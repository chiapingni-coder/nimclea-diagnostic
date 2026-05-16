# Nimclea Supabase Clean Authority Schema Plan v0.1

## 1. Title and Version

Document: Nimclea Supabase Clean Authority Schema Plan

Version: v0.1

Status: Planning only. No SQL, database table creation, backend endpoint change, frontend behavior change, or production cutover is authorized by this document.

## 2. Why This Document Exists

The 004 clean database / eventReview schema embedding pass has been accepted as schema-only, behavior-neutral, and protected. This document defines the future clean Supabase database authority schema plan that should follow that accepted pass.

The purpose is to describe the intended authority areas, relationships, data ownership, security posture, and cutover sequence before any implementation work begins.

## 3. Current Accepted State

- Old Render JSON data is test/dev data.
- Old test data should not be migrated unless explicitly needed later.
- Supabase clean database becomes the future source of truth.
- Cutover must be controlled and must not be mixed into current production behavior.
- The 004 Event Review schema embedding is accepted as passive, behavior-neutral schema preparation.
- Backend pass-through was inspected, and no backend code change was required for the accepted 004 schema-only pass.

## 4. Clean Database Authority Principle

The clean Supabase database should become the future authority for customer, case, diagnostic, case plan, event review, case event, receipt, verification, payment, trial lifecycle, audit trail, and hash ledger records.

The clean authority database should start from intentional schema contracts, not from accidental shapes found in old Render JSON files. Existing JSON files may be used for debugging, sample fixtures, edge-case analysis, or migration test design, but they are not canonical production history for the clean authority database.

No current production behavior should read from or write to the clean authority database until a controlled cutover phase explicitly authorizes that behavior.

## 5. Table Area Map

### 5.1 customers

- Purpose: Authoritative customer identity, account-level contact data, and ownership boundary.
- Likely primary key: `customer_id`.
- Relationship to `customer_id` and `case_id`: Owns `customer_id`; does not require `case_id`.
- First-class columns: customer identifier, email, display name or organization name, status, created timestamp, updated timestamp.
- JSONB: Optional low-risk profile metadata, external provider metadata, and future extension fields that are not needed for filtering, joins, or authority decisions.
- Should not store: Full case records, diagnostics, payments, receipts, verification artifacts, event reviews, or audit log bodies.
- Authority type: Core authority.

### 5.2 cases

- Purpose: Authoritative case shell and lifecycle state for each customer case.
- Likely primary key: `case_id`.
- Relationship to `customer_id` and `case_id`: Belongs to one `customer_id`; owns `case_id` for related case-level records.
- First-class columns: case identifier, customer identifier, case status, case type, lifecycle stage, created timestamp, updated timestamp, archived or deleted marker if applicable.
- JSONB: Passive embedded schema snapshots, non-authority display metadata, and extension fields that should travel with the case but are not primary query keys.
- Should not store: Complete diagnostics, event review result history, payment authority, receipt authority, verification authority, or append-only audit records.
- Authority type: Core authority.

### 5.3 diagnostics

- Purpose: Authoritative diagnostic submission and diagnostic result record associated with a case.
- Likely primary key: `diagnostic_id`.
- Relationship to `customer_id` and `case_id`: Belongs to one `customer_id` and one `case_id`.
- First-class columns: diagnostic identifier, customer identifier, case identifier, diagnostic status, submitted timestamp, completed timestamp, version, result status.
- JSONB: Diagnostic answers, scored dimensions, structured result details, and versioned diagnostic payload snapshots.
- Should not store: Case plan authority, payment state, receipt records, verification decisions, or unrelated event logs.
- Authority type: Core authority.

### 5.4 case_plans

- Purpose: Authoritative case plan or pilot setup structure that follows diagnostic completion.
- Likely primary key: `case_plan_id`.
- Relationship to `customer_id` and `case_id`: Belongs to one `customer_id` and one `case_id`.
- First-class columns: case plan identifier, customer identifier, case identifier, plan status, plan version, started timestamp, completed timestamp.
- JSONB: Plan configuration, milestone structure, pilot setup detail, structured readiness notes, and versioned plan payload snapshots.
- Should not store: Payment processor payloads, receipt authority, verification decisions, or unrelated audit trails.
- Authority type: Core authority.

### 5.5 event_reviews

- Purpose: Authoritative 004 Event Review records embedded in the case lifecycle for review, recovery, and defensibility.
- Likely primary key: `event_review_id`.
- Relationship to `customer_id` and `case_id`: Belongs to one `customer_id` and one `case_id`; may reference diagnostic, case plan, receipt, or verification records when relevant.
- First-class columns: event review identifier, customer identifier, case identifier, review status, review type, weakest dimension, result, created timestamp, updated timestamp.
- JSONB: Reviewed event input, external pressure detail, boundary signals, evidence state, schema snapshot, receipt readiness impact, verification relevance, and structured review payload.
- Should not store: Raw append-only event log stream, payment authority, receipt authority, or verification authority.
- Authority type: Core authority.

### 5.6 case_events

- Purpose: Core case-scoped event history and eventHistory authority used to reconstruct meaningful lifecycle transitions.
- Likely primary key: `case_event_id`.
- Relationship to `customer_id` and `case_id`: Usually belongs to one `customer_id`; belongs to one `case_id` when the event is case-scoped.
- First-class columns: case event identifier, customer identifier, case identifier where applicable, event type, actor type, raw event input, event timestamp, source, metadata.
- JSONB: Raw event input, request context, structured metadata, non-sensitive before/after summary, and correlation details.
- Should not store: Full secrets, payment card data, private credentials, or replace the authority tables for cases, receipts, payments, or verifications.
- Authority type: Core authority.

### 5.7 receipts

- Purpose: Authoritative receipt records for customer-facing proof of paid or issued receipt state.
- Likely primary key: `receipt_id`.
- Relationship to `customer_id` and `case_id`: Belongs to one `customer_id`; may belong to one `case_id` when receipt issuance is case-scoped.
- First-class columns: receipt identifier, customer identifier, case identifier where applicable, payment identifier where applicable, receipt status, receipt number, issued timestamp, voided timestamp.
- JSONB: Receipt line details, rendered receipt snapshot metadata, non-authority processor references, and versioned receipt payload.
- Should not store: Raw payment card data, unrelated verification results, full audit trail, or mutable case plan state.
- Authority type: Core authority.

### 5.8 verifications

- Purpose: Authoritative verification request, review, and decision records.
- Likely primary key: `verification_id`.
- Relationship to `customer_id` and `case_id`: Belongs to one `customer_id`; usually belongs to one `case_id` when verification is case-scoped.
- First-class columns: verification identifier, customer identifier, case identifier, verification status, verification type, decision, requested timestamp, completed timestamp.
- JSONB: Verification evidence summary, review notes, structured decision rationale, referenced document metadata, and versioned verification payload.
- Should not store: Payment authority, receipt authority, full customer profile, or unbounded raw files.
- Authority type: Core authority.

### 5.9 payments

- Purpose: Authoritative Nimclea payment state and processor reference mapping.
- Likely primary key: `payment_id`.
- Relationship to `customer_id` and `case_id`: Belongs to one `customer_id`; may belong to one `case_id` when the payment is case-scoped.
- First-class columns: payment identifier, customer identifier, case identifier where applicable, processor, processor payment reference, amount, currency, payment status, created timestamp, settled timestamp.
- JSONB: Processor metadata, webhook payload summary, reconciliation metadata, and non-sensitive payment context.
- Should not store: Raw card numbers, card security codes, private processor secrets, full receipt body, or verification decision authority.
- Authority type: Core authority.

### 5.10 trial_lifecycle

- Purpose: Authoritative trial registration, start, day count, limits, and lifecycle state.
- Likely primary key: `trial_id`.
- Relationship to `customer_id` and `case_id`: Belongs to one `customer_id`; may reference the first or current trial case through `case_id` when applicable.
- First-class columns: trial identifier, customer identifier, case identifier where applicable, trial status, started timestamp, expires timestamp, ended timestamp, cases created count, current trial day.
- JSONB: Trial source metadata, eligibility notes, transition context, and non-authority display metadata.
- Should not store: Full case records, diagnostic answers, payment authority, receipt authority, or verification decision payloads.
- Authority type: Core authority.

### 5.11 audit_trail

- Purpose: Append-only audit record of authority changes and administrative/system actions.
- Likely primary key: `audit_id`.
- Relationship to `customer_id` and `case_id`: May reference `customer_id` and `case_id` when the audited action is customer-scoped or case-scoped.
- First-class columns: audit identifier, customer identifier where applicable, case identifier where applicable, actor type, actor identifier, action, target table, target identifier, timestamp.
- JSONB: Structured before/after summary, request context, reason codes, and review metadata.
- Should not store: Raw secrets, full private documents, raw payment card data, or replace event review authority.
- Authority type: Audit/supporting data.

### 5.12 hash_ledger

- Purpose: Integrity support ledger for hashes of important records, artifacts, or snapshots.
- Likely primary key: `hash_ledger_id`.
- Relationship to `customer_id` and `case_id`: May reference `customer_id` and `case_id` when the hashed item is customer-scoped or case-scoped.
- First-class columns: hash ledger identifier, customer identifier where applicable, case identifier where applicable, target table, target identifier, hash algorithm, hash value, created timestamp.
- JSONB: Canonicalization metadata, source snapshot descriptor, chain metadata if later required, and verification context.
- Should not store: The full source record as a substitute for the authority table, secrets, raw payment card data, or private files.
- Authority type: Audit/supporting data.

## 6. Relationship Map

- `customers` is the root ownership table for customer-scoped authority.
- `cases` belongs to `customers` and acts as the primary lifecycle shell for case-scoped work.
- `diagnostics`, `case_plans`, and `event_reviews` belong to both `customers` and `cases`.
- `case_events` records lifecycle and system events and should reference `customers` and `cases` when applicable.
- `receipts`, `verifications`, and `payments` belong to `customers` and may belong to `cases` when the record is case-scoped.
- `trial_lifecycle` belongs to `customers` and may reference a case when trial state is tied to case creation or case plan completion.
- `audit_trail` and `hash_ledger` support integrity, review, and traceability across the authority tables.

## 7. JSONB vs First-Class Column Principle

First-class columns should be used for identifiers, foreign keys, statuses, timestamps, version fields, ownership boundaries, lifecycle states, processor references, amounts, and fields needed for filtering, joining, policy enforcement, or reporting.

JSONB should be used for structured payloads that are versioned, nested, variable by product version, or not needed as primary query and policy fields. JSONB is appropriate for diagnostic answers, event review payloads, case plan configuration, receipt line snapshots, verification evidence summaries, webhook summaries, audit summaries, and hash canonicalization metadata.

JSONB should not become an escape hatch for authority boundaries. If a field controls ownership, lifecycle state, payment state, verification result, receipt status, access control, or release-critical reporting, it should be promoted to a first-class column.

## 8. Supabase Security / RLS Principle

For every future public schema table, the implementation order must be:

1. Create table.
2. Explicit GRANT per role.
3. Enable row level security.
4. Create policy.

Security principles:

- Do not give anon broad access to core Nimclea data.
- Core read/write should prefer authenticated user context or backend `service_role`.
- Public/anon access should be avoided unless explicitly justified.
- Policies should enforce customer ownership, case ownership, and role-specific access instead of relying on frontend behavior.
- `service_role` use should remain backend-controlled and should not be exposed to the browser.
- Audit/supporting tables should be append-oriented where possible and should avoid broad client-side mutation.

## 9. Cutover Phases

1. Schema approval phase: Review and accept the clean authority schema plan without changing runtime behavior.
2. SQL design phase: Draft table, grant, RLS, and policy SQL from the accepted plan.
3. Isolated database creation phase: Create clean Supabase tables without connecting production endpoints.
4. Write-shadow or fixture phase: Validate schema with controlled fixtures or explicit test writes only.
5. Backend adapter phase: Add backend-controlled read/write paths behind explicit gates.
6. Verification phase: Run contract checks, release gates, and targeted authority checks.
7. Controlled cutover phase: Move production authority to Supabase only after acceptance criteria are met.
8. Post-cutover protection phase: Keep release guards and audit checks active to prevent fallback to old mixed authority.

## 10. Explicit Non-Goals

- Do not create database tables from this document.
- Do not write SQL in this document.
- Do not modify backend endpoints.
- Do not change frontend behavior.
- Do not migrate old Render JSON data by default.
- Do not mix old JSON authority with the future clean Supabase authority.
- Do not grant broad anon access to core Nimclea data.
- Do not define payment processor secret handling in client-accessible tables.
- Do not make case events, audit trail, or hash ledger replace the core authority tables.

## 11. Acceptance Criteria

- The plan identifies all required schema areas: customers, cases, diagnostics, case_plans, event_reviews, case_events, receipts, verifications, payments, trial_lifecycle, audit_trail, and hash_ledger.
- Each schema area defines purpose, likely primary key, relationship to `customer_id` and `case_id`, JSONB versus first-class column guidance, exclusions, and authority type.
- The accepted clean database principles are preserved.
- The Supabase implementation order is explicit: create table, explicit GRANT per role, enable row level security, create policy.
- Security guidance avoids broad anon access to core Nimclea data.
- The document remains planning-only and does not authorize code, SQL, endpoint, frontend, database, or cutover changes.

## 12. Next Recommended Implementation Step After This Document

Create a separate SQL design document that translates this accepted schema plan into table definitions, explicit role grants, RLS enablement, and policies. That document should still be reviewed before any Supabase table is created or any production behavior is connected to the clean authority database.
