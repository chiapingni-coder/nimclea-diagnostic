# v0.9-4R DEPLOYED AUTHORITY AVAILABILITY RESOLUTION CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_4R_DEPLOYED_AUTHORITY_AVAILABILITY_RESOLUTION_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

Record the smallest safe candidate for proving deployed Render Supabase authority availability after v0.9-4P and v0.9-4Q showed that local helper access works but deployed /case/:caseId still returns 404.

## Result

CANDIDATE RECORDED.

Selected candidate: add or use a narrow deployed authority availability probe that is protected by an explicit rehearsal/probe enablement flag and returns only sanitized status, count, and error information.

## Background

v0.9-4O fixed getCaseRecordsByEmail(email) locally.
v0.9-4O local helper smoke returned ok true and count 2.
v0.9-4P deployed /cases?email= returned Count 0.
v0.9-4P deployed /case/:caseId returned 404 for both fixture case ids.
v0.9-4Q confirmed Render root endpoint is alive but deployed authority read remains unavailable or unproven.

## Candidate Direction

Before patching runtime helper logic again, prove whether deployed Render runtime has Supabase authority access.

The candidate should be one of:

1. Use an existing protected rehearsal endpoint if one already exists.
2. If no suitable endpoint exists, add a narrow probe endpoint behind an explicit enablement flag.

Preferred protection:

- Use an existing rehearsal/probe environment flag if already present.
- If a new flag is needed, use a narrow flag such as NIMCLEA_ENABLE_AUTHORITY_PROBE.
- Do not expose service role keys.
- Do not return full customer or case records.
- Do not expose customer data.
- Return only sanitized booleans, counts, selected fixture ids, and sanitized error messages.

## Probe Target

The probe should verify deployed access to:

- Supabase client enabled state.
- customers table read by email.
- cases table read by customer_id.
- optional /case/:caseId clean authority read path diagnosis.

Suggested fixture:

- email: smoke+cases-existing-001@nimclea.test
- customer_id: 00000000-0000-4000-8000-000000000023
- expected case ids:
  - 00000000-0000-4000-8000-000000000024
  - 00000000-0000-4000-8000-000000009401

## Scope

- Area: Deployed runtime authority availability
- Runtime behavior changed in this record: No
- Supabase Storage included: No
- Schema/RLS/grants/migrations included: No
- Frontend/payment/receipt/verification/trial changes included: No

## Non-Goals

- No runtime patch in this record.
- No schema migration.
- No helper rewrite.
- No fallback removal.
- No customer data exposure.
- No service role exposure.
- No PASS claim for deployed /cases?email= smoke.

## Acceptance Criteria

- Candidate proves deployed authority availability before further runtime helper changes.
- Candidate is narrow and protected.
- Candidate returns sanitized proof only.
- Candidate preserves existing /cases and /case response behavior.
- No runtime code is changed in this record.

## Risk / Stop Line

Stop if the next step attempts to expose full records, expose secrets, make a public unrestricted diagnostic endpoint, change schema/RLS/grants/migrations, or patch /cases helper logic before deployed authority availability is proven.

## Next Action

Proceed to v0.9-4S: inspect existing rehearsal/probe routes and implement the smallest protected deployed authority availability probe only if needed.
