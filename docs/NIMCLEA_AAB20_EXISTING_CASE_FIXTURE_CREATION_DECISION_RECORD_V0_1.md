# Nimclea AAB-20 - Existing-Case Fixture Creation Decision Record v0.1

## Purpose

This record defines the decision boundary for creating a long-lived existing-case smoke fixture for `GET /cases?email=...`.

AAB-17 defined the read-only rehearsal plan.

AAB-18 captured real empty-email read-only evidence.

AAB-19 attempted existing-case fixture discovery and confirmed that no reliable existing-case fixture was available during that pass.

AAB-20 does not create a fixture. It decides the rules that must exist before any fixture may be created.

## Background

The route under consideration is:

`GET /cases?email=<encodedEmail>`

The missing evidence is the existing-case scenario:

- A known smoke email exists.
- That email has at least one backend-authoritative case.
- `GET /cases?email=...` returns the expected case list.
- The returned shape remains stable.
- The route does not duplicate cases.
- The route does not resurrect tombstoned cases.
- The route remains read-only.

AAB-19 found no reliable existing-case fixture. Therefore, existing-case response-shape evidence cannot be claimed yet.

## Decision

A long-lived existing-case smoke fixture may be created later only if all conditions below are met.

### Approved Fixture Principle

The fixture must be:

- smoke-only
- non-customer
- clearly named
- backend-authoritative
- safe to read repeatedly
- stable across release-gate and manual smoke passes
- excluded from customer-facing assumptions
- documented before use

### Recommended Fixture Identity

Preferred smoke email:

`smoke+cases-existing-001@nimclea.test`

Reason:

- It was already listed as a candidate identity in AAB-17.
- It is clearly smoke-only.
- It does not resemble a real customer account.
- It names the intended scenario directly.

### Required Fixture Shape

The fixture should include at minimum:

- stable `caseId`
- stable email/user identity
- case status suitable for list rendering
- created timestamp
- source or authority marker if available
- no payment dependency
- no receipt dependency
- no verification dependency
- no trial lifecycle dependency

The fixture should not require Stripe, PDF export, verification unlock, or trial lifecycle state to be meaningful.

## Write Boundary

Fixture creation must not be done by frontend code.

Fixture creation must not be done through normal customer flow unless a separate controlled test plan explicitly approves it.

Preferred write boundary:

- backend-only
- service role if Supabase is involved
- explicit script or controlled admin/manual SQL only after review
- no anonymous writes
- no accidental customer route writes

## Forbidden Actions

AAB-20 does not authorize:

- creating the fixture
- inserting Supabase rows
- writing local JSON records
- changing `GET /cases?email=...`
- changing `GET /case/:caseId`
- changing frontend routing
- changing payment, receipt, verification, or trial logic
- claiming existing-case PASS evidence

## Required Future Plan Before Creation

Before any fixture is created, a future plan must define:

- exact target environment
- exact fixture email
- exact caseId
- exact table or storage location
- exact write method
- rollback/removal method
- expected read response
- whether the fixture is permanent or disposable
- how it avoids customer data contamination

Recommended future record:

`AAB-21 - Existing-Case Fixture Creation Plan`

## Required Future Evidence After Creation

After a fixture exists, a separate read-only evidence record should verify:

- `GET /cases?email=smoke%2Bcases-existing-001%40nimclea.test`
- response `Count > 0`
- stable case list shape
- no duplicate cases
- no tombstone resurrection
- no mutation during read

Recommended future record:

`AAB-22 - Existing-Case Response-Shape Evidence Record`

## Final Status

AAB-20 approves the concept of a future smoke-only existing-case fixture, but only under a documented backend-only write boundary.

No fixture is created by this record.

No runtime behavior changes are authorized.
