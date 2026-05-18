# Nimclea AAC15A Backend Adapter Fix Traceability Note v0.1

## Status

TRACEABILITY NOTE RECORDED.

AAC15A does not implement a runtime change.
AAC15A does not rewrite commit history.
AAC15A documents how the AAC15 backend adapter fix and AAC15 execution record are connected across commits.

## Background

AAC15 implemented the backend adapter alignment for `insertCaseEvent(...)`.

The intended AAC15 completion evidence includes:

- backend adapter runtime fix
- AAC15 implementation record
- release gate protection
- controlled write/read-back success
- release-check PASS with FAIL 0
- GitHub push and Render alive confirmation

After AAC15 push, commit inspection showed that the backend runtime file was not included in the HEAD AAC15 documentation commit.

## Observed Traceability Split

Record the observed split:

- Commit `c629af1` contains `backend/utils/supabaseCoreAuthorityStore.js`
- Commit `c629af1` message: `Add AAC11 positive write confidence fail record`
- Commit `4f495cf` contains `docs/NIMCLEA_AAC15_BACKEND_ADAPTER_ALIGNMENT_IMPLEMENTATION_RECORD_V0_1.md`
- Commit `4f495cf` contains `scripts/check-release-gate.mjs`
- Commit `4f495cf` message: `Implement AAC15 backend adapter alignment`

## Runtime State Confirmation

Confirm that current master contains the backend adapter fix.

Required statement:
`insertCaseEvent(...)` no longer sends `authority_source` as a direct insert column to `case_events`.

It may preserve `authority_source` context inside accepted JSON payload fields such as `raw_event` and/or `metadata`, provided it is not sent as an unknown top-level `case_events` column.

## Audit Interpretation

The AAC15 runtime fix and AAC15 documentation/gate protection are both present on current master.

However, the backend runtime fix landed in a commit whose message does not accurately describe the backend adapter change.

This is a traceability issue, not a runtime correctness issue.

## Decision

Do not rewrite pushed history.

Rationale:

- GitHub master has already received the commits
- Render alive check passed after push
- rewriting history would create unnecessary risk
- the safer correction is an explicit traceability note protected by the release gate

## Non-Changes

AAC15A does not:

- change backend runtime code
- change frontend runtime code
- alter Supabase schema
- create a migration
- amend or rewrite commits
- close AAC09 blocker beyond the AAC15 controlled scope
- claim payment readiness
- include Supabase Storage

## Impact

AAC15 remains valid as a completed backend adapter alignment implementation only when interpreted with both commits together:

- `c629af1` supplies the backend adapter runtime change
- `4f495cf` supplies the AAC15 implementation record and release gate protection

AAC15A makes this split explicit for future audit review.

## Stop Lines

Do not proceed to AAC16 blocker closure scope record if:

- current master does not contain the backend adapter fix
- `insertCaseEvent(...)` still sends `authority_source` as a direct top-level insert column to `case_events`
- AAC15 implementation record is missing
- AAC15 release gate protection is missing
- release-check has `FAIL > 0`

## Final Result

AAC15A result:

TRACEABILITY NOTE RECORDED.

The AAC15 backend adapter fix traceability split is documented.
No runtime code changes were made.
No git history was rewritten.
AAC16 may proceed only after release-check confirms `FAIL 0`.

## Next Action

Run release-check.

If release-check finishes with `FAIL 0`, push AAC15A with:

`Implement AAC15A backend adapter fix traceability note`

