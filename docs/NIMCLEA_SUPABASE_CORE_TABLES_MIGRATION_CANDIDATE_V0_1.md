# Nimclea Supabase Core Tables Migration Candidate v0.1

## 1. Scope

This is a candidate only.

It is not executed.

It is not applied to Supabase.

It is for isolated rehearsal review only.

The current backend core authority adapter still uses `cases` as its implementation table name. This candidate keeps the schema proposal separate from implementation wiring.

## 2. Core Tables Covered

- `case_records`
- `case_events`
- `receipt_records`

## 3. Authority Boundary

Backend `service_role` is the write authority.

Frontend and `anon` must not directly write core tables.

Authenticated access should be explicit and limited.

No broad `anon` write grants are allowed.

## 4. Identity Mapping Assumptions

This candidate uses the identity mapping decision document as the source of truth.

It preserves email and `caseId` continuity across the transition.

It does not invent a new identity model.

The backend remains responsible for resolving canonical customer identity before any clean authority write.

## 5. Candidate SQL Draft

This section is a review draft only and is not executed.

It follows the public schema rule:

1. create table
2. explicit GRANT
3. enable row level security
4. create policy

### 5.1 `case_records`

```sql
create table if not exists public.case_records (
  id uuid primary key default gen_random_uuid(),
  case_id text not null unique,
  email text not null,
  user_id text,
  customer_id uuid,
  case_title text,
  status text not null default 'draft',
  stage text,
  diagnostic_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  case_metadata jsonb not null default '{}'::jsonb,
  authority_source text not null default 'supabase_core_authority',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant usage on schema public to authenticated, service_role;
grant select on table public.case_records to authenticated;
grant select, insert, update, delete on table public.case_records to service_role;

alter table public.case_records enable row level security;

create policy case_records_authenticated_select
on public.case_records
for select
to authenticated
using (true);
```

### 5.2 `case_events`

```sql
create table if not exists public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.case_records(case_id) on delete cascade,
  event_type text not null,
  event_source text not null default 'supabase_core_authority',
  event_payload jsonb not null default '{}'::jsonb,
  event_review jsonb not null default '{}'::jsonb,
  authority_source text not null default 'supabase_core_authority',
  created_at timestamptz not null default now()
);

grant usage on schema public to authenticated, service_role;
grant select on table public.case_events to authenticated;
grant select, insert, update, delete on table public.case_events to service_role;

alter table public.case_events enable row level security;

create policy case_events_authenticated_select
on public.case_events
for select
to authenticated
using (true);
```

### 5.3 `receipt_records`

```sql
create table if not exists public.receipt_records (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.case_records(case_id) on delete cascade,
  receipt_id text not null unique,
  receipt_status text not null default 'not_ready',
  payment_status text not null default 'pending',
  receipt_payload jsonb not null default '{}'::jsonb,
  readiness_payload jsonb not null default '{}'::jsonb,
  payment_payload jsonb not null default '{}'::jsonb,
  export_payload jsonb not null default '{}'::jsonb,
  authority_source text not null default 'supabase_core_authority',
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant usage on schema public to authenticated, service_role;
grant select on table public.receipt_records to authenticated;
grant select, insert, update, delete on table public.receipt_records to service_role;

alter table public.receipt_records enable row level security;

create policy receipt_records_authenticated_select
on public.receipt_records
for select
to authenticated
using (true);
```

## 6. Rehearsal Plan

Run the candidate only in an isolated Supabase project or isolated schema first.

Use synthetic rows only.

Smoke checks before any real migration:

- create table succeeds in the isolated target
- explicit GRANTs exist for authenticated and service_role
- RLS is enabled on all three tables
- select policy exists on each table
- service_role can write through the backend adapter path
- authenticated can read where intended
- no `anon` write path exists
- candidate reads and writes do not require Render or JSON migration

Rollback or stop line:

stop immediately if any existing live table collision appears, if identity mapping is ambiguous, or if backend-only write boundaries are not already accepted for the target environment.

## 7. Non-Goals

- Do not modify backend routes.
- Do not modify frontend.
- Do not change production Supabase.
- Do not migrate Render or JSON data yet.
- Do not remove JSON fallback.

## 8. Decision Boundary

This document is a reviewable migration candidate only.

Do not run this migration until isolated rehearsal is prepared and accepted.
