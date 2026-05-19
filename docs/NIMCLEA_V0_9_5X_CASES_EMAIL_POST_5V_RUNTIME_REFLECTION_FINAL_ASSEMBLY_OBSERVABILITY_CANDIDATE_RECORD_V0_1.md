# v0.9-5X CASES EMAIL POST-5V RUNTIME REFLECTION FINAL ASSEMBLY OBSERVABILITY CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5X_CASES_EMAIL_POST_5V_RUNTIME_REFLECTION_FINAL_ASSEMBLY_OBSERVABILITY_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

v0.9-5W confirmed that deployed public /cases?email still returns HTTP 200 with an empty result after the v0.9-5V runtime patch.

This 5X record selects the next candidate direction: do not patch the public endpoint blindly again. First add protected fixture-only observability so the next work item can prove whether deployed runtime is executing the v0.9-5V marker path and identify the exact final assembly drop point.

## Scope

- Area: deployed /cases?email read-path confidence, post-5V runtime reflection, final assembly observability.
- Files inspected: backend/server.js, backend/utils/supabaseCoreAuthorityStore.js, v0.9-5V record, v0.9-5W record.
- Files changed: this 5X record only, plus scripts/check-release-gate.mjs through gate-doc protection.
- Runtime behavior affected: none in 5X. This is a candidate record only.

## Decision / Change Summary

- Decision: select protected fixture-only final assembly observability as the next candidate.
- Do not patch public /cases?email again before proving the drop point.
- Do not downgrade the v0.9-5W empty result to WARN.
- Do not change Supabase schema, Supabase data, frontend, payment, receipt, verification, trial, or storage behavior in 5X.
- The next implementation should expose only sanitized counts, booleans, allowlisted fixture case IDs, and sanitized errors.

## Current Evidence

- v0.9-5H confirmed deployed protected authority probe access after Render Supabase env parity correction.
- v0.9-5I closed the deployed Supabase env parity blocker for the protected fixture authority probe scope.
- v0.9-5K showed public /cases?email returned HTTP 200 but empty result.
- v0.9-5T identified a likely final assembly drop point.
- v0.9-5V implemented marker-based clean authority final assembly promotion.
- v0.9-5W showed deployed public /cases?email still returned empty result after v0.9-5V.

## Candidate Direction

- Add or extend a protected fixture-only observability path for the public /cases?email final assembly pipeline.
- Gate it behind NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true.
- Restrict it to fixture emails under @nimclea.test.
- Restrict it to explicit allowlisted fixture case IDs.
- Return only sanitized diagnostic fields.
- Include helper lookup status, helper row count, helper allowlisted case IDs, marker application status, candidate assembly count, durable promotion count, final assembled count, final allowlisted case IDs, missing expected case IDs, and sanitized error string if any.
- Do not expose raw customer records, raw case records, secrets, service role keys, payment data, receipt data, verification data, or storage data.

## Rejected Directions

- Rejected: patch public /cases?email again without observing the exact drop point.
- Rejected: treat the v0.9-5W empty result as success.
- Rejected: broaden public endpoint behavior for all customers.
- Rejected: change Supabase schema or fixture data.
- Rejected: touch frontend, payment, receipt, verification, trial, or storage logic.

## Acceptance Criteria

- Next work item should be v0.9-5Y.
- v0.9-5Y should implement the smallest protected fixture-only observability change.
- Protected observability path must be gated by NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS.
- Protected observability path must accept only fixture email.
- Protected observability path must check only allowlisted case IDs.
- Protected observability path must return sanitized counts, booleans, allowlisted case IDs, and sanitized errors only.
- Public /cases?email behavior should not change except for shared internal instrumentation with no public response impact.
- No raw records should be exposed.
- No secrets should be exposed.
- No frontend behavior should change.
- No Supabase schema or data should change.
- release-check should pass with FAIL 0.
- Deployed smoke result should be recorded honestly as PASS or FAIL.

## Validation

- Command expected: .\scripts\v09-work-item.ps1 with this 5X ID, kind candidate, and commit message Add v0.9-5X cases email post 5V observability candidate.
- Expected result: document protected by release gate, release-check passes with FAIL 0, GitHub push completes, and Render alive check passes.

## Risk / Stop Line

- Stop if the next change exposes raw case or customer records.
- Stop if the next change exposes secrets.
- Stop if the next change allows arbitrary production emails.
- Stop if the next change allows arbitrary case IDs.
- Stop if the next change weakens deleted or tombstone filtering.
- Stop if the next change changes frontend, payment, receipt, verification, trial, Supabase schema, or Supabase Storage behavior.
- Stop if the v0.9-5W empty result is treated as success without proof.

## Next Action

- Proceed to v0.9-5Y: implement protected fixture-only final assembly observability for the deployed /cases?email path.
- Then run deployed fixture smoke to determine whether deployed runtime is executing the v0.9-5V marker path and where the expected fixture case IDs are dropped.
