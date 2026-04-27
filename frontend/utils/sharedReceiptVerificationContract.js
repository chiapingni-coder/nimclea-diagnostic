// sharedReceiptVerificationContract.js

/**
 * sharedReceiptVerificationContract.js
 *
 * Eligibility Single Source of Truth
 * ----------------------------------
 * Only the following exported fields may be used for gating:
 * - resolvedReceiptEligible
 * - resolvedVerificationEligible
 *
 * Allowed gate inputs inside this contract:
 * - scoring.totalScore
 * - scoring.receiptThreshold
 * - verification.status / verification.level
 *
 * Descriptive-only fields:
 * - structureStatusFromCase
 * - structureStatus
 * - routeDecision.mode
 * - routeDecision.reason
 * - routeDecision.label
 *
 * Legacy / debug-only fields:
 * - resolvedFinalReceiptEligible
 * - runtimeState.*
 * - any page-local eligibility booleans reconstructed outside this contract
 *
 * Rules:
 * 1) Pages must read resolvedReceiptEligible directly for Receipt gating.
 * 2) Pages must read resolvedVerificationEligible directly for Verification gating.
 * 3) routeDecision.* is for UI routing / explanation only, never for true gating.
 * 4) structureStatusFromCase is descriptive-only and must never reopen a second gate.
 * 5) Eligibility is resolved inside createSharedReceiptVerificationContract(), never page-local.
 */

export const SHARED_RECEIPT_VERIFICATION_CONTRACT_VERSION = "v1.1";

/**
 * Shared payload contract for:
 * - ReceiptPage
 * - VerificationPage
 *
 * Design goal:
 * 1. Keep one shared structural core
 * 2. Allow page-specific subtrees
 * 3. Preserve backward compatibility with current field names
 */

export const SHARED_RECEIPT_VERIFICATION_DEFAULTS = {
  contractVersion: SHARED_RECEIPT_VERIFICATION_CONTRACT_VERSION,

  resolvedReceiptEligible: false,
  resolvedVerificationEligible: false,

  identity: {
    receiptId: "RCPT-DEMO-001",
    receiptHash: "",
    generatedAt: "",
    verifiedAt: "",
    receiptSource: "",
  },

  structure: {
    caseData: null,
    schemaVersion: null,
    structureScoreFromCase: null,
    structureStatusFromCase: null,
    routeDecisionFromCase: null,

    scenarioLabel: "No Dominant Scenario",
    stageLabel: "S0",
    runLabel: "RUN000",
    weakestDimension: "",
  },

  runAggregation: {
    runEntries: [],
    totalRunHits: 0,
    primaryRunLabel: "RUN000",
    runSummaryText: "",
  },

  behavior: {
    executionSummary: {
      totalEvents: 0,
      structuredEventsCount: 0,
      latestEventType: "other",
      latestEventLabel: "No recorded structural event",
      latestEventDescription: "",
      mainObservedShift: "No behavioral shift recorded yet.",
      nextCalibrationAction: "Record one real workflow event to begin calibration.",
      behaviorStatus: "behavior_weak",
    },

    behavioralGroundingSummary: {
      groundingStatus: "",
      groundingLabel: "",
      groundingNote: "",
      groundingScore: null,
    },
  },

  signals: {
    topSignals: [],
  },

  summaryBuffer: {
    version: "v0.1",
    caseId: "",
    sourceHash: "",
    rawInput: "",
    summaryContext: "",
    displayContext: "",
    cachedAt: "",
  },

  narrative: {
    title: "",
    summary: "",
    note: "",
  },

  receipt: {
    confidenceLabel: "High",
    nextStepTitle: "Recommended Next Step",
    nextStepText:
      "Proceed to verification to confirm whether this aggregated RUN record can be checked consistently across the final output, proof, and receipt.",
    verificationCtaText: "Proceed to Verification",
    decisionStatus: "Ready for Verification",
  },

  verification: {
    verificationTitle: "Structure Proof Verification",
    introText:
      "This page shows whether the receipt, supporting structure, and final output can be checked consistently. It is designed to make the record easier to trust, review, and carry forward.",
    finalNote:
      "Verification confirms whether the current receipt and supporting output are consistent and reviewable. It does not replace legal, compliance, or professional review.",
    backToReceiptText: "Back to Decision Receipt",
    checks: [],
    eventTimeline: [],
    overallStatus: "Ready for Review",
  },

  scoring: {
    scoringVersion: "v1",
    evidenceScore: 0,
    structureScore: 0,
    consistencyScore: 0,
    continuityScore: 0,
    totalScore: 0,
    receiptThreshold: 3.5,
    receiptEligible: false,
    complexityScore: 0,
    complexityLabel: "Low",
    complexityNote: "",
  },
};

