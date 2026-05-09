# Payment Customer / Case Boundary Audit 5.6-C

## Purpose

This audit verifies current payment persistence against the Customer / Case Boundary Contract 5.6-B4. It checks whether customer/workspace subscription state, case-scoped receipt payment, case-scoped formal verification payment, and future package/version state remain separated across frontend, backend, and local cache paths.

Re-audit note: This document was updated after commit `a294740` to specifically re-check the two previous FAIL items: typed receipt activation payment persistence and `caseRegistry.markCaseAsPaid()` local-only authority risk.

## References

- `docs/CUSTOMER_CASE_BOUNDARY_CONTRACT_5_6_B4.md`
- `docs/PAYMENT_SUBSCRIPTION_PERSISTENCE_AUDIT_5_6_A.md`
- `docs/VERIFICATION_ACCESS_CONTRACT_v1.md`
- `docs/DATA_CONTRACT_LIFECYCLE_HELPER_5_5.md`

## Files Audited

| Area | Files |
| --- | --- |
| Frontend pages | `frontend/pages/CasesPage.jsx`, `frontend/pages/ReceiptPage.jsx`, `frontend/pages/VerificationPage.jsx` |
| Frontend helpers/cache | `frontend/utils/dataContractLifecycle.js`, `frontend/utils/caseRegistry.js` |
| Backend routes/data setup | `backend/routes/stripe.js`, `backend/server.js`, `backend/routes/caseRoutes.js`, `backend/utils/ensureDataFiles.js` |
| Backend data | `backend/data/cases.json`, `backend/data/users.json`, `backend/data/trials.json`, `backend/data/receiptRecords.json`, `backend/data/subscriptionRecords.json` if present |

## Findings

### 1. Pilot extension checkout is typed as customer/workspace payment

- Status: PASS
- Location: `backend/routes/stripe.js`, `createCheckoutSession()`, approx. lines 395-439
- Boundary affected: Customer / Workspace payment boundary
- Risk: Low. Pilot extension checkout uses `paymentType: "pilot_extension"` and `priceType: "pilot_extension"` metadata and does not reuse receipt or formal verification branches.
- Suggested fix: Keep this typed branch separate from case-level payment branches.

### 2. Pilot extension confirmation persists customer/workspace subscription state

- Status: PASS
- Location: `backend/routes/stripe.js`, `POST /confirm-checkout-session`, approx. lines 576-641; `updateSubscriptionCheckoutRecord()`, approx. lines 240-305; `updateUserSubscriptionRecord()`, approx. lines 307-353
- Boundary affected: Customer / Workspace payment boundary
- Risk: Low. Confirmation verifies Stripe, then writes `subscriptionStatus`, `pilotExtensionPaid`, `pilotExtensionPaidAt`, `pilotExtensionPaymentStatus`, Stripe customer/subscription ids, and `paymentType: "pilot_extension"` into subscription/user-level records.
- Suggested fix: In a later step, move the user/workspace subscription read/write API behind an explicit workspace/customer endpoint.

### 3. Pilot extension does not create receipt or verification payment state

- Status: PASS
- Location: `backend/routes/stripe.js`, pilot extension confirmation branch, approx. lines 576-641
- Boundary affected: Subscription boundary
- Risk: Low. The branch does not write `receiptActivated`, `receiptIssued`, `verificationPaid`, `verificationActivated`, or `verificationIssued`.
- Suggested fix: Keep automated tests around this branch when payment tests are added.

### 4. Pilot extension state is attached to cases as a non-lifecycle subscription object

- Status: WARNING
- Location: `backend/routes/stripe.js`, `attachCaseSubscriptionRecord()`, approx. lines 355-382; `backend/server.js`, `/cases`, approx. lines 630-644
- Boundary affected: Customer / Workspace payment boundary
- Risk: Medium. The implementation optionally attaches `subscription` to a case and `/cases?email` merges the same backend subscription into each returned case for that email. This does not currently create receipt or verification paid state, but it duplicates customer/workspace state onto case-shaped records and could be misread by future UI.
- Suggested fix: Keep `subscription` visually and semantically labeled as workspace/customer state, or return workspace subscription separately from the case list payload.

### 5. CasesPage treats pilot extension paid state as backend-confirmed subscription only

- Status: PASS
- Location: `frontend/pages/CasesPage.jsx`, approx. lines 814-818, 1000-1012, 1060-1156
- Boundary affected: UI display boundary / Customer payment boundary
- Risk: Low. CasesPage requires `_backendConfirmed`, `pilotExtensionPaid === true`, and `paymentType === "pilot_extension"` before displaying subscription active state.
- Suggested fix: Continue avoiding localStorage-only subscription authority.

