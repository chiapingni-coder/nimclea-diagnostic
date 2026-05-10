# Case Lifecycle and Workspace Limit Contract

## Purpose

This contract defines the system-wide case lifecycle and workspace active case limit model. It applies across trial, pilot extension, standard workspace, and future paid workspace plans.

## Active Cases

- Active Cases are ordinary working cases inside the workspace.
- Active Cases count toward the plan's active case limit.
- A case remains active while it is being edited, evaluated, piloted, event-captured, or receipt-previewed.
- Unpaid and unissued cases may show a Delete action.
- Deleted active cases are not restorable.
- Deleting a case does not reset, extend, or restart any trial or subscription access window.

## Baseline Records

- Baseline Records are paid or formally issued records that should no longer be treated as ordinary active workspace cases.
- Formal Receipt paid or issued cases move to Baseline Records.
- Formal Verification paid but not yet delivered may remain in Baseline Records until delivery is complete.
- Baseline Records do not count toward the active case limit.
- Baseline Records must not show the normal Delete case action.
- Baseline Records may offer actions such as View, Download, Continue to Verification, or Create follow-up case.

## Historic Records

- Historic Records are formally completed and delivered records.
- Formal Verification records move to Historic Records after first evidence package download or equivalent delivery-completion event.
- Historic Records do not count toward the active case limit.
- Historic Records are read-only.
- Historic Records cannot be reactivated, deleted as ordinary cases, or edited as active cases.
- Later developments must be handled through a new case or follow-up case.

## Payment-Pending Cases

- A Formal Receipt checkout_created but unpaid case remains in Active Cases.
- It continues to count toward the active case limit.
- The Delete action may remain available.
- Clicking Delete must show a high-risk confirmation warning because checkout has already been started.
- If the user confirms deletion, the case is removed from the active workspace and cannot be restored.
- Any later payment event tied to the deleted case must not automatically restore the case and should require exception handling or manual review.
- Once Formal Receipt is paid or issued, the case moves to Baseline Records and normal Delete is no longer available.

## Plan Limits

- The active case limit is plan-dependent.
- Free 7-Day Trial: 3 active cases.
- Pilot Extension: 3 active cases.
- Standard Workspace at $79/month: 10 active cases.
- Future higher-tier workspace plans may define higher active case limits, such as 25 or custom.
- Active case limit means active cases at the same time, not lifetime total cases.
- Baseline Records and Historic Records do not count toward active case limits.

## Relationship to Trial Contract

- `docs/TRIAL_WORKSPACE_ACCESS_CONTRACT.md` defines the trial and pilot extension access window.
- This file defines the system-wide case lifecycle and active case limit model.
- Trial, pilot extension, standard workspace, and future paid plans must all use this lifecycle model.
