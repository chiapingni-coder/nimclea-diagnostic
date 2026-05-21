#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const casesPagePath = path.join(repoRoot, "frontend", "pages", "CasesPage.jsx");

const checks = [];

function check(condition, message, observed = "") {
  checks.push({ pass: Boolean(condition), message, observed });
}

function compact(source = "") {
  return String(source).replace(/\s+/g, " ").trim();
}

function extractConst(source, constName) {
  const constNeedle = `const ${constName} =`;
  const letNeedle = `let ${constName} =`;
  const constStart = source.indexOf(constNeedle);
  const letStart = source.indexOf(letNeedle);
  const start =
    constStart === -1 ? letStart : letStart === -1 ? constStart : Math.min(constStart, letStart);
  if (start === -1) return "";

  const nextConst = source.indexOf("\n  const ", start + constName.length);
  const nextLet = source.indexOf("\n  let ", start + constName.length);
  const candidates = [nextConst, nextLet].filter((index) => index !== -1);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.indexOf("\n", start);

  return end === -1 ? source.slice(start) : source.slice(start, end);
}

const sourceExists = existsSync(casesPagePath);
const source = sourceExists ? readFileSync(casesPagePath, "utf8") : "";
const normalizedSource = compact(source);
const strictReceiptAuthorityBlock = compact(
  extractConst(source, "strictBackendOwnedReceiptAuthority")
);
const legacyReadyBlock = compact(extractConst(source, "legacyBackendReceiptReadySignal"));
const directReadyBlock = compact(extractConst(source, "directBackendReceiptReady"));
const paidBlock = compact(extractConst(source, "paid"));
const displayStatusBlock = compact(extractConst(source, "displayStatus"));
const pendingAuthorityBlock = compact(extractConst(source, "pendingReceiptAuthority"));

const PENDING_AUTHORITY_STATE = "case_plan_completed_pending_receipt_authority";
const SYNTHESIS_OBSERVABILITY_KEYS = [
  "hasReceiptPathContext",
  "hasPilotOrCaseResultContext",
  "legacyReceiptReadySignal",
  "strictBackendOwnedReceiptAuthority",
  "pendingReceiptAuthority",
  "receiptReady",
  "lifecycleState",
  "displayStatus",
];

function deriveSyntheticMatrixState(fixture = {}) {
  const strictBackendOwnedReceiptAuthority = fixture.strictBackendOwnedReceiptAuthority === true;
  const receiptReady = strictBackendOwnedReceiptAuthority;
  const paid = fixture.backendOwnedPaidOrActivated === true;
  const checkoutStarted = fixture.paymentStatus === "checkout_created";
  const casePlanCompletedEvidence = fixture.casePlanCompletedEvidence === true;
  const hasReceiptPathContext = fixture.hasReceiptPathContext === true;
  const hasPilotOrCaseResultContext = fixture.hasPilotOrCaseResultContext === true;
  const legacyReceiptReadySignal = fixture.legacyReceiptReadySignal === true;
  const hasEvidenceEvent = Number(fixture.evidenceEventCount || 0) > 0;
  const diagnosticContinuation = fixture.diagnosticContinuation === true;
  const pendingReceiptAuthority = Boolean(
    !receiptReady &&
      !strictBackendOwnedReceiptAuthority &&
      casePlanCompletedEvidence &&
      (hasReceiptPathContext || hasPilotOrCaseResultContext || legacyReceiptReadySignal)
  );
  const synthesisInputs = {
    hasReceiptPathContext,
    hasPilotOrCaseResultContext,
    legacyReceiptReadySignal,
    strictBackendOwnedReceiptAuthority,
    pendingReceiptAuthority,
    receiptReady,
  };
  const withSynthesisInputs = (derived) => ({
    ...synthesisInputs,
    ...derived,
  });

  if (paid) return withSynthesisInputs({ lifecycleState: "paid", displayStatus: "Paid" });
  if (checkoutStarted) {
    return withSynthesisInputs({
      lifecycleState: "receipt_checkout_started",
      displayStatus: "Receipt checkout started",
    });
  }
  if (receiptReady) {
    return withSynthesisInputs({
      lifecycleState: "receipt_ready",
      displayStatus: "Receipt ready",
    });
  }
  if (pendingReceiptAuthority) {
    return withSynthesisInputs({
      lifecycleState: PENDING_AUTHORITY_STATE,
      displayStatus: PENDING_AUTHORITY_STATE,
    });
  }
  if (hasEvidenceEvent) {
    return withSynthesisInputs({
      lifecycleState: "event_captured",
      displayStatus: `Event captured (${Number(fixture.evidenceEventCount || 0)})`,
    });
  }
  if (diagnosticContinuation) {
    return withSynthesisInputs({
      lifecycleState: "diagnostic_completed",
      displayStatus: "Diagnostic completed",
    });
  }

  return withSynthesisInputs({
    lifecycleState: fixture.status || "draft",
    displayStatus: fixture.status || "draft",
  });
}

