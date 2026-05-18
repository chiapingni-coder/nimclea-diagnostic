# Nimclea AAC23 Cases case_metadata Backend Adapter Alignment Candidate Record v0.1

## Status

CANDIDATE RECORDED

## Purpose

- Define the minimal backend adapter alignment candidate for the cases `case_metadata` write-path mismatch.
- Prepare for a future runtime implementation step.
- Avoid jumping directly from blocker classification to code without a protected candidate.

## Source Evidence

- AAC21 controlled cases write/read-back failed after the `authority_source` alignment attempt.
- Sanitized AAC21 error: `Could not find the 'case_metadata' column of 'cases' in the schema cache`
- AAC22 classified this as a separate cases backend adapter/schema mismatch.
- AAC22 selected Option B: align backend cases adapter payload to canonical `cases` schema.

## Affected Path

- File inspected: `backend/utils/supabaseCoreAuthorityStore.js`
- Function/path inspected: `upsertCaseRecord(...)` or current cases authority write adapter
- Affected table: `cases`
- Affected field: `case_metadata`

## Candidate Direction

Minimal adapter alignment candidate:

- Remove `case_metadata` from the `cases` write payload when writing to the canonical `cases` table.
- Do not require `case_metadata` for `cases` writes.
- Do not add `case_metadata` to the Supabase `cases` schema in this step.
- Preserve metadata semantics only through existing canonical fields or future separately approved schema work.
- Keep the change backend-only.
- Keep frontend behavior unchanged.
- Keep `case_events` unchanged, since AAC17 already validated that path.

## Candidate Implementation Boundary

The future implementation step should:

- update only the backend `cases` write adapter payload construction
- avoid changing read behavior unless strictly necessary
- avoid broad schema normalization work
- avoid changing `case_events`
- avoid changing receipt, payment, verification, trial, or storage logic
- include a controlled `cases` write/read-back smoke after implementation
- stop and document a new `FAIL` if another schema mismatch appears

## Non-Claims

- AAC23 does not fix the blocker.
- AAC23 does not change runtime code.
- AAC23 does not change frontend code.
- AAC23 does not change Supabase migrations.
- AAC23 does not change RLS or production permissions.
- AAC23 does not run a new write smoke.
- AAC23 does not include payment, receipt export, verification, or Supabase Storage.
- AAC23 does not claim full Supabase positive write path confidence.

## Next Step

- AAC24 should be the cases `case_metadata` backend adapter alignment implementation smoke.
- AAC24 should make the minimal backend-only code change and then run a controlled `cases` write/read-back smoke.
- AAC24 should stop and document `FAIL` if any new schema mismatch appears.

