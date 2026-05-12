# Nimclea Golden Test Cases v0.1

Date: 2026-05-12  
Scope: Readiness/scoring behavior baseline  
Status: Drafted  
Code changes: none

---

## 1. Purpose

This document defines expected readiness and scoring outcomes for representative Nimclea cases before future algorithm tuning.

The goal is to preserve a baseline sample set so future 11-series work can detect when the system becomes too strict or too loose.

---

## 2. Scope

- This is a documentation baseline.
- No code behavior changes are made.
- These cases are not yet automated fixtures.
- No mock runtime data files are created.
- Future 11-series steps may convert these cases into automated smoke or regression tests.

---

## 3. Source of Truth

Primary reference:

- `docs/NIMCLEA_READINESS_SCORING_RULE_TABLE_V0_1.md`

Implemented source files referenced:

- `frontend/utils/deterministicScore.js`
- `frontend/utils/dataContractLifecycle.js`
- `frontend/utils/sharedReceiptVerificationContract.js`
- `frontend/lib/accessMode.js`
- `frontend/pages/CasesPage.jsx`
- `frontend/pages/ReceiptPage.jsx`
- `frontend/pages/VerificationPage.jsx`
- `backend/server.js` where aggregation and record selection are relevant

---

## 4. Golden Case Table

| Golden Case ID | Case Name | Layer Tested | Minimal Input Pattern | Expected Score / Readiness | Expected UI State | Expected Access / Unlock | Why This Must Pass | Future Automation Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GTC-001 | Diagnostic Only Case | UI State / Hard Gate boundary | No event; no receipt context; no paid state; diagnostic/result continuation only | Not receipt-ready; no yellow receipt state | `Diagnostic completed`; not yellow; not green | No receipt/payment unlock from this state | Prevents plain diagnostic shells from becoming receipt cases | Fixture should assert `/cases` label and absence of receipt-ready/not-ready labels. |
| GTC-002 | Event Captured But Not Receipt Ready | Soft Signal vs Hard Gate | At least one event; insufficient evidence/structure/continuity/formability | Event may raise score but must not pass readiness gates | `Event captured (n)` or receipt not ready if receipt context exists; not green | No ready unlock from event alone | Event count alone must not guarantee receipt readiness | Fixture should include vague activity and assert `receiptReady: false`. |
| GTC-003 | Insufficient Evidence Case | Hard Gate | Pilot/result context exists; no valid readiness evidence event | `readinessLevel: insufficient_record`; `receiptReady: false` | Receipt not ready / `Insufficient Record` yellow | No ready unlock | Soft cues must not pass missing evidence gate | Fixture should contain workflow/continuity text without evidence keywords/types. |
| GTC-004 | Pending Review Case | Hard Gate / UI State | Meaningful receipt path context; some evidence and structure; still missing enough continuity or receipt record formability | `readinessLevel: pending_review`; `receiptReady: false` | `Receipt Pending Review` yellow | No green ready unlock | Distinguishes reviewable but not issuable record from insufficient evidence | Fixture should make evidence pass but leave one non-critical readiness check incomplete. |
| GTC-005 | Receipt Ready Green Case | Hard Gate / UI State | At least one real evidence event; evidence, structure, consistency, continuity, receipt record formability all pass; threshold satisfied | `receiptReady: true`; deterministic threshold satisfied when applicable | `READY FOR FORMAL DETERMINATION`; `/cases`: `Receipt ready` | Receipt view/ready path available | Confirms green only when hard readiness boundary is met or trusted backend ready exists | Fixture should assert no yellow/failed label. |
| GTC-006 | Broken Evidence Chain Case | Hard Gate | Explicit broken/failed/mismatch/inconsistent evidence-lock signal | `readinessLevel: failed`; `receiptReady: false` even if other soft signals are strong | `Receipt Failed` red | No readiness unlock | Broken evidence chain must block readiness | Fixture should combine strong soft signals with broken lock and assert red/fail. |
| GTC-007 | Backend Receipt Ready Precedence Case | Backend Precedence | Trusted backend receipt-ready signal exists; local scoring may be incomplete | Backend ready controls ready behavior | Green-ready / `/cases`: `Receipt ready` | Receipt ready path available | Trusted backend lifecycle must win over stale local scoring | Fixture must mark source as trusted backend, not fallback/cache/snapshot. |
| GTC-008 | Fallback Snapshot Must Not Upgrade Case | Backend Precedence | Only fallback/cache/snapshot-like ready signal exists; no trusted backend readiness | Must not become green from fallback signal alone | Not green; may remain checking, diagnostic, event captured, or yellow depending real context | No backend-ready unlock | Prevents local snapshot/cache from manufacturing readiness | Fixture should use fallback source tokens such as `receipt_snapshot` or cache-like source. |
| GTC-009 | Paid But Not Evidence-Ready Case | Payment Unlock | Paid or receipt checkout status exists; evidence/readiness is not sufficient | Payment must not add evidence score or pass evidence gate | Payment label/access state may show `Paid` or `Receipt checkout started`; not evidence-ready green from payment alone | Payment/access state may unlock paid surface only where intended | Payment is not evidence quality | Fixture should assert scoring evidence remains unchanged by payment fields. |
| GTC-010 | Verification Ready Case | Verification Hard Gate / UI State | Receipt/verification checks pass; consistency passes | `resolvedVerificationEligible: true` where contract applies | `Verification Ready` green | Verification ready/access path available according to payment/access rules | Confirms verification ready means checks and consistency pass | Fixture should include checks all `passed` and no consistency conflicts. |
| GTC-011 | Verification Warning Case | Verification UI State | No failed checks; at least one warning or not-all-passed condition | Not fully ready; warning state | `Verification Warning` yellow | May allow internal review but not formal ready state | Prevents warning from being mislabeled ready | Fixture should include at least one `warning` check and zero failed checks. |
| GTC-012 | Verification Failed Case | Verification Hard Gate / UI State | At least one failed verification check | Failed verification status | `Verification Failed` red | No formal ready state | Failed checks must dominate warning/ready labels | Fixture should include one failed check among otherwise passing checks. |
| GTC-013 | Access-Mode Verification Fallback Case | Mixed / Needs Refactor | `backendVerificationEligible: false`; `receiptEligible: true`; `eventCount > 0` | Access-mode may allow verification view | Verification access may be available, but this should not imply formal verification quality | Verification view access may be true | Documents current blended access/eligibility fallback | Mark as mixed-risk fixture; future refactor may split access from readiness. |
| GTC-014 | Threshold Mismatch Sentinel Case | Mixed / Needs Refactor | Case score between `3.0` and `3.5` | Current ambiguity preserved: deterministic/readiness threshold can pass at `3.0`, legacy shared contract threshold is `3.5` | UI depends on consuming layer | Access depends on consuming layer | Prevents accidental threshold changes before explicit cleanup | Fixture should record both contract outputs and not resolve mismatch in 11-A3. |
| GTC-015 | Case Ordering / Record Selection Case | Aggregation / Record Selection | Multiple records or duplicate case-shaped records exist; created timestamp and richness/order matter | Richer/trusted record selection should not downgrade case state | Latest/trusted case state should remain visible | Access should follow selected trusted lifecycle state | Aggregation behavior must not downgrade readiness or title/status | Fixture should compare duplicate case records with different timestamps/richness. |

