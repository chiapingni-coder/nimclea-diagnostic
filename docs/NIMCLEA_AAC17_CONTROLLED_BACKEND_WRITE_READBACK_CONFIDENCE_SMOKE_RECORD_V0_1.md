# Nimclea AAC17 Controlled Backend Write/Read-Back Confidence Smoke Record v0.1

## Status

PASS

## Date / Time

2026-05-17T20:06:50.1802264-07:00

## Smoke Purpose

Record one controlled backend-only Supabase write/read-back smoke for `case_events` after AAC16 closed the `authority_source` schema mismatch blocker.

## Backend Adapter Used

`insertCaseEvent(...)` from `backend/utils/supabaseCoreAuthorityStore.js`

## Supabase Table Used

`case_events`

## Target Environment

Sanitized target details:

- Supabase project ref: `rlbquzefqfnvpgyjaags`
- backend environment was loaded from `backend/.env` locally for the smoke
- secrets are not recorded

## Test Input

- `case_id`: `00000000-0000-4000-8000-000000000024`
- `event_type`: `aac17.controlled_backend_write_readback_confidence_smoke`
- `actor_type`: `system`
- `actor_id`: `aac17@nimclea.internal`
- event payload included AAC17 smoke markers and a timestamp
- `authority_source` was not included in the write payload

## Write Result

- write succeeded: yes
- persisted identifier: `657ec5e7-60b4-4edc-b215-2b74836fce49`
- timestamp: recorded in the persisted row

## Read-back Result

- read-back succeeded: yes
- method used: direct `case_events` lookup by `case_event_id`
- matching row count: `1`
- matching `case_event_id`: `657ec5e7-60b4-4edc-b215-2b74836fce49`
- matching `case_id`: `00000000-0000-4000-8000-000000000024`
- matching `event_type`: `aac17.controlled_backend_write_readback_confidence_smoke`
- matching `actor_type`: `system`
- matching `actor_id`: `aac17@nimclea.internal`

## Boundary Confirmation

This smoke was backend-controlled only.

It does not include:

- frontend direct-write permission
- payment or receipt export validation
- verification validation
- Supabase Storage
- production payment readiness
- customer launch readiness
- replacement for future production payment or receipt smokes

## Final Result

AAC17 result:

PASS.

The controlled backend write/read-back confidence smoke completed successfully through the backend adapter path and was confirmed by read-back.

## Next Action

Create the next follow-up record only if a separate boundary or production-readiness claim needs to be recorded.

