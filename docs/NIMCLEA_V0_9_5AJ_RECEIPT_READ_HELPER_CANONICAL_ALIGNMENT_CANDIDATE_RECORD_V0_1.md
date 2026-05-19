# v0.9-5AJ RECEIPT READ HELPER CANONICAL ALIGNMENT CANDIDATE RECORD

## Record ID

NIMCLEA_V0_9_5AJ_RECEIPT_READ_HELPER_CANONICAL_ALIGNMENT_CANDIDATE_RECORD_V0_1

## Date

2026-05-18

## Purpose

This record selects the narrow candidate to align getReceiptRecordByReceiptId(...) from legacy receipt_records to canonical public.receipts. This is candidate only and does not patch runtime code.

## Scope

- Area: Receipt read helper canonical alignment candidate.
- Files inspected: backend/utils/supabaseCoreAuthorityStore.js; v0.9-5AI receipt fixture availability evidence.
- Files changed: docs/NIMCLEA_V0_9_5AJ_RECEIPT_READ_HELPER_CANONICAL_ALIGNMENT_CANDIDATE_RECORD_V0_1.md; scripts/check-release-gate.mjs.
- Runtime behavior affected: None. Candidate only. No backend route, frontend behavior, Supabase schema, RLS, grant, payment, verification, receipt export, or storage behavior changed.

## Decision / Change Summary

Candidate selected: change getReceiptRecordByReceiptId(...) to read canonical public.receipts by receipt_id instead of legacy receipt_records.

Evidence: public.receipts is readable and contains fixture receipt IDs 00000000-0000-4000-8000-000000000031 and 00000000-0000-4000-8000-000000000040 for case_id 00000000-0000-4000-8000-000000000024. public.receipt_records is not available in the schema cache. upsertReceiptRecord(...) and linkReceiptToPayment(...) already use public.receipts, while getReceiptRecordByReceiptId(...) still uses receipt_records.

## Acceptance Criteria

PASS if this record selects the narrow public.receipts alignment candidate and makes no runtime changes.

FAIL if this record patches runtime behavior, treats receipt_records as canonical, creates or mutates receipt/payment records, or claims end-to-end receipt/payment/verification readiness.

## Validation

Commands / checks run:

Select-String backend/utils/supabaseCoreAuthorityStore.js for upsertReceiptRecord, linkReceiptToPayment, getReceiptRecordByReceiptId, receipts, and receipt_records.

Observed result: upsertReceiptRecord(...) uses public.receipts; linkReceiptToPayment(...) uses public.receipts; getReceiptRecordByReceiptId(...) uses receipt_records.

Result:

PASS for candidate selection. No runtime code changed.

## Risk / Stop Line

Do not patch getReceiptRecordByReceiptId(...) inside this candidate record. Do not change Stripe, hash ledger, payment activation, receipt export, verification unlock, Supabase schema, RLS, grants, or storage.

## Next Action

Proceed to v0.9-5AK: implement the minimal getReceiptRecordByReceiptId(...) alignment to public.receipts and run controlled read-only helper smoke against receipt IDs 00000000-0000-4000-8000-000000000031 and 00000000-0000-4000-8000-000000000040.