function buildChecksFromCaseSchema(input = {}) {
  const parties = input.caseData?.parties || [];
  const actions = input.caseData?.actions || [];
  const evidence = input.caseData?.evidenceItems || [];

  return [
    {
      id: "evidence",
      label: "Evidence linkage",
      status: evidence.length > 0 ? "passed" : "failed",
    },
    {
      id: "structure",
      label: "Structure completeness",
      status:
        parties.length > 0 && actions.length > 0
          ? "passed"
          : "warning",
    },
    {
      id: "traceability",
      label: "Traceability",
      status:
        parties.length > 0 &&
        actions.length > 0 &&
        evidence.length > 0
          ? "passed"
          : "failed",
    },
  ];
}

function resolveVerificationStatusFromChecks(checks = []) {
  const hasFailed = checks.some((c) => c.status === "failed");
  const hasWarning = checks.some((c) => c.status === "warning");
  const allPassed =
    checks.length > 0 &&
    checks.every((c) => c.status === "passed");

  if (hasFailed) {
    return "Verification Failed";
  }

  if (!allPassed || hasWarning) {
    return "Verification Warning";
  }

  return "Verification Ready";
}

function resolveReceiptEligible(scoring = {}) {
  const totalScore = Number(scoring?.totalScore ?? 0);
  const receiptThreshold = Number(scoring?.receiptThreshold ?? 3.5);

  return totalScore >= receiptThreshold;
}

function buildConsistencyCheckFromContract(contract = {}) {
  const conflicts = [];

  const weakestDimension = String(
    contract?.structure?.weakestDimension || ""
  ).toLowerCase();

  const routeDecision = String(
    contract?.structure?.routeDecisionFromCase?.mode ||
      contract?.structure?.routeDecisionFromCase ||
      ""
  ).toLowerCase();

  const receiptHash = String(contract?.identity?.receiptHash || "").trim();

  const structureScore =
    typeof contract?.structure?.structureScoreFromCase === "number"
      ? contract.structure.structureScoreFromCase
      : null;

  const groundingStatus = String(
    contract?.behavior?.behavioralGroundingSummary?.groundingStatus || ""
  ).toLowerCase();

  if (weakestDimension === "authority" && routeDecision.includes("verification")) {
    conflicts.push({
      code: "authority_action_mismatch",
      label: "Authority does not yet support the current verification scope.",
      severity: "high",
      fix: "Clarify decision authority or reduce the current action scope before re-submission.",
    });
  }

  if (weakestDimension === "evidence" && !receiptHash) {
    conflicts.push({
      code: "evidence_chain_gap",
      label: "Evidence support is not strong enough for formal verification.",
      severity: "high",
      fix: "Add one traceable proof item or restore the missing receipt proof chain.",
    });
  }

  if (
    structureScore !== null &&
    structureScore < 3 &&
    routeDecision.includes("verification")
  ) {
    conflicts.push({
      code: "structure_outcome_gap",
      label: "The current structural baseline is too weak for the requested verification outcome.",
      severity: "medium",
      fix: "Repair the weakest structural segment before requesting formal verification again.",
    });
  }

  if (
    groundingStatus &&
    groundingStatus !== "grounded" &&
    groundingStatus !== "passed"
  ) {
    conflicts.push({
      code: "behavioral_grounding_gap",
      label: "Behavioral grounding is not yet stable enough to support this record.",
      severity: "medium",
      fix: "Add one real behavioral event or grounding signal before re-running verification.",
    });
  }

  return {
    passed: conflicts.length === 0,
    conflicts,
    minimalRepair: conflicts[0]
      ? {
          code: conflicts[0].code,
          label: conflicts[0].label,
          action: conflicts[0].fix,
        }
      : null,
  };
}

