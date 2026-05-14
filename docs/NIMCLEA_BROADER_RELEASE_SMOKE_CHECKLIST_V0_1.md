# Nimclea Broader Release Smoke Checklist v0.1

## 1. Headline Conclusion

This checklist is for broader release readiness.

It verifies the main user and product paths before release.

The goal is to prove that the core paths work, case identity stays continuous, receipt and verification states remain correct, and production deployment is smoke-ready.

## 2. Smoke Execution Rules

- Run on a clean working tree.
- Record the test email used.
- Record every caseId created or reused.
- Prefer production smoke for the final pass.
- Do not modify code while executing smoke.
- Do not migrate or edit backend data files during smoke.
- Use clean test accounts or known test emails.
- Any failure must be classified as `blocker`, `non-blocker`, or `deferred polish`.
- Minor visual flicker is `deferred polish` unless the final route or final state is wrong.

## 3. Core Smoke Paths

### A. New User Path

Smoke ID: `BRSM-A`

Steps:

1. Open the production frontend or release candidate frontend.
2. Enter through the normal access or diagnostic entry path.
3. Complete Diagnostic.
4. Reach ResultPage.
5. Confirm the first-run CTA says `Start 7-day Pilot`.
6. Confirm ResultPage still behaves as a normal diagnostic result page:
   - diagnosis summary remains visible
   - weakest area remains visible
   - what to do next remains visible
   - signals remain visible
   - Save Case remains available where expected
   - Case Plan preview remains available where expected
7. Continue to Case Plan / Pilot Plan.
8. Confirm the same caseId is preserved.

Expected result:

- New user reaches ResultPage.
- First-run CTA is `Start 7-day Pilot`.
- First-run ResultPage does not show `Continue Case`.
- Result content is not replaced by a workspace/returning-user review surface.
- Case Plan / Pilot Plan receives the same caseId.

### A1. Access Zero-Case Route Check

Smoke ID: `BRSM-A1`

Steps:

1. Use a fresh incognito email.
2. Enter through `https://app.nimclea.com/`.
3. If the email has zero backend cases, confirm the user ends on `/diagnostic`.
4. Confirm the user does not remain on `/cases` with `Active Cases (0)`.
5. Record any minor visual flicker as polish if the final route is correct.

Expected result:

- Zero-case users reach `/diagnostic`.
- Zero-case users do not stay on `/cases` with `Active Cases (0)`.
- Minor visual flicker is not a blocker when the final route is correct.

### A2. First ResultPage 7-Day Pilot Entry Check

Smoke ID: `BRSM-A2`

Steps:

1. Complete a first diagnostic.
2. Save contact where required.
3. Confirm ResultPage shows `Start 7-day Pilot`.
4. Confirm the 7-day pilot entry explanation may appear.
5. Confirm ResultPage does not show `Continue Case` for the first-run diagnostic result.

Expected result:

- First-run ResultPage shows `Start 7-day Pilot`.
- First-run ResultPage may show the 7-day pilot entry explanation.
- First-run ResultPage does not show `Continue Case`.

### A3. Pilot Started ResultPage Review Check

Smoke ID: `BRSM-A3`

Steps:

1. From the first ResultPage, click `Start 7-day Pilot`.
2. Enter the Case Plan / Pilot flow.
3. Return to `/result?caseId=<id>&from=case`.
4. Confirm the page shows normal diagnostic result review content.
5. Confirm the page does not show:
   - `Start 7-day Pilot`
   - `Continue Case`
   - lower 7-day pilot trigger card

Expected result:

- ResultPage review mode shows normal diagnostic result content.
- ResultPage review mode has no green primary pilot CTA.
- ResultPage review mode has no green `Continue Case` CTA.
- ResultPage review mode has no lower 7-day pilot trigger card.

### B. Returning User Path

Smoke ID: `BRSM-B`

Steps:

1. Open the production frontend or release candidate frontend.
2. Enter an existing test email with at least one known case.
3. Confirm the user lands on `/cases`.
4. Confirm existing cases load.
5. Confirm no diagnostic reset occurs.
6. Confirm the page does not lose the email or current case context.

Expected result:

- Returning user reaches `/cases`.
- Existing cases appear.
- No diagnostic restart or unwanted first-run reset occurs.

### C. CasesPage Routing Path

Smoke ID: `BRSM-C`

Steps:

1. Open `/cases` with a known test email.
2. Confirm active cases render.
3. Confirm the Detail button exists where expected.
4. Click Detail for a case where ReceiptPage is the appropriate route.
5. Confirm the route reaches ReceiptPage.
6. Confirm broad case routing is not changed during this smoke.

