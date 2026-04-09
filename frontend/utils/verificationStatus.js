function toText(value) {
  return String(value || "").trim();
}

function hasValue(value) {
  return toText(value).length > 0;
}

function normalizeEntries(entries = []) {
  return Array.isArray(entries) ? entries.filter(Boolean) : [];
}

function isStructuredEntry(entry = {}) {
  const hasDescription = hasValue(entry.description);
  const hasEventType = hasValue(entry.eventType);
  const hasPressure = hasValue(entry.externalPressure);
  const hasBoundary = hasValue(entry.authorityBoundary);
  const hasDependency = hasValue(entry.dependency);

  if (
    !hasDescription ||
    !hasEventType ||
    !hasPressure ||
    !hasBoundary ||
    !hasDependency
  ) {
    return false;
  }

  const eventMeaningful = entry.eventType !== "other";
  const pressureQualified =
    entry.externalPressure === "medium" || entry.externalPressure === "high";
  const boundaryQualified =
    entry.authorityBoundary === "slightly unclear" ||
    entry.authorityBoundary === "unclear";
  const dependencyQualified =
    entry.dependency === "medium" || entry.dependency === "high";

  const descriptionText = toText(entry.description).toLowerCase();
  const isMeaninglessDescription =
    descriptionText.includes("nothing significant") ||
    descriptionText.includes("just checking") ||
    descriptionText.includes("test") ||
    descriptionText.includes("no real issue");

  const structuralSignalCount = [
    pressureQualified,
    boundaryQualified,
    dependencyQualified,
  ].filter(Boolean).length;

  return (
    eventMeaningful &&
    !isMeaninglessDescription &&
    structuralSignalCount >= 2
  );
}

function countStructuredEntries(entries = []) {
  return normalizeEntries(entries).filter(isStructuredEntry).length;
}

function hasSignalPayload(topSignals = []) {
  return Array.isArray(topSignals) && topSignals.length > 0;
}

function computePilotMetrics(input = {}) {
  const entries = normalizeEntries(input.entries || input.pilotEntries || []);
  const qualifiedEntries = entries.filter(isStructuredEntry);
  const qualifiedCount = qualifiedEntries.length;
  const totalEntries = entries.length;

  const latestEntry = entries.length ? entries[entries.length - 1] : null;
  const latestEntryQualified = latestEntry ? isStructuredEntry(latestEntry) : false;

  const continuity =
    qualifiedCount >= 3 ? 1 : qualifiedCount >= 1 ? 0.5 : 0;

  const consistency =
    qualifiedCount === 0
      ? 0
      : qualifiedCount === totalEntries
      ? 1
      : 0.5;

  const structureCompleteness =
    qualifiedCount >= 3 ? 1 : qualifiedCount >= 1 ? 0.5 : 0;

  const evidenceSupport =
    qualifiedCount >= 3
      ? 1
      : qualifiedCount >= 1
      ? 0.5
      : 0;

  const score =
    continuity + consistency + structureCompleteness + evidenceSupport;

  const receiptEligible = latestEntryQualified;
  const finalReceiptEligible = qualifiedCount >= 3;

  let structureStatus = "not_set";
  if (score >= 3.5) {
    structureStatus = "pilot_complete";
  } else if (score >= 2) {
    structureStatus = "emerging";
  } else if (score > 0) {
    structureStatus = "insufficient";
  }

  return {
    continuity,
    consistency,
    structureCompleteness,
    evidenceSupport,
    score,
    receiptEligible,
    finalReceiptEligible,
    structureStatus,
    totalEntries,
    structuredCount: qualifiedCount,
    qualifiedCount,
  };
}

export function evaluatePilotCombinationStatus(input = {}) {
  const metrics = computePilotMetrics(input);

  const canGenerateCaseReceipt = metrics.receiptEligible;
  const canGenerateFinalReceipt =
    input.summaryMode === true
      ? metrics.finalReceiptEligible
      : false;

  const weeklySummaryStatus =
    metrics.totalEntries === 0
      ? "empty"
      : metrics.finalReceiptEligible
      ? "ready"
      : "collecting";

  return {
    ...metrics,
    canGenerateCaseReceipt,
    canGenerateFinalReceipt,
    weeklySummaryStatus,
  };
}

export function evaluateCaseRecordStatus(input = {}) {
  const runEntries = Array.isArray(input.runEntries) ? input.runEntries : [];
  const hasRunEntries = runEntries.length > 0;
  const hasReceiptHash = hasValue(input.receiptHash);
  const hasCaseInput = hasValue(input.caseInput);
  const hasScenario = hasValue(input.scenarioLabel);
  const hasStage = hasValue(input.stageLabel);
  const hasSignals = hasSignalPayload(input.topSignals);

  const continuity =
    hasRunEntries && hasCaseInput ? 1 : hasRunEntries || hasCaseInput ? 0.5 : 0;

  const consistency =
    hasScenario && hasStage && hasRunEntries ? 1 : hasScenario || hasStage ? 0.5 : 0;

  const structureCompleteness =
    hasCaseInput && hasScenario && hasStage && hasRunEntries
      ? 1
      : hasCaseInput || hasScenario || hasStage || hasRunEntries
      ? 0.5
      : 0;

  const evidenceSupport =
    hasReceiptHash && hasSignals ? 1 : hasReceiptHash || hasSignals ? 0.5 : 0;

  const score =
    continuity + consistency + structureCompleteness + evidenceSupport;

  let structureStatus = "not_set";
  if (score >= 3.5) {
    structureStatus = "pilot_complete";
  } else if (score >= 2) {
    structureStatus = "emerging";
  } else if (score > 0) {
    structureStatus = "insufficient";
  }

  const hasCompleteStructure =
    hasCaseInput && hasScenario && hasStage && hasRunEntries;

  const receiptEligible = score >= 2;
  const receiptStatus = receiptEligible
    ? "Ready for Verification"
    : "Record Incomplete";

  const verificationStatus =
    hasCompleteStructure && hasReceiptHash
      ? "Verification Ready"
      : hasCompleteStructure || hasReceiptHash
      ? "Verification Warning"
      : "Verification Failed";

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
          ? "Receipt hash and supporting signals are both present."
          : evidenceSupport > 0
          ? "Part of the support layer is present, but the proof chain is not fully complete."
          : "The support layer is missing.",
    },
  ];

  return {
    continuity,
    consistency,
    structureCompleteness,
    evidenceSupport,
    score,
    receiptEligible,
    structureStatus,
    receiptStatus,
    verificationStatus,
    hasReceiptHash,
    hasCompleteStructure,
    checks,
  };
}