function resolveVerificationEligible(verification = {}) {
  const status = String(
  resolveVerificationStatusFromChecks(verification?.checks || [])
).toLowerCase();

  return (
    status.includes("ready") ||
    status.includes("pass") ||
    status.includes("verified")
  );
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base;
  }

  if (!isPlainObject(base)) {
    return override !== undefined ? override : base;
  }

  const result = { ...base };
  const overrideObject = isPlainObject(override) ? override : {};

  for (const key of Object.keys(overrideObject)) {
    const baseValue = base[key];
    const overrideValue = overrideObject[key];

    if (Array.isArray(baseValue)) {
      result[key] = Array.isArray(overrideValue) ? overrideValue : baseValue;
      continue;
    }

    if (isPlainObject(baseValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
      continue;
    }

    result[key] = overrideValue !== undefined ? overrideValue : baseValue;
  }

  return result;
}

/**
 * Normalize any partial contract payload into the full shared contract shape.
 */
export function createSharedReceiptVerificationContract(partial = {}) {
  const merged = deepMerge(SHARED_RECEIPT_VERIFICATION_DEFAULTS, {
    contractVersion: SHARED_RECEIPT_VERIFICATION_CONTRACT_VERSION,
    ...partial,
  });

  const resolvedReceiptEligible = resolveReceiptEligible(merged.scoring);

  const normalizedChecks =
    Array.isArray(merged.verification?.checks) &&
    merged.verification.checks.length > 0
      ? merged.verification.checks
      : buildChecksFromCaseSchema({
          caseData: merged.structure?.caseData || null,
        });

  const verificationOverallStatus = resolveVerificationStatusFromChecks(
    normalizedChecks
  );

  const mergedWithDerivedVerification = {
    ...merged,
    verification: {
      ...merged.verification,
      checks: normalizedChecks,
      overallStatus: verificationOverallStatus,
    },
  };

  const consistencyCheck =
    partial.consistencyCheck &&
    typeof partial.consistencyCheck === "object"
      ? partial.consistencyCheck
      : buildConsistencyCheckFromContract(mergedWithDerivedVerification);

  const verificationEligibleFromChecks = resolveVerificationEligible({
    ...mergedWithDerivedVerification.verification,
    checks: normalizedChecks,
  });

  const resolvedVerificationEligible =
    verificationEligibleFromChecks && consistencyCheck.passed;

  return {
    ...mergedWithDerivedVerification,
    consistencyCheck,
    resolvedReceiptEligible,
    resolvedVerificationEligible,
  };
}

/**
 * Backward-compatible flatten helper.
 * Lets old pages keep reading familiar top-level fields during migration.
 */
