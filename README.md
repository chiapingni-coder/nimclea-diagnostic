# Nimclea Diagnostic

## Local Validation

### Golden readiness smoke

Run from the repository root:

```powershell
npm run check:golden
```

Run this before changing readiness/scoring logic; after changing `frontend/utils/deterministicScore.js`, `frontend/utils/dataContractLifecycle.js`, or `frontend/utils/sharedReceiptVerificationContract.js`; after changing receipt/verification readiness behavior; and before committing future 11-series scoring/readiness changes.

Run the backend aggregation smoke before changing `/cases` backend aggregation, duplicate record selection, event merge, case ordering, payment/receipt overlay behavior, or title/name preservation behavior.

Success means:

- `PASS: 14/14 golden readiness smoke checks passed.`
- `PASS: 6/6 golden backend aggregation smoke checks passed.`
- The current v0.1 covered golden readiness checks still pass.
- GTC-015 backend aggregation checks still pass against in-memory pseudo fixtures.

Coverage limits:

- The check does not render React pages, call network APIs, test backend/data files, or test Stripe/payment webhooks.

This smoke check is now the first local regression command for readiness/scoring work. Future automation should expand coverage rather than weaken or bypass this check.

`npm run check:golden` is the final regression gate for the current golden smoke phase before changes touching case lifecycle, readiness, receipt, verification, or backend aggregation behavior are released or merged.

Run `node scripts/check-release-gate.mjs` before release. Then review `docs/NIMCLEA_LAUNCH_READINESS_FINAL_REVIEW_V0_1.md` and confirm any `WARN` items are manually reviewed or explicitly deferred. `FAIL` blocks release; `PASS` means the currently automated release gate checks passed.

Use `docs/NIMCLEA_DEVELOPMENT_RELEASE_CHECKLIST_V0_1.md` as the daily development and release checklist for applying this gate.

Before release, review `docs/NIMCLEA_PROGRESS_AND_RISK_MAP_V0_1.md`, then `docs/NIMCLEA_RELEASE_GATE_ALIGNMENT_V0_1.md`, and confirm unresolved risks are covered by smoke checks or explicitly deferred.

Use `docs/NIMCLEA_MANUAL_RELEASE_PROCEDURE_V0_1.md` for the minimal 5-step manual release procedure before pushing or deploying lifecycle-related changes.

Use `docs/NIMCLEA_RELEASE_NOTES_TEMPLATE_V0_1.md` to document completed change sets after the manual procedure and golden gate pass.

See `docs/NIMCLEA_RELEASE_NOTES_GOLDEN_GATE_PROCEDURE_HARDENING_V0_1.md` for the first release notes record covering the golden gate procedure hardening work.

See `docs/NIMCLEA_RELEASE_NOTES_INDEX_V0_1.md` for the central release notes index.
