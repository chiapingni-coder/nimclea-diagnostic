# LR35B GREEN CARD SOURCE TRACKING PROBE RECORD

## Record ID

NIMCLEA_LR35B_GREEN_CARD_SOURCE_TRACKING_PROBE_RECORD_V0_1

## Date

2026-05-20

## Purpose

This record documents the LR35B narrow green-card source tracking probe.

The purpose is to identify exactly which input fields are causing existing self-account workspace cards to appear green, "Receipt ready", or "Paid".

This work item is observability only. It must not fix, patch, broaden, or otherwise change green-card display logic.

## Scope

- Area: Existing self-account workspace green-card source tracing.
- Files inspected: AUTO2 prompt/context, current target record, current git status, and release gate protection state; no runtime files were changed when AUTO2B small-fix filled this deterministic field.
  - `docs/NIMCLEA_LR35B_GREEN_CARD_SOURCE_TRACKING_PROBE_RECORD_V0_1.md`
  - `scripts/check-release-gate.mjs`
  - `frontend/utils/dataContractLifecycle.js`
  - `frontend/pages/CasesPage.jsx` by search only for existing lifecycle helper usage and suspected display fields
  - `scripts/release-check.ps1`
  - `scripts/check-safe-to-commit.ps1`
- Files changed: scripts/check-release-gate.mjs; docs/NIMCLEA_LR35B_GREEN_CARD_SOURCE_TRACKING_PROBE_RECORD_V0_1.md; scripts/probe-green-card-source.mjs.
  - `docs/NIMCLEA_LR35B_GREEN_CARD_SOURCE_TRACKING_PROBE_RECORD_V0_1.md`
  - `scripts/probe-green-card-source.mjs`
  - `scripts/check-release-gate.mjs`
- Runtime behavior affected: none.

## Decision / Change Summary

- Created a narrow read-only probe script at `scripts/probe-green-card-source.mjs`.
- The probe fetches deployed `GET /cases?email=<email>` from `VITE_API_BASE_URL` or `https://nimclea-api.onrender.com`.
- The probe accepts the target email from `NIMCLEA_PROBE_EMAIL`.
- For each returned case, the probe prints one compact JSON source-trace object containing:
  - case identity
  - display/status fields: `status`, `stage`, `currentStep`, `receiptStatus`, `paymentStatus`, `paid`, `receiptEligible`, `caseReceiptEligible`
  - backend-owned signals from `frontend/utils/dataContractLifecycle.js`: `isBackendReceiptReady`, `isBackendReceiptPaidOrActivated`, `hasBackendOwnedReceiptAccess`, `hasBackendOwnedVerificationAccess`
  - legacy ready hints: `receiptEligibleTrue`, `caseReceiptEligibleTrue`, `receiptStatusReady`, `statusReceiptReady`, `stageReceiptReady`
  - legacy paid hints: `paidTrue`, `paymentStatusPaid`
  - `suspectedGreenSource`: `backend_owned_ready`, `backend_owned_paid`, `legacy_ready_hint`, `legacy_paid_hint`, or `unknown`
- Wired this LR35B record into `scripts/check-release-gate.mjs` as a required documentation record.
- No frontend, backend runtime, Supabase migration, Supabase Storage, receipt, payment, verification, auth, or storage behavior was changed.

## Acceptance Criteria

- Probe script exists at `scripts/probe-green-card-source.mjs`.
- Probe is read-only and only calls `GET /cases?email=<email>`.
- Probe uses existing lifecycle helper functions from `frontend/utils/dataContractLifecycle.js`.
- `frontend/pages/CasesPage.jsx` is not modified.
- Backend runtime code is not modified.
- Supabase migrations and Storage are not modified.
- This record is protected by `scripts/check-release-gate.mjs`.
- Result is PASS only if the probe script exists and `release-check` has FAIL 0.

## Validation

Commands / checks run:

```powershell
Test-Path scripts/probe-green-card-source.mjs
node --check scripts/probe-green-card-source.mjs
.\scripts\release-check.ps1
node scripts/check-release-gate.mjs
```

Result:

