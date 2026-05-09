import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import {
  readJsonFile,
  writeJsonFile,
  appendJsonRecord,
} from "../utils/jsonStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const RECEIPT_RECORDS_FILE = "receiptRecords.json";
const SUBSCRIPTION_RECORDS_FILE = "subscriptionRecords.json";
const RECEIPT_PRICE_ID = String(process.env.STRIPE_RECEIPT_PRICE_ID || "").trim();
const FRONTEND_URL = String(process.env.FRONTEND_URL || "http://localhost:5173").trim();
const PILOT_EXTENSION_FRONTEND_URL = "http://localhost:5173";
const CASES_FILE = "cases.json";

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

function findCaseIndex(cases = [], caseId = "") {
  if (!caseId) return -1;

  return cases.findIndex(
    (item) => item?.caseId === caseId || item?.id === caseId
  );
}

function upsertCaseRecord(input = {}) {
  const casesRaw = readJsonFile(CASES_FILE, []);
  const cases = Array.isArray(casesRaw) ? casesRaw : [];
  const now = new Date().toISOString();
  const caseId = String(input.caseId || input.id || "").trim();
  const existingIndex = findCaseIndex(cases, caseId);

  if (existingIndex >= 0) {
    const existing = cases[existingIndex] || {};
    const updatedRecord = {
      ...existing,
      ...input,
      id: existing.id || input.id || caseId,
      caseId: existing.caseId || input.caseId || caseId,
      createdAt: existing.createdAt || input.createdAt || now,
      updatedAt: now,
    };

    cases[existingIndex] = updatedRecord;
    writeJsonFile(CASES_FILE, cases);
    return updatedRecord;
  }

  const createdRecord = {
    ...input,
    id: input.id || caseId,
    caseId,
    createdAt: input.createdAt || now,
    updatedAt: now,
    source: input.source || "stripe_checkout",
  };

  appendJsonRecord(CASES_FILE, createdRecord);
  return createdRecord;
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

function updateSubscriptionCheckoutRecord({
  email = "",
  caseId = "",
  stripeSessionId = "",
  subscriptionStatus = "checkout_created",
  paymentStatus = "checkout_created",
  priceType = "pilot_extension",
  paymentType = "pilot_extension",
  pilotExtensionPaid = false,
  pilotExtensionPaidAt = "",
  pilotExtensionPaymentStatus = paymentStatus,
  stripeCustomerId = "",
  stripeSubscriptionId = "",
  source = "stripe_subscription_checkout",
}) {
  const records = readJsonFile(SUBSCRIPTION_RECORDS_FILE, []);
  const safeRecords = Array.isArray(records) ? records : [];
  const now = new Date().toISOString();
  const safeEmail = String(email || "").trim().toLowerCase();
  const safeCaseId = String(caseId || "").trim();
  const safeSessionId = String(stripeSessionId || "").trim();

  const patch = {
    email: safeEmail,
    caseId: safeCaseId,
    stripeSessionId: safeSessionId,
    pilotExtensionStripeSessionId: safeSessionId,
    stripeCustomerId,
    stripeSubscriptionId,
    priceType,
    paymentType,
    subscriptionStatus,
    paymentStatus,
    pilotExtensionPaid,
    pilotExtensionPaymentStatus,
    pilotExtensionPaidAt,
    source,
    updatedAt: now,
  };

  const existingIndex = safeRecords.findIndex((item) => {
    const itemSessionId = String(item?.stripeSessionId || item?.pilotExtensionStripeSessionId || "").trim();
    const itemEmail = String(item?.email || "").trim().toLowerCase();

    return (
      (safeSessionId && itemSessionId === safeSessionId) ||
      (!safeSessionId && safeEmail && itemEmail === safeEmail)
    );
  });

  const record =
    existingIndex >= 0
      ? {
          ...(safeRecords[existingIndex] || {}),
          ...patch,
          createdAt: safeRecords[existingIndex]?.createdAt || now,
        }
      : {
          ...patch,
          createdAt: now,
        };

  if (existingIndex >= 0) {
    safeRecords[existingIndex] = record;
  } else {
    safeRecords.push(record);
  }

  writeJsonFile(SUBSCRIPTION_RECORDS_FILE, safeRecords);
  return record;
}

function updateUserSubscriptionRecord({
  email = "",
  subscription = {},
}) {
  const safeEmail = String(email || "").trim().toLowerCase();
  if (!safeEmail) return null;

  const usersRaw = readJsonFile("users.json", []);
  const users = Array.isArray(usersRaw) ? usersRaw : [];
  const now = new Date().toISOString();
  const existingIndex = users.findIndex(
    (item) => String(item?.email || "").trim().toLowerCase() === safeEmail
  );
  const existing = existingIndex >= 0 ? users[existingIndex] || {} : {};
  const record = {
    ...existing,
    email: existing.email || safeEmail,
    subscription: {
      ...(existing.subscription || {}),
      ...subscription,
    },
    subscriptionStatus: subscription.subscriptionStatus || existing.subscriptionStatus || "",
    pilotExtensionPaid:
      subscription.pilotExtensionPaid === true || existing.pilotExtensionPaid === true,
    pilotExtensionPaidAt:
      subscription.pilotExtensionPaidAt || existing.pilotExtensionPaidAt || "",
    pilotExtensionPaymentStatus:
      subscription.pilotExtensionPaymentStatus ||
      existing.pilotExtensionPaymentStatus ||
      "",
    updatedAt: now,
    createdAt: existing.createdAt || now,
  };

  if (existingIndex >= 0) {
    users[existingIndex] = record;
  } else {
    users.push(record);
  }

  writeJsonFile("users.json", users);
  return record;
}

function attachCaseSubscriptionRecord({
  caseId = "",
  subscription = {},
}) {
  const safeCaseId = String(caseId || "").trim();
  if (!safeCaseId) return null;

  const casesRaw = readJsonFile(CASES_FILE, []);
  const cases = Array.isArray(casesRaw) ? casesRaw : [];
  const existingIndex = findCaseIndex(cases, safeCaseId);
  if (existingIndex < 0) return null;

  const now = new Date().toISOString();
  const existing = cases[existingIndex] || {};
  const record = {
    ...existing,
    subscription: {
      ...(existing.subscription || {}),
      ...subscription,
    },
    updatedAt: now,
  };

  cases[existingIndex] = record;
  writeJsonFile(CASES_FILE, cases);
  return record;
}

export async function createCheckoutSession(req, res) {
  try {
    const { caseId, receiptId, hash, priceType, paymentType, email } = req.body || {};

    console.log("[STRIPE_ENV_CHECK]", {
      hasStripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
      hasReceiptPriceId: Boolean(process.env.STRIPE_RECEIPT_PRICE_ID),
      frontendUrl: process.env.FRONTEND_URL,
    });

    if (priceType === "pilot_extension" || paymentType === "pilot_extension") {
      const customerEmail = String(email || "").trim();
      const safeCaseId = String(caseId || "").trim();

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: customerEmail || undefined,
        metadata: {
          priceType: "pilot_extension",
          paymentType: "pilot_extension",
          email: customerEmail,
          caseId: safeCaseId,
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Nimclea Pilot Extension",
              },
              recurring: {
                interval: "month",
              },
              unit_amount: 900,
            },
            quantity: 1,
          },
        ],
        // TODO: Upgrade to $79/month after the first month using Stripe Billing configuration.
        success_url: `${PILOT_EXTENSION_FRONTEND_URL}/cases?checkout=success&session_id={CHECKOUT_SESSION_ID}&paymentType=pilot_extension`,
        cancel_url: `${PILOT_EXTENSION_FRONTEND_URL}/cases?checkout=cancel&paymentType=pilot_extension`,
      });

      const subscriptionRecord = updateSubscriptionCheckoutRecord({
        email: customerEmail,
        caseId: safeCaseId,
        stripeSessionId: session.id,
        subscriptionStatus: "checkout_created",
        paymentStatus: "checkout_created",
        priceType: "pilot_extension",
        paymentType: "pilot_extension",
        source: "stripe_subscription_checkout",
      });

      return res.json({ url: session.url, subscriptionRecord });
    }

    if (!caseId) {
      return res.status(400).json({ error: "Missing caseId" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      metadata: {
        caseId,
        receiptId: receiptId || "",
        hash: hash || "",
      },
      line_items: [
        RECEIPT_PRICE_ID
          ? {
              price: RECEIPT_PRICE_ID,
              quantity: 1,
            }
          : {
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
      success_url: `${FRONTEND_URL}/receipt?caseId=${encodeURIComponent(caseId)}&session_id={CHECKOUT_SESSION_ID}&paid=success`,
      cancel_url: `${FRONTEND_URL}/receipt?caseId=${encodeURIComponent(caseId)}&paid=cancel`,
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
    console.error("[STRIPE_CHECKOUT_ERROR]", {
      requestBody: {
        priceType: req.body?.priceType || "",
        hasEmail: Boolean(String(req.body?.email || "").trim()),
        hasCaseId: Boolean(String(req.body?.caseId || "").trim()),
      },
      hasStripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
      param: error.param,
      detail: error.detail,
      raw: error.raw,
      stack: error.stack,
    });

    return res.status(500).json({
      error: "Unable to create checkout session",
      message: error.message,
      code: error.code || null,
    });
  }
}

router.post("/create-checkout-session", createCheckoutSession);

router.post("/confirm-checkout-session", async (req, res) => {
  try {
    const { caseId = "", sessionId = "", paymentType: requestedPaymentType = "" } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({
        error: "Missing sessionId",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionCaseId = String(session?.metadata?.caseId || "").trim();
    const sessionPaymentType = String(
      session?.metadata?.paymentType ||
        session?.metadata?.priceType ||
        requestedPaymentType ||
        ""
    ).trim();

    if (sessionPaymentType === "pilot_extension") {
      if (session.payment_status !== "paid") {
        return res.status(409).json({
          error: "Checkout session not paid",
          message: `Session payment_status is ${session.payment_status || "unknown"}`,
          payment_status: session.payment_status || null,
        });
      }

      const now = new Date().toISOString();
      const safeEmail = String(
        session?.customer_details?.email ||
          session?.customer_email ||
          session?.metadata?.email ||
          req.body?.email ||
          ""
      ).trim().toLowerCase();
      const safeCaseId = String(caseId || sessionCaseId || "").trim();
      const subscription = {
        subscriptionStatus: "active",
        pilotExtensionPaid: true,
        pilotExtensionPaidAt: now,
        pilotExtensionPaymentStatus: "paid",
        pilotExtensionStripeSessionId: session.id,
        stripeSessionId: session.id,
        stripeCustomerId: String(session.customer || ""),
        stripeSubscriptionId: String(session.subscription || ""),
        paymentType: "pilot_extension",
        priceType: "pilot_extension",
        source: "stripe_checkout_confirmed",
      };
      const subscriptionRecord = updateSubscriptionCheckoutRecord({
        email: safeEmail,
        caseId: safeCaseId,
        stripeSessionId: session.id,
        subscriptionStatus: "active",
        paymentStatus: "paid",
        priceType: "pilot_extension",
        paymentType: "pilot_extension",
        pilotExtensionPaid: true,
        pilotExtensionPaidAt: now,
        pilotExtensionPaymentStatus: "paid",
        stripeCustomerId: String(session.customer || ""),
        stripeSubscriptionId: String(session.subscription || ""),
        source: "stripe_checkout_confirmed",
      });
      const userRecord = updateUserSubscriptionRecord({
        email: safeEmail,
        subscription,
      });
      const caseRecord = safeCaseId
        ? attachCaseSubscriptionRecord({
            caseId: safeCaseId,
            subscription,
          })
        : null;

      return res.json({
        success: true,
        sessionId: session.id,
        paymentType: "pilot_extension",
        paymentStatus: session.payment_status,
        subscription,
        subscriptionRecord,
        userRecord,
        caseRecord,
      });
    }

    if (!caseId) {
      return res.status(400).json({
        error: "Missing caseId",
      });
    }

    if (sessionCaseId && sessionCaseId !== String(caseId).trim()) {
      return res.status(400).json({
        error: "Case mismatch for checkout session",
        message: "The checkout session does not belong to the supplied caseId.",
      });
    }

    if (session.payment_status !== "paid") {
      return res.status(409).json({
        error: "Checkout session not paid",
        message: `Session payment_status is ${session.payment_status || "unknown"}`,
        payment_status: session.payment_status || null,
      });
    }

    const now = new Date().toISOString();
    const updatedCase = upsertCaseRecord({
      caseId,
      caseBilling: {
        receiptActivated: true,
        verificationActivated: false,
        activatedAt: now,
        source: "stripe_checkout_confirmed",
        paymentStatus: "paid",
        paymentSessionId: session.id,
        paymentIntentId: session.payment_intent || "",
      },
      receipt: {
        paid: true,
        receiptActivated: true,
        verified: false,
      },
      payment: {
        status: "paid",
        receiptActivated: true,
        verificationActivated: false,
        stripeSessionId: session.id,
        stripePaymentStatus: session.payment_status,
      },
      isPaid: true,
      updatedAt: now,
      source: "stripe_checkout_confirmed",
    });
    const receiptPaymentRecord = updateReceiptPaymentRecord({
      receiptId: session?.metadata?.receiptId || session.id,
      caseId,
      hash: session?.metadata?.hash || "",
      paymentTier: "formal_receipt",
      paymentStatus: "paid",
      paid: true,
      source: "stripe_checkout_confirmed",
    });

    return res.json({
      success: true,
      sessionId: session.id,
      paymentStatus: session.payment_status,
      caseId,
      caseRecord: updatedCase,
      receiptPaymentRecord,
    });
  } catch (error) {
    console.error("[STRIPE_CONFIRM_ERROR]", {
      message: error.message,
      type: error.type,
      code: error.code,
      raw: error.raw,
    });

    return res.status(500).json({
      error: "Unable to confirm checkout session",
      message: error.message,
      code: error.code || null,
    });
  }
});

export default router;
