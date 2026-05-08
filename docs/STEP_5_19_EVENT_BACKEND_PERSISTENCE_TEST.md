# STEP 5.19 Event Backend Persistence Test

Date: 2026-05-08

Scope: backend event persistence verification for the durable evidence route. This document records the manual test result only; no application logic was changed.

## Executive Summary

- `POST /event/log` successfully persists events.
- `GET /event/logs` can read the persisted event.
- `GET /case/:caseId` can merge `eventLogs.json` events back into case detail.

## Test A: Event Log Write And Readback

Request:

- Route: `POST /event/log`
- Event type: `step_5_19_event_persistence_test`

Readback:

- Route: `GET /event/logs`
- Expected: persisted event is present in the returned event list.

Result: PASS.

## Test B: Case Detail Event Merge

Setup:

- Created a test case with `POST /case/save`.
- Wrote a related event with `POST /event/log`.
- Read the case with `GET /case/:caseId`.

Expected:

- Returned case detail includes merged event data from `eventLogs.json`.

Observed:

- Returned case included `events`.
- Returned case included `eventLogs`.
- Returned case included `eventCount: 1`.

Result: PASS.

## Duplicate Check Note

The manual test script found the same event twice only because it checked both `events` and `eventLogs` arrays.

This is not evidence of duplicate backend writes because the merged case detail returned `eventCount: 1`.

## Conclusion

The durable evidence route is verified:

`ReceiptPage Quick Capture -> logTrialEvent -> POST /event/log -> eventLogs.json -> GET /case/:caseId merged case detail`

## No Code Changes Made

No application logic, route behavior, frontend behavior, or backend behavior was modified for this test record. The only change is this markdown document.
