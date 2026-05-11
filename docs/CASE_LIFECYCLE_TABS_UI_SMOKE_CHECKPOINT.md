# Case Lifecycle Tabs UI Smoke Checkpoint

## Purpose

This checkpoint verifies the Cases page lifecycle tabs:

- Active Cases
- Baseline Records
- Historic Records

It confirms that the UI no longer depends on the old Active / Archived tab model for primary case navigation.

## Scope

In scope:

- Lifecycle tab labels
- Lifecycle tab counts
- Rendering source for each lifecycle tab
- Protected delete behavior for baseline / historic records
- Empty-state behavior per lifecycle tab

Out of scope:

- Removing legacy `archivedCases` state
- Removing `handleArchiveCase` / `handleRestoreCase`
- Support restore workflows
- Purge worker
- Payment webhook behavior
- Receipt / Verification page redesign

## Implementation Reference

Rendering sources:

- Active Cases renders: `activeCaseSectionGroups.activeCases`
- Baseline Records renders: `activeCaseSectionGroups.baselineRecords`
- Historic Records renders: `activeCaseSectionGroups.historicRecords`

Counts come from:

- `caseSectionCounts.active`
- `caseSectionCounts.baseline`
- `caseSectionCounts.historic`

Main rendering uses:

- `visibleLifecycleCases`
- `lifecycleEmptyMessage`
- `isLifecycleView`

## Smoke Test Setup

Tested email:

`lifecycle-tabs-smoke-20260510190526@nimclea.test`

Tested case IDs:

Active:
`CASE-1778465126191-ACTIVE`

Baseline:
`CASE-1778465126198-BASELN`

Historic:
`CASE-1778465126204-HISTOR`

## Expected Lifecycle Classification

Active test case:

- title: Lifecycle smoke active case
- expected tab: Active Cases
- expected behavior: ordinary active case appears under Active Cases

Baseline test case:

- title: Lifecycle smoke baseline record
- expected tab: Baseline Records
- expected behavior: paid / issued baseline record appears under Baseline Records
- expected delete button state: Protected

Historic test case:

- title: Lifecycle smoke historic record
- expected tab: Historic Records
- expected behavior: delivered / completed verification record appears under Historic Records
- expected delete button state: Protected

## Observed Smoke Result

Result: PASS

Observed:

- Active Cases tab displayed the active test case.
- Baseline Records tab displayed the baseline test record.
- Historic Records tab displayed the historic test record.
- Baseline / Historic protected records did not expose ordinary Delete.
- Protected records showed Protected.
- The page did not route to Diagnostic.
- The page did not stop at Access.
- Lifecycle tab rendering was based on `activeCaseSectionGroups` rather than the old archived tab model.

## Notes

- Legacy `archivedCases` / `handleRestoreCase` code remains temporarily in the file but is no longer part of the primary lifecycle tab navigation.
- Removing legacy Archive / Restore code is a future cleanup task.
- Baseline / Historic primary action labels may be refined later, for example Detail / View record / Continue to verification, but this checkpoint only verifies lifecycle grouping.

## Final Status

Status: PASS

Summary:
The Cases page now supports lifecycle-based primary navigation across Active Cases, Baseline Records, and Historic Records. Each lifecycle tab renders from the intended `activeCaseSectionGroups` source, and protected formal records are no longer exposed to ordinary Delete.
