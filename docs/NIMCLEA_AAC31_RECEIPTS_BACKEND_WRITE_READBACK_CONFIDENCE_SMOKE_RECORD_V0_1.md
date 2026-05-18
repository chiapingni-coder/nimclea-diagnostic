# Nimclea AAC31 Receipts Backend Write/Read-Back Confidence Smoke Record v0.1

## Status

PASS

## Purpose

This record documents the controlled backend-only receipts write/read-back smoke for the canonical `receipts` table.

## Scope

- Area: backend-only receipts write/read-back smoke
- Files inspected: `backend/utils/supabaseCoreAuthorityStore.js`, `backend/utils/supabaseClient.js`, `scripts/aac31-receipt-smoke.mjs`
- Files changed: `scripts/aac31-receipt-smoke.mjs`, this record
- Runtime behavior affected: none

## Decision / Change Summary

AAC31 executed a controlled backend-only receipts write/read-back smoke using the existing backend adapter path.

## Acceptance Criteria

- `writeOk` is `true`
- `writtenReceiptId` is `00000000-0000-4000-8000-000000000031`
- `readError` is `null`
- `readCount` is `1`
- `readReceiptId` is `00000000-0000-4000-8000-000000000031`
- `readCaseId` is `00000000-0000-4000-8000-000000000024`
- `readCustomerId` is `00000000-0000-4000-8000-000000000023`
- `readStatus` is `draft`
- `readSource` is `aac31_receipt_smoke`
- `readAac` is `AAC31`

## Validation

Commands / checks run:

```powershell
$env:DOTENV_CONFIG_PATH='backend\.env'; node -r dotenv/config scripts/aac31-receipt-smoke.mjs
```

Result:

- `writeOk: true`
- `writtenReceiptId: 00000000-0000-4000-8000-000000000031`
- `readError: null`
- `readCount: 1`
- `readReceiptId: 00000000-0000-4000-8000-000000000031`
- `readCaseId: 00000000-0000-4000-8000-000000000024`
- `readCustomerId: 00000000-0000-4000-8000-000000000023`
- `readStatus: draft`
- `readSource: aac31_receipt_smoke`
- `readAac: AAC31`

## Risk / Stop Line

- No frontend change was included.
- No Stripe change was included.
- No webhook change was included.
- No payment change was included.
- No PDF export change was included.
- No verification change was included.
- No migration change was included.
- No RLS change was included.
- No Supabase Storage change was included.

## Next Action

Use this result as controlled backend-only receipts write/read-back evidence.
