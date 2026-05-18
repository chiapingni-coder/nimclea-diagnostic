# Nimclea AAC21 Cases Backend Adapter Alignment Implementation Smoke Record v0.1

## Status

FAIL

## Purpose

- Implement the minimal backend-only alignment selected by AAC19/AAC20 for the `cases` authority write path.
- Run one controlled `cases` write/read-back smoke after the adapter change.

## Source Evidence from AAC18 / AAC19 / AAC20

- AAC18 controlled backend `cases` write/read-back smoke failed.
- Sanitized AAC18 error: `Could not find the 'authority_source' column of 'cases' in the schema cache`
- AAC19 classified the failure as a backend adapter/schema contract mismatch and selected Option B.
- AAC20 recorded the candidate to remove or quarantine `authority_source` from the backend `cases` write payload.

## Runtime Change Summary

- Backend-only runtime change applied to `backend/utils/supabaseCoreAuthorityStore.js`.
- The `cases` write payload no longer includes `authority_source` as a direct insert field.
- No frontend code was changed.
- No Supabase migration was changed.

## Files Changed

- `backend/utils/supabaseCoreAuthorityStore.js`
- `docs/NIMCLEA_AAC21_CASES_BACKEND_ADAPTER_ALIGNMENT_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
- `scripts/check-release-gate.mjs`

## Backend Adapter Path Changed

- File: `backend/utils/supabaseCoreAuthorityStore.js`
- Function: `upsertCaseRecord(...)`

## Exact Field Alignment Made

- Removed `authority_source` from the direct `cases` insert payload.
- The write path now targets the canonical `cases` table without that field.

## Controlled Smoke Setup

- backend `.env` was loaded locally
- backend core authority was enabled
- test `case_id`: `00000000-0000-4000-8000-000000000021`
- marker email: `smoke+aac21-case-record@nimclea.test`
- customer_id used for the smoke: `00000000-0000-4000-8000-000000000023`
- test status/source/payload were set to identify AAC21

## Smoke Result

- write returned without error: no
- write error: `Could not find the 'case_metadata' column of 'cases' in the schema cache`
- read-back returned exactly one matching row: no
- no authority_source field was required by the attempted write path
- no frontend direct-write path was used
- no Supabase migration was required

## Written / Read-back Case ID

- written case_id: none

## Read-back Confirmation

- read-back was not reached because the write failed
- no matching row was confirmed

## Non-Claims

- AAC21 does not modify frontend code.
- AAC21 does not modify Supabase migrations.
- AAC21 does not change RLS or production permissions.
- AAC21 does not include payment, receipt export, verification, or Supabase Storage.
- AAC21 does not claim full production payment/receipt readiness.
- AAC21 does not replace future production payment/receipt smokes.

## Next Step

- AAC21 records the failure and stops.
- A further adapter/schema review is required before any additional `cases` smoke attempt.

