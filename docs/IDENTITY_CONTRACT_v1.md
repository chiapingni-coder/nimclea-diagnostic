# Identity Contract v1

## Purpose

This document defines the canonical identity model for Nimclea so future backend writes, Stripe webhook handling, and audit trails attach records to the correct entity boundary.

## Canonical Entities

| Entity | Meaning |
| --- | --- |
| User | A human account or authenticated actor. |
| Customer | A billing/workspace owner, organization, or account container. |
| Case | One diagnostic decision / receipt / verification workflow. |
| Receipt | The locked baseline record for one case. |
| Verification | The formal review workflow and result for one case. |
| Payment | A Stripe-confirmed payment event scoped to either a case or subscription. |
| Subscription | Customer/user-level recurring access or workspace plan state. |

## Stable IDs

| Entity | Canonical id field | Where created | Where stored | Downstream references |
| --- | --- | --- | --- | --- |
| User | `userId` | Account/session creation or stable local identity fallback | `users.json`, `trials.json`, case owner metadata when available | Customers, cases, trials, email logs, event logs, subscription records |
| Customer | `customerId` | Customer/workspace creation or billing setup | `users.json`, planned customer/workspace records, subscription records | Users, cases, subscription records, Stripe customer mapping |
| Case | `caseId` | Diagnostic/case creation flow | `cases.json`, `trials.json`, receipt records, event logs, hash ledger entries | Receipts, verifications, case-scoped payments, evidence events |
| Receipt | `receiptId` | Receipt creation or receipt payment checkout record creation | `receiptRecords.json`, `hashLedger.json` | Case, hash ledger entries, receipt payment records, verification baseline |
| Verification | `verificationId` | Formal verification workflow creation or future verification issuance | `cases.json` today when embedded, planned verification records | Case, verification payment, evidence package/version records |
| Payment | `paymentId` or `stripeSessionId` | Stripe checkout creation or webhook confirmation | `subscriptionRecords.json`, `receiptRecords.json`, `cases.json` payment objects, planned payment records | Subscription, case receipt payment, case verification payment |
| Subscription | `subscriptionId` or `stripeSubscriptionId` | Stripe subscription checkout/webhook confirmation | `users.json`, `subscriptionRecords.json`, planned customer/workspace records | User, customer, workspace access, subscription payment events |

## Relationship Rules

- One user can belong to one or more customers.
- One customer can have multiple cases.
- One case can have one receipt.
- One case can have one or more verification/payment events.
- Subscription belongs to customer/user level, not only case level.
- Payment can be case-scoped or subscription-scoped.
- Receipt payment applies only to the case referenced by `caseId`.
- Formal verification payment applies only to the case referenced by `caseId`.
- Subscription payment may unlock customer/workspace access but must not by itself mark a case receipt or verification paid.
- Evidence package/version records belong to the completed case output and should reference the originating case and verification.

## Current Backend Files Mapping

| Entity | Current files | Notes |
| --- | --- | --- |
| User | `users.json`, `trials.json` | Stores email, user/workspace metadata, subscription summary fields, and trial ownership context. |
| Customer | `users.json`, planned customer/workspace records | Customer identity is currently represented through email, `customerId`, workspace fields, or Stripe customer fields when present. |
| Case | `cases.json`, `trials.json`, `eventLogs.json`, `emailLogs.json` | `caseId` is the primary case boundary and should be carried into every case-scoped downstream record. |
| Receipt | `receiptRecords.json`, `hashLedger.json`, `cases.json` | Receipt state may be embedded on the case and also persisted in receipt/hash ledger records. |
| Verification | `cases.json`, `eventLogs.json`, planned verification records | Verification state is currently case-embedded; future records should reference `caseId` and `verificationId`. |
| Payment | `receiptRecords.json`, `cases.json`, `subscriptionRecords.json` if present, planned payment records | Receipt and formal verification payments are case-scoped. Subscription payments are customer/workspace-scoped. |
| Subscription | `users.json`, `subscriptionRecords.json` if present or planned | Subscription records should be treated as customer/user/workspace state, even when a case id is included for checkout context. |
| Email log | `emailLogs.json` | May reference `userId`, `customerId`, `caseId`, email address, and delivery context. |
| Event log | `eventLogs.json` | May reference `userId`, `customerId`, `caseId`, and workflow event metadata. |
| Trial | `trials.json` | May reference user, customer, case, diagnostic, and trial/session identity. |

## Required Fields for Future Webhook Writing

Stripe webhook writes should include these minimum fields where applicable:

| Field | Required use |
| --- | --- |
| `stripeSessionId` | Connect webhook event to the originating Checkout session. |
| `stripeCustomerId` | Connect payment/subscription state to the Stripe customer. |
| `stripeSubscriptionId` | Required for recurring subscription lifecycle updates. |
| `productType` | Distinguish `workspace_subscription`, legacy `pilot_extension`, `receipt_activation`, and `formal_verification`. |
| `paymentScope` | Explicitly identify `customer_workspace` or `case`. |
| `userId` | Link payment/subscription events to the user when known. |
| `customerId` | Link payment/subscription events to the customer/workspace when known. |
| `caseId` | Required for case-scoped receipt and formal verification payments. |
| `status` | Current payment/subscription state, such as `checkout_created`, `paid`, `active`, `canceled`, or `failed`. |
| `createdAt` | Initial backend record creation timestamp. |
| `updatedAt` | Last backend write timestamp. |

Webhook writes should also preserve Stripe event ids where available so repeated webhook deliveries can be handled idempotently.

## Explicit Non-goals

- Do not rename current Data Contract fields in this step.
- Do not implement webhook logic in this step.
- Do not migrate data in this step.
- Do not change frontend behavior in this step.
- Do not change backend route behavior in this step.
