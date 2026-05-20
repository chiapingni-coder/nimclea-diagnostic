# LR35D GREEN CARD STRICT HELPER AUTHORITY IMPLEMENTATION SMOKE RECORD

## Record ID

NIMCLEA_LR35D_GREEN_CARD_STRICT_HELPER_AUTHORITY_IMPLEMENTATION_SMOKE_RECORD_V0_1

## Date

2026-05-20

## Purpose

This record documents the LR35D strict helper authority implementation and guard for green-card backend-owned truthfulness.

## Scope

- Area: Existing self-account green-card receipt authority helper boundary.
- Files inspected: frontend/utils/dataContractLifecycle.js; scripts/check-green-card-helper-authority-boundary.mjs; scripts/check-release-gate.mjs- frontend/utils/dataContractLifecycle.js
  - scripts/check-green-card-helper-authority-boundary.mjs
  - scripts/check-release-gate.mjs
  - `frontend/utils/dataContractLifecycle.js`
  - `frontend/pages/CasesPage.jsx`
  - `frontend/pages/ReceiptPage.jsx`
  - `scripts/probe-green-card-source.mjs`
  - `scripts/check-release-gate.mjs`
  - `scripts/release-check.ps1`
  - `docs/NIMCLEA_LR35C_GREEN_CARD_HELPER_AUTHORITY_NARROWING_CANDIDATE_RECORD_V0_1.md`
  - `docs/NIMCLEA_LR35_EXISTING_SELF_ACCOUNT_GREEN_CARD_TRUTHFULNESS_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
- Files changed: frontend/utils/dataContractLifecycle.js; scripts/check-green-card-helper-authority-boundary.mjs; scripts/check-release-gate.mjs; docs/NIMCLEA_LR35D_GREEN_CARD_STRICT_HELPER_AUTHORITY_IMPLEMENTATION_SMOKE_RECORD_V0_1.md- frontend/utils/dataContractLifecycle.js
  - scripts/check-green-card-helper-authority-boundary.mjs
  - scripts/check-release-gate.mjs
  - docs/NIMCLEA_LR35D_GREEN_CARD_STRICT_HELPER_AUTHORITY_IMPLEMENTATION_SMOKE_RECORD_V0_1.md
  - `frontend/utils/dataContractLifecycle.js`
  - `scripts/check-green-card-helper-authority-boundary.mjs`
  - `scripts/check-release-gate.mjs`
  - `docs/NIMCLEA_LR35D_GREEN_CARD_STRICT_HELPER_AUTHORITY_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
- Runtime behavior affected: Frontend helper authority semantics changed; legacy/local readiness hints alone should no longer qualify as backend-owned green-card receipt authority; no backend, Supabase schema, payment provider, receipt export, verification, storage, or auth behavior changed.- Frontend helper authority semantics changed.
  - Legacy/local readiness hints alone should no longer qualify as backend-owned green-card receipt authority.
  - No backend, Supabase schema, payment provider, receipt export, verification, storage, or auth behavior changed.
  - `isBackendReceiptReady(record)` remains the broad legacy compatibility readiness helper.
  - New strict helpers require backend/canonical receipt authority evidence before accepting receipt-ready, paid, activated, or issued signals.
  - `hasBackendOwnedReceiptAccess(record)` now uses the strict receipt helpers, so legacy/local receipt hints alone no longer satisfy the green-card backend-owned receipt access path.

## Decision / Change Summary

- Implemented strict backend-owned receipt authority semantics in `frontend/utils/dataContractLifecycle.js`.
- Added strict helper exports:
  - `isBackendOwnedReceiptReady(record)`
  - `isBackendOwnedReceiptPaidOrActivated(record)`
  - `isBackendOwnedReceiptIssued(record)`
  - `hasStrictBackendOwnedReceiptAccess(record)`
- Added internal authority evidence detection that fails closed when fallback/local source tokens are present and otherwise requires backend/canonical/Stripe/confirmed/Supabase source evidence or explicit backend-owned/canonical receipt flags.
- Preserved the legacy `isBackendReceiptReady(record)` and `isBackendReceiptPaidOrActivated(record)` helpers for compatibility.
- Updated `hasBackendOwnedReceiptAccess(record)` to use the strict backend-owned receipt helpers for receipt authority.
- Added `scripts/check-green-card-helper-authority-boundary.mjs` and wired it into `scripts/check-release-gate.mjs`.

## Acceptance Criteria

- Legacy-only readiness hints do not satisfy strict backend-owned receipt readiness.
- Legacy-only readiness hints do not satisfy `hasBackendOwnedReceiptAccess(record)`.
- Explicit backend/canonical receipt authority evidence does satisfy strict backend-owned receipt access.
- Legacy-only paid hints do not satisfy strict backend-owned paid/activated authority.
- Release gate includes the LR35D record and green-card helper authority boundary guard.

## Validation

Commands / checks run:

```powershell
node scripts/check-green-card-helper-authority-boundary.mjs
.\scripts\release-check.ps1
node scripts/check-release-gate.mjs
```

Result:

- `node scripts/check-green-card-helper-authority-boundary.mjs`: PASS 6 / FAIL 0.
- `.\scripts\release-check.ps1`: NOT PASS. `git diff --check` reached no reported diff errors and safe-to-commit passed PASS 3 / WARN 0 / FAIL 0, then frontend build failed before release gate with Vite `[commonjs--resolver] spawn EPERM`. The script then hit its existing empty-`FailureDetail` attribution error.
- `node scripts/check-release-gate.mjs`: NOT PASS in this environment. The LR35D record exists, but child `spawnSync node` calls failed with `EPERM`, including the newly wired green-card helper authority boundary guard. The same guard passed when run directly.

## Risk / Stop Line

- Do not claim LR35D release PASS until `.\scripts\release-check.ps1` completes with FAIL 0.
- Do not allow legacy/local hints such as `receiptEligible true`, `caseReceiptEligible true`, `receipt_ready true`, `receipt.eligible true`, `receiptStatus ready`, `receiptStatus receipt_ready`, `stage receipt_ready`, `status receipt_ready`, `paid true`, or `paymentStatus paid` to satisfy backend-owned green-card receipt authority without explicit backend/canonical authority evidence.
- Remaining validation blocker is the local Windows child-process `EPERM` failure during Vite build and release-gate child process execution, not a failure of the LR35D guard when run directly.

## Next Action

- Rerun `.\scripts\release-check.ps1` in an environment where Vite and release-gate child `node` processes can spawn successfully.
- Mark LR35D PASS only after release-check reports FAIL 0 with the changed files including `frontend/utils/dataContractLifecycle.js` and `scripts/check-green-card-helper-authority-boundary.mjs`.


