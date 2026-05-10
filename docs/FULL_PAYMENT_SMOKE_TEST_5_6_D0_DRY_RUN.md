# Full Payment Smoke Test 5.6-D0 Dry Run

## Summary

This dry-run statically inspected the three payment paths before real Stripe payment smoke testing. No Stripe checkout was completed, no production data was manually mutated, and no frontend/backend code was changed.

Dry-run result: PASS with warnings. The payment paths are distinguishable by `paymentType`, route to separate backend confirmation branches, and require backend Stripe confirmation before writing paid state. Real Stripe smoke testing is safe to run next if the tester accounts for the documented warnings.

## Files Inspected

- `backend/routes/stripe.js`
- `frontend/pages/CasesPage.jsx`
- `frontend/pages/ReceiptPage.jsx`
- `frontend/pages/VerificationPage.jsx`
- `frontend/utils/caseRegistry.js`
- `frontend/utils/dataContractLifecycle.js`
- `docs/FULL_PAYMENT_SMOKE_TEST_5_6_D.md`
- `docs/CUSTOMER_CASE_BOUNDARY_CONTRACT_5_6_B4.md`
- `docs/PAYMENT_CUSTOMER_CASE_BOUNDARY_AUDIT_5_6_C.md`
- `docs/VERIFICATION_ACCESS_CONTRACT_v1.md`

## Payment Path Table

| Path | Boundary | Checkout request | Success URL | Cancel URL | Backend confirmation | Dry-run status |
| --- | --- | --- | --- | --- | --- | --- |
| Workspace subscription / legacy `pilot_extension` | Customer / Workspace | CasesPage sends `priceType: "pilot_extension"`, `paymentType: "pilot_extension"`, `email`, and best available `caseId` | `/cases?checkout=success&session_id={CHECKOUT_SESSION_ID}&paymentType=pilot_extension` | `/cases?checkout=cancel&paymentType=pilot_extension` | Branches on `pilot_extension`, verifies Stripe paid status, writes subscription/user state | PASS |
| Receipt activation | Case | ReceiptPage sends `paymentType: "receipt_activation"`, `priceType: "receipt_activation"`, and `caseId` | `/receipt?caseId=...&session_id={CHECKOUT_SESSION_ID}&paid=success&paymentType=receipt_activation` | `/receipt?caseId=...&paid=cancel&paymentType=receipt_activation` | Branches on `receipt_activation`, verifies Stripe paid status and case match, writes receipt payment state | PASS with warning |
| Formal verification | Case | VerificationPage sends `paymentType: "formal_verification"`, `priceType: "formal_verification"`, `caseId`, and `email` | `/verification?caseId=...&checkout=success&session_id={CHECKOUT_SESSION_ID}&paymentType=formal_verification` | `/verification?caseId=...&checkout=cancel&paymentType=formal_verification` | Branches on `formal_verification`, verifies Stripe paid status and case match, writes verification payment state | PASS with warning |

## PASS Findings

### Static route/request inspection

- PASS: Workspace subscription checkout is typed as `pilot_extension` in CasesPage and backend Stripe metadata.
- PASS: Workspace subscription checkout sends `email` and best available `caseId`; `caseId` is not treated as required authority for this customer/workspace-level payment.
- PASS: Receipt activation checkout sends `paymentType: "receipt_activation"`, `priceType: "receipt_activation"`, and requires `caseId`.
- PASS: Formal verification checkout sends `paymentType: "formal_verification"`, `priceType: "formal_verification"`, `caseId`, and `email`.

### Success/cancel URL inspection

- PASS: Workspace subscription success URL includes `checkout=success`, `session_id={CHECKOUT_SESSION_ID}`, and `paymentType=pilot_extension`.
- PASS: Workspace subscription cancel URL includes `checkout=cancel` and `paymentType=pilot_extension`.
- PASS: Receipt activation success URL includes `caseId`, `session_id={CHECKOUT_SESSION_ID}`, and `paymentType=receipt_activation`.
- PASS: Receipt activation cancel URL includes `caseId` and `paymentType=receipt_activation`.
- PASS: Formal verification success URL includes `caseId`, `checkout=success`, `session_id={CHECKOUT_SESSION_ID}`, and `paymentType=formal_verification`.
- PASS: Formal verification cancel URL includes `caseId`, `checkout=cancel`, and `paymentType=formal_verification`.

### Backend confirmation inspection

- PASS: `/api/confirm-checkout-session` retrieves the Stripe session before writing paid state.
- PASS: Confirmation reads payment type from Stripe metadata first, then metadata `priceType`, then request body fallback.
- PASS: Confirmation branches separately for `pilot_extension`, `formal_verification`, and `receipt_activation`.
- PASS: Formal verification confirmation requires a case id and rejects Stripe session case mismatch.
- PASS: Receipt activation confirmation requires a case id and rejects Stripe session case mismatch.
- PASS: All three paid branches require `session.payment_status === "paid"` before persistence.

### Boundary inspection

