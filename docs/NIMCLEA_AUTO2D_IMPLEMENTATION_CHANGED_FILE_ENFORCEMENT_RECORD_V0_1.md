# AUTO2D IMPLEMENTATION CHANGED FILE ENFORCEMENT RECORD

## Record ID

NIMCLEA_AUTO2D_IMPLEMENTATION_CHANGED_FILE_ENFORCEMENT_RECORD_V0_1

## Date

2026-05-19

## Purpose

This record documents AUTO2D: implementation changed-file enforcement.

The purpose is to close an AUTO node integrity gap where implementation-like work items could pass as paper-only changes.

## Scope

- Area: AUTO release/work-item enforcement
- Classification: AUTO node integrity gap
- Receipt runtime/product fix: no
- LR19: no
- Files inspected: this record only
- Files changed: docs/NIMCLEA_AUTO2D_IMPLEMENTATION_CHANGED_FILE_ENFORCEMENT_RECORD_V0_1.md
- Runtime behavior affected: none for Nimclea product runtime
- AUTO behavior affected: yes, implementation-like work items now enforce real changed files
- Supabase schema affected: no
- Supabase Storage added: no

## Decision / Change Summary

- Implementation-like work items must not pass as paper-only changes.
- Implementation-like kinds include:
  - implementation
  - implementation_smoke
  - runtime
  - fix
- Required AUTO2D behavior: after release-check succeeds and before push, scripts/v09-work-item-auto2.ps1 must require at least one real implementation file change for implementation-like kinds.
- Paper-only files that must not count as real implementation:
  - docs/*.md
  - scripts/check-release-gate.mjs
- Example real implementation files that may count:
  - backend/**/*.js
  - frontend/**/*.js
  - frontend/**/*.jsx
  - scripts/*.ps1
  - scripts/*.mjs except scripts/check-release-gate.mjs
  - supabase/migrations/*.sql
- Expected changed files for the full AUTO2D implementation include:
  - scripts/v09-work-item-auto2.ps1
  - scripts/check-release-gate.mjs
  - docs/NIMCLEA_AUTO2D_IMPLEMENTATION_CHANGED_FILE_ENFORCEMENT_RECORD_V0_1.md
- This documentation-only fill did not modify scripts/v09-work-item-auto2.ps1 or scripts/check-release-gate.mjs because this task's hard rules allowed editing only this target docs record.

## Acceptance Criteria

- The record states Classification: AUTO node integrity gap.
- The record states this is not a Receipt runtime/product fix.
- The record states this is not LR19.
- The record states Runtime behavior affected: none for Nimclea product runtime.
- The record states AUTO behavior affected: yes, implementation-like work items now enforce real changed files.
- The record states expected changed files include scripts/v09-work-item-auto2.ps1, scripts/check-release-gate.mjs, and this doc.
- The required stop condition is documented: if an implementation-like kind has changed files containing only docs plus scripts/check-release-gate.mjs, AUTO2D must stop before push with a clear error explaining:
  - implementation changed-file enforcement failed
  - implementation-like work items require at least one non-doc, non-gate changed file
  - this prevents paper implementation passes

## Validation

Commands / checks run:

```powershell
npm run release-check
.\scripts\release-check.ps1
```

Result:

- `npm run release-check` did not run because package.json has no `release-check` script.
- `.\scripts\release-check.ps1` started, safe-to-commit passed, then stopped during frontend build with Vite `spawn EPERM` before the Golden Case release gate step.
- Release-check final status: failed before gate execution due local frontend build process permission error.

## Risk / Stop Line

- Stop before push when implementation-like work items have only paper changes.
- The stop line exists to prevent false implementation passes.
- This record does not authorize Receipt runtime behavior changes, frontend product behavior changes, Supabase schema changes, or Supabase Storage additions.

## Next Action

- Implement the changed-file enforcement in scripts/v09-work-item-auto2.ps1 after release-check succeeds and before push.
- Protect this record in scripts/check-release-gate.mjs.
- Run release-check after the script and gate updates are made.
