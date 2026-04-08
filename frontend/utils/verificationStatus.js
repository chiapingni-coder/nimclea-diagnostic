export function evaluateCaseRecordStatus(input = {}) {
  const hasReceiptId = !!String(input.receiptId || "").trim();
  const hasCase = !!String(input.caseInput || "").trim();
  const hasScenario = !!String(input.scenarioLabel || "").trim();
  const hasStage = !!String(input.stageLabel || "").trim();
  const hasRun =
    !!String(input.runLabel || "").trim() ||
    (Array.isArray(input.runEntries) && input.runEntries.length > 0);
  const hasSignals =
    Array.isArray(input.topSignals) && input.topSignals.length > 0;
  const hasReceiptHash = !!String(input.receiptHash || "").trim();

  const checks = [
    {
      key: "record",
      label: "Receipt and case record available",
      status: hasReceiptId || hasCase ? "passed" : "warning",
      detail:
        hasReceiptId || hasCase
          ? "The receipt and attached case context are available for verification."
          : "The case record is incomplete in this view.",
    },
    {
      key: "structure",
      label: "Scenario, stage, and case alignment",
      status: hasScenario && hasStage && hasRun ? "passed" : "warning",
      detail:
        hasScenario && hasStage && hasRun
          ? `Scenario ${input.scenarioLabel}, stage ${input.stageLabel}, and aggregated RUN structure ${
              input.runSummaryText || input.primaryRunLabel || input.runLabel
            } are aligned in the current path.`
          : "Some structure fields are missing or incomplete in the current payload.",
    },
    {
      key: "signals",
      label: "Supporting signal consistency",
      status: hasSignals ? "passed" : "warning",
      detail: hasSignals
        ? "Supporting signals are present and readable in the current record."
        : "Supporting signals are not available in the current payload.",
    },
    {
      key: "hash",
      label: "Receipt hash availability",
      status: hasReceiptHash ? "passed" : "warning",
      detail: hasReceiptHash
        ? "Receipt hash is available for traceability."
        : "Receipt hash is not available in the current payload.",
    },
  ];

  const hasFailed = checks.some((item) => item.status === "failed");
  const hasWarning = checks.some((item) => item.status === "warning");

  const verificationStatus = hasFailed
    ? "Verification Failed"
    : hasWarning
    ? "Verification Warning"
    : "Verification Ready";

  const receiptStatus = hasFailed
    ? "Record Incomplete"
    : hasWarning
    ? "Review Pending"
    : "Ready for Verification";

  return {
    checks,
    verificationStatus,
    receiptStatus,
    hasReceiptHash,
    hasCompleteStructure: hasScenario && hasStage && hasRun,
    reviewReady: !hasFailed && !hasWarning,
  };
}