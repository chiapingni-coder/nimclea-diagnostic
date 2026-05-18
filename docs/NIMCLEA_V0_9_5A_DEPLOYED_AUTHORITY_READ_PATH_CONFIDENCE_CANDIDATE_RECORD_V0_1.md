# v0.9-5A DEPLOYED AUTHORITY READ PATH CONFIDENCE CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5A_DEPLOYED_AUTHORITY_READ_PATH_CONFIDENCE_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the selected candidate for the next deployed authority read-path confidence step after v0.9-4Z.

v0.9-4Z closed the deployed protected authority probe route/env availability blocker.

Confirmed by v0.9-4Y / v0.9-4Z:

- the protected authority probe route is reachable in deployed runtime
- Render rehearsal env gate is active
- protected fixture authority probe executes
- Supabase core authority is enabled at probe level

This record selects the smallest safe next step to prove deployed authority read-path confidence without broadening access or changing runtime behavior.

## Scope

Area:

- v0.9 runtime authority observability
- deployed authority read-path confidence
- fixture-only read validation
- allowlisted-case-only read validation

Runtime behavior changed by this record:

- None.
- This is candidate only.
- No backend code is changed.
- No frontend code is changed.
- No Supabase schema, RLS, grants, storage, payment, receipt, or verification behavior is changed.

## Prior Closure Baseline

v0.9-4T through v0.9-4Z established the following:

- The deployed authority probe 404 blocker was not a Supabase authority failure.
- The probe route was likely deployed and registered because the response body matched the app env-gate response.
- NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true was enabled on the deployed nimclea-api service.
- The protected fixture authority probe returned HTTP 200.
- The response included success true, rehearsal true, and supabaseCoreAuthorityEnabled true.

Remaining unproven:

- full production fixture stability
- full /cases?email read-path stability
- full /case/:caseId read-path stability
- frontend end-to-end readiness
- payment readiness
- receipt readiness
- verification readiness
- storage readiness
- unrestricted production readiness

## Candidate Decision

Selected candidate:

- Use the now-reachable protected authority probe as the fixture-only observability anchor for the next deployed read-path confidence smoke.

The next step should not introduce a new public data access surface.

The next step should not patch helper logic.

The next step should not change schema.

The next step should re-run the protected fixture probe and capture the full response shape needed to determine whether the deployed read path can resolve:

1. Supabase core authority enabled state.
2. Fixture email lookup result.
3. Allowlisted case ID lookup result.
4. Whether the expected allowlisted case ID appears in the deployed authority read response.
5. Whether the response stays within fixture-only and allowlisted-case-only safety boundaries.

## Proposed Next Work Item

Next suitable work item:

- v0.9-5B deployed authority read-path confidence inspection / smoke record

Proposed kind:

- smoke or inspection

Suggested scope:

- read-only
- deployed runtime only
- protected probe only
- fixture email only
- allowlisted case ID only
- no customer data exposure
- no frontend behavior change
- no backend helper patch
- no Supabase schema/RLS/grant change
- no payment/receipt/verification/storage change

## Proposed 5B Validation Shape

The next smoke should call the protected fixture probe:

GET /internal/rehearsal/authority-probe?email=smoke%2Bcases-existing-001%40nimclea.test&caseId=00000000-0000-4000-8000-000000000024

The next record should capture the full JSON response and classify:

- HTTP status
- success
- rehearsal
- supabaseCoreAuthorityEnabled
- emailLookup result
- case lookup result
- whether the allowlisted case ID is present
- sanitized error fields, if any

Interpretation rules:

- HTTP 200 with success true and expected fixture read evidence present means deployed authority read-path confidence passes for this narrow protected fixture scope.
- HTTP 200 but missing expected fixture read evidence means route/probe availability passes but read-path confidence remains unresolved.
- HTTP 400 means route reachable but fixture query contract failed.
- HTTP 404 means route/env availability regressed.
- HTTP 5xx means route reachable but deployed authority read execution failed and requires separate blocker classification.

## Non-Selected Actions

Do not do these in this candidate:

- Do not patch getCaseRecordsByEmail.
- Do not patch /cases lookup logic.
- Do not patch /case/:caseId logic.
- Do not change frontend routing.
- Do not change payment behavior.
- Do not change receipt behavior.
- Do not change verification behavior.
- Do not change storage behavior.
- Do not change Supabase schema, RLS, or grants.
- Do not broaden the probe to arbitrary emails.
- Do not broaden the probe to arbitrary case IDs.
- Do not claim full production readiness.

## Acceptance Criteria

This candidate record is complete when:

- The prior 4Z closure baseline is recorded.
- The next scope is selected as deployed authority read-path confidence.
- The next proof is constrained to protected fixture-only / allowlisted-case-only read validation.
- The candidate rejects helper/schema/frontend/payment/receipt/verification/storage changes.
- The proposed 5B validation shape is defined.
- The record avoids overclaiming production readiness.

## Validation

This record adds no new runtime validation.

Prior validation used as baseline:

- Protected deployed authority probe returned HTTP 200.
- Response included success true.
- Response included rehearsal true.
- Response included supabaseCoreAuthorityEnabled true.

## Risk / Stop Line

Stop line:

- Do not expose arbitrary customer data.
- Do not remove fixture email restriction.
- Do not remove allowlisted case ID restriction.
- Do not treat probe availability as full product readiness.
- Do not move to payment, receipt, verification, storage, or frontend changes from this record.
- Do not patch schema or helpers unless a separate blocker is classified.

Allowed next step:

- v0.9-5B deployed authority read-path confidence inspection / smoke record.

## Next Action

Next suitable work item:

- v0.9-5B deployed authority read-path confidence inspection / smoke record.

Suggested focus:

- Re-run the protected fixture authority probe.
- Capture the full deployed JSON response.
- Classify whether fixture email and allowlisted case ID read evidence is present.
- Preserve fixture-only and allowlisted-case-only boundaries.