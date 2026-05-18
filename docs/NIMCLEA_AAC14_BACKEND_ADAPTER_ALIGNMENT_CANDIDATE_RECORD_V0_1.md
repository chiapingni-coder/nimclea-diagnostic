# Nimclea AAC14 Backend Adapter Alignment Candidate Record v0.1

## Status

CANDIDATE RECORDED.

AAC14 does not implement the backend adapter change.
AAC14 does not close AAC09, AAC11, AAC12, or AAC13 follow-up blockers.
AAC14 defines the minimum backend adapter alignment candidate for later execution.

## Background

AAC11 failed during controlled positive write confidence execution because `insertCaseEvent(...)` attempted to write `authority_source` into `case_events`.

AAC12 classified the issue as a schema / backend contract mismatch.

AAC13 selected Option B:
align backend `insertCaseEvent(...)` to the current canonical `case_events` schema by removing or mapping `authority_source`.

AAC14 defines the candidate change required before another positive write confidence execution attempt.

## Evidence Reviewed

Reviewed sanitized evidence:

- AAC11 execution record
- AAC12 blocker classification record
- AAC13 contract direction decision record
- `backend/utils/supabaseCoreAuthorityStore.js`
- relevant Supabase migration files
- relevant clean authority schema docs

## Current Problem

Exact current mismatch:

- backend function: `insertCaseEvent(...)`
- target table: `case_events`
- problematic payload field: `authority_source`
- current database behavior: `case_events` rejects writes because `authority_source` is not part of the canonical target schema
- result observed in AAC11: `FAIL`

## Candidate Direction

Selected candidate:

Update `insertCaseEvent(...)` so that the Supabase insert payload only includes fields accepted by the current canonical `case_events` schema.

The preferred candidate is to remove `authority_source` from the direct insert payload unless a confirmed existing canonical field should receive that value.

Do not add `authority_source` to Supabase schema in this candidate.

## Candidate Patch Boundary

The future implementation should be limited to:

- `backend/utils/supabaseCoreAuthorityStore.js`
- `insertCaseEvent(...)` payload construction
- optional small helper for schema-safe event payload normalization if needed
- no frontend changes
- no Supabase migration changes
- no rehearsal endpoint exposure

## Candidate Behavior

After implementation, `insertCaseEvent(...)` should:

1. accept the existing caller input safely
2. preserve required event fields
3. omit or map `authority_source` according to canonical `case_events` schema
4. avoid writing unknown columns
5. continue using backend service-role authority boundary
6. return the persisted authority record or persisted identifier
7. allow read-back verification through the existing authority store path

## Non-Goals

AAC14 does not:

- implement the runtime change
- modify Supabase schema
- create a migration
- change RLS / grants / policies
- validate Stripe payment readiness
- validate frontend unlock behavior
- include Supabase Storage
- close AAC09 blocker
- convert AAC11 from FAIL to PASS

## Risk Review

Documented risks:

- silently dropping `authority_source` could lose useful audit context
- mapping `authority_source` to the wrong existing field could pollute canonical event semantics
- changing `insertCaseEvent(...)` without read-back re-test could create false confidence
- broad compatibility logic could hide schema drift instead of fixing it

## Stop Lines

Do not implement the candidate if:

- canonical `case_events` fields are still unclear
- the adapter change requires frontend bypass
- the adapter change requires fake activated state
- the adapter change expands production exposure
- the adapter change introduces rehearsal-only production endpoints
- write success will not be re-tested through `insertCaseEvent(...)`
- read-back evidence will not be captured
- Supabase Storage is included or implied
- payment readiness is over-claimed

## Required Future Validation

A later execution record must prove:

1. `insertCaseEvent(...)` no longer sends unknown columns to `case_events`
2. backend-controlled write succeeds
3. persisted authority identifier is captured
4. written event is read back successfully
5. no frontend bypass was used
6. no fake activated state was used
7. no rehearsal-only production exposure was introduced
8. Supabase Storage was not included
9. AAC09 blocker closure scope is explicitly stated if the proof passes

## Future Execution Candidate

The next suitable record may be:

AAC15 Backend Adapter Alignment Implementation Record

AAC15 may implement the minimum backend adapter change and then run a controlled write + read-back proof.

AAC15 must not claim full payment readiness unless payment-path proof is separately executed.

## Final Result

AAC14 result:

CANDIDATE RECORDED.

AAC09 blocker remains OPEN.
AAC11 remains FAIL.
AAC12 blocker remains OPEN until implementation and re-test.
AAC13 decision remains Option B.

AAC14 defines the backend adapter alignment candidate required before re-running positive write confidence proof.

## Next Action

Create AAC15 backend adapter alignment implementation record only after confirming the exact accepted `case_events` field list and the minimum `insertCaseEvent(...)` payload change.

No runtime code changes in AAC14.
No Supabase migration changes in AAC14.
