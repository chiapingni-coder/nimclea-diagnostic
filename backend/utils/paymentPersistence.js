import {
  readJsonFile,
  writeJsonFile,
} from "./jsonStore.js";

const PAYMENT_RECORDS_FILE = "paymentRecords.json";

const PAYMENT_RECORD_FIELDS = [
  "stripeSessionId",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "productType",
  "paymentType",
  "priceType",
  "paymentScope",
  "userId",
  "customerId",
  "caseId",
  "receiptId",
  "hash",
  "email",
  "status",
  "source",
];

function normalizeValue(value) {
  return value === undefined || value === "" ? null : value;
}

function normalizePaymentRecord(input = {}, timestamps = {}) {
  const record = {};

  PAYMENT_RECORD_FIELDS.forEach((field) => {
    record[field] = normalizeValue(input[field]);
  });

  record.createdAt = timestamps.createdAt || new Date().toISOString();
  record.updatedAt = timestamps.updatedAt || record.createdAt;

  return record;
}

function findPaymentRecordIndex(records = [], patch = {}) {
  const stripeSessionId = String(patch.stripeSessionId || "").trim();
  const productType = String(patch.productType || "").trim();
  const paymentScope = String(patch.paymentScope || "").trim();
  const caseId = String(patch.caseId || "").trim();

  if (stripeSessionId) {
    const sessionIndex = records.findIndex(
      (record) => String(record?.stripeSessionId || "").trim() === stripeSessionId
    );

    if (sessionIndex >= 0) return sessionIndex;
  }

  if (!productType || !paymentScope) return -1;

  return records.findIndex((record) => {
    const sameProductType = String(record?.productType || "").trim() === productType;
    const samePaymentScope = String(record?.paymentScope || "").trim() === paymentScope;
    const sameCaseId = String(record?.caseId || "").trim() === caseId;

    return sameProductType && samePaymentScope && sameCaseId;
  });
}

export function upsertPaymentRecord(input = {}) {
  const existingRaw = readJsonFile(PAYMENT_RECORDS_FILE, []);
  const records = Array.isArray(existingRaw) ? existingRaw : [];
  const now = new Date().toISOString();
  const normalizedInput = normalizePaymentRecord(input, {
    createdAt: input.createdAt || now,
    updatedAt: now,
  });
  const existingIndex = findPaymentRecordIndex(records, normalizedInput);

  if (existingIndex >= 0) {
    const existing = records[existingIndex] || {};
    const updatedRecord = normalizePaymentRecord(
      {
        ...existing,
        ...normalizedInput,
      },
      {
        createdAt: existing.createdAt || normalizedInput.createdAt || now,
        updatedAt: now,
      }
    );

    records[existingIndex] = updatedRecord;
    writeJsonFile(PAYMENT_RECORDS_FILE, records);
    return updatedRecord;
  }

  records.push(normalizedInput);
  writeJsonFile(PAYMENT_RECORDS_FILE, records);
  return normalizedInput;
}
