# v0.9-5J DEPLOYED CASES EMAIL ENDPOINT CONFIDENCE CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5J_DEPLOYED_CASES_EMAIL_ENDPOINT_CONFIDENCE_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the selected candidate for controlled deployed /cases?email endpoint confidence after v0.9-5I.

v0.9-5I closed the deployed runtime Supabase env parity / effective access blocker for the protected fixture authority probe scope.

This record defines the next smallest safe step: verify whether the deployed product-facing /cases?email endpoint can read the same fixture authority data.

## Scope

Area:

- v0.9 runtime authority observability
- deployed product-facing read endpoint confidence
- /cases?email controlled fixture smoke planning
- fixture-only deployed endpoint confidence

Runtime behavior changed by this record:

- None.
- This is candidate only.
- No backend code is changed.
- No frontend code is changed.
- No Supabase schema, RLS, grants, storage, payment, receipt, or verification behavior is changed.
- No fixture data is inserted or modified.
- No secrets are exposed.

## Prior Closure Baseline

v0.9-5I confirmed:

- Render SUPABASE_URL points to the intended project.
- Render SUPABASE_SERVICE_ROLE_KEY is valid in deployed runtime.
- Deployed runtime can access the intended Supabase authority target.
- Deployed runtime can read public.customers through the authority path.
- Deployed runtime can resolve the fixture email to authority case IDs.
- Deployed runtime can resolve the allowlisted fixture case ID.

v0.9-5H protected probe PASS evidence included:

- success true
- rehearsal true
- supabaseCoreAuthorityEnabled true
- emailLookup.ok true
- emailLookup.count 2
- emailLookup.caseIds included 00000000-0000-4000-8000-000000009401
- emailLookup.caseIds included 00000000-0000-4000-8000-000000000024
- caseLookup.ok true
- caseLookup.found true
- caseLookup.caseId 00000000-0000-4000-8000-000000000024

## Candidate Decision

Selected candidate:

- Run a controlled read-only deployed /cases?email endpoint confidence smoke using the existing fixture email.

Fixture email:

- smoke+cases-existing-001@nimclea.test

Expected authority case IDs from protected probe baseline:

- 00000000-0000-4000-8000-000000009401
- 00000000-0000-4000-8000-000000000024

Product-facing endpoint under candidate:

- GET /cases?email=smoke%2Bcases-existing-001%40nimclea.test

The next step should verify whether the deployed /cases?email endpoint returns evidence of those expected fixture case IDs.

## Why This Candidate Is Selected

The protected authority probe proved deployed Supabase authority access at fixture scope.

The next useful confidence layer is not another internal probe.

The next useful layer is the product-facing read endpoint that the workspace / cases flow depends on:

- /cases?email

This keeps the sequence disciplined:

1. Internal deployed authority access was proven first.
2. Then product-facing deployed read endpoint confidence is tested.
3. Only if that endpoint fails should a new blocker be classified.

## Proposed Next Work Item

Next suitable work item:

- v0.9-5K deployed /cases?email endpoint confidence inspection / smoke record

Proposed kind:

- smoke or inspection

Suggested scope:

- read-only
- deployed runtime only
- fixture email only
- no arbitrary customer lookup
- no frontend behavior change
- no helper patch
- no schema change
- no payment, receipt, verification, or storage change

## Proposed 5K Smoke Shape

Endpoint:

GET https://nimclea-api.onrender.com/cases?email=smoke%2Bcases-existing-001%40nimclea.test

The 5K record should capture:

- HTTP status
- top-level success / count shape if present
- returned cases array or equivalent response body
- whether case ID 00000000-0000-4000-8000-000000000024 is present
- whether case ID 00000000-0000-4000-8000-000000009401 is present
- sanitized error fields if any

## Proposed 5K Interpretation Rules

PASS for narrow fixture scope if:

- endpoint returns HTTP 200
- response contains expected fixture case evidence
- expected case IDs are present or otherwise traceably represented
- no unexpected broad data exposure occurs

FAIL / blocker classification needed if:

- endpoint returns 404 or 5xx
- endpoint returns 200 but count is zero
- endpoint returns 200 but expected fixture case IDs are absent
- endpoint returns stale local-only or non-authority data
- endpoint exposes data outside the controlled fixture scope in a concerning way

If FAIL occurs, next action should be blocker classification before helper patching.

## Non-Selected Actions

Do not do these in this candidate:

- Do not patch /cases logic.
- Do not patch getCaseRecordsByEmail.
- Do not patch /case/:caseId logic.
- Do not change frontend routing.
- Do not change payment behavior.
- Do not change receipt behavior.
- Do not change verification behavior.
- Do not change storage behavior.
- Do not change Supabase schema, RLS, or grants.
- Do not insert fixture data.
- Do not run arbitrary customer email probes.
- Do not claim full production endpoint readiness from this candidate.

## Acceptance Criteria

This candidate record is complete when:

- The v0.9-5I closure baseline is recorded.
- The next scope is selected as controlled deployed /cases?email endpoint confidence.
- The fixture email is named.
- The expected case IDs are named.
- The proposed 5K smoke shape is defined.
- The proposed interpretation rules are defined.
- The record rejects helper patches, schema changes, fixture writes, frontend changes, and unrelated product changes.

## Validation

This record adds no new runtime validation.

Prior validation used as baseline:

- protected deployed authority probe returned success true
- rehearsal true
- supabaseCoreAuthorityEnabled true
- emailLookup.ok true
- emailLookup.count 2
- caseLookup.ok true
- caseLookup.found true

## Risk / Stop Line

Stop line:

- Do not run arbitrary customer lookup.
- Do not expose arbitrary customer data.
- Do not broaden beyond the fixture email.
- Do not patch helpers before endpoint confidence smoke classifies a blocker.
- Do not apply schema changes from this candidate.
- Do not insert fixture records from this candidate.
- Do not claim frontend, payment, receipt, verification, or storage readiness.
- Do not claim full production launch readiness.

Allowed next step:

- v0.9-5K deployed /cases?email endpoint confidence inspection / smoke record.

## Next Action

Next suitable work item:

- v0.9-5K deployed /cases?email endpoint confidence inspection / smoke record.

Suggested focus:

- Run a read-only deployed /cases?email smoke using smoke+cases-existing-001@nimclea.test.
- Capture full sanitized response.
- Confirm whether the expected fixture case IDs are present.
- Preserve fixture-only scope.
- If response does not contain expected fixture evidence, classify a blocker before selecting any fix.