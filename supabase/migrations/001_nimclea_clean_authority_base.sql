-- Nimclea clean authority base v0.1.
-- Smoke-test foundation only. Policies are intentionally broad and must be narrowed
-- after auth/user_id binding is finalized.

create extension if not exists pgcrypto;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table public.customers from public;
grant select, insert, update on table public.customers to authenticated;

alter table public.customers enable row level security;

create policy customers_authenticated_smoke_select
on public.customers
for select
to authenticated
using (true);

create policy customers_authenticated_smoke_insert
on public.customers
for insert
to authenticated
with check (true);

create policy customers_authenticated_smoke_update
on public.customers
for update
to authenticated
using (true)
with check (true);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  case_title text,
  status text not null default 'draft',
  source text not null default 'supabase_clean_authority',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table public.cases from public;
grant select, insert, update on table public.cases to authenticated;

alter table public.cases enable row level security;

create policy cases_authenticated_smoke_select
on public.cases
for select
to authenticated
using (true);

create policy cases_authenticated_smoke_insert
on public.cases
for insert
to authenticated
with check (true);

create policy cases_authenticated_smoke_update
on public.cases
for update
to authenticated
using (true)
with check (true);

create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

revoke all on table public.case_events from public;
grant select, insert, update on table public.case_events to authenticated;

alter table public.case_events enable row level security;

create policy case_events_authenticated_smoke_select
on public.case_events
for select
to authenticated
using (true);

create policy case_events_authenticated_smoke_insert
on public.case_events
for insert
to authenticated
with check (true);

create policy case_events_authenticated_smoke_update
on public.case_events
for update
to authenticated
using (true)
with check (true);

create table public.receipt_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  receipt_status text not null default 'not_ready',
  receipt_payload jsonb not null default '{}'::jsonb,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table public.receipt_records from public;
grant select, insert, update on table public.receipt_records to authenticated;

alter table public.receipt_records enable row level security;

create policy receipt_records_authenticated_smoke_select
on public.receipt_records
for select
to authenticated
using (true);

create policy receipt_records_authenticated_smoke_insert
on public.receipt_records
for insert
to authenticated
with check (true);

create policy receipt_records_authenticated_smoke_update
on public.receipt_records
for update
to authenticated
using (true)
with check (true);

create table public.trial_lifecycle (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  trial_status text not null default 'not_started',
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table public.trial_lifecycle from public;
grant select, insert, update on table public.trial_lifecycle to authenticated;

alter table public.trial_lifecycle enable row level security;

create policy trial_lifecycle_authenticated_smoke_select
on public.trial_lifecycle
for select
to authenticated
using (true);

create policy trial_lifecycle_authenticated_smoke_insert
on public.trial_lifecycle
for insert
to authenticated
with check (true);

create policy trial_lifecycle_authenticated_smoke_update
on public.trial_lifecycle
for update
to authenticated
using (true)
with check (true);