### 6. Pilot extension localStorage cache is downgraded to cache after confirmation

- Status: PASS
- Location: `frontend/pages/CasesPage.jsx`, approx. lines 1129-1141
- Boundary affected: Local/cache risk
- Risk: Low. `nimclea_pilot_extension_paid` is written only after backend confirmation and includes `source: "stripe_checkout_confirmed_cache"`.
- Suggested fix: Eventually replace this cache with a backend workspace subscription read.

### 7. Receipt activation is case-scoped by caseId

- Status: PASS
- Location: `frontend/pages/ReceiptPage.jsx`, approx. lines 1295-1345 and 1828-1848; `backend/routes/stripe.js`, receipt checkout/confirm branch, approx. lines 484-529 and 743-793
- Boundary affected: Case payment boundary / Receipt payment boundary
- Risk: Low. Receipt checkout requires `caseId`, returns to ReceiptPage with `caseId`, confirms against Stripe, checks session case metadata when present, and writes receipt activation only to that case record and receipt payment record.
- Suggested fix: Keep `caseId` required for receipt activation.

### 8. Receipt activation does not create formal verification payment or subscription state

- Status: PASS
- Location: `backend/routes/stripe.js`, receipt confirmation branch, approx. lines 743-793
- Boundary affected: Receipt payment boundary
- Risk: Low. Receipt confirmation writes `receiptActivated: true`, `receipt.paid: true`, `payment.receiptActivated: true`, and `isPaid: true`, while explicitly setting `verificationActivated: false`.
- Suggested fix: Preserve this separation when adding typed receipt payment fields.

### 9. Receipt activation writes payment state with explicit paymentType

- Status: PASS
- Location: `backend/routes/stripe.js`, receipt checkout/confirm branch, approx. lines 493-530 and 739-833; `frontend/pages/ReceiptPage.jsx`, approx. lines 1309-1318 and 1836-1844
- Boundary affected: Anti-pattern scan / Case payment boundary
- Risk: Low. Receipt activation now sends `paymentType: "receipt_activation"` and `priceType: "receipt_activation"` from ReceiptPage, stores those values in Stripe metadata and receipt return URLs, rejects unsupported confirmation payment types, and persists typed receipt payment state into both the case `receiptPayment` object and `receiptRecords.json`.
- Suggested fix: Keep receipt activation confirmation type-gated and preserve `paymentType: "receipt_activation"` in future receipt payment migrations.

### 10. Formal verification checkout is distinct from receipt and subscription checkout

- Status: PASS
- Location: `backend/routes/stripe.js`, `createCheckoutSession()`, approx. lines 442-481; `frontend/pages/VerificationPage.jsx`, approx. lines 2983-3026
- Boundary affected: Formal verification payment boundary
- Risk: Low. Formal verification sends `paymentType: "formal_verification"`, requires `caseId`, uses a distinct product/price branch, and does not reuse pilot extension or receipt activation checkout behavior.
- Suggested fix: Keep the formal verification branch explicitly typed.

### 11. Formal verification confirmation writes only case-scoped verification payment state

- Status: PASS
- Location: `backend/routes/stripe.js`, formal verification confirmation branch, approx. lines 645-732
- Boundary affected: Case payment boundary / Formal verification payment boundary
- Risk: Low. Confirmation requires `caseId`, verifies Stripe payment, checks session case metadata, and writes `verificationPayment`, `verificationPaid`, `verificationActivated`, `verificationPaymentStatus`, and timestamps to the matching case.
- Suggested fix: Add tests proving a formal verification session cannot update a different `caseId`.

### 12. Formal verification payment does not mark issued/exported state

- Status: PASS
- Location: `backend/routes/stripe.js`, formal verification confirmation branch, approx. lines 645-732
- Boundary affected: Evidence package / version boundary
- Risk: Low. The branch sets paid/activated workflow state and preserves stronger existing verification lifecycle, but does not set `verification_issued`, `verificationIssued`, export fields, package ids, or package hashes.
- Suggested fix: Keep package/version issuance in a separate future package workflow.

### 13. VerificationPage confirms formal verification payment by caseId and typed paymentType

