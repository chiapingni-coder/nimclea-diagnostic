# Regression Smoke Checklist 8A

## 1. Purpose

This checklist verifies that recent hardening around receipt status, verification/payment boundaries, and frontend identity storage remains intact.

## 2. Current Completed Layers

| Layer | Status |
| --- | --- |
| Foundation contract layer | PASS |
| Payment ledger layer | PASS |
| Webhook configuration layer | PASS |
| Receipt / Verification business authority | PASS for status write authority; real checkout still pending |
| Frontend identity storage | PASS |
| Regression checklist | In progress |
| Real payment smoke test | Pending real checkout |

## 3. Pre-check

Commands:

```powershell
git status --short
git log --oneline -5
node scripts/check-golden-readiness.mjs
```

PASS criteria:

- Working tree clean.
- Latest expected commits are visible.
- No uncommitted frontend/backend changes.
- Golden readiness smoke prints `PASS: 14/14 golden readiness smoke checks passed.`

Run the golden readiness smoke before changing readiness/scoring logic; after changing `frontend/utils/deterministicScore.js`, `frontend/utils/dataContractLifecycle.js`, or `frontend/utils/sharedReceiptVerificationContract.js`; after changing receipt/verification readiness behavior; and before committing future 11-series scoring/readiness changes.

The command confirms the current v0.1 covered golden readiness checks still pass. It does not mean all 15 golden cases are automated: GTC-015 Case Ordering / Record Selection is deferred to backend aggregation / record-selection smoke.

It does not render React pages, call network APIs, test backend/data files, or test Stripe/payment webhooks.

This smoke check is now the first local regression command for readiness/scoring work. Future automation should expand coverage rather than weaken or bypass this check.

## 4. Backend Receipt-status Hardening Smoke

Negative test logic:

- Seed a temporary case.
- Send `PATCH /case/:caseId/receipt-status` without `receiptEligible true` but with malicious fields:
  - `stage` `receipt_ready`
  - `status` `paid`
  - `receiptStatus` `ready`
  - `verificationEligible true`
  - `verificationStatus` `verification_ready`
  - `payment.verificationPaid true`
  - `caseBilling.verificationActivated true`

PASS criteria:

- `stage` remains `result_ready` or existing non-ready value.
- `receiptEligible` remains `false`.
- `caseReceiptEligible` remains `false`.
- `receiptStatus` does not become `ready`.
- `verificationEligible` remains `false`.
- `verificationStatus` remains `null` or unchanged.
- `payment` and `caseBilling` are not injected.

Positive test logic:

- Send `PATCH /case/:caseId/receipt-status` with `receiptEligible true` and `stage receipt_ready`.

PASS criteria:

- `receiptEligible true`.
- `caseReceiptEligible true`.
- `receiptStatus ready`.
- `stage receipt_ready`.
- Verification/payment fields remain untouched.

## 5. Frontend Identity localStorage Smoke

Browser console command:

```js
Object.fromEntries(
  Object.entries(localStorage).filter(([key]) =>
    key.includes("email") ||
    key.includes("Email") ||
    key.includes("case") ||
    key.includes("Case")
  )
)
```

PASS criteria:

- `nimclea_email` exists when user identity is present.
- `nimclea_current_case_id` exists when current case is present.
- `savedEmail` must not appear.
- `savedEmail` must not reappear after refresh, visiting `/cases`, or opening a case detail route.

## 6. Case Routing Smoke

Manual checks:

- `/cases` loads cases for `nimclea_email`.
- Detail on receipt-ready or event-backed case opens `/receipt?caseId=...`.
- Current case id remains stable in `nimclea_current_case_id`.
- Switching email clears `nimclea_current_case_id` and `nimclea_email_verified`.

## 7. Payment and Checkout Smoke Status

Real payment smoke test is still pending.

Pending scenarios:

- `receipt_activation` checkout return.
- `formal_verification` checkout return.
- `confirm-checkout-session` writes `paymentRecords`.
- Paid receipt unlocks verification path.
- Verification payment activates verification without marking verification as issued/completed.

## 8. Known Acceptable Warnings

- Backend `npm test` may fail with `"Error: no test specified"` placeholder.
- Frontend build may show existing `html2pdf.js` mixed import warning.
- Frontend build may show existing chunk size warning.
- Browser console async listener warning may be ignored unless it blocks the tested flow.

## 9. Result Labels

| Label | Meaning |
| --- | --- |
| PASS | Expected state confirmed. |
| HOLD | Ambiguous result, needs repeat or deployment wait. |
| FAIL | Expected protection broken or wrong field written. |

## 10. Latest Verified Results

- Step 6-F production smoke test PASS.
- Step 7-F frontend identity smoke test PASS.
- `savedEmail` localStorage key removed from active storage flow.
- Receipt-status endpoint requires explicit `receiptEligible true` and no longer accepts full `req.body` spread.
