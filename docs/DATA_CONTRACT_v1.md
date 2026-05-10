# Data Contract v1

## Purpose

This document defines the formal Nimclea data contract: canonical backend records, field ownership, compatibility mirrors, and migration boundaries. It distinguishes source-of-truth records from derived display fields and legacy compatibility fields.

## Core Principles

- Customer is not case.
- Payment event is not business state by itself unless explicitly promoted.
- Case lifecycle, receipt baseline, verification workflow, payment ledger, and subscription state are separate layers.
- Local/cache state is never payment authority.
- Compatibility mirrors may exist temporarily, but canonical ownership must remain explicit.
- Downstream records may reference upstream ids, but references do not transfer ownership.

## Canonical Entities

| Entity | Meaning |
| --- | --- |
| User | A human account, authenticated actor, or stable local identity fallback. |
| Customer / Workspace | Billing/workspace owner, organization, or account container. |
| Case | One diagnostic decision / receipt / verification workflow. |
| Receipt | The locked receipt baseline for one case. |
| Verification | The formal review workflow and proof/status layer for one case. |
| Payment Ledger Event | Normalized Stripe checkout, confirmation, webhook, payment, or subscription lifecycle event. |
| Subscription | Customer/workspace/user-level recurring access state. |
| Event Log | User/workflow/evidence activity associated with user, trial, case, and page context. |
| Hash Ledger / Proof | Immutable-ish proof references for receipt and verification hashes. |

## Canonical Backend Files

| File | Owner | Primary id | Reference ids | Allowed writers | Allowed readers | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `users.json` | User and customer/workspace summary | `userId` or normalized `email` where `userId` is absent | `customerId`, `stripeCustomerId`, `stripeSubscriptionId` | Trial/user registration routes; subscription confirmation path | Cases list, subscription display, identity lookup | Stores user identity and subscription summary fields. Customer identity is currently represented through email/workspace/Stripe fields. |
| `cases.json` | Case lifecycle and case business-state mirror | `caseId` | `userId`, `trialId`, `customerId`, `email`, Stripe/payment references when mirrored | Case routes; receipt status patch; checkout confirmation; subscription attachment | Case detail, CasesPage, ReceiptPage, VerificationPage, receipt hydration | Canonical case lifecycle record. It may mirror receipt, verification, payment, and subscription summaries, but those mirrors do not transfer ownership. |
| `receiptRecords.json` | Receipt baseline/payment snapshot compatibility record | `receiptId` when present, otherwise `caseId` / `hash` matching | `caseId`, `stripeSessionId`, `hash`, `receiptHash` | Receipt checkout path; receipt hash ledger route; receipt confirmation path | Receipt hydration, hash ledger receipt-record endpoint, case list merge | Stores receipt payment compatibility fields, receipt hash snapshot, and case snapshot/version metadata. |
| `verificationRecords.json` | Verification proof/status record | `caseId` for current implementation; future `verificationId` | `receiptHash`, `verificationHash`, `caseId` | Hash ledger verification route | Verification proof reads and future verification workflows | Current proof/status record, not yet full formal verification business-state authority. |
| `paymentRecords.json` | Normalized payment event ledger | `stripeSessionId` for checkout events; `stripeSubscriptionId` for subscription lifecycle events; future `stripeEventId` for webhook idempotency | `caseId`, `userId`, `customerId`, `receiptId`, `stripeCustomerId`, `stripeSubscriptionId` | Checkout creation; checkout confirmation; Stripe webhook | Payment audit, future business-state promotion jobs, diagnostics | Canonical payment/subscription event ledger. Does not by itself mutate case/subscription business state unless explicitly promoted by a separate writer. |
| `subscriptionRecords.json` | Customer/workspace subscription record | `stripeSessionId` or normalized `email` matching today; future `stripeSubscriptionId` | `userId`, `customerId`, optional checkout-context `caseId`, Stripe ids | Subscription checkout creation and confirmation | Cases list, subscription display, future subscription APIs | Owns customer/workspace subscription state alongside `users.json`. Optional `caseId` is checkout context only. |
| `eventLogs.json` | Event/evidence activity log | `eventId` | `userId`, `trialId`, `caseId`, `meta.caseId` | Event routes and event logging utilities | Case hydration, event count derivation, analytics | Source of event activity. `eventCount` elsewhere is derived/cache. |
| `emailLogs.json` | Email/contact communication log | `emailLogId` or email/case tuple for legacy entries | `userId`, `caseId`, `email` | Email routes and `/email/log` | Cases by email, contact history, identity fallback | Contact/email lookup support, not case lifecycle authority. |
| `hashLedger.json` | Receipt hash proof ledger | `caseId` for receipt hash entries | `receiptHash`, `receiptId` when present | Hash ledger receipt route | ReceiptPage, VerificationPage, receipt proof reads | Owner for receipt hash proof. Verification hash proof currently lives in `verificationRecords.json`. |

