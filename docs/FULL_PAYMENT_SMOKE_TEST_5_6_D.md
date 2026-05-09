# Full Payment Smoke Test 5.6-D

## Purpose

This smoke test validates that payment state is confirmed by backend Stripe confirmation and persisted at the correct boundary:

- workspace subscription belongs to Customer / Workspace
- receipt activation belongs to Case
- formal verification belongs to Case
- evidence package belongs to the completed case output

Reference documents:

- `docs/PAYMENT_SUBSCRIPTION_PERSISTENCE_AUDIT_5_6_A.md`
- `docs/CUSTOMER_CASE_BOUNDARY_CONTRACT_5_6_B4.md`
- `docs/PAYMENT_CUSTOMER_CASE_BOUNDARY_AUDIT_5_6_C.md`
- `docs/VERIFICATION_ACCESS_CONTRACT_v1.md`
- `docs/DATA_CONTRACT_LIFECYCLE_HELPER_5_5.md`

## Pre-test Requirements

- Latest master pulled
- `npm --prefix frontend run build` passes
- Render backend deployed to latest master
- Vercel frontend deployed to latest master
- Stripe test mode available
- Known test email available
- At least one test `caseId` available
- Browser localStorage state noted before testing
- DevTools Network tab open
- Do not manually mutate localStorage during test

## Payment Types Under Test

| Payment Type | Product Meaning | Boundary | Expected Backend Authority |
| --- | --- | --- | --- |
| `pilot_extension` | legacy technical name for `workspace_subscription` / workspace monthly plan | Customer / Workspace | backend-confirmed subscription state |
| `receipt_activation` | activates receipt baseline for one case | Case | backend-confirmed `receiptPayment` |
| `formal_verification` | starts formal verification workflow for one case | Case | backend-confirmed `verificationPayment` |

## Test A: Workspace Subscription / Legacy pilot_extension

Steps:

1. Open CasesPage with a known email.
2. Start workspace subscription / pilot extension checkout.
3. Confirm Stripe checkout URL or request includes `paymentType=pilot_extension`.
4. Complete test checkout.
5. Confirm success URL includes:
   - `checkout=success`
   - `session_id`
   - `paymentType=pilot_extension`
6. Confirm CasesPage calls backend `confirm-checkout-session`.
7. Confirm UI only treats subscription as paid after backend confirmation.
8. Confirm localStorage alone is not payment authority.

Expected:

- `subscriptionStatus` / `pilotExtensionPaid` is customer/workspace-level.
- No `receiptActivated` is written.
- No `verificationPaid` is written.
- No case lifecycle is upgraded because of subscription alone.

FAIL if:

- `checkout=success` without `session_id` marks paid.
- localStorage alone marks paid.
- subscription makes a case receipt paid.
- subscription makes a case verification paid.

## Test B: Receipt Activation Payment

Steps:

1. Open a receipt-ready case.
2. Click Unlock Formal Receipt / receipt activation action.
3. Confirm checkout creation includes:
   - `paymentType=receipt_activation`
   - `caseId`
4. Complete test checkout.
5. Confirm success URL includes:
   - `session_id`
   - `paymentType=receipt_activation`
   - `caseId`
6. Confirm ReceiptPage calls backend `confirm-checkout-session` with `paymentType=receipt_activation`.
7. Confirm backend response returns updated `caseRecord`.
8. Confirm `receiptPayment` is written on that case.

Expected:

- `receiptPayment.paymentType = receipt_activation`
- `receiptPayment.paymentStatus = paid`
- `receiptActivated = true`
- `paymentStatus` may be `paid` if it represents receipt payment in current model
- `verificationPaid` is not written
- `verificationActivated` is not written
- `subscriptionStatus` is not written
- another case is not unlocked

FAIL if:

- receipt activation creates `verificationPaid`.
- receipt activation creates subscription state.
- receipt activation works without `caseId`.
- paid URL/local state alone creates receipt payment.
- `markCaseAsPaid` writes paid state without `backendConfirmed` + `paymentType receipt_activation`.

## Test C: Formal Verification Payment

Steps:

