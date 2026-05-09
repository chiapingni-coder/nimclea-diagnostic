# Payment and Subscription Persistence Audit 5.6-A

## Purpose

This audit maps where payment and subscription state is created, confirmed, stored, read, and displayed. It focuses on whether receipt activation, formal verification payment, and pilot extension subscription state are persisted as backend-owned truth instead of being inferred from local snapshots, route state, or URL parameters.

## Scope Reviewed

| Area | Files reviewed |
| --- | --- |
| Frontend checkout and display | `frontend/pages/ReceiptPage.jsx`, `frontend/pages/VerificationPage.jsx`, `frontend/pages/CasesPage.jsx`, `frontend/pages/PaymentSuccessPage.jsx` |
| Frontend helpers/cache | `frontend/lib/trialApi.js`, `frontend/utils/caseRegistry.js`, `frontend/utils/dataContractLifecycle.js` |
| Backend checkout and case APIs | `backend/routes/stripe.js`, `backend/server.js`, `backend/routes/caseRoutes.js`, `backend/routes/eventRoutes.js`, `backend/routes/emailRoutes.js`, `backend/routes/hashLedgerRoutes.js` |
| Backend data setup and stores | `backend/utils/ensureDataFiles.js`, `backend/data/cases.json`, `backend/data/receiptRecords.json`, `backend/data/trials.json`, `backend/data/users.json`, `backend/data/emailLogs.json`, `backend/data/eventLogs.json` |
| Mirror path | `backend/utils/supabaseMirrorWrites.js` |

## Payment Types Observed

| Payment type | Current support | Notes |
| --- | --- | --- |
| Receipt activation payment | Partial backend-backed support | Stripe checkout is created and confirmation verifies Stripe before writing case and receipt payment fields. |
| Formal verification payment | Missing / conflated | VerificationPage has activation UI and gates, but no distinct Stripe checkout/confirmation persistence path for verification payment. |
| Subscription / pilot extension payment | Checkout creation only | Stripe subscription checkout is created and a `subscriptionRecords.json` checkout-created record is attempted, but return success is localStorage-only. |
| Checkout states | Partial | `checkout_created`, `paid`, activated flags exist, but state naming is not canonical across case, receipt, and subscription records. |

## Findings

### 1. Receipt activation checkout is distinguishable at creation

- Status: PASS
- Location: `backend/routes/stripe.js`, `createCheckoutSession()`, approx. lines 247-367; `frontend/pages/ReceiptPage.jsx`, `handleUnlockFormalReceipt()`, approx. lines 1830-1850
- Payment type affected: Receipt activation payment
- Risk: Low. Receipt checkout requires `caseId`, creates a payment-mode Stripe Checkout session, and returns to `/receipt?caseId=...&session_id=...&paid=success`.
- Suggested fix: Keep this path, but add an explicit `paymentType: "receipt_activation"` metadata field in 5.6-B so return handling is unambiguous.

### 2. Receipt payment confirmation verifies Stripe before writing paid status

- Status: PASS
- Location: `backend/routes/stripe.js`, `POST /confirm-checkout-session`, approx. lines 369-452; `frontend/pages/ReceiptPage.jsx`, confirmation effect, approx. lines 1295-1345; `frontend/pages/PaymentSuccessPage.jsx`, approx. lines 14-86
- Payment type affected: Receipt activation payment
- Risk: Low. Backend retrieves the Stripe session, checks metadata case match, requires `session.payment_status === "paid"`, then writes paid/activated fields.
- Suggested fix: Keep confirmation backend-owned. In 5.6-B, make the endpoint reject non-receipt payment types unless they are explicitly supported.

### 3. Receipt paid state is persisted into canonical backend records

- Status: PASS
- Location: `backend/routes/stripe.js`, `upsertCaseRecord()` and `updateReceiptPaymentRecord()`, approx. lines 73-207 and 390-435
- Payment type affected: Receipt activation payment
- Risk: Low to medium. Paid state is written to `cases.json` and `receiptRecords.json` with `caseBilling.receiptActivated`, `payment.status`, `payment.receiptActivated`, `isPaid`, receipt `paid`, and receipt record `paymentStatus: "paid"`.
- Suggested fix: Normalize these into a dedicated `receiptPayment` object while preserving backward-compatible fields.