- Status: PASS
- Location: `frontend/pages/VerificationPage.jsx`, approx. lines 1572-1667 and 2983-3026
- Boundary affected: Formal verification payment boundary
- Risk: Low. Return handling requires `checkout=success`, `paymentType=formal_verification`, `session_id`, and `caseId` before calling `/api/confirm-checkout-session`.
- Suggested fix: Keep `caseId` in every VerificationPage payment return URL and state update.

### 14. VerificationPage single primary CTA reduces cross-boundary payment confusion

- Status: PASS
- Location: `frontend/pages/VerificationPage.jsx`, approx. lines 3068-3156 and 3710-3802
- Boundary affected: UI display boundary / Verification access boundary
- Risk: Low. The primary CTA state machine separates repair, formal verification payment, continuation, and final package states. It does not start payment from recovery states.
- Suggested fix: In 5.6-D, smoke test each CTA state with backend-paid and unpaid cases.

### 15. VerificationPage paid/active display reads backend case fields but does not validate payment source locally

- Status: WARNING
- Location: `frontend/pages/VerificationPage.jsx`, `formalVerificationPaidOrActive`, approx. lines 3072-3092
- Boundary affected: Local/cache risk / Formal verification payment boundary
- Risk: Medium. The value is derived from `backendCanonicalCase`, so the current source is backend-first. However, the local predicate checks booleans and status strings directly and does not require `verificationPayment.source === "stripe_checkout_confirmed"` the way `dataContractLifecycle.js` does.
- Suggested fix: Use a shared helper for backend-owned formal verification payment detection so source validation is centralized.

### 16. Lifecycle helper blocks fallback verification payment authority

- Status: PASS
- Location: `frontend/utils/dataContractLifecycle.js`, `hasBackendOwnedVerificationPayment()`, approx. lines 60-110
- Boundary affected: Local/cache risk / Formal verification payment boundary
- Risk: Low. The helper rejects fallback/local/cache/snapshot records and requires trusted backend/Stripe/confirmed source for verification payment signals.
- Suggested fix: Export and reuse this helper explicitly in VerificationPage.

### 17. Receipt payment helper still accepts broad generic paid fields

- Status: WARNING
- Location: `frontend/utils/dataContractLifecycle.js`, `isBackendReceiptPaidOrActivated()`, approx. lines 140-180
- Boundary affected: Case payment boundary / Local/cache risk
- Risk: Medium. The helper blocks fallback sources, but still treats generic top-level `paid`, `isPaid`, and `paymentStatus: "paid"` as receipt payment. Backend receipt confirmation currently writes those fields, but typed receipt payment would reduce ambiguity with future case-level payments.
- Suggested fix: Add typed `receiptPayment` detection and gradually prefer it over generic fields.

### 18. caseRegistry markCaseAsPaid no longer writes local-only authority-shaped receipt payment

- Status: PASS
- Location: `frontend/utils/caseRegistry.js`, `markCaseAsPaid()`, approx. lines 303-342
- Boundary affected: Local/cache risk / Case payment boundary
- Risk: Low. The helper now requires `backendConfirmed === true` and `paymentType === "receipt_activation"` before writing `receiptPayment` and `receipt.paid: true`. Unconfirmed calls write only `receiptPaymentCache` with `status: "unconfirmed"`, `backendConfirmed: false`, and `source: "local_cache_marker"`, so the helper no longer acts as a local-only authority-shaped receipt payment writer.
- Suggested fix: Keep this helper cache-only in practice. If it is reintroduced into a payment flow, pass through a backend-confirmed receipt activation payload and avoid treating `receiptPaymentCache` as payment truth.

### 19. PaymentSuccessPage local cache write remains backend-confirmed but outside audit file list

- Status: WARNING
- Location: `frontend/pages/PaymentSuccessPage.jsx`, approx. lines 33-78
- Boundary affected: Local/cache risk / Receipt payment boundary
- Risk: Low to medium. This file was not in the required 5.6-C audit list, but it still confirms with backend before writing caseRegistry paid fields. The cache write is acceptable but should remain source-marked and non-authoritative.
- Suggested fix: Include `PaymentSuccessPage.jsx` in the 5.6-D payment smoke test.

### 20. Backend /cases merges customer subscription into every returned case for the customer

- Status: WARNING
- Location: `backend/server.js`, `/cases`, approx. lines 424-452 and 630-644
- Boundary affected: Customer / Case boundary
- Risk: Medium. This is useful for CasesPage display, but a case list consumer could mistake `case.subscription` or top-level `pilotExtensionPaid` as case-owned state. Current frontend uses it only for subscription display.
- Suggested fix: Return a separate envelope such as `{ cases, customerSubscription }` in a future API revision.

