# Nimclea AAC-05 Fixture-Only Case Events Rehearsal Endpoint Implementation Record v0.1

## Purpose

AAC-05 implements the smallest backend-only fixture rehearsal endpoint for inserting fixture `case_events`.

The endpoint remains fixture-only and preserves the AAC backend-only write boundary.

This record documents the implementation boundary and does not add frontend wiring.

## Files Changed

- `backend/index.js`
- `scripts/check-aac05-fixture-case-events-rehearsal-endpoint.mjs`
- `docs/NIMCLEA_AAC05_FIXTURE_ONLY_CASE_EVENTS_REHEARSAL_ENDPOINT_IMPLEMENTATION_RECORD_V0_1.md`

## Endpoint Boundary

Implemented endpoint:

- `POST /internal/rehearsal/case-events`

The endpoint is backend-only and is disabled unless the backend env flag is enabled.

The endpoint returns `404` when rehearsal endpoints are disabled.

## Fixture-Only Constraints

The endpoint only accepts:

- fixture or test case ids
- smoke or test actor emails ending in `@nimclea.test`
- rehearsal event types beginning with `rehearsal.` or exactly `rehearsal.case_event_fixture`

The endpoint forces rehearsal markers into the payload and rejects production-looking input.

The endpoint does not touch receipts, payments, verification, or customer production records.

## Store / Adapter Path Used

The write path goes through:

- `insertCaseEvent(...)` from `backend/utils/supabaseCoreAuthorityStore.js`

No inline Supabase write was introduced in the endpoint handler.

## Validation Run

Validation was run with:

- `git diff --check`
- `.\scripts\release-check.ps1`

The release check completed successfully and reported the existing manual-only WARN areas.

## Frontend Boundary

No frontend files were changed.

No frontend navigation, button, or call path was added.

## Migration Boundary

No Supabase migrations were changed.

## Receipt / Payment / Verification Boundary

Receipts were not touched.

Payments were not touched.

Verification was not touched.

## Stop Line

Stop if any future change:

- introduces frontend wiring
- writes directly to Supabase outside `insertCaseEvent`
- uses real customer data
- touches receipts, payments, or verification records
- bundles migration, endpoint implementation, and production smoke into one step
- exposes `service_role` outside backend

## Final Status

PASS / FIXTURE-ONLY REHEARSAL ENDPOINT IMPLEMENTED

## Next Step

Run the smoke script only in a backend environment where `NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS=true` is set and the backend is intentionally pointed at the approved rehearsal target.

The smoke script is:

`scripts/check-aac05-fixture-case-events-rehearsal-endpoint.mjs`
