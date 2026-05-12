# Nimclea Case Lifecycle Regression Gate v1

Purpose:
This gate prevents previously fixed lifecycle bugs from reappearing across /cases, ReceiptPage, title editing, and Detail routing.

Principle:
Status must follow the lifecycle contract, not the current screenshot.

## Core State Contract

### 1. Unknown / hydrating
Expected:
- Show neutral checking state.
- Do not show yellow business state yet.
- Do not show green ready state yet unless backend ready is already confirmed.

Rule:
unknown / loading / hydrating = checking neutral

### 2. Receipt ready
Expected:
- Shows Receipt ready in /cases.
- Opens ReceiptPage from Detail.
- ReceiptPage must not flash yellow before turning green.

Backend ready signals:
- receiptEligible === true
- caseReceiptEligible === true
- receiptStatus === "ready"
- status === "receipt_ready"
- stage === "receipt_ready"

### 3. Receipt not ready
Expected:
- Shows yellow state in /cases.
- Opens ReceiptPage from Detail.
- Does not open Pilot.
- Does not show Unable.

Valid yellow states:
- Receipt not ready · Pending review
- Receipt not ready · Insufficient record

Minimum contract:
Pilot Result floor = Yellow.

### 4. Diagnostic completed
Expected:
- Shows Diagnostic completed.
- Opens Pilot / continue case path.
- Must not be shown as Receipt not ready unless receipt-stage context exists.

### 5. Draft / empty shell
Expected:
- Can remain hidden or draft depending on workspace rules.
- Must not become Receipt ready.
- Must not become Receipt not ready.

### 6. Technical failure
Expected:
- Only true technical failure may show Unable.

Unable is allowed only for:
- invalid or missing caseId
- backend case fetch failure
- case cannot be found
- fatal hydration/API error

Unable is NOT allowed for:
- receiptEligible === false
- caseReceiptEligible === false
- receiptStatus empty/null when case exists

---

## Regression Checks

### Gate 1 — Case title persistence

Scenario:
1. Rename a case from /cases.
2. Enter ReceiptPage.
3. Refresh ReceiptPage.
4. Return to /cases.

Pass:
- title remains the renamed value
- title, caseName, and name stay aligned
- no lifecycle repair writes title back to Untitled case or old title

Fail:
- title reverts to Untitled case
- title reverts to old name
- title becomes caseId

---

### Gate 2 — Ready case does not flash yellow

Scenario:
Open a backend-confirmed ready receipt case.

Pass:
- no visible yellow flash
- hydrating state is neutral if needed
- final state is green / ready

Fail:
- page shows Pending Review or Insufficient Record before turning green

---

### Gate 3 — Non-ready receipt case does not show Unable

Scenario:
Open a case with:
- currentStep = receipt
- event/result context exists
- receiptEligible = false
- caseReceiptEligible = false

Pass:
- normal ReceiptPage renders
- yellow state appears inside normal page
- no Unable page

Fail:
- Unable to confirm receipt status
- standalone yellow panel replaces whole page

---

### Gate 4 — Receipt-stage case Detail routes to ReceiptPage

Scenario:
From /cases, click Detail on a receipt-stage case.

Pass:
- routes to /receipt?caseId=...
- does not route to /pilot

Fail:
- receipt-stage case opens Pilot

---

### Gate 5 — Diagnostic completed case stays diagnostic

Scenario:
A saved diagnostic result case has:
- status = diagnostic_completed
- stage = result
- currentStep = result
- receiptEligible = false
- eventCount = 0

Pass:
- displays Diagnostic completed
- does not display Receipt ready
- does not display Receipt not ready unless receipt context exists

Fail:
- diagnostic case becomes yellow receipt state
- diagnostic case becomes green receipt state

---

### Gate 6 — Receipt ready list status

Scenario:
A backend-ready case appears in /cases.

Pass:
- displays Receipt ready
- Detail opens ReceiptPage

Fail:
- displays Diagnostic completed
- displays Receipt not ready
- opens Pilot

---

### Gate 7 — Active case count contract

Scenario:
View /cases Active tab.

Pass:
- Active Cases count respects the current product limit
- hidden/draft/archived logic does not surface empty shells as active
- receipt-ready records are not misclassified as diagnostic shells

Fail:
- active count unexpectedly expands due to stale diagnostic shells
- empty draft appears as active
- real active case disappears without archive/delete

---

## Current Known Test Cases

### Test 002
CaseId:
CASE-1778104898275-6NJFDM

Expected:
- /cases status: Receipt ready
- Detail route: ReceiptPage
- ReceiptPage: green ready state
- no yellow flash

### Test 003 stable
CaseId:
CASE-1778555684423-89XWFS

Expected:
- /cases title: Test 003 stable
- /cases status: Receipt not ready · Pending review OR Receipt not ready · Insufficient record
- Detail route: ReceiptPage
- ReceiptPage: normal page, yellow non-ready state if confirmed non-ready
- no Unable
- title must not revert

### Untitled receipt-ready case
CaseId:
CASE-1778538911443-CGKV7S

Expected:
- /cases status: Receipt ready
- Detail route: ReceiptPage
- ReceiptPage: green ready state
- title may remain Untitled case unless user renames it

### Saved diagnostic result case
CaseId:
CASE-1778534248410-B2Q23D

Expected:
- status: Diagnostic completed
- must not become Receipt ready
- must not become Receipt not ready unless receipt context exists

---

## 10-Series Progress

| Step | Result | Date | Commit validated | Scope | Confirmed result | Risk status | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10-E production smoke validation | PASS | 2026-05-12 | `eaf3708` — Prefer case creation timestamp for case ordering | Online production smoke after push | All 3 smoke checks passed | No blocking regression found | 10-F documentation checkpoint only |

Notes:
- This checkpoint documents the validated state after the case ordering fix.
- No business logic changes are part of 10-F.

---

## Local Readiness / Scoring Smoke

Run from the repository root:

```powershell
node scripts/check-golden-readiness.mjs
```

Run this before changing readiness/scoring logic; after changing `frontend/utils/deterministicScore.js`, `frontend/utils/dataContractLifecycle.js`, or `frontend/utils/sharedReceiptVerificationContract.js`; after changing receipt/verification readiness behavior; and before committing future 11-series scoring/readiness changes.

Success means `PASS: 14/14 golden readiness smoke checks passed.` This confirms the current v0.1 covered golden readiness checks still pass, but it does not mean all 15 golden cases are automated.

Coverage limits:

- GTC-015 Case Ordering / Record Selection is deferred to backend aggregation / record-selection smoke.
- The check does not render React pages, call network APIs, test backend/data files, or test Stripe/payment webhooks.

This smoke check is now the first local regression command for readiness/scoring work. Future automation should expand coverage rather than weaken or bypass this check.

---

## Required Rule Before Any Future Lifecycle Fix

Before committing any change touching:
- CasesPage.jsx
- ReceiptPage.jsx
- ResultPage.jsx
- PilotPage.jsx
- backend/routes/caseRoutes.js
- backend/utils/supabaseMirrorWrites.js

Run this gate manually.

Do not commit if one fixed state causes another state to regress.

## Commit Rule

Each lifecycle commit should declare which gate it fixes.

Examples:
- Fix Gate 1: Preserve case title during receipt repair
- Fix Gate 2: Prevent ready receipt yellow flash during hydration
- Fix Gate 4: Route receipt-stage detail to receipt page
