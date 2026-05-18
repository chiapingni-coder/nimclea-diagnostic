# Nimclea AAC20 Cases Backend Adapter Alignment Candidate Record v0.1

## Status

CANDIDATE RECORDED

## Purpose

- Define the minimal backend adapter alignment candidate for the `cases` write path.
- Prepare for a future runtime implementation step.
- Avoid jumping directly from blocker classification to code without a protected candidate.

## Source Evidence

- AAC18 failed on `cases` write/read-back.
- Sanitized AAC18 error: `Could not find the 'authority_source' column of 'cases' in the schema cache`
- AAC19 selected Option B: align backend `cases` adapter payload to canonical `cases` schema.

## Affected Path

- File inspected: `backend/utils/supabaseCoreAuthorityStore.js`
- Function/path inspected: `upsertCaseRecord(...)` or current `cases` authority write adapter
- Affected table: `cases`
- Affected field: `authority_source`

## Candidate Direction

Minimal adapter alignment candidate:

- Remove `authority_source` from the `cases` write payload when writing to the canonical `cases` table.
- Do not require `authority_source` for `cases` writes.
- Do not add `authority_source` to the Supabase `cases` schema in this step.
- Preserve `source`/audit semantics only through existing canonical fields or future separately approved schema work.
- Keep the change backend-only.
- Keep frontend behavior unchanged.

## Candidate Implementation Boundary

The future implementation step should:

- update only the backend `cases` write adapter payload construction
- avoid changing read behavior unless strictly necessary
- avoid broad schema normalization work
- avoid changing `case_events`, since AAC17 already validated that path
- avoid changing receipt, payment, verification, trial, or storage logic
- include a controlled `cases` write/read-back smoke after implementation

## Non-Claims

- AAC20 does not fix the blocker.
- AAC20 does not change runtime code.
- AAC20 does not change frontend code.
- AAC20 does not change Supabase migrations.
- AAC20 does not change RLS or production permissions.
- AAC20 does not include payment, receipt export, verification, or Supabase Storage.
- AAC20 does not claim full Supabase positive write path confidence.

## Next Step

- AAC21 should be the backend adapter alignment implementation record.
- AAC21 should make the minimal backend-only code change and then run a controlled `cases` write/read-back smoke.
- AAC21 should stop and document `FAIL` if any new schema mismatch appears.