- PASS: `pilot_extension` writes subscription/user state through `subscriptionStatus`, `pilotExtensionPaid`, subscription records, and user subscription records.
- PASS: `pilot_extension` does not write `receiptActivated`, `verificationPaid`, or `verificationActivated`.
- PASS: `receipt_activation` writes `receiptPayment` and receipt activation state only on the supplied case.
- PASS: `receipt_activation` does not write `subscriptionStatus`, `verificationPaid`, or `verificationActivated`.
- PASS: `formal_verification` writes `verificationPayment`, `verificationPaid`, and `verificationActivated` only on the supplied case.
- PASS: `formal_verification` does not write `subscriptionStatus`, does not set `receiptActivated`, and does not mark `verification_issued`.

### Frontend return handling inspection

- PASS: CasesPage ignores `checkout=success&paymentType=pilot_extension` without `session_id` and shows an error instead of marking paid.
- PASS: CasesPage confirms `pilot_extension` with backend before setting UI state or writing the `nimclea_pilot_extension_paid` cache.
- PASS: ReceiptPage requires `paid=success`, `session_id`, and `caseId` before calling backend confirmation.
- PASS: ReceiptPage sends `paymentType: "receipt_activation"` to backend confirmation.
- PASS: `markCaseAsPaid()` only writes paid receipt fields when called with `backendConfirmed === true` and `paymentType === "receipt_activation"`; otherwise it writes an unconfirmed cache marker.
- PASS: VerificationPage requires `checkout=success`, `paymentType=formal_verification`, `session_id`, and `caseId` before backend confirmation.
- PASS: VerificationPage handles `checkout=cancel&paymentType=formal_verification` without marking paid.
- PASS: Open Verification remains navigation/review behavior and does not start checkout.
- PASS: Start Formal Verification is the only path that calls formal verification checkout.

### Single CTA dry-run

| State | Expected CTA | Dry-run result |
| --- | --- | --- |
| Not ready / correction required | Show recovery path, no payment | PASS |
| Ready but unpaid | Start Formal Verification, `paymentType=formal_verification` | PASS |
| Paid / active but not issued | Continue Verification, no repeat payment | PASS |
| Issued / completed | View Final Package, no payment | PASS |

## WARNING Findings

### WARNING 1: Receipt return URLs still use legacy `paid` query state

Receipt activation is correctly typed and backend-confirmed, but its return URLs use `paid=success` and `paid=cancel` instead of the newer `checkout=success` and `checkout=cancel` convention. This is not a blocker because ReceiptPage explicitly handles `paid=success` only when `session_id` and `caseId` are present, and confirmation still passes `paymentType=receipt_activation`.

Real smoke test note: validate receipt activation using `paid=success` / `paid=cancel` plus `session_id`, `caseId`, and `paymentType=receipt_activation`.

### WARNING 2: `pilot_extension` remains a legacy technical name

The route and frontend correctly use `pilot_extension` as the current payment type, but the product meaning is workspace subscription / workspace monthly plan. This remains a naming warning, not a dry-run blocker.

Future migration should introduce `workspace_subscription` and treat `pilot_extension` as a legacy alias before renaming code paths.

### WARNING 3: Workspace subscription may attach subscription state to a case-shaped record

The backend confirmation path may call `attachCaseSubscriptionRecord()` when a case id is available. This does not write receipt or verification paid state, but it can duplicate customer/workspace subscription state onto a case-shaped record for display.

Real smoke test note: verify UI treats this as customer/workspace subscription state only.

### WARNING 4: VerificationPage paid/active CTA predicate remains broad

VerificationPage derives paid/active CTA state from backend-fed case records, but the local predicate still checks broad boolean/status fields rather than directly using the shared source-aware verification payment helper. Current hydration is backend-first, so this is not a blocker for D0, but it remains a hardening item.

Real smoke test note: verify local/cache/snapshot state cannot create formal verification paid UI.

## FAIL Findings

No FAIL findings in this dry-run.

## Safe for Real Stripe Smoke Test

Yes. The static dry-run found no payment boundary blocker before real Stripe smoke testing.

Run the real smoke test with these guardrails:

- Do not complete payment unless using Stripe test mode.
- Confirm every success return includes `session_id`.
- Confirm every case-level payment includes the expected `caseId`.
- Confirm UI paid state appears only after backend confirmation succeeds.
- Confirm no unrelated case id changes after each payment.
- Treat receipt activation's `paid=success` query as a known legacy receipt return convention.

## Blockers Before Real Payment Test

None.

## Recommended Real Smoke Test Focus

- Workspace subscription: confirm `pilot_extension` creates only customer/workspace subscription state.
- Receipt activation: confirm `receipt_activation` creates only receipt payment state for the same case.
- Formal verification: confirm `formal_verification` creates only verification payment state for the same case and does not mark issued/exported.
- Verification CTA: confirm only one primary CTA appears in each state.
- Boundary isolation: confirm one case payment never unlocks another case.

## Final Result

Status: PASS with warnings

Dry-run result: Static payment paths are correctly typed, routed, and backend-confirmed before paid state writes.

Remaining FAIL: None

Remaining WARNING: Receipt return URLs use legacy `paid=success/cancel`; `pilot_extension` remains legacy naming; workspace subscription can be attached to case-shaped records for display; VerificationPage paid/active CTA predicate remains broad.

Safe for real Stripe smoke test: Yes

Recommended next step: Run the 5.6-D real Stripe test-mode smoke test using `docs/FULL_PAYMENT_SMOKE_TEST_5_6_D.md`, then proceed to 5.6-E payment persistence checkpoint if it passes.
