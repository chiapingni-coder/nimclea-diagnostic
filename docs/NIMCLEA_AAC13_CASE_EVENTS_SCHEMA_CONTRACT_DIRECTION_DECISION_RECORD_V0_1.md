# Nimclea AAC13 Case Events Schema Contract Direction Decision Record v0.1

## Status

DECISION RECORDED.

## Background

AAC11 attempted a backend-controlled positive write confidence pass through `insertCaseEvent(...)`.

AAC11 failed because the target `case_events` table does not contain `authority_source`.

AAC12 classified the failure as a schema / backend contract mismatch.

AAC13 decides the contract direction before any migration or backend runtime change is made.

## Evidence Reviewed

Reviewed sanitized evidence:

- AAC11 execution record
- AAC12 blocker classification record
- `backend/utils/supabaseCoreAuthorityStore.js`
- `supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql`
- `supabase/migrations/001_nimclea_clean_authority_base.sql`
- `supabase/migrations/002_nimclea_clean_authority_service_role_grants.sql`
- prior clean authority docs that reference the clean authority schema boundaries

## Contract Question

Should `authority_source` be part of the canonical `case_events` authority schema, or should backend `insertCaseEvent(...)` stop sending it?

## Decision

### Selected Direction: Option B

Backend `insertCaseEvent(...)` should be aligned to the current canonical schema by removing or mapping `authority_source` through a future backend adapter change.

## Rationale

The reviewed clean-authority migrations define `public.case_events` with a `source` column, not `authority_source`.

The backend authority store currently adds `authority_source` to the `case_events` payload, which caused the AAC11 schema error.

Because the inspected canonical schema already contains `source`, the safer and more consistent decision is to align the backend payload to the existing canonical schema rather than inventing a new schema column in AAC13.

Option A is less appropriate because it would introduce a new column into the schema without evidence that `authority_source` belongs to the current canonical clean authority contract.

Option C is unnecessary because the reviewed migrations are sufficient to decide that `source` is the current field shape for `case_events`.

## Non-Changes

AAC13 does not:

- alter Supabase schema
- create a migration
- change backend runtime code
- change frontend runtime code
- close the AAC09 blocker
- convert AAC11 from FAIL to PASS
- claim payment readiness
- include Supabase Storage

## Stop Lines

Do not proceed to implementation if:

- the migration target is not confirmed
- backend write boundary is bypassed
- RLS, grants, or policy posture is not reviewed
- write success is not re-tested through `insertCaseEvent(...)`
- read-back evidence is missing
- frontend bypass or fake activated state is used
- rehearsal-only production exposure is introduced

## Next Action

Create AAC14 backend adapter alignment candidate for removing or mapping `authority_source`.

AAC14 should implement the schema contract direction chosen here.

## Final Result

AAC13 result:

DECISION RECORDED.

AAC12 blocker remains OPEN until implementation and re-test.
AAC11 remains FAIL.
AAC09 blocker remains OPEN.

No runtime code changes.
