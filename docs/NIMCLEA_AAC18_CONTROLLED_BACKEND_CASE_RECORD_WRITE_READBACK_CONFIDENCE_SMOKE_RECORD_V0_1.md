# Nimclea AAC18 Controlled Backend Case Record Write/Read-Back Confidence Smoke Record v0.1

## Status

FAIL

## Date / Time

2026-05-17T20:13:13.3957052-07:00

## Smoke Purpose

Record one controlled backend-only Supabase write/read-back smoke for the canonical `cases` authority table after AAC17 confirmed `case_events` backend write/read-back confidence.

## Backend Adapter Used

`upsertCaseRecord(...)` from `backend/utils/supabaseCoreAuthorityStore.js`

## Supabase Table Used

`cases`

## Target Environment

Sanitized target details:

- Supabase project ref: `rlbquzefqfnvpgyjaags`
- backend environment was loaded from `backend/.env` locally for the smoke
- secrets are not recorded

## Test Input

- `case_id`: `00000000-0000-4000-8000-000000000018`
- `user_email`: `smoke+aac18-case-record@nimclea.test`
- `customer_id`: `00000000-0000-4000-8000-000000000023`
- `case_title`: `AAC18 controlled backend case record smoke`
- `status`: `diagnostic_completed`
- `stage`: `diagnostic_completed`
- diagnostic and result payloads included AAC18 smoke markers and a timestamp
- `authority_source` was not intended for the canonical `cases` table write target

## Write Result

- write succeeded: no
- persisted identifier: none
- sanitized error: `Could not find the 'authority_source' column of 'cases' in the schema cache`

## Read-back Result

- read-back succeeded: no
- read-back was not reached because the write failed
- matching row count: none

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
- change to RLS or production permissions

## Final Result

AAC18 result:

FAIL.

The controlled backend case record write/read-back confidence smoke failed because the current backend `cases` write path still attempts to write `authority_source`, while the target schema does not expose that column.

## Next Action

Record the case schema/backend contract mismatch as the next blocker-resolution step before any further case-record smoke attempt.

