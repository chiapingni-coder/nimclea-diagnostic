import {
  calculateStructureScore,
  resolveStructureStatus,
  normalizeCaseInput,
} from "./caseSchema";

function toText(value) {
  return String(value || "").trim();
}

function hasValue(value) {
  return toText(value).length > 0;
}

function normalizeEntries(entries = []) {
  return Array.isArray(entries) ? entries.filter(Boolean) : [];
}

function hasSignalPayload(topSignals = []) {
  return Array.isArray(topSignals) && topSignals.length > 0;
}

function normalizeReviewResults(reviewResults = []) {
  return Array.isArray(reviewResults) ? reviewResults.filter(Boolean) : [];
}

function normalizeEventHistory(eventHistory = []) {
  return Array.isArray(eventHistory) ? eventHistory.filter(Boolean) : [];
}

function getStructuredEventCountFromHistory(eventHistory = []) {
  const safeHistory = normalizeEventHistory(eventHistory);

  return safeHistory.filter((item) => {
    if (!item || typeof item !== "object") return false;

    return (
      item?.isStructured === true ||
      item?.structured === true ||
      item?.kind === "structured_event" ||
      item?.type === "structured_event" ||
      item?.eventType === "structured_event" ||
      item?.caseData ||
      item?.reviewResult
    );
  }).length;
}

function resolveCommercialVerificationStatus({
  failedCount = 0,
  warningCount = 0,
  receiptEligible = false,
  hasCompleteStructure = false,
  behavioralGrounding = 0,
} = {}) {
  if (failedCount >= 2) {
    return "Verification Failed";
  }

  if (
    failedCount === 1 ||
    warningCount >= 2 ||
    !hasCompleteStructure ||
    behavioralGrounding < 1
  ) {
    return receiptEligible ? "Verification Warning" : "Verification Failed";
  }

  return "Verification Ready";
}

/**
 * resolveEntriesInput keeps routeDecision as descriptive data only.
 * Downstream scoring and eligibility must not use routeDecision as gate input.
 */
function resolveEntriesInput({
  entries = [],
  eventHistory = [],
  reviewResults = [],
  caseSchema = null,
} = {}) {
  const safeEntries = normalizeEntries(entries);
  const safeHistory = normalizeEventHistory(eventHistory);
  const safeReviews = normalizeReviewResults(reviewResults);

  const reviewMap = new Map(
    safeReviews.map((item, index) => [
      item?.id || item?.reviewId || `review_${index}`,
      item,
    ])
  );

  if (safeHistory.length) {
    return safeHistory.map((item, index) => {
      const linkedReview =
        item?.reviewResult ||
        reviewMap.get(item?.reviewId) ||
        reviewMap.get(item?.id) ||
        null;

      return {
        id: item?.id || item?.eventId || `history_${index}`,
        source: "eventHistory",
        ...item,

        reviewResult: linkedReview,

        caseData:
          item?.caseData ||
          linkedReview?.caseData ||
          item?.schemaSnapshot ||
          caseSchema ||
          null,

        evidenceItems:
          item?.evidenceItems ||
          linkedReview?.evidenceItems ||
          [],

        routeDecision:
          item?.routeDecision ||
          linkedReview?.routeDecision ||
          caseSchema?.routeDecision ||
          undefined,

        structureScore:
          item?.structureScore ??
          linkedReview?.structureScore ??
          caseSchema?.structureScore ??
          undefined,

        structureStatus:
          item?.structureStatus ||
          linkedReview?.structureStatus ||
          caseSchema?.structureStatus ||
          undefined,

        weakestDimension:
          item?.weakestDimension ||
          item?.judgmentFocus ||
          linkedReview?.weakestDimension ||
          caseSchema?.weakestDimension ||
          "",

        scenarioCode:
          item?.scenarioCode ||
          linkedReview?.scenarioCode ||
          caseSchema?.scenarioCode ||
          "unknown_scenario",

        stage:
          item?.stage ||
          linkedReview?.stage ||
          caseSchema?.stage ||
          "S0",
      };
    });
  }

  if (safeReviews.length) {
    return safeReviews.map((item, index) => ({
      id: item?.id || item?.reviewId || `review_${index}`,
      source: "reviewResults",
      reviewResult: item,
      caseData: item?.caseData || caseSchema || null,
      evidenceItems: item?.evidenceItems || [],
      routeDecision:
        item?.routeDecision ||
        caseSchema?.routeDecision ||
        undefined,
      structureScore:
        item?.structureScore ??
        caseSchema?.structureScore ??
        undefined,
      structureStatus:
        item?.structureStatus ||
        caseSchema?.structureStatus ||
        undefined,
      weakestDimension:
        item?.weakestDimension ||
        caseSchema?.weakestDimension ||
        "",
      scenarioCode:
        item?.scenarioCode ||
        caseSchema?.scenarioCode ||
        "unknown_scenario",
      stage:
        item?.stage ||
        caseSchema?.stage ||
        "S0",
    }));
  }

  if (safeEntries.length) {
    return safeEntries.map((item) => ({
      ...item,
      source: item?.source || "entries",
      caseData:
        item?.caseData ||
        caseSchema ||
        null,
      routeDecision:
        item?.routeDecision ||
        caseSchema?.routeDecision ||
        undefined,
      structureScore:
        item?.structureScore ??
        caseSchema?.structureScore ??
        undefined,
      structureStatus:
        item?.structureStatus ||
        caseSchema?.structureStatus ||
        undefined,
      weakestDimension:
        item?.weakestDimension ||
        item?.judgmentFocus ||
        caseSchema?.weakestDimension ||
        "",
      scenarioCode:
        item?.scenarioCode ||
        caseSchema?.scenarioCode ||
        "unknown_scenario",
      stage:
        item?.stage ||
        caseSchema?.stage ||
        "S0",
    }));
  }

  if (caseSchema && typeof caseSchema === "object") {
    return [
      {
        id: "case_schema_only",
        source: "caseSchema",
        caseData: caseSchema,
        routeDecision: caseSchema?.routeDecision || undefined,
        structureScore: caseSchema?.structureScore ?? undefined,
        structureStatus: caseSchema?.structureStatus || undefined,
        weakestDimension: caseSchema?.weakestDimension || "",
        scenarioCode: caseSchema?.scenarioCode || "unknown_scenario",
        stage: caseSchema?.stage || "S0",
        evidenceItems: toArray(caseSchema?.evidenceItems),
      },
    ];
  }

  return [];
}

