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

  const count = safeEntries.length;
  const latestThree = safeEntries.slice(-3);

  const uniqueEventTypes = new Set(
    latestThree
      .map((entry) =>
        toSafeString(
          entry?.eventType ||
            entry?.reviewResult?.eventType ||
            entry?.caseData?.eventType
        )
      )
      .filter(Boolean)
  ).size;

  const withNarrative = latestThree.filter((entry) => {
    const text = getEntryNarrativeSignals(entry);
    return text.length >= 20;
  }).length;

  let score = 0;

  if (count >= 1) score += 1.2;
  if (count >= 2) score += 1.0;
  if (count >= 3) score += 0.8;
  if (count >= 4) score += 0.4;

  if (withNarrative >= 1) score += 0.2;
  if (withNarrative >= 2) score += 0.2;
  if (uniqueEventTypes >= 2) score += 0.2;

  return Math.min(4, Number(score.toFixed(2)));
}

function evaluateConsistency(entries = [], fallbackCaseSchema = null) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  if (!safeEntries.length) return 0;

  const caseEntries = safeEntries.map((item) =>
    getEntryCaseData(item, fallbackCaseSchema)
  );

  const weakestValues = caseEntries
    .map((item) => toSafeString(item?.weakestDimension))
    .filter(Boolean);

  const scenarioValues = caseEntries
    .map((item) => toSafeString(item?.scenarioCode))
    .filter(Boolean);

  const stageValues = caseEntries
    .map((item) => toSafeString(item?.stage))
    .filter(Boolean);

  const weakestSet = new Set(weakestValues);
  const scenarioSet = new Set(scenarioValues);
  const stageSet = new Set(stageValues);

  const totalSamples = caseEntries.length;

  const weakestConsistency =
    weakestValues.length > 0 ? 1 / weakestSet.size : 0;

  const scenarioConsistency =
    scenarioValues.length > 0 ? 1 / scenarioSet.size : 0;

  const stageConsistency =
    stageValues.length > 0 ? 1 / stageSet.size : 0;

  const samplingBonus =
    totalSamples >= 4 ? 0.35 : totalSamples >= 3 ? 0.2 : totalSamples >= 2 ? 0.1 : 0;

  let score =
    weakestConsistency * 1.6 +
    scenarioConsistency * 1.3 +
    stageConsistency * 0.8 +
    samplingBonus;

  if (totalSamples === 1) {
    score = Math.max(score, 1.2);
  }

  return Math.min(4, Number(score.toFixed(2)));
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
    }),
    0
  );

  const coverageRatios = safeEntries.map((entry) => {
    const eventInput = entry?.eventInput || entry?.sourceInput || {};
    const reviewResult = entry?.reviewResult || {};
    const caseData = getEntryCaseData(entry, fallbackCaseSchema) || {};

    let coverage = 0;
    const maxCoverage = 7;

    if (String(entry?.eventType || reviewResult?.eventType || "").trim()) coverage += 1;
    if (String(eventInput?.externalPressure || "").trim()) coverage += 1;
    if (String(eventInput?.authorityBoundary || "").trim()) coverage += 1;
    if (String(eventInput?.dependency || "").trim()) coverage += 1;
    if (String(caseData?.scenarioCode || reviewResult?.scenarioCode || "").trim()) coverage += 1;
    if (String(caseData?.stage || reviewResult?.stage || "").trim()) coverage += 1;

    const narrativeLength = getEntryNarrativeSignals(entry, fallbackCaseSchema).length;
    if (narrativeLength >= 30) coverage += 1;

    return coverage / maxCoverage;
  });

  const bestCoverageRatio = Math.max(...coverageRatios, 0);

  const closureScores = safeEntries.map((entry) =>
    getClosureSignalScore(entry, fallbackCaseSchema)
  );

  const bestClosureScore = Math.max(...closureScores, 0);
  const avgClosureScore =
    closureScores.length > 0
      ? closureScores.reduce((sum, value) => sum + value, 0) / closureScores.length
      : 0;

  let score =
    bestStructureScore * 0.4 +
    bestCoverageRatio * 2.0 +
    bestClosureScore * 0.25 +
    avgClosureScore * 0.15;

  return Math.min(4, Number(score.toFixed(2)));
}function evaluateEvidenceSupport(entries = [], fallbackCaseSchema = null) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  if (!safeEntries.length) return 0;

  const evidenceScores = safeEntries.map((entry) => {
    const caseData = getEntryCaseData(entry, fallbackCaseSchema) || {};
    const explicitEvidenceCount = toArray(caseData?.evidenceItems).length;
    const closureSignalScore = getClosureSignalScore(entry, fallbackCaseSchema);
    const narrativeLength = getEntryNarrativeSignals(entry, fallbackCaseSchema).length;

    let score = 0;

    score += Math.min(explicitEvidenceCount, 4) * 0.75;
    score += closureSignalScore * 0.45;

    if (narrativeLength >= 40) score += 0.3;
    if (narrativeLength >= 80) score += 0.2;

    return Math.min(4, score);
  });

  const bestScore = Math.max(...evidenceScores, 0);
  const avgScore =
    evidenceScores.length > 0
      ? evidenceScores.reduce((sum, value) => sum + value, 0) / evidenceScores.length
      : 0;

  const strongEvidenceEvents = evidenceScores.filter((score) => score >= 3).length;

  let score = bestScore * 0.7 + avgScore * 0.3;

  if (strongEvidenceEvents >= 2) score += 0.2;
  if (strongEvidenceEvents >= 3) score += 0.1;

  return Math.min(4, Number(score.toFixed(2)));
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
    score >= 3.0 ||
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

  // 🧠 ComplexityScore（新加）
