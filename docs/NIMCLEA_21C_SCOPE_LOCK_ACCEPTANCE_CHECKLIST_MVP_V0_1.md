# Nimclea 21-C Scope Lock + Trust Acceptance Checklist MVP v0.1

## 1. Purpose

This file determines whether Nimclea is ready to send real outreach emails in a trust-building MVP context.

The goal is not to ask real customers to casually try the product.

The goal is to make sure the first customer experience is credible, bounded, understandable, and does not create false confidence.

## 2. MVP Scope Lock

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

## 3. Trust Standard

The acceptance question is not "can a user test it?"

The acceptance question is "can a user trust what they see?"

Nimclea may be incomplete, but it must not be misleading.

Any state that appears authoritative must be backed by real routing, real evidence, real case context, or clearly documented limitation.

## 4. Explicit Out of Scope

The following items are deferred only because they are not required for first-contact trust:

- Full 7-day trial status bar implementation.
- Pilot-level paid summary disappearance logic.
- Large pricing redesign.
- AI scanning layer.
- Multi-user/team workspace.
- Advanced verification certificate polish.
- Full automation dashboard.
- Non-critical visual refinements.

## 5. Acceptance Checklist Before Sending Emails

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

## 6. Stop Line

Outreach must be blocked if any of the following are active:

- Wrong routing.
- Misleading receipt readiness.
- Fake/mock/customer-leaking data visible.
- Verification unlocked improperly.
- Payment claims exceed tested reality.
- Customer cannot understand what to do next.
- Any screen creates false confidence about evidence, receipt, verification, or payment.

## 7. Outreach Permission Rule

If all MUST items pass and no Stop Line item is active, Nimclea may begin limited real outreach.

This does not mean the product is complete.

It means the first customer experience is credible enough to build trust.

If any MUST item fails, do not send real customer emails yet.

SHOULD items may be deferred only if they do not affect trust, routing, evidence, payment truth, verification boundaries, or comprehension.

## 8. Recommended Next Action

After this document is created:

- Run a manual production acceptance check against this checklist.
- Record the result in a separate 21-D manual acceptance smoke record.