## Stable ID Contract

| ID | Owner | Meaning | Notes |
| --- | --- | --- | --- |
| `userId` | User | Stable user/account actor id | May be absent in legacy records; email fallback exists today. |
| `customerId` | Customer / Workspace | Stable customer/workspace billing id | Not consistently populated yet; future subscription/payment records should include it. |
| `caseId` | Case | Stable case workflow id | Required for receipt and formal verification payments. |
| `receiptId` | Receipt | Stable receipt/baseline id | May be Stripe session id or generated receipt id in compatibility paths. |
| `verificationId` | Verification | Stable formal verification workflow/proof id | Planned; current verification records are primarily keyed by `caseId`. |
| `stripeSessionId` | Payment Ledger Event | Stripe Checkout session id | Primary idempotency key for checkout-created and checkout-confirmed ledger records. |
| `stripeSubscriptionId` | Subscription / Payment Ledger Event | Stripe subscription id | Required for recurring subscription lifecycle updates. |
| `stripeEventId` | Payment Ledger Event | Stripe webhook event id | Required for future event-level idempotency and delivery audit. |

## Field Ownership Map

| Field | Canonical owner | Allowed mirrors / readers |
| --- | --- | --- |
| `caseId` | `cases.json` | `receiptRecords.json`, `verificationRecords.json`, `paymentRecords.json`, `subscriptionRecords.json` as checkout context, `eventLogs.json`, `emailLogs.json`, `hashLedger.json`, frontend route/query state |
| `userId` | `users.json` | `cases.json`, `eventLogs.json`, `emailLogs.json`, `paymentRecords.json`, `subscriptionRecords.json`, `trials.json` |
| `customerId` | Customer/workspace record, currently planned; transitional storage in `users.json` / subscription records | `paymentRecords.json`, `subscriptionRecords.json`, case owner metadata |
| `email` | User/customer contact identity in `users.json` / `emailLogs.json` | Cases, payments, subscriptions, events, route state for lookup/display |
| Case `stage` / `status` | `cases.json` | API responses and frontend display derivations |
| `receiptEligible` / `caseReceiptEligible` | `cases.json` | Receipt records/snapshots and frontend readiness displays may mirror or infer |
| Receipt payment status | `paymentRecords.json` for event ledger; `cases.json.receiptPayment` for current business-state mirror | `receiptRecords.json`, `caseBilling`, `payment`, `paid`, `isPaid` compatibility fields |
| Verification payment status | `paymentRecords.json` for event ledger; `cases.json.verificationPayment` for current business-state mirror | `verificationPaid`, `verificationActivated`, `verificationPaymentStatus`, `caseBilling`, `payment` compatibility fields |
| Verification readiness | `cases.json` and verification proof/status records | Frontend lifecycle helper, receipt activation state, `verificationRecords.json`, hash ledger checks |
| Subscription status | `subscriptionRecords.json` and `users.json` | `/cases?email` may include display-only subscription fields on case-shaped payloads |
| Payment ledger status | `paymentRecords.json` | Business-state writers may read/promote later; frontend should not use ledger status directly unless an API explicitly exposes it as authoritative |
| `eventCount` | Derived from `eventLogs.json` | Cached/mirrored in `cases.json`, receipt snapshots, API responses, frontend scoring |
| Hash / ledger proof | `hashLedger.json` for receipt hash; `verificationRecords.json` for verification hash | `receiptRecords.json`, `cases.json`, frontend local cache may mirror for display/proof continuity |

## Lifecycle State Contract

### Case Lifecycle States

Case lifecycle belongs to `cases.json`. Current valid/recognized states include:

- `draft`
- `diagnostic_completed`
- `result_ready`
- `event_captured`
- `receipt_ready`
- `receipt_paid`
- `receipt_activated`
- `receipt_issued`
- `verification_ready`
- `verification_active`
- `verification_issued`
- `completed`
- `archived`

### Receipt States

Receipt state belongs to the case/receipt layer:

- `not_ready`
- `ready`
- `checkout_created`
- `paid`
- `activated`
- `issued`

### Verification States

Verification state belongs to the case/verification layer:

- `not_ready`
- `ready`
- `checkout_created`
- `paid`
- `active`
- `issued`
- `completed`

### Payment Ledger Statuses

Payment ledger statuses belong to `paymentRecords.json`:

- `checkout_created`
- `paid`
- `active`
- `failed`
- `canceled`

### Subscription Statuses

Subscription state belongs to `subscriptionRecords.json` and `users.json`:

- `checkout_created`
- `active`
- `past_due`
- `canceled`
- `failed`
- `expired`

### No-downgrade and Precedence Rules

- Stronger lifecycle states must not be downgraded by weaker compatibility updates.
- Issued/completed states outrank active/paid states.
- Paid/active payment states outrank checkout-created states.
- Backend-confirmed Stripe or webhook sources outrank local/cache/snapshot sources.
- Event logs are the source for event activity; cached `eventCount` should not override a larger verified event count.
- Subscription state must not promote case receipt or verification payment state.

## Payment Contract

`paymentRecords.json` is the normalized payment event ledger.

Supported payment/product types:

| Type | Scope | Meaning |
| --- | --- | --- |
| `receipt_activation` | Case | Activates the receipt baseline for one case. |
| `formal_verification` | Case | Starts/activates the formal verification workflow for one case. |
| `pilot_extension` | Subscription | Current legacy technical name for workspace subscription / workspace monthly plan. |

Future migration:

- Introduce `workspace_subscription`.
- Treat `pilot_extension` as a legacy alias before renaming code paths or stored values.

Ledger versus business-state mirror:

- A payment ledger event records what Stripe/checkout/webhook reported.
- Business-state mirrors are fields like `cases.json.receiptPayment`, `cases.json.verificationPayment`, `receiptRecords.json.paymentStatus`, `subscriptionRecords.json.subscriptionStatus`, and `users.json.subscriptionStatus`.
- A payment event is not business state by itself unless an explicit backend writer promotes it.
- Webhook ledger writes currently update only `paymentRecords.json`.

## Subscription Contract

- Subscription belongs to customer/workspace/user level.
- `caseId` may appear on subscription checkout records only as checkout context.
- `subscriptionRecords.json` owns subscription transaction/status history for the current JSON backend.
- `users.json` owns user/customer subscription summary for current display and lookup.
- `/cases?email` may include subscription fields on case-shaped payloads for display convenience only.
- Subscription state must not imply receipt payment, formal verification payment, or case completion.

## Receipt Contract

- Receipt readiness is owned by `cases.json` through `receiptEligible`, `caseReceiptEligible`, `receiptStatus`, `stage`, and related fields.
- Receipt payment event ownership belongs to `paymentRecords.json`.
- Current receipt business-state mirrors may appear in:
  - `cases.json.receiptPayment`
  - `cases.json.caseBilling`
  - `cases.json.payment`
  - `cases.json.receipt`
  - `receiptRecords.json`
  - compatibility fields `paid`, `isPaid`, and generic `paymentStatus`
- Receipt hash proof is owned by `hashLedger.json`.
- `receiptRecords.json` may carry case snapshots, receipt hashes, payment compatibility fields, and versioning metadata.
- Frozen/issued receipt snapshots should be versioned rather than mutated in place.

## Verification Contract

- Verification readiness is owned by case/verification state, currently represented through `cases.json`, receipt activation, hash proof, and frontend readiness checks.
- Formal verification payment event ownership belongs to `paymentRecords.json`.
- Current formal verification business-state mirrors may appear in:
  - `cases.json.verificationPayment`
  - `cases.json.verificationPaid`
  - `cases.json.verificationActivated`
  - `cases.json.verificationPaymentStatus`
  - `cases.json.caseBilling`
  - `cases.json.payment`
- `verificationRecords.json` is the current proof/status record for verification hash and status.
- `verificationRecords.json` is not yet a complete formal verification workflow authority.
- Issued/completed/export state must remain separate from merely paid/active state.
- Evidence package export belongs to the completed case output and future package/version records.

## Event and Evidence Contract

- `eventLogs.json` is the event source.
- `eventCount` is a derived/cache field and may appear in cases, receipt snapshots, API responses, and frontend scoring.
- If event counts conflict, recomputed event log count should be preferred over stale cached values.
- Email logs are contact/identity support, not event evidence.
- Future evidence package/version records should reference:
  - `caseId`
  - `verificationId`
  - package/version id
  - source verification or proof hash
  - issued/exported timestamps
- Evidence package state must not be collapsed into subscription or generic case completion state.

## API Response Shape Contract

