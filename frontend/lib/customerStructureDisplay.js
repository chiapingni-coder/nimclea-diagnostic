import { sanitizeText } from "./sanitizeText";

const INTERNAL_PLACEHOLDERS = new Set([
  "",
  "PAT-00",
  "Pattern not resolved",
  "RUN not resolved",
  "RUN000",
  "summary_only",
]);

export function formatWeakestDimension(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const map = {
    authority: "Authority",
    boundary: "Boundary",
    coordination: "Coordination",
    continuity: "Continuity",
    evidence: "Evidence",
    response: "Response",
  };

  return map[normalized] || "Structure signal";
}

function isResolvedDisplayValue(value) {
  const text = sanitizeText(value);
  return Boolean(text) && !INTERNAL_PLACEHOLDERS.has(text);
}

export function formatCustomerStructureValue(
  value,
  fallback = "Structure signal"
) {
  const text = sanitizeText(value);
  return isResolvedDisplayValue(text) ? text : fallback;
}

export function getCustomerStructureStatus(snapshot = {}) {
  const hasResolvedPattern =
    isResolvedDisplayValue(snapshot.pattern) ||
    isResolvedDisplayValue(snapshot.patternId);

  const hasResolvedRun =
    isResolvedDisplayValue(snapshot.runFallback) ||
    isResolvedDisplayValue(snapshot.runFallbackId) ||
    isResolvedDisplayValue(snapshot.runCode);

  if (hasResolvedPattern && hasResolvedRun) {
    return "Structure path identified";
  }

  if (snapshot.weakestDimension) {
    return "Initial structure detected";
  }

  return "Structure still forming";
}

export function getCustomerDecisionReadiness(snapshot = {}) {
  const route =
    typeof snapshot.routeDecision === "object"
      ? snapshot.routeDecision?.mode
      : snapshot.routeDecision;

  if (route === "ready_for_receipt" || route === "receipt_ready") {
    return "Ready for receipt review";
  }

  if (route === "ready_for_verification" || route === "verification_ready") {
    return "Ready for formal verification";
  }

  return "More evidence needed before formal verification";
}

export function getCustomerNextStep(snapshot = {}) {
  const weakest = String(snapshot.weakestDimension || "").trim().toLowerCase();

  if (weakest === "evidence") {
    return "Add one concrete event with evidence, response, and outcome.";
  }

  if (weakest === "response") {
    return "Add what action was taken after the event.";
  }

  if (weakest === "boundary") {
    return "Clarify what changed, what was refused, or what limit was reached.";
  }

  if (weakest === "continuity") {
    return "Add another event to show whether the pattern repeated or changed.";
  }

  return "Add one real event to strengthen the case record.";
}
