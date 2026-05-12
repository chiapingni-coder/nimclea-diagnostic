# Nimclea 10-C Final Smoke Checklist: 7-Day Trial Chain

Date: 2026-05-12  
Scope: 7-day trial user journey final smoke checklist  
Status: Ready for final smoke validation  
Code change: No frontend/backend code change required

---

## 1. Purpose

This checklist freezes the final validation path for the Nimclea 7-day trial chain.

The goal is not to add new features.  
The goal is to confirm that a new user can move through the trial path cleanly without broken identity, stale case name, wrong routing, duplicate naming, or receipt-stage confusion.

---

## 2. Out of Scope

The following items are intentionally excluded from this 10-C smoke checklist:

- Real Stripe payment execution
- Real receipt payment success webhook
- Formal verification paid smoke test
- Algorithm scoring refinement
- UI redesign
- New pricing changes
- Backend data migration
- Large refactor of identity or case registry logic

Payment remains paused until the 7-day trial chain is fully frozen.

---

## 3. Required Test Modes

Run the smoke test in both modes:

| Mode | Required | Purpose |
|---|---:|---|
| Incognito browser | Yes | Confirms clean new-user path |
| Normal browser | Yes | Confirms existing cache/localStorage does not break the path |

---

## 4. Pre-Test Conditions

Before testing, confirm:

- Frontend and backend are deployed.
- Local working tree is clean or only this checklist file is modified.
- No temporary debug UI is intentionally left visible.
- No fake/mock customer record is relied on for passing the flow.
- Existing route constants remain stable:
  - `/diagnostic`
  - `/cases`
  - `/pilot/setup`
  - `/pilot-result`
  - `/receipt`
  - `/verify`

---

## 5. Identity Contract Checks

| Check | Expected Result | Pass |
|---|---|---|
| New user enters email | Email is stored under the current identity key | [ ] |
| Legacy `savedEmail` is not required | Flow does not depend on `savedEmail` | [ ] |
| `nimclea_email` works as the primary email key | Case lookup can use the current email identity | [ ] |
| `nimclea_current_case_id` tracks the active case | Current case can be resumed correctly | [ ] |
| Returning user opens workspace | User can reach `/cases` without identity confusion | [ ] |

---

## 6. New Case Creation Flow

| Check | Expected Result | Pass |
|---|---|---|
| Start diagnostic as a new user | Diagnostic opens normally | [ ] |
| Complete diagnostic | Result page appears without blank screen | [ ] |
| Save case contact | Case is created or linked to the email identity | [ ] |
| Case name is entered once | Name is stored as the case-level display name | [ ] |
| User can continue to Case Plan | Route opens the correct case plan/setup screen | [ ] |

---

## 7. Case Name Single Source Check

| Check | Expected Result | Pass |
|---|---|---|
| Case name is already set from Cases page or save step | Pilot / Case Plan displays that name | [ ] |
| Pilot / Case Plan does not ask for a second conflicting name | No duplicate rename prompt appears | [ ] |
| Backend case name wins over stale local pilot name | Display name stays consistent after refresh | [ ] |
| Returning from normal browser keeps the same name | No old local value overrides backend value | [ ] |

---

## 8. Cases Page Routing Checks

| Case State | Expected Button / Route | Pass |
|---|---|---|
| Draft / no diagnostic | Drives user to Diagnostic | [ ] |
| Diagnostic completed, no case result | Continue Case opens Case Plan | [ ] |
| Pilot result exists, no event captured | Detail opens Receipt page | [ ] |
| Event captured | Detail opens Receipt page | [ ] |
| Receipt ready | Detail opens Receipt page | [ ] |
| Paid or checkout started | Detail still opens Receipt page | [ ] |

---

## 9. Active Case Limit / Trial Limit Checks

| Check | Expected Result | Pass |
|---|---|---|
| Active case count is shown correctly | Count matches active case state | [ ] |
| Trial limit modal appears only when appropriate | No premature blocking | [ ] |
| Existing valid case can still be opened | Limit does not trap the user | [ ] |
| Modal copy is clear and not overly noisy | User understands what happened | [ ] |

---

## 10. Case Plan / 7-Day Trial Flow Checks

| Check | Expected Result | Pass |
|---|---|---|
| Case Plan opens with correct caseId | No missing caseId or wrong case | [ ] |
| Case Plan shows the existing case name | No duplicate naming step | [ ] |
| Trial start path is available where intended | User can proceed into trial flow | [ ] |
| Returning to Case Plan does not reset identity | Same case remains active | [ ] |
| No diagnostic/access flash appears during normal continuation | No confusing temporary panel | [ ] |

---

## 11. Pilot Result to Receipt Checks

| Check | Expected Result | Pass |
|---|---|---|
| Pilot result is reachable | Page loads without blank screen | [ ] |
| Result carries caseId forward | Receipt receives the same caseId | [ ] |
| User can proceed to Receipt | CTA route is correct | [ ] |
| Receipt page hydrates backend case data | No stale local downgrade | [ ] |

---

## 12. Receipt / Event Capture Checks

| Check | Expected Result | Pass |
|---|---|---|
| Receipt page opens for the correct case | caseId matches the active case | [ ] |
| Quick Capture is available where required | User can capture an event | [ ] |
| Captured event updates receipt readiness | Receipt can turn eligible when scoring allows | [ ] |
| Event count persists after refresh | Backend-fed state remains stable | [ ] |
| Returning to Cases page preserves receipt state | No downgrade to old status | [ ] |

---

## 13. Verification Boundary Check

| Check | Expected Result | Pass |
|---|---|---|
| Verification page is not used as the main 7-day trial proof | Trial completion centers on Receipt / Summary | [ ] |
| Verification remains stricter than Receipt | No accidental free formal verification unlock | [ ] |
| Verification CTA is not required for 10-C pass | Real paid smoke test remains paused | [ ] |

---

## 14. Browser Consistency Checks

| Check | Expected Result | Pass |
|---|---|---|
| Incognito test passes | Clean user path works | [ ] |
| Normal browser test passes | Existing cache does not break flow | [ ] |
| Refresh on Cases page remains stable | No case status downgrade | [ ] |
| Refresh on Receipt page remains stable | No red/green flicker that misleads user | [ ] |
| Closing and reopening app preserves current case access | User can continue without losing the case | [ ] |

---

## 15. Final Pass Criteria

10-C can be marked PASS only if:

- New user can complete the 7-day trial path up to Receipt.
- Existing user can resume from Cases without route confusion.
- Case name has one source of truth.
- CaseId is preserved across Result, Case Plan, Pilot Result, Receipt, and Cases.
- Receipt state does not get downgraded by stale local data.
- Normal browser and incognito browser both pass.
- Real payment testing remains intentionally paused.

---

## 16. Current Status

| Area | Status |
|---|---|
| Identity foundation | Stable |
| Case routing | Stable |
| Case name source | Stable after 10-B |
| 7-day trial tail flow | Passed 10-B |
| Final smoke checklist | Created in 10-C |
| Real payment smoke test | Deferred |

---

## 17. Result

10-C is a documentation checkpoint.

If all boxes above pass in real browser testing, the 7-day trial chain can be considered frozen at:

**95%–97% complete**

Remaining work after this checkpoint should move to:

1. Final smoke evidence record
2. Optional UX polish
3. Payment smoke test preparation
4. Receipt / verification monetization boundary test

