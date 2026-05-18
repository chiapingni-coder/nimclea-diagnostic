# Nimclea AAC22 Cases case_metadata Schema Mismatch Blocker Classification Record v0.1

## Status

BLOCKER CLASSIFIED

## Purpose

- Record the AAC21 cases write/read-back failure.
- Classify the newly exposed `case_metadata` blocker before any further runtime fix.
- Prevent chasing additional fields inside AAC21.
- Preserve the staged AAC workflow: classification → candidate → implementation → controlled smoke.

## Source Evidence

- AAC18 exposed the cases `authority_source` mismatch.
- AAC19 selected Option B for cases adapter/schema alignment.
- AAC20 recorded the cases backend adapter alignment candidate.
- AAC21 changed `backend/utils/supabaseCoreAuthorityStore.js` and attempted controlled backend cases write/read-back.
- AAC21 smoke failed with: `Could not find the 'case_metadata' column of 'cases' in the schema cache`
- Written/read-back case_id: none.

## Blocker Classification

- Blocker type: backend adapter/schema contract mismatch.
- Affected table: `cases`.
- Affected backend path: backend-controlled cases authority write path, likely `upsertCaseRecord(...)` in `backend/utils/supabaseCoreAuthorityStore.js`.
- Affected field: `case_metadata`.
- Symptom: backend cases write payload still includes or expects `case_metadata`, while the canonical Supabase `cases` schema does not expose that column.

## Relationship to Prior Blocker

- AAC22 does not reopen the `authority_source` blocker.
- AAC21 appears to have advanced past `authority_source` far enough to expose `case_metadata`.
- AAC22 classifies a separate next-layer cases payload/schema mismatch.
- AAC22 does not modify the AAC21 implementation.

## Contract Direction Decision

Option B selected:

Align the backend cases adapter payload to the current canonical `cases` schema.

Meaning:

- Do not add `case_metadata` to the `cases` table at this step.
- Do not create a Supabase migration for this blocker at this step.
- Remove, map, or quarantine `case_metadata` in the backend cases write adapter so the write payload matches the canonical `cases` schema.
- Preserve metadata semantics only through existing canonical fields or future separately approved schema work.
- Keep the future change backend-only.
- Keep frontend behavior unchanged.

## Non-Claims

- AAC22 does not fix the blocker.
- AAC22 does not change runtime code.
- AAC22 does not change frontend code.
- AAC22 does not change Supabase migrations.
- AAC22 does not change RLS or production permissions.
- AAC22 does not run a new write smoke.
- AAC22 does not include payment, receipt export, verification, or Supabase Storage.
- AAC22 does not claim full Supabase positive write path confidence.

## Next Step

- AAC23 should be the cases `case_metadata` backend adapter alignment candidate.
- AAC23 should inspect `upsertCaseRecord(...)` and propose the minimal backend-only payload alignment.
- Runtime implementation should happen only after the candidate is recorded and protected.
- The next implementation smoke should stop again if another schema mismatch appears.

