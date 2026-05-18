# v0.9-5G DEPLOYED SUPABASE ENV PARITY VERIFICATION CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5G_DEPLOYED_SUPABASE_ENV_PARITY_VERIFICATION_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the selected candidate for deployed Supabase env parity verification after v0.9-5F.

v0.9-5F classified the remaining contradiction as deployed runtime Supabase env parity / effective access mismatch.

This record defines the next smallest safe verification step without exposing secrets or changing runtime behavior.

## Scope

Area:

- v0.9 runtime authority observability
- deployed Supabase env parity verification
- effective runtime Supabase access verification
- service role key / project / service alignment candidate

Runtime behavior changed by this record:

- None.
- This is candidate only.
- No backend code is changed.
- No frontend code is changed.
- No Supabase schema, RLS, grants, storage, payment, receipt, or verification behavior is changed.
- No fixture data is inserted or modified.
- No secrets are exposed.

## Prior Evidence Baseline

v0.9-5E confirmed:

- intended Supabase project ref: rlbquzefqfnvpgyjaags
- local backend.env SUPABASE_URL points to rlbquzefqfnvpgyjaags.supabase.co
- Render SUPABASE_URL was manually confirmed as same project
- clean authority tables exist in intended target
- public.customers exists
- public.cases exists
- fixture customer exists
- allowlisted fixture case exists
- fixture customer has two case records

v0.9-5B deployed protected probe still showed:

- emailLookup.ok false
- emailLookup.error: Could not find the table 'public.customers' in the schema cache
- caseLookup.ok true
- caseLookup.found false

v0.9-5F classified this contradiction as:

- deployed runtime Supabase env parity / effective access mismatch

## Candidate Decision

Selected candidate:

- Verify deployed Supabase env parity on the correct Render nimclea-api service without exposing secrets.

The next step should verify:

1. SUPABASE_URL is present on the correct Render nimclea-api service.

2. SUPABASE_URL points to rlbquzefqfnvpgyjaags.supabase.co.

3. SUPABASE_SERVICE_ROLE_KEY is present on the same Render nimclea-api service.

4. SUPABASE_SERVICE_ROLE_KEY belongs to the same Supabase project, rlbquzefqfnvpgyjaags, without pasting or logging the key.

5. The service is redeployed / restarted after env verification.

6. The protected fixture authority probe is re-run after redeploy.

## Safe Verification Method

Allowed manual verification:

- Open Supabase project rlbquzefqfnvpgyjaags.
- Open Project Settings / API.
- Locate the service role key source.
- Compare it visually with the Render SUPABASE_SERVICE_ROLE_KEY value inside Render UI.
- Do not copy the key into chat.
- Do not paste the key into docs.
- Do not print the key in terminal logs.
- Only record whether the values match or do not match.

Allowed documented result shape:

- Render SUPABASE_URL: same project
- Render SUPABASE_SERVICE_ROLE_KEY: present
- Render SUPABASE_SERVICE_ROLE_KEY project alignment: matches rlbquzefqfnvpgyjaags / does not match / not verified
- Redeploy after verification: yes / no
- Protected probe result after redeploy: captured separately

## Proposed Next Work Item

Next suitable work item:

- v0.9-5H deployed Supabase env parity verification execution / protected probe re-smoke record

Proposed kind:

- smoke or inspection

Suggested scope:

- manual env parity verification
- no secret exposure
- redeploy / restart
- protected fixture probe re-smoke
- classify result based on deployed JSON response

## Proposed 5H Interpretation Rules

After env parity verification and redeploy, re-run:

GET /internal/rehearsal/authority-probe?email=smoke%2Bcases-existing-001%40nimclea.test&caseId=00000000-0000-4000-8000-000000000024

Interpretation:

- If emailLookup.ok true and caseLookup.found true, deployed authority read-path confidence passes for the protected fixture scope.

- If emailLookup still reports public.customers missing from schema cache, env parity remains unresolved or the deployed runtime effective access path is still wrong.

- If emailLookup passes but caseLookup.found false remains, classify fixture case read mismatch separately.

- If the route returns 404, route/env availability regressed.

- If the route returns 5xx, classify deployed authority execution failure separately.

## Non-Selected Actions

Do not do these in this candidate:

- Do not paste SUPABASE_SERVICE_ROLE_KEY into chat.
- Do not paste SUPABASE_SERVICE_ROLE_KEY into docs.
- Do not print secret values in terminal output.
- Do not patch getCaseRecordsByEmail.
- Do not patch getCaseRecordByCaseId.
- Do not patch /cases or /case route logic.
- Do not apply Supabase migrations.
- Do not insert fixture data.
- Do not change RLS or grants.
- Do not change frontend behavior.
- Do not change payment behavior.
- Do not change receipt behavior.
- Do not change verification behavior.
- Do not change storage behavior.

## Acceptance Criteria

This candidate record is complete when:

- The prior 5E and 5F evidence baseline is recorded.
- The selected next step is env parity verification.
- The record defines how to verify SUPABASE_SERVICE_ROLE_KEY without exposing the key.
- The record requires redeploy / restart after verification.
- The record defines protected probe re-smoke interpretation rules.
- The record rejects helper patches, migrations, fixture writes, and unrelated product changes.

## Validation

This record adds no new runtime validation.

Prior validation used as baseline:

- intended Supabase target is healthy
- Render SUPABASE_URL manually confirmed same project
- clean authority tables exist
- fixture customer exists
- fixture case exists
- deployed probe contradiction remains

## Risk / Stop Line

Stop line:

- Do not expose SUPABASE_SERVICE_ROLE_KEY.
- Do not paste secrets into chat, docs, terminal logs, screenshots, or commits.
- Do not patch helpers before env parity verification.
- Do not apply migrations before env parity verification.
- Do not insert fixture records before env parity verification.
- Do not broaden probe access beyond fixture-only / allowlisted-case-only.
- Do not change frontend, payment, receipt, verification, or storage behavior.

Allowed next step:

- v0.9-5H deployed Supabase env parity verification execution / protected probe re-smoke record.

## Next Action

Next suitable work item:

- v0.9-5H deployed Supabase env parity verification execution / protected probe re-smoke record.

Suggested focus:

- Verify Render SUPABASE_SERVICE_ROLE_KEY exists on the correct nimclea-api service.
- Verify it matches the service role key from Supabase project rlbquzefqfnvpgyjaags without exposing the key.
- Redeploy / restart the Render service.
- Re-run the protected fixture authority probe.
- Record only sanitized results.