# Case Delete / Retention Contract

## Purpose

This contract defines case deletion, non-recoverable denylist records, workspace removal, and protected record behavior for customer workspaces.

Ordinary unpaid active case Delete is irreversible. It is not a recoverable retention feature, Trash feature, Archive feature, or delayed purge workflow.

It aligns the frontend Delete / Protected eligibility model with the backend `PATCH /case/:caseId/discard` route and the backend `/cases` merge contract.

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
- recoverable delete

## Deletion Matrix

| Record type | Frontend | Backend | Recoverability | Internal marker |
| --- | --- | --- | --- | --- |
| Unpaid active case | Delete | irreversible deletion allowed | none | minimal non-recoverable denylist |
| Unpaid pending checkout case | Delete + high-risk confirmation panel | irreversible deletion allowed only with `highRiskConfirmed === true` | none | minimal non-recoverable denylist |
| Paid / issued / baseline / historic / verification record | Protected | `409` reject | not applicable | retained as protected official record |

## Frontend Contract

`getCaseDeleteMode(caseItem)` must return:

- `normal_delete` for unpaid ordinary active cases.
- `high_risk_delete` for `checkout_created` unpaid Formal Receipt checkout cases.
- `not_deletable` for all protected paid, issued, receipt-backed, baseline, historic, and verification records.

Customer-facing UI should use `Delete` for deletable records and `Protected` for records that are not eligible for ordinary deletion.

## Backend Contract

`PATCH /case/:caseId/discard` must:

- allow irreversible deletion for ordinary unpaid active cases;
- require `highRiskConfirmed === true` for unpaid `checkout_created` Formal Receipt cases;
- reject protected permanent records with `409`;
- remove the case from all sources that can rebuild the workspace list when deletion is allowed;
- write only a minimal non-recoverable denylist record when needed to prevent orphan records from rebuilding the deleted case.

Deleted ordinary cases must not reappear from backend merge sources, local registry records, email logs, event logs, trial snapshots, receipt preview records, hash ledger previews, Supabase mirrors, or result return flows.

## Internal Denylist Contract

The system may retain a minimal deleted-case denylist record with only:

- `caseId`
- `deletedAt`
- `deletedBy`
- `deletionReason`
- `deletedFrom`

The denylist exists only to prevent orphan records from rebuilding deleted cases.

It must not contain recoverable case content, diagnostic answers, evidence, receipt data, verification data, payment snapshots, or formal record payloads.

It must not be treated as a restore source.

## Pending Checkout Rule

An unpaid `checkout_created` Formal Receipt case may be deleted only after high-risk confirmation.

After deletion, the case is permanently removed from the workspace and has no ordinary restore path. Minimal payment-provider or checkout logs may continue to exist outside the case workspace model if needed for processor reconciliation, compliance buffers, fraud review, or exception handling, but those logs must not rebuild or restore the case.

Late Stripe or payment events tied to a deleted case must not automatically restore the case.

## Permanent Protection Rule

Any paid, issued, receipt-backed, baseline, historic, or completed verification record is not eligible for ordinary deletion and is retained as an official record.

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

## 30 / 60-Day Windows

No 30-day or 60-day window gives a customer or support user a restore path for ordinary unpaid active case Delete.

Any 30-day or 60-day language may apply only to technical logs, checkout cleanup windows, compliance buffers, payment-provider records, or a future Trash recovery feature if that feature is explicitly designed, documented, implemented, and exposed as a separate product behavior.

Those windows do not make ordinary unpaid active cases recoverable after Delete.

## Future Cleanup Jobs

This contract does not implement a purge worker.

Future cleanup workers may compact technical logs or purge orphan artifacts after a configured cleanup window, but they must preserve the non-recoverable deletion contract and must not use technical logs to restore ordinary deleted cases.
