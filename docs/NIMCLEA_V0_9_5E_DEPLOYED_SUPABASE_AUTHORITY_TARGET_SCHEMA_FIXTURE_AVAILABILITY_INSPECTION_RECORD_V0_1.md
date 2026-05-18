# v0.9-5E DEPLOYED SUPABASE AUTHORITY TARGET SCHEMA FIXTURE AVAILABILITY INSPECTION RECORD

## Record ID

NIMCLEA_V0_9_5E_DEPLOYED_SUPABASE_AUTHORITY_TARGET_SCHEMA_FIXTURE_AVAILABILITY_INSPECTION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the read-only deployed Supabase authority target / schema / fixture availability inspection after v0.9-5D.

v0.9-5D selected a read-only inspection before any fix direction is selected.

This inspection checks:

- intended Supabase authority target
- clean authority table availability
- fixture customer availability
- fixture case availability
- mismatch between local intended authority evidence and deployed probe evidence

## Scope

Area:

- v0.9 runtime authority observability
- Supabase authority target inspection
- clean authority schema availability
- fixture data availability
- deployed read-path mismatch classification input

Runtime behavior changed by this record:

- None.
- This is inspection only.
- No backend code was changed.
- No frontend code was changed.
- No Supabase schema, RLS, grants, storage, payment, receipt, or verification behavior was changed.
- No fixture data was inserted or modified.

## Prior Evidence From v0.9-5B / 5C / 5D

v0.9-5B deployed protected authority probe showed:

- HTTP 200
- success true
- rehearsal true
- supabaseCoreAuthorityEnabled true
- emailLookup object present
- caseLookup object present

But read-path confidence failed:

- emailLookup.ok false
- emailLookup.error: Could not find the table 'public.customers' in the schema cache
- emailLookup.count 0
- emailLookup.caseIds empty
- caseLookup.ok true
- caseLookup.found false for allowlisted case ID 00000000-0000-4000-8000-000000000024

v0.9-5C classified this as deployed authority target / schema visibility / fixture availability unresolved.

v0.9-5D selected read-only target / schema / fixture availability inspection before any fix.

## Intended Supabase Target Inspection

Local backend env target:

- supabaseUrlHost: rlbquzefqfnvpgyjaags.supabase.co
- projectRef: rlbquzefqfnvpgyjaags

Render SUPABASE_URL manual inspection:

- Render SUPABASE_URL = same project

Secret handling:

- SUPABASE_SERVICE_ROLE_KEY was not exposed in this record.
- No secret values were copied into this document.

## Clean Authority Table Visibility Inspection

Read-only local Supabase client inspection against backend.env target showed:

- customers: ok true, count 1
- cases: ok true, count 2
- case_events: ok true, count 3
- receipts: ok true, count 2
- verifications: ok true, count 0
- payments: ok true, count 2
- trial_lifecycle: ok true, count 0
- audit_trail: ok true, count 0
- hash_ledger: ok true, count 0

Interpretation:

- The intended Supabase authority target contains the clean authority baseline tables.
- public.customers exists and is visible from the local backend env Supabase client.
- public.cases exists and is visible from the local backend env Supabase client.

## Fixture Customer Inspection

Fixture email:

- smoke+cases-existing-001@nimclea.test

Read-only result:

- customer ok true
- customer count 1
- customer_id: 00000000-0000-4000-8000-000000000023
- email: smoke+cases-existing-001@nimclea.test

Interpretation:

- The fixture customer exists in the intended authority target.

## Fixture Case Inspection

Allowlisted fixture case ID:

- 00000000-0000-4000-8000-000000000024

Read-only corrected query result:

- caseById ok true
- caseById count 1
- case_id: 00000000-0000-4000-8000-000000000024
- customer_id: 00000000-0000-4000-8000-000000000023

Cases by fixture customer:

- ok true
- count 2
- case IDs:
  - 00000000-0000-4000-8000-000000000024
  - 00000000-0000-4000-8000-000000009401

Interpretation:

- The allowlisted fixture case exists in the intended authority target.
- The fixture customer has two case records in the intended authority target.
- This confirms the intended fixture data is present.

## Corrected Query Note

An initial case fixture query attempted to select a non-canonical status column from cases.

Observed result:

- column cases.status does not exist

This was an inspection query issue, not a system fix.

The query was corrected to select canonical case_id and customer_id only.

Corrected result:

- caseById ok true
- casesByCustomer ok true

## Inspection Classification

Result:

- INSPECTION COMPLETE

What is now confirmed:

- intended local Supabase authority target is rlbquzefqfnvpgyjaags
- Render SUPABASE_URL was manually confirmed as the same project
- clean authority baseline tables exist in the intended target
- public.customers exists in the intended target
- public.cases exists in the intended target
- fixture customer exists
- allowlisted fixture case exists
- fixture customer has two case records

What remains unresolved:

- why deployed probe reports public.customers missing from schema cache
- why deployed probe caseLookup found false for an allowlisted case that exists in the intended target
- whether deployed runtime is using a stale env, wrong key, wrong runtime cache, wrong service env target, or a different effective Supabase access path despite the visible URL matching
- whether Render SUPABASE_SERVICE_ROLE_KEY belongs to the intended project and is active in the deployed runtime

## Current Leading Classification Input

The strongest inspection outcome is:

- intended Supabase authority target is healthy
- fixture records exist
- deployed probe evidence contradicts intended target evidence

Therefore, the next classification should focus on deployed runtime Supabase env parity / key alignment / effective runtime target, not table creation and not fixture insertion.

## Decision / Change Summary

Do not apply a Supabase migration from this record.

Do not insert fixture data from this record.

Do not patch backend helper logic from this record.

The next step should classify the remaining mismatch as a deployed runtime env parity / effective Supabase access blocker unless new evidence proves otherwise.

## Acceptance Criteria

This inspection record is complete when:

- intended Supabase project ref is documented without exposing secrets
- Render SUPABASE_URL same-project manual check is documented
- clean authority table visibility is documented
- fixture customer existence is documented
- fixture case existence is documented
- contradiction with deployed probe evidence is documented
- no fix is selected prematurely
- next action is narrowed to deployed runtime env parity / effective Supabase access classification

## Validation

Commands / checks run:

- Read-only local backend.env Supabase table visibility inspection.
- Manual Render SUPABASE_URL same-project confirmation.
- Read-only fixture customer lookup.
- Read-only corrected fixture case lookup.
- Read-only cases-by-customer lookup.

Observed result:

- clean authority tables visible in intended target
- fixture customer exists
- fixture case exists
- deployed probe contradiction remains unresolved

## Risk / Stop Line

Stop line:

- Do not expose Supabase service role keys or secrets.
- Do not insert fixture data because fixture data already exists in the intended target.
- Do not apply schema migrations because clean authority tables already exist in the intended target.
- Do not patch helpers before deployed runtime env parity / effective access is classified.
- Do not broaden probe access beyond fixture-only / allowlisted-case-only.
- Do not change frontend, payment, receipt, verification, or storage behavior.

Allowed next step:

- v0.9-5F deployed runtime Supabase env parity / effective access blocker classification or candidate.

## Next Action

Next suitable work item:

- v0.9-5F deployed runtime Supabase env parity effective access blocker classification.

Suggested focus:

- Confirm Render SUPABASE_SERVICE_ROLE_KEY belongs to the same Supabase project without exposing the key.
- Confirm the correct Render service has the key.
- Confirm the service was redeployed after env changes.
- Re-run protected probe after env parity verification.
- If mismatch remains, classify whether deployed runtime is using stale env, wrong key, or a different effective Supabase access path.