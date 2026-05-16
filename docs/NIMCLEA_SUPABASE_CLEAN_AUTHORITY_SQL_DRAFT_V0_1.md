# Nimclea Supabase Clean Authority SQL Draft v0.1

## 1. Title and Version

Document: Nimclea Supabase Clean Authority SQL Draft

Version: v0.1

Source plan: `docs/NIMCLEA_SUPABASE_CLEAN_AUTHORITY_SCHEMA_PLAN_V0_1.md`

## 2. Important Warning: Draft Only, Not Executed

This document is a documentation-only SQL draft. It must not be treated as an executed migration, approved production schema, or cutover authorization.

Do not execute this SQL yet. Do not create database tables from this document yet. Do not change backend endpoints, frontend behavior, production authority, or release gates from this document alone.

## 3. Assumptions

- Old Render JSON data remains test/dev data and is not migrated by default.
- Supabase clean database is the future source of truth after controlled cutover.
- Backend `service_role` may perform controlled authority writes.
- Authenticated user access should remain restrictive until final customer identity mapping is approved.
- Broad `anon` access is not granted to core Nimclea data.
- UUID primary keys use `gen_random_uuid()`, assuming `pgcrypto` or equivalent Supabase support is available.
- RLS policies below are intentionally restrictive placeholders where exact ownership mapping is not final.
- Policy expressions that use `auth.uid()` require later adjustment once `customer_id` to Supabase auth user mapping is finalized.

## 4. SQL Draft

### 4.1 customers

```sql
create table public.customers (
  customer_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  display_name text,
  organization_name text,
  customer_status text not null default 'active',
  source text not null default 'supabase_clean_authority',
  is_authority_record boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on table public.customers to authenticated;
grant select, insert, update, delete on table public.customers to service_role;

alter table public.customers enable row level security;

create policy customers_authenticated_own_record_select
on public.customers
for select
to authenticated
using (
  auth_user_id = auth.uid()
);

create policy customers_authenticated_own_record_insert
on public.customers
for insert
to authenticated
with check (
  auth_user_id = auth.uid()
);

create policy customers_authenticated_own_record_update
on public.customers
for update
to authenticated
using (
  auth_user_id = auth.uid()
)
with check (
  auth_user_id = auth.uid()
);
```

Policy adjustment needed later: confirm whether every customer maps directly to one Supabase `auth.users.id`, or whether backend-only ownership rules should replace authenticated self-service inserts.

### 4.2 cases

```sql
create table public.cases (
  case_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id),
  case_status text not null default 'draft',
  case_type text,
  lifecycle_stage text,
  source text not null default 'supabase_clean_authority',
  is_authority_record boolean not null default true,
  case_schema jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on table public.cases to authenticated;
grant select, insert, update, delete on table public.cases to service_role;

alter table public.cases enable row level security;

create policy cases_authenticated_customer_select
on public.cases
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = cases.customer_id
      and c.auth_user_id = auth.uid()
  )
);

create policy cases_authenticated_customer_insert
on public.cases
for insert
to authenticated
with check (
  exists (
    select 1
    from public.customers c
    where c.customer_id = cases.customer_id
      and c.auth_user_id = auth.uid()
  )
);

create policy cases_authenticated_customer_update
on public.cases
for update
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = cases.customer_id
      and c.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.customers c
    where c.customer_id = cases.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: decide whether case creation is authenticated-client allowed or backend-only through `service_role`.

### 4.3 diagnostics

```sql
create table public.diagnostics (
  diagnostic_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id),
  case_id uuid not null references public.cases(case_id),
  diagnostic_status text not null default 'draft',
  result_status text,
  diagnostic_version text,
  source text not null default 'supabase_clean_authority',
  is_authority_record boolean not null default true,
  diagnostic_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on table public.diagnostics to authenticated;
grant select, insert, update, delete on table public.diagnostics to service_role;

alter table public.diagnostics enable row level security;

create policy diagnostics_authenticated_customer_select
on public.diagnostics
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = diagnostics.customer_id
      and c.auth_user_id = auth.uid()
  )
);

create policy diagnostics_authenticated_customer_insert
on public.diagnostics
for insert
to authenticated
with check (
  exists (
    select 1
    from public.customers c
    where c.customer_id = diagnostics.customer_id
      and c.auth_user_id = auth.uid()
  )
);

create policy diagnostics_authenticated_customer_update
on public.diagnostics
for update
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = diagnostics.customer_id
      and c.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.customers c
    where c.customer_id = diagnostics.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: confirm whether diagnostic write access is direct authenticated access or backend-mediated only.

### 4.4 case_plans

