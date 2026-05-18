# v0.9-5C DEPLOYED AUTHORITY READ PATH CONFIDENCE BLOCKER CLASSIFICATION RECORD

## Record ID

NIMCLEA_V0_9_5C_DEPLOYED_AUTHORITY_READ_PATH_CONFIDENCE_BLOCKER_CLASSIFICATION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record classifies the deployed authority read-path confidence blocker found in v0.9-5B.

v0.9-5B proved that the protected deployed authority probe is reachable and can execute, but deployed read-path confidence is not established.

This record does not select or apply a fix. It only classifies the blocker and defines the next smallest inspection step.

## Scope

Area:

- v0.9 runtime authority observability
- deployed authority read-path confidence
- Supabase authority target / schema visibility / fixture data availability classification
- protected fixture-only / allowlisted-case-only probe evidence

Runtime behavior changed by this record:

- None.
- This is blocker classification only.
- No backend code is changed.
- No frontend code is changed.
- No Supabase schema, RLS, grants, storage, payment, receipt, or verification behavior is changed.

## Prior Evidence From v0.9-5B

Protected fixture authority probe target:

https://nimclea-api.onrender.com/internal/rehearsal/authority-probe?email=smoke%2Bcases-existing-001%40nimclea.test&caseId=00000000-0000-4000-8000-000000000024

Observed top-level result:

- HTTP status: 200
- success: true
- probe: deployed_authority_availability
- rehearsal: true
- supabaseCoreAuthorityEnabled: true
- emailLookup object present
- caseLookup object present

Email lookup result:

- emailLookup.ok: false
- emailLookup.disabled: false
- emailLookup.error: Could not find the table 'public.customers' in the schema cache
- emailLookup.count: 0
- emailLookup.caseIds: empty array

Case lookup result:

- caseLookup.ok: true
- caseLookup.disabled: false
- caseLookup.requestedCaseId: 00000000-0000-4000-8000-000000000024
- caseLookup.found: false

## Classification

Result:

- BLOCKER CLASSIFIED

Blocker name:

- deployed authority read-path confidence blocker

Blocker class:

- deployed authority target / schema visibility / fixture availability unresolved

What is already proven:

- route/env availability is no longer the blocker
- protected probe route is reachable
- rehearsal env gate is active
- deployed runtime can execute the protected authority probe
- Supabase core authority is enabled at probe level

What is not proven:

- deployed fixture email can resolve to authority records
- deployed allowlisted case ID can resolve to an authority case record
- deployed Supabase target contains the expected clean authority tables
- deployed Supabase target contains the expected fixture records
- deployed backend read contract is aligned with the deployed authority baseline

## Possible Root Causes To Classify Next

The blocker may be caused by one or more of the following:

1. Render SUPABASE_URL points to the wrong Supabase project.

2. The deployed Supabase project does not contain public.customers.

3. public.customers exists, but schema cache / exposed schema / table visibility does not make it available to the deployed API path.

4. Fixture customer / case records are not present in the deployed authority source.

5. Backend contract and deployed authority baseline are inconsistent.

## Current Leading Signal

The strongest observed signal is:

- emailLookup.error: Could not find the table 'public.customers' in the schema cache

This points first to target/schema visibility alignment, before fixture data.

However, caseLookup.found false means fixture data availability also remains unproven.

Therefore the next step should inspect the deployed Supabase target and table availability before choosing any fix.

## Decision / Change Summary

Do not patch getCaseRecordsByEmail in this classification record.

Do not patch /cases or /case read logic in this classification record.

Do not apply a Supabase migration in this classification record.

Do not insert fixture data in this classification record.

The next step should be an inspection/candidate focused on proving:

- which Supabase project Render is using
- whether public.customers exists in that project
- whether public.cases exists in that project
- whether the clean authority baseline tables are present
- whether the fixture customer and allowlisted case records are present

## Acceptance Criteria

This blocker classification is complete when:

- v0.9-5B evidence is recorded.
- The blocker is classified as deployed authority read-path confidence blocker.
- The record distinguishes it from route/env availability failure.
- The record lists the possible root causes.
- The record avoids selecting a fix prematurely.
- The next step is narrowed to Supabase target / schema / fixture availability inspection.

## Validation

This record adds no new runtime validation.

Prior validation used as classification evidence:

- protected deployed authority probe returned HTTP 200
- success true
- rehearsal true
- supabaseCoreAuthorityEnabled true
- emailLookup.ok false
- emailLookup error: Could not find the table 'public.customers' in the schema cache
- caseLookup.ok true
- caseLookup.found false

## Risk / Stop Line

Stop line:

- Do not treat this as route/env failure.
- Do not treat this as frontend failure.
- Do not treat this as payment, receipt, verification, or storage failure.
- Do not patch helpers before target/schema/fixture availability is inspected.
- Do not apply migrations before contract direction is selected.
- Do not insert or modify fixture data before confirming the deployed Supabase target.
- Do not broaden the probe beyond fixture-only / allowlisted-case-only.
- Do not expose arbitrary customer data.

Allowed next step:

- v0.9-5D deployed Supabase authority target / schema / fixture availability inspection candidate.

## Next Action

Next suitable work item:

- v0.9-5D deployed Supabase authority target schema fixture availability inspection candidate.

Suggested focus:

- Confirm the deployed Render SUPABASE_URL target without exposing secrets.
- Confirm whether public.customers exists in that target.
- Confirm whether public.cases exists in that target.
- Confirm whether the clean authority baseline tables are present.
- Confirm whether fixture email and allowlisted case ID records exist in the deployed authority source.
- Only after this inspection should a fix direction be selected.