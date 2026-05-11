# Case Delete / Discard Backend Smoke Checkpoint

## Summary

Backend delete/discard smoke checks passed for:

- ordinary unpaid active case discard;
- payment-pending Formal Receipt checkout case requiring high-risk confirmation;
- high-risk confirmed discard for payment-pending case;
- formal locked paid/issued case rejection;
- `/cases` filtering of discarded cases;
- `/cases` preserving `checkout_created` `paymentStatus`;
- `/cases` preserving `paid: true` and `receiptStatus: issued`.

This checkpoint is historical. Current product policy is defined by `docs/CASE_DELETE_RETENTION_CONTRACT.md`: allowed ordinary case Delete is irreversible and must not expose a customer or support restore path.

## Backend Route Under Test

`PATCH /case/:caseId/discard`

Expected current behavior:

- ordinary unpaid active cases can be irreversibly deleted from the workspace;
- `checkout_created` but unpaid receipt cases require `highRiskConfirmed === true`;
- paid / issued / activated / verified / delivered cases return `409`;
- deleted ordinary cases may leave only a minimal non-recoverable denylist record;
- deleted ordinary cases must not be rebuilt from orphan backend or frontend sources.

## /cases Filtering Checkpoint

- `/cases` builds `deletedCaseIds` from minimal denylist records and any legacy deletion markers.
- Candidate-building skips deleted case IDs.
- Final matches are filtered again before response.
- Deleted/discarded cases should not be revived by `emailLogs`, `receiptRecords`, `eventLogs`, trial snapshots, hash ledger previews, Supabase mirrors, or result return flows.

## Smoke Test Results

### A. Ordinary unpaid active case discard

- Created disposable unpaid active case.
- Confirmed it appeared in `/cases` before discard.
- `PATCH /case/:caseId/discard` returned success.
- Confirmed `/cases` no longer returned the discarded case.
- Result: PASS.

### B. Payment-pending high-risk discard

- Created fake Formal Receipt `checkout_created` but unpaid case.
- Discard without `highRiskConfirmed` returned `409` and `requiresHighRiskConfirmation: true`.
- Case still appeared in `/cases` after blocked discard.
- Discard with `highRiskConfirmed: true` returned success.
- `/cases` no longer returned the discarded case.
- Result: PASS.

### C. Formal locked case cannot be discarded

- Created fake formal locked receipt case with `receipt_issued` / `paymentStatus: paid`.
- Discard attempt returned `409`.
- Message confirmed formal records cannot be deleted as ordinary cases.
- Case still appeared in `/cases` after rejected discard.
- Result: PASS.

### D. /cases preserves checkout_created

- Created fake `checkout_created` Formal Receipt case.
- `/cases` returned `paymentStatus: checkout_created`.
- Result: PASS.

### E. /cases preserves paid true and receiptStatus issued

- Created fake `receipt_issued` / paid case.
- `/cases` returned:
  - `paymentStatus: paid`
  - `paid: true`
  - `receiptStatus: issued`
- Result: PASS.

## Known Remaining Work

- Legacy Archive UI code may still exist temporarily.
- Legacy Restore case code may still exist temporarily for archived cases.
- Frontend high-risk confirmation behavior should continue to require explicit confirmation.
- Future backend cleanup should ensure orphan sources cannot rebuild hard-deleted ordinary cases.

## Safety Notes

- Do not use `frontend/utils/caseRegistry.js` `deleteCase()` as system-level delete.
- Paid / issued / receipt-backed / verification-backed / baseline / historic records must not show ordinary Delete.
- `checkout_created` but unpaid may show Delete only with high-risk confirmation.
- Later Stripe events tied to deleted cases must not auto-restore the case.
- Minimal denylist records must not contain recoverable case content.

## Related Documents

- `docs/CASE_DELETE_DISCARD_BACKEND_CONTRACT.md`
- `docs/CASE_DELETE_RETENTION_CONTRACT.md`
- `docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md`
- `docs/TRIAL_WORKSPACE_ACCESS_CONTRACT.md`
- `docs/FOUNDATION_CONTRACT_INDEX.md`
