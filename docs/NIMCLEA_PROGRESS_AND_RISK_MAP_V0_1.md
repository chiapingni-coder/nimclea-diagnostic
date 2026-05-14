# Nimclea Progress and Risk Map v0.1

Status date: 2026-05-12

Scope: documentation-only checkpoint after the recent 11-A, 11-B, 13-C, and 13-E documentation/checkpoint work.

## 1. Overall Progress Snapshot

The main Nimclea user flow is now near 90%+ stable for the documented happy path:

1. Start or resume a 7-day trial case.
2. Complete diagnostic capture.
3. Reach receipt readiness without known ready-case downgrade behavior.
4. Open the correct case detail route for receipt-stage cases.
5. Preserve case identity and title/name context through the repaired lifecycle paths.
6. Gate verification entry behind backend-owned receipt/payment/verification state.
7. Track release, regression, and manual launch procedures through the new documentation set.

Overall launch readiness is lower, approximately 78%-83%, because several cross-cutting risks remain outside the stabilized main flow. The biggest gaps are payment truth consolidation, real Stripe smoke coverage, backend `/cases` aggregation complexity, insufficient golden regression breadth, and the risk of UI regressions as readiness and routing logic continue to evolve.

The current project state should be read as: the core flow is largely usable and documented, but the launch surface still needs a final hardening pass before it should be treated as production-ready.

## 2. Module Completion Table

| Module | Approx. completion | Current status | Remaining gap |
| --- | ---: | --- | --- |
| 7-day trial main flow | 88%-93% | Main path is stable enough for checkpoint validation and release procedure documentation. | Needs final end-to-end launch pass with current data and real payment boundaries. |
| Case lifecycle and routing | 86%-91% | Receipt-stage routing and case lifecycle regression gates are documented; prior detail-routing issues have a regression target. | Legacy case shapes and title/name preservation still need continued guard coverage. |
| Receipt readiness | 86%-91% | 15-A3 Receipt readiness transition contract and 15-A4 contract smoke guard are complete; backend-ready signals are treated as monotonic in the documented contract. | Contract-level downgrade risk is reduced, but runtime fixture/mock behavior and paid-flow validation remain pending. |
| Verification gating | 82%-88% | Verification access is documented as backend/payment-owned and should not unlock from local route state alone. | Needs continued validation around formal verification payment, proof state, and export readiness. |
| Payment ledger / Stripe | 65%-75% | Payment ownership and customer/case boundaries are documented; dry-run and ledger audits exist. | Payment state remains fragmented across compatibility mirrors, and a real Stripe payment smoke is not yet completed. |
| Golden cases / regression | 72%-80% | Golden cases and final regression gate documentation now exist. | Coverage is not yet broad enough to cover all legacy case variants, payment states, and backend aggregation edge cases. |
| Backend aggregation | 70%-78% | `/cases` aggregation responsibilities and regression triggers are identified. | Aggregation still combines lifecycle, events, receipt, payment, title/name, and compatibility overlays in one complex surface. |
| Release notes / documentation index | 88%-94% | Release checklist, manual procedure, release notes template, release notes index, and hardening notes exist. | Needs ongoing pruning so the launch operator can find the authoritative document quickly. |
| Launch readiness | 78%-83% | The project has a coherent documented path to release. | Final launch readiness depends on 14-B through 14-E hardening, real payment smoke, and expanded regression evidence. |

## 3. Risk Map