---

## 5. Expected Outcome Matrix

| Case ID | Should Be Green? | Should Be Yellow? | Should Be Red? | Should Be Diagnostic? | Should Payment Affect Evidence Score? | Should Backend Precedence Apply? |
| --- | --- | --- | --- | --- | --- | --- |
| GTC-001 | No | No | No | Yes | No | No |
| GTC-002 | No | Maybe, only with receipt context | No | No | No | No |
| GTC-003 | No | Yes | No | No | No | No |
| GTC-004 | No | Yes | No | No | No | No |
| GTC-005 | Yes | No | No | No | No | Maybe, if backend ready signal is used |
| GTC-006 | No | No | Yes | No | No | No |
| GTC-007 | Yes | No | No | No | No | Yes |
| GTC-008 | No | Depends on real non-ready context | No | Depends on diagnostic context | No | No |
| GTC-009 | No, unless independently ready | No, unless independently non-ready receipt context exists | No | No | No | Maybe, only for trusted paid/lifecycle state |
| GTC-010 | Yes for verification | No | No | No | No | Maybe |
| GTC-011 | No | Yes for verification | No | No | No | Maybe |
| GTC-012 | No | No | Yes for verification | No | No | Maybe |
| GTC-013 | No readiness guarantee | No | No | No | No | No |
| GTC-014 | Ambiguous by consuming layer | Ambiguous by consuming layer | No | No | No | No |
| GTC-015 | Depends on selected trusted record | Depends on selected trusted record | Depends on selected trusted record | Depends on selected trusted record | No | Yes, if trusted backend record exists |

---

## 6. Boundary Rules

- Soft signals must not pass hard gates alone.
- Payment must not increase evidence quality.
- UI state must not create readiness.
- Backend precedence must only apply to trusted backend signals.
- Broken evidence chain must block readiness.
- Event count alone must not guarantee receipt readiness.
- Threshold mismatch must be preserved as a known ambiguity until explicitly resolved.

---

## 7. 11-A3 Known Findings

- Golden cases now define expected behavior before tuning.
- The current riskiest areas are threshold mismatch, access-mode verification fallback, and backend/local readiness blending.
- No behavior was changed in 11-A3.

---

## 8. 11-Series Progress

| Step | Status | Date | Scope | Code changes |
| --- | --- | --- | --- | --- |
| 11-A1: Readiness / Scoring Rule Table v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A2: Rule-layer classification | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A3: Golden Test Cases v0.1 | PASS / committed | 2026-05-12 | Documentation only | none |
| 11-A4: Golden Test Execution Plan v0.1 | Drafted | 2026-05-12 | Documentation only | none |

