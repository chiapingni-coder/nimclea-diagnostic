import { reviewEventEntry } from "./eventReviewEngine";

const PILOT_ENTRIES_KEY = "pilotEntries";

function safeNow() {
  return new Date().toISOString();
}

function buildReviewInputFromEntry(input = {}) {
  const eventInput =
    input.eventInput ||
    input.sourceInput ||
    input.rawEventInput ||
    input.input ||
    {};

  const caseData =
    input.caseSchema ||
    input.caseData ||
    input.reviewResult?.caseData ||
    null;

  return {
    evidenceText:
      eventInput.evidenceText ||
      input.evidenceText ||
      caseData?.evidenceText ||
      "",

    evidenceState:
      eventInput.evidenceState ||
      input.evidenceState ||
      caseData?.evidenceState ||
      "unknown",

    responseState:
      eventInput.responseState ||
      input.responseState ||
      caseData?.responseState ||
      "unknown",

    boundaryState:
      eventInput.boundaryState ||
      input.boundaryState ||
      caseData?.boundaryState ||
      "unknown",
  };
}

function attachEventReview(input = {}) {
  const reviewInput = buildReviewInputFromEntry(input);

  const schema =
    input.caseSchema ||
    input.caseData ||
    input.reviewResult?.caseData ||
    {};

  const generatedReview = reviewEventEntry(reviewInput, schema);

  return {
    ...input,
    reviewResult: {
      ...(input.reviewResult || input.result || {}),
      ...generatedReview,
    },
  };
}

function normalizeEventEntry(input = {}) {
  const eventInput =
    input.eventInput ||
    input.sourceInput ||
    input.rawEventInput ||
    input.input ||
    null;

  let reviewResult =
    input.reviewResult ||
    input.eventReviewResult ||
    input.result ||
    input.analysis ||
    null;

  // 🔒 强制兜底：如果没有 reviewResult，再跑一次 reviewEngine
  if (!reviewResult) {
    const fallbackInput = buildReviewInputFromEntry(input);
    const schema =
      input.caseSchema ||
      input.caseData ||
      {};

    reviewResult = reviewEventEntry(fallbackInput, schema);
  }

  const timestamp =
    input.timestamp ||
    input.createdAt ||
    input.loggedAt ||
    safeNow();

  const eventType =
    input.eventType ||
    input.type ||
    "event_review";

  const weakestDimensionSnapshot =
    input.weakestDimensionSnapshot ||
    input.weakestDimension ||
    input.caseData?.weakestDimension ||
    input.preview?.weakestDimension ||
    null;

  return {
    id:
      input.id ||
      `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,

    eventType,
    timestamp,

    eventInput,
    reviewResult,
    weakestDimensionSnapshot,

    caseSchema: input.caseSchema || null,
    eventHistory: input.eventHistory || null,

    // legacy fallback, 先保留，避免你后面旧页面白屏
    sourceInput: input.sourceInput || eventInput,
    result: input.result || reviewResult,
    weakestDimension:
      input.weakestDimension || weakestDimensionSnapshot,

    meta: input.meta || null,
  };
}

export function getPilotEntries() {
  try {
    const raw = localStorage.getItem(PILOT_ENTRIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.map((entry) => normalizeEventEntry(entry));
  } catch (error) {
    console.error("Failed to read pilot entries:", error);
    return [];
  }
}

export function appendPilotEntry(entry) {
  try {
    const existing = getPilotEntries();

    const reviewedEntry = attachEventReview(entry);
    const normalizedEntry = normalizeEventEntry(reviewedEntry);

    const next = [...existing, normalizedEntry];
    localStorage.setItem(PILOT_ENTRIES_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error("Failed to append pilot entry:", error);
    return getPilotEntries();
  }
}

export function clearPilotEntries() {
  try {
    localStorage.removeItem(PILOT_ENTRIES_KEY);
  } catch (error) {
    console.error("Failed to clear pilot entries:", error);
  }
}