| Risk | Severity | Current impact | Recommended containment |
| --- | --- | --- | --- |
| Legacy case technical debt | High | Older case shapes can still exercise fallback fields and compatibility behavior not fully covered by current golden cases. | Expand golden regression fixtures across legacy lifecycle, receipt, and payment variants. |
| Case name source conflict | Medium | Case title/name may come from backend case, local registry, route state, receipt snapshots, or repaired compatibility fields. | Define backend title/name priority and add regression cases for untitled and renamed receipt-ready cases. |
| Receipt readiness hydration/flash risk | Medium-Low | 15-A3 documents that hydration/loading must not briefly display insufficient state when backend readiness exists, and 15-A4 guards that contract text. | Add a later runtime smoke using fixture/mock case records to validate live hydration behavior. |
| Detail routing regression | Medium | Detail actions can regress by sending receipt-stage cases to the wrong page. | Keep the case lifecycle regression gate in the required pre-change checklist for routing and readiness work. |
| Payment state fragmentation | High | Receipt, verification, subscription, local, ledger, and compatibility fields can disagree. 15-A3 reduces receipt-readiness contract ambiguity by separating `receiptEligible`, `paymentStatus`, and `paid`. | Complete 14-B Payment Truth Map and identify the single read priority for each payment decision. |
| Real Stripe payment smoke not yet completed | High | Dry-run and contract coverage do not prove live Stripe checkout, confirmation, webhook, and case promotion behavior. | Run a controlled real Stripe smoke before launch readiness signoff. |
| Backend `/cases` aggregation complexity | High | `/cases` still sits at the center of event merge, receipt overlay, lifecycle state, payment mirrors, and title/name preservation. | Complete 14-C Backend Aggregation Extraction and isolate pure aggregation rules from route handling. |
| Insufficient golden regression coverage | High | Current gates document important cases but do not yet cover enough old/new payment and lifecycle combinations. | Complete 14-D Golden Case Regression Expansion before treating launch gates as reliable. |
| Documentation sprawl | Medium | The project now has many useful checkpoint docs, but the authoritative path can become unclear. | Keep `NIMCLEA_RELEASE_NOTES_INDEX_V0_1.md` and launch checklist as the operator-facing entry points. |
| UI regression risk | Medium | Readiness labels, detail CTAs, verification buttons, and hydration states are sensitive to small frontend changes. | Require visual/manual smoke through the release checklist after any readiness, routing, or payment-state change. |

## 4. 15-A Receipt Readiness Progress Update

### 15-A3: Receipt readiness transition contract

Status: Completed

Nature: Documentation-only contract

Artifact:

- `docs/NIMCLEA_RECEIPT_READINESS_TRANSITION_CONTRACT_V0_1.md`

What it locked:

- Receipt readiness should not be downgraded by checkout/payment states.
- `receiptEligible` and `paymentStatus` are separate concepts.
- `checkout_created` must not overwrite `receipt_ready`.
- `paid=false` must not imply `receiptEligible=false`.
- Hydration/loading should not briefly display failure before backend readiness is known.
- `/cases` and `/case/:caseId` should converge on the same readiness interpretation.

### 15-A4: Receipt readiness transition smoke guard

Status: Completed

Nature: Regression smoke guard

What it added:

- `scripts/check-receipt-readiness-transition-contract.mjs`
- Release gate integration in `scripts/check-release-gate.mjs`

Validation:

- Contract smoke passed 28/28.
- Release gate final result WARN, FAIL 0 after known sandbox `spawnSync node EPERM`.
- `git diff --check` passed.

### Risk map effect

Reduced contract-level risk for:

- Receipt readiness downgrade after `checkout_created`.
- `paymentStatus` overwriting readiness.
- `paid=false` being misread as not ready.
- `/cases` and ReceiptPage disagreeing on readiness.
- Hydration causing temporary insufficient/failed state.

Remaining risks:

- The guard currently validates the contract text, not live backend behavior.
- A future runtime smoke may still be needed to create or simulate actual case records.
- Receipt readiness, payment activation, and verification unlock still need end-to-end paid-flow validation later.
- Stripe real-payment behavior is still outside the current 15-A scope.

Next possible step:

15-A6 or later can add a runtime smoke for receipt readiness behavior using fixture/mock case records, but only after the contract-level guard remains stable.

## 5. Stability Clarification

The main user flow is near 90%+ stable based on the recent checkpoint work. That stability applies to the documented path through trial, case lifecycle, receipt readiness, detail routing, verification gating, and release procedure tracking.

Overall launch readiness is closer to 78%-83%. The difference is intentional: launch readiness includes payment truth, real Stripe confirmation, backend aggregation reliability, old-case compatibility, regression breadth, and operator documentation quality.

## 6. Recommended Next Sequence

1. 14-B Payment Truth Map
   - Resolve payment ownership and read priority across Stripe, ledger records, case mirrors, receipt records, verification records, subscription records, and local fallbacks.
2. 14-C Backend Aggregation Extraction
   - Extract or document the backend `/cases` aggregation rules so lifecycle, event merge, receipt overlay, payment overlay, and title/name preservation can be tested independently.
3. 14-D Golden Case Regression Expansion
   - Add broader golden cases for legacy case shapes, title/name conflicts, receipt-ready hydration, payment variants, verification gating, and backend aggregation edge cases.
4. 14-E Launch Readiness Checklist
   - Convert the hardening state into a final operator checklist with explicit pass/fail evidence, including real Stripe smoke status.

## 7. No Code Changed

This 14-A checkpoint is documentation only.

No frontend code changed.
No backend code changed.
No routes changed.
No tests or scripts changed.
