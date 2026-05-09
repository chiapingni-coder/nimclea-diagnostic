# Customer / Case Boundary Contract 5.6-B4

## Core Principle

Customer is not Case.

One customer can own and run many cases.

A case is a specific decision / receipt / verification workflow.

A customer relationship can continue after one case is completed.

## Entity Model

| Layer | Meaning |
| --- | --- |
| Customer / User / Workspace | The account or organization layer. |
| Case | The individual decision record. |
| Receipt | The locked baseline for one case. |
| Verification | The formal determination workflow for one case. |
| Evidence Package / Package Version | The issued/exported artifact for one case/version. |

Hierarchy:

Customer / User / Workspace
-> Case
-> Receipt
-> Verification
-> Evidence Package / Package Version

## Customer-Level Fields

| Field | Owner |
| --- | --- |
| `userId` | Customer / workspace |
| `customerId` | Customer / workspace |
| `workspaceId` | Customer / workspace |
| `email` | Customer / workspace |
| `company` | Customer / workspace |
| `subscriptionStatus` | Customer / workspace |
| `plan` | Customer / workspace |
| `pilotExtensionPaid` | Customer / workspace |
| `pilotExtensionPaidAt` | Customer / workspace |
| `subscriptionPaymentStatus` | Customer / workspace |
| `stripeCustomerId` | Customer / workspace |
| Workspace-level limits or quotas | Customer / workspace |

These fields must not be interpreted as case-level receipt or verification payment.

## Case-Level Fields

| Field | Owner |
| --- | --- |
| `caseId` | Case |
| `customerId` / `userId` / `email` reference | Case ownership link |
| Diagnostic result | Case |
| `currentStep` | Case |
| `stage` | Case |
| `status` | Case |
| `receiptEligible` | Case |
| `caseReceiptEligible` | Case |
| `receiptStatus` | Case |
| `receiptPayment` | Case |
| `receiptActivated` | Case |
| `receiptIssued` | Case |
| `verificationEligible` | Case |
| `verificationStatus` | Case |
| `verificationPayment` | Case |
| `verificationPaid` | Case |
| `verificationActivated` | Case |
| `verificationIssued` | Case |
| `eventCount` | Case |
| Trusted evidence events | Case |

Receipt payment and formal verification payment are case-level, not customer-level.

## Evidence Package / Version-Level Fields

| Field | Owner |
| --- | --- |
| `packageId` | Evidence package / version |
| `caseId` | Evidence package / version case link |
| `version` | Evidence package / version |
| `packageHash` | Evidence package / version |
| `issuedAt` | Evidence package / version |
| `exportedAt` | Evidence package / version |
| `downloadUrl` | Evidence package / version |
| `exportCount` | Evidence package / version |
| `packageStatus` | Evidence package / version |
| `amendmentOfPackageId` | Evidence package / version |
| `sourceVerificationId` | Evidence package / version |

A completed package can be downloaded repeatedly.

A changed record should create an amendment, re-issue, or new package version rather than mutating the original issued package.

## Payment Boundary

| Payment layer | Examples |
| --- | --- |
| Customer/workspace-level payment | Subscription, pilot extension, workspace plan |
| Case-level payment | Receipt activation, formal verification |
| Package/version-level event | Export/download record, re-issue/amendment fee if applicable |

Rules:

- Subscription paid does not mean receipt paid.
- Subscription paid does not mean verification paid.
- Receipt paid does not mean formal verification paid.
- Formal verification paid applies only to that case.
- Evidence package export after formal verification is included for the same issued version.
- Re-issue/amendment may create a new paid event.

## Lifecycle Boundary

Customer lifecycle and case lifecycle are separate.

Customer can be:

- active
- trial
- subscribed
- cancelled

Case can be:

- draft
- diagnostic_completed
- result_ready
- receipt_ready
- receipt_paid
- receipt_activated
- receipt_issued
- verification_ready
- verification_paid
- verification_active
- verification_issued
- completed
- archived

A completed case does not mean the customer is completed.

## Multi-Case Rules

- One customer may run multiple cases at the same time.
- One customer may run cases across different time periods.
- One case completion must not close other active cases.
- One case payment must not unlock another case unless explicitly defined by a workspace plan.
- CasesPage should list cases by customer identity but render state per `caseId`.
- ReceiptPage and VerificationPage must always operate on one `caseId`.

## Anti-Patterns

Forbidden:

- Treating customer subscription as case receipt payment.
- Treating customer subscription as formal verification payment.
- Treating one case's receipt hash as another case's receipt hash.
- Treating localStorage customer flags as case payment truth.
- Treating one completed case as customer completion.
- Mutating an issued evidence package instead of creating an amendment/version.
- Losing `caseId` when navigating between Receipt and Verification.
- Showing case-level paid state based only on customer-level plan.

## Implementation Notes

Future code should use explicit naming:

| Level | Names |
| --- | --- |
| Customer-level | `customerSubscription`, `workspacePlan`, `pilotExtension` |
| Case-level | `receiptPayment`, `verificationPayment`, `caseLifecycle` |
| Package-level | `evidencePackage`, `packageVersion`, `amendment` |

Recommended future helper names:

- `isCustomerSubscriptionActive(customer)`
- `isCaseReceiptPaid(caseRecord)`
- `isCaseVerificationPaid(caseRecord)`
- `isEvidencePackageIssued(packageRecord)`
- `resolveCaseOwner(caseRecord)`
- `assertCaseScopedPayment(payment, caseId)`

## Impact on 5.6

- 5.6-B1 pilot extension belongs to customer/workspace level.
- 5.6-B2 formal verification payment belongs to case level.
- Receipt activation belongs to case level.
- Future package export belongs to package/version level.
- CasesPage must not confuse these layers.

## Final Status

Status: Contract created

Code changes: none

Ready for next step: audit payment persistence against customer/case boundary
