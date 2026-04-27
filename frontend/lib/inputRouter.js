// lib/inputRouter.js
// Minimal input router for Nimclea.
// Purpose: classify a user input as CASE, EVENT, or UNCLEAR without changing UI flow.

export const INPUT_ROUTE_TYPES = {
  CASE: "case",
  CASE_SIGNAL: "case_signal",
  EVENT: "event",
  UNCLEAR: "unclear",
};

const EVENT_SIGNALS = [
  "today",
  "yesterday",
  "this morning",
  "this afternoon",
  "called",
  "emailed",
  "submitted",
  "received",
  "replied",
  "uploaded",
  "meeting",
  "followed up",
  "denied",
  "approved",
  "refused",
  "missed",
  "charged",
  "paid",
];

const CASE_SIGNALS = [
  "problem",
  "issue",
  "case",
  "situation",
  "dispute",
  "refund",
  "delay",
  "non-delivery",
  "service",
  "responsibility",
  "escalation",
  "contract",
  "policy",
];

const DIAGNOSTIC_STRUCTURE_SIGNALS = [
  "traceable",
  "not traceable",
  "approval",
  "evidence",
  "supporting evidence",
  "manual consolidation",
  "system of record",
  "spreadsheets",
  "emails",
  "folders",
  "definitions",
  "handoffs",
  "multiple systems",
  "audit",
  "verification",
  "reporting deadlines",
  "incident",
  "exception handling",
  "version of data",
];

export function normalizeInputText(input) {
  return String(input || "")
    .trim()
    .replace(/\s+/g, " ");
}

function countSignals(text, signals) {
  const lower = text.toLowerCase();
  return signals.reduce((count, signal) => {
    return lower.includes(signal) ? count + 1 : count;
  }, 0);
}

export function routeInput(input, options = {}) {
  const text = normalizeInputText(input);
  const hasActiveCase = Boolean(options.caseId || options.hasActiveCase);

  if (!text) {
    return {
      type: INPUT_ROUTE_TYPES.UNCLEAR,
      confidence: 0,
      reason: "empty_input",
      text,
    };
  }

  const eventScore = countSignals(text, EVENT_SIGNALS);
  const caseScore = countSignals(text, CASE_SIGNALS);
  const diagnosticStructureScore = countSignals(text, DIAGNOSTIC_STRUCTURE_SIGNALS);

  if (diagnosticStructureScore > 0) {
    return {
      type: INPUT_ROUTE_TYPES.CASE_SIGNAL,
      confidence: 0.82,
      reason: "diagnostic_structure_signal_detected",
      text,
    };
  }

  // Short updates inside an existing case are more likely to be events.
  if (hasActiveCase && text.length <= 280 && eventScore >= 1) {
    return {
      type: INPUT_ROUTE_TYPES.EVENT,
      confidence: 0.82,
      reason: "active_case_with_event_signal",
      text,
    };
  }

  // Longer descriptions with case/problem language are more likely to be cases.
  if (caseScore > eventScore || text.length > 280) {
    return {
      type: INPUT_ROUTE_TYPES.CASE,
      confidence: 0.76,
      reason: "case_context_detected",
      text,
    };
  }

  if (eventScore > 0) {
    return {
      type: INPUT_ROUTE_TYPES.EVENT,
      confidence: hasActiveCase ? 0.74 : 0.58,
      reason: hasActiveCase
        ? "event_signal_inside_active_case"
        : "event_signal_without_active_case",
      text,
    };
  }

  return {
    type: INPUT_ROUTE_TYPES.UNCLEAR,
    confidence: 0.45,
    reason: "insufficient_structure_signal",
    text,
  };
}

export function getInputRouterMessage(route) {
  if (!route || !route.type) {
    return "We could not classify this input yet.";
  }

  if (route.type === INPUT_ROUTE_TYPES.CASE) {
    return "This looks like a new case-level situation.";
  }

  if (route.type === INPUT_ROUTE_TYPES.EVENT) {
    return "This looks like an event that should be attached to the current case.";
  }

  if (route.type === INPUT_ROUTE_TYPES.CASE_SIGNAL) {
    return "This looks like a case signal that may belong to an existing case or a new case.";
  }

  return "This input needs a little more structure before it can be routed.";
}
