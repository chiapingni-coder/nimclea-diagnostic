# AUTO3A SELF HEAL CURRENT STATE JUDGMENT CANDIDATE RECORD

## Record ID

NIMCLEA_AUTO3A_SELF_HEAL_CURRENT_STATE_JUDGMENT_CANDIDATE_RECORD_V0_1

## Date

2026-05-19

## Purpose

Create the AUTO3A candidate scope for bounded self-healing after AUTO2-safe detects a low-risk deviation.

AUTO3A is a workflow-design candidate only. It does not implement self-healing automation in this record, does not change runtime behavior, and does not add automatic production push behavior.

The current conclusion is that Workflow 1.0 should center current-state judgment before any resume or push decision. AUTO3A should therefore add current-state judgment plus one bounded repair attempt before considering any future automatic doc-only push mode.

## Scope

- Area: Documentation and script-design candidate for AUTO3A self-heal current-state judgment.
- Files inspected: docs/NIMCLEA_AUTO3A_SELF_HEAL_CURRENT_STATE_JUDGMENT_CANDIDATE_RECORD_V0_1.md
- Files changed: docs/NIMCLEA_AUTO3A_SELF_HEAL_CURRENT_STATE_JUDGMENT_CANDIDATE_RECORD_V0_1.md
- Runtime behavior affected: None. Documentation-only candidate record; no frontend, backend, Supabase, payment, PDF, storage, or runtime change.

## Decision / Change Summary

- AUTO3A should not pursue automatic push first.
- AUTO3A should first add a bounded small repair loop after current-state judgment.
- AUTO3A should support three modes:
  - DiagnoseOnly: classify the current state and report the recommended stop or continue decision without modifying files.
  - SelfHealNoPush: default mode; classify the current state, perform at most one allowed low-risk repair, then stop before push.
  - SelfHealAndPushDocOnly: future mode only; may be considered after DiagnoseOnly and SelfHealNoPush have proven reliable.
- Runtime changes remain STOP before push.
- AUTO3A must preserve release-check and release-push discipline. It must not bypass gate-doc, release-check, release-push, changed-file guards, or human review for runtime diffs.
- AUTO3A is a candidate for bounded workflow repair, not broad launch readiness and not production self-mutation.

Allowed AUTO3A candidate self-heal cases:

- Blank-template marker small repair.
  - Example: LR7 left `Files inspected` and `Files changed` blank.
  - Allowed repair: fill missing low-risk scope fields from prompt context and existing record content.
  - Required recheck: blank-template marker check must pass after repair.
- Premature gate edit classification.
  - Example: LR5A edited `scripts/check-release-gate.mjs` before AUTO2 gate-doc stage.
  - Allowed behavior: classify the deviation as a premature gate edit instead of a runtime failure.
  - Continue condition: continue only if the gate entry is exactly the expected documentation entry and no other files changed.
  - Required recheck: changed-file guard and release-check must still pass.

Forbidden repair classes:

- Automatic runtime patch.
- Automatic production push.
- Automatic Supabase migration.
- Payment or provider behavior change.
- PDF, storage, frontend, backend, or runtime behavior change.
- Any bypass of release-check, release-push, or human review for runtime diffs.
- Broad launch readiness claim.
- Repeated repair loops or open-ended mutation.

## Acceptance Criteria

- Defines AUTO3A as current-state judgment plus one bounded repair attempt.
- Separates DiagnoseOnly, SelfHealNoPush, and future SelfHealAndPushDocOnly.
- Keeps SelfHealNoPush as the default candidate mode.
- Defines allowed repair classes for blank-template marker repair and premature gate edit classification.
- Defines forbidden repair classes for runtime, production, Supabase, payment, provider, PDF, storage, frontend, backend, and broad launch-readiness changes.
- Defines stop lines for runtime files, unexpected files, repeated failure, ambiguous failure, and release-check FAIL.
- Points next action to AUTO3B implementation candidate or LR8 depending on whether automation upgrade or verification runtime is chosen next.

## Validation

Commands / checks run:

```powershell
Get-Content -LiteralPath 'docs/NIMCLEA_AUTO3A_SELF_HEAL_CURRENT_STATE_JUDGMENT_CANDIDATE_RECORD_V0_1.md'
```

Result:

- Record filled.
- Documentation-only scope preserved.
- AUTO2 remains responsible for adding this record to the release gate and running release-check.
- No gate-doc manual run performed.
- No release-check manual run performed.

## Risk / Stop Line

- STOP if any frontend, backend, Supabase, payment, PDF, storage, runtime, or migration file is changed.
- STOP if any unexpected file appears in the changed-file set.
- STOP if a low-risk repair fails its required recheck.
- STOP if a second repair attempt would be needed.
- STOP if the failure is ambiguous or cannot be classified as one of the allowed repair classes.
- STOP if release-check reports FAIL.
- STOP before push when runtime files are present.
- STOP before production push unless a later approved mode explicitly authorizes doc-only push and release-push discipline still passes.

## Next Action

- If the user chooses automation upgrade first: create AUTO3B implementation candidate for current-state judgment plus one bounded SelfHealNoPush repair attempt.
- If the user chooses verification runtime next: proceed to LR8.
