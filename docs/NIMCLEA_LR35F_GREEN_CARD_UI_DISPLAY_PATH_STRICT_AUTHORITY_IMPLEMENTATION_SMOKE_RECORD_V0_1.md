# LR35F GREEN CARD UI DISPLAY PATH STRICT AUTHORITY IMPLEMENTATION SMOKE RECORD

## Record ID

NIMCLEA_LR35F_GREEN_CARD_UI_DISPLAY_PATH_STRICT_AUTHORITY_IMPLEMENTATION_SMOKE_RECORD_V0_1

## Date

2026-05-20

## Purpose

Document the LR35F implementation smoke for closing the remaining green-card UI display path where CasesPage could still show a workspace card as receipt-ready from legacy readiness hints after LR35D/LR35E.

## Scope

- Area: CasesPage workspace card display truthfulness for green / "Receipt ready" / formal paid UI state.
- Files inspected: frontend/pages/CasesPage.jsx; frontend/utils/dataContractLifecycle.js; scripts/check-release-gate.mjs- `frontend/pages/CasesPage.jsx`
  - `frontend/utils/dataContractLifecycle.js`
  - `scripts/check-green-card-helper-authority-boundary.mjs`
  - `scripts/check-receipt-readiness-visual-gate.mjs`
  - `scripts/check-release-gate.mjs`
  - `scripts/release-check.ps1`
  - This record.
- Files changed: frontend/pages/CasesPage.jsx; scripts/check-release-gate.mjs; docs/NIMCLEA_LR35F_GREEN_CARD_UI_DISPLAY_PATH_STRICT_AUTHORITY_IMPLEMENTATION_SMOKE_RECORD_V0_1.md- `frontend/pages/CasesPage.jsx`
  - `scripts/check-cases-page-green-card-display-authority.mjs`
  - `scripts/check-release-gate.mjs`
  - `docs/NIMCLEA_LR35F_GREEN_CARD_UI_DISPLAY_PATH_STRICT_AUTHORITY_IMPLEMENTATION_SMOKE_RECORD_V0_1.md`
- Runtime behavior affected: CasesPage workspace card display-path strict authority changed; legacy/local readiness hints alone should no longer render a green receipt-ready card; no backend, Supabase schema, payment provider, receipt export, verification, storage, or auth behavior changed.- CasesPage formal receipt-ready display now uses `hasBackendOwnedReceiptAccess(normalized)` as the UI receipt-ready authority.
  - Legacy readiness hints remain available only as diagnostic/context compatibility signals and no longer independently produce `receiptReady`, `hasReceiptStageSignal`, or "Receipt ready" display truthfulness.
  - CasesPage paid display now requires backend-owned paid/activated authority, or strict backend-owned access paired with the receipt paid helper.
  - Backend-case-missing fail-closed behavior is preserved.
  - No backend runtime, Supabase migration/schema, storage, payment provider, receipt export, verification, or auth behavior was changed.

## Before Evidence

Post-LR35E probe output showed:

```text
isBackendReceiptReady: true
hasBackendOwnedReceiptAccess: false
hasBackendOwnedVerificationAccess: false
suspectedGreenSource: legacy_ready_hint
```

The real UI still showed the workspace card as green / receipt-ready. Inspection confirmed `frontend/pages/CasesPage.jsx` still derived `directBackendReceiptReady` from `hasCanonicalBackendReceiptReadySignal(normalized)`, `receiptEligible`, `caseReceiptEligible`, `receiptStatus: ready`, and `status/stage: receipt_ready`.

## Implementation Summary

- Split CasesPage display derivation into strict authority and legacy diagnostic signals.
- Set `directBackendReceiptReady` to strict backend-owned receipt authority only.
- Kept legacy hints in `legacyBackendReceiptReadySignal` / `legacyReceiptReadySignal` for trace/context compatibility.
- Changed `paid` display derivation so local `paid: true` or `paymentStatus: paid` alone cannot produce formal paid display.
- Added a fail-closed display fallback so raw legacy `receipt_ready` status does not leak into the card label when strict receipt authority is absent.
- Added `scripts/check-cases-page-green-card-display-authority.mjs` to guard against reintroducing legacy readiness as the CasesPage green-card display authority.
- Wired the new guard and this LR35F record into `scripts/check-release-gate.mjs`.

## Acceptance Criteria

- If `hasBackendOwnedReceiptAccess(normalized)` is false and `hasBackendOwnedVerificationAccess(normalized)` is false, legacy readiness hints must not produce a green / receipt-ready card.
- `receiptEligible: true`, `caseReceiptEligible: true`, `receiptStatus: ready`, `stage/status: receipt_ready`, and `isBackendReceiptReady: true` must not independently produce UI green-card truthfulness.
- Paid display must require backend-owned paid/activated authority or strict backend-owned access paired with the receipt paid helper.
- Backend-case-missing fail-closed behavior must remain intact.

## Validation

Commands / checks run:

```powershell
node scripts/check-cases-page-green-card-display-authority.mjs
node scripts/check-green-card-helper-authority-boundary.mjs
git diff --check
npm --prefix frontend run build
node scripts/check-release-gate.mjs
.\scripts\release-check.ps1
```

Guard result:

- `node scripts/check-cases-page-green-card-display-authority.mjs`: PASS 7 / FAIL 0.
- `node scripts/check-green-card-helper-authority-boundary.mjs`: PASS 6 / FAIL 0.
- `git diff --check`: PASS, with Git line-ending warnings only.

Release-check result:

- `.\scripts\release-check.ps1`: FAIL in this environment before release gate, during frontend build, with Vite `[commonjs--resolver] spawn EPERM`.
- Direct `npm --prefix frontend run build`: same Vite `[commonjs--resolver] spawn EPERM`.
- Direct `node scripts/check-release-gate.mjs`: FAIL 31 because release-gate child `spawnSync node` calls returned `EPERM`; the LR35F doc existence check passed, but child-script guards could not be spawned by the release gate in this environment.
- No push was performed because release-check did not report FAIL 0.

## Risk / Stop Line

- Stop if the CasesPage display guard fails.
- Stop if release-check reports any FAIL.
- Do not push LR35F until release-check completes with FAIL 0 in an environment where Vite and release-gate child `node` processes can spawn successfully.

## Next Action

- Rerun `.\scripts\release-check.ps1` outside the current `spawn EPERM` blocker.
- Push only after release-check reports FAIL 0 and changed files include `frontend/pages/CasesPage.jsx` plus the LR35F guard/gate wiring.

