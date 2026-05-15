# Nimclea 17-G5-A Release Stability Stop Line v0.1

## 1. Purpose

This document defines the release stability stop line for Nimclea before broader production release.

The goal is not to promise that a UI or lifecycle issue can never happen again.  
The goal is to make sure any issue that affects user trust is detected, classified, blocked, and resolved before release.

This stop line separates release stabilization from endless bug chasing.

A release may continue only when the core flow is stable enough that users do not experience contradictory states, misleading transitions, or broken case continuity.

## 2. Core principle

Nimclea release trust is based on four things:

1. The system preserves case identity.
2. The user sees one coherent state at a time.
3. Readiness states do not briefly show a wrong decision before correcting themselves.
4. Any regression in the core path stops the release instead of being treated as harmless polish.

A visual flicker is not automatically a blocker.  
A flicker becomes a blocker when it communicates the wrong product meaning.

## 3. Protected release path

The stop line applies to the main production path:

1. Access entry
2. CasesPage
3. Diagnostic Result
4. Case Plan / Pilot Plan
5. Pilot Result
6. Receipt
7. Verification

The most sensitive areas are:

- Access routing
- CaseId preservation
- CasesPage next-action routing
- Receipt readiness hydration
- Receipt insufficient / ready / paid states
- Verification eligibility from receipt state

## 4. Stop-line triggers

Release must stop if any of the following happens in the protected release path.

### 4.1 Wrong state appears before correct state

Stop release if a page briefly shows a meaningful wrong state before showing the correct state.

Examples:

- Receipt briefly shows insufficient, yellow, warning, or non-ready state before becoming ready.
- Receipt briefly shows a generic gray state that implies uncertainty after the backend already has enough context to resolve readiness.
- CasesPage briefly shows the wrong next action before correcting itself.
- Access briefly shows a diagnostic prompt for a returning user before routing to cases.

A neutral loading state is acceptable only if it does not imply a decision.

### 4.2 Case continuity breaks

Stop release if case identity is lost, replaced, or mismatched.

Examples:

- `caseId` disappears during navigation.
- Result, Pilot, Receipt, and Verification refer to different records.
- A deep link opens the right page but attaches to the wrong case.
- LocalStorage overrides a newer backend case record incorrectly.
- A renamed case displays an older stale name in a later step.

### 4.3 Receipt readiness becomes non-authoritative

Stop release if ReceiptPage renders a readiness decision before authoritative inputs are settled.

Examples:

- The page displays insufficient before receipt hydration completes.
- A known ready receipt renders as not ready during the first paint.
- Backend repair, receipt hydration, event count, or readiness flags disagree.
- A loading guard clears too early and exposes a temporary wrong decision.

Receipt readiness must prefer correctness over speed.

### 4.4 Access and Cases entry regress

Stop release if the access boundary regresses.

Examples:

- Returning users are sent to Diagnostic instead of CasesPage.
- New users bypass the intended diagnostic entry.
- Access panel flashes and disappears with incorrect meaning.
- CasesPage loads but then routes to an unrelated page.
- The user sees duplicate or conflicting entry prompts.

### 4.5 Core CTA routing is wrong

Stop release if a main CTA routes to the wrong lifecycle step.

Examples:

- `Continue Case` opens Receipt when it should open Case Plan.
- `Detail` opens Pilot Setup when it should open Receipt.
- `Start 7-day pilot` appears in a returning case review context.
- `Start a case` appears where first-run trial language is required.
- Verification is reachable without an eligible or issued receipt.

### 4.6 Patch scope exceeds stability boundary

Stop release if the proposed fix requires broad cross-system edits during release stabilization.

A fix is considered too broad if it:

- Touches more than one lifecycle boundary without a written reason.
- Changes frontend and backend behavior together without a test note.
- Changes payment, trial, receipt, and case routing in one patch.
- Requires more than three meaningful product logic edits without a Codex patch instruction.
- Alters protected copy, routing, gating, and persistence in the same patch.

Large changes must move to a separate stabilization task, not be folded into a release fix.

### 4.7 Build or release gate fails

Stop release if any required validation fails.

Minimum validation before release continuation:

```powershell
git status --short
npm --prefix frontend run build
node scripts/check-release-gate.mjs
```