Expected result:

- Active cases render.
- Detail routing works.
- ReceiptPage receives the expected caseId.

Important:

- CasesPage routing should not be changed by the 7-day trial status bar.
- The 7-day trial status bar must not appear inside individual case cards.

### C1. CasesPage 7-Day Trial Status Bar Check

Smoke ID: `BRSM-C1`

Steps:

1. Open CasesPage for an email with an active or safely inferred 7-day trial session.
2. Confirm the status bar appears below the top Cases header/action area and above the `Active Cases` / `Baseline Records` / `Historic Records` tabs.
3. Confirm the status text shows either:
   - `7-Day Pilot · Day X of 7 · Cases created: N`
   - `7-Day Pilot active · Cases created: N`
4. Confirm `Pilot guide` is available.
5. Open `Pilot guide`.
6. Confirm the guide does not contain:
   - payment button
   - summary CTA
   - `$9`
   - `$29`
   - `checkout`
   - `Stripe`

Expected result:

- CasesPage shows the 7-day trial status bar for active or safely inferred trial users.
- Cases created count is visible.
- Pilot guide is available.
- Pilot guide does not introduce payment, checkout, Stripe, or summary CTA behavior.

### D. Receipt Readiness Path

Smoke ID: `BRSM-D`

Steps:

1. Open ReceiptPage for a test case.
2. Confirm the event capture path is available.
3. Capture or verify at least one real event where the smoke plan permits it.
4. Confirm receipt eligibility / ready state behaves consistently with backend-owned readiness.
5. Confirm not-ready receipt remains not-ready and does not unlock verification prematurely.
6. Confirm ready receipt remains ready after hydration.
7. Watch for loading flicker.

Expected result:

- ReceiptPage remains consistent with backend readiness.
- Ready state does not downgrade after hydration.
- Not-ready state does not appear issued or unlock verification.

Note:

- A brief red-to-green or yellow-to-ready loading transition is not automatically a blocker unless the incorrect state persists after hydration.

### E. Verification Unlock Path

Smoke ID: `BRSM-E`

Steps:

1. Start from an eligible receipt.
2. Navigate to VerificationPage.
3. Confirm VerificationPage can be reached.
4. Confirm the same caseId is preserved.
5. Start from an ineligible receipt.
6. Confirm VerificationPage does not appear issued, passed, active, or verified.
7. Confirm verification is not unlocked from an ineligible receipt.

Expected result:

- Eligible receipt can reach the verification path.
- Ineligible receipt remains locked / not issuable.
- caseId remains continuous.

### F. Backend `/cases` Aggregation Path

Smoke ID: `BRSM-F`

Steps:

1. Call production `/cases?email=<test-email>`.
2. Confirm the expected case appears.
3. Confirm these fields are consistent enough for UI routing:
   - status
   - title / name
   - created time
   - updated time
   - event count
   - receipt readiness
   - payment-related fields
4. Compare with individual case read where needed.
5. Confirm duplicate or stale case records do not override the newest valid case.

Expected result:

- `/cases` returns the expected case.
- Aggregated fields are coherent enough for CasesPage routing.
- Stale or duplicate records do not hide or replace the newest valid case.

### G. Identity / Email / Case Binding Path

Smoke ID: `BRSM-G`

Steps:

1. Confirm the test email is associated with the created or reused caseId.
2. Return with the same email.
3. Confirm the same case appears.
4. Confirm caseId continuity across:
   - Result
   - Pilot Plan / Case Plan
   - Cases
   - Receipt
   - Verification
5. Confirm no customer/case confusion where one customer may have multiple cases.
6. If testing email switch, confirm switched email does not inherit another customer case by mistake.

Expected result:

- Email, customer, and caseId remain consistently bound.
- Multiple cases under one customer do not confuse routing.
- No case from another customer appears.

### H. Payment Boundary Smoke

Smoke ID: `BRSM-H`

Rules:

- Do not test live payment unless explicitly planned.
- Use Stripe test mode, dry-run, or controlled test path only when available.

Steps:

1. Review current UI paths that mention receipt activation, verification unlock, workspace renewal, or payment.
2. Confirm the UI does not create obvious contradictions between:
   - receipt activation
   - verification unlock
   - $9 workspace renewal
   - $29 receipt / payment scope
3. Confirm a receipt payment does not imply workspace renewal.
4. Confirm workspace renewal does not imply receipt issuance unless explicitly designed.
5. Confirm verification payment does not imply receipt readiness.

Expected result:

- Payment scopes remain visibly and behaviorally separate.
- No payment state contradiction blocks the main path.

Deferred:

