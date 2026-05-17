# Nimclea AAC-04 Fixture-Only Case Events Rehearsal Endpoint Candidate Record v0.1

## Purpose

AAC-04 defines a candidate backend-only rehearsal endpoint for inserting fixture `case_events`.

The endpoint candidate must remain fixture-only.

AAC-04 preserves the AAC backend-only write boundary and avoids production customer data, receipts, payments, verification, and frontend wiring.

This document is a candidate record only. It does not change runtime behavior.

## Background

AAC-01 defined the backend-only write boundary.

AAC-02 selected `case_events` as the first controlled write candidate.

AAC-03 confirmed `insertCaseEvent` exists and is exported from `backend/utils/supabaseCoreAuthorityStore.js`.

AAC-03 found no frontend Supabase write path.

## Candidate Endpoint Boundary

The endpoint is a candidate only:

- Method: `POST`
- Candidate path: `/rehearsal/case-events` or `/internal/rehearsal/case-events`
- Backend-only route handler
- No frontend page should call it
- No customer-facing UI should expose it
- Actual Supabase write must go through `insertCaseEvent` from `backend/utils/supabaseCoreAuthorityStore.js`
- No inline Supabase write inside the route

## Fixture-Only Constraints

The candidate endpoint must:

- accept only fixture or test case ids
- accept only smoke or test actor emails such as `nimclea.test`
- accept only rehearsal event types
- mark the event as rehearsal or test data in `eventPayload` or an equivalent field
- reject production-looking emails
- reject receipt, payment, verification, or customer-facing event types
- avoid migrating Render or local JSON data
- avoid writing real customer records

## Minimal Request Shape Candidate

A minimal request body candidate should include:

- `caseId`
- `eventType`
- `actorEmail`
- `eventPayload`
- `rehearsalKey` or rehearsal flag

`eventPayload` should remain small and non-sensitive.

## Guardrails

The endpoint should be disabled or unavailable in production unless an explicit backend-only rehearsal flag is enabled.

The endpoint must not be reachable from frontend navigation.

The endpoint must not be used for receipts, payments, verification, customer records, or production migration.

The endpoint implementation must be small enough to inspect in one review pass.

The endpoint must return a clear success or failure response without exposing secrets.

## Acceptance Criteria

A reviewer should be able to identify:

- the candidate endpoint boundary
- the fixture-only restrictions
- that `insertCaseEvent` remains the only allowed write adapter
- forbidden data types and forbidden write paths

This document must not change runtime behavior.

This document must not open an endpoint.

## Stop Line

Stop if any of the following is introduced:

- frontend wiring
- production customer data
- direct route writes to Supabase without `insertCaseEvent`
- receipts, payments, verification, or customer-facing production records
- a combined step that mixes migration, endpoint implementation, and production smoke
- `service_role` exposure outside backend

## Next Step After AAC-04

AAC-05 may implement the smallest backend-only fixture rehearsal endpoint.

AAC-05 must remain fixture-only.

AAC-05 must use `insertCaseEvent`.

AAC-05 must include a runtime smoke using only fixture or test data.

AAC-05 must not add frontend wiring.
