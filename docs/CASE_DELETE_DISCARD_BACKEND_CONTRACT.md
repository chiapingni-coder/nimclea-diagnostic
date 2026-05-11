# Case Delete / Discard Backend Contract

## Purpose

This contract defines backend behavior for deleting ordinary active workspace cases through the discard route. It builds on the system-wide lifecycle model in `docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md`.

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
- Ordinary unpaid active case Delete is irreversible and has no ordinary restore path.

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

Allowed deletion must permanently remove the ordinary case from the user workspace and from sources that can rebuild the workspace list.

## Cases That Must Not Be Deleted As Ordinary Cases

Not allowed:

- Formal Receipt paid;
- Formal Receipt issued;
- Formal Receipt activated;
- cases where backend receipt paid / activated logic is true;
- receipt-backed records;
- Formal Verification paid;
- Formal Verification activated;
- Formal Verification issued;
- Formal Verification delivered;
- verification-backed records;
- Baseline Records;
- Historic Records.

These cases should move to or remain in Baseline Records / Historic Records and must not show the normal Delete action.

## Payment-Pending Delete Rule

- Formal Receipt checkout_created but unpaid remains an Active Case.
- It still counts toward the active case limit.
- It may be deleted only after high-risk confirmation.
- If deleted, it must not be restorable.
- If a later Stripe payment event arrives for the deleted case, the backend must not automatically restore the case.
- Late payment events tied to deleted cases should require exception handling or manual review.

## Backend Hard Delete And Denylist Shape

Allowed deletion should remove ordinary case content from `cases.json` and from other sources used to rebuild `/cases` when those sources are not protected formal records.

The backend may retain a minimal denylist record only to prevent orphan logs or mirrors from rebuilding the deleted case:

```json
{
  "caseId": "CASE-example",
  "deletedAt": "2026-05-10T00:00:00.000Z",
  "deletedBy": "user",
  "deletionReason": "user_confirmed_delete",
  "deletedFrom": "cases_page"
}
```

The denylist must not contain recoverable case content, diagnostic answers, evidence, receipt data, verification data, payment snapshots, or formal record payloads.

The denylist must not be treated as a restore source.

## Recommended Backend Route

Current route shape:

```http
PATCH /case/:caseId/discard
```

The route should:

- validate `caseId`;
- load the case record from `cases.json` or other backend merge sources;
- reject deletion if the case is paid, issued, activated, verified, delivered, receipt-backed, verification-backed, baseline, or historic;
- allow irreversible deletion for unpaid active cases;
- allow irreversible deletion for `checkout_created` unpaid cases only if the request confirms `highRiskConfirmed === true`;
- remove ordinary case content from rebuild sources;
- preserve only minimal non-recoverable denylist data when needed;
- return success with the deleted `caseId` and `deletedAt`.

## /cases List Filtering Requirement

The `/cases` list endpoint must not return deleted / discarded ordinary cases by default.

Filtering must happen in the backend list merge pipeline, especially in `backend/server.js` at `app.get("/cases")`.

Because `/cases` merges:

- `emailLogs.json`
- `cases.json`
- `receiptRecords.json`
- `eventLogs.json`
- trial snapshots
- hash ledger previews
- Supabase case sources

the backend must prevent deleted cases from being revived by email logs, event logs, receipt records, trial snapshots, hash ledger previews, Supabase mirrors, or result return flows.

Recommended behavior:

- identify deleted `caseId`s from the minimal denylist and any legacy deletion markers;
- skip deleted `caseId`s when building candidate maps;
- filter final matches before returning response;
- do not filter paid / issued / historic records as deleted unless they are explicitly in a separate protected-record policy.

## Single Case Fetch Behavior

`GET /case/:caseId` for a deleted ordinary case should return `404` or `410 Gone`.

It must not return full deleted case content or expose a recoverable case payload.

## Local Frontend deleteCase() Boundary

`frontend/utils/caseRegistry.js` `deleteCase()` only removes local registry entries.

It must not be treated as system-level delete.

It may be used only as a local cleanup helper after backend discard succeeds.

## Relationship to Other Contracts

Related contracts:

- `docs/CASE_LIFECYCLE_AND_WORKSPACE_LIMIT_CONTRACT.md`
- `docs/CASE_DELETE_RETENTION_CONTRACT.md`
- `docs/TRIAL_WORKSPACE_ACCESS_CONTRACT.md`
- `docs/FOUNDATION_CONTRACT_INDEX.md`

This contract defines the backend delete / discard behavior.

The lifecycle contract defines Active / Baseline / Historic classification.

The retention contract defines irreversible ordinary-case deletion and the non-recoverable denylist boundary.

The trial contract defines access duration, not delete behavior.
