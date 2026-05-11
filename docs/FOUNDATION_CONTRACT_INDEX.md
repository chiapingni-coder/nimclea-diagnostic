# Foundation Contract Index

## Purpose

This file is the entry index for Nimclea foundation contracts.

Any future change touching case, receipt, verification, payment, subscription, identity, or customer/workspace logic should check these documents first.

## Foundation Documents

| Document | Scope |
| --- | --- |
| `docs/IDENTITY_CONTRACT_v1.md` | User, customer/workspace, case, receipt, verification, payment, and subscription identity relationships. |
| `docs/DATA_CONTRACT_v1.md` | Canonical backend records, field ownership, compatibility mirrors, lifecycle state boundaries, and frontend consumption rules. |
| `docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md` | System-wide case lifecycle and workspace limit contract. Defines Active Cases, Baseline Records, Historic Records, active case limits by plan, payment-pending delete behavior, and rules for paid/issued/delivered records. |
| `docs/CASE_DELETE_DISCARD_BACKEND_CONTRACT.md` | Backend delete / discard contract for ordinary unpaid active cases. Defines soft delete scope, payment-pending deletion, Baseline/Historic no-delete rules, `/cases` filtering requirements, and frontend local delete boundary. |
| `docs/CASE_DELETE_DISCARD_BACKEND_SMOKE_CHECKPOINT.md` | Backend smoke checkpoint for case delete/discard. Records passed tests for ordinary unpaid discard, payment-pending high-risk discard, formal locked no-discard protection, `/cases` deleted filtering, and `/cases` payment/receipt display preservation. |
| `docs/CASE_DELETE_RETENTION_CONTRACT.md` | Delete and retention contract for ordinary unpaid cases, unpaid pending checkout cases, and protected permanent records. Defines recovery windows, purge metadata, and frontend/backend delete eligibility. |
| `docs/TRIAL_WORKSPACE_ACCESS_CONTRACT.md` | Trial and pilot extension workspace access contract. Defines Free 7-Day Trial, $9 Pilot Extension, access window rules, same-capability model, and confirms Receipt / Verification standards are not lowered during trial or extension. |
| `docs/PAYMENT_LEDGER_SMOKE_AUDIT_3_D4.md` | `paymentRecords.json` lifecycle coverage for `checkout_created`, `paid`, `active`, `failed`, and `canceled`. |
| `docs/STRIPE_WEBHOOK_CONFIG_CHECK_3_D5.md` | Production Stripe webhook destination, Render `STRIPE_WEBHOOK_SECRET` configuration, and webhook existence/signature check. |

`docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md` is the system-wide case lifecycle source of truth.

`docs/TRIAL_WORKSPACE_ACCESS_CONTRACT.md` is the trial/extension access-window source of truth.

Trial, pilot extension, standard workspace, and future paid plans should all use the system-wide lifecycle model.

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
