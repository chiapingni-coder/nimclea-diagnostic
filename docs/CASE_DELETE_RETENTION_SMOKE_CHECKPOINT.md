# Case Delete / Retention Smoke Checkpoint

## Purpose

This checkpoint verifies the Delete / Retention contract for:

- ordinary unpaid active cases;
- unpaid pending checkout cases;
- `/cases` filtering after deletion;
- internal retention metadata.

## Contract Reference

Reference: `docs/CASE_DELETE_RETENTION_CONTRACT.md`

This checkpoint verifies the implementation behavior described by that contract.

## Smoke Test A: Ordinary Unpaid Active Case

Email:
`retention-normal-smoke-20260510201630@nimclea.test`

Case:
`CASE-1778469391301-HC4R6G`

Result:
PASS

Observed metadata:

- `paymentStatus: unpaid`
- `paid: false`
- `isDeleted: true`
- `deleted: true`
- `deletedAt: 2026-05-11T03:17:19.762Z`
- `discardedAt: 2026-05-11T03:17:19.762Z`
- `retentionCategory: unpaid_active_case_30_days`
- `recoverableUntil: 2026-06-10T03:17:19.762Z`
- `purgeAfter: 2026-06-10T03:17:19.762Z`
- `purgeStatus: scheduled`
- `/cases filtering: PASS`

Expected policy:
Ordinary unpaid active cases are removed from the workspace immediately and internally recoverable for 30 days.

## Smoke Test B: Unpaid Pending Checkout Case

Email:
`retention-pending-smoke-20260510203331@nimclea.test`

Case:
`CASE-1778470411802-Y494CM`

Result:
PASS

Observed metadata:

- `paymentStatus: checkout_created`
- `paymentType: receipt_activation`
- `stripeSessionId: cs_test_retention_pending_1778470411119`
- `paid: false`
- `isDeleted: true`
- `deleted: true`
- `deletedAt: 2026-05-11T03:33:32.999Z`
- `discardedAt: 2026-05-11T03:33:32.999Z`
- `retentionCategory: unpaid_pending_checkout_60_days`
- `recoverableUntil: 2026-07-10T03:33:32.999Z`
- `purgeAfter: 2026-07-10T03:33:32.999Z`
- `purgeStatus: scheduled`
- `paymentStatusAtDeletion: checkout_created`
- `paymentTypeAtDeletion: receipt_activation`
- `stripeSessionIdAtDeletion: cs_test_retention_pending_1778470411119`
- `/cases filtering: PASS`

Expected policy:
Unpaid pending checkout cases are removed from the workspace immediately, internally recoverable for 60 days, and retain minimal checkout/payment references.

## Verified Behavior

- `PATCH /case/:caseId/discard` succeeds for ordinary unpaid active cases.
- `PATCH /case/:caseId/discard` succeeds for unpaid pending checkout cases only when `highRiskConfirmed` is true.
- Deleted records remain readable through `GET /case/:caseId` for internal/support recovery.
- Deleted records are filtered from `GET /cases?email=...`.
- Retention metadata is stamped on allowed deletes.
- Pending checkout deletion preserves payment snapshot fields.

## Out Of Scope

- This checkpoint does not implement the future purge worker.
- This checkpoint does not test paid / issued / protected permanent record rejection.
- This checkpoint does not modify customer-facing copy.
- This checkpoint does not test support restore workflows.

## Final Status

Status: PASS

Summary:
Delete / Retention metadata is correctly stamped for both ordinary unpaid active cases and unpaid pending checkout cases. Deleted records are filtered from the workspace list while remaining internally recoverable during the configured retention window.
