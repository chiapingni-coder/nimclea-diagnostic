# 3-D4 Payment Ledger Smoke Audit

## 1. `paymentRecords.json` Lifecycle Coverage

| Status | Where written | Coverage |
| --- | --- | --- |
| `checkout_created` | `backend/routes/stripe.js` checkout creation branches | Written for `pilot_extension`, `formal_verification`, and `receipt_activation` after Stripe Checkout session creation. |
| `paid` | `backend/routes/stripe.js` confirm flow; `backend/routes/stripeWebhook.js` `checkout.session.completed` | Written for `receipt_activation` and `formal_verification` after confirmed paid session. |
| `active` | `backend/routes/stripe.js` confirm flow; `backend/routes/stripeWebhook.js` `checkout.session.completed` | Written for `pilot_extension` subscription checkout after paid/completed session. |
| `failed` | `backend/routes/stripeWebhook.js` `invoice.payment_failed` | Written for `pilot_extension` subscription ledger records. |
| `canceled` | `backend/routes/stripeWebhook.js` `customer.subscription.deleted` | Written for `pilot_extension` subscription ledger records. |

`backend/utils/ensureDataFiles.js` initializes `paymentRecords.json` as an empty array.

## 2. Product Coverage

| Product | Checkout-created ledger | Confirm ledger | Webhook ledger |
| --- | --- | --- | --- |
| `receipt_activation` | Yes, `status: "checkout_created"` | Yes, `status: "paid"` | Yes, via `checkout.session.completed`, `status: "paid"` |
| `formal_verification` | Yes, `status: "checkout_created"` | Yes, `status: "paid"` | Yes, via `checkout.session.completed`, `status: "paid"` |
| `pilot_extension` | Yes, `status: "checkout_created"` | Yes, `status: "active"` | Yes, `checkout.session.completed` -> `active`, `invoice.payment_failed` -> `failed`, `customer.subscription.deleted` -> `canceled` |

## 3. Webhook Coverage

Confirmed in `backend/server.js`:

```js
app.use(cors());
app.use("/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookRoutes);
app.use(express.json());
```

`/stripe/webhook` is mounted before `express.json()`, so Stripe raw body signature verification can work.

Handled webhook events in `backend/routes/stripeWebhook.js`:

- `checkout.session.completed`
- `invoice.payment_failed`
- `customer.subscription.deleted`

Unsupported events are safely ignored with:

```js
{ received: true, ignored: true, type: event.type }
```

Signature safety:

- Missing `STRIPE_WEBHOOK_SECRET` returns `500`.
- Invalid Stripe signature returns `400`.
- No ledger write occurs before signature verification.

## 4. Idempotency / Matching

Confirmed matching priority in `backend/utils/paymentPersistence.js`:

1. `stripeSessionId` first
2. `stripeSubscriptionId` second
   - Prefers same `productType` and `paymentScope` when available
3. fallback to `productType + paymentScope + caseId`

Update behavior:

- Existing record is updated instead of duplicated.
- Original `createdAt` is preserved.
- `updatedAt` is refreshed.
- `undefined` and empty string values normalize to `null`.

## 5. Boundaries

Webhook layer only writes through:

```js
upsertPaymentRecord()
```

That writes only `paymentRecords.json`.

Confirmed webhook does not write:

- frontend files
- pricing/configuration
- `cases.json`
- `receiptRecords.json`
- `subscriptionRecords.json`
- `users.json`

Important distinction: existing non-webhook `confirm-checkout-session` still updates business-state files as before. The new webhook path does not.

## 6. Remaining Gaps

True remaining gaps:

- No `customer.subscription.updated` handling yet.
- No `invoice.paid` handling yet.
- Webhook writes only `paymentRecords.json`; it does not update business-state records such as `users.json`, `subscriptionRecords.json`, `cases.json`, or receipt/verification state.
- Real Stripe webhook endpoint still needs Render deployment configuration.
- Stripe Dashboard still needs webhook endpoint registration for `/stripe/webhook`.
- `STRIPE_WEBHOOK_SECRET` must be configured in the deployed backend environment.

## Result

Status: PASS with known gaps

The payment ledger now covers checkout creation, paid/active confirmation, subscription payment failure, and subscription cancellation at the `paymentRecords.json` layer. The webhook is mounted with raw body middleware before JSON parsing and safely ignores unsupported events.
