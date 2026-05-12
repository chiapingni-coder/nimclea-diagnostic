export function normalizePaymentStatus(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function getPaymentStatusRank(value = "") {
  const ranks = {
    "": 0,
    unpaid: 1,
    checkout_created: 2,
    paid: 3,
  };

  return ranks[normalizePaymentStatus(value)] ?? 0;
}

export function getEffectivePaymentStatus(record = {}) {
  const candidates = [
    record?.paymentStatus,
    record?.payment_status,
    record?.receiptInput?.paymentStatus,
    record?.receiptInput?.payment_status,
    record?.caseSnapshot?.receiptInput?.paymentStatus,
    record?.caseSnapshot?.receiptInput?.payment_status,
  ];

  return candidates.reduce((strongest, value) => {
    return getPaymentStatusRank(value) > getPaymentStatusRank(strongest)
      ? normalizePaymentStatus(value)
      : strongest;
  }, "");
}

export function pickStrongestPaymentStatus(...values) {
  return values.reduce((strongest, value) => {
    return getPaymentStatusRank(value) > getPaymentStatusRank(strongest)
      ? normalizePaymentStatus(value)
      : strongest;
  }, "");
}

export function normalizeReceiptStatus(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function getReceiptStatusRank(value = "") {
  const ranks = {
    "": 0,
    ready: 1,
    paid: 2,
    activated: 3,
    issued: 4,
  };

  return ranks[normalizeReceiptStatus(value)] ?? 0;
}

export function pickStrongestReceiptStatus(...values) {
  return values.reduce((strongest, value) => {
    return getReceiptStatusRank(value) > getReceiptStatusRank(strongest)
      ? normalizeReceiptStatus(value)
      : strongest;
  }, "");
}

export function normalizeStageValue(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^status:\s*/, "");

  if (!normalized) return "";
  if (normalized.includes("event captured")) return "event_captured";
  if (normalized === "receipt ready") return "receipt_ready";
  if (normalized === "paid") return "paid";
  if (normalized === "verified") return "verified";

  return normalized.replace(/\s+/g, "_");
}

export function stageRank(value) {
  const ranks = {
    draft: 0,
    diagnostic_completed: 1,
    result_ready: 2,
    event_captured: 3,
    receipt_ready: 4,
    receipt_issued: 5,
    paid: 6,
    verification_ready: 7,
    verified: 8,
  };

  const normalized = normalizeStageValue(value);
  return Object.prototype.hasOwnProperty.call(ranks, normalized)
    ? ranks[normalized]
    : -1;
}

export function pickHigherStage(...values) {
  return values.reduce((best, value) => {
    const normalized = normalizeStageValue(value);
    return stageRank(normalized) > stageRank(best) ? normalized : best;
  }, "");
}

export function getCaseEventDedupeKey(event = {}) {
  return (
    event.eventId ||
    event.id ||
    event.meta?.quickCaptureId ||
    `${event.caseId || event.meta?.caseId || event.body?.caseId || ""}:${
      event.eventType || event.type || ""
    }:${event.createdAt || event.timestamp || ""}:${event.meta?.note || event.note || ""}`
  );
}

export function mergeCaseEvents(...eventGroups) {
  const eventMap = new Map();

  eventGroups.forEach((events) => {
    (Array.isArray(events) ? events : []).forEach((event) => {
      if (!event || typeof event !== "object") return;

      const key = getCaseEventDedupeKey(event);

      if (!eventMap.has(key)) {
        eventMap.set(key, event);
      }
    });
  });

  return Array.from(eventMap.values());
}

export function deriveMergedCaseEventCount(baseCase = {}, receiptCase = {}, mergedEvents = []) {
  return Math.max(
    Number(baseCase?.eventCount || 0),
    Number(receiptCase?.eventCount || 0),
    mergedEvents.length
  );
}

export function normalizeRecordSource(record = {}) {
  return String(record?.source || record?.caseRecord?.source || "")
    .trim()
    .toLowerCase();
}

export function getRecordRichnessScore(record = {}) {
  const eventCount = Number(record?.eventCount || 0);
  const stage = String(record?.stage || record?.status || "").trim().toLowerCase();
  const currentStep = String(record?.currentStep || "").trim().toLowerCase();
  const source = normalizeRecordSource(record);
  const receiptEligibleScore = record?.receiptEligible === true ? 1000 : 0;
  const stageScore =
    stage === "receipt_ready"
      ? 2000
      : stage.startsWith("s")
        ? 20
        : stage
          ? 100
          : 0;
  const currentStepScore =
    currentStep === "receipt" || currentStep === "verification"
      ? 500
      : currentStep === "pilot_result"
        ? 400
        : currentStep
          ? 50
          : 0;
  const sourceScore =
    source === "receipt_page_repair"
      ? 700
      : source === "pilot_page"
        ? 600
        : source === "pilot_page_case_name"
          ? 500
          : source === "pilot"
            ? 10
            : 100;
  const updatedAtMs = new Date(record?.updatedAt || record?.savedAt || record?.createdAt || 0).getTime();
  const updatedAtScore = Number.isFinite(updatedAtMs) ? updatedAtMs / 1000000 : 0;

  return (
    stageScore +
    receiptEligibleScore +
    currentStepScore +
    sourceScore +
    updatedAtScore +
    eventCount
  );
}

export function pickRicherCaseRecord(existing = {}, incoming = {}) {
  return getRecordRichnessScore(incoming) > getRecordRichnessScore(existing)
    ? incoming
    : existing;
}

export function getCaseSortTime(item = {}) {
  const caseId = String(item.caseId || item.id || "").trim();
  const match = caseId.match(/^CASE-(\d+)-/);
  if (match) return Number(match[1]);

  const fallbackTimes = [
    item.createdAt,
    item.savedAt,
    item.updatedAt,
    item.receipt?.createdAt,
    item.receipt?.updatedAt,
    item.meta?.createdAt,
    item.meta?.updatedAt,
  ];

  for (const value of fallbackTimes) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}
