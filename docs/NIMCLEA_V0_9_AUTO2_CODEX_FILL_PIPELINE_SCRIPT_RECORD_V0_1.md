# V0 9 AUTO2 CODEX FILL PIPELINE SCRIPT RECORD

## Record ID

NIMCLEA_V0_9_AUTO2_CODEX_FILL_PIPELINE_SCRIPT_RECORD_V0_1

## Date

2026-05-19

## Purpose

This record documents the first safe AUTO2 Codex-fill pipeline script for Nimclea v0.9 work items.

AUTO2-safe means AUTO1 plus a Codex fill station: PowerShell owns record creation, flow control, changed-file guards, gate-doc, release-check, and optional push; Codex owns semantic filling only.

## Scope

- Area: AUTO2 Codex-fill pipeline script.
- Files inspected: existing v09-work-item, new-record, gate-doc, release-check, release-push flow, and LR3 Codex stdin fill requirement.
- Files changed: this AUTO2 script record and scripts/v09-work-item-auto2.ps1.
- Runtime behavior affected: none.
- Frontend code affected: none.
- Backend runtime code affected: none.
- Supabase migrations affected: none.
- Supabase Storage included: no.

## Decision / Change Summary

Implemented scripts/v09-work-item-auto2.ps1 as the first safe AUTO2 Codex-fill pipeline script.

The script requires -Id, -Kind, and -PromptFile, with optional -Commit and -Push.

The script resolves the repo path as E:\Nimclea_Products\diagnostic, computes docs\<Id>.md, and runs scripts/new-record.ps1 when the target record is missing.

The formal script creates or confirms the record before Codex runs. Codex must not be relied on to create missing records during normal AUTO2 operation.

After the target record exists and the prompt file is confirmed, the script builds a guarded prompt that names the target doc path, requires editing only that target docs record, forbids record creation by Codex, and forbids frontend, backend runtime, runtime, Supabase migration, and Supabase Storage changes.

The guarded prompt is piped into:

```powershell
codex exec --sandbox workspace-write -
```

After Codex returns, the script runs the blank-template marker check against the target record and fails if any marker remains.

Before gate-doc, the script checks changed files and allows only the target record, plus the AUTO2 script and AUTO2 implementation record when the AUTO2 script itself is being implemented.

The script then runs gate-doc and release-check.

After release-check, the script checks changed files again and allows only the target record, scripts/check-release-gate.mjs, and scripts/v09-work-item-auto2.ps1 when the AUTO2 script itself is being implemented.

The default behavior is STOP before push and print the release-push command.

If -Push is passed, the script requires a non-empty -Commit value and runs scripts/release-push.ps1.

## Acceptance Criteria

- AUTO2-safe is defined as AUTO1 plus a Codex fill station.
- PowerShell owns record creation, flow control, changed-file guard, gate-doc, release-check, and optional push.
- Codex owns semantic filling only.
- The formal script creates or confirms the target record before Codex runs.
- Codex is not responsible for creating missing record files during normal AUTO2 operation.
- The script pipes a guarded prompt into codex exec --sandbox workspace-write -.
- The guarded prompt requires editing only the target docs record.
- The guarded prompt forbids frontend, backend runtime, runtime, Supabase migration, and Supabase Storage changes.
- The blank-template marker check fails the run if template markers remain.
- Changed-file guards run before gate-doc and after release-check.
- Default behavior stops before push and prints the release-push command.
- -Push requires a non-empty -Commit value.
- Runtime code is unchanged.
- Frontend code is unchanged.
- Backend runtime code is unchanged.
- Supabase migrations are unchanged.
- Supabase Storage is not included.

## Validation

Commands / checks run:

```powershell
Get-Content scripts\v09-work-item.ps1

Get-Content scripts\new-record.ps1

Get-Content scripts\gate-doc.ps1

Get-Content scripts\release-check.ps1

Get-Content scripts\release-push.ps1

Select-String -Path docs\NIMCLEA_V0_9_AUTO2_CODEX_FILL_PIPELINE_SCRIPT_RECORD_V0_1.md -Pattern "This record documents the decision, implementation, rehearsal, or validation result for this Nimclea work item\.|^- Area:\s*$|^- Files inspected:\s*$|^- Files changed:\s*$|^- Runtime behavior affected:\s*$|^-\s*$|Result:\s*$"
```

Result: AUTO2 script and implementation record completed as documentation/tooling-only changes; no runtime, frontend, backend runtime, Supabase migration, or Supabase Storage change was made.

## Risk / Stop Line

- Do not modify runtime code for AUTO2.
- Do not modify frontend code for AUTO2.
- Do not modify backend runtime code for AUTO2.
- Do not modify Supabase migrations for AUTO2.
- Do not add Supabase Storage.
- Do not let Codex create missing record files during normal AUTO2 operation.
- Do not let Codex edit outside the target docs record during AUTO2 fill.
- Do not bypass the blank-template marker check.
- Do not bypass changed-file guards.
- Do not push by default.
- Do not use -Push unless checks are clean and -Commit is non-empty.
- Do not claim full launch readiness from this script record.

## Next Action

First production use after this script should be LR4: PDF export paid gate.