```sql
create table public.case_plans (
  case_plan_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id),
  case_id uuid not null references public.cases(case_id),
  plan_status text not null default 'draft',
  plan_version text,
  source text not null default 'supabase_clean_authority',
  is_authority_record boolean not null default true,
  plan_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on table public.case_plans to authenticated;
grant select, insert, update, delete on table public.case_plans to service_role;

alter table public.case_plans enable row level security;

create policy case_plans_authenticated_customer_select
on public.case_plans
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = case_plans.customer_id
      and c.auth_user_id = auth.uid()
  )
);

create policy case_plans_authenticated_customer_insert
on public.case_plans
for insert
to authenticated
with check (
  exists (
    select 1
    from public.customers c
    where c.customer_id = case_plans.customer_id
      and c.auth_user_id = auth.uid()
  )
);

create policy case_plans_authenticated_customer_update
on public.case_plans
for update
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = case_plans.customer_id
      and c.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.customers c
    where c.customer_id = case_plans.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: confirm which plan states are user-editable and which must be backend-controlled.

### 4.5 event_reviews

```sql
create table public.event_reviews (
  event_review_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id),
  case_id uuid not null references public.cases(case_id),
  event_log_id uuid,
  diagnostic_id uuid references public.diagnostics(diagnostic_id),
  case_plan_id uuid references public.case_plans(case_plan_id),
  review_status text not null default 'draft',
  review_type text,
  weakest_dimension text,
  review_result text,
  source text not null default 'supabase_clean_authority',
  is_authority_record boolean not null default true,
  case_schema jsonb not null default '{}'::jsonb,
  review_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on table public.event_reviews to authenticated;
grant select, insert, update, delete on table public.event_reviews to service_role;

alter table public.event_reviews enable row level security;

create policy event_reviews_authenticated_customer_select
on public.event_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = event_reviews.customer_id
      and c.auth_user_id = auth.uid()
  )
);

create policy event_reviews_authenticated_customer_insert
on public.event_reviews
for insert
to authenticated
with check (
  exists (
    select 1
    from public.customers c
    where c.customer_id = event_reviews.customer_id
      and c.auth_user_id = auth.uid()
  )
);

create policy event_reviews_authenticated_customer_update
on public.event_reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = event_reviews.customer_id
      and c.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.customers c
    where c.customer_id = event_reviews.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: decide whether event review writes are customer-visible but backend-authored only.

Documentation note: `event_logs` is the current SQL-draft name for case-scoped event history / case_events. It stores raw event input and `event_type`. `event_reviews` must bind to a specific `event_log_id` before this SQL can be executed. `event_logs` must not be treated as only generic analytics/audit logs when used for case trust foundation.

### 4.6 event_logs

```sql
create table public.event_logs (
  event_log_id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(customer_id),
  case_id uuid references public.cases(case_id),
  event_type text not null,
  actor_type text not null,
  actor_id text,
  source text not null default 'supabase_clean_authority',
  raw_event jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

grant select on table public.event_logs to authenticated;
grant select, insert, update, delete on table public.event_logs to service_role;

alter table public.event_logs enable row level security;

create policy event_logs_authenticated_customer_select
on public.event_logs
for select
to authenticated
using (
  customer_id is not null
  and exists (
    select 1
    from public.customers c
    where c.customer_id = event_logs.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: event logs should likely be backend-append-only. Authenticated insert/update is intentionally not granted in this draft.

Documentation-only follow-up draft:

```sql
alter table public.event_reviews
add constraint event_reviews_event_log_id_fkey
foreign key (event_log_id) references public.event_logs(event_log_id);
```

### 4.7 receipts

```sql
create table public.receipts (
  receipt_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id),
  case_id uuid references public.cases(case_id),
  payment_id uuid,
  receipt_number text unique,
  receipt_status text not null default 'draft',
  source text not null default 'supabase_clean_authority',
  is_authority_record boolean not null default true,
  receipt_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  issued_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on table public.receipts to authenticated;
grant select, insert, update, delete on table public.receipts to service_role;

alter table public.receipts enable row level security;

create policy receipts_authenticated_customer_select
on public.receipts
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = receipts.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: receipt creation and mutation should remain backend-controlled unless a specific authenticated workflow is approved.

### 4.8 verifications

```sql
create table public.verifications (
  verification_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id),
  case_id uuid references public.cases(case_id),
  verification_status text not null default 'requested',
  verification_type text,
  verification_decision text,
  source text not null default 'supabase_clean_authority',
  is_authority_record boolean not null default true,
  verification_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  requested_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on table public.verifications to authenticated;
grant select, insert, update, delete on table public.verifications to service_role;

alter table public.verifications enable row level security;

create policy verifications_authenticated_customer_select
on public.verifications
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = verifications.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: verification decisions should remain backend-controlled or admin-controlled, not broad client writes.

### 4.9 payments

```sql
create table public.payments (
  payment_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id),
  case_id uuid references public.cases(case_id),
  processor text not null,
  processor_payment_reference text,
  amount_cents integer not null,
  currency text not null default 'usd',
  payment_status text not null default 'pending',
  source text not null default 'supabase_clean_authority',
  is_authority_record boolean not null default true,
  processor_metadata jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on table public.payments to authenticated;
grant select, insert, update, delete on table public.payments to service_role;

alter table public.payments enable row level security;

