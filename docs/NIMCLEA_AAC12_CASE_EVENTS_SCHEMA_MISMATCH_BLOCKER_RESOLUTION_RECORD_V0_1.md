# Nimclea AAC12 Case Events Schema Mismatch Blocker Resolution Record v0.1

## Status

BLOCKER CLASSIFIED.

AAC12 does not resolve the blocker by itself.
AAC12 records the root cause, impact, acceptable resolution paths, and next action boundary.

## Background

AAC11 attempted a controlled positive write confidence pass through the backend-controlled authority path.

The attempted path used `insertCaseEvent(...)` from `backend/utils/supabaseCoreAuthorityStore.js`.

AAC11 failed because the backend write payload includes `authority_source`, while the current target `case_events` schema does not provide that column.

## Observed Failure

Sanitized failure:

- attempted backend function: `insertCaseEvent(...)`
- target table: `case_events`
- missing column at runtime: `authority_source`
- execution result: `FAIL`
- source record: AAC11

Do not include secrets.

## Root Cause Classification

Schema / backend contract mismatch.

The backend authority store expects a `case_events` payload shape that the current target database does not provide as written.

## Impact

This blocker prevents AAC11 from proving controlled positive write confidence.

It does not invalidate:

- AAC08 controlled execution PASS
- AAC09 blocker follow-up record
- AAC10 resolution plan
- release automation v0.8
- Render alive status

It does prevent:

- closing the AAC09 positive write confidence blocker
- claiming launch-grade positive write confidence
- treating `case_events` backend writes as fully aligned with the current schema contract

## Resolution Options

### Option A: Align Supabase schema to backend authority contract

Add `authority_source` to `case_events` through a controlled migration candidate.

This option is appropriate only if `authority_source` is part of the intended canonical clean authority event schema.

Future migration must follow the current Nimclea Supabase safety rules:

- explicit target confirmation
- no broad anon write access
- RLS remains enabled
- policies remain intentional
- backend service role remains the write boundary
- isolated rehearsal before treating as resolved

### Option B: Align backend write payload to existing schema

Change `insertCaseEvent(...)` to stop sending `authority_source` or map it to an existing field such as `source`.

This option is appropriate if `authority_source` is not part of the intended canonical schema.

It requires a backend contract review before runtime code changes.

### Option C: Compatibility adapter

Introduce a controlled compatibility layer only if schema drift must be supported temporarily.

This option should be treated as less preferred unless there is a strong reason to support multiple schema generations.

## Preferred Direction

Do not guess.

The inspected clean-authority migration defines `public.case_events` with a `source` column, not `authority_source`.

Because of that, the preferred direction for the current target is Option B: align the backend write payload to the existing canonical schema, unless a later schema decision explicitly introduces `authority_source`.

If a later clean-authority decision requires `authority_source` as canonical, then Option A becomes the correct path.

If that decision is not yet finalized, AAC13 should make the schema contract decision before any migration or runtime change.

## Stop Lines

Do not mark this blocker resolved if:

- `authority_source` is added manually outside a controlled migration record
- backend is changed without confirming canonical schema
- write success is not re-tested through `insertCaseEvent(...)`
- read-back evidence is missing
- frontend bypass or fake activated state is used
- rehearsal-only production exposure is introduced
- Supabase Storage is included or implied
- payment readiness is over-claimed

## Required Future Proof

To close this blocker later, a future record must show:

1. canonical `case_events` schema decision
2. controlled migration candidate or backend adapter candidate
3. isolated or controlled rehearsal
4. successful `insertCaseEvent(...)` write
5. successful read-back of the persisted event
6. no frontend bypass
7. no fake activated state
8. no rehearsal-only production exposure

## Final Result

AAC12 result:

BLOCKER CLASSIFIED.

AAC11 remains FAIL.

AAC09 blocker remains OPEN.

AAC12 defines the acceptable resolution paths for the missing schema contract alignment.

## Next Action

Create AAC13 as a schema contract decision or migration candidate record.

AAC13 should decide whether to align the Supabase `case_events` schema to the backend authority contract, or align the backend authority payload to the current canonical schema.

No runtime code changes.
No Supabase migration changes in AAC12.
