// E:\Nimclea_Products\diagnostic\frontend\lib\summaryBuffer.js

const SUMMARY_BUFFER_PREFIX = "nimclea_summary_buffer_v1:";

function safeJsonParse(raw, fallback = null) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function buildSummarySourceHash(input = "") {
  const text = String(input || "").trim();
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }

  return `SB-${Math.abs(hash).toString(16).toUpperCase()}`;
}

export function getSummaryBufferStorageKey(caseId = "default") {
  return `${SUMMARY_BUFFER_PREFIX}${caseId}`;
}

export function readSummaryBuffer(caseId = "default") {
  try {
    const raw = localStorage.getItem(getSummaryBufferStorageKey(caseId));
    return safeJsonParse(raw, null);
  } catch {
    return null;
  }
}

export function writeSummaryBuffer(caseId = "default", payload = {}) {
  try {
    localStorage.setItem(
      getSummaryBufferStorageKey(caseId),
      JSON.stringify(payload)
    );
    return true;
  } catch {
    return false;
  }
}

export function clearSummaryBuffer(caseId = "default") {
  try {
    localStorage.removeItem(getSummaryBufferStorageKey(caseId));
    return true;
  } catch {
    return false;
  }
}

/**
 * v0.1: 这里只做“轻量级结构缓存整形”
 * 不在这里重复调用大模型
 * 真正的结构提取结果由 diagnostic 返回结果提供
 */
export function createSummaryBuffer({
  caseId,
  rawInput = "",
  caseData = null,
  summaryContext = "",
  displayContext = "",
  scenarioLabel = "",
  stageLabel = "",
  runLabel = "",
  weakestDimension = "",
  topSignals = [],
  executionSummary = null,
  behavioralGroundingSummary = null,
} = {}) {
  const normalizedRawInput = String(rawInput || "").trim();
  const sourceHash = buildSummarySourceHash(normalizedRawInput);

  return {
    version: "v0.1",
    caseId: caseId || "default",
    sourceHash,
    rawInput: normalizedRawInput,

    summaryContext: String(summaryContext || "").trim(),
    displayContext: String(displayContext || "").trim(),

    structure: {
      caseData: caseData || null,
      scenarioLabel: scenarioLabel || "",
      stageLabel: stageLabel || "",
      runLabel: runLabel || "",
      weakestDimension: weakestDimension || "",
    },

    signals: {
      topSignals: Array.isArray(topSignals) ? topSignals : [],
    },

    behavior: {
      executionSummary: executionSummary || null,
      behavioralGroundingSummary: behavioralGroundingSummary || null,
    },

    cachedAt: new Date().toISOString(),
  };
}

export function shouldRebuildSummaryBuffer({
  previousBuffer = null,
  rawInput = "",
}) {
  if (!previousBuffer) return true;

  const nextHash = buildSummarySourceHash(rawInput);
  return previousBuffer.sourceHash !== nextHash;
}