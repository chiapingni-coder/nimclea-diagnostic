#!/usr/bin/env node

import {
  deriveMergedCaseEventCount,
  getCaseSortTime,
  hasNestedCaseIdentityConflict,
  mergeCaseEvents,
  pickHigherStage,
  pickRicherCaseRecord,
  sanitizeCaseIdentity,
  pickStrongestPaymentStatus,
  pickStrongestReceiptStatus,
} from "../backend/utils/caseAggregationHelpers.js";

function pass(message) {
  return { pass: true, message };
}

function fail(message) {
  return { pass: false, message };
}

function expect(condition, message) {
  return condition ? pass(message) : fail(message);
}

function assertCase({ id, name, run }) {
  const context = run();
  const failures = context.checks
    .filter((check) => !check.pass)
    .map((check) => check.message);

  return {
    id,
    name,
    result: failures.length === 0 ? "PASS" : "FAIL",
    observed: context.observed,
    expected: context.expected,
    failures,
  };
}

const smokeCases = [
  {
    id: "GTC-015A",
    name: "Duplicate records keep receipt-ready lifecycle",
    run: () => {
      const diagnosticOnly = {
        caseId: "CASE-GTC-015A",
        stage: "diagnostic_completed",
        receiptEligible: false,
        eventCount: 0,
        source: "diagnostic_completed",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      const receiptReady = {
        caseId: "CASE-GTC-015A",
        stage: "receipt_ready",
        currentStep: "receipt",
        receiptEligible: true,
        caseReceiptEligible: true,
        receiptStatus: "ready",
        eventCount: 2,
        source: "receipt_page_repair",
        updatedAt: "2026-05-12T00:00:00.000Z",
      };
      const selected = pickRicherCaseRecord(diagnosticOnly, receiptReady);

      return {
        observed: `${selected.stage}; receiptEligible=${selected.receiptEligible}; receiptStatus=${selected.receiptStatus}`,
        expected: "receipt_ready duplicate wins over diagnostic-only duplicate",
        checks: [
          expect(selected === receiptReady, "receipt-ready record should be selected"),
          expect(selected.stage === "receipt_ready", "selected stage should remain receipt_ready"),
          expect(selected.receiptEligible === true, "selected record should remain receipt eligible"),
        ],
      };
    },
  },
  {
    id: "GTC-015B",
    name: "Event merge preserves explicit max event count",
    run: () => {
      const baseCase = {
        caseId: "CASE-GTC-015B",
        eventCount: 5,
        events: [
          { eventId: "evt-1", type: "evidence_capture" },
          { eventId: "evt-2", type: "evidence_capture" },
        ],
      };
      const receiptCase = {
        caseId: "CASE-GTC-015B",
        eventCount: 2,
        eventLogs: [
          { eventId: "evt-2", type: "evidence_capture" },
          { eventId: "evt-3", type: "receipt_evidence" },
        ],
      };
      const backendLogs = [
        { eventId: "evt-3", type: "receipt_evidence" },
        { eventId: "evt-4", type: "formal_evidence_capture" },
      ];
      const mergedEvents = mergeCaseEvents(
        baseCase.events,
        baseCase.eventLogs,
        receiptCase.events,
        receiptCase.eventLogs,
        backendLogs
      );
      const mergedEventCount = deriveMergedCaseEventCount(
        baseCase,
        receiptCase,
        mergedEvents
      );

      return {
        observed: `mergedEvents=${mergedEvents.length}; mergedEventCount=${mergedEventCount}`,
        expected: "deduped events merge, eventCount remains max explicit/merged count",
        checks: [
          expect(mergedEvents.length === 4, "deduped merged event length should be 4"),
          expect(mergedEventCount === 5, "merged eventCount should preserve explicit max count"),
        ],
      };
    },
  },
  {
    id: "GTC-015C",
    name: "Payment overlay does not erase receipt-ready eligibility",
    run: () => {
      const paymentRecord = {
        caseId: "CASE-GTC-015C",
        paymentStatus: "paid",
        paid: true,
      };
      const receiptReadyRecord = {
        caseId: "CASE-GTC-015C",
        stage: "receipt_ready",
        receiptEligible: true,
        caseReceiptEligible: true,
        receiptStatus: "ready",
      };
      const finalPaymentStatus = pickStrongestPaymentStatus(
        paymentRecord.paymentStatus,
        receiptReadyRecord.paymentStatus
      );
      const finalReceiptStatus = pickStrongestReceiptStatus(
        paymentRecord.receiptStatus,
        receiptReadyRecord.receiptStatus,
        receiptReadyRecord.receiptEligible === true ? "ready" : ""
      );
      const finalStage = pickHigherStage(
        paymentRecord.stage,
        receiptReadyRecord.stage,
        receiptReadyRecord.receiptEligible === true ? "receipt_ready" : ""
      );
      const receiptEligible = receiptReadyRecord.receiptEligible === true;

      return {
        observed: `${finalStage}; paymentStatus=${finalPaymentStatus}; receiptStatus=${finalReceiptStatus}; receiptEligible=${receiptEligible}`,
        expected: "payment state preserved while receipt-ready eligibility remains true",
        checks: [
          expect(finalPaymentStatus === "paid", "paid status should be preserved"),
          expect(finalReceiptStatus === "ready", "receipt ready status should be preserved"),
          expect(finalStage === "receipt_ready", "receipt_ready lifecycle should remain visible"),
          expect(receiptEligible === true, "receipt eligibility should not be erased"),
        ],
      };
    },
  },
  {
    id: "GTC-015D",
    name: "Case ordering prefers CASE timestamp over updatedAt churn",
    run: () => {
      const olderCaseWithNewerUpdate = {
        caseId: "CASE-1000000000000-OLDER",
        updatedAt: "2030-01-01T00:00:00.000Z",
      };
      const newerCaseWithOlderUpdate = {
        caseId: "CASE-2000000000000-NEWER",
        updatedAt: "2020-01-01T00:00:00.000Z",
      };
      const sorted = [olderCaseWithNewerUpdate, newerCaseWithOlderUpdate].sort(
        (a, b) => getCaseSortTime(b) - getCaseSortTime(a)
      );

      return {
        observed: `${sorted[0].caseId}; olderTime=${getCaseSortTime(olderCaseWithNewerUpdate)}; newerTime=${getCaseSortTime(newerCaseWithOlderUpdate)}`,
        expected: "CASE timestamp ordering wins over updatedAt churn",
        checks: [
          expect(sorted[0] === newerCaseWithOlderUpdate, "newer CASE timestamp should sort first"),
          expect(getCaseSortTime(newerCaseWithOlderUpdate) > getCaseSortTime(olderCaseWithNewerUpdate), "CASE timestamp should drive sort time"),
        ],
      };
    },
  },
  {
    id: "GTC-015E",
    name: "Meaningful title is not downgraded by stale placeholder duplicate",
    run: () => {
      const canonicalTitleRecord = {
        caseId: "CASE-GTC-015E",
        title: "Stable Case Name",
        caseName: "Stable Case Name",
        name: "Stable Case Name",
        stage: "receipt_ready",
        receiptEligible: true,
        source: "receipt_page_repair",
        eventCount: 3,
        updatedAt: "2026-05-12T00:00:00.000Z",
      };
      const stalePlaceholderDuplicate = {
        caseId: "CASE-GTC-015E",
        title: "Untitled case",
        caseName: "Untitled case",
        name: "Untitled case",
        stage: "diagnostic_completed",
        receiptEligible: false,
        source: "pilot",
        eventCount: 0,
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      const selected = pickRicherCaseRecord(
        stalePlaceholderDuplicate,
        canonicalTitleRecord
      );

      return {
        observed: `${selected.title}; ${selected.caseName}; ${selected.name}; stage=${selected.stage}`,
        expected: "meaningful title/name record remains selected over stale placeholder duplicate",
        checks: [
          expect(selected === canonicalTitleRecord, "canonical title record should be selected"),
          expect(selected.title === "Stable Case Name", "title should not downgrade"),
          expect(selected.caseName === "Stable Case Name", "caseName should not downgrade"),
          expect(selected.name === "Stable Case Name", "name should not downgrade"),
        ],
      };
    },
  },
  {
    id: "GTC-015F",
    name: "Route-shaped case merge preserves receipt-ready record",
    run: () => {
      const baseCase = {
        caseId: "CASE-GTC-015F",
        title: "Stable Route Case",
        caseName: "Stable Route Case",
        name: "Stable Route Case",
        stage: "diagnostic_completed",
        receiptEligible: false,
        eventCount: 1,
        events: [
          {
            eventId: "route-event-1",
            caseId: "CASE-GTC-015F",
            type: "pilot_event",
            createdAt: "2026-05-12T00:00:00.000Z",
          },
        ],
        updatedAt: "2026-05-12T00:00:00.000Z",
      };
      const receiptLikeRecord = {
        caseId: "CASE-GTC-015F",
        title: "Stable Route Case",
        caseName: "Stable Route Case",
        name: "Stable Route Case",
        stage: "receipt_ready",
        currentStep: "receipt",
        receiptEligible: true,
        caseReceiptEligible: true,
        receiptStatus: "ready",
        eventCount: 2,
        eventLogs: [
          {
            eventId: "route-event-2",
            caseId: "CASE-GTC-015F",
            type: "receipt_evidence",
            createdAt: "2026-05-12T01:00:00.000Z",
          },
        ],
        updatedAt: "2026-05-12T02:00:00.000Z",
      };
      const backendLogs = [
        {
          eventId: "route-event-3",
          caseId: "CASE-GTC-015F",
          type: "formal_evidence_capture",
          createdAt: "2026-05-12T03:00:00.000Z",
        },
      ];

      const selected = pickRicherCaseRecord(baseCase, receiptLikeRecord);
      const mergedEvents = mergeCaseEvents(
        baseCase.events,
        baseCase.eventLogs,
        receiptLikeRecord.events,
        receiptLikeRecord.eventLogs,
        backendLogs
      );
      const mergedEventCount = deriveMergedCaseEventCount(
        baseCase,
        receiptLikeRecord,
        mergedEvents
      );
      const finalStage = pickHigherStage(
        baseCase.stage,
        receiptLikeRecord.stage,
        selected.receiptEligible === true ? "receipt_ready" : ""
      );
      const finalReceiptStatus = pickStrongestReceiptStatus(
        baseCase.receiptStatus,
        receiptLikeRecord.receiptStatus,
        selected.receiptEligible === true ? "ready" : ""
      );
      const mismatchedReceiptWrapper = {
        caseId: "CASE-GTC-015F",
        id: "CASE-GTC-015F",
        email: "owner@example.com",
        caseData: {
          caseId: "CASE-GTC-015F-OTHER",
          email: "other@example.com",
          lead: { email: "other@example.com" },
        },
        caseSnapshot: {
          caseId: "CASE-GTC-015F-OTHER",
          caseRecord: { caseId: "CASE-GTC-015F-OTHER" },
        },
      };
      const sanitizedIdentity = sanitizeCaseIdentity(
        mismatchedReceiptWrapper,
        "CASE-GTC-015F",
        "owner@example.com"
      );

      return {
        observed: `${finalStage}; receiptEligible=${selected.receiptEligible}; receiptStatus=${finalReceiptStatus}; title=${selected.title}; mergedEventCount=${mergedEventCount}; identity=${sanitizedIdentity.caseId}/${sanitizedIdentity.id}`,
        expected: "route-shaped merge keeps receipt-ready lifecycle, title/name, merged events, and canonical identity",
        checks: [
          expect(selected === receiptLikeRecord, "receipt-like record should be selected"),
          expect(finalStage === "receipt_ready", "final stage should be receipt_ready"),
          expect(selected.receiptEligible === true, "selected record should remain receipt eligible"),
          expect(finalReceiptStatus === "ready", "final receipt status should be ready"),
          expect(selected.title === "Stable Route Case", "title should remain Stable Route Case"),
          expect(selected.caseName === "Stable Route Case", "caseName should remain Stable Route Case"),
          expect(selected.name === "Stable Route Case", "name should remain Stable Route Case"),
          expect(mergedEvents.length === 3, "merged events length should be 3"),
          expect(mergedEventCount === 3, "merged eventCount should be 3"),
          expect(
            hasNestedCaseIdentityConflict(mismatchedReceiptWrapper, "CASE-GTC-015F") === true,
            "mismatched nested receipt snapshot identity should be detected"
          ),
          expect(sanitizedIdentity.caseId === "CASE-GTC-015F", "sanitized caseId should match canonical caseId"),
          expect(sanitizedIdentity.id === "CASE-GTC-015F", "sanitized id should match canonical caseId"),
          expect(!sanitizedIdentity.caseData, "mismatched nested caseData should be ignored"),
          expect(!sanitizedIdentity.caseSnapshot, "mismatched caseSnapshot should be ignored"),
        ],
      };
    },
  },
];

const results = smokeCases.map(assertCase);
const failed = results.filter((result) => result.result === "FAIL");

console.log("\nNimclea Golden Backend Aggregation Smoke Check v0.1\n");
console.table(
  results.map((result) => ({
    Case: result.id,
    Result: result.result,
    Observed: result.observed,
    Expected: result.expected,
  }))
);

if (failed.length > 0) {
  console.error("\nFailures:");
  for (const result of failed) {
    console.error(`- ${result.id} ${result.name}`);
    for (const failure of result.failures) {
      console.error(`  - ${failure}`);
    }
  }
  process.exit(1);
}

console.log(`\nPASS: ${results.length}/${results.length} golden backend aggregation smoke checks passed.`);