export function flattenSharedReceiptVerificationContract(contract = {}) {
  const normalized = createSharedReceiptVerificationContract(contract);

  return {
    contractVersion: normalized.contractVersion,
    resolvedReceiptEligible: normalized.resolvedReceiptEligible,
    resolvedVerificationEligible: normalized.resolvedVerificationEligible,
    consistencyCheck: normalized.consistencyCheck,

    // identity
    receiptId: normalized.identity.receiptId,
    receiptHash: normalized.identity.receiptHash,
    generatedAt: normalized.identity.generatedAt,
    verifiedAt: normalized.identity.verifiedAt,
    receiptSource: normalized.identity.receiptSource,

    // structure
    caseData: normalized.structure.caseData,
    schemaVersion: normalized.structure.schemaVersion,
    structureScoreFromCase: normalized.structure.structureScoreFromCase,
    structureStatusFromCase: normalized.structure.structureStatusFromCase,
    routeDecisionFromCase: normalized.structure.routeDecisionFromCase,
    scenarioLabel: normalized.structure.scenarioLabel,
    stageLabel: normalized.structure.stageLabel,
    runLabel: normalized.structure.runLabel,
    weakestDimension: normalized.structure.weakestDimension,

    // run aggregation
    runEntries: normalized.runAggregation.runEntries,
    totalRunHits: normalized.runAggregation.totalRunHits,
    primaryRunLabel: normalized.runAggregation.primaryRunLabel,
    runSummaryText: normalized.runAggregation.runSummaryText,

    // behavior
    executionSummary: normalized.behavior.executionSummary,
    behavioralGroundingSummary: normalized.behavior.behavioralGroundingSummary,

    // signals
    topSignals: normalized.signals.topSignals,

    // summary buffer
    summaryBuffer: normalized.summaryBuffer,
    summaryBufferVersion: normalized.summaryBuffer.version,
    summaryBufferCaseId: normalized.summaryBuffer.caseId,
    summaryBufferSourceHash: normalized.summaryBuffer.sourceHash,
    summaryContext: normalized.summaryBuffer.summaryContext,
    displayContext: normalized.summaryBuffer.displayContext,
    summaryBufferCachedAt: normalized.summaryBuffer.cachedAt,

    // narrative
    summaryTitle: normalized.narrative.title,
    summaryText: normalized.narrative.summary,
    receiptNote: normalized.narrative.note,

    // receipt subtree
    confidenceLabel: normalized.receipt.confidenceLabel,
    nextStepTitle: normalized.receipt.nextStepTitle,
    nextStepText: normalized.receipt.nextStepText,
    verificationCtaText: normalized.receipt.verificationCtaText,
    decisionStatus: normalized.receipt.decisionStatus,

    // verification subtree
    verificationTitle: normalized.verification.verificationTitle,
    introText: normalized.verification.introText,
    finalNote: normalized.verification.finalNote,
    backToReceiptText: normalized.verification.backToReceiptText,
    checks: normalized.verification.checks,
    eventTimeline: normalized.verification.eventTimeline,
    overallStatus: normalized.verification.overallStatus,

    // scoring
    scoringVersion: normalized.scoring.scoringVersion,
    evidenceScore: normalized.scoring.evidenceScore,
    structureScore: normalized.scoring.structureScore,
    consistencyScore: normalized.scoring.consistencyScore,
    continuityScore: normalized.scoring.continuityScore,
    totalScore: normalized.scoring.totalScore,
    // legacy-only: do not use receiptEligible for true gating on pages
    receiptThreshold: normalized.scoring.receiptThreshold,
    receiptEligible: normalized.scoring.receiptEligible,
    complexityScore: normalized.scoring.complexityScore,
    complexityLabel: normalized.scoring.complexityLabel,
    complexityNote: normalized.scoring.complexityNote,

    // full subtrees
    identity: normalized.identity,
    structure: normalized.structure,
    runAggregation: normalized.runAggregation,
    behavior: normalized.behavior,
    signals: normalized.signals,
    summaryBuffer: normalized.summaryBuffer,
    narrative: normalized.narrative,
    receipt: normalized.receipt,
    verification: normalized.verification,
    scoring: normalized.scoring,
  };
}

/**
 * ReceiptPage adapter:
 * maps current ReceiptPage-style fields into shared contract.
 */
export function buildReceiptContract(input = {}) {
  return createSharedReceiptVerificationContract({
    identity: {
      receiptId: input.receiptId,
      receiptHash: input.receiptHash,
      generatedAt: input.generatedAt,
      verifiedAt: input.verifiedAt,
      receiptSource: input.receiptSource,
    },

    structure: {
      caseData: input.caseData,
      schemaVersion: input.schemaVersion,
      structureScoreFromCase: input.structureScoreFromCase,
      structureStatusFromCase: input.structureStatusFromCase,
      routeDecisionFromCase: input.routeDecisionFromCase,
      scenarioLabel: input.scenarioLabel,
      stageLabel: input.stageLabel,
      runLabel: input.runLabel,
      weakestDimension:
        input.weakestDimension || input.caseData?.weakestDimension || "",
    },

    runAggregation: {
      runEntries: input.runEntries,
      totalRunHits: input.totalRunHits,
      primaryRunLabel: input.primaryRunLabel,
      runSummaryText: input.runSummaryText,
    },

    behavior: {
      executionSummary: input.executionSummary,
      behavioralGroundingSummary: input.behavioralGroundingSummary,
    },

    signals: {
      topSignals: input.topSignals,
    },

    summaryBuffer: input.summaryBuffer || {
      version: "v0.1",
      caseId: input.caseId || "",
      sourceHash: "",
      rawInput: input.rawInput || "",
      summaryContext: input.summaryContext || input.summaryText || "",
      displayContext: input.displayContext || input.summaryText || "",
      cachedAt: "",
    },

    narrative: {
      title: input.summaryTitle || input.receiptTitle,
      summary: input.summaryText,
      note: input.receiptNote,
    },

    receipt: {
      confidenceLabel: input.confidenceLabel,
      nextStepTitle: input.nextStepTitle,
      nextStepText: input.nextStepText,
      verificationCtaText: input.verificationCtaText,
      decisionStatus: input.decisionStatus,
    },

    verification: {
      verificationTitle: input.verificationTitle,
      introText: input.introText,
      finalNote: input.finalNote,
      backToReceiptText: input.backToReceiptText,
      checks: input.checks,
      eventTimeline: input.eventTimeline,
      overallStatus: input.overallStatus,
    },

    scoring: {
      scoringVersion: input.scoringVersion,
      evidenceScore: input.evidenceScore,
      structureScore: input.structureScore,
      consistencyScore: input.consistencyScore,
      continuityScore: input.continuityScore,
      totalScore: input.totalScore,
      receiptThreshold: input.receiptThreshold,
      receiptEligible: input.receiptEligible,
      complexityScore: input.complexityScore,
      complexityLabel: input.complexityLabel,
      complexityNote: input.complexityNote,
    },
  });
}

