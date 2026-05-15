# Nimclea 19B Post-RC Live Payment Smoke Plan v0.1

## Purpose

This document defines the controlled live payment smoke test plan after `rc-0.1.0` and after 19A post-RC system progress/risk mapping.

## 1. Current State

- `rc-0.1.0` exists.
- 18D8 payment pre-live confirmation record exists.
- 19A post-RC system progress and risk map exists.
- Payment has not yet been fully live-smoke-tested.
- System core routing and RC readiness are already locked.
- The next risk is payment execution, not core product flow.

## 2. Smoke Objective

- Confirm that the live payment path can be entered from the intended product surface.
- Confirm that checkout or payment handoff opens correctly.
- Confirm that payment success returns the user to a stable product state.
- Confirm that payment cancellation/failure does not corrupt case state.
- Confirm that no unrelated case, receipt, verification, or trial logic is changed during testing.

## 3. In Scope

- Live payment entry visibility.
- Checkout/session creation behavior.
- Success return behavior.
- Cancel/failure return behavior.
- Post-payment product state.
- Basic Stripe dashboard confirmation.
- Basic backend/local state confirmation if available.

## 4. Out of Scope

- Pricing redesign.
- Subscription redesign.
- Receipt/verification logic rewrite.
- Trial lifecycle changes.
- CasesPage card/routing changes.
- Email auth changes.
- Visual redesign.
- New analytics.
- New payment products.
- Refund workflow automation.

## 5. Pre-Test Requirements

- Production frontend deployed.
- Production backend deployed.
- Stripe live mode keys confirmed.
- Correct live product/price IDs confirmed.
- Test buyer/payment method prepared.
- A disposable or controlled test case prepared.
- Baseline git state clean.
- Latest commit confirmed on origin/master.
- No uncommitted local changes.

## 6. Live Smoke Test Matrix

| Test ID | Path | Action | Expected Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| PAY-SMOKE-01 | Production app entry | Open app production entry. | App loads without blocking error. | TBD |  |
| PAY-SMOKE-02 | Intended payment surface | Reach intended payment CTA. | Payment CTA appears only where expected. | TBD |  |
| PAY-SMOKE-03 | Payment CTA | Click payment CTA. | Payment request starts without console-breaking error. | TBD |  |
| PAY-SMOKE-04 | Checkout/payment handoff | Checkout/payment page opens. | Correct live checkout or payment page opens. | TBD |  |
| PAY-SMOKE-05 | Cancel path | Cancel payment and return. | User returns to Nimclea without paid state. | TBD |  |
| PAY-SMOKE-06 | Product state after cancellation | Confirm case/product state after cancellation. | Case state remains stable and unpaid. | TBD |  |
| PAY-SMOKE-07 | Payment retry | Start payment again. | New payment attempt starts without conflicting state. | TBD |  |
| PAY-SMOKE-08 | Live payment | Complete live payment. | Payment completes in live mode. | TBD |  |
| PAY-SMOKE-09 | Success return | Return to Nimclea success state. | User lands on stable success/product state. | TBD |  |
| PAY-SMOKE-10 | Paid/unlocked state | Confirm paid/unlocked state. | Paid or unlocked state appears only for the intended case/product. | TBD |  |
| PAY-SMOKE-11 | Refresh after success | Refresh page after success. | Paid state persists after refresh. | TBD |  |
| PAY-SMOKE-12 | CasesPage after success | Reopen CasesPage after success. | CasesPage remains stable and correctly scoped. | TBD |  |
| PAY-SMOKE-13 | Stripe dashboard | Confirm Stripe dashboard payment record. | Stripe live dashboard shows the transaction. | TBD |  |
| PAY-SMOKE-14 | Case isolation | Confirm no unrelated case state changed. | No unrelated case, receipt, verification, or trial state changed. | TBD |  |

## 7. Pass Criteria

Payment smoke passes only if:

- Payment entry appears only where expected.
- Checkout opens without console-breaking error.
- Cancel path is safe.
- Success path is stable.
- Refresh does not lose paid state.
- CasesPage remains stable.
- No unrelated routing regression appears.
- Stripe live dashboard confirms the transaction.
- No new code changes are required during the smoke.

## 8. Fail Criteria

Payment smoke fails if:

- Payment CTA opens the wrong product/price.
- Checkout cannot open.
- Cancel corrupts case state.
- Success does not persist.
- Paid state disappears after refresh.
- User lands on an unrelated page.
- CasesPage routing changes unexpectedly.
- Receipt/verification/trial state is corrupted.
- A new code patch is required to complete the payment path.

## 9. Stop Line

If any fail criteria is hit:

- Stop live payment testing.
- Do not patch immediately inside the smoke run.
- Record the failure.
- Classify whether it is payment-only, routing-related, state-persistence-related, or Stripe-configuration-related.
- Create a separate 19C fix plan only if needed.

## 10. Execution Record

| Date | Tester | Environment | Commit Hash | Payment Product Tested | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## 11. Recommendation

The safest next action after this plan is created is to run one controlled live payment smoke on production without changing code during the test.