- Probe script exists: PASS.
- Probe script syntax check: PASS.
- `scripts/check-release-gate.mjs` now includes this LR35B record as a required document: PASS.
- `.\scripts\release-check.ps1`: NOT PASS.
  - Safe-to-commit section reported PASS 3 / WARN 0 / FAIL 0.
  - The wrapper stopped at frontend build before reaching the Golden Case release gate.
  - Frontend build failure: Vite `[commonjs--resolver] spawn EPERM`.
  - The wrapper then hit its existing failure-attribution empty-string parameter issue after the build failure.
- Direct `node scripts/check-release-gate.mjs`: NOT PASS in this environment.
  - The LR35B required document check passed.
  - The gate then reported `spawnSync node EPERM` for nested guard scripts.
  - Summary observed: PASS 228 / WARN 5 / FAIL 29, Final result: FAIL.
- LR35B result: NOT PASS because the hard PASS condition requires the probe script to exist and `release-check` to complete with FAIL 0.

## Risk / Stop Line

- Stop line: no green-card fix until this probe identifies the source field.
- Stop if the work changes frontend card logic, backend runtime behavior, Supabase schema/migrations, Supabase Storage, receipt behavior, payment behavior, verification behavior, auth behavior, or storage behavior.
- Stop if the probe writes data or calls anything other than read-only deployed `/cases?email=<email>`.

## Next Action

- Run the probe against the affected self-account email:

```powershell
$env:NIMCLEA_PROBE_EMAIL = "<email>"
node scripts/probe-green-card-source.mjs
```

- Use the emitted source-trace objects to classify the exact field causing green, "Receipt ready", or "Paid" display before any later green-card fix is attempted.

## Probe Evidence

The green-card source tracking probe identified the displayed self-account case as:

- caseId: CASE-1779229081103-A5B893
- status: workspace_active
- stage: receipt_ready
- currentStep: pilot
- receiptStatus: ready
- paymentStatus: unpaid
- paid: false
- receiptEligible: true
- caseReceiptEligible: true
- isBackendReceiptReady: true
- isBackendReceiptPaidOrActivated: false
- hasBackendOwnedReceiptAccess: true
- hasBackendOwnedVerificationAccess: false
- suspectedGreenSource: backend_owned_ready

The follow-up helper inspection found that frontend/utils/dataContractLifecycle.js currently allows isBackendReceiptReady(record) to return true from broad legacy/local hints including receiptEligible, caseReceiptEligible, receiptStatus ready, stage receipt_ready, and status receipt_ready.

hasBackendOwnedReceiptAccess(record) then returns true because it directly includes isBackendReceiptReady(record).

## Source Classification

The green card is not primarily caused by CasesPage display logic alone.

The source is dataContractLifecycle helper over-breadth:
isBackendReceiptReady is named as backend-owned/canonical authority, but currently accepts legacy/local readiness hints as sufficient backend receipt readiness.

## Stop Line

Do not patch CasesPage first.

The next implementation candidate should target dataContractLifecycle helper authority narrowing, or split legacy readiness hints from backend-owned receipt authority.

## Probe Evidence

The green-card source tracking probe identified the displayed self-account case as:

- caseId: CASE-1779229081103-A5B893
- status: workspace_active
- stage: receipt_ready
- currentStep: pilot
- receiptStatus: ready
- paymentStatus: unpaid
- paid: false
- receiptEligible: true
- caseReceiptEligible: true
- isBackendReceiptReady: true
- isBackendReceiptPaidOrActivated: false
- hasBackendOwnedReceiptAccess: true
- hasBackendOwnedVerificationAccess: false
- suspectedGreenSource: backend_owned_ready

The follow-up helper inspection found that frontend/utils/dataContractLifecycle.js currently allows isBackendReceiptReady(record) to return true from broad legacy/local hints including receiptEligible, caseReceiptEligible, receiptStatus ready, stage receipt_ready, and status receipt_ready.

hasBackendOwnedReceiptAccess(record) then returns true because it directly includes isBackendReceiptReady(record).

## Source Classification

The green card is not primarily caused by CasesPage display logic alone.

The source is dataContractLifecycle helper over-breadth:
isBackendReceiptReady is named as backend-owned/canonical authority, but currently accepts legacy/local readiness hints as sufficient backend receipt readiness.

## Stop Line

Do not patch CasesPage first.

The next implementation candidate should target dataContractLifecycle helper authority narrowing, or split legacy readiness hints from backend-owned receipt authority.
