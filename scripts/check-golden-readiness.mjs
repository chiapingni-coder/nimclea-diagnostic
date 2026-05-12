#!/usr/bin/env node

import {
  buildReadinessContract,
  calculateDeterministicScore,
} from "../frontend/utils/deterministicScore.js";
import {
  isBackendReceiptReady,
} from "../frontend/utils/dataContractLifecycle.js";
import {
  createSharedReceiptVerificationContract,
} from "../frontend/utils/sharedReceiptVerificationContract.js";
import {
  resolveAccessMode,
} from "../frontend/lib/accessMode.js";

function withQuietScoring(fn) {
  const originalLog = console.log;
  console.log = () => {};

  try {
    return fn();
  } finally {
    console.log = originalLog;
  }
}

function getReceiptContract(input) {
  return withQuietScoring(() => buildReadinessContract(input));
}

function getDeterministicScore(input) {
  return withQuietScoring(() => calculateDeterministicScore(input));
}

function getVerificationContract(input) {
  return createSharedReceiptVerificationContract(input);
}

function assertCase({ id, name, run }) {
  const failures = [];
  const context = run();

  for (const check of context.checks) {
    if (!check.pass) {
      failures.push(check.message);
    }
  }

  return {
    id,
    name,
    result: failures.length === 0 ? "PASS" : "FAIL",
    observed: context.observed,
    expected: context.expected,
    failures,
  };
}

function pass(message) {
  return { pass: true, message };
}

function fail(message) {
  return { pass: false, message };
}

function expect(condition, message) {
  return condition ? pass(message) : fail(message);
}

const goldenCases = [
  {
    id: "GTC-001",
    name: "No real event captured",
    run: () => {
      const contract = getReceiptContract({
        caseId: "CASE-GTC-001",
        status: "diagnostic_completed",
        stage: "result",
        events: [],
      });

      return {
        observed: `${contract.readinessLevel}; ready=${contract.receiptReady}; events=${contract.deterministicScore.eventCount}`,
        expected: "not ready; insufficient_record; no events",
        checks: [
          expect(contract.receiptReady === false, "receiptReady should be false"),
          expect(contract.readinessLevel === "insufficient_record", "readinessLevel should be insufficient_record"),
          expect(contract.deterministicScore.eventCount === 0, "eventCount should be 0"),
        ],
      };
    },
  },
  {
    id: "GTC-002",
    name: "Event captured but weak evidence/context",
    run: () => {
      const contract = getReceiptContract({
        caseId: "CASE-GTC-002",
        events: [
          {
            type: "quick_capture",
            text: "Team discussed next steps and possible follow-up.",
          },
        ],
        receiptRecordFormable: false,
      });

      return {
        observed: `${contract.readinessLevel}; ready=${contract.receiptReady}; score=${contract.readinessScore}`,
        expected: "not ready; insufficient or non-ready",
        checks: [
          expect(contract.deterministicScore.eventCount === 1, "eventCount should be 1"),
          expect(contract.receiptReady === false, "receiptReady should be false"),
          expect(contract.readinessLevel !== "ready", "readinessLevel should not be ready"),
        ],
      };
    },
  },
  {
    id: "GTC-003",
    name: "Insufficient evidence case",
    run: () => {
      const contract = getReceiptContract({
        caseId: "CASE-GTC-003",
        result: { summary: "Pilot result exists." },
        currentStep: "receipt",
        events: [
          {
            type: "quick_capture",
            text: "Workflow owner discussed pending next steps.",
          },
        ],
        structureStatus: "complete",
        structureScore: 1,
        continuityStatus: "pending",
        receiptRecordFormable: true,
      });

      return {
        observed: `${contract.readinessLevel}; ready=${contract.receiptReady}; critical=${contract.criticalBlockers.map((item) => item.key).join(",")}`,
        expected: "insufficient_record; not ready; evidence blocker",
        checks: [
          expect(contract.receiptReady === false, "receiptReady should be false"),
          expect(contract.readinessLevel === "insufficient_record", "readinessLevel should be insufficient_record"),
          expect(contract.criticalBlockers.some((item) => item.key === "evidence"), "evidence should be a critical blocker"),
        ],
      };
    },
  },
  {
    id: "GTC-004",
    name: "Pending review case",
    run: () => {
      const contract = getReceiptContract({
        caseId: "CASE-GTC-004",
        currentStep: "receipt",
        events: [
          {
            type: "evidence_capture",
            text: "Invoice record confirmed for this case.",
          },
        ],
        continuityStatus: "confirmed",
        receiptRecordFormable: true,
      });

      return {
        observed: `${contract.readinessLevel}; ready=${contract.receiptReady}; score=${contract.readinessScore}`,
        expected: "pending_review; not ready",
        checks: [
          expect(contract.receiptReady === false, "receiptReady should be false"),
          expect(contract.readinessLevel === "pending_review", "readinessLevel should be pending_review"),
          expect(contract.criticalBlockers.length === 0, "pending review should not have critical blockers"),
        ],
      };
    },
  },
  {
    id: "GTC-005",
    name: "Receipt ready green case",
    run: () => {
      const contract = getReceiptContract({
        caseId: "CASE-GTC-005",
        events: [
          {
            type: "evidence_capture",
            text: "Invoice record and receipt hash confirmed for case id CASE-GTC-005.",
          },
        ],
        structureStatus: "complete",
        structureScore: 1,
        continuityStatus: "confirmed",
        receiptRecordFormable: true,
      });

      return {
        observed: `${contract.readinessLevel}; ready=${contract.receiptReady}; score=${contract.readinessScore}`,
        expected: "ready; receiptReady true",
        checks: [
          expect(contract.receiptReady === true, "receiptReady should be true"),
          expect(contract.readinessLevel === "ready", "readinessLevel should be ready"),
          expect(contract.readinessScore >= 3, "readinessScore should meet threshold"),
        ],
      };
    },
  },
  {
    id: "GTC-006",
    name: "Broken evidence chain blocks readiness",
    run: () => {
      const contract = getReceiptContract({
        caseId: "CASE-GTC-006",
        events: [
          {
            type: "evidence_capture",
            text: "Verified record and transaction support captured by the owner.",
          },
        ],
        structureStatus: "complete",
        structureScore: 1,
        continuityStatus: "confirmed",
        receiptRecordFormable: true,
        evidenceLockBroken: true,
      });

      return {
        observed: `${contract.readinessLevel}; ready=${contract.receiptReady}; critical=${contract.criticalBlockers.map((item) => item.key).join(",")}`,
        expected: "failed; not ready; consistency blocker",
        checks: [
          expect(contract.receiptReady === false, "receiptReady should be false"),
          expect(contract.readinessLevel === "failed", "readinessLevel should be failed"),
          expect(contract.criticalBlockers.some((item) => item.key === "consistency"), "consistency should be a critical blocker"),
        ],
      };
    },
  },
  {
    id: "GTC-007",
    name: "Trusted backend receipt-ready precedence",
    run: () => {
      const backendReady = isBackendReceiptReady({
        caseId: "CASE-GTC-007",
        source: "backend_case",
        receiptEligible: true,
        receiptStatus: "ready",
        stage: "receipt_ready",
      });

      return {
        observed: `backendReceiptReady=${backendReady}`,
        expected: "trusted backend ready true",
        checks: [
          expect(backendReady === true, "trusted backend receipt-ready signal should pass"),
        ],
      };
    },
  },
  {
    id: "GTC-008",
    name: "Fallback snapshot must not upgrade",
    run: () => {
      const backendReady = isBackendReceiptReady({
        caseId: "CASE-GTC-008",
        source: "receipt_snapshot",
        receiptEligible: true,
        receiptStatus: "ready",
      });

      return {
        observed: `backendReceiptReady=${backendReady}`,
        expected: "fallback source ready false",
        checks: [
          expect(backendReady === false, "fallback snapshot should not count as backend ready"),
        ],
      };
    },
  },
  {
    id: "GTC-009",
    name: "Paid status does not boost evidence",
    run: () => {
      const unpaidScore = getDeterministicScore({
        caseId: "CASE-GTC-009-A",
        events: [
          {
            type: "quick_capture",
            text: "Follow-up pending.",
          },
        ],
      });
      const paidScore = getDeterministicScore({
        caseId: "CASE-GTC-009-B",
        paymentStatus: "checkout_created",
        paid: true,
        events: [
          {
            type: "quick_capture",
            text: "Follow-up pending.",
          },
        ],
      });

      return {
        observed: `unpaidEvidence=${unpaidScore.evidence}; paidEvidence=${paidScore.evidence}; paidReady=${paidScore.receiptEligible}`,
        expected: "payment should not improve evidence score or receipt eligibility",
        checks: [
          expect(paidScore.evidence === unpaidScore.evidence, "payment should not change evidence score"),
          expect(paidScore.receiptEligible === unpaidScore.receiptEligible, "payment should not change deterministic receipt eligibility"),
        ],
      };
    },
  },
  {
    id: "GTC-010",
    name: "Verification ready contract",
    run: () => {
      const contract = getVerificationContract({
        verification: {
          checks: [
            { label: "Evidence", status: "passed" },
            { label: "Structure", status: "passed" },
          ],
        },
        consistencyCheck: { passed: true, conflicts: [] },
      });

      return {
        observed: `${contract.verification.overallStatus}; eligible=${contract.resolvedVerificationEligible}`,
        expected: "Verification Ready; eligible true",
        checks: [
          expect(contract.verification.overallStatus === "Verification Ready", "verification should be ready"),
          expect(contract.resolvedVerificationEligible === true, "resolvedVerificationEligible should be true"),
        ],
      };
    },
  },
  {
    id: "GTC-011",
    name: "Verification warning contract",
    run: () => {
      const contract = getVerificationContract({
        verification: {
          checks: [
            { label: "Evidence", status: "passed" },
            { label: "Structure", status: "warning" },
          ],
        },
        consistencyCheck: { passed: true, conflicts: [] },
      });

      return {
        observed: `${contract.verification.overallStatus}; eligible=${contract.resolvedVerificationEligible}`,
        expected: "Verification Warning; eligible false",
        checks: [
          expect(contract.verification.overallStatus === "Verification Warning", "verification should warn"),
          expect(contract.resolvedVerificationEligible === false, "warning should not be verification eligible"),
        ],
      };
    },
  },
  {
    id: "GTC-012",
    name: "Verification failed contract",
    run: () => {
      const contract = getVerificationContract({
        verification: {
          checks: [
            { label: "Evidence", status: "failed" },
            { label: "Structure", status: "passed" },
          ],
        },
        consistencyCheck: { passed: true, conflicts: [] },
      });

      return {
        observed: `${contract.verification.overallStatus}; eligible=${contract.resolvedVerificationEligible}`,
        expected: "Verification Failed; eligible false",
        checks: [
          expect(contract.verification.overallStatus === "Verification Failed", "verification should fail"),
          expect(contract.resolvedVerificationEligible === false, "failed verification should not be eligible"),
        ],
      };
    },
  },
  {
    id: "GTC-013",
    name: "Access-mode verification fallback",
    run: () => {
      const access = resolveAccessMode({
        caseId: "CASE-GTC-013",
        receiptEligible: true,
        verificationEligible: false,
        eventCount: 1,
      });

      return {
        observed: `canViewVerification=${access.canViewVerification}; verificationEligible=${access.verificationEligible}; canRunVerification=${access.canRunVerification}`,
        expected: "access-mode fallback may allow verification view; not formal verification-ready proof",
        checks: [
          expect(access.canViewVerification === true, "verification view should be allowed by access-mode fallback"),
          expect(access.verificationEligible === true, "access-mode verificationEligible should be true"),
          expect(access.canRunVerification === false, "fallback view access should not imply paid/formal verification run access"),
        ],
      };
    },
  },
  {
    id: "GTC-014",
    name: "Threshold mismatch sentinel",
    run: () => {
      const deterministicThreshold = getDeterministicScore({
        caseId: "CASE-GTC-014",
        events: [
          {
            type: "evidence_capture",
            text: "Evidence record confirmed with workflow decision scope and pending continuity.",
          },
        ],
        workflow: "Approval review",
      }).receiptThreshold;
      const sharedContract = getVerificationContract({
        scoring: {
          totalScore: 3.2,
          receiptThreshold: 3.5,
        },
      });

      return {
        observed: `deterministic=${deterministicThreshold}; shared=${sharedContract.scoring.receiptThreshold}`,
        expected: "deterministic/readiness threshold 3.0 and shared legacy threshold 3.5 are both visible",
        checks: [
          expect(deterministicThreshold === 3.0, "deterministic threshold should be 3.0"),
          expect(sharedContract.scoring.receiptThreshold === 3.5, "shared legacy threshold should be 3.5"),
          expect(deterministicThreshold !== sharedContract.scoring.receiptThreshold, "threshold mismatch should remain detectable"),
        ],
      };
    },
  },
];

const results = goldenCases.map(assertCase);
const failed = results.filter((result) => result.result === "FAIL");

console.log("\nNimclea Golden Readiness Smoke Check v0.1\n");
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

console.log(`\nPASS: ${results.length}/${results.length} golden readiness smoke checks passed.`);