- Payment redesign.
- Paid disappearance logic.
- Pilot summary paid state polish.

### I. Production Deployment Smoke

Smoke ID: `BRSM-I`

Steps:

1. Confirm Vercel frontend loads.
2. Confirm Render backend responds.
3. Confirm frontend uses the correct production API base.
4. Confirm `/cases?email=<test-email>` responds.
5. Confirm `/trial-status?email=<test-email>` responds with normalized data.
6. Confirm no white screen on core paths.
7. Confirm no obvious console error blocks core path completion.
8. Confirm receipt and verification pages load from production routes.

Expected result:

- Frontend loads.
- Backend responds.
- API base is production-correct.
- Core paths complete without blocking console/runtime errors.

### J. Main Path Continuity

Smoke ID: `BRSM-J`

The existing main path remains required:

1. Diagnostic
2. ResultPage
3. Start 7-day Pilot
4. Case Plan / Pilot
5. Pilot Result
6. Receipt
7. Verification eligibility boundary

Expected result:

- The full main path remains reachable.
- No 17-D or 17-E regression changes break receipt, verification, or pilot result continuity.

## 4. Pass / Fail Recording Table

| Smoke ID | Path | Environment | Test email | CaseId | Expected result | Actual result | Status: PASS / FAIL / DEFERRED | Blocker classification | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BRSM-A | New user diagnostic -> result -> case plan |  |  |  | First-run ResultPage and same caseId into Case Plan |  |  |  |  |
| BRSM-A1 | Access zero-case route |  |  |  | Zero-case users end on `/diagnostic`, not `/cases` with Active Cases (0) |  |  |  |  |
| BRSM-A2 | First ResultPage 7-day pilot entry |  |  |  | Shows Start 7-day Pilot and not Continue Case |  |  |  |  |
| BRSM-A3 | Pilot-started ResultPage review |  |  |  | Review shows no Start Pilot, Continue Case, or lower trigger card |  |  |  |  |
| BRSM-B | Returning user -> `/cases` |  |  |  | Existing cases load without diagnostic reset |  |  |  |  |
| BRSM-C | CasesPage routing -> ReceiptPage |  |  |  | Detail routes correctly and preserves caseId |  |  |  |  |
| BRSM-C1 | CasesPage 7-day trial status bar |  |  |  | Shows 7-Day Pilot status and Pilot guide without payment/summary CTA |  |  |  |  |
| BRSM-D | Receipt readiness |  |  |  | Ready/not-ready states match backend readiness |  |  |  |  |
| BRSM-E | Verification unlock |  |  |  | Eligible unlocks, ineligible remains locked, caseId preserved |  |  |  |  |
| BRSM-F | Backend `/cases` aggregation |  |  |  | Case appears with coherent aggregation fields |  |  |  |  |
| BRSM-G | Identity/email/case binding |  |  |  | Email and caseId remain consistently bound |  |  |  |  |
| BRSM-H | Payment boundary |  |  |  | No visible payment scope contradiction |  |  |  |  |
| BRSM-I | Production deployment |  |  |  | Frontend/backend load and core paths are usable |  |  |  |  |
| BRSM-J | Main path continuity |  |  |  | Diagnostic through verification eligibility boundary remains reachable |  |  |  |  |

## 5. Blocker Classification Rules

A failure is a true release blocker only if it:

- breaks the new-user path
- breaks returning-user `/cases` path
- breaks caseId continuity
- loses or corrupts email / customer / case binding
- gives incorrect receipt or verification eligibility
- creates a payment state contradiction that affects the main path
- prevents production smoke confidence

Everything else should be classified as:

- non-blocker
- guarded/deferred
- polish

Examples of non-blockers:

- copy polish that does not affect eligibility or routing
- minor visual spacing issue that does not block the core path
- minor visual flicker when final route and state are correct
- manual-only release-gate WARN with FAIL 0

## 6. Deferred / Do-Not-Touch Reminders

Do not reopen these during broader release smoke:

- trial-ended summary behavior
- payment prompt behavior
- Pilot summary paid disappearance logic
- $9 / $29 payment redesign
- $9 / $29 logic
- summary CTA
- visual flicker polish unless it causes the wrong final route
- non-essential UI polish
- broad case routing refactor
- receipt rewrite unless smoke proves a blocker
- verification rewrite unless smoke proves a blocker
- scoring changes
- backend data edits
- route constant changes

If a smoke failure touches one of these areas, classify it first. Only modify code if it meets the blocker rule.

## 7. Recommended Next Action

Run this checklist manually on production.

Only create a small smoke runner later if the manual checklist reveals a repeatable backend-only validation need.