### 21. Backend receipt-status patch is case-scoped and not payment-producing

- Status: PASS
- Location: `backend/routes/caseRoutes.js`, `PATCH /case/:caseId/receipt-status`, approx. lines 271-319
- Boundary affected: Lifecycle boundary / Receipt payment boundary
- Risk: Low for payment. The endpoint updates receipt readiness fields for one case and does not write receipt paid, verification paid, or subscription fields.
- Suggested fix: Add backend lifecycle no-downgrade enforcement later, but payment boundary is intact.

### 22. Data setup includes subscriptionRecords store

- Status: PASS
- Location: `backend/utils/ensureDataFiles.js`, approx. lines 5-12
- Boundary affected: Customer / Workspace payment boundary
- Risk: Low. `subscriptionRecords.json` is part of required data setup.
- Suggested fix: Ensure deployment runs `ensureDataFiles()` before accepting checkout writes.

### 23. subscriptionRecords.json is absent in current workspace data

- Status: WARNING
- Location: `backend/data/subscriptionRecords.json`
- Boundary affected: Backend data persistence visibility
- Risk: Low. The file is configured by `ensureDataFiles.js` and will be created if setup runs or checkout writes occur. Its absence means no live subscription records were available for data inspection.
- Suggested fix: Run backend data initialization in environments before payment testing.

### 24. Evidence package/version payment boundary is not implemented yet

- Status: PASS
- Location: `frontend/pages/VerificationPage.jsx`, `backend/routes/stripe.js`, audited payment/export paths
- Boundary affected: Evidence package / version boundary
- Risk: Low. Current code does not treat export/download as customer-level or global case completion. Formal verification payment does not create an issued package.
- Suggested fix: When package export is implemented, model package/version fields separately from customer and case payments.

## Overall Assessment

| Metric | Result |
| --- | --- |
| Overall boundary compliance score | 92 / 100 |
| Remaining FAIL items | 0 |
| Remaining WARNING items | 8 |
| 5.6-C passes | Yes, with warnings |
| Safe to proceed to 5.6-D / full payment smoke test | Yes |

## Remaining FAIL Items

| # | Issue |
| --- | --- |
| None | No remaining FAIL items after commit `a294740`. |

## Remaining WARNING Items

| Theme | Impact |
| --- | --- |
| Customer subscription duplicated into case list records | Could confuse future case-level UI if not clearly labeled. |
| VerificationPage local paid/active predicate does not itself require trusted source | Currently backend-fed, but should use a shared source-aware helper. |
| Receipt payment helper accepts generic `paid` / `isPaid` / `paymentStatus` fields | Works for legacy compatibility, but typed receiptPayment should become canonical. |
| PaymentSuccessPage cache write is outside this audit list | Should be included in 5.6-D smoke testing. |
| `/cases?email` API shape mixes cases with customer subscription data | Consider an envelope response in a future API revision. |
| `subscriptionRecords.json` absent in current workspace | Setup or first write will create it, but live data inspection was unavailable. |
| Receipt-status patch still needs backend lifecycle no-downgrade enforcement | Not a payment boundary failure, but still lifecycle risk. |
| Evidence package/version model not implemented | Acceptable for now, but must remain separate when added. |

## Top 3 Risks

1. Customer subscription is currently copied into case-shaped list records, which is safe today but can be misread by future UI as case-owned state.
2. Local cache still contains authority-looking payment fields after backend confirmation, so pages must continue treating it as cache rather than canonical payment truth.
3. Receipt payment compatibility readers still accept generic `paid`, `isPaid`, and `paymentStatus` fields, so typed `receiptPayment` should become the preferred canonical path.

## 5.6-D Smoke Test Focus

- Confirm pilot extension active state does not display receipt paid or verification paid on any case.
- Confirm receipt payment on Case A does not unlock receipt or verification state on Case B.
- Confirm formal verification payment on Case A does not unlock Case B.
- Confirm `checkout=success` without `session_id` never creates paid state.
- Confirm receipt activation, pilot extension, and formal verification all return distinct typed behavior.
- Confirm localStorage/cache payment flags do not override backend case state.

## Final 5.6-C Status

Status: PASS with warnings

Boundary audit complete: Yes

Frontend/backend code modified: No

Routes modified: No

Updated boundary compliance score: 92 / 100

Remaining FAIL items: None

Remaining WARNING items: 8

5.6-C now passes: Yes

Safe to proceed to 5.6-D / full payment smoke test: Yes
