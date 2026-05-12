# Nimclea Diagnostic

## Local Validation

### Golden readiness smoke

Run from the repository root:

```powershell
node scripts/check-golden-readiness.mjs
```

Run this before changing readiness/scoring logic; after changing `frontend/utils/deterministicScore.js`, `frontend/utils/dataContractLifecycle.js`, or `frontend/utils/sharedReceiptVerificationContract.js`; after changing receipt/verification readiness behavior; and before committing future 11-series scoring/readiness changes.

Success means:

- `PASS: 14/14 golden readiness smoke checks passed.`
- The current v0.1 covered golden readiness checks still pass.
- It does not mean all 15 golden cases are automated.

Coverage limits:

- GTC-015 Case Ordering / Record Selection is deferred to backend aggregation / record-selection smoke.
- The check does not render React pages, call network APIs, test backend/data files, or test Stripe/payment webhooks.

This smoke check is now the first local regression command for readiness/scoring work. Future automation should expand coverage rather than weaken or bypass this check.
