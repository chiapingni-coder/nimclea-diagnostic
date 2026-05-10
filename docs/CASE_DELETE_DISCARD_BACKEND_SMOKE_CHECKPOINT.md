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

## Backend Route Under Test

`PATCH /case/:caseId/discard`

Expected behavior:

- ordinary unpaid active cases can be soft-discarded;
- `checkout_created` but unpaid receipt cases require `highRiskConfirmed === true`;
- paid / issued / activated / verified / delivered cases return `409`;
- discarded cases receive `deletedAt` / `discardedAt` / `isDeleted` / `deleted` markers;
- discarded cases are not hard-deleted.

## /cases Filtering Checkpoint

- `/cases` builds `deletedCaseIds` from explicit soft-delete markers in case records.
- `addCandidate()` skips deleted case IDs.
- Final matches are filtered again before response.
- Deleted/discarded cases should not be revived by `emailLogs`, `receiptRecords`, `eventLogs`, or Supabase mirrors.

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

- Frontend Delete button is not wired yet.
- Archive UI still exists.
- Archived Cases tab still exists.
- Restore case still exists.
- Active / Baseline / Historic UI is not wired yet.
- `GET /case/:caseId` does not yet return `410 Gone` for deleted ordinary cases.
- Frontend high-risk confirmation modal still needs to be implemented.

## Safety Notes

- Do not replace Archive with Delete until frontend calls backend discard route.
- Do not use `frontend/utils/caseRegistry.js` `deleteCase()` as system-level delete.
- Paid / issued / baseline / historic records must not show ordinary Delete.
- `checkout_created` but unpaid may show Delete only with high-risk confirmation.
- Later Stripe events tied to deleted cases must not auto-restore the case.

## Related Documents

- `docs/CASE_DELETE_DISCARD_BACKEND_CONTRACT.md`
- `docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md`
- `docs/TRIAL_WORKSPACE_ACCESS_CONTRACT.md`
- `docs/FOUNDATION_CONTRACT_INDEX.md`
