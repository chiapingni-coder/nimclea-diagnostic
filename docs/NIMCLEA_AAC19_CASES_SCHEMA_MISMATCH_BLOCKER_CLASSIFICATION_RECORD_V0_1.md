# Nimclea AAC19 Cases Schema Mismatch Blocker Classification Record v0.1

## Status

BLOCKER CLASSIFIED

## Purpose

- Record the AAC18 cases write/read-back failure.
- Classify the blocker before any runtime fix.
- Prevent jumping directly to code or migration changes without a contract direction.

## Source Evidence

- AAC17 case_events write/read-back PASS.
- AAC18 cases write/read-back FAIL.
- Sanitized AAC18 error: `Could not find the 'authority_source' column of 'cases' in the schema cache`
- Written/read-back case_id: none.

## Blocker Classification

- Blocker type: backend adapter/schema contract mismatch.
- Affected table: `cases`.
- Affected path: backend-controlled cases authority write path, likely through `upsertCaseRecord(...)` or an equivalent backend adapter.
- Symptom: backend payload or adapter still expects/writes `authority_source`, while the canonical Supabase `cases` schema does not expose that column.

## Relationship to Prior Blocker

- This is similar in class to the earlier `case_events` `authority_source` mismatch discovered by AAC11/AAC12.
- The `case_events` mismatch was closed by AAC16 and validated by AAC17.
- AAC19 does not reopen the `case_events` blocker.
- AAC19 opens/classifies a separate `cases` write-path blocker.

## Contract Direction Decision

Option B selected:

Align the backend `cases` adapter payload to the current canonical `cases` schema.

Meaning:

- Do not add `authority_source` to the `cases` table at this step.
- Do not create a Supabase migration for this blocker at this step.
- Remove, map, or quarantine `authority_source` in the backend `cases` write adapter so the write payload matches the canonical `cases` schema.
- Preserve audit/source semantics only through existing canonical fields or future separately approved schema work.

## Non-Claims

- AAC19 does not fix the blocker.
- AAC19 does not change runtime code.
- AAC19 does not change frontend code.
- AAC19 does not change Supabase migrations.
- AAC19 does not change RLS or production permissions.
- AAC19 does not include payment, receipt export, verification, or Supabase Storage.
- AAC19 does not claim full Supabase positive write path confidence.

## Next Step

- AAC20 should be a backend adapter alignment candidate for the `cases` write path.
- AAC20 should inspect the current `upsertCaseRecord(...)` contract and propose the minimal adapter change.
- Runtime implementation should happen only after the candidate is recorded and protected.

