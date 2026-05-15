# Nimclea 21-C Scope Lock + Trust Acceptance Checklist MVP v0.1

## 1. Purpose

This file determines whether Nimclea is ready to send real outreach emails in a trust-building MVP context.

The goal is not to ask real customers to casually try the product.

The goal is to make sure the first customer experience is credible, bounded, understandable, and does not create false confidence.

## 2. Current Launch Scope Lock after 21-E

### What the Trial MVP Includes

- Diagnostic / result.
- Case plan / pilot flow.
- Case dashboard.
- Receipt readiness.
- Event capture.
- Receipt PDF deliverable.
- Hash / ledger display if available.
- Verification path only where already unlocked by current rules.

### What the Trial MVP Does Not Include Yet

- Full audit opinion.
- Legal/regulatory certification.
- Fully automated customer onboarding.
- Fully polished marketing site.
- Full AI interpretation layer.
- Full payment live-card smoke if not yet completed.
- Custom customer-specific report design.

### Customer-Facing Deliverables

- Diagnostic result.
- Case / pilot plan.
- Receipt page.
- Receipt PDF with Nimclea wordmark, formal title, case fields, evidence status, ledger/hash area, and disclaimer.

### Launch Acceptance Checklist

Required PASS:

- [ ] New user can start diagnostic.
- [ ] Returning user can reach CasesPage.
- [ ] Result can lead to case/pilot plan.
- [ ] Case can reach ReceiptPage.
- [ ] Event capture can support receipt readiness.
- [ ] Receipt ready state does not show wrong blocking state.
- [ ] Receipt PDF exports with core fields.
- [ ] Verification is not reachable unless current unlock rules allow it.
- [ ] Release gate has FAIL 0.

Acceptable WARN:

- Manual-only release areas.
- Existing html2pdf mixed import warning.
- Existing Vite chunk-size warning.
- Live payment final card test if explicitly marked deferred.

Blocking FAIL:

- White screen.
- Broken diagnostic entry.
- Broken CasesPage.
- Receipt PDF missing core fields.
- Receipt readiness wrong state.
- Verification unlock bypass.
- Payment route causing unintended access.
- Release gate FAIL > 0.

### Final Launch Interpretation

The MVP is acceptable for controlled trial outreach when all required PASS items are confirmed and no blocking FAIL remains. The product should be presented as a decision receipt and evidence-backed workflow MVP, not as a legal, audit, or regulatory certification product.

## 3. MVP Scope Lock

For this MVP outreach decision, scope is locked to the following:

- New user can enter diagnostic.
- Returning user can access CasesPage.
- Diagnostic result can start the first 7-day pilot.
- Case Plan / Pilot Plan can be reached from the intended CTA.
- Pilot Result can lead toward Receipt.
- Receipt page can show the correct readiness state without misleading flash.
- Receipt eligibility depends on real captured event / evidence, not fake confidence.
- Verification can only be reached from proper receipt context.
- Payment live smoke remains partially deferred if real card payment cannot yet be completed.
- UI polish is allowed only if it directly affects trust or comprehension before outreach.

## 4. Trust Standard

The acceptance question is not "can a user test it?"

The acceptance question is "can a user trust what they see?"

Nimclea may be incomplete, but it must not be misleading.

Any state that appears authoritative must be backed by real routing, real evidence, real case context, or clearly documented limitation.

## 5. Explicit Out of Scope

The following items are deferred only because they are not required for first-contact trust:

- Full 7-day trial status bar implementation.
- Pilot-level paid summary disappearance logic.
- Large pricing redesign.
- AI scanning layer.
- Multi-user/team workspace.
- Advanced verification certificate polish.
- Full automation dashboard.
- Non-critical visual refinements.

## 6. Acceptance Checklist Before Sending Emails

### MUST

- [ ] Production app opens cleanly.
- [ ] New visitor path does not show confusing access flash.
- [ ] Returning user path lands on CasesPage correctly.
- [ ] First diagnostic result shows the intended primary CTA.
- [ ] Case continuation does not route to the wrong page.
- [ ] Receipt does not show misleading yellow/red/green transient state as final truth.
- [ ] Receipt requires real event/evidence for readiness.
- [ ] Verification cannot be reached without proper receipt context.
- [ ] Payment limitation is documented if real live card payment is not fully smoke-tested.
- [ ] No fake/mock/customer-leaking data appears.
- [ ] Case name/status does not confuse the user.
- [ ] Main CTAs make the next step understandable.
- [ ] One complete manual production smoke path is recorded before outreach.

### SHOULD

- [ ] Basic mobile/desktop visual sanity.
- [ ] Main CTAs are understandable within 15 seconds.
- [ ] Error/fallback language is not alarming.
- [ ] User can recover by going back to CasesPage.

## 7. Stop Line

Outreach must be blocked if any of the following are active:

- Wrong routing.
- Misleading receipt readiness.
- Fake/mock/customer-leaking data visible.
- Verification unlocked improperly.
- Payment claims exceed tested reality.
- Customer cannot understand what to do next.
- Any screen creates false confidence about evidence, receipt, verification, or payment.

## 8. Outreach Permission Rule

If all MUST items pass and no Stop Line item is active, Nimclea may begin limited real outreach.

This does not mean the product is complete.

It means the first customer experience is credible enough to build trust.

If any MUST item fails, do not send real customer emails yet.

SHOULD items may be deferred only if they do not affect trust, routing, evidence, payment truth, verification boundaries, or comprehension.

## 9. Recommended Next Action

After this document is created:

- Run a manual production acceptance check against this checklist.
- Record the result in a separate 21-D manual acceptance smoke record.
