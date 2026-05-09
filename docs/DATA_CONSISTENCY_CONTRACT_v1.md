# Data Consistency Contract v1

This contract defines the canonical consistency rules for Nimclea case records. Its primary purpose is to prevent frontend snapshots, route context, or localStorage state from downgrading backend case state.

## 1. Canonical Case Spine

The canonical case spine is the minimal persisted record identity and lifecycle state that all pages must respect.

| Field | Owner | Contract |
| --- | --- | --- |
| `caseId` | Backend consolidated case | Stable case identity. Frontend copies may reference it but must not create competing truth. |
| `stage` | Backend consolidated case | Canonical lifecycle stage. Frontend views may render it but must not persist an older stage over a newer one. |
| `receipt_ready` | Backend consolidated case | Monotonic readiness flag. Once true, older frontend snapshots must not set it false. |
| `receipt_paid` | Backend consolidated case | Monotonic payment flag. Once true, older frontend snapshots must not set it false. |
| `verification_ready` | Backend consolidated case | Monotonic readiness flag. Once true, older frontend snapshots must not set it false. |
| `verification_issued` | Backend consolidated case | Monotonic issuance flag. Once true, older frontend snapshots must not set it false. |
| `updatedAt` | Backend consolidated case | Used to compare freshness where available. Missing timestamps never outrank backend state. |

## 2. Canonical Stage Enum

Stages describe the case lifecycle. They are ordered for downgrade prevention, but pages should still use backend-provided values as the canonical label.

| Stage | Meaning | Notes |
| --- | --- | --- |
| `intake` | Case has been created or imported. | Earliest durable state. |
| `diagnostic` | Diagnostic data collection or review is active. | May include incomplete event data. |
| `receipt_ready` | Receipt can be generated or presented. | Must align with `receipt_ready = true`. |
| `receipt_paid` | Receipt payment has been confirmed. | Must align with `receipt_paid = true`. |
| `verification_ready` | Verification can be issued. | Must align with `verification_ready = true`. |
| `verification_issued` | Verification has been issued. | Must align with `verification_issued = true`. |

## 3. Truth Source Priority

When the same field appears in multiple places, consumers must apply this priority order.

| Priority | Source | Role |
| --- | --- | --- |
| 1 | Backend consolidated case | Highest truth source for persisted case state and monotonic flags. |
| 2 | Backend API-derived response fields | Trusted derived view of backend state for the current request. |
| 3 | `location.state` | Navigation context only. May prefill UI while backend data loads. |
| 4 | `localStorage` | Fallback/cache only. May restore context but cannot overwrite fresher backend state. |
| 5 | Page-local computed values | Display-only unless explicitly submitted and accepted by backend. |

## 4. No Downgrade Rule

Frontend snapshots must never downgrade canonical backend state. This applies even when an older snapshot is loaded later from navigation state, localStorage, or page memory.

| Field | Downgrade Forbidden |
| --- | --- |
| `receipt_ready` | `true -> false` |
| `receipt_paid` | `true -> false` |
| `verification_ready` | `true -> false` |
| `verification_issued` | `true -> false` |
| `stage` | Later lifecycle stage -> earlier lifecycle stage |

If sources conflict, preserve the backend value. A fallback source may only fill a missing field; it must not replace a known backend value with an older or weaker value.

## 5. Derived Fields Contract

Derived fields may be displayed by pages, but each field has a clear source owner.

| Field | Source Owner | Contract |
| --- | --- | --- |
| `eventCount` | Backend event store or backend consolidated response | Count persisted events. Frontend may display the value but must not persist an invented count as case truth. |
| `receiptEligible` | Backend eligibility logic | Derived from backend case and event state. Frontend may show the result but must not make permanent eligibility decisions independently. |
| `verificationEligible` | Backend eligibility logic | Derived from backend case, payment, and verification state. Frontend may show the result but must not issue permanent truth independently. |
| `paymentStatus` | Backend payment/receipt state | Owned by persisted payment evidence and receipt flags. Frontend labels must reflect backend state and cannot downgrade `receipt_paid`. |

## 6. Page Consumption Contract

Pages may merge backend data with fallback context for rendering, but persistence boundaries must remain clear.

| Page Behavior | Allowed | Forbidden |
| --- | --- | --- |
| Initial render | Show `location.state` or `localStorage` while backend data loads. | Treat fallback data as authoritative after backend state is available. |
| Data merge | Fill missing display-only fields from fallback context. | Replace backend monotonic flags with older fallback values. |
| Derived display | Render `eventCount`, eligibility, and payment labels from backend responses. | Invent permanent case truth from page-local calculations. |
| Save/update | Submit user actions to backend and wait for backend acceptance. | Persist a stale frontend snapshot over backend case state. |
| Refresh/revisit | Rehydrate context from storage for UX continuity. | Downgrade `stage` or readiness/payment/issuance flags from stored snapshots. |

## 7. Step 5 Completion Checklist

| Check | Requirement |
| --- | --- |
| Backend priority | Consolidated backend case is treated as the highest truth source. |
| Fallback limits | `localStorage` and `location.state` are fallback/context only. |
| Monotonic flags | `receipt_ready`, `receipt_paid`, `verification_ready`, and `verification_issued` cannot be downgraded by older frontend snapshots. |
| Stage ordering | Older frontend stages cannot overwrite newer backend lifecycle stages. |
| Derived ownership | `eventCount`, `receiptEligible`, `verificationEligible`, and `paymentStatus` have explicit backend ownership. |
| Page boundary | Pages may display derived fields but must not invent permanent truth. |
| Persistence boundary | Permanent state changes must be accepted by backend before they become canonical. |
