import express from "express";
import crypto from "crypto";
import Stripe from "stripe";
import {
  readJsonFile,
  writeJsonFile,
  appendJsonRecord,
} from "../utils/jsonStore.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const RECEIPT_RECORDS_FILE = "receiptRecords.json";

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

function updateReceiptPaymentRecord({
  receiptId = "",
  caseId = "",
  hash = "",
  paymentTier = "formal_receipt",
  paymentStatus = "checkout_created",
  paid = false,
  source = "stripe_checkout",
}) {
  const records = readJsonFile(RECEIPT_RECORDS_FILE, []);
  const safeRecords = Array.isArray(records) ? records : [];
  const now = new Date().toISOString();
  const receiptInput = {
    receiptId,
    caseId,
    hash,
    paymentTier,
    paymentStatus,
    paid,
    source,
  };
  const caseSnapshot = buildCaseSnapshot(receiptInput);
  const caseSnapshotHash = createStableHash(caseSnapshot);
  const existingIndex = safeRecords.findIndex((item) => {
    const itemReceiptId = String(item?.receiptId || "").trim();
    const itemCaseId = String(item?.caseId || "").trim();
    const itemHash = String(item?.hash || item?.receiptHash || "").trim();

    return (
      (receiptId && itemReceiptId === receiptId) ||
      (caseId && itemCaseId === caseId) ||
      (hash && itemHash === hash)
    );
  });

  if (existingIndex >= 0) {
    if (safeRecords[existingIndex]?.snapshotStatus === "frozen") {
      const record = {
        ...safeRecords[existingIndex],
        receiptId: safeRecords[existingIndex]?.receiptId || receiptId,
        caseId: safeRecords[existingIndex]?.caseId || caseId,
        hash: safeRecords[existingIndex]?.hash || hash,
        paid: safeRecords[existingIndex]?.paid === true ? true : paid,
        paymentTier,
        paymentStatus,
        caseSnapshot,
        caseSnapshotHash,
        snapshotStatus: "active",
        snapshotVersion: getNextSnapshotVersion(safeRecords[existingIndex]),
        createdAt: now,
        updatedAt: now,
        source: safeRecords[existingIndex]?.source || source,
      };

      appendJsonRecord(RECEIPT_RECORDS_FILE, record);
      return record;
    }

    safeRecords[existingIndex] = {
      ...safeRecords[existingIndex],
      receiptId: safeRecords[existingIndex]?.receiptId || receiptId,
      caseId: safeRecords[existingIndex]?.caseId || caseId,
      hash: safeRecords[existingIndex]?.hash || hash,
      paid: safeRecords[existingIndex]?.paid === true ? true : paid,
      paymentTier,
      paymentStatus,
      caseSnapshot,
      caseSnapshotHash,
      snapshotVersion: safeRecords[existingIndex]?.snapshotVersion || 1,
      updatedAt: now,
      source: safeRecords[existingIndex]?.source || source,
    };

    writeJsonFile(RECEIPT_RECORDS_FILE, safeRecords);
    return safeRecords[existingIndex];
  }

  const record = {
    receiptId,
    caseId,
    hash,
    paid,
    paymentTier,
    paymentStatus,
    verificationStatus: "",
    caseSnapshot,
    caseSnapshotHash,
    createdAt: now,
    updatedAt: now,
    source,
  };

  appendJsonRecord(RECEIPT_RECORDS_FILE, record);
  return record;
}

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { caseId, receiptId, hash } = req.body || {};

    if (!caseId) {
      return res.status(400).json({ error: "Missing caseId" });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      metadata: {
        caseId,
        receiptId: receiptId || "",
        hash: hash || "",
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Nimclea Formal Receipt Unlock",
              description: `Formal receipt unlock for case ${caseId}`,
            },
            unit_amount: 4900,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payment-success?caseId=${encodeURIComponent(caseId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/receipt?caseId=${encodeURIComponent(caseId)}`,
    });

    updateReceiptPaymentRecord({
      receiptId: receiptId || session.id,
      caseId,
      hash: hash || "",
      paymentTier: "formal_receipt",
      paymentStatus: "checkout_created",
      paid: false,
      source: "stripe_checkout",
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    return res.status(500).json({ error: "Unable to create checkout session" });
  }
});

export default router;
