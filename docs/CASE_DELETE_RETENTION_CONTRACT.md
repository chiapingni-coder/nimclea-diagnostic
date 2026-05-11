# Case Delete / Retention Contract

## Purpose

This contract defines case deletion, retention, recoverability, purge scheduling, and protected record behavior for customer workspaces.

It aligns the frontend Delete / Protected eligibility model with the backend `PATCH /case/:caseId/discard` route and its internal retention metadata.

## Customer-Facing Vocabulary

Allowed customer-facing terms:

- Delete
- Protected
- Removed from workspace

Avoid customer-facing terms:

- soft delete
- tombstone
- discarded marker
- hidden but stored

## Retention Matrix

| Record type | Frontend | Backend | Recovery window | Purge | Category |
| --- | --- | --- | --- | --- | --- |
| Unpaid active case | Delete | discard allowed | 30 days | after 30 days | `unpaid_active_case_30_days` |
| Unpaid pending checkout case | Delete + high-risk confirmation panel | discard allowed only with `highRiskConfirmed === true` | 60 days | after 60 days, retain minimal payment reference | `unpaid_pending_checkout_60_days` |
| Paid / issued / baseline / historic / verification record | Protected | `409` reject | not applicable | no ordinary purge | `protected_permanent_record` |

## Frontend Contract

`getCaseDeleteMode(caseItem)` must return:

- `normal_delete` for unpaid ordinary active cases.
- `high_risk_delete` for `checkout_created` unpaid Formal Receipt checkout cases.
- `not_deletable` for all protected paid, issued, baseline, historic, and verification records.

Customer-facing UI should use `Delete` for deletable records and `Protected` for records that are not eligible for ordinary deletion.

## Backend Contract

`PATCH /case/:caseId/discard` must:

- allow ordinary unpaid cases;
- require `highRiskConfirmed === true` for unpaid `checkout_created` Formal Receipt cases;
- reject protected permanent records with `409`;
- stamp deletion metadata and a retention category for allowed deletes.

## Internal Metadata Contract

Allowed deleted cases should carry:

- `deletedAt`
- `discardedAt`
- `deletedBy`
- `deletionReason`
- `deletedFrom`
- `isDeleted: true`
- `deleted: true`
- `retentionCategory`
- `recoverableUntil`
- `purgeAfter`
- `purgeStatus: "scheduled"`

For pending checkout deletes, also preserve:

- `paymentStatusAtDeletion`
- `paymentTypeAtDeletion`
- `stripeSessionIdAtDeletion`

## Permanent Protection Rule

Any paid, issued, baseline, historic, or completed verification record is not eligible for ordinary deletion and is retained as an official record.

Protected signals include:

- `paid === true`
- `paymentStatus === "paid"`
- `receiptStatus` is `paid`, `issued`, or `activated`
- `receipt.status` is `paid`, `issued`, or `activated`
- `verificationStatus` is `paid`, `activated`, `issued`, `delivered`, `verified`, or `completed`
- `verification.status` is `paid`, `activated`, `issued`, `delivered`, `verified`, or `completed`
- `verificationDelivered === true`
- `evidencePackageDownloaded === true`
- `firstEvidencePackageDownloaded === true`
- `verification.delivered === true`
- `verification.evidencePackageDownloaded === true`
- `verification.firstEvidencePackageDownloaded === true`

## Future Purge Job

This contract defines metadata only. A future scheduled purge worker may purge eligible unpaid case content after `purgeAfter`.

Do not implement the purge worker in this step.