function getBestCaseSource({
  caseSchema = null,
  eventHistory = [],
  reviewResults = [],
  entries = [],
} = {}) {
  const safeHistory = normalizeEventHistory(eventHistory);
  const safeReviews = normalizeReviewResults(reviewResults);
  const safeEntries = normalizeEntries(entries);

  const historyCaseData = safeHistory
    .map(
      (item) =>
        item?.caseData ||
        item?.reviewResult?.caseData ||
        item?.schemaSnapshot
    )
    .find((item) => item && typeof item === "object");

  if (historyCaseData) {
    return historyCaseData;
  }

  const reviewCaseData = safeReviews
    .map(
      (item) =>
        item?.caseData ||
        item?.resolvedCaseData ||
        item?.schema ||
        item?.reviewResult?.caseData
    )
    .find((item) => item && typeof item === "object");

  if (reviewCaseData) {
    return reviewCaseData;
  }

  if (caseSchema && typeof caseSchema === "object") {
    return caseSchema;
  }

  const entryCaseData = safeEntries
    .map((item) => getEntryCaseData(item, null))
    .find((item) => item && typeof item === "object");

  if (entryCaseData) {
    return entryCaseData;
  }

  return null;
}

function getBehaviorMetrics(input = {}) {
  const executionSummary = input.executionSummary || {};
  const eventHistory = normalizeEventHistory(input.eventHistory);
  const reviewResults = normalizeReviewResults(input.reviewResults);

  const structuredEventsCountFromHistory =
    getStructuredEventCountFromHistory(eventHistory);

  const structuredEventsCountFromReviews = reviewResults.length;

  const structuredEventsCountFromExecution = Number(
    executionSummary.structuredEventsCount || 0
  );

  const structuredEventsCount = Number(
    structuredEventsCountFromHistory ||
      structuredEventsCountFromReviews ||
      structuredEventsCountFromExecution ||
      0
  );

  const behavioralGrounding =
    structuredEventsCount >= 3
      ? 1
      : structuredEventsCount >= 1
      ? 0.5
      : 0;

  const behavioralGroundingStatus =
    behavioralGrounding === 1
      ? "passed"
      : behavioralGrounding > 0
      ? "warning"
      : "failed";

  const groundingSource =
    structuredEventsCountFromHistory > 0
      ? "event history"
      : structuredEventsCountFromReviews > 0
      ? "review results"
      : structuredEventsCountFromExecution > 0
      ? "execution summary"
      : "none";

  const behavioralGroundingDetail =
    behavioralGrounding === 1
      ? `The receipt is supported by multiple structured real-event records from ${groundingSource}.`
      : behavioralGrounding > 0
      ? `The receipt is partially grounded in real-event records from ${groundingSource}, but the behavioral sample is still thin.`
      : "No strong behavioral grounding was detected behind this receipt.";

  return {
    structuredEventsCount,
    behavioralGrounding,
    behavioralGroundingStatus,
    behavioralGroundingDetail,
  };
}