### 4. Receipt checkout-created state is persisted before payment confirmation

- Status: PASS
- Location: `backend/routes/stripe.js`, `createCheckoutSession()`, approx. lines 300-341
- Payment type affected: Receipt activation payment
- Risk: Low. Backend records `paymentStatus: "checkout_created"` and `paid: false` in `receiptRecords.json`.
- Suggested fix: Also write a case-level `receiptPayment.status: "checkout_created"` or `paymentStatus: "checkout_created"` with monotonic no-downgrade protection.

### 5. URL `paid=success` is not authority by itself for receipt payment

- Status: PASS
- Location: `frontend/pages/ReceiptPage.jsx`, approx. lines 1295-1345
- Payment type affected: Receipt activation payment
- Risk: Low. The page only attempts confirmation when `paid=success`, `session_id`, and `caseId` exist; it does not mark paid locally unless backend confirmation succeeds.
- Suggested fix: Keep this behavior and remove the cosmetic `paid` query parameter dependency in favor of `session_id` plus backend session type when 5.6-B adds typed payments.

### 6. PaymentSuccessPage writes backend-confirmed case data into local cache after confirmation

- Status: WARNING
- Location: `frontend/pages/PaymentSuccessPage.jsx`, approx. lines 33-78
- Payment type affected: Receipt activation payment
- Risk: Medium. It confirms payment with backend first, but then writes paid/activated fields into `caseRegistry`. The source is backend-confirmed, so this is acceptable as cache, but the cache still contains authority-looking fields.
- Suggested fix: Mark local cache records as `_backendConfirmed: true` or `source: "stripe_checkout_confirmed_cache"` and ensure pages continue to prefer backend hydration.

### 7. Pilot extension checkout creation exists but success persistence is local-only

- Status: FAIL
- Location: `frontend/pages/CasesPage.jsx`, approx. lines 1047-1050 and 1209-1228; `backend/routes/stripe.js`, approx. lines 255-299
- Payment type affected: Subscription / pilot extension payment
- Risk: High. Backend creates a Stripe subscription checkout and writes a checkout-created subscription record, but success return to `/cases?checkout=success` only writes `localStorage.setItem("nimclea_pilot_extension_paid", "true")`. There is no frontend call to confirm the subscription session and no backend paid/subscribed update.
- Suggested fix: Add a subscription confirmation endpoint or reuse a typed confirmation endpoint that retrieves the Stripe session/subscription, verifies payment/subscription status, and persists backend-owned `subscription.status`, `subscriptionStatus`, `stripeCustomerId`, `stripeSubscriptionId`, and timestamps.

### 8. Pilot extension return URL cannot confirm the checkout session

- Status: FAIL
- Location: `backend/routes/stripe.js`, pilot extension `success_url`, approx. lines 280-281
- Payment type affected: Subscription / pilot extension payment
- Risk: High. Success URL is `/cases?checkout=success` and does not include `{CHECKOUT_SESSION_ID}`, so the frontend cannot call a backend confirmation endpoint even if one is added.
- Suggested fix: Change success URL in 5.6-B to include `session_id={CHECKOUT_SESSION_ID}` and a distinguishable payment type, such as `/cases?checkout=success&paymentType=pilot_extension&session_id={CHECKOUT_SESSION_ID}`.

### 9. Subscription records file is not listed in the requested data files but is used by Stripe route

- Status: WARNING
- Location: `backend/routes/stripe.js`, `SUBSCRIPTION_RECORDS_FILE`, approx. lines 17 and 217-245; `backend/utils/ensureDataFiles.js`, approx. lines 5-12
- Payment type affected: Subscription / pilot extension payment
- Risk: Medium. `ensureDataFiles.js` creates `subscriptionRecords.json`, but it was not included in the requested audit file list and may be easy to miss operationally. In this workspace, `backend/data/subscriptionRecords.json` was not present at audit time, likely because the route has not run.
- Suggested fix: Treat `subscriptionRecords.json` as a canonical backend data file in 5.6-B documentation and seed/verify it during setup.

