# Nimclea AAC-06 Positive Write Smoke Target Resolution Plan v0.1

## Current Baseline

- AAC-05C is protected in the release gate.
- Release check passed with `PASS 102 / WARN 5 / FAIL 0`.
- GitHub push completed.
- Render alive check passed.
- No v0.9 work is included.

## Decision

Positive write smoke must not target production customer data.

It must use fixture-only or rehearsal-only `case_event` data.

The write path must remain backend-only.

Frontend behavior must not change.

No payment, receipt, verification, or customer-facing route should be modified.

## Proposed Next Safe Target

Use the existing rehearsal endpoint only if rehearsal endpoints are explicitly enabled.

Use a controlled fixture case ID.

Write one minimal `case_event` row only.

Verify by reading back the event through the backend authority path.

Stop if env, fixture, or endpoint exposure is not confirmed.

## Stop Lines

Stop if any of the following is true:

- Render rehearsal endpoint is exposed unexpectedly
- target case ID is not confirmed fixture-only
- Supabase env is unclear
- any frontend or customer path change is required

## Final Boundary

This plan does not change runtime code.

This plan only resolves the target selection for the positive write smoke rehearsal.
