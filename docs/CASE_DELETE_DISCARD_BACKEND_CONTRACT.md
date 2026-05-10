# Case Delete / Discard Backend Contract

## Purpose

This contract defines backend behavior for deleting or discarding ordinary active workspace cases. It builds on the system-wide lifecycle model in `docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md`.

The `/cases` list merge pipeline currently lives in `backend/server.js` at `app.get("/cases")`.

The system has three case sections:

- Active Cases
- Baseline Records
- Historic Records

## Scope

- Delete / Discard applies only to unpaid, unissued, ordinary active workspace cases.
- Delete / Discard does not apply to Baseline Records.
- Delete / Discard does not apply to Historic Records.
- Delete / Discard is not the same as Archive.
- Archive / Restore should not be the long-term lifecycle model.

## Cases That May Be Deleted / Discarded

Allowed:

- draft cases;
- diagnostic_started cases;
- diagnostic_completed cases;
- result_ready cases;
- pilot / case plan cases;
- event-captured cases;
- receipt-ready preview cases that have not been paid or issued;
- Formal Receipt checkout_created but unpaid cases, only after high-risk confirmation.

## Cases That Must Not Be Deleted As Ordinary Cases

Not allowed:

- Formal Receipt paid;
- Formal Receipt issued;
- Formal Receipt activated;
- cases where backend receipt paid / activated logic is true;
- Formal Verification paid;
- Formal Verification activated;
- Formal Verification issued;
- Formal Verification delivered;
- Historic Records.

These cases should move to or remain in Baseline Records / Historic Records and must not show the normal Delete action.

## Payment-Pending Delete Rule

- Formal Receipt checkout_created but unpaid remains an Active Case.
- It still counts toward the active case limit.
- It may be deleted only after high-risk confirmation.
- If deleted, it must not be restorable.
- If a later Stripe payment event arrives for the deleted case, the backend must not automatically restore the case.
- Late payment events tied to deleted cases should require exception handling or manual review.

## Backend Soft Delete Shape

Recommended persisted fields on the case record:

```json
{
  "deletedAt": "2026-05-10T00:00:00.000Z",
  "deletedBy": "user",
  "deletionReason": "user_confirmed_delete",
  "deletedFrom": "cases_page",
  "paymentStatusAtDeletion": "checkout_created",
  "paymentTypeAtDeletion": "receipt_activation",
  "stripeSessionIdAtDeletion": "cs_example"
}
```

Future aliases may also be supported:

- `discardedAt`
- `caseDeletedAt`
- `isDeleted`
- `deleted`

## Recommended Backend Route

Future route shape:

```http
PATCH /case/:caseId/discard
```

or:

```http
POST /case/:caseId/discard
```

The route should:

- validate `caseId`;
- load the case record from `cases.json` or future database;
- reject deletion if the case is paid, issued, activated, verified, delivered, baseline, or historic;
- allow deletion for unpaid active cases;
- allow deletion for `checkout_created` unpaid cases only if the request confirms `highRiskConfirmed === true`;
- write soft delete fields;
- preserve minimal tombstone data;
- return success with the deleted `caseId` and `deletedAt`.

## /cases List Filtering Requirement

The `/cases` list endpoint must not return deleted / discarded ordinary cases by default.

Filtering must happen in the backend list merge pipeline, especially in `backend/server.js` at `app.get("/cases")`.

Because `/cases` merges:

- `emailLogs.json`
- `cases.json`
- `receiptRecords.json`
- `eventLogs.json`
- Supabase case sources

the backend must prevent deleted cases from being revived by email logs, event logs, receipt records, or Supabase mirrors.

Recommended behavior:

- identify deleted `caseId`s from case records with `deletedAt` / `discardedAt` / `isDeleted`;
- skip deleted `caseId`s when building `candidateMap`;
- filter final matches before returning response;
- do not filter paid / issued / historic records as deleted unless they have a separate formal retention policy.

## Single Case Fetch Behavior

`GET /case/:caseId` for a deleted ordinary case should either:

- return `410 Gone`; or
- return `200` with `deleted: true` and limited tombstone fields.

MVP recommendation:

- use `410 Gone` for ordinary deleted cases;
- do not expose full deleted case content.

## Local Frontend deleteCase() Boundary

`frontend/utils/caseRegistry.js` `deleteCase()` only removes local registry entries.

It must not be treated as system-level delete.

It may be used only as a local cleanup helper after backend discard succeeds.

## Relationship to Other Contracts

Related contracts:

- `docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md`
- `docs/TRIAL_WORKSPACE_ACCESS_CONTRACT.md`
- `docs/FOUNDATION_CONTRACT_INDEX.md`

This contract defines the backend delete / discard behavior.

The lifecycle contract defines Active / Baseline / Historic classification.

The trial contract defines access duration, not delete behavior.
