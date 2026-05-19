# V0 9 5AH RECEIPT AUTHORITY READ PATH INSPECTION SMOKE TARGET SELECTION RECORD

## Record ID

NIMCLEA_V0_9_5AH_RECEIPT_AUTHORITY_READ_PATH_INSPECTION_SMOKE_TARGET_SELECTION_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record documents the decision, implementation, rehearsal, or validation result for this Nimclea work item.

## Scope

- Area: Receipt authority read-path inspection and smoke target selection.
- Files inspected: backend/routes/caseRoutes.js; backend/routes/hashLedgerRoutes.js; backend/routes/stripe.js; backend/routes/stripeWebhook.js; backend/utils/supabaseCoreAuthorityStore.js; backend/utils/supabaseMirrorWrites.js; backend/utils/jsonStore.js; frontend/pages/CasesPage.jsx; frontend/pages/ReceiptPage.jsx; frontend/pages/VerificationPage.jsx.
- Files changed: docs/NIMCLEA_V0_9_5AH_RECEIPT_AUTHORITY_READ_PATH_INSPECTION_SMOKE_TARGET_SELECTION_RECORD_V0_1.md; scripts/check-release-gate.mjs.
- Runtime behavior affected: None. No backend, frontend, Supabase schema, RLS, grant, payment, verification, receipt export, or storage behavior changed.
## Decision / Change Summary

Inspection found that receipt authority is currently split across legacy/local and canonical/Supabase surfaces.

Key finding: upsertReceiptRecord(...) targets public.receipts; linkReceiptToPayment(...) targets public.receipts; getReceiptRecordByReceiptId(...) currently reads receipt_records; supabaseMirrorWrites.js still mirrors receipt records to receipt_records; hashLedgerRoutes.js and stripe.js still interact with local receiptRecords.json.

Selected direction: treat public.receipts as the canonical receipt authority table for this v0.9 read-path confidence track. Treat receipt_records as legacy, mirror, or quarantine-adjacent unless a later record explicitly reclassifies it. Do not patch receipt runtime behavior in this work item.

## Acceptance Criteria

PASS if receipt read-path surfaces are identified, public.receipts is selected as canonical direction, receipt_records is not promoted as canonical, the next smoke target is selected as read-only fixture availability and helper alignment inspection, and no runtime behavior is changed.

FAIL if the record claims receipt/payment/verification readiness, patches runtime behavior, creates or mutates receipt/payment records, or treats receipt_records as canonical without a separate decision record.

## Validation

Commands / checks run:

```powershell
```

Result:

PASS for inspection and target selection. No runtime code changed.

## Risk / Stop Line

Stop line: do not patch receipt runtime behavior until receipt fixture/read-helper state is inspected. Do not mix payment activation, receipt hash ledger, case aggregation, and canonical receipt authority in one patch. Do not create receipt/payment records merely to make a smoke pass.

## Next Action

Proceed to v0.9-5AI: receipt authority fixture availability and helper alignment inspection. Keep it read-only and fixture-only. Confirm public.receipts availability, confirm whether a controlled receipt fixture exists, and confirm whether getReceiptRecordByReceiptId(...) should be aligned from receipt_records to public.receipts in a later candidate/fix item.
