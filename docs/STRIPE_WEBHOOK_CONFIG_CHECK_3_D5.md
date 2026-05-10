# Stripe Webhook Config Check 3-D5

## Webhook Destination

| Field | Value |
| --- | --- |
| Name | Nimclea production payment webhook |
| Endpoint URL | `https://nimclea-api.onrender.com/stripe/webhook` |
| Status | Active |

Listening to 3 events:

- `checkout.session.completed`
- `invoice.payment_failed`
- `customer.subscription.deleted`

## Render Environment

- `STRIPE_WEBHOOK_SECRET` has been configured.
- Exact secret value is intentionally not documented.

## Existence Check Result

PowerShell POST to `https://nimclea-api.onrender.com/stripe/webhook` with body `"{}"` returned:

```text
STATUS: 400
{"error":"Stripe webhook signature verification failed","message":"No stripe-signature header value was provided."}
```

Interpretation:

- Route exists.
- Backend is deployed.
- `STRIPE_WEBHOOK_SECRET` is present.
- Signature verification is active.
- The 400 response is expected because the manual request did not include Stripe's `stripe-signature` header.

## Stripe Shell Note

- `stripe trigger checkout.session.completed` is disabled in live mode.
- This is expected.
- Do not switch production configuration to test mode unless creating a separate test/staging Stripe setup.

## Remaining Real Validation

- The first true webhook delivery will occur during a real Stripe Checkout event.
- Verify Event deliveries in Stripe after a real payment.
- Confirm `paymentRecords.json` receives paid/active/failed/canceled records as applicable.
