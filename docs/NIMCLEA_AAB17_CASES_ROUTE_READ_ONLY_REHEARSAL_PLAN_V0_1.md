# Nimclea AAB-17 - GET /cases?email=... Read-Only Rehearsal Plan v0.1

## Purpose

This document defines a read-only rehearsal plan for `GET /cases?email=...`.

The purpose is to verify that the case-list authority surface can be inspected safely before any write-boundary or migration work proceeds.

This is a planning record only. It does not authorize runtime changes, database writes, frontend behavior changes, or schema migration.

## Route Under Rehearsal

`GET /cases?email=<encodedEmail>`

Primary responsibility:

- Resolve the submitted email.
- Return the current case list associated with that email.
- Preserve deleted/tombstoned case filtering.
- Avoid fabricating cases from unrelated trial, receipt, event, or local-only artifacts.
- Remain read-only.

## Read-Only Boundary

During this rehearsal, the route must not perform:

- `INSERT`
- `UPDATE`
- `DELETE`
- `UPSERT`
- local JSON mutation
- Supabase mutation
- migration execution
- frontend state mutation beyond normal caller behavior
- payment, receipt, verification, or trial lifecycle writes

Allowed actions:

- HTTP GET request
- response inspection
- log inspection
- comparison against expected shape
- manual note-taking in a smoke record after execution

## Rehearsal Preconditions

Before execution:

- Working tree must be clean, or any unrelated changes must be explicitly identified.
- Backend server target must be known: local, Render, or both.
- Test emails must be non-customer smoke identities.
- Any response payload copied into records must be sanitized if needed.
- No real customer data should be used.

## Candidate Smoke Identities

Use smoke-only identities such as:

- `smoke+cases-empty-001@nimclea.test`
- `smoke+cases-existing-001@nimclea.test`
- `smoke+cases-tombstone-001@nimclea.test`
- `smoke+cases-url-encoded-001@nimclea.test`

If these identities do not already exist in the target environment, they must not be created as part of this read-only rehearsal.

## Rehearsal Scenarios

### Scenario 1 - Empty or unknown smoke email

Request:

`GET /cases?email=smoke%2Bcases-empty-001%40nimclea.test`

Expected:

- Request completes without server error.
- Response does not fabricate a case.
- Empty result is acceptable.
- No local or database write occurs.

Pass condition:

- The route returns a stable empty/no-case result without creating records.

### Scenario 2 - Existing case email, if available

Request:

`GET /cases?email=<encoded existing smoke email>`

Expected:

- Existing case records are returned.
- Each returned case has a stable case identifier.
- Case identity is not duplicated.
- Deleted/tombstoned records are not resurrected.
- Response shape is compatible with current CasesPage expectations.

Pass condition:

- Existing cases are listed without mutation or duplication.

### Scenario 3 - Tombstone protection, if fixture exists

Request:

`GET /cases?email=<encoded smoke email with deleted/tombstoned case history>`

Expected:

- Deleted/tombstoned case IDs do not appear in the active case list.
- The route does not restore local-only deleted records.
- The route does not use receipt/event/trial artifacts to resurrect deleted cases.

Pass condition:

- Tombstone filtering remains fail-closed.

### Scenario 4 - URL encoding safety

Request:

Use an email containing `+` and encode it as `%2B`.

Expected:

- The backend resolves the intended email.
- The `+` sign is not interpreted as a space.
- No unexpected cross-email lookup occurs.

Pass condition:

- The response corresponds only to the intended encoded email.

### Scenario 5 - Supabase-enabled read behavior, if environment is configured

Request:

`GET /cases?email=<encoded smoke email>`

Expected:

- Supabase may be read as an authority or overlay source if configured.
- The request remains read-only.
- Missing Supabase records do not create new records.
- Local fallback behavior remains controlled.

Pass condition:

- Supabase presence changes only the read source, not the write behavior.

## Explicit Non-Goals

This rehearsal does not cover:

- `GET /case/:caseId`
- receipt readiness
- verification unlock
- payment
- PDF export
- trial lifecycle start/register writes
- schema migration
- RLS policy changes
- frontend navigation behavior
- customer-facing launch readiness

## Evidence To Capture Later

The execution smoke record should capture:

- target environment
- timestamp
- request URL pattern
- sanitized email used
- response status
- response shape summary
- whether any write occurred
- whether tombstone filtering was preserved
- final PASS/WARN/FAIL result

Do not paste unnecessary full payloads unless they are smoke-only and useful for audit.

## Pass / Warn / Fail Rules

PASS:

- All selected scenarios complete without mutation.
- Empty email result does not fabricate cases.
- Existing case result remains stable.
- Tombstoned cases remain hidden.
- URL encoding works.
- No write path is observed.

WARN:

- A scenario cannot be executed because the fixture does not exist.
- Supabase behavior cannot be checked because env is not configured.
- Response shape is acceptable but needs a later stronger fixture.

FAIL:

- Any write occurs.
- A deleted/tombstoned case is resurrected.
- The route fabricates a case from trial, receipt, event, or unrelated artifacts.
- URL encoding causes cross-email lookup.
- The route throws an unexpected server error for normal smoke input.

## Follow-Up Record

The execution result should be captured in a separate smoke record, likely:

`docs/NIMCLEA_AAB18_CASES_ROUTE_READ_ONLY_REHEARSAL_EXECUTION_RECORD_V0_1.md`

AAB-17 is the plan.

AAB-18 should be the execution record.

## Decision

AAB-17 authorizes only a read-only rehearsal plan for `GET /cases?email=...`.

It does not authorize runtime changes.
