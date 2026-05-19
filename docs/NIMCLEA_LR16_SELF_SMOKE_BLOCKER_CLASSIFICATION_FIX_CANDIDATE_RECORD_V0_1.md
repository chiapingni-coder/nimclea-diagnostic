# LR16 SELF SMOKE BLOCKER CLASSIFICATION FIX CANDIDATE RECORD

## Record ID

NIMCLEA_LR16_SELF_SMOKE_BLOCKER_CLASSIFICATION_FIX_CANDIDATE_RECORD_V0_1

## Date

2026-05-19

## Purpose

This record classifies the LR15 founder self-smoke observation evidence into launch blockers and selects the next implementation-candidate sequence.

LR16 is a documentation-only product mainline blocker classification. It does not change runtime behavior, frontend behavior, backend behavior, Supabase migrations, Supabase Storage, payment behavior, receipt behavior, verification behavior, or trial behavior.

## Scope

- Area: LR15 founder self-smoke blocker classification and fix-candidate sequencing.
- Files inspected: LR15 observation evidence and this LR16 target record.
- Files changed: `docs/NIMCLEA_LR16_SELF_SMOKE_BLOCKER_CLASSIFICATION_FIX_CANDIDATE_RECORD_V0_1.md` only.
- Runtime behavior affected: none.

## Decision / Change Summary

- This is a product mainline blocker classification, not an automation upgrade.
- External outreach remains blocked.
- Founder-only self-testing may continue.
- Supabase Storage is not included.
- No runtime fix is made or claimed in this record.
- LR15 remains the source evidence for this classification.
- The highest-priority blocker is receipt readiness incorrectly showing a green Receipt card for fragmentary or incomplete evidence.
- Established-case lifecycle is also a high-priority blocker: after a case is created, future user updates should be event capture or file upload against the existing case unless the user explicitly starts a new case.
- Result-page CTA visibility should be restored by folding or moving explanation content.
- Case page trial status display should be inspected and restored if the pilot is active.

## LR15 Source Evidence

Source: LR15 founder self-smoke observations.

Observed issues:

1. After completing the diagnostic, the transition into the result page had a pause and briefly flashed something resembling a table or raw structured content.
2. On the result page, the "Why this diagnostic result" section is too large and pushes the 7-day pilot CTA below the first visible area.
3. The Case page main console did not show the 7-day pilot green status bar.
4. The Pilot result page did not show the expected "Why this result" explanation block.
5. A fragmentary or incomplete text input still produced a green Receipt card, indicating a serious receipt-readiness judgment problem.
6. During review, navigating back from Pilot result should not return to the Pilot page. It should return to the diagnostic result page to close the review loop.
7. After a case is created, future user updates should be event capture or file upload against the existing case, not another diagnostic. The folded "redo diagnostic" affordance should be removed or hidden for established cases.

## Classification

### P0 External Outreach Blockers

- Receipt readiness must fail closed when evidence is incomplete, fragmentary, missing, or not authority-supported.
- Fragmentary or incomplete input producing a green Receipt card is a trust-impacting readiness error and blocks external outreach.
- Established-case lifecycle must not encourage a redo diagnostic after case creation. Future updates should be event capture or file upload against the existing case unless the user explicitly starts a new case.
- The folded "redo diagnostic" affordance should be removed or hidden for established cases before wider use.

### P1 Must-Fix-Before-Wider-Testing Issues

- Result-page CTA visibility should be restored by folding or moving the "Why this diagnostic result" explanation content so the 7-day pilot CTA is visible in the first result-page view.
- Case page trial status display should be inspected and restored if the pilot is active; the missing green 7-day pilot status bar creates case-state ambiguity.
- Pilot result review navigation should close the review loop by returning back to the diagnostic result page, not the Pilot page.
- Pilot result explanation parity should be restored so the expected "Why this result" explanation block appears.

### P2 Polish Or Parity Issues

- Diagnostic-to-result transition pause and raw structured-content flash should be investigated after the P0/P1 blockers are sequenced.
- Any residual visual polish from explanation folding, CTA placement, or review-loop navigation should be handled after the trust-impacting and lifecycle issues are fixed.

## Candidate Direction

- Treat LR16 as a classification gate, not a runtime implementation.
- Prioritize fail-closed receipt readiness before layout or navigation work because a green Receipt card for incomplete evidence can mislead a customer about readiness.
- Prioritize established-case lifecycle immediately after receipt readiness because post-case updates must reinforce case continuity, not push the user into a duplicate diagnostic path.
- Then restore result-page CTA visibility and case/pilot review parity in small, separately validated implementation candidates.

## Rejected Directions

- Rejected: classify this as an automation upgrade.
- Rejected: reopen external outreach before P0 blockers are fixed and smoke-tested.
- Rejected: make runtime, frontend, backend, migration, or Supabase Storage changes in LR16.
- Rejected: add Supabase Storage.
- Rejected: treat the LR15 founder self-smoke as external customer evidence.
- Rejected: fix visual polish before receipt-readiness fail-closed behavior and established-case lifecycle behavior are addressed.

## Selected Next Implementation Sequence

1. LR17 receipt readiness fail-closed blocker candidate.
2. LR18 established-case lifecycle / redo diagnostic removal candidate.
3. LR19 result-page CTA visibility / explanation folding candidate.
4. LR20 Case page pilot status bar inspection.
5. LR21 Pilot result explanation parity and review navigation closure.

## Acceptance Criteria

- LR15 observation evidence is carried forward.
- This record classifies the work as product mainline blocker classification, not automation.
- External outreach remains blocked.
- Founder-only self-testing remains allowed.
- Supabase Storage exclusion is stated.
- No runtime fix is claimed.
- P0 external outreach blockers are identified.
- P1 must-fix-before-wider-testing issues are identified.
- P2 polish or parity issues are identified.
- Receipt readiness fail-closed requirement is stated.
- Established-case lifecycle requirement is stated.
- Result-page CTA visibility requirement is stated.
- Case page trial status display inspection requirement is stated.
- LR17 through LR21 next implementation sequence is selected.

## Validation

Commands / checks run:

```powershell
Get-Content -LiteralPath 'docs/NIMCLEA_LR16_SELF_SMOKE_BLOCKER_CLASSIFICATION_FIX_CANDIDATE_RECORD_V0_1.md'
```

Result:

- Target record was read before documentation-only fill.
- LR16 was filled as a classification and fix-candidate sequencing record.
- No release-check was run for this documentation-only classification fill.
- No frontend, backend runtime, runtime, Supabase migration, or Supabase Storage files were modified.

## Risk / Stop Line

- Do not begin external outreach while the P0 blockers remain open.
- Do not claim launch readiness from LR16.
- Do not claim first-customer completion from LR16.
- Do not claim a runtime fix from LR16.
- Do not add Supabase Storage.
- Stop if receipt readiness can still show green for incomplete, fragmentary, missing, or non-authority-supported evidence.
- Stop if established cases still encourage redo diagnostic instead of event capture or file upload against the existing case.
- Stop if the next implementation sequence skips LR17 or LR18 in favor of lower-severity polish.

## Next Action

- Proceed to LR17 receipt readiness fail-closed blocker candidate.
- Keep external outreach blocked until the P0 blockers are implemented, smoke-tested, and closed by follow-up records.
- Continue founder-only self-testing within the controlled documentation boundary.
