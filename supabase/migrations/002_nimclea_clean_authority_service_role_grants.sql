-- Backend secret/service role requires explicit table privileges for clean authority smoke and future backend adapters.
-- No anon or delete privileges are granted.

grant usage on schema public to service_role;

grant select, insert, update on table public.customers to service_role;
grant select, insert, update on table public.cases to service_role;
grant select, insert, update on table public.case_events to service_role;
grant select, insert, update on table public.receipt_records to service_role;
grant select, insert, update on table public.trial_lifecycle to service_role;