### 10. Formal verification payment is not separate from receipt payment

- Status: FAIL
- Location: `frontend/pages/VerificationPage.jsx`, approx. lines 1814-1920 and 3500-3630; `backend/routes/stripe.js`, entire checkout/confirm flow
- Payment type affected: Formal verification payment
- Risk: High. VerificationPage has activation controls, but no dedicated Stripe checkout call or backend confirmation for formal verification payment. Existing backend checkout is receipt-only, and verification activation is derived from backend verification flags or `caseBilling.verificationActivated`, not from a separate payment ledger.
- Suggested fix: Add a distinct formal verification payment type with `paymentType: "formal_verification"`, its own success/cancel URLs, backend confirmation, and persisted `verificationPayment` fields.

### 11. Verification formal access remains backend-gated, but payment model is incomplete

- Status: WARNING
- Location: `frontend/pages/VerificationPage.jsx`, approx. lines 1814-1920 and 3600-3630
- Payment type affected: Formal verification payment
- Risk: Medium. VerificationPage no longer blocks page review access, and formal controls remain backend-gated. However, the backend has no way to create `verificationActivated` through a payment flow, so activation is operationally unreachable or must be set by another process.
- Suggested fix: Implement formal verification checkout and confirmation before relying on VerificationPage activation controls in production.

### 12. Receipt payment and verification payment fields are partially conflated in access helpers

- Status: WARNING
- Location: `frontend/pages/ReceiptPage.jsx`, approx. lines 1810-1825; `frontend/pages/VerificationPage.jsx`, approx. lines 1814-1920; `frontend/lib/accessMode.js`, approx. lines 1-65
- Payment type affected: Receipt activation and formal verification payment
- Risk: Medium. `receiptPaid`, `verificationPaid`, `isPaid`, `receiptActivated`, and `verificationActivated` are read from several shapes. Current gates were tightened to backend-owned sources, but the model lacks a typed distinction between receipt payment and verification payment.
- Suggested fix: Replace broad booleans with `receiptPayment.status` and `verificationPayment.status`, while keeping compatibility readers during migration.

### 13. CasesPage payment display uses backend-ish data but can still over-trust non-snapshot payment fields

- Status: WARNING
- Location: `frontend/pages/CasesPage.jsx`, `deriveCaseListState()`, approx. lines 451-520
- Payment type affected: Receipt activation payment
- Risk: Medium. CasesPage avoids `receipt_snapshot` for `paymentStatus` text and uses helper-backed receipt paid detection, but it also treats generic payment/session objects as progress without explicit backend provenance. In practice `/cases?email` is backend-sourced, but merged data can include receipt/case snapshots.
- Suggested fix: Require backend/source metadata for paid display and reserve untrusted session objects for "checkout started" or progress context only.

### 14. CasesPage pilot extension state is localStorage-authoritative

- Status: FAIL
- Location: `frontend/pages/CasesPage.jsx`, approx. lines 1047-1050
- Payment type affected: Subscription / pilot extension payment
- Risk: High. `nimclea_pilot_extension_paid` is set solely from the URL query `checkout=success`, without Stripe confirmation or backend persistence. This is local-only payment authority.
- Suggested fix: Remove local-only authority in 5.6-B. Use backend-confirmed subscription state from a typed confirmation endpoint.

### 15. ReceiptPage Open Verification is separated from receipt checkout

- Status: PASS
- Location: `frontend/pages/ReceiptPage.jsx`, bottom CTA handler, approx. lines 4000-4125
- Payment type affected: Receipt activation payment / Verification page access
- Risk: Low. The bottom CTA starts checkout only when `shouldUnlockFormalReceiptFromReceiptCta` is true. `Open Verification` navigates to VerificationPage and no longer uses `canEnterVerification` to block review-mode access.
- Suggested fix: Keep this behavior and move button semantics into a shared verification access helper in a later step.