function evaluateContinuity(entries = []) {
  const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (!safeEntries.length) return 0;

  if (safeEntries.length >= 3) return 4;
  if (safeEntries.length >= 2) return 3;
  if (safeEntries.length >= 1) return 2;
  return 0;
}

function evaluateConsistency(entries = [], fallbackCaseSchema = null) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  if (!safeEntries.length) return 0;

  const caseEntries = safeEntries.map((item) =>
    getEntryCaseData(item, fallbackCaseSchema)
  );

  const weakestSet = new Set(
    caseEntries
      .map((item) => toSafeString(item?.weakestDimension))
      .filter(Boolean)
  );

  const scenarioSet = new Set(
    caseEntries
      .map((item) => toSafeString(item?.scenarioCode))
      .filter(Boolean)
  );

  if (caseEntries.length === 1) return 2;

  let score = 1;

  if (weakestSet.size === 1) score += 1.5;
  if (scenarioSet.size <= 2) score += 1.0;
  if (safeEntries.length >= 3) score += 0.5;

  return Math.min(4, Number(score.toFixed(1)));
}

function evaluateStructureCompleteness(entries = [], fallbackCaseSchema = null) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  if (!safeEntries.length) return 0;

  const caseEntries = safeEntries.map((item) =>
    getEntryCaseData(item, fallbackCaseSchema)
  );

  const bestStructureScore = Math.max(
    ...caseEntries.map((item) => {
      const structureScore =
        typeof item?.structureScore === "number"
          ? item.structureScore
          : calculateStructureScore(item);
      return Number(structureScore) || 0;
    })
  );

  if (bestStructureScore >= 4.0) return 4;
  if (bestStructureScore >= 3.5) return 3.5;
  if (bestStructureScore >= 2.5) return 3;
  if (bestStructureScore >= 1.5) return 2;
  if (bestStructureScore > 0) return 1;
  return 0;
}

function evaluateEvidenceSupport(entries = [], fallbackCaseSchema = null) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  if (!safeEntries.length) return 0;

  const caseEntries = safeEntries.map((item) =>
    getEntryCaseData(item, fallbackCaseSchema)
  );

  const bestEvidenceCount = Math.max(
    ...caseEntries.map((item) => toArray(item?.evidenceItems).length)
  );

  if (bestEvidenceCount >= 3) return 4;
  if (bestEvidenceCount >= 2) return 3;
  if (bestEvidenceCount >= 1) return 2;
  return 0;
}

function resolveEligibilityGate({
  caseEntries = [],
  continuity = 0,
  consistency = 0,
  structureCompleteness = 0,
  evidenceSupport = 0,
  score = 0,
  summaryMode = false,
  entryCount = 0,
} = {}) {
  const bestCaseStructureScore = Math.max(
    0,
    ...caseEntries.map((item) => {
      const structureScore =
        typeof item?.structureScore === "number"
          ? item.structureScore
          : calculateStructureScore(item);
      return Number(structureScore) || 0;
    })
  );

  const bestStructureStatus =
    caseEntries
      .map(
        (item) =>
          item?.structureStatus ||
          resolveStructureStatus(item?.structureScore || 0)
      )
      .find((status) => status === "strong") ||
    caseEntries
      .map(
        (item) =>
          item?.structureStatus ||
          resolveStructureStatus(item?.structureScore || 0)
      )
      .find((status) => status === "usable") ||
    caseEntries
      .map(
        (item) =>
          item?.structureStatus ||
          resolveStructureStatus(item?.structureScore || 0)
      )
      .find((status) => status === "partial") ||
    "empty";

  const receiptEligible =
    score >= 3.5 ||
    bestCaseStructureScore >= 3.5;

  const finalReceiptEligible =
    receiptEligible &&
    continuity >= 3 &&
    consistency >= 2.5 &&
    entryCount >= 2;

  const verificationEligible = receiptEligible;

  return {
    bestCaseStructureScore,
    bestStructureStatus,
    receiptEligible,
    finalReceiptEligible: summaryMode ? finalReceiptEligible : false,
    verificationEligible,
    structureStatus:
      bestStructureStatus === "strong"
        ? "ready"
        : bestStructureStatus === "usable"
        ? "building"
        : "weak",
  };
}

