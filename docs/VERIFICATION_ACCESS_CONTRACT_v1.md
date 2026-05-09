# Verification Access Contract v1

## Purpose

VerificationPage must separate page access, preparation access, formal verification payment, and formal output/export. These are different product states and must not be collapsed into one checkout gate.

## Core Product Rule

Open Verification is navigation, not payment.

Receipt activation unlocks preparation.

Formal Verification payment unlocks formal determination.

Export is included after formal verification is paid/issued.

## Access Layers

| Layer | Access | Contract |
| --- | --- | --- |
| 1 | Open Verification | Allowed when `caseId` exists and receipt context exists. Should open VerificationPage even if formal verification is not available. Must not start checkout. |
| 2 | Verification Preparation | Allowed after backend-owned receipt paid / activated / issued. Allows upload or supplemental evidence preparation. Shows readiness checklist, missing items, warning/failure/repair path. Does not show final formal determination. |
| 3 | Start Formal Verification | Main verification payment point. Allowed only when backend-owned receipt/payment state supports it and readiness criteria are met. Starts checkout or formal verification workflow. |
| 4 | Formal Output / Export | Available only after verification is paid / active / issued. Includes formal determination, certificate, report, and one evidence package export. Should not be charged again for the first standard export. |

## Required Shared Gates

Intended helper names:

- `canOpenVerificationPage(context)`
- `canPrepareVerification(context)`
- `canStartFormalVerification(context)`
- `canViewFormalVerificationResult(context)`
- `canExportEvidencePackage(context)`

## Button Semantics

| Button | Required behavior |
| --- | --- |
| Open Verification | Always navigates to VerificationPage. Never calls checkout. |
| Activate Receipt / Unlock Formal Receipt | Starts receipt checkout only. |
| Start Formal Verification | Starts verification checkout only. |
| Export Evidence Package | Exports only after formal verification is paid/issued. |

## Anti-patterns

Forbidden:

- Open Verification starting Stripe checkout.
- Page access blocked just because formal verification is not paid.
- Local/cache/snapshot state unlocking formal verification.
- Showing formal result before verification payment.
- Charging separately for basic export after formal verification payment.

## Implementation Notes

ReceiptPage and VerificationPage should consume a shared helper in a later step. The helper should depend on backend-owned lifecycle signals from `dataContractLifecycle.js`.

## Status

Status: Draft contract

Next step: implement shared verification access helper
