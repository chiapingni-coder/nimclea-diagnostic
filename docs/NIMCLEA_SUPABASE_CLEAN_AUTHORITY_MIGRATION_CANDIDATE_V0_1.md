# Nimclea Supabase Clean Authority Migration Candidate v0.1

## Purpose

Draft a reviewable Supabase clean authority migration candidate for Nimclea.

This document is not executed SQL and is not a live migration.

## Authority Basis

This candidate is based on the following accepted decision records:

- `docs/NIMCLEA_SUPABASE_IDENTITY_MAPPING_DECISION_V0_1.md`
- `docs/NIMCLEA_SUPABASE_BACKEND_ONLY_WRITE_BOUNDARY_DECISION_V0_1.md`

## 1. Proposed Core Authority Tables

Proposed core authority tables for the clean schema:

- `customers`
- `cases`
- `case_events`
- `receipt_records`
- `trial_lifecycle`

These tables represent the initial clean authority surface for Nimclea.

## 2. Proposed Identity Mapping Fields

Proposed identity mapping fields and relationships:

- `customer_id` as the canonical backend identity key
- `email` as the human-readable contact identifier
- `userId` as the existing application-facing user identifier
- `caseId` as the stable case identifier
- `caseRecord` as the persisted case object carrying transitional and derived identity context

Identity mapping must be resolved by the backend before clean authority writes are treated as canonical.

## 3. Proposed Case Record Fields

Proposed clean `cases` authority fields:

- `id`
- `case_id`
- `user_email`
- `customer_id`
- `case_title`
- `status`
- `stage`
- `diagnostic_payload`
- `result_payload`
- `case_metadata`
- `authority_source`
- `created_at`
- `updated_at`

These fields support case ownership, state, and clean authority tracking.

## 4. Proposed Event / `case_events` Authority Fields

Proposed clean `case_events` authority fields:

- `id`
- `case_id`
- `event_type`
- `event_source`
- `event_payload`
- `event_review`
- `authority_source`
- `created_at`

`case_events` is the core case-scoped event history authority table.

## 5. Proposed Receipt / Payment / Verification Authority Fields

Proposed clean authority fields for receipt, payment, and verification state:

### `receipt_records`

- `id`
- `case_id`
- `receipt_id`
- `receipt_status`
- `payment_status`
- `receipt_payload`
- `readiness_payload`
- `payment_payload`
- `export_payload`
- `authority_source`
- `issued_at`
- `created_at`
- `updated_at`

### `payments`

- backend-owned payment identifier
- processor reference
- payment status
- amount and currency
- backend-controlled metadata

### `verifications`

- backend-owned verification identifier
- verification status
- verification decision
- backend-controlled metadata

Receipt, payment, and verification writes are assumed to be backend-owned and not frontend direct writes.

## 6. Explicit Backend-Only Write Assumptions

The following are backend-only write assumptions for this candidate:

- frontend must not write directly to Supabase for core authority tables
- backend must resolve identity before writing
- `service_role` must remain backend-only
- clean authority writes must be validated by backend service logic
- frontend may request writes, but only the backend should persist them

## 7. Supabase 2026 Public Schema Rule

This candidate follows the 2026 public schema rule:

1. create table
2. explicit GRANT per role
3. enable row level security
4. create policy

This order should be used for each public schema authority table.

## 8. Draft SQL Section, Not Executed

```sql
-- NOT EXECUTED
-- Draft only: review candidate for isolated rehearsal.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on table public.customers to service_role;
alter table public.customers enable row level security;
create policy customers_service_role_only
on public.customers
for all
to service_role
using (true)
with check (true);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  case_id text not null unique,
  user_email text,
  customer_id uuid,
  case_title text,
  status text not null default 'draft',
  stage text,
  diagnostic_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  case_metadata jsonb not null default '{}'::jsonb,
  authority_source text not null default 'supabase_clean_authority',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on table public.cases to service_role;
alter table public.cases enable row level security;
create policy cases_service_role_only
on public.cases
for all
to service_role
using (true)
with check (true);

create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  event_type text not null,
  event_source text not null default 'supabase_clean_authority',
  event_payload jsonb not null default '{}'::jsonb,
  event_review jsonb not null default '{}'::jsonb,
  authority_source text not null default 'supabase_clean_authority',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on table public.case_events to service_role;
alter table public.case_events enable row level security;
create policy case_events_service_role_only
on public.case_events
for all
to service_role
using (true)
with check (true);

create table public.receipt_records (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  receipt_id text not null unique,
  receipt_status text not null default 'not_ready',
  payment_status text not null default 'pending',
  receipt_payload jsonb not null default '{}'::jsonb,
  readiness_payload jsonb not null default '{}'::jsonb,
  payment_payload jsonb not null default '{}'::jsonb,
  export_payload jsonb not null default '{}'::jsonb,
  authority_source text not null default 'supabase_clean_authority',
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on table public.receipt_records to service_role;
alter table public.receipt_records enable row level security;
create policy receipt_records_service_role_only
on public.receipt_records
for all
to service_role
using (true)
with check (true);
```

## 9. Risks and Open Questions

- identity mapping could still diverge between email, userId, and backend customer identity
- frontend route flows may still expect legacy identifiers during transition
- receipt, payment, and verification ownership boundaries may need stricter backend service contracts
- `case_events` and `receipt_records` may need future normalization after isolated rehearsal
- service-role-only policies may need adjustment once read-side access rules are finalized

## 10. Stop Line

Do not run this migration until isolated rehearsal is prepared and accepted.
