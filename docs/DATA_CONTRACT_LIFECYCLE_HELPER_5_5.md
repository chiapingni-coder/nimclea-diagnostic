# Data Contract Lifecycle Helper 5.5

## Why This Helper Exists

`frontend/utils/dataContractLifecycle.js` centralizes lifecycle ranking, backend-owned readiness detection, and no-downgrade protection for the core data-contract pages. The goal is to keep CasesPage, ReceiptPage, and VerificationPage from each maintaining slightly different versions of receipt-ready, paid, activated, issued, and verification-ready logic.

The helper keeps route state, localStorage, preview caches, and local test snapshots from becoming backend-owned truth.

## Lifecycle Rank Order

Later values are stronger than earlier values.

| Rank | Lifecycle value |
| --- | --- |
| 0 | `draft` |
| 1 | `diagnostic` |
| 2 | `diagnostic_completed` |
| 3 | `result_ready` |
| 4 | `event_captured` |
| 5 | `receipt_pending` |
| 6 | `receipt_ready` |
| 7 | `receipt_checkout_started` |
| 8 | `receipt_paid` |
| 9 | `receipt_activated` |
| 10 | `receipt_issued` |
| 11 | `verification_ready` |
| 12 | `verification_completed` |
| 13 | `verification_issued` |

Supported aliases include `workspace_active`, `active`, `paid`, `activated`, `issued`, `ready`, `completed`, and `verification_completed`.

## No-Downgrade Examples

- `receipt_paid` is preserved over a proposed `receipt_ready`.
- `receipt_activated` is preserved over a proposed `receipt_ready`.
- `receipt_issued` is preserved over a proposed `receipt_ready`.
- `verification_ready` is preserved over any receipt-level proposed state.
- `verification_issued` is preserved over any weaker proposed state.

Pages should call `preserveStrongerLifecycleFields()` before applying lifecycle-like patches and `shouldSkipReceiptReadyPatch()` before writing receipt-ready state.

## Pages Now Consuming It

| Page | Helper usage |
| --- | --- |
| `frontend/pages/CasesPage.jsx` | Receipt-ready detection, receipt paid/activated detection, verification access detection, and receipt route signal protection. |
| `frontend/pages/ReceiptPage.jsx` | Explicit backend receipt-ready detection, receipt activation/payment detection, receipt-ready PATCH skip logic, and stronger lifecycle patch preservation. |
| `frontend/pages/VerificationPage.jsx` | Backend-owned verification gate, receipt/payment/verification access checks, monotonic verification eligible/ready/issued signals, and backend hash helpers. |

## Remaining Follow-Up Items

- Move page-local readiness adapter assembly into shared adapters where practical.
- Add small unit tests for lifecycle rank comparisons and no-downgrade examples.
- Continue clarifying preview/local hash labels in UI.
- Keep payment/subscription persistence backend-owned.
- Consider preferring direct `/case/:caseId` data over email-list backend data when both are available, or compare backend timestamps.
