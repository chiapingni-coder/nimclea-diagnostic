# Nimclea AAC-05A Render Rehearsal Endpoint Negative Exposure Smoke Record v0.1

## Purpose

AAC-05A records the negative exposure smoke result for the AAC-05 rehearsal endpoint.

The goal is to confirm that production Render does not expose the rehearsal write endpoint unless the explicit rehearsal flag is enabled.

This record does not change runtime behavior.

## Endpoint Checked

- `POST /internal/rehearsal/case-events`

## Target

- `https://nimclea-api.onrender.com`

## Request Body

- `{}`

## Result

- HTTP `404`

## Interpretation

Production Render does not expose the rehearsal write endpoint without the explicit rehearsal flag.

No `case_events` write was attempted with a valid fixture payload.

## Safety Confirmation

- No customer data was touched.
- No receipt data was touched.
- No payment data was touched.
- No verification data was touched.
- Frontend was not involved.

## Stop Line

Do not enable `NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS` on production Render unless explicitly approved for rehearsal.

## Final Status

PASS

## Next Step

Only run positive write smoke against an approved rehearsal backend or environment.
