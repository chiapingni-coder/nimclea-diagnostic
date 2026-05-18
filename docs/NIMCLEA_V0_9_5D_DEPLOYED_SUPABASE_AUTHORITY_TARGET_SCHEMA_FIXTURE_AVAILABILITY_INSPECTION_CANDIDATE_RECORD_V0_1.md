# v0.9-5D DEPLOYED SUPABASE AUTHORITY TARGET SCHEMA FIXTURE AVAILABILITY INSPECTION CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5D_DEPLOYED_SUPABASE_AUTHORITY_TARGET_SCHEMA_FIXTURE_AVAILABILITY_INSPECTION_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the selected inspection candidate after v0.9-5C classified the deployed authority read-path confidence blocker.

v0.9-5C classified the blocker as deployed authority target / schema visibility / fixture availability unresolved.

This record defines the next smallest inspection path before any fix is selected.

## Scope

Area:

- v0.9 runtime authority observability
- deployed Supabase authority target inspection
- schema/table availability inspection
- fixture data availability inspection
- deployed read-path confidence recovery planning

Runtime behavior changed by this record:

- None.
- This is candidate only.
- No backend code is changed.
- No frontend code is changed.
- No Supabase schema, RLS, grants, storage, payment, receipt, or verification behavior is changed.
- No fixture data is inserted or modified.

## Prior Evidence From v0.9-5B and v0.9-5C

v0.9-5B protected authority probe result:

- HTTP status: 200
- success: true
- rehearsal: true
- supabaseCoreAuthorityEnabled: true
- emailLookup object present
- caseLookup object present

Read-path confidence failed because:

- emailLookup.ok: false
- emailLookup.error: Could not find the table 'public.customers' in the schema cache
- emailLookup.count: 0
- emailLookup.caseIds: empty array
- caseLookup.ok: true
- caseLookup.found: false for allowlisted case ID 00000000-0000-4000-8000-000000000024

v0.9-5C classified this as:

- deployed authority target / schema visibility / fixture availability unresolved

## Candidate Decision

Selected candidate:

- Inspect deployed Supabase authority target / schema / fixture availability before selecting any fix.

This candidate should answer five questions:

1. Does Render SUPABASE_URL point to the intended Supabase authority project?

2. Does the deployed Supabase target contain public.customers?

3. Does the deployed Supabase target contain public.cases?

4. Are the clean authority baseline tables available in the deployed Supabase target?

5. Do the fixture email and allowlisted case ID records exist in the deployed authority source?

## Why This Candidate Is Selected

The strongest v0.9-5B signal was:

- Could not find the table 'public.customers' in the schema cache

This points first to Supabase target / schema visibility / table availability.

The second signal was:

- caseLookup.found: false

This means fixture record availability is also unproven.

Therefore, the next step should inspect target, schema, and fixture availability in that order.

Do not start with helper patching.

Do not start with a migration.

Do not start with fixture insertion.

## Proposed Next Work Item

Next suitable work item:

- v0.9-5E deployed Supabase authority target schema fixture availability inspection record

Proposed kind:

- inspection

Suggested scope:

- read-only
- no secret exposure
- no customer data exposure
- no runtime behavior changes
- no schema changes
- no fixture writes

## Proposed 5E Inspection Shape

The next inspection should gather sanitized evidence for:

1. Render target alignment

- Confirm the Render backend service has SUPABASE_URL configured.
- Confirm only the non-secret project reference or hostname is recorded.
- Do not expose SUPABASE_SERVICE_ROLE_KEY or any secret value.

2. Supabase table availability

Check whether these tables exist in the deployed target:

- public.customers
- public.cases
- public.case_events
- public.receipts
- public.verifications
- public.payments
- public.trial_lifecycle
- public.audit_trail
- public.hash_ledger

3. Schema visibility / cache signal

Check whether the same API path that deployed backend uses can see:

- customers
- cases

The inspection should distinguish:

- table absent
- table present but not visible through queried schema cache
- wrong Supabase project target
- permission / role visibility issue
- fixture data absent

4. Fixture availability

Check whether the deployed authority source contains:

- fixture email: smoke+cases-existing-001@nimclea.test
- allowlisted case ID: 00000000-0000-4000-8000-000000000024

5. Classification after inspection

Classify as one of:

- wrong Render Supabase target
- missing clean authority schema
- schema cache / visibility issue
- missing fixture data
- backend contract drift
- mixed blocker requiring separate split records

## Non-Selected Actions

Do not do these in this candidate:

- Do not patch getCaseRecordsByEmail.
- Do not patch getCaseRecordByCaseId.
- Do not patch /cases lookup logic.
- Do not patch /case/:caseId logic.
- Do not apply Supabase migrations.
- Do not insert fixture data.
- Do not change RLS or grants.
- Do not change frontend behavior.
- Do not change payment behavior.
- Do not change receipt behavior.
- Do not change verification behavior.
- Do not change storage behavior.
- Do not expose secrets in docs or logs.

## Acceptance Criteria

This candidate record is complete when:

- The v0.9-5B / 5C evidence baseline is recorded.
- The selected candidate is target / schema / fixture availability inspection.
- The five inspection questions are defined.
- The proposed 5E inspection shape is defined.
- The candidate avoids selecting a fix prematurely.
- The record explicitly rejects helper patches, migrations, fixture writes, and unrelated product changes.

## Validation

This record adds no new runtime validation.

Prior validation used as baseline:

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

- Do not expose Supabase service role keys or secrets.
- Do not expose arbitrary customer data.
- Do not broaden the protected probe beyond fixture-only / allowlisted-case-only.
- Do not patch helpers before target/schema/fixture inspection.
- Do not apply migrations before contract direction is selected.
- Do not insert fixture records before confirming the deployed Supabase target.
- Do not change frontend, payment, receipt, verification, or storage behavior.

Allowed next step:

- v0.9-5E deployed Supabase authority target schema fixture availability inspection record.

## Next Action

Next suitable work item:

- v0.9-5E deployed Supabase authority target schema fixture availability inspection record.

Suggested focus:

- Inspect Render SUPABASE_URL target without exposing secrets.
- Inspect deployed Supabase table availability.
- Inspect public.customers and public.cases availability.
- Inspect clean authority baseline table availability.
- Inspect fixture email and allowlisted case ID availability.
- Classify the blocker before selecting a fix.