# v0.9-5F DEPLOYED RUNTIME SUPABASE ENV PARITY EFFECTIVE ACCESS BLOCKER CLASSIFICATION RECORD

## Record ID

NIMCLEA_V0_9_5F_DEPLOYED_RUNTIME_SUPABASE_ENV_PARITY_EFFECTIVE_ACCESS_BLOCKER_CLASSIFICATION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record classifies the remaining deployed runtime Supabase env parity / effective access blocker after v0.9-5E.

v0.9-5E confirmed that the intended Supabase authority target is healthy and that fixture records exist.

However, the deployed protected authority probe still reported contradictory read-path evidence.

This record does not select or apply a fix. It classifies the blocker and defines the next smallest verification step.

## Scope

Area:

- v0.9 runtime authority observability
- deployed runtime Supabase env parity
- deployed effective Supabase access
- service role key / project / runtime alignment classification

Runtime behavior changed by this record:

- None.
- This is blocker classification only.
- No backend code is changed.
- No frontend code is changed.
- No Supabase schema, RLS, grants, storage, payment, receipt, or verification behavior is changed.
- No fixture data is inserted or modified.
- No secrets are exposed.

## Prior Evidence From v0.9-5E

v0.9-5E confirmed the intended local backend.env Supabase authority target:

- supabaseUrlHost: rlbquzefqfnvpgyjaags.supabase.co
- projectRef: rlbquzefqfnvpgyjaags

Render SUPABASE_URL manual inspection:

- Render SUPABASE_URL = same project

Clean authority table visibility in the intended target:

- customers: ok true, count 1
- cases: ok true, count 2
- case_events: ok true, count 3
- receipts: ok true, count 2
- verifications: ok true, count 0
- payments: ok true, count 2
- trial_lifecycle: ok true, count 0
- audit_trail: ok true, count 0
- hash_ledger: ok true, count 0

Fixture customer evidence:

- fixture email: smoke+cases-existing-001@nimclea.test
- customer exists
- customer_id: 00000000-0000-4000-8000-000000000023

Fixture case evidence:

- allowlisted fixture case ID exists
- case_id: 00000000-0000-4000-8000-000000000024
- customer_id: 00000000-0000-4000-8000-000000000023

Cases by fixture customer:

- count 2
- case IDs:
  - 00000000-0000-4000-8000-000000000024
  - 00000000-0000-4000-8000-000000009401

## Contradictory Deployed Probe Evidence

v0.9-5B deployed protected authority probe returned:

- HTTP 200
- success true
- rehearsal true
- supabaseCoreAuthorityEnabled true

But read-path confidence failed:

- emailLookup.ok false
- emailLookup.error: Could not find the table 'public.customers' in the schema cache
- emailLookup.count 0
- emailLookup.caseIds empty
- caseLookup.ok true
- caseLookup.found false for allowlisted case ID 00000000-0000-4000-8000-000000000024

## Classification

Result:

- BLOCKER CLASSIFIED

Blocker name:

- deployed runtime Supabase env parity / effective access blocker

Blocker class:

- deployed runtime effective Supabase access mismatch

What is already proven:

- route/env availability is not the blocker
- protected deployed authority probe is reachable
- rehearsal env gate is active
- deployed probe execution reaches Supabase authority code path
- intended Supabase authority project contains clean authority tables
- intended Supabase authority project contains fixture customer
- intended Supabase authority project contains allowlisted fixture case
- Render SUPABASE_URL was manually confirmed as the same project

What remains unresolved:

- whether Render SUPABASE_SERVICE_ROLE_KEY belongs to the same Supabase project
- whether Render SUPABASE_SERVICE_ROLE_KEY is present on the correct nimclea-api service
- whether deployed runtime was redeployed after the latest Supabase env changes
- whether deployed runtime is using stale env
- whether deployed runtime is using a wrong or inactive key
- whether deployed runtime has a different effective Supabase access path despite the visible URL matching

## Current Leading Theory

The leading theory is no longer:

- missing public.customers table
- missing public.cases table
- missing fixture customer
- missing fixture case
- route not deployed
- rehearsal env disabled

The leading theory is:

- deployed runtime Supabase env parity / effective access is not aligned with the intended authority target.

This could mean:

1. SUPABASE_SERVICE_ROLE_KEY in Render belongs to a different Supabase project.

2. SUPABASE_SERVICE_ROLE_KEY in Render is missing, stale, malformed, revoked, or not active.

3. The correct key exists locally but not in the deployed nimclea-api service.

4. The correct key was added but the service was not redeployed / restarted.

5. Another deployed runtime env path is overriding the expected Supabase configuration.

## Decision / Change Summary

Do not patch backend helper logic in this record.

Do not apply Supabase migrations in this record.

Do not insert fixture records in this record.

Do not change frontend, payment, receipt, verification, or storage behavior in this record.

The next step should verify deployed runtime Supabase env parity without exposing secrets.

## Acceptance Criteria

This blocker classification is complete when:

- v0.9-5E intended target evidence is recorded.
- v0.9-5B deployed probe contradiction is recorded.
- The blocker is classified as deployed runtime Supabase env parity / effective access mismatch.
- Missing tables and missing fixture data are not treated as the leading theory.
- Secret exposure is explicitly forbidden.
- The next step is narrowed to env parity verification and protected probe re-smoke.

## Validation

This record adds no new runtime validation.

Prior validation used as evidence:

- v0.9-5B protected deployed authority probe full JSON
- v0.9-5E local backend.env Supabase table visibility inspection
- v0.9-5E Render SUPABASE_URL same-project manual confirmation
- v0.9-5E fixture customer read-only lookup
- v0.9-5E fixture case read-only lookup

## Risk / Stop Line

Stop line:

- Do not expose SUPABASE_SERVICE_ROLE_KEY.
- Do not paste service role key into chat or docs.
- Do not log secret values.
- Do not patch helpers before env parity is verified.
- Do not apply schema migrations because clean authority tables already exist in the intended target.
- Do not insert fixture records because fixture records already exist in the intended target.
- Do not broaden probe access beyond fixture-only / allowlisted-case-only.
- Do not change frontend, payment, receipt, verification, or storage behavior.

Allowed next step:

- v0.9-5G deployed Supabase env parity verification candidate or inspection.

## Next Action

Next suitable work item:

- v0.9-5G deployed Supabase env parity verification candidate.

Suggested focus:

- Confirm Render SUPABASE_SERVICE_ROLE_KEY exists on the correct nimclea-api service without exposing the key.
- Confirm the key belongs to project rlbquzefqfnvpgyjaags without pasting the key.
- Confirm the service was redeployed / restarted after env parity verification.
- Re-run the protected fixture authority probe.
- If mismatch remains, classify stale runtime env, wrong key, or different effective access path.