### 16. `paid=cancel` does not create paid state

- Status: PASS
- Location: `frontend/pages/ReceiptPage.jsx`, approx. lines 1295-1301
- Payment type affected: Receipt activation payment
- Risk: Low. The confirmation effect only runs for `paid=success`, so cancellation does not create payment state.
- Suggested fix: Optionally display a cancellation notice without changing payment truth.

### 17. Backend `/cases?email` merges receipt payment fields into case list output

- Status: WARNING
- Location: `backend/server.js`, `/cases` route, approx. lines 350-604
- Payment type affected: Receipt activation payment
- Risk: Medium. The route merges cases, receipt records, Supabase rows, and logs. It derives receipt readiness and carries receipt payment fields, but uses a local stage rank map that does not fully match the shared frontend lifecycle helper.
- Suggested fix: Consolidate backend lifecycle/payment ranking in 5.6-B or 5.6-C so `/cases?email` cannot flatten payment or verification state inconsistently.

### 18. Backend `/receipt-record` endpoint can return case data when no receipt record exists

- Status: WARNING
- Location: `backend/server.js`, `/receipt-record`, approx. lines 608-683
- Payment type affected: Receipt activation payment
- Risk: Medium. If no receipt payment record exists but a case exists, the endpoint returns the case. This is useful for hydration, but the response shape can look like a receipt record without explicit `exists: false` or payment provenance.
- Suggested fix: Return explicit `recordType`, `receiptRecordExists`, and `paymentSource` fields so frontend cannot mistake case fallback for payment confirmation.

### 19. Receipt status patch endpoint is not payment-aware

- Status: WARNING
- Location: `backend/routes/caseRoutes.js`, `PATCH /case/:caseId/receipt-status`, approx. lines 271-319
- Payment type affected: Receipt lifecycle and payment boundary
- Risk: Medium. The endpoint can update receipt readiness fields but does not manage paid/activated state. Frontend currently guards downgrade patches, but backend should also enforce no-downgrade and payment boundary rules.
- Suggested fix: Add backend lifecycle rank preservation and reject payment-field writes from this endpoint.

### 20. Supabase mirror stores receipt payment status but not typed payment model

- Status: WARNING
- Location: `backend/utils/supabaseMirrorWrites.js`, `mirrorReceiptRecordToSupabase()`, approx. lines 350-390
- Payment type affected: Receipt activation payment
- Risk: Medium. Supabase receipt mirror includes `payment_status` and `paid`, but no `paymentType`, Stripe customer/session/payment intent details, or separated receipt/verification/subscription model.
- Suggested fix: Extend mirror schema after canonical payment model is added.

### 21. Backend data files show unpaid receipt records but no active subscription persistence

- Status: WARNING
- Location: `backend/data/receiptRecords.json`, payment fields around approx. lines 1463, 2643, 2829, 3015, 3201; `backend/data/cases.json`, payment field around approx. line 3258; `backend/data/subscriptionRecords.json` absent at audit time
- Payment type affected: Receipt activation and subscription payment
- Risk: Low to medium. Existing data confirms payment fields are present for receipt records, but there is no observed persisted paid subscription state in current data.
- Suggested fix: Add migration notes for existing records and ensure subscription records are created and confirmed in backend data.

### 22. Local `caseRegistry` can store authority-looking paid fields

- Status: WARNING
- Location: `frontend/utils/caseRegistry.js`, `upsertCase()`, approx. lines 150-195; `frontend/pages/PaymentSuccessPage.jsx`, approx. lines 45-78
- Payment type affected: Receipt activation payment
- Risk: Medium. `caseRegistry` is a cache and accepts arbitrary fields. Current payment writes come after backend confirmation, but the registry can still contain `isPaid`, `payment.status`, and activation flags that look canonical.
- Suggested fix: Pages should continue to treat `caseRegistry` as fallback/cache only and payment writes should carry explicit cache/source metadata.

