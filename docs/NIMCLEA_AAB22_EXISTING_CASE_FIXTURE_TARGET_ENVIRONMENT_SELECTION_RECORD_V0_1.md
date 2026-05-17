# Nimclea AAB-22 - Existing-Case Fixture Target Environment Selection Record v0.1

## Purpose

This record selects the target environment for a future long-lived existing-case smoke fixture for `GET /cases?email=...`.

AAB-22 does not create the fixture. It only decides where fixture creation may happen first.

## Background

AAB-17 defined the read-only rehearsal plan.

AAB-18 captured empty-email read-only evidence.

AAB-19 confirmed that no reliable existing-case fixture was available.

AAB-20 approved the concept of a future smoke-only existing-case fixture under a backend-only write boundary.

AAB-21 defined the fixture creation plan.

The remaining question is target environment selection.

## Route Under Consideration

`GET /cases?email=<encodedEmail>`

Future fixture identity:

`smoke+cases-existing-001@nimclea.test`

Future fixture case identifier:

`CASE-AAB-EXISTING-001`

The exact case identifier may be adjusted only if the selected authority store requires a different format.

## Environment Options Considered

### Option 1: Isolated or rehearsal Supabase project

Advantages:

- Non-customer environment.
- Safer for fixture creation.
- Good fit for schema and authority-store validation.
- Allows controlled backend/service-role creation.
- Avoids production pollution.
- Can be reset or rolled back more safely.

Risks:

- Does not prove Render production read behavior by itself.
- Requires later production read-only evidence only after stronger approval.

### Option 2: Local backend authority store

Advantages:

- Very safe for local-only rehearsal.
- Easy to inspect and reset.
- No production data risk.

Risks:

- Lower confidence for deployed API behavior.
- May not represent Supabase authority behavior.
- Not enough for final existing-case response-shape evidence.

### Option 3: Render production

Advantages:

- Highest confidence for live API behavior.
- Directly tests the deployed route.

Risks:

- Permanent smoke fixture may pollute production.
- Requires stronger governance.
- Requires exact rollback or tombstone strategy.
- Should not be the first fixture creation target.

## Decision

Selected first target:

`isolated / rehearsal Supabase project`

Render production is not approved as the first fixture creation target by this record.

Local backend authority store may be used only for local rehearsal support, but it is not selected as the primary fixture target.

## Decision Rationale

The first existing-case fixture should be created in the safest environment that still exercises the clean authority model.

An isolated or rehearsal Supabase project provides the best balance between:

- backend authority realism
- non-customer safety
- rollback control
- future migration compatibility
- fixture stability

This keeps fixture creation out of Render production until a later record explicitly approves production smoke fixture policy.

## Write Boundary

Future fixture creation in the selected environment must remain backend-only or service-role controlled.

Allowed future methods:

- reviewed service-role SQL in the selected rehearsal Supabase project
- reviewed backend admin script pointed only at the selected rehearsal project
- reviewed seed script with explicit environment guard

Forbidden methods:

- frontend customer flow
- anonymous Supabase write
- accidental route-side creation
- Render production write without separate approval
- payment, receipt, verification, or trial lifecycle flow

## Required Future Creation Record

Before any fixture is created, a future execution record must specify:

- selected Supabase project
- exact table or authority store
- exact fixture payload
- exact write command or script
- exact rollback command
- expected `GET /cases?email=...` response
- verification that the target is not customer production data

Recommended next record:

`AAB-23 - Existing-Case Fixture Creation Execution Record`

## Required Future Read Evidence

After fixture creation, a separate read-only evidence record should verify the route response.

Recommended future record:

`AAB-24 - Existing-Case Response-Shape Read-Only Evidence Record`

That future evidence must confirm:

- `Count > 0`
- stable `caseId`
- no duplicate case rows
- no deleted or tombstoned case appears
- no mutation during read
- response shape is compatible with CasesPage expectations

## Explicit Non-Goals

AAB-22 does not:

- create the fixture
- execute SQL
- write Supabase data
- write local JSON data
- modify route behavior
- modify frontend behavior
- approve Render production fixture creation
- claim existing-case PASS evidence

## Final Status

AAB-22 selects an isolated or rehearsal Supabase project as the first target environment for future existing-case fixture creation.

No fixture is created by this record.

No runtime behavior changes are authorized.
