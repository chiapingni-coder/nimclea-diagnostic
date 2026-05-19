# v0.9-5AD CASE DETAIL ENDPOINT DEPLOYED READ PATH CONFIDENCE CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5AD_CASE_DETAIL_ENDPOINT_DEPLOYED_READ_PATH_CONFIDENCE_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record defines the deployed /case/:caseId read-path confidence candidate after v0.9-5AC closed the public /cases?email= final assembly emission blocker for the controlled fixture scope.

## Scope

- Area: Backend deployed case detail read path.
- Files inspected: backend/routes/caseRoutes.js; backend/utils/supabaseCoreAuthorityStore.js; backend/server.js; prior v0.9-5AB deployed smoke evidence; prior v0.9-5AC closure evidence.
- Files changed: docs/NIMCLEA_V0_9_5AD_CASE_DETAIL_ENDPOINT_DEPLOYED_READ_PATH_CONFIDENCE_CANDIDATE_RECORD_V0_1.md; scripts/check-release-gate.mjs through normal gate-doc protection only.
- Runtime behavior affected: None. This is a candidate record only.

## Decision / Change Summary

- Candidate selected: validate deployed /case/:caseId read-path confidence for the same controlled fixture scope used by /cases?email=.
- Primary fixture case ID: 00000000-0000-4000-8000-000000000024.
- Optional secondary fixture case ID: 00000000-0000-4000-8000-000000009401.
- Expected endpoint: https://nimclea-api.onrender.com/case/00000000-0000-4000-8000-000000000024.
- Expected behavior: deployed /case/:caseId should return HTTP 200 and a case detail payload for the allowlisted fixture case if the clean authority read path is correctly connected.
- This candidate does not change backend logic, frontend logic, Supabase schema, RLS, grants, payment, receipt, verification, trial, storage, or deployment behavior.

## Acceptance Criteria

- The candidate record is filled.
- The record is protected in scripts/check-release-gate.mjs.
- scripts/release-check.ps1 completes with FAIL 0.
- release-push completes successfully.
- GitHub master aligns with origin/master.
- Render alive check passes.
- The follow-up deployed smoke should require GET /case/00000000-0000-4000-8000-000000000024 to return HTTP 200 with the requested case ID or canonical equivalent field.

## Validation

Commands / checks run: rerun scripts/v09-work-item.ps1 for NIMCLEA_V0_9_5AD_CASE_DETAIL_ENDPOINT_DEPLOYED_READ_PATH_CONFIDENCE_CANDIDATE_RECORD_V0_1 with Kind candidate and commit message Add v0.9-5AD case detail deployed read path confidence candidate.

Result: Pending rerun after this record is filled. Expected validation path is gate-doc protection, release-check, release-push, GitHub push, and Render alive check.

## Risk / Stop Line

- Do not patch /case/:caseId from this candidate record.
- Do not patch /cases?email= from this candidate record because v0.9-5AC already closed that scope.
- Do not change Supabase schema, RLS, grants, frontend, payment, receipt, verification, trial, or storage from this candidate record.
- If deployed /case/:caseId fails but protected authority probe succeeds for the same case ID, classify the failure as a case-detail route or read-path assembly issue.
- If protected authority probe fails first, classify under deployed authority availability or Supabase env parity instead.

## Next Action

- Protect and push this candidate record through the normal v09-work-item flow.
- Then run v0.9-5AE deployed /case/:caseId read-path confidence smoke for primary fixture case 00000000-0000-4000-8000-000000000024.
- Keep the follow-up smoke fixture-only and read-only.