### `/cases?email`

Purpose: list cases for a customer/user email.

Canonical fields:

- `caseId`
- case `stage` / `status`
- `receiptEligible`
- `caseReceiptEligible`
- `receiptStatus`
- event-derived fields

Display convenience fields:

- merged `subscription`
- `pilotExtensionPaid`
- `subscriptionStatus`
- merged receipt snapshot fields
- derived display status

Rule: subscription fields in this response are customer/workspace display state and must not be interpreted as case receipt or verification payment truth.

### `/case/:caseId`

Purpose: fetch one case and hydrate event logs.

Canonical fields:

- `caseId`
- case lifecycle fields from `cases.json`
- hydrated `events`
- hydrated `eventLogs`
- derived `eventCount`

Rule: this endpoint is the preferred case lifecycle read for case-scoped pages.

### `/receipt-record`

Purpose: fetch receipt payment/baseline context for one case.

Canonical fields:

- matching receipt record when present
- `caseId`
- receipt/payment compatibility fields from `receiptRecords.json`

Display/fallback fields:

- case fallback when no receipt record exists

Rule: case fallback is useful for hydration but must not be treated as receipt payment confirmation unless backend-owned payment fields are present.

### `/hash-ledger/receipt`

Purpose: read or write receipt hash proof.

Canonical fields:

- `caseId`
- `receiptHash`
- timestamps/source

Rule: receipt hash proof is separate from receipt payment state.

### `/hash-ledger/verification`

Purpose: read or write verification proof/status record.

Canonical fields:

- `caseId`
- `receiptHash`
- `verificationHash`
- `verificationStatus`

Rule: verification proof/status is separate from formal verification payment and final package export.

## Frontend Consumption Rules

- Backend-owned fields must be preferred over local/cache fields.
- LocalStorage and case registry records are cache/fallback only.
- Payment and verification access require source/provenance.
- `source` values indicating backend, Stripe, confirmed checkout, webhook, or Supabase may be trusted according to helper rules.
- Fallback/cache/snapshot/local sources must not unlock payment-owned states.
- Generic `paid`, `isPaid`, `paymentStatus`, and `subscriptionStatus` must not be used as payment truth without scope/type.
- Receipt payment checks should prefer typed `receiptPayment` / `receipt_activation` semantics.
- Verification payment checks should prefer typed `verificationPayment` / `formal_verification` semantics.
- Subscription checks should prefer customer/workspace subscription records and must not unlock case payment state.

## Compatibility Fields

Legacy or mirror fields retained temporarily:

| Field | Compatibility role | Preferred canonical replacement |
| --- | --- | --- |
| `pilot_extension` | Legacy technical subscription payment type | Future `workspace_subscription` alias/migration |
| `isPaid` | Generic receipt payment compatibility boolean | `receiptPayment.paymentStatus` with `paymentType: "receipt_activation"` plus ledger record |
| `paid` | Generic receipt/record payment compatibility boolean | Typed payment object and ledger event |
| generic `paymentStatus` | Overloaded checkout/payment/lifecycle summary | Scoped `receiptPayment`, `verificationPayment`, or `paymentRecords.status` |
| `caseBilling` | Existing payment/activation mirror | Typed `receiptPayment`, `verificationPayment`, and subscription records |
| `payment` | Existing generic payment mirror | Typed payment objects and `paymentRecords.json` |
| broad verification booleans | `verificationPaid`, `verificationActivated`, nested payment flags | `verificationPayment` with `paymentType: "formal_verification"` and trusted source |

These fields should remain readable during migration but should not be expanded as new canonical surfaces.

## Non-goals and Migration Plan

This is a documentation-only contract.

Do not in this step:

- Rename fields.
- Rename `pilot_extension` in code or stored data.
- Migrate JSON data.
- Change frontend behavior.
- Change backend behavior.
- Change routes.
- Change payment logic.
- Change Stripe pricing, Price IDs, coupons, or webhook event configuration.
- Re-shape `/cases?email` responses.
- Remove compatibility fields.
- Promote webhook ledger events into business-state writes.
- Implement evidence package/version records.

Later code changes must be staged after contract approval. Recommended migration order:

1. Add source-aware readers that prefer canonical typed fields.
2. Normalize backend response provenance labels.
3. Add explicit APIs for customer/workspace subscription reads.
4. Gradually promote typed `receiptPayment` and `verificationPayment` over generic fields.
5. Add business-state promotion from webhook ledger events only after idempotency and deployment monitoring are proven.
6. Plan data migration only after compatibility readers are stable.
