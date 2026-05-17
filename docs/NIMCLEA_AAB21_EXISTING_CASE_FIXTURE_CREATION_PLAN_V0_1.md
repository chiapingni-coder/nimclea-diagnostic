# Nimclea AAB-21 - Existing-Case Fixture Creation Plan v0.1

## Purpose

This plan defines how a future long-lived existing-case smoke fixture may be created for `GET /cases?email=...`.

This plan follows AAB-20.

AAB-21 does not create the fixture. It only defines the controlled creation method, expected fixture shape, rollback boundary, and future evidence requirements.

## Background

AAB-17 defined the read-only rehearsal plan for `GET /cases?email=...`.

AAB-18 captured empty-email read-only evidence.

AAB-19 confirmed that no reliable existing-case fixture was available.

AAB-20 approved the concept of a future smoke-only existing-case fixture, but only under a documented backend-only write boundary.

## Target Fixture Identity

Preferred email:

`smoke+cases-existing-001@nimclea.test`

Preferred case identifier:

`CASE-AAB-EXISTING-001`

The exact `caseId` may be adjusted only if the target authority store requires a different format.

## Target Environment Decision

The first fixture creation should target a controlled non-customer environment.

Preferred order:

1. Isolated or rehearsal Supabase project, if available.
2. Local backend authority store, if explicitly used for controlled smoke.
3. Render production only after a separate approval record confirms that a permanent smoke fixture is acceptable there.

AAB-21 does not approve direct Render production fixture creation by itself.

## Required Fixture Shape

The fixture should contain the minimum case-list fields required for `GET /cases?email=...` response-shape evidence.

Required fields:

- stable `caseId`
- stable user email
- stable case title or display label if required by current list rendering
- status suitable for case-list display
- created timestamp
- authority/source marker if supported
- no deleted or tombstone flag
- no payment dependency
- no receipt dependency
- no verification dependency
- no trial lifecycle dependency

The fixture should be boring, durable, and purpose-labeled.

## Write Boundary

Fixture creation must be backend-only.

Allowed future write methods:

- reviewed backend admin script
- reviewed service-role Supabase SQL
- reviewed controlled seed script

Forbidden write methods:

- frontend customer flow
- anonymous Supabase write
- accidental route-side creation
- payment flow
- receipt flow
- verification flow
- trial lifecycle flow

## Pre-Creation Checklist

Before fixture creation, confirm:

- target environment
- exact storage location or table
- exact fixture payload
- exact write method
- rollback method
- expected `GET /cases?email=...` response
- no overlap with customer data
- no dependency on Stripe
- no dependency on trial lifecycle
- no dependency on localStorage
- no tombstone conflict

## Rollback Plan

The future creation record must define how to remove or neutralize the fixture.

Rollback must identify:

- the exact `caseId`
- the exact user email
- the exact table or file location
- whether rollback deletes, tombstones, or disables the fixture
- how to verify that `GET /cases?email=...` no longer returns the fixture after rollback

## Expected Future Read Evidence

After fixture creation, a future read-only evidence record should request:

```powershell
Invoke-RestMethod "https://nimclea-api.onrender.com/cases?email=smoke%2Bcases-existing-001%40nimclea.test" | ConvertTo-Json -Depth 10
```

Expected evidence should confirm:

- response `Count > 0`
- stable case list shape
- stable `caseId`
- no duplicate cases
- no tombstone resurrection
- no mutation during read

## Final Status

AAB-21 defines a future controlled fixture creation plan only.

No fixture is created by this record.

No database records, runtime code, frontend code, or Supabase migrations are modified by this record.
