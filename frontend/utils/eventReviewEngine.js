export function reviewEventEntry(entry = {}, schema = {}) {
  const hasEvidence = !!entry.evidenceText || entry.evidenceState === "present";
  const hasResponse = !!entry.responseState && entry.responseState !== "unknown";
  const hasBoundary = !!entry.boundaryState && entry.boundaryState !== "unknown";

  let structureDelta = 0;
  if (hasEvidence) structureDelta += 1;
  if (hasResponse) structureDelta += 1;
  if (hasBoundary) structureDelta += 1;

  const reviewMode =
    structureDelta >= 3 ? "receipt_ready"
    : structureDelta === 2 ? "structured_progress"
    : "summary_only";

  return {
    reviewMode,
    structureDelta,
    hasEvidence,
    hasResponse,
    hasBoundary,
    nextStepHint:
      reviewMode === "receipt_ready"
        ? "Structure is becoming review-ready."
        : reviewMode === "structured_progress"
        ? "More structured evidence may unlock receipt review."
        : "Continue logging clearer event details.",
  };
}