import { sanitizeText } from "./sanitizeText";

const REPAIR_DONE_KEY = "nimclea_text_repair_v1_done";

const KEY_NAME_MARKERS = [
  "case",
  "receipt",
  "verification",
  "pilot",
  "event",
  "nimclea",
];

const SKIPPED_FIELD_NAMES = new Set([
  "id",
  "caseId",
  "receiptId",
  "verificationId",
  "hash",
  "sourceHash",
  "createdAt",
  "updatedAt",
  "generatedAt",
  "verifiedAt",
  "paidAt",
  "score",
  "totalScore",
  "receiptScore",
  "verificationScore",
  "paymentStatus",
  "stripeSessionId",
  "route",
  "path",
]);

function shouldInspectStorageKey(key = "") {
  const normalized = String(key || "").toLowerCase();
  return KEY_NAME_MARKERS.some((marker) => normalized.includes(marker));
}

function parseJsonSafely(value) {
  try {
    return {
      parsed: JSON.parse(value),
      ok: true,
    };
  } catch {
    return {
      parsed: null,
      ok: false,
    };
  }
}

function repairValue(value, fieldName = "") {
  if (SKIPPED_FIELD_NAMES.has(fieldName)) return value;

  if (typeof value === "string") {
    return sanitizeText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => repairValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => [
        key,
        repairValue(childValue, key),
      ])
    );
  }

  return value;
}

export function repairStoredTextOnce() {
  if (typeof window === "undefined" || !window.localStorage) return;

  const storage = window.localStorage;

  try {
    if (storage.getItem(REPAIR_DONE_KEY) === "true") return;

    const keys = Array.from({ length: storage.length }, (_, index) =>
      storage.key(index)
    ).filter(Boolean);

    keys.forEach((key) => {
      if (!shouldInspectStorageKey(key)) return;

      const raw = storage.getItem(key);
      if (typeof raw !== "string" || !raw.trim()) return;

      const { parsed, ok } = parseJsonSafely(raw);
      if (!ok) return;

      storage.setItem(key, JSON.stringify(repairValue(parsed)));
    });

    storage.setItem(REPAIR_DONE_KEY, "true");
  } catch (error) {
    console.warn("Stored text repair skipped:", error);
  }
}
