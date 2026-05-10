# Foundation Contract Index

## Purpose

This file is the entry index for Nimclea foundation contracts.

Any future change touching case, receipt, verification, payment, subscription, identity, or customer/workspace logic should check these documents first.

## Foundation Documents

| Document | Scope |
| --- | --- |
| `docs/IDENTITY_CONTRACT_v1.md` | User, customer/workspace, case, receipt, verification, payment, and subscription identity relationships. |
| `docs/DATA_CONTRACT_v1.md` | Canonical backend records, field ownership, compatibility mirrors, lifecycle state boundaries, and frontend consumption rules. |
| `docs/PAYMENT_LEDGER_SMOKE_AUDIT_3_D4.md` | `paymentRecords.json` lifecycle coverage for `checkout_created`, `paid`, `active`, `failed`, and `canceled`. |
| `docs/STRIPE_WEBHOOK_CONFIG_CHECK_3_D5.md` | Production Stripe webhook destination, Render `STRIPE_WEBHOOK_SECRET` configuration, and webhook existence/signature check. |

## Development Rule

Before changing any data ownership or lifecycle/payment behavior, identify which contract owns the field or state.

Do not let frontend cache/localStorage become payment or verification authority.

Do not treat customer/workspace subscription state as case state unless explicitly scoped for display.

## Current Foundation Status

| Layer | Status |
| --- | --- |
| Identity Contract | Complete |
| Data Contract | Complete |
| Payment Ledger | Code complete |
| Stripe Webhook | Production configured |
| Real Stripe smoke test | Pending first real checkout event |

## Non-goals

- This index does not change code.
- This index does not rename fields.
- This index does not migrate data.
- This index does not replace the underlying contract documents.