1. Open VerificationPage from a green receipt case.
2. Confirm VerificationPage opens in review/preparation mode.
3. Confirm only one primary CTA is visible.
4. If not ready, primary CTA should be Show recovery path.
5. If ready and unpaid, primary CTA should be Start Formal Verification.
6. Click Start Formal Verification.
7. Confirm checkout creation includes:
   - `paymentType=formal_verification`
   - `caseId`
8. Complete test checkout.
9. Confirm success URL includes:
   - `checkout=success`
   - `session_id`
   - `paymentType=formal_verification`
   - `caseId`
10. Confirm VerificationPage calls backend `confirm-checkout-session`.
11. Confirm backend writes `verificationPayment` to the same case.

Expected:

- `verificationPayment.paymentType = formal_verification`
- `verificationPayment.paymentStatus = paid`
- `verificationPaid = true`
- `verificationActivated = true`
- `verificationPaymentStatus = paid`
- `receiptActivated` is not newly created by formal verification payment
- `subscriptionStatus` is not written
- `verificationStatus` may become active, but not issued
- export/final package remains locked until issued/export-ready

FAIL if:

- Open Verification starts checkout.
- receipt payment counts as formal verification payment.
- pilot extension counts as formal verification payment.
- formal verification payment writes `receiptActivated`.
- formal verification payment immediately marks `verification_issued`.
- local/cache/snapshot state creates formal verification paid.

## Test D: Single Verification CTA State Machine

| State | Expected CTA | Color | Payment? |
| --- | --- | --- | --- |
| Not ready / correction required | Show recovery path | Yellow | No |
| Ready but unpaid | Start Formal Verification | Yellow | Yes |
| Paid / active but not issued | Continue Verification | Green | No repeat payment |
| Issued / completed | View Final Package | Black | No |

FAIL if:

- two primary CTAs are shown at the same time.
- Show recovery path and Start Formal Verification appear together.
- payment CTA appears while structural sufficiency is not met.
- paid/active state asks for payment again.
- issued/completed state starts checkout.

## Test E: Boundary Isolation

Check:

- Customer subscription does not unlock case receipt.
- Customer subscription does not unlock case verification.
- One case receipt payment does not unlock another case receipt.
- One case verification payment does not unlock another case verification.
- Completed case does not mark customer completed.
- Evidence package belongs to its case.

## Network Checks

Verify Network tab includes:

- `create-checkout-session` request
- `confirm-checkout-session` request
- `session_id` present on success
- `paymentType` present
- `caseId` present for case-level payments
- backend confirmation happens before UI marks paid

## Data Checks

Suggested checks:

- Inspect `backend/data/subscriptionRecords.json` if applicable.
- Inspect `backend/data/users.json` for workspace subscription state.
- Inspect `backend/data/cases.json` for `receiptPayment` and `verificationPayment`.
- Inspect `backend/data/receiptRecords.json` only for receipt-related state.
- Confirm no unrelated `caseId` was modified.

## Pass Criteria

PASS when:

- All three payment types are distinguishable by `paymentType`.
- All successful payments require backend confirmation.
- localStorage is cache only, not authority.
- subscription remains customer/workspace-level.
- receipt activation remains case-level receipt payment.
- formal verification remains case-level verification payment.
- no payment path downgrades lifecycle.
- VerificationPage shows one primary CTA.

## Fail Criteria

FAIL when:

- checkout success without `session_id` marks paid.
- localStorage alone marks paid.
- `paymentType` is missing.
- case-level payment lacks `caseId`.
- subscription unlocks receipt or verification.
- receipt activation unlocks formal verification.
- formal verification payment marks issued/exported too early.
- multiple primary Verification CTAs appear.

## Known Non-blocking Warnings

- `pilot_extension` is a legacy technical name for `workspace_subscription`.
- `workspace_subscription` migration remains future work.
- formal evidence package export is not implemented yet.
- evidence package version model is not implemented yet.
- `html2pdf.js` mixed import warning remains.
- chunk size warning remains.

## Final 5.6-D Test Result Template

Status:

Build:

Backend deployed:

Frontend deployed:

Workspace subscription test:

Receipt activation test:

Formal verification test:

Single CTA test:

Boundary isolation:

Remaining blockers:

Ready for next step:

## Next Step

If smoke test passes, proceed to 5.6-E payment persistence checkpoint.

If smoke test fails, fix only the failing payment boundary or CTA behavior before expanding UI.
