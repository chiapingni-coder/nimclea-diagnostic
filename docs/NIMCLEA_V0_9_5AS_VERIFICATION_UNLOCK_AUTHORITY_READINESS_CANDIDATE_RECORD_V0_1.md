# NIMCLEA v0.9-5AS VERIFICATION UNLOCK AUTHORITY READINESS CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5AS_VERIFICATION_UNLOCK_AUTHORITY_READINESS_CANDIDATE_RECORD_V0_1

## Date

2026-05-19

## Purpose

This record selects the next narrow authority-readiness candidate after v0.9-5AR closed the deployed receipt read-path route surface for controlled draft and paid receipt fixtures.

The selected candidate is verification unlock authority readiness.

The core question for the next scope is whether Nimclea can use canonical paid receipt authority evidence as the basis for verification access gating.

## Scope

- Area: Verification unlock authority readiness.
- Files inspected: none in this candidate record.
- Files changed: documentation only.
- Runtime behavior affected: none.
- Supabase Storage included: no.

## Current State

v0.9-5AR confirmed deployed GET /receipt/:receiptId can read both controlled receipt authority fixtures.

Confirmed receipt authority fixtures:

- draft receipt: 00000000-0000-4000-8000-000000000031
- paid receipt: 00000000-0000-4000-8000-000000000040
- fixture case_id: 00000000-0000-4000-8000-000000000024
- fixture customer_id: 00000000-0000-4000-8000-000000000023

The paid fixture receipt has receipt_status paid and payment_id 00000000-0000-4000-8000-000000000040.

## Candidate Decision

Select verification unlock authority readiness as the next narrow work item.

The next scope should inspect whether the current verification entry, route, and UI gating logic can be anchored to canonical paid receipt authority rather than local or visual-only state.

## Candidate Target

The next implementation or inspection path should remain narrow and should focus on the chain:

paid receipt authority -> receipt read path -> verification unlock eligibility

Candidate target surfaces for inspection:

- frontend/pages/ReceiptPage.jsx
- frontend/pages/VerificationPage.jsx
- deployed GET /receipt/:receiptId behavior
- backend receipt authority helper behavior
- any existing verification route or unlock guard

## Acceptance Criteria For Next Scope

The next scope should prove or classify:

- whether paid receipt authority can be read for the fixture case
- whether verification unlock currently depends on canonical receipt authority, local state, or visual-only status
- whether draft receipt remains not eligible for verification unlock
- whether paid receipt can become eligible for verification unlock without weakening backend authority boundaries
- whether a route, helper, or frontend gating gap must be classified before implementation

## Not In Scope

This candidate does not include:

- runtime code changes
- frontend behavior changes
- Supabase migration
- RLS or permission changes
- payment provider integration
- payment webhook integration
- PDF export readiness
- Supabase Storage
- arbitrary customer verification unlock
- production launch readiness

## Risk / Stop Line

Do not convert paid receipt read success into verification readiness without a separate authority-gating proof.

Do not unlock verification based only on frontend localStorage, visual receipt state, or non-authoritative payment display.

Any implementation must remain backend-authority aligned and fixture-scoped until a separate closure record proves broader readiness.

## Next Action

Proceed to v0.9-5AT verification unlock authority readiness inspection / smoke target selection.

The recommended next step is inspection-only: identify the current verification unlock path and classify whether it already has an authority anchor or needs a narrow route/helper alignment candidate.
