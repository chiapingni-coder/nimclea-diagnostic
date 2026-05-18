# v0.9-5I DEPLOYED SUPABASE ENV PARITY PASS CLOSURE NEXT SCOPE DECISION RECORD

## Record ID

NIMCLEA_V0_9_5I_DEPLOYED_SUPABASE_ENV_PARITY_PASS_CLOSURE_NEXT_SCOPE_DECISION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record closes the deployed runtime Supabase env parity / effective access blocker scope after v0.9-5H.

It also records the next-scope decision after the protected fixture authority probe returned PASS with deployed read-path evidence.

## Scope

Area:

- v0.9 runtime authority observability
- deployed Supabase env parity closure
- deployed effective Supabase access closure
- protected fixture authority read-path confidence
- next-scope decision

Runtime behavior changed by this record:

- None.
- This is a closure / decision record only.
- No backend code is changed.
- No frontend code is changed.
- No Supabase schema, RLS, grants, storage, payment, receipt, or verification behavior is changed.
- No fixture data is inserted or modified.
- No secrets are exposed.

## Closure Chain

v0.9-5B:

- Protected deployed authority probe returned HTTP 200.
- Route/env availability was confirmed.
- Read-path confidence failed because emailLookup reported public.customers missing from schema cache and caseLookup.found was false.

v0.9-5C:

- Classified the failure as deployed authority target / schema visibility / fixture availability unresolved.
- Explicitly avoided helper patches, schema changes, and fixture writes.

v0.9-5D:

- Selected read-only deployed Supabase authority target / schema / fixture availability inspection.

v0.9-5E:

- Confirmed intended Supabase target rlbquzefqfnvpgyjaags was healthy.
- Confirmed Render SUPABASE_URL was manually verified as the same project.
- Confirmed clean authority tables existed.
- Confirmed fixture customer existed.
- Confirmed allowlisted fixture case existed.
- Left a contradiction: deployed runtime still could not read the authority data.

v0.9-5F:

- Classified the contradiction as deployed runtime Supabase env parity / effective access mismatch.
- Leading theory was service role key / project / runtime alignment.

v0.9-5G:

- Selected safe env parity verification candidate.
- Required no secret exposure.
- Required Render env verification, redeploy / restart, and protected probe re-smoke.

v0.9-5H:

- Corrected Render SUPABASE_SERVICE_ROLE_KEY without exposing the key.
- Redeployed / restarted the deployed nimclea-api service.
- Protected authority probe returned PASS evidence:
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

## Closure Result

Closure result:

- PASS

Closed blocker scope:

- deployed runtime Supabase env parity / effective access blocker for protected fixture authority probe scope

What is now confirmed:

- Render SUPABASE_URL points to the intended project.
- Render SUPABASE_SERVICE_ROLE_KEY is valid in deployed runtime.
- Deployed runtime can access the intended Supabase authority target.
- Deployed runtime can read public.customers through the authority path.
- Deployed runtime can resolve the fixture email to authority case IDs.
- Deployed runtime can resolve the allowlisted fixture case ID.
- The prior Invalid API key state is resolved.
- The prior public.customers schema cache contradiction is resolved for this protected fixture scope.
- The prior caseLookup.found false contradiction is resolved for this protected fixture scope.

What is not claimed:

- unrestricted production customer lookup
- arbitrary case lookup
- full /cases?email endpoint confidence
- full /case/:caseId endpoint confidence
- frontend end-to-end readiness
- payment readiness
- receipt readiness
- verification readiness
- storage readiness
- full production launch readiness

## Decision / Change Summary

The deployed runtime Supabase env parity / effective access blocker is closed for the protected fixture authority probe scope.

The next scope should move from protected internal probe confidence to controlled deployed endpoint confidence.

Selected next scope:

- controlled deployed /cases?email endpoint confidence candidate

Reason:

- The protected authority probe proves deployed authority access at fixture scope.
- The next practical product-facing read path is /cases?email.
- This should still be controlled, fixture-only, read-only, and non-broadening.
- /case/:caseId confidence can follow after /cases?email endpoint confidence, unless the candidate selects a different sequence.

## Next-Scope Boundary

Allowed next scope:

- deployed /cases?email endpoint confidence
- fixture email only
- read-only endpoint smoke
- no arbitrary customer lookup
- no frontend changes
- no payment / receipt / verification / storage changes
- no schema / helper patches unless a new blocker is classified

Not allowed in next scope:

- unrestricted production lookup
- arbitrary customer email probing
- arbitrary case ID probing
- helper patching without blocker classification
- Supabase schema or RLS changes without separate contract direction
- fixture writes
- frontend behavior changes
- payment, receipt, verification, or storage changes

## Acceptance Criteria

This closure record is complete when:

- v0.9-5B through v0.9-5H are summarized.
- The closed blocker scope is clearly identified.
- The 5H PASS evidence is recorded.
- The record states exactly what is confirmed.
- The record states what remains unproven.
- The next scope is selected.
- The record avoids exposing secrets and avoids overclaiming production readiness.

## Validation

Prior validation used for closure:

- protected deployed authority probe returned success true
- rehearsal true
- supabaseCoreAuthorityEnabled true
- emailLookup.ok true
- emailLookup.count 2
- emailLookup.caseIds included 00000000-0000-4000-8000-000000009401
- emailLookup.caseIds included 00000000-0000-4000-8000-000000000024
- caseLookup.ok true
- caseLookup.found true
- caseLookup.caseId 00000000-0000-4000-8000-000000000024

This record adds no new runtime validation.

## Risk / Stop Line

Stop line:

- Do not expose SUPABASE_SERVICE_ROLE_KEY.
- Do not paste secrets into chat, docs, terminal logs, screenshots, or commits.
- Do not broaden probe or endpoint validation beyond fixture-only / controlled scope.
- Do not claim unrestricted production readiness.
- Do not claim frontend, payment, receipt, verification, or storage readiness from this closure.
- Do not patch helpers unless a future endpoint confidence smoke classifies a blocker.
- Do not apply migrations unless a separate schema contract direction requires it.

Allowed next step:

- v0.9-5J deployed /cases?email endpoint confidence candidate.

## Next Action

Next suitable work item:

- v0.9-5J deployed /cases?email endpoint confidence candidate.

Suggested focus:

- Define a controlled read-only deployed /cases?email smoke using smoke+cases-existing-001@nimclea.test.
- Confirm whether the deployed product-facing cases endpoint returns the expected fixture case IDs.
- Preserve fixture-only scope.
- Avoid frontend, payment, receipt, verification, storage, schema, and helper changes unless a separate blocker is classified.