create policy payments_authenticated_customer_select
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = payments.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: payment writes should remain backend-only and driven by trusted checkout or webhook flows.

### 4.10 trial_lifecycle

```sql
create table public.trial_lifecycle (
  trial_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id),
  case_id uuid references public.cases(case_id),
  trial_status text not null default 'not_started',
  current_trial_day integer,
  cases_created_count integer not null default 0,
  source text not null default 'supabase_clean_authority',
  is_authority_record boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  expires_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on table public.trial_lifecycle to authenticated;
grant select, insert, update, delete on table public.trial_lifecycle to service_role;

alter table public.trial_lifecycle enable row level security;

create policy trial_lifecycle_authenticated_customer_select
on public.trial_lifecycle
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.customer_id = trial_lifecycle.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: trial start, expiration, and case count mutation should remain backend-controlled.

### 4.11 audit_trail

```sql
create table public.audit_trail (
  audit_id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(customer_id),
  case_id uuid references public.cases(case_id),
  actor_type text not null,
  actor_id text,
  action text not null,
  target_table text not null,
  target_id text,
  source text not null default 'supabase_clean_authority',
  audit_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

grant select on table public.audit_trail to authenticated;
grant select, insert, update, delete on table public.audit_trail to service_role;

alter table public.audit_trail enable row level security;

create policy audit_trail_authenticated_customer_select
on public.audit_trail
for select
to authenticated
using (
  customer_id is not null
  and exists (
    select 1
    from public.customers c
    where c.customer_id = audit_trail.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: audit trail should likely be backend-append-only, with customer-visible subsets decided separately.

### 4.12 hash_ledger

```sql
create table public.hash_ledger (
  hash_ledger_id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(customer_id),
  case_id uuid references public.cases(case_id),
  target_table text not null,
  target_id text not null,
  hash_algorithm text not null,
  hash_value text not null,
  source text not null default 'supabase_clean_authority',
  ledger_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select on table public.hash_ledger to authenticated;
grant select, insert, update, delete on table public.hash_ledger to service_role;

alter table public.hash_ledger enable row level security;

create policy hash_ledger_authenticated_customer_select
on public.hash_ledger
for select
to authenticated
using (
  customer_id is not null
  and exists (
    select 1
    from public.customers c
    where c.customer_id = hash_ledger.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

Policy adjustment needed later: hash ledger writes should be backend-controlled, and customer-visible hash records should be intentionally scoped.

## 5. RLS / GRANT Notes

- No `anon` grants are included in this draft.
- Core tables prefer authenticated ownership reads and selected authenticated writes only where the later product flow may justify them.
- Payment, receipt, verification, trial lifecycle, event log, audit trail, and hash ledger mutations are drafted as `service_role` controlled.
- `service_role` bypass behavior must remain backend-only and must never be exposed to browser clients.
- Placeholder policies depend on `customers.auth_user_id = auth.uid()`. This mapping must be confirmed before execution.
- If backend-only writes are preferred for all authority tables, authenticated insert/update grants and policies should be removed before execution.
- Future SQL should consider indexes for `customer_id`, `case_id`, status columns, timestamps, and processor references after access patterns are finalized.

## 6. Open Questions Before Execution

- Should `customer_id` be the primary ownership boundary for all RLS policies, or should cases also enforce a separate participant model?
- Which tables should allow authenticated client inserts or updates, if any?
- Should receipts, verifications, payments, trial lifecycle, audit trail, and hash ledger be fully backend-only with no authenticated direct table access?
- Should payment references use a stricter unique constraint per processor?
- Should `event_logs` be renamed to `case_events` before execution, or kept as `event_logs` with explicit case-scoped `eventHistory` semantics?
- Should lifecycle status fields use enums, check constraints, or text with application-level validation?
- Should `updated_at` be maintained by database triggers or backend writes?
- Should audit and event log tables be made insert-only by role and protected from update/delete even for service workflows?
- Which records should be visible to customers versus staff/admin-only?

## 7. Acceptance Criteria

- The draft includes all required future tables: customers, cases, diagnostics, case_plans, event_reviews, event_logs, receipts, verifications, payments, trial_lifecycle, audit_trail, and hash_ledger.
- Every table follows the order: create table, explicit GRANT per role, enable row level security, create policy.
- No broad `anon` grants are included.
- First-class columns are used for IDs, statuses, timestamps, `customer_id`, `case_id`, email, source, authority flags, payment state, receipt state, and verification state.
- JSONB is used for flexible snapshots and payloads such as `case_schema`, `diagnostic_payload`, `plan_payload`, `review_payload`, `receipt_payload`, `verification_payload`, `raw_event`, and `metadata`.
- The draft includes no old Render JSON migration logic.
- The document remains documentation-only and does not authorize execution.

## 8. Next Step After Review

Review and revise this SQL draft for identity mapping, backend-only write boundaries, indexes, constraints, and status validation. After review, create a separate migration candidate file and run it only in an isolated Supabase environment before any production cutover is considered.
