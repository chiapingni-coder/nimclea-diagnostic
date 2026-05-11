# Case Lifecycle and Workspace Limit Contract

## Purpose

This contract defines the system-wide case lifecycle and workspace active case limit model. It applies across trial, pilot extension, standard workspace, and future paid workspace plans.

## Active Cases

- Active Cases are ordinary working cases inside the workspace.
- Active Cases count toward the plan's active case limit.
- A case remains active while it is being edited, evaluated, piloted, event-captured, or receipt-previewed.
- Unpaid and unissued cases may show a Delete action.
- Deleted active cases are permanently removed from the workspace and are not restorable.
- Deleted active cases must not reappear from backend merge sources, local registry data, email logs, event logs, trial snapshots, or result return flows.
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
- If the user confirms deletion, the case is permanently removed from the active workspace and cannot be restored.
- Any later payment event tied to the deleted case must not automatically restore the case and should require exception handling or manual review.
- Once Formal Receipt is paid or issued, the case moves to Baseline Records and normal Delete is no longer available.

## Case Section Classification Function Contract

Future implementation should define a pure classification function:

```js
getCaseSection(caseItem) -> "active" | "baseline" | "historic"
```

The function must be the single source of truth for assigning a case to one of the three UI sections:

- Active Cases
- Baseline Records
- Historic Records

### Active

Return `"active"` when the case is still an ordinary workspace case.

Active includes:

- draft cases;
- diagnostic_completed cases;
- result_ready cases;
- pilot / case plan cases;
- event-captured cases;
- receipt-ready preview cases that are not paid or issued;
- Formal Receipt checkout_created but unpaid cases.

Important:

- `checkout_created` but unpaid stays active.
- It still counts toward the active case limit.
- It may show Delete, but Delete must require a high-risk confirmation warning.
- It must not be moved to Baseline Records until paid or issued.

### Baseline

Return `"baseline"` when the case has a formal paid or issued record but has not completed final historic delivery.

Baseline includes:

- Formal Receipt paid;
- Formal Receipt issued;
- Formal Receipt activated;
- cases where `isBackendReceiptPaidOrActivated(caseItem)` is true;
- Formal Verification paid but not yet delivered;
- Formal Verification ready for evidence package download, if delivery has not yet been completed.

Important:

- Baseline Records do not count toward the active case limit.
- Baseline Records must not show normal Delete.
- Baseline Records may show View, Download, Continue to Verification, or Create follow-up case.

### Historic

Return `"historic"` only when the case has completed formal verification delivery.

Historic includes:

- Formal Verification delivered;
- first evidence package download completed;
- equivalent delivery-completion event recorded.

Important:

- Verification paid alone is not enough to become historic.
- Verification activated alone is not enough to become historic.
- Historic Records are read-only.
- Historic Records do not count toward active case limits.
- Historic Records cannot be deleted as ordinary cases.
- Historic Records cannot be reactivated.
- Later developments must create a new case or follow-up case.

### Precedence Rule

The function must apply precedence in this order:

1. Historic
2. Baseline
3. Active

This means:

- If a case satisfies historic delivery conditions, return `"historic"` even if it also has paid or receipt signals.
- Else if it satisfies baseline paid/issued conditions, return `"baseline"`.
- Else return `"active"`.

### Payment-Pending Rule

A Formal Receipt `checkout_created` but unpaid case must return `"active"`, not `"baseline"`.

### Deletion Rule

Deletion behavior is not decided by UI section alone.

Future code may use a separate helper such as:

```js
canDeleteCase(caseItem)
```

Rules:

- active unpaid/unissued cases may be deletable;
- payment-pending active cases may be deletable only after high-risk confirmation;
- baseline and historic records must not show normal Delete.

### Implementation Note

Future frontend implementation should first introduce `getCaseSection(caseItem)` as a pure helper and use it to derive:

- activeCases
- baselineRecords
- historicRecords

Do not implement this function yet in code during this documentation step.

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
