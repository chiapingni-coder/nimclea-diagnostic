# Data Contract Lifecycle Smoke Test 5.5-C

## Purpose

This smoke test validates the shared lifecycle helper integration after 5.5-A and 5.5-B, before moving into 5.6 payment/subscription persistence. It focuses on lifecycle/no-downgrade behavior, route continuity, receipt readiness, payment/activation trust, and Verification unlock after introducing `frontend/utils/dataContractLifecycle.js`.

## Pre-test Requirements

- Latest `master` pulled.
- `npm --prefix frontend run build` passes.
- Browser cache/localStorage state noted before testing.
- Test with at least one real or seeded `caseId`.
- Use dev tools console only for observation, not mutation.

## Pages Covered

- CasesPage
- ReceiptPage
- VerificationPage

## Core Test Matrix

| ID | Test case | Expected |
| --- | --- | --- |
| A | Draft / no diagnostic case | CasesPage does not show receipt ready. Detail or primary action routes to Diagnostic. Receipt/Verification are not unlocked. |
| B | `diagnostic_completed` case without result | CasesPage shows diagnostic continuation behavior. Does not show receipt ready. Does not route directly to Verification. |
| C | `result_ready` case with no trusted event | CasesPage does not falsely mark Receipt ready. ReceiptPage shows not-ready or insufficient state. VerificationPage does not unlock formal verification. |
| D | Backend `receipt_ready` case with missing local events | CasesPage still shows Receipt ready. ReceiptPage must not downgrade to insufficient / locked. VerificationPage must not unlock unless backend payment/verification state supports it. |
| E | Backend `receipt_paid` / `receipt_activated` / `receipt_issued` case | CasesPage must not downgrade to `receipt_ready` / `result_ready` / `draft`. ReceiptPage must preserve stronger lifecycle. VerificationPage may allow formal verification only if backend-owned receipt/payment state supports it. |
| F | Backend `verification_ready` case | CasesPage does not downgrade it to receipt state. ReceiptPage preserves stronger verification lifecycle. VerificationPage shows backend-owned verification-ready state. |
| G | Backend `verification_issued` case | All pages preserve issued state. No page writes or displays weaker receipt-level lifecycle. VerificationPage does not require local events to keep issued state. |
| H | Local / preview / cache / snapshot source case | No backend-owned access created from local fallback. ReceiptPage does not create formal readiness from preview/cache. VerificationPage does not unlock formal verification from local state. |
| I | Compound fallback source strings: `verification_page_preview_cache`, `receipt_page_local_cache`, `local_receipt_snapshot`, `preview_cache`, `local_test_preview` | Treated as fallback. Cannot create backend-owned receipt access. Cannot create backend-owned verification access. |
| J | `caseId` propagation | CasesPage Detail carries `caseId`. ReceiptPage capture/payment/verification actions carry `caseId`. VerificationPage back-to-receipt carries `caseId`. No branch drops `caseId` during critical flows. |

## Manual Browser Flow

1. Open `/cases` with a known email.
2. Open a `result_ready` case.
3. Confirm Detail route behavior.
4. Open ReceiptPage with `caseId`.
5. Confirm receipt ready/not-ready label matches backend canonical state.
6. Use View all cases.
7. Open a `receipt_ready` or `receipt_paid` case.
8. Navigate to VerificationPage.
9. Confirm verification is locked/unlocked only by backend-owned state.
10. Confirm no page flashes downgraded state after hydration.

## Console / Network Checks

- Confirm `/cases?email=...` loads when applicable.
- Confirm `/case/:caseId` loads when applicable.
- Confirm receipt ledger and verification ledger reads include `caseId`.
- Confirm no receipt-status PATCH downgrades stronger lifecycle.
- Confirm no verification ledger POST occurs from fallback-only data.
- Confirm no `local_test` activation creates formal access.

## Pass / Fail Criteria

PASS when:

- No page downgrades backend-ready/paid/issued/verification states.
- No local/preview/cache/snapshot data creates formal access.
- All critical routes preserve `caseId`.
- No false verification-ready label appears.
- Build passes.

FAIL when:

- Any backend `receipt_ready` case displays as draft/result/not ready.
- Any backend `verification_ready`/`verification_issued` case is downgraded.
- Any local/preview/cache snapshot unlocks Receipt or Verification.
- Verification unlocks from `caseId`, hash existence alone, deterministic score alone, or local events alone.
- Any route loses `caseId` in critical flows.

## Known Non-blocking Warnings

- `html2pdf.js` mixed dynamic/static import warning.
- Chunk size warning.
- View all cases route context is still a documented warning.
- Some preview/cache clarity warnings remain.

## Final 5.5-C Status Template

Status:

Build:

Manual smoke test:

CasesPage:

ReceiptPage:

VerificationPage:

Remaining blockers:

Ready for 5.6:
