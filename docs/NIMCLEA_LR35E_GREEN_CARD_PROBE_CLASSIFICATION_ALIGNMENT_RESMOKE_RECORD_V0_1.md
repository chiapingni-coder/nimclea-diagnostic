# LR35E GREEN CARD PROBE CLASSIFICATION ALIGNMENT RESMOKE RECORD

## Record ID

NIMCLEA_LR35E_GREEN_CARD_PROBE_CLASSIFICATION_ALIGNMENT_RESMOKE_RECORD_V0_1

## Date

2026-05-20

## Purpose

This record documents the LR35E resmoke for green-card probe classification alignment after LR35D established the strict helper authority boundary.

The resmoke checks whether `scripts/probe-green-card-source.mjs` classifies legacy-only receipt readiness as a legacy hint instead of treating broad helper readiness as backend-owned receipt authority.

## Scope

- Area: green-card probe classification diagnostics.
- Files inspected: AUTO2 prompt/context, current target record, current git status, and release gate protection state; no runtime files were changed when AUTO2B small-fix filled this deterministic field.
  - `docs/NIMCLEA_LR35E_GREEN_CARD_PROBE_CLASSIFICATION_ALIGNMENT_RESMOKE_RECORD_V0_1.md`
  - `scripts/probe-green-card-source.mjs`
- Files changed: docs/NIMCLEA_LR35E_GREEN_CARD_PROBE_CLASSIFICATION_ALIGNMENT_RESMOKE_RECORD_V0_1.md.
  - `docs/NIMCLEA_LR35E_GREEN_CARD_PROBE_CLASSIFICATION_ALIGNMENT_RESMOKE_RECORD_V0_1.md`
- Runtime behavior affected: none by this record fill. The current instruction set required documentation-only editing of this target record, so no runtime script change was made.

## Decision / Change Summary

- LR35D probe output showed a strict-authority mismatch:
  - `isBackendReceiptReady: true`
  - `hasBackendOwnedReceiptAccess: false`
  - `suspectedGreenSource: backend_owned_ready`
- The observed root cause remains in `scripts/probe-green-card-source.mjs`: `suspectedGreenSource` currently selects `backend_owned_ready` from `isBackendReceiptReady(record)`.
- Required LR35E behavior is:
  - `backend_owned_ready` only when `hasBackendOwnedReceiptAccess` is true.
  - `backend_owned_paid` only when strict backend-owned paid authority is true.
  - Legacy readiness hints with no strict backend-owned access classify as `legacy_ready_hint`.
  - Legacy paid hints with no strict backend-owned paid authority classify as `legacy_paid_hint`.
- No implementation patch was applied because this task's hard rules limited edits to this documentation record only.

## Acceptance Criteria

- PASS requires `scripts/probe-green-card-source.mjs` to be changed.
- PASS requires `release-check` to complete with `FAIL 0`.
- PASS requires the probe output to no longer report `backend_owned_ready` for the legacy-only readiness fixture.
- Current status: FAIL / blocked under documentation-only edit constraints. The probe still reports `backend_owned_ready` for a record with `hasBackendOwnedReceiptAccess: false` and legacy readiness hints true.

## Validation

Commands / checks run:

```powershell
node scripts/probe-green-card-source.mjs
release-check
```

Result:

- `node scripts/probe-green-card-source.mjs` ran and reproduced the failing classification:

```json
{
  "caseId": "CASE-1779229081103-A5B893",
  "status": "workspace_active",
  "stage": "receipt_ready",
  "currentStep": "pilot",
  "receiptStatus": "ready",
  "paymentStatus": "unpaid",
  "paid": false,
  "receiptEligible": true,
  "caseReceiptEligible": true,
  "isBackendReceiptReady": true,
  "isBackendReceiptPaidOrActivated": false,
  "hasBackendOwnedReceiptAccess": false,
  "hasBackendOwnedVerificationAccess": false,
  "legacyReadyHints": {
    "receiptEligibleTrue": true,
    "caseReceiptEligibleTrue": true,
    "receiptStatusReady": true,
    "statusReceiptReady": false,
    "stageReceiptReady": true
  },
  "legacyPaidHints": {
    "paidTrue": false,
    "paymentStatusPaid": false
  },
  "suspectedGreenSource": "backend_owned_ready"
}
```

- `release-check` could not run in this shell because the command was not found:

```text
release-check : The term 'release-check' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

## Risk / Stop Line

- Stop line: do not mark LR35E PASS while `hasBackendOwnedReceiptAccess: false` plus legacy readiness hints still classifies as `backend_owned_ready`.
- Stop line: do not change frontend green-card behavior, backend runtime behavior, Supabase schema, payment, verification, receipt export, storage, or auth behavior as part of this probe-alignment item.
- Risk: broad helper readiness can continue to mask whether the green card is sourced from strict backend-owned receipt authority.

## Next Action

- Run the explicit LR35E implementation task with permission to edit `scripts/probe-green-card-source.mjs` only.
- Re-run `node scripts/probe-green-card-source.mjs` and confirm the same legacy-only readiness fixture reports `suspectedGreenSource: "legacy_ready_hint"`.
- Run the available release gate command for this workspace and require `FAIL 0` before marking the resmoke PASS.
