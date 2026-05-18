# v0.9-5H DEPLOYED SUPABASE ENV PARITY VERIFICATION EXECUTION PROTECTED PROBE RESMOKE RECORD

## Record ID

NIMCLEA_V0_9_5H_DEPLOYED_SUPABASE_ENV_PARITY_VERIFICATION_EXECUTION_PROTECTED_PROBE_RESMOKE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the deployed Supabase env parity verification execution and protected probe re-smoke after v0.9-5G.

v0.9-5G selected a safe verification path for Render Supabase env parity without exposing secrets.

This record captures the execution result after correcting the deployed SUPABASE_SERVICE_ROLE_KEY alignment and re-running the protected fixture authority probe.

## Scope

Area:

- v0.9 runtime authority observability
- deployed Supabase env parity verification
- deployed effective Supabase access
- protected fixture authority read-path confidence

Runtime behavior changed by this record:

- No code was changed.
- No frontend behavior was changed.
- No Supabase schema, RLS, grants, storage, payment, receipt, or verification behavior was changed.
- No fixture data was inserted or modified.
- Render environment configuration was corrected for deployed Supabase service-role access.
- No secrets are exposed in this record.

## Execution Summary

The Render nimclea-api service environment was verified and corrected.

The deployed SUPABASE_SERVICE_ROLE_KEY was replaced with the valid key corresponding to the intended Supabase project:

- projectRef: rlbquzefqfnvpgyjaags

The key itself was not logged, pasted, screenshotted, committed, or written into this record.

After saving the Render environment change, the backend service was redeployed / restarted.

The protected fixture authority probe was re-run.

## Protected Probe Target

Fixture email:

- smoke+cases-existing-001@nimclea.test

Allowlisted case ID:

- 00000000-0000-4000-8000-000000000024

Probe type:

- protected fixture-only authority probe
- allowlisted-case-only

## Observed Result

Top-level response:

- success: true
- probe: deployed_authority_availability
- rehearsal: true
- supabaseCoreAuthorityEnabled: true

Email lookup result:

- email: smoke+cases-existing-001@nimclea.test
- ok: true
- disabled: false
- count: 2
- caseIds:
  - 00000000-0000-4000-8000-000000009401
  - 00000000-0000-4000-8000-000000000024

Case lookup result:

- requestedCaseId: 00000000-0000-4000-8000-000000000024
- ok: true
- disabled: false
- found: true
- caseId: 00000000-0000-4000-8000-000000000024

## Classification

Result:

- PASS

Pass type:

- deployed Supabase env parity verified
- deployed effective Supabase access restored
- protected fixture authority read-path confidence established

What is now confirmed:

- Render SUPABASE_URL points to the intended project.
- Render SUPABASE_SERVICE_ROLE_KEY is valid for deployed runtime access.
- deployed runtime can read public.customers through the authority path.
- deployed runtime can resolve the fixture email to authority case IDs.
- deployed runtime can resolve the allowlisted fixture case ID.
- the prior Invalid API key state is resolved.
- the prior public.customers schema cache contradiction is resolved for this protected fixture scope.

What is not claimed:

- unrestricted production customer lookup
- arbitrary case lookup
- frontend end-to-end readiness
- payment readiness
- receipt readiness
- verification readiness
- storage readiness
- full production launch readiness

## Decision / Change Summary

The deployed runtime Supabase env parity / effective access blocker is resolved for the protected fixture authority probe scope.

The next step can close this blocker scope and decide the next v0.9 lane.

Recommended next scope:

- v0.9-5I closure / next-scope decision record

The next record should state exactly what 5H proved and what remains outside scope.

## Acceptance Criteria

This smoke record is complete when:

- Render env parity correction is documented without exposing secrets.
- Protected probe re-smoke result is documented.
- emailLookup.ok true is recorded.
- caseLookup.found true is recorded.
- deployed effective Supabase access is classified as PASS for protected fixture scope.
- overclaims about full production readiness are avoided.

## Validation

Commands / checks run:

- Render environment verification and correction.
- Render redeploy / restart.
- Protected fixture authority probe re-smoke.

Observed result:

- success true
- rehearsal true
- supabaseCoreAuthorityEnabled true
- emailLookup.ok true
- emailLookup.count 2
- caseLookup.ok true
- caseLookup.found true

## Risk / Stop Line

Stop line:

- Do not expose SUPABASE_SERVICE_ROLE_KEY.
- Do not paste secrets into chat, docs, terminal logs, screenshots, or commits.
- Do not broaden probe access beyond fixture-only / allowlisted-case-only.
- Do not claim full product readiness from this protected fixture probe alone.
- Do not change frontend, payment, receipt, verification, or storage behavior based on this record alone.

Allowed next step:

- v0.9-5I deployed Supabase env parity PASS closure / next-scope decision record.

## Next Action

Next suitable work item:

- v0.9-5I deployed Supabase env parity PASS closure / next-scope decision record.

Suggested focus:

- Close the deployed runtime Supabase env parity blocker.
- State exactly what 5H proved.
- State what remains unproven.
- Decide whether next lane is /cases?email deployed endpoint confidence, /case/:caseId deployed endpoint confidence, or return to AAC receipt/payment authority work.