const syntheticMatrix = [
  {
    name: "case plan completed with receipt path evidence but no strict receipt authority",
    fixture: {
      status: "diagnostic_completed",
      diagnosticContinuation: true,
      casePlanCompletedEvidence: true,
      hasReceiptPathContext: true,
      hasPilotOrCaseResultContext: true,
      strictBackendOwnedReceiptAuthority: false,
    },
    expected: {
      receiptReady: false,
      lifecycleState: PENDING_AUTHORITY_STATE,
      displayStatus: PENDING_AUTHORITY_STATE,
    },
  },
  {
    name: "founder-like placeholder case plan receipt path without strict authority stays pending authority",
    fixture: {
      status: "diagnostic_completed",
      diagnosticContinuation: true,
      casePlanCompletedEvidence: true,
      hasReceiptPathContext: true,
      hasPilotOrCaseResultContext: true,
      legacyReceiptReadySignal: false,
      strictBackendOwnedReceiptAuthority: false,
      fixtureKind: "founder_real_case_like_placeholder",
    },
    expected: {
      hasReceiptPathContext: true,
      hasPilotOrCaseResultContext: true,
      legacyReceiptReadySignal: false,
      strictBackendOwnedReceiptAuthority: false,
      pendingReceiptAuthority: true,
      receiptReady: false,
      lifecycleState: PENDING_AUTHORITY_STATE,
      displayStatus: PENDING_AUTHORITY_STATE,
    },
    expectedNot: {
      lifecycleState: "diagnostic_completed",
      displayStatus: "Diagnostic completed",
    },
  },
  {
    name: "legacy receipt-ready hint without strict receipt authority fails closed",
    fixture: {
      status: "diagnostic_completed",
      diagnosticContinuation: true,
      casePlanCompletedEvidence: true,
      hasPilotOrCaseResultContext: true,
      legacyReceiptReadySignal: true,
      strictBackendOwnedReceiptAuthority: false,
    },
    expected: {
      receiptReady: false,
      lifecycleState: PENDING_AUTHORITY_STATE,
      displayStatus: PENDING_AUTHORITY_STATE,
    },
  },
  {
    name: "strict backend-owned receipt authority may display green receipt-ready",
    fixture: {
      status: "diagnostic_completed",
      diagnosticContinuation: true,
      casePlanCompletedEvidence: true,
      hasReceiptPathContext: true,
      hasPilotOrCaseResultContext: true,
      strictBackendOwnedReceiptAuthority: true,
    },
    expected: {
      receiptReady: true,
      lifecycleState: "receipt_ready",
      displayStatus: "Receipt ready",
    },
  },
];