export function evaluatePilotCombinationStatus({
  entries = [],
  eventHistory = [],
  reviewResults = [],
  caseSchema = null,
  summaryMode = false,
  topSignals = [],
} = {}) {
  const safeSignals = Array.isArray(topSignals) ? topSignals : [];
  const resolvedEntries = resolveEntriesInput({
    entries,
    eventHistory,
    reviewResults,
    caseSchema,
  });

  if (!resolvedEntries.length) {
    return {
      continuity: 0,
      consistency: 0,
      structureCompleteness: 0,
      evidenceSupport: 0,
      score: 0,
      structureStatus: "weak",
      receiptEligible: false,
      finalReceiptEligible: false,
      verificationEligible: false,
      reason: "No pilot entries, event history, review results, or case schema detected.",
      topSignalsCount: safeSignals.length,
    };
  }

  const caseEntries = resolvedEntries.map((item) =>
    getEntryCaseData(item, caseSchema)
  );

  const continuity = evaluateContinuity(resolvedEntries);
  const consistency = evaluateConsistency(resolvedEntries, caseSchema);
  const structureCompleteness = evaluateStructureCompleteness(
    resolvedEntries,
    caseSchema
  );
  const evidenceSupport = evaluateEvidenceSupport(resolvedEntries, caseSchema);

  const rawScore =
    continuity * 0.25 +
    consistency * 0.20 +
    structureCompleteness * 0.30 +
    evidenceSupport * 0.25;

  const score = Number(rawScore.toFixed(1));

  const gate = resolveEligibilityGate({
    caseEntries,
    continuity,
    consistency,
    structureCompleteness,
    evidenceSupport,
    score,
    summaryMode,
    entryCount: resolvedEntries.length,
  });

  return {
    continuity: Number(continuity.toFixed(1)),
    consistency: Number(consistency.toFixed(1)),
    structureCompleteness: Number(structureCompleteness.toFixed(1)),
    evidenceSupport: Number(evidenceSupport.toFixed(1)),
    score,
    structureStatus: gate.structureStatus,
    receiptEligible: gate.receiptEligible,
    finalReceiptEligible: gate.finalReceiptEligible,
    verificationEligible: gate.verificationEligible,
    reason: gate.receiptEligible
      ? "Structure is sufficient for receipt evaluation."
      : "Structure is still accumulating.",
    topSignalsCount: safeSignals.length,
  };
}

function toSafeString(value) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  return [value];
}

function toClampedNumber(value, min = 0, max = 4) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(max, Math.max(min, num));
}

