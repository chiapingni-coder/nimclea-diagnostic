# Nimclea AAC15 Backend Adapter Alignment Implementation Record v0.1

## Status

PASS

## Background

AAC11 failed because `insertCaseEvent(...)` attempted to write `authority_source` into `case_events`.
AAC12 classified the issue as a schema / backend contract mismatch.
AAC13 selected Option B: align backend `insertCaseEvent(...)` to the canonical `case_events` schema.
AAC14 recorded the backend adapter alignment candidate.
AAC15 implements the minimum backend adapter alignment and re-tests controlled write/read-back.

## Implementation Scope

AAC15 covers:

- minimum backend adapter payload alignment
- `insertCaseEvent(...)` schema-safe payload behavior
- controlled backend write re-test
- read-back confirmation
- audit record preservation

AAC15 does not cover:

- Supabase schema migration
- frontend runtime changes
- Stripe production payment readiness
- full payment unlock validation
- Supabase Storage readiness
- broad customer launch readiness
- full production data migration

## Files Changed

- `backend/utils/supabaseCoreAuthorityStore.js`
- `docs/NIMCLEA_AAC15_BACKEND_ADAPTER_ALIGNMENT_IMPLEMENTATION_RECORD_V0_1.md`
- `scripts/check-release-gate.mjs`

## Adapter Change

`insertCaseEvent(...)` no longer sends `authority_source` as a direct insert column to `case_events`.

The direct insert payload now aligns to the current canonical `case_events` schema by using the accepted fields:

- `case_id`
- `event_type`
- `actor_type`
- `actor_id`
- `source`
- `raw_event`
- `metadata`
- `occurred_at`
- `created_at`

`authority_source` is preserved only as nested audit context inside the inserted event payload structure, not as a direct database column.

## Target Environment

Sanitized target details:

- Supabase project ref: `rlbquzefqfnvpgyjaags`
- target table: `case_events`
- secrets are not recorded

## Controlled Input

Sanitized input summary:

- fixture case_id: `00000000-0000-4000-8000-000000000024`
- event_type: `aac15.backend_adapter_alignment_controlled_write`
- actor_type: `rehearsal`
- actor_email: `smoke+cases-existing-001@nimclea.test`
- rehearsal markers were included in the payload

## Write Result

- write succeeded: yes
- persisted identifier: `1d46092c-ae98-46a4-93d3-d2ae49938f35`
- timestamp: available in the persisted row, not copied here beyond audit summary
- sanitized error: none

## Read-back Result

- written record read back: yes
- method used: `getCaseEventsByCaseId(...)`
- matching identifier: `1d46092c-ae98-46a4-93d3-d2ae49938f35`
- matching event_type: `aac15.backend_adapter_alignment_controlled_write`
- sanitized result summary: the persisted `case_events` row was successfully returned from the authority store

## Stop-line Review

Confirmed:

- no frontend bypass was used
- no fake activated state was used
- no rehearsal-only production exposure was introduced
- Supabase Storage was not included
- payment readiness was not overclaimed
- no Supabase migration was applied
- no direct database schema alteration was made

## Release Check

- PASS count: 111
- WARN count: 5
- FAIL count: 0
- Final result: `WARN`

## Final Result

AAC15 result:

PASS.

The AAC12 schema/backend contract mismatch is resolved for the controlled `insertCaseEvent(...)` write path.

The AAC09 positive write confidence blocker may be considered resolved only for the controlled backend `case_events` write/read-back scope.

Do not claim full payment readiness.

## Next Action

Create AAC16 blocker closure scope record that explicitly states what is resolved and what remains non-claimed.

No runtime code changes in AAC15 beyond the minimum backend adapter alignment.
No Supabase migration changes in AAC15.