check(sourceExists, "CasesPage.jsx exists");
check(
  strictReceiptAuthorityBlock.includes("hasBackendOwnedReceiptAccess(normalized)"),
  "formal UI receipt-ready authority uses hasBackendOwnedReceiptAccess(normalized)",
  strictReceiptAuthorityBlock
);
check(
  directReadyBlock === "const directBackendReceiptReady = strictBackendOwnedReceiptAuthority;",
  "directBackendReceiptReady is strict backend-owned receipt authority only",
  directReadyBlock
);
check(
  legacyReadyBlock.includes("hasCanonicalBackendReceiptReadySignal(normalized)") &&
    legacyReadyBlock.includes("normalized?.receiptEligible === true") &&
    legacyReadyBlock.includes("normalized?.caseReceiptEligible === true") &&
    legacyReadyBlock.includes('normalizeCaseText(normalized?.receiptStatus) === "ready"') &&
    legacyReadyBlock.includes('normalizeCaseText(normalized?.status) === "receipt_ready"') &&
    legacyReadyBlock.includes('normalizeCaseText(normalized?.stage) === "receipt_ready"'),
  "legacy readiness hints are retained only in the legacy diagnostic signal",
  legacyReadyBlock
);
check(
  paidBlock.includes("isBackendOwnedReceiptPaidOrActivated(normalized)") &&
    paidBlock.includes("strictBackendOwnedReceiptAuthority") &&
    paidBlock.includes("strictBackendOwnedVerificationAuthority") &&
    paidBlock.includes("isBackendReceiptPaidOrActivated(normalized)") &&
    !paidBlock.includes("normalized?.paid === true") &&
    !paidBlock.includes('normalized?.paymentStatus === "paid"'),
  "Paid display requires backend-owned paid/activated authority or strict authority paired with paid helper",
  paidBlock
);
check(
  displayStatusBlock.includes("legacyReceiptReadySignal && !receiptReady") &&
    displayStatusBlock.includes('"Result ready"'),
  "raw legacy receipt_ready status is fail-closed before displayStatus fallback",
  displayStatusBlock
);
check(
  normalizedSource.includes(`const CASE_PLAN_COMPLETED_PENDING_RECEIPT_AUTHORITY_STATE = "${PENDING_AUTHORITY_STATE}"`) &&
    normalizedSource.includes("function hasCasePlanCompletedEvidence") &&
    pendingAuthorityBlock.includes("!receiptReady") &&
    pendingAuthorityBlock.includes("!strictBackendOwnedReceiptAuthority") &&
    pendingAuthorityBlock.includes("casePlanCompletedEvidence") &&
    pendingAuthorityBlock.includes("hasReceiptPathContext") &&
    displayStatusBlock.includes("pendingReceiptAuthority") &&
    displayStatusBlock.includes("CASE_PLAN_COMPLETED_PENDING_RECEIPT_AUTHORITY_STATE"),
  "case-plan completion without strict receipt authority has explicit pending-authority lifecycle state",
  pendingAuthorityBlock
);
check(
  !normalizedSource.includes(
    "const directBackendReceiptReady = hasCanonicalBackendReceiptReadySignal(normalized) || normalized?.receiptEligible === true"
  ),
  "directBackendReceiptReady is not produced by canonical/legacy readiness shortcuts",
  directReadyBlock
);

for (const matrixCase of syntheticMatrix) {
  const actual = deriveSyntheticMatrixState(matrixCase.fixture);
  const hasObservableSynthesisKeys = SYNTHESIS_OBSERVABILITY_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(actual, key)
  );
  const matchesExpected = Object.entries(matrixCase.expected).every(
    ([key, expectedValue]) => actual[key] === expectedValue
  );
  const avoidsRejectedValues = Object.entries(matrixCase.expectedNot || {}).every(
    ([key, rejectedValue]) => actual[key] !== rejectedValue
  );
  const pass = hasObservableSynthesisKeys && matchesExpected && avoidsRejectedValues;

  check(
    pass,
    `synthetic fixture matrix: ${matrixCase.name}`,
    JSON.stringify({
      expected: matrixCase.expected,
      expectedNot: matrixCase.expectedNot || {},
      requiredObservableKeys: SYNTHESIS_OBSERVABILITY_KEYS,
      actual,
    })
  );
}

const failed = checks.filter((item) => !item.pass);

for (const item of checks) {
  const status = item.pass ? "PASS" : "FAIL";
  console.log(`${status} ${item.message}`);
  if (!item.pass && item.observed) {
    console.log(`  observed: ${item.observed}`);
  }
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} CasesPage green-card display authority checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} CasesPage green-card display authority checks passed.`
);