function getEntryCaseData(entry = {}, fallbackCaseSchema = null) {
  const directCaseData =
    (entry?.caseData && typeof entry.caseData === "object" && entry.caseData) ||
    (entry?.reviewResult?.caseData &&
      typeof entry.reviewResult.caseData === "object" &&
      entry.reviewResult.caseData) ||
    (fallbackCaseSchema &&
      typeof fallbackCaseSchema === "object" &&
      fallbackCaseSchema) ||
    null;

  if (directCaseData) {
    return normalizeCaseInput(directCaseData, {
      source: entry?.source || "resolved_input",
    });
  }

  return normalizeCaseInput(
    {
      source: entry?.source || "pilot",
      summary:
        entry?.summaryText ||
        entry?.summaryContext ||
        entry?.description ||
        entry?.reviewResult?.summary ||
        "",
      description:
        entry?.description ||
        entry?.reviewResult?.description ||
        "",
      eventType:
        entry?.eventType ||
        entry?.type ||
        entry?.reviewResult?.eventType ||
        "other",
      eventContext:
        entry?.eventContext ||
        entry?.description ||
        entry?.reviewResult?.eventContext ||
        "",
      weakestDimension:
        entry?.judgmentFocus ||
        entry?.weakestDimension ||
        entry?.reviewResult?.weakestDimension ||
        "",
      scenarioCode:
        entry?.scenarioCode ||
        entry?.reviewResult?.scenarioCode ||
        "unknown_scenario",
      patternId:
        entry?.pattern ||
        entry?.patternId ||
        entry?.reviewResult?.patternId ||
        "",
      fallbackRunCode:
        entry?.runId ||
        entry?.reviewResult?.runId ||
        "",
      stage:
        entry?.stage ||
        entry?.reviewResult?.stage ||
        "S0",
      evidenceItems: toArray(
        entry?.evidenceItems || entry?.reviewResult?.evidenceItems
      ),
      parties: toArray(entry?.parties || entry?.reviewResult?.parties),
      dimensions: {
        evidence: entry?.judgmentFocus === "evidence" ? 1 : 2,
        authority: entry?.judgmentFocus === "authority" ? 1 : 2,
        coordination: entry?.judgmentFocus === "coordination" ? 1 : 2,
        timing: 2,
      },
      signals: {
        externalPressure: Boolean(
          entry?.externalPressure || entry?.reviewResult?.externalPressure
        ),
      },
      routeDecision:
        entry?.routeDecision ||
        entry?.reviewResult?.routeDecision ||
        undefined,
      structureScore:
        entry?.structureScore ??
        entry?.reviewResult?.structureScore ??
        undefined,
      structureStatus:
        entry?.structureStatus ||
        entry?.reviewResult?.structureStatus ||
        undefined,
    },
    { source: entry?.source || "pilot" }
  );
}

