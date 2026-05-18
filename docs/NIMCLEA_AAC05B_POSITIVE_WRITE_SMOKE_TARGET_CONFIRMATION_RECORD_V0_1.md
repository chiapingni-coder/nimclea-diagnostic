# Nimclea AAC-05B Positive Write Smoke Target Confirmation Record v0.1

## Purpose

AAC-05B confirms where the positive AAC-05 `case_events` fixture write smoke may be run.

The goal is to prevent accidental production Render write exposure and keep the write test backend-only, fixture-only, and `case_events`-only.

This document does not change runtime behavior.

## Current Known Status

- Render root check passed.
- Production Render negative exposure check returned HTTP `404` for `POST /internal/rehearsal/case-events`.
- AAC-05A records that production Render does not expose the rehearsal write endpoint without the explicit rehearsal flag.

## Positive Smoke Target Rule

Positive write smoke may only run against an approved rehearsal backend or environment.

`NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true` must not be enabled on production Render unless explicitly approved for a controlled rehearsal.

The target Supabase project must be confirmed as rehearsal, throwaway, or approved test authority before running the smoke.

## Required Preflight Before Positive Smoke

Before positive smoke:

- confirm backend URL
- confirm env flag `NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true` only on the approved rehearsal target
- confirm Supabase target is not production customer authority
- confirm payload uses only a fixture or test case id
- confirm `actorEmail` ends with `@nimclea.test`
- confirm `eventType` is rehearsal-only
- confirm no receipts, payments, verification, or customer records are touched

## Stop Line

Stop if any of the following is true:

- target backend is production Render without explicit rehearsal approval
- Supabase target is ambiguous
- `actorEmail` is not `@nimclea.test`
- payload includes customer, receipt, payment, or verification data
- frontend is involved

## Final Status

Positive smoke is not yet run.

Approved target must be confirmed first.

## Next Step

AAC-05C may run the positive fixture write smoke only after target confirmation.
