# Nimclea AAC24 Cases case_metadata Backend Adapter Alignment Implementation Smoke Record v0.1

## Status

PASS

## Purpose

- Implement the minimal backend-only alignment selected by AAC22/AAC23 for the cases `case_metadata` write-path mismatch.
- Run one controlled `cases` write/read-back smoke after the adapter change.

## Source Evidence from AAC21 / AAC22 / AAC23

- AAC21 controlled cases write/read-back failed after the `authority_source` alignment attempt.
- Sanitized AAC21 error: `Could not find the 'case_metadata' column of 'cases' in the schema cache`
- AAC22 classified this as a separate cases backend adapter/schema mismatch and selected Option B.
- AAC23 recorded the candidate to remove or quarantine `case_metadata` from the backend cases write payload.

## Runtime Change Summary

- Backend-only runtime change applied to `backend/utils/supabaseCoreAuthorityStore.js`.
- The `cases` write payload now uses canonical `cases` columns and no longer sends `case_metadata` as a direct insert field.
- No frontend code was changed.
- No Supabase migration was changed.

## Files Changed

- `backend/utils/supabaseCoreAuthorityStore.js`
- `docs/NIMCLEA_AAC24_CASES_CASE_METADATA_BACKEND_ADAPTER_ALIGNMENT_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
- `scripts/check-release-gate.mjs`

## Backend Adapter Path Changed

- File: `backend/utils/supabaseCoreAuthorityStore.js`
- Function: `upsertCaseRecord(...)`

## Exact Field Alignment Made

- Removed `case_metadata` from the direct `cases` insert payload.
- Preserved the backend `cases` adapter shape using canonical columns:
  - `case_id`
  - `customer_id`
  - `case_status`
  - `case_type`
  - `lifecycle_stage`
  - `source`
  - `case_schema`
  - `metadata`
  - `created_at`
  - `updated_at`
- `caseSchema` / `metadata` now carry the controlled AAC24 smoke markers instead of using `case_metadata`.

## Controlled Smoke Setup

- backend `.env` was loaded locally
- backend core authority was enabled
- test `case_id`: `00000000-0000-4000-8000-000000000024`
- marker email: `smoke+aac24-case-record@nimclea.test`
- customer_id used for the smoke: `00000000-0000-4000-8000-000000000023`
- marker/status/source/payload clearly identified AAC24
- no `authority_source` field was included in the `cases` DB write payload
- no `case_metadata` field was included in the `cases` DB write payload

## Smoke Result

- write returned without error: yes
- persisted identifier: `00000000-0000-4000-8000-000000000024`
- read-back returned exactly one matching row: yes
- no `authority_source` field was required by the `cases` write path
- no `case_metadata` field was required by the `cases` write path
- no frontend direct-write path was used
- no Supabase migration was required

## Written / Read-back Case ID

- written case_id: `00000000-0000-4000-8000-000000000024`

## Read-back Confirmation

- read-back method: direct `cases` lookup by `case_id`
- matching row count: `1`
- matching `case_id`: `00000000-0000-4000-8000-000000000024`
- matching `case_status`: `diagnostic_completed`
- matching `case_type`: `aac24_case_record_smoke`
- matching `lifecycle_stage`: `diagnostic_completed`
- matching `source`: `aac24_case_record_smoke`
- matching `metadata.aac`: `AAC24`
- matching `case_schema.aac`: `AAC24`

## Non-Claims

- AAC24 does not modify frontend code.
- AAC24 does not modify Supabase migrations.
- AAC24 does not change RLS or production permissions.
- AAC24 does not include payment, receipt export, verification, or Supabase Storage.
- AAC24 does not claim full production payment/receipt readiness.
- AAC24 does not replace future production payment/receipt smokes.
- AAC24 does not change `case_events`, receipt, payment, verification, trial, or storage logic.

## Next Step

- AAC24 proves the cases adapter alignment candidate and controlled smoke path.
- Create the next dedicated cases traceability or blocker-closure record only if a new scope needs to be recorded.

