export function getDecisionStabilityLabel(score) {
  const numericScore = Number(score);

  if (!Number.isFinite(numericScore)) return "Decision Stability: Unstable";
  if (numericScore >= 3.5) return "Decision Stability: Stable";
  if (numericScore >= 3.0) return "Decision Stability: At Risk";
  return "Decision Stability: Unstable";
}

export function getPressureLabel(intensityLevel) {
  const numericLevel = Number(intensityLevel);

  if (numericLevel >= 4) return "High pressure - stabilization needed";
  if (numericLevel === 3) return "Moderate pressure - review recommended";
  return "Low pressure - monitor for drift";
}

export function getWeakestDimensionDisplay(weakestDimension) {
  const normalized = String(weakestDimension || "").trim().toLowerCase();
  const map = {
    authority: "Decision ownership is unclear under pressure.",
    boundary: "Ownership and approval boundaries are becoming unclear.",
    evidence: "Evidence is not yet easy to retrieve or defend.",
    coordination: "Handoffs and follow-through are where the structure is weakest.",
  };

  return (
    map[normalized] ||
    "The structure has a weak point that needs clarification before it can scale."
  );
}

export function getCustomerNextAction({
  score,
  intensityLevel,
  weakestDimension,
} = {}) {
  const normalized = String(weakestDimension || "").trim().toLowerCase();
  const numericScore = Number(score);
  const numericLevel = Number(intensityLevel);

  if (normalized === "evidence") {
    return "Consolidate evidence before presenting this decision externally.";
  }

  if (normalized === "boundary") {
    return "Clarify ownership boundaries before proceeding.";
  }

  if (normalized === "authority") {
    return "Assign decision ownership before the next approval point.";
  }

  if (normalized === "coordination") {
    return "Stabilize handoffs before adding more execution pressure.";
  }

  if (Number.isFinite(numericScore) && numericScore < 3.0) {
    return "Stabilize the structure before scaling or external exposure.";
  }

  if (Number.isFinite(numericLevel) && numericLevel >= 4) {
    return "Reduce decision pressure before expanding the workflow.";
  }

  return "Clarify the weak point before scaling this structure further.";
}
