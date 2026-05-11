# Case Delete / Retention Smoke Checkpoint

## Purpose

This checkpoint previously verified an older Delete / Retention model. It is now superseded by the irreversible ordinary-case deletion contract in `docs/CASE_DELETE_RETENTION_CONTRACT.md`.

Current policy requires ordinary unpaid active case Delete to be irreversible. Deleted ordinary cases must be permanently removed from the user workspace and must not be rebuilt from backend merge sources, local registry entries, email logs, event logs, trial snapshots, receipt preview records, hash ledger previews, Supabase mirrors, or result return flows.

## Contract Reference

Reference: `docs/CASE_DELETE_RETENTION_CONTRACT.md`

That contract is authoritative for current behavior.

## Superseded Smoke Coverage

The earlier checkpoint verified:

- ordinary unpaid active case removal from `/cases`;
- unpaid pending checkout removal after high-risk confirmation;
- `/cases` filtering after deletion;
- metadata stamping on allowed deletes.

Those observations remain useful only as historical evidence that deleted cases were hidden from the workspace list.

They must not be read as current product policy for customer or support recovery.

## Current Required Behavior

Ordinary unpaid active cases:

- are eligible for `Delete`;
- are irreversibly removed from the workspace;
- have no restore path;
- may leave only a minimal non-recoverable denylist record;
- must not reappear from backend merge sources or frontend local registry data.

Unpaid pending checkout cases:

- are eligible for `Delete` only after high-risk confirmation;
- are irreversibly removed from the workspace after confirmation;
- have no restore path;
- may retain external payment-provider or checkout logs only for reconciliation, compliance buffers, or exception handling;
- must not be restored automatically by late payment events.

Protected records:

- paid records;
- issued records;
- receipt-backed records;
- verification-backed records;
- baseline records;
- historic records;
- must remain `Protected` and must be rejected by the backend ordinary delete route.

## 30 / 60-Day Note

Earlier 30-day and 60-day recoverability wording is obsolete for ordinary unpaid active case Delete.

Any future 30-day or 60-day window may apply only to technical logs, checkout cleanup, compliance buffers, or an explicitly implemented Trash recovery feature. It does not make ordinary deleted cases recoverable under the current contract.

## Final Status

Status: SUPERSEDED

Summary:
The historical retention checkpoint is no longer the active deletion policy. The current contract is irreversible workspace removal for ordinary unpaid active cases, with only a minimal non-recoverable denylist allowed to prevent orphan records from rebuilding deleted cases.
