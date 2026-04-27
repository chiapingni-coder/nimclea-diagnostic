import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import {
  readJsonFile as readLedgerJsonFile,
  writeJsonFile as writeLedgerJsonFile,
} from "../utils/fileStore.js";
import {
  readJsonFile,
  writeJsonFile,
  appendJsonRecord,
} from "../utils/jsonStore.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ledgerFile = path.join(__dirname, "../data/hashLedger.json");
const RECEIPT_RECORDS_FILE = "receiptRecords.json";
const RECEIPT_HASH_PATTERN = /^H-[A-F0-9]{24}$/i;
const CASE_ID_PATTERN = /^CASE-\d+-[A-Z0-9]{6}$/;

function normalizeReceiptHash(value = "") {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  return RECEIPT_HASH_PATTERN.test(trimmed) ? trimmed.toUpperCase() : "";
}

function normalizeCaseId(input) {
  return input?.caseId || input?.id || input?.metadata?.caseId || null;
}

function buildCaseSnapshot(input = {}) {
  const casesRaw = readJsonFile("cases.json", []);
  const eventLogsRaw = readJsonFile("eventLogs.json", []);
  const cases = Array.isArray(casesRaw) ? casesRaw : [];
  const eventLogs = Array.isArray(eventLogsRaw) ? eventLogsRaw : [];
  const caseId = normalizeCaseId(input);
  const snapshotAt = new Date().toISOString();
  const caseRecord = caseId
    ? cases.find((item) => item?.caseId === caseId || item?.id === caseId) || null
    : null;
  const events = caseId
    ? eventLogs.filter(
        (event) => event?.caseId === caseId || event?.body?.caseId === caseId
      )
    : [];

  return {
    snapshotId: `case_snapshot_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    caseId,
    snapshotAt,
    source: "receipt_snapshot",
    caseRecord,
    eventCount: events.length,
    events,
    receiptInput: input,
    schemaVersion: "case_snapshot_v0.1",
  };
}

function createStableHash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 24);
}

function getNextSnapshotVersion(record = {}) {
  const currentVersion = Number(record?.snapshotVersion || 1);
  return Number.isFinite(currentVersion) ? currentVersion + 1 : 2;
}

function upsertReceiptRecordFromHash({
  receiptId = "",
  caseId = "",
  hash = "",
  source = "receipt_page",
  now = new Date().toISOString(),
}) {
  const records = readJsonFile(RECEIPT_RECORDS_FILE, []);
  const safeRecords = Array.isArray(records) ? records : [];
  const normalizedHash = normalizeReceiptHash(hash);
  const receiptInput = {
    receiptId,
    caseId,
    hash: normalizedHash,
    source,
  };
  const caseSnapshot = buildCaseSnapshot(receiptInput);
  const caseSnapshotHash = createStableHash(caseSnapshot);
  const existingIndex = safeRecords.findIndex((item) => {
    const itemReceiptId = String(item?.receiptId || "").trim();
    const itemCaseId = String(item?.caseId || "").trim();
    const itemHash = normalizeReceiptHash(item?.hash || item?.receiptHash || "");

    return (
      (receiptId && itemReceiptId === receiptId) ||
      (caseId && itemCaseId === caseId) ||
      (normalizedHash && itemHash === normalizedHash)
    );
  });

  const patch = {
    receiptId: receiptId || safeRecords[existingIndex]?.receiptId || "",
    caseId,
    hash: normalizedHash,
    createdAt: now,
    updatedAt: now,
    source,
    caseSnapshot,
    caseSnapshotHash,
  };

  if (existingIndex >= 0) {
    const existing = safeRecords[existingIndex] || {};

    if (existing.snapshotStatus === "frozen") {
      const record = {
        ...existing,
        ...patch,
        receiptId: existing.receiptId || patch.receiptId,
        createdAt: now,
        updatedAt: now,
        source: existing.source || source,
        paid: existing.paid === true ? true : existing.paid,
        snapshotStatus: "active",
        snapshotVersion: getNextSnapshotVersion(existing),
      };

      appendJsonRecord(RECEIPT_RECORDS_FILE, record);
      return { record, created: true, versioned: true };
    }

    const record = {
      ...existing,
      ...patch,
      receiptId: existing.receiptId || patch.receiptId,
      createdAt: existing.createdAt || now,
      source: existing.source || source,
      paid: existing.paid === true ? true : existing.paid,
      snapshotVersion: existing.snapshotVersion || 1,
    };

    safeRecords[existingIndex] = record;
    writeJsonFile(RECEIPT_RECORDS_FILE, safeRecords);
    return { record, existing: true };
  }

  const record = {
    ...patch,
    paid: false,
    paymentStatus: "unpaid",
    verificationStatus: "",
  };

  appendJsonRecord(RECEIPT_RECORDS_FILE, record);
  return { record, created: true };
}

router.get("/receipt", (req, res) => {
  try {
    const caseId = String(req.query.caseId || "").trim();

    if (!caseId) {
      return res.status(400).json({
        ok: false,
        error: "Missing caseId",
      });
    }

    const ledger = readLedgerJsonFile(ledgerFile, []);
    const record = ledger.find((item) => item.caseId === caseId) || null;

    if (!record) {
      return res.status(404).json({
        ok: false,
        exists: false,
        error: "Receipt ledger not found",
      });
    }

    return res.status(200).json({
      ok: true,
      exists: true,
      receiptHash: normalizeReceiptHash(record.receiptHash),
      record,
    });
  } catch (error) {
    console.error("[hash-ledger receipt GET error]", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to read receipt ledger",
    });
  }
});

router.post("/receipt", (req, res) => {
  try {
    const caseId = String(req.body?.caseId || "").trim();
    const receiptHash = normalizeReceiptHash(req.body?.receiptHash);
    const source = String(req.body?.source || "receipt_page").trim() || "receipt_page";

    if (!CASE_ID_PATTERN.test(caseId)) {
      return res.status(400).json({
        ok: false,
        message: "caseId must match CASE-<timestamp>-<6 character suffix>",
      });
    }

    if (!receiptHash) {
      return res.status(400).json({
        ok: false,
        message: "receiptHash must be H- followed by 24 hex characters",
      });
    }

    const ledger = readLedgerJsonFile(ledgerFile, []);
    const existingIndex = ledger.findIndex((item) => item.caseId === caseId);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = ledger[existingIndex];
      const existingHash = normalizeReceiptHash(existing.receiptHash);

      if (existingHash && existingHash !== receiptHash) {
        return res.status(409).json({
          ok: false,
          conflict: true,
          existingHash,
          attemptedHash: receiptHash,
        });
      }

      const record = {
        ...existing,
        caseId,
        receiptHash: existingHash || receiptHash,
        createdAt: existing.createdAt || now,
        updatedAt: now,
        source: existing.source || source,
      };

      ledger[existingIndex] = record;
      writeLedgerJsonFile(ledgerFile, ledger);
      upsertReceiptRecordFromHash({
        receiptId: record.receiptId || "",
        caseId,
        hash: record.receiptHash,
        source,
        now,
      });

      return res.json({
        ok: true,
        existing: true,
        record,
      });
    }

    const record = {
      caseId,
      receiptHash,
      createdAt: now,
      updatedAt: now,
      source,
    };

    ledger.push(record);
    writeLedgerJsonFile(ledgerFile, ledger);
    upsertReceiptRecordFromHash({
      receiptId: record.receiptId || "",
      caseId,
      hash: receiptHash,
      source,
      now,
    });

    return res.json({
      ok: true,
      created: true,
      record,
    });
  } catch (error) {
    console.error("POST /hash-ledger/receipt error:", error);
    return res.status(500).json({
      ok: false,
      message: "Failed to lock receipt hash",
    });
  }
});

router.get("/receipt/:caseId", (req, res) => {
  try {
    const caseId = String(req.params?.caseId || "").trim();

    if (!CASE_ID_PATTERN.test(caseId)) {
      return res.status(400).json({
        ok: false,
        message: "caseId must match CASE-<timestamp>-<6 character suffix>",
      });
    }

    const ledger = readLedgerJsonFile(ledgerFile, []);
    const record = ledger.find((item) => item.caseId === caseId) || null;

    if (!record) {
      return res.status(404).json({
        ok: false,
        found: false,
      });
    }

    return res.json({
      ok: true,
      found: true,
      receiptHash: normalizeReceiptHash(record.receiptHash),
      record,
    });
  } catch (error) {
    console.error("GET /hash-ledger/receipt/:caseId error:", error);
    return res.status(500).json({
      ok: false,
      message: "Failed to read receipt hash ledger",
    });
  }
});

export default router;
