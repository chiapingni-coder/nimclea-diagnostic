import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTrialStatus } from "../utils/buildTrialStatus.js";
import { getTrialLifecycleByEmail } from "../utils/supabaseTrialLifecycleStore.js";
import { readSupabaseTrialsForStatus } from "../utils/supabaseTrialStore.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "..", "data");
const USE_CLEAN_TRIAL_LIFECYCLE =
  process.env.NIMCLEA_USE_CLEAN_TRIAL_LIFECYCLE === "true";

const SAFE_DEFAULT = {
  trialActive: false,
  trialStartedAt: null,
  trialEndsAt: null,
  trialDay: null,
  trialEnded: false,
  casesCreatedDuringTrial: 0,
  pilotSummaryAvailable: false,
  pilotSummaryPaid: false,
  shouldShowTrialStatusBar: false,
  shouldShowPilotSummaryEntry: false,
  source: "none",
};

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isSafeEmail(value) {
  return Boolean(value && value.includes("@") && !/\s/.test(value));
}

async function readJsonArray(fileName) {
  try {
    const raw = await fs.readFile(path.join(dataDir, fileName), "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

router.get("/", async (req, res) => {
  const email = normalizeEmail(req.query?.email);

  if (!isSafeEmail(email)) {
    return res.json({
      success: false,
      error: "email_required",
      data: { ...SAFE_DEFAULT },
    });
  }

  const userId = String(req.query?.userId || "").trim();

  try {
    let cleanTrialRecord = null;

    if (USE_CLEAN_TRIAL_LIFECYCLE) {
      try {
        cleanTrialRecord = await getTrialLifecycleByEmail(email);
      } catch {
        cleanTrialRecord = null;
      }
    }

    const [
      supabaseTrialsResult,
      jsonTrialRecords,
      caseRecords,
      paymentRecords,
      subscriptionRecords,
    ] = await Promise.all([
      readSupabaseTrialsForStatus({ email, userId }),
      readJsonArray("trials.json"),
      readJsonArray("cases.json"),
      readJsonArray("paymentRecords.json"),
      readJsonArray("subscriptionRecords.json"),
    ]);
    const trialRecords = cleanTrialRecord
      ? [
          {
            email,
            userEmail: email,
            userId: cleanTrialRecord.customerId,
            customerId: cleanTrialRecord.customerId,
            status: cleanTrialRecord.trialStatus,
            startedAt: cleanTrialRecord.trialStartedAt,
            expiresAt: cleanTrialRecord.trialEndsAt,
            trialStartedAt: cleanTrialRecord.trialStartedAt,
            trialEndsAt: cleanTrialRecord.trialEndsAt,
            source: "supabase_trial_lifecycle",
          },
        ]
      : supabaseTrialsResult.available === true
        ? supabaseTrialsResult.records
        : jsonTrialRecords;

    const data = buildTrialStatus({
      email,
      ...(userId ? { userId } : {}),
      trialRecords,
      caseRecords,
      paymentRecords,
      subscriptionRecords,
      now: new Date(),
    });

    return res.json({
      success: true,
      data,
    });
  } catch {
    return res.json({
      success: false,
      error: "trial_status_unavailable",
      data: { ...SAFE_DEFAULT },
    });
  }
});

export default router;
