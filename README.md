# Nimclea Diagnostic

## Local Validation

### Golden readiness smoke

Run from the repository root:

```powershell
node scripts/check-golden-readiness.mjs
node scripts/check-golden-backend-aggregation.mjs
```

Run this before changing readiness/scoring logic; after changing `frontend/utils/deterministicScore.js`, `frontend/utils/dataContractLifecycle.js`, or `frontend/utils/sharedReceiptVerificationContract.js`; after changing receipt/verification readiness behavior; and before committing future 11-series scoring/readiness changes.

Run the backend aggregation smoke before changing `/cases` backend aggregation, duplicate record selection, event merge, case ordering, payment/receipt overlay behavior, or title/name preservation behavior.

Success means:

- `PASS: 14/14 golden readiness smoke checks passed.`
- `PASS: 5/5 golden backend aggregation smoke checks passed.`
- The current v0.1 covered golden readiness checks still pass.
- GTC-015 backend aggregation checks still pass against in-memory pseudo fixtures.

Coverage limits:

- The check does not render React pages, call network APIs, test backend/data files, or test Stripe/payment webhooks.

This smoke check is now the first local regression command for readiness/scoring work. Future automation should expand coverage rather than weaken or bypass this check.
