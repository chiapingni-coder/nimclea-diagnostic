# Nimclea Broader Release Readiness Map v0.1

## 1. Headline Conclusion

Nimclea is in a guarded pre-release state.

The strongest readiness areas are the 7-day trial lifecycle contracts, backend trial status helper/endpoint, frontend trial status adapter, golden release gate coverage, and receipt/verification contract guards.

The CasesPage trial status bar / green trial bar is:

- contract defined
- smoke guard present
- UI implementation deferred
- not a current broader release blocker

The main remaining release risk is not the missing green trial bar. The main risk is validating live user paths end to end: case routing, receipt readiness, verification unlock, identity/email binding, payment boundaries, and deployment smoke checks against production-like data.

## 2. Readiness Table

| Area | Current readiness | Guarded? | Release posture | Notes |
| --- | --- | --- | --- | --- |
| 7-day trial lifecycle | Mostly ready | Yes | Not blocking | Lifecycle contract, helper, endpoint, adapter, and runtime guards exist. CasesPage visual bar is deferred. |
| CasesPage and case routing | Partially ready | Partly | Needs smoke | Current CasesPage remains untouched by trial-status work. Detail/Continue routing should be manually smoke-tested before release. |
| Golden case release gate | Ready as regression gate | Yes | Required before release | Release gate has FAIL 0 when run with approved child process execution; WARN remains for manual-only areas. |
| Backend `/cases` aggregation | Guarded | Yes | Needs production smoke | Aggregation smoke exists. Still verify against representative real records. |
| Receipt readiness and receipt gating | Contracted and guarded | Yes | Needs UI smoke | Receipt readiness downgrade and save eligibility boundaries are guarded. Paid/readiness flows still need end-to-end validation. |
| Verification unlock path | Contracted and guarded | Yes | Needs UI smoke | Locked VerificationPage and receipt-to-verification access contracts are guarded. Real unlock path still needs manual/paid-flow validation. |
| Identity/email/case binding | Medium readiness | Partly | Needs focused smoke | Email/case binding appears across localStorage, route state, backend records, and email logs. Needs clean first-run and returning-user smoke. |
| Payment boundaries | Contracted in parts | Partly | Needs caution | $9 workspace renewal, $29 receipt activation, and verification payment scopes must remain separate. Stripe production behavior remains outside current guards. |
| Deployment and production smoke checks | Pending | No | Required before release | Need production URL, backend health, `/cases`, `/trial-status`, receipt, verification, and payment dry-run smoke. |
| Documentation and regression guard coverage | Strong | Yes | Release-supporting | Extensive docs and text/runtime guards exist across trial, receipt, verification, save eligibility, endpoint, and adapter work. |

## 3. Release Blockers

Current likely blockers before broader release:

- Production deployment smoke has not been recorded in this map.
- End-to-end first-run diagnostic to ResultPage to Case Plan to CasesPage needs a clean smoke.
- Returning-user CasesPage Detail / Continue routing needs a clean smoke.
- Receipt readiness must be validated with a clean ready case and a clean not-ready case.
- Verification unlock must be validated against backend-owned eligibility and payment/activation requirements.
- Payment scope boundaries need confirmation so $9 workspace renewal, $29 receipt activation, and formal verification payment cannot cross-unlock each other.
- Identity/email/case binding needs smoke coverage for first-run, returning user, and switched-email paths.

Not a blocker:

- CasesPage trial status bar / green trial bar UI implementation.

## 4. Guarded-But-Deferred Items

Deferred items that are guarded or contract-defined:

- CasesPage trial status bar / green trial bar UI.
- Pilot-level summary entry UI.
- Pilot summary modal.
- Payment prompt disappearance behavior after renewal / continuation.
- Deeper paid / dismissed / converted lifecycle handling.
- Merging trial status into `/cases`, if ever needed.
- Broader paid-flow runtime smoke using realistic payment fixtures or Stripe dry-run paths.

These should remain deferred unless a release requirement explicitly needs them.

## 5. High / Medium / Low Risks

### High Risk

- Accidentally altering CasesPage case cards, Detail routing, Continue Case behavior, or foldouts while adding release polish.
- Mixing payment scopes: $9 workspace renewal, $29 receipt activation, and formal verification payment.
- Treating receipt access, verification page access, or payment start as successful issuance/unlock.
- Releasing without production smoke for identity/email/case binding.

### Medium Risk

- `/cases` and individual `/case/:caseId` readiness interpretations drifting on legacy records.
- Trial status source quality depending on historical `trials.json` and email/userId consistency.
- LocalStorage stale case or email state conflicting with backend-owned case state.
- UI loading states briefly showing incorrect receipt, verification, or trial status.
- Stripe / payment provider behavior not covered by local guards.

### Low Risk

- Backend trial status helper, endpoint, and frontend adapter are isolated and runtime-guarded.
- CasesPage trial status UI is not connected and cannot currently affect routing.
- Release gate has broad regression coverage and FAIL 0 when child-process execution is allowed.
- Documentation coverage is strong enough to guide the next release phase.

## 6. Recommended Next 3 Actions

1. Run broader release smoke on core user paths:
   - first-run Diagnostic -> ResultPage -> Case Plan
   - returning CasesPage -> Detail / Continue Case
   - email switch / restored case access

2. Run receipt and verification readiness smoke:
   - clean not-ready receipt case remains yellow/locked
   - clean ready receipt case stays ready through checkout/payment states
   - VerificationPage remains locked until backend-owned eligibility allows unlock

3. Run deployment/payment boundary smoke:
   - production frontend/backend health
   - `/cases` and `/trial-status` responses
   - Stripe/payment dry-run or controlled test path
   - confirm $9, $29, and verification payment scopes remain separate

Recommended sequencing: do not start the green trial bar UI until the broader release smoke above is clean.

## 7. Do-Not-Touch List For The Next Phase

Avoid changing these while preparing broader release readiness unless a specific blocker requires it:

- CasesPage case card JSX
- Detail button routing
- Continue Case behavior
- foldout behavior
- `/cases` aggregation behavior
- receipt eligibility rules
- verification eligibility rules
- scoring thresholds
- payment/Stripe scope logic
- backend data files
- route constants
- trial status helper / endpoint / adapter unless a guard exposes a defect
- green trial bar UI, unless explicitly starting 16-A22 later

The next phase should prioritize smoke validation over new UI or eligibility behavior.
