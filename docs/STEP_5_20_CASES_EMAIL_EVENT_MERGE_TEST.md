# STEP 5.20 Cases Email Event Merge Test

Date: 2026-05-08

Scope: `/cases?email=` event merge verification for case list retrieval. This document records the manual test result only; no application logic was changed.

## Executive Summary

- `GET /cases?email=` successfully returned the target case.
- The returned case included event-backed status fields.
- The returned case exposed `events`, `eventLogs`, `entries`, and `eventCount`.

## Test Input

- Email: `step519b-1778268370097@nimclea.test`
- Case ID: `CASE-1778268370097-U4INHG`

## Result

- `status`: `event_captured`
- `stage`: `event_captured`
- `eventCount`: `1`
- `events` array contained the Step 5.19-B test event.
- `eventLogs` array contained the same event.
- `entries` array contained the same event.

Result: PASS.

## Note

`latestEvent` was `null`, but this did not block the list-level event merge because `eventCount` and event arrays were present.

## Conclusion

The durable evidence route is now verified through both:

- `POST /event/log -> GET /case/:caseId`
- `POST /event/log -> GET /cases?email=`

## No Code Changes Made

No application logic, route behavior, frontend behavior, or backend behavior was modified for this test record. The only change is this markdown document.
