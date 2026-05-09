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

## VerificationPage Single Primary Action Rule

VerificationPage should show only one primary action at a time.

The primary action is determined by the verification state:

| State | Primary action | Cost | Purpose | Payment rule |
| --- | --- | --- | --- | --- |
| Not ready / insufficient materials / correction required | Show recovery path or View required corrections | Free action | Explain what is missing and what the user should fix. | Must not start payment. |
| Ready for formal verification, but not paid | Start Formal Verification | Paid action | Begin the formal verification payment/workflow. | This is the main verification payment point. |
| Formal verification paid or active, but not issued | Continue Verification | No repeat payment | Continue file/evidence preparation or formal workflow. | Must not charge again. |
| Formal verification issued | Export Evidence Package | Included in the formal verification fee | Download the official verification output/package. | First standard evidence package export is included. |

Product rule:

If the record is not ready, the action is repair. If the record is ready, the action is payment. If payment is complete, the action is continuation. If verification is issued, the action is export.

Forbidden:

- Showing "Show recovery path" and "Activate verification" as two competing primary buttons.
- Showing a paid activation button while the page also says structural sufficiency is not met.
- Starting payment from a button whose visible meaning is repair/recovery.
- Making users pay before they understand what needs correction.
- Charging again for the first standard evidence package export after formal verification is paid/issued.

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

Next step: Implement VerificationPage CTA state machine so the page renders one primary action based on readiness/payment/issued state.