const complexityScore = (() => {
  const uniqueScenario = new Set(
    caseEntries.map(e => e?.scenarioCode).filter(Boolean)
  ).size;

  const uniqueStages = new Set(
    caseEntries.map(e => e?.stage).filter(Boolean)
  ).size;

  const hasCrossDimension =
    new Set(
      caseEntries.map(e => e?.weakestDimension).filter(Boolean)
    ).size >= 2;

  let score = 0;

  if (caseEntries.length >= 3) score += 1.2;
  if (caseEntries.length >= 5) score += 0.8;

  if (uniqueScenario >= 2) score += 0.8;
  if (uniqueStages >= 2) score += 0.6;

  if (hasCrossDimension) score += 0.6;

  return Math.min(4, Number(score.toFixed(2)));
})();

  const continuity = evaluateContinuity(resolvedEntries);
  const consistency = evaluateConsistency(resolvedEntries, caseSchema);
  const structureCompleteness = evaluateStructureCompleteness(
    resolvedEntries,
    caseSchema
  );
  const evidenceSupport = evaluateEvidenceSupport(resolvedEntries, caseSchema);

// 🧠 判断是否是“非证据路径”
const isNonEvidencePath =
  evidenceSupport < 1.0 &&
  structureCompleteness >= 2.5 &&
  consistency >= 2.5;

// 🧠 动态权重
const evidenceWeight = isNonEvidencePath ? 0.15 : 0.30;
const structureWeight = isNonEvidencePath ? 0.35 : 0.30;

// 🧠 主评分
let rawScore =
  continuity * 0.20 +
  consistency * 0.20 +
  structureCompleteness * structureWeight +
  evidenceSupport * evidenceWeight;

// 🧠 Complexity 补偿（核心）
const complexityBonus =
  isNonEvidencePath
    ? complexityScore * 0.25
    : complexityScore * 0.15;

rawScore += complexityBonus;

  const score = Math.min(4, Number(rawScore.toFixed(2)));

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
    continuity: Number(continuity.toFixed(2)),
    consistency: Number(consistency.toFixed(2)),
    structureCompleteness: Number(structureCompleteness.toFixed(2)),
    evidenceSupport: Number(evidenceSupport.toFixed(2)),
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