### 23. `dataContractLifecycle.js` blocks fallback sources but cannot distinguish payment types

- Status: WARNING
- Location: `frontend/utils/dataContractLifecycle.js`, approx. lines 1-335
- Payment type affected: Receipt activation and formal verification payment
- Risk: Medium. The helper correctly avoids fallback/local/cache sources and detects receipt/verification lifecycle signals, but it does not model receipt payment versus formal verification payment separately.
- Suggested fix: Add payment-specific helpers in 5.6-B, such as `isBackendReceiptPaymentPaid()` and `isBackendVerificationPaymentPaid()`.

### 24. `trialApi.js`, email, and event routes do not create payment authority

- Status: PASS
- Location: `frontend/lib/trialApi.js`, approx. lines 1-120; `backend/routes/emailRoutes.js`, approx. lines 1-75; `backend/routes/eventRoutes.js`, approx. lines 1-85
- Payment type affected: All payment types
- Risk: Low. These paths log events, send emails, or save trial data and do not create paid/activated/subscribed state.
- Suggested fix: Keep these routes payment-neutral.

## Stripe Checkout Call Inventory

| Source | Endpoint | Type sent | caseId | email | Return URL | Cancel URL | Distinguishable after return |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ReceiptPage.handleUnlockFormalReceipt()` | `/api/create-checkout-session` | None; backend defaults to receipt unlock | Included | Not included | `/receipt?caseId=...&session_id={CHECKOUT_SESSION_ID}&paid=success` | `/receipt?caseId=...&paid=cancel` | Partially; URL implies receipt, no explicit `paymentType` |
| `CasesPage.handlePilotExtensionCheckout()` | `/create-checkout-session` | `priceType: "pilot_extension"` | Missing | Included | `/cases?checkout=success` | `/cases?checkout=cancel` | No; missing `session_id` and `paymentType` |

## Stripe Confirmation Call Inventory

| Source | Endpoint | Required fields | Backend Stripe verification | Backend writes |
| --- | --- | --- | --- | --- |
| `ReceiptPage` confirmation effect | `/api/confirm-checkout-session` | `caseId`, `sessionId` | Yes, retrieves session and requires `payment_status === "paid"` | `cases.json`, `receiptRecords.json` |
| `PaymentSuccessPage` | `/api/confirm-checkout-session` | `caseId`, `sessionId` | Yes, same endpoint | `cases.json`, `receiptRecords.json`, then local cache |
| Pilot extension | None | None | No confirmation path | Checkout-created record only; success handled in localStorage |
| Formal verification | None | None | No confirmation path | No typed verification payment write |

## Backend Payment Persistence Summary

| Store | Receipt payment | Verification payment | Subscription payment |
| --- | --- | --- | --- |
| `cases.json` | Confirmed receipt payment writes `caseBilling`, `payment`, `receipt`, `isPaid` | Can carry `verificationActivated`/`verificationEligible`, but no payment confirmation path | No observed subscription fields |
| `receiptRecords.json` | `paymentStatus`, `paid`, `paymentTier`, hash and case snapshot | `verificationStatus` exists but not a payment ledger | No |
| `subscriptionRecords.json` | No | No | Checkout-created only; file absent until route writes |
| `trials.json` | No observed payment authority | No observed payment authority | No observed paid subscription state |
| `users.json` | No observed payment authority | No observed payment authority | No observed paid subscription state |
| Supabase receipt mirror | Mirrors `payment_status` and `paid` | Mirrors `verification_status` only | No typed subscription mirror found |

## Required Canonical Payment Model for 5.6-B

Recommended case-level shape:

| Field | Purpose |
| --- | --- |
| `paymentType` | Explicit checkout type on requests and confirmations: `receipt_activation`, `formal_verification`, `pilot_extension`. |
| `paymentStatus` | Backward-compatible summary only; avoid using as the only authority. |
| `stripeSessionId` | Checkout session id from Stripe. |
| `stripeCustomerId` | Stripe customer id when available. |
| `caseId` | Required for receipt and verification payments. |
| `email` | Required for subscription and useful for receipts. |
| `paidAt` | Stripe-confirmed payment timestamp. |
| `activatedAt` | Product activation timestamp after payment confirmation. |
| `source` | `stripe_checkout_confirmed`, `stripe_subscription_confirmed`, etc. |
| `receiptPayment` | `{ status, stripeSessionId, paymentIntentId, paidAt, activatedAt, source }`. |
| `verificationPayment` | `{ status, stripeSessionId, paymentIntentId, paidAt, activatedAt, issuedAt, source }`. |
| `subscription` | `{ status, priceType, stripeSessionId, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, source }`. |

Recommended canonical states:

| Payment area | States |
| --- | --- |
| Receipt | `not_started`, `checkout_created`, `paid`, `activated`, `issued` |
| Verification | `not_started`, `checkout_created`, `paid`, `activated`, `issued` |
| Subscription | `not_started`, `checkout_created`, `active`, `past_due`, `canceled`, `expired` |

## Overall Assessment

| Metric | Result |
| --- | --- |
| Overall payment persistence score | 58 / 100 |
| Remaining FAIL items | 4 |
| Remaining WARNING items | 12 |
| 5.6 safe to implement directly | Yes, but only as a scoped persistence repair, not as UI expansion |

## Remaining FAIL Items

| # | Issue |
| --- | --- |
| 1 | Pilot extension success is localStorage-only via `nimclea_pilot_extension_paid`. |
| 2 | Pilot extension success URL omits `session_id`, preventing backend confirmation. |
| 3 | Formal verification payment is missing as a distinct checkout and persistence path. |
| 4 | CasesPage subscription state can be treated as paid from local URL/localStorage only. |

## Remaining WARNING Items

| Theme | Impact |
| --- | --- |
| Local cache contains authority-looking paid fields | Acceptable after backend confirmation, but provenance should be clearer. |
| Payment fields are scattered | `paid`, `isPaid`, `paymentStatus`, `receiptActivated`, and nested `payment.status` need a typed model. |
| `/cases?email` has its own stage rank and merge rules | Could drift from frontend lifecycle helper. |
| `/receipt-record` can return case fallback | Useful, but should expose fallback/payment provenance. |
| Receipt status patch is not payment-aware | Backend should reject payment changes and preserve stronger lifecycle states. |
| Supabase mirror lacks typed payment model | Add after canonical payment model lands. |
| Verification activation UI exists before payment path exists | Formal activation remains backend-gated but operationally incomplete. |

## Top 3 Risks

1. Subscription / pilot extension payment can appear paid from `checkout=success` and localStorage without Stripe confirmation.
2. Formal verification payment is not separated from receipt activation, so there is no canonical way to persist formal verification paid/activated/issued state.
3. Payment truth is spread across generic booleans and nested objects, increasing the chance that future pages treat cache or summary fields as canonical.

## Recommended 5.6-B Implementation Order

1. Add an explicit `paymentType` to checkout creation and Stripe metadata for receipt activation, formal verification, and pilot extension.
2. Add `session_id={CHECKOUT_SESSION_ID}` and `paymentType` to pilot extension success URLs.
3. Add a typed backend confirmation endpoint or extend `/confirm-checkout-session` to verify payment type and write only the matching canonical payment object.
4. Persist `receiptPayment`, `verificationPayment`, and `subscription` objects into backend case/subscription records with monotonic no-downgrade rules.
5. Replace `nimclea_pilot_extension_paid` authority with backend-confirmed subscription state.
6. Add formal verification checkout creation and confirmation before enabling formal verification activation/export.
7. Update CasesPage, ReceiptPage, and VerificationPage readers to prefer typed backend payment objects while preserving compatibility with existing fields.
8. Extend Supabase mirror and data setup for typed payment/subscription records.

## Final 5.6-A Status

Status: WARNING
Payment persistence audit complete: Yes
Frontend/backend code modified: No
Routes modified: No
Ready for 5.6-B scoped implementation: Yes