export function evaluateCaseRecordStatus(input = {}) {
  const runEntries = Array.isArray(input.runEntries) ? input.runEntries : [];
  const hasRunEntries = runEntries.length > 0;
  const hasReceiptHash = hasValue(input.receiptHash);

  const resolvedEntries = resolveEntriesInput({
    entries: input.entries || input.runEntries || [],
    eventHistory: input.eventHistory || [],
    reviewResults: input.reviewResults || [],
    caseSchema: input.caseSchema || null,
  });

  const caseData =
    input.caseData ||
    getBestCaseSource({
      caseSchema: input.caseSchema,
      eventHistory: input.eventHistory,
      reviewResults: input.reviewResults,
      entries: resolvedEntries,
    }) ||
    {};

  const resolvedCaseInput =
    caseData?.description ||
    caseData?.eventContext ||
    input.caseInput ||
    "";

  const resolvedScenario =
    caseData?.scenarioCode ||
    input.scenarioLabel ||
    "";

  const resolvedStage =
    caseData?.stage ||
    input.stageLabel ||
    "";

  const resolvedWeakestDimension =
    caseData?.weakestDimension ||
    input.weakestDimension ||
    "";

  const hasCaseInput = hasValue(resolvedCaseInput);
  const hasScenario = hasValue(resolvedScenario);
  const hasStage = hasValue(resolvedStage);
  const hasResolvedEntries = resolvedEntries.length > 0;

  const hasSignals =
    hasSignalPayload(input.topSignals) ||
    hasSignalPayload(caseData?.signals) ||
    normalizeReviewResults(input.reviewResults).some((item) =>
      hasSignalPayload(item?.signals)
    ) ||
    normalizeEventHistory(input.eventHistory).some((event) =>
      hasSignalPayload(event?.signals)
    );

  const continuityRaw = hasResolvedEntries
    ? evaluateContinuity(resolvedEntries)
    : 0;

  const consistencyRaw = hasResolvedEntries
    ? evaluateConsistency(resolvedEntries, input.caseSchema || caseData)
    : 0;

  const structureCompletenessRaw = hasResolvedEntries
    ? evaluateStructureCompleteness(
        resolvedEntries,
        input.caseSchema || caseData
      )
    : 0;

  const evidenceSupportRaw = hasResolvedEntries
    ? evaluateEvidenceSupport(resolvedEntries, input.caseSchema || caseData)
    : 0;

  const caseEntries = resolvedEntries.map((item) =>
    getEntryCaseData(item, input.caseSchema || caseData)
  );

  const continuity =
    continuityRaw >= 3 ? 1 : continuityRaw > 0 ? 0.5 : 0;

  const consistency =
    consistencyRaw >= 2.5 ? 1 : consistencyRaw > 0 ? 0.5 : 0;

  const structureCompleteness =
    structureCompletenessRaw >= 3 ? 1 : structureCompletenessRaw > 0 ? 0.5 : 0;

  const hasResolvedEvidence =
    evidenceSupportRaw > 0 || hasSignals || hasRunEntries;

  const evidenceSupport =
    hasReceiptHash && hasResolvedEvidence
      ? 1
      : hasReceiptHash || hasResolvedEvidence
      ? 0.5
      : 0;

  const {
    structuredEventsCount,
    behavioralGrounding,
    behavioralGroundingStatus,
    behavioralGroundingDetail,
  } = getBehaviorMetrics(input);

  const score =
    continuity +
    consistency +
    structureCompleteness +
    evidenceSupport +
    behavioralGrounding;

  const gate = resolveEligibilityGate({
    caseEntries,
    continuity: continuityRaw,
    consistency: consistencyRaw,
    structureCompleteness: structureCompletenessRaw,
    evidenceSupport: evidenceSupportRaw,
    score:
      continuityRaw * 0.25 +
      consistencyRaw * 0.20 +
      structureCompletenessRaw * 0.30 +
      evidenceSupportRaw * 0.25,
    summaryMode: false,
    entryCount: resolvedEntries.length,
  });

  const structureStatus = gate.structureStatus;

  const hasCompleteStructure =
    hasCaseInput &&
    hasScenario &&
    hasStage &&
    (hasResolvedEntries || hasRunEntries) &&
    structureCompletenessRaw >= 3;

  const receiptEligible = gate.receiptEligible;

  const receiptStatus =
    gate.verificationEligible
      ? "Ready for Verification"
      : gate.receiptEligible
      ? "Review with Warning"
      : "Record Incomplete";

  const checks = [
    {
      label: "Continuity",
      status: continuity === 1 ? "passed" : continuity > 0 ? "warning" : "failed",
      detail:
        continuity === 1
          ? "The record keeps a continuous path between case input and RUN aggregation."
          : continuity > 0
          ? "Part of the path is present, but the record is not yet continuous."
          : "The record does not yet show a continuous case path.",
    },
    {
      label: "Consistency",
      status: consistency === 1 ? "passed" : consistency > 0 ? "warning" : "failed",
      detail:
        consistency === 1
          ? "Scenario, stage, and RUN structure are aligned."
          : consistency > 0
          ? "Some structure is aligned, but not the full recorded path."
          : "Scenario, stage, and RUN structure are not yet aligned.",
    },
    {
      label: "Structure completeness",
      status:
        structureCompleteness === 1
          ? "passed"
          : structureCompleteness > 0
          ? "warning"
          : "failed",
      detail:
        structureCompleteness === 1
          ? "The minimum structural fields for review are complete."
          : "The record is still missing some structural fields required for strong review.",
    },
    {
      label: "Evidence support",
      status:
        evidenceSupport === 1 ? "passed" : evidenceSupport > 0 ? "warning" : "failed",
      detail:
        evidenceSupport === 1
         ? "The record is supported by receipt proof and observable signals or RUN evidence."
          : evidenceSupport > 0
          ? "Part of the support layer is present, but the proof chain is not fully complete."
          : "The support layer is missing.",
    },
    {
      label: "Behavioral grounding",
      status: behavioralGroundingStatus,
      detail: behavioralGroundingDetail,
    },
  ];

  const failedCount = checks.filter((check) => check.status === "failed").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;

  const verificationStatus = resolveCommercialVerificationStatus({
    failedCount,
    warningCount,
    receiptEligible,
    hasCompleteStructure,
    behavioralGrounding,
  });

  return {
    continuity,
    consistency,
    structureCompleteness,
    evidenceSupport,
    behavioralGrounding,
    structuredEventsCount,
    score,
    receiptEligible,
    structureStatus,
    receiptStatus,
    verificationStatus,
    hasReceiptHash,
    hasCompleteStructure,
    failedCount,
    warningCount,
    checks,

    resolvedCaseInput,
    resolvedScenario,
    resolvedStage,
    resolvedWeakestDimension,
  };
}