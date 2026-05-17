-- Nimclea clean authority tables migration draft.
-- Draft only: do not execute until identity mapping, write boundaries, and rollback
-- procedures are reviewed and approved for an isolated Supabase environment.
--
-- Authority boundaries:
-- - No old Render JSON migration logic is included.
-- - Payment state records processor/payment authority only.
-- - Payment state does not overwrite receipt eligibility.
-- - Payment state does not create verification eligibility.
-- - Trial lifecycle remains separate from receipt, verification, and payment authority.

create extension if not exists pgcrypto;

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

revoke all on table public.customers from anon;
revoke all on table public.customers from public;

grant select on table public.customers to authenticated;
grant select, insert, update, delete on table public.customers to service_role;

alter table public.customers enable row level security;

create policy customers_authenticated_own_record_select
on public.customers
for select
to authenticated
using (
  auth_user_id = auth.uid()
);

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

revoke all on table public.cases from anon;
revoke all on table public.cases from public;

grant select on table public.cases to authenticated;
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

revoke all on table public.diagnostics from anon;
revoke all on table public.diagnostics from public;

grant select on table public.diagnostics to authenticated;
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

revoke all on table public.case_plans from anon;
revoke all on table public.case_plans from public;

grant select on table public.case_plans to authenticated;
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

create table public.event_reviews (
  event_review_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(customer_id),
  case_id uuid not null references public.cases(case_id),
  diagnostic_id uuid references public.diagnostics(diagnostic_id),
  case_plan_id uuid references public.case_plans(case_plan_id),
  case_event_id uuid,
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

revoke all on table public.event_reviews from anon;
revoke all on table public.event_reviews from public;

grant select on table public.event_reviews to authenticated;
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

create table public.case_events (
  case_event_id uuid primary key default gen_random_uuid(),
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

revoke all on table public.case_events from anon;
revoke all on table public.case_events from public;

grant select on table public.case_events to authenticated;
grant select, insert, update, delete on table public.case_events to service_role;

alter table public.case_events enable row level security;

create policy case_events_authenticated_customer_select
on public.case_events
for select
to authenticated
using (
  customer_id is not null
  and exists (
    select 1
    from public.customers c
    where c.customer_id = case_events.customer_id
      and c.auth_user_id = auth.uid()
  )
);

alter table public.event_reviews
add constraint event_reviews_case_event_id_fkey
foreign key (case_event_id) references public.case_events(case_event_id);

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

revoke all on table public.receipts from anon;
revoke all on table public.receipts from public;

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

revoke all on table public.verifications from anon;
revoke all on table public.verifications from public;

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

revoke all on table public.payments from anon;
revoke all on table public.payments from public;

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

revoke all on table public.trial_lifecycle from anon;
revoke all on table public.trial_lifecycle from public;

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

revoke all on table public.audit_trail from anon;
revoke all on table public.audit_trail from public;

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

revoke all on table public.hash_ledger from anon;
revoke all on table public.hash_ledger from public;

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
