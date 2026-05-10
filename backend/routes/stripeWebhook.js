import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { upsertPaymentRecord } from "../utils/paymentPersistence.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function getSessionEmail(session = {}) {
  return String(
    session?.customer_details?.email ||
      session?.customer_email ||
      session?.metadata?.email ||
      ""
  ).trim().toLowerCase();
}

function getSessionPaymentType(session = {}) {
  return String(
    session?.metadata?.paymentType ||
      session?.metadata?.priceType ||
      ""
  ).trim();
}

function writeCheckoutCompletedPaymentRecord(session = {}) {
  const paymentType = getSessionPaymentType(session);
  const metadata = session?.metadata || {};
  const baseRecord = {
    stripeSessionId: session.id,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    email: getSessionEmail(session),
    source: "stripe_webhook",
  };

  if (paymentType === "receipt_activation") {
    return upsertPaymentRecord({
      ...baseRecord,
      productType: "receipt_activation",
      paymentType: "receipt_activation",
      priceType: "receipt_activation",
      paymentScope: "case",
      caseId: metadata.caseId,
      receiptId: metadata.receiptId,
      hash: metadata.hash,
      status: "paid",
    });
  }

  if (paymentType === "formal_verification") {
    return upsertPaymentRecord({
      ...baseRecord,
      productType: "formal_verification",
      paymentType: "formal_verification",
      priceType: "formal_verification",
      paymentScope: "case",
      caseId: metadata.caseId,
      status: "paid",
    });
  }

  if (paymentType === "pilot_extension") {
    return upsertPaymentRecord({
      ...baseRecord,
      productType: "pilot_extension",
      paymentType: "pilot_extension",
      priceType: "pilot_extension",
      paymentScope: "subscription",
      caseId: metadata.caseId,
      status: "active",
    });
  }

  return null;
}

router.post("/", (req, res) => {
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();

  if (!webhookSecret) {
    return res.status(500).json({
      error: "Missing STRIPE_WEBHOOK_SECRET",
    });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      webhookSecret
    );
  } catch (error) {
    return res.status(400).json({
      error: "Stripe webhook signature verification failed",
      message: error.message,
    });
  }

  if (event.type !== "checkout.session.completed") {
    return res.json({
      received: true,
      ignored: true,
      type: event.type,
    });
  }

  const session = event.data.object;
  const paymentRecord = writeCheckoutCompletedPaymentRecord(session);

  return res.json({
    received: true,
    ignored: paymentRecord === null,
    type: event.type,
  });
});

export default router;