function getEntryNarrativeSignals(entry = {}, fallbackCaseSchema = null) {
  const caseData = getEntryCaseData(entry, fallbackCaseSchema) || {};
  const reviewResult = entry?.reviewResult || {};
  const eventInput = entry?.eventInput || entry?.sourceInput || {};

  const parts = [
    caseData?.summary,
    caseData?.description,
    caseData?.eventContext,
    reviewResult?.summaryText,
    reviewResult?.decision,
    eventInput?.summaryContext,
    eventInput?.description,
    entry?.description,
  ];

  return parts
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getClosureSignalScore(entry = {}, fallbackCaseSchema = null) {
  const text = getEntryNarrativeSignals(entry, fallbackCaseSchema);

  const evidenceLike =
    /photo|image|screenshot|proof|evidence|document|record|batch|trace|attached|attachment|data|details|supporting data|supporting information/i.test(
      text
    );

  const actionLike =
    /acknowledged|requested|reviewed|verified|checked|escalated|replacement|replaced|communicated|responded|offered|clarified|confirmed|submitted|initiated|provided/i.test(
      text
    );

  const closureLike =
    /resolved|issue was resolved|confirmed.*received|received the replacement|case closed|problem solved|outcome was communicated and confirmed|outcome confirmed|decision made|ownership confirmed|issue closed|completed/i.test(
      text
    );

  const strongClosureLike =
    /confirmed.*received|received the replacement|case closed|issue was resolved|problem solved|outcome was communicated and confirmed|ownership confirmed|issue closed|completed and confirmed/i.test(
      text
    );

  if (evidenceLike && actionLike && strongClosureLike) return 4;
  if (evidenceLike && actionLike && closureLike) return 3.5;
  if (actionLike && closureLike) return 3;
  if (actionLike) return 2;
  if (evidenceLike) return 1;
  return 0;
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

const inferredClosed = /resolved|completed|confirmed|closed|ownership/i.test(
  entry?.description ||
    entry?.eventContext ||
    entry?.summaryText ||
    entry?.summaryContext ||
    entry?.reviewResult?.summary ||
    ""
);

if (directCaseData) {
  return normalizeCaseInput(
    {
      ...directCaseData,

      summary:
        directCaseData?.summary ||
        entry?.summaryText ||
        entry?.summaryContext ||
        entry?.description ||
        entry?.reviewResult?.summary ||
        "",

      description:
        directCaseData?.description ||
        entry?.description ||
        entry?.reviewResult?.description ||
        "",

      eventContext:
        directCaseData?.eventContext ||
        entry?.eventContext ||
        entry?.description ||
        entry?.reviewResult?.eventContext ||
        "",

      eventType:
        inferredClosed
          ? "decision_completed"
          : directCaseData?.eventType ||
            entry?.eventType ||
            entry?.type ||
            entry?.reviewResult?.eventType ||
            "other",

      weakestDimension:
        directCaseData?.weakestDimension ||
        entry?.judgmentFocus ||
        entry?.weakestDimension ||
        entry?.reviewResult?.weakestDimension ||
        "",

      scenarioCode:
        directCaseData?.scenarioCode ||
        entry?.scenarioCode ||
        entry?.reviewResult?.scenarioCode ||
        "unknown_scenario",

      stage:
        directCaseData?.stage ||
        entry?.stage ||
        entry?.reviewResult?.stage ||
        "S0",

      evidenceItems: toArray(
        directCaseData?.evidenceItems ||
          entry?.evidenceItems ||
          entry?.reviewResult?.evidenceItems
      ),

      signals: {
        ...(directCaseData?.signals || {}),
        externalPressure:
          entry?.eventInput?.externalPressure ||
          entry?.sourceInput?.externalPressure ||
          entry?.externalPressure ||
          entry?.reviewResult?.externalPressure ||
          directCaseData?.signals?.externalPressure ||
          "",
        authorityBoundary:
          entry?.eventInput?.authorityBoundary ||
          entry?.sourceInput?.authorityBoundary ||
          entry?.authorityBoundary ||
          directCaseData?.signals?.authorityBoundary ||
          "",
        dependency:
          entry?.eventInput?.dependency ||
          entry?.sourceInput?.dependency ||
          entry?.dependency ||
          directCaseData?.signals?.dependency ||
          "",
      },

      dimensions: {
        ...(directCaseData?.dimensions || {}),
        timing:
          entry?.eventInput?.dependency ||
          entry?.sourceInput?.dependency
            ? 3
            : directCaseData?.dimensions?.timing || 2,
      },

      routeDecision:
        directCaseData?.routeDecision ||
        entry?.routeDecision ||
        entry?.reviewResult?.routeDecision ||
        undefined,

      structureScore:
        directCaseData?.structureScore ??
        entry?.structureScore ??
        entry?.reviewResult?.structureScore ??
        undefined,

      structureStatus:
        directCaseData?.structureStatus ||
        entry?.structureStatus ||
        entry?.reviewResult?.structureStatus ||
        undefined,
    },
    {
      source: entry?.source || "resolved_input",
    }
  );
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
        inferredClosed
          ? "decision_completed"
          : entry?.eventType ||
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
        evidence:
          entry?.judgmentFocus === "evidence" ? 1 : 2,
        authority:
          entry?.judgmentFocus === "authority" ? 1 : 2,
        coordination:
          entry?.judgmentFocus === "coordination" ? 1 : 2,
        timing:
          entry?.eventInput?.dependency ||
          entry?.sourceInput?.dependency
            ? 3
            : 2,
      },
  
      signals: {
        externalPressure:
          entry?.eventInput?.externalPressure ||
          entry?.sourceInput?.externalPressure ||
          entry?.externalPressure ||
          entry?.reviewResult?.externalPressure ||
          "",
        authorityBoundary:
          entry?.eventInput?.authorityBoundary ||
          entry?.sourceInput?.authorityBoundary ||
          entry?.authorityBoundary ||
          "",
        dependency:
          entry?.eventInput?.dependency ||
          entry?.sourceInput?.dependency ||
          entry?.dependency ||
          "",
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
  const receiptEligible = gate.receiptEligible;

  const hasCompleteStructure =
    hasCaseInput &&
    hasScenario &&
    hasStage &&
    (hasResolvedEntries || hasRunEntries) &&
    structureCompletenessRaw >= 3;

  const hardFail =
    !hasReceiptHash ||
    (!hasResolvedEntries && !hasRunEntries) ||
    (!hasCaseInput && !hasScenario && !hasStage);

  const checks = [
    {
      label: "Continuity",
      status:
        continuity === 1 ? "passed" : continuity > 0 ? "warning" : "failed",
      detail:
        continuity === 1
          ? "The record keeps a continuous path between case input and RUN aggregation."
          : continuity > 0
          ? "Part of the path is present, but the record is not yet continuous."
          : "The record does not yet show a continuous case path.",
    },
    {
      label: "Consistency",
      status:
        consistency === 1 ? "passed" : consistency > 0 ? "warning" : "failed",
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
          : structureCompleteness > 0
          ? "The record is partially structured, but still missing fields required for strong review."
          : "The record is still missing the structural fields required for review.",
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

  let verificationStatus = "Verification Warning";

  if (hardFail) {
    verificationStatus = "Verification Failed";
  } else if (!receiptEligible) {
    verificationStatus = "Verification Failed";
  } else if (
    hasCompleteStructure &&
    behavioralGrounding >= 1 &&
    failedCount === 0 &&
    warningCount <= 1
  ) {
    verificationStatus = "Verification Ready";
  } else {
    verificationStatus = "Verification Warning";
  }

  const receiptStatus =
    verificationStatus === "Verification Ready"
      ? "Ready for Verification"
      : verificationStatus === "Verification Warning"
      ? "Review Pending"
      : "Record Incomplete";

  const score =
    continuity +
    consistency +
    structureCompleteness +
    evidenceSupport +
    behavioralGrounding;

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