/**
 * VerificationPage adapter:
 * maps current VerificationPage-style fields into shared contract.
 */
export function buildVerificationContract(input = {}) {
  return createSharedReceiptVerificationContract({
    identity: {
      receiptId: input.receiptId,
      receiptHash: input.receiptHash,
      generatedAt: input.generatedAt,
      verifiedAt: input.verifiedAt,
      receiptSource: input.receiptSource,
    },

    structure: {
      caseData: input.caseData,
      schemaVersion: input.schemaVersion,
      structureScoreFromCase: input.structureScoreFromCase,
      structureStatusFromCase: input.structureStatusFromCase,
      routeDecisionFromCase: input.routeDecisionFromCase,
      scenarioLabel: input.scenarioLabel,
      stageLabel: input.stageLabel,
      runLabel: input.runLabel,
      weakestDimension: input.weakestDimension,
    },

    runAggregation: {
      runEntries: input.runEntries,
      totalRunHits: input.totalRunHits,
      primaryRunLabel: input.primaryRunLabel,
      runSummaryText: input.runSummaryText,
    },

    behavior: {
      executionSummary: input.executionSummary,
      behavioralGroundingSummary: input.behavioralGroundingSummary,
    },

    signals: {
      topSignals: input.topSignals,
    },

    summaryBuffer: input.summaryBuffer || {
      version: "v0.1",
      caseId: input.caseId || "",
      sourceHash: "",
      rawInput: input.rawInput || "",
      summaryContext: input.summaryContext || input.summaryText || "",
      displayContext: input.displayContext || input.summaryText || "",
      cachedAt: "",
    },

    narrative: {
      title: input.summaryTitle || input.verificationTitle,
      summary: input.summaryText || input.introText,
      note: input.receiptNote || "",
    },

    receipt: {
      confidenceLabel: input.confidenceLabel,
      nextStepTitle: input.nextStepTitle,
      nextStepText: input.nextStepText,
      verificationCtaText: input.verificationCtaText,
      decisionStatus: input.decisionStatus,
    },

    verification: {
      verificationTitle: input.verificationTitle,
      introText: input.introText,
      finalNote: input.finalNote,
      backToReceiptText: input.backToReceiptText,
      checks: buildChecksFromCaseSchema(input),
      eventTimeline: input.eventTimeline,
      overallStatus: input.overallStatus,
    },

    scoring: {
      scoringVersion: input.scoringVersion,
      evidenceScore: input.evidenceScore,
      structureScore: input.structureScore,
      consistencyScore: input.consistencyScore,
      continuityScore: input.continuityScore,
      totalScore: input.totalScore,
      receiptThreshold: input.receiptThreshold,
      receiptEligible: input.receiptEligible,
      complexityScore: input.complexityScore,
      complexityLabel: input.complexityLabel,
      complexityNote: input.complexityNote,
    },
  });
}

/**
 * Useful for validation during migration.
 */
export function hasSharedReceiptVerificationMinimum(contract = {}) {
  const normalized = createSharedReceiptVerificationContract(contract);

  return Boolean(
    normalized.identity.receiptId &&
      normalized.structure &&
      normalized.behavior &&
      normalized.runAggregation
  );
}