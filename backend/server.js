import 'dotenv/config';
console.log("🔥 THIS IS MY NEW SERVER");
console.log("🔥 SERVER.JS IS RUNNING");
import stripeRoutes from "./routes/stripe.js";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

import express from "express";
import cors from "cors";
import questions from "./questions.js";
import runSignalEngine from "./engine/signalEngine.js";
import runScenarioEngine from "./scenarioEngine.js";
import generatePreview from "./previewGenerator.js";
import trialRegisterRoutes from "./routes/trialRegisterRoutes.js";
import trialStartRoutes from "./routes/trialStartRoutes.js";
import caseRoutes from "./routes/caseRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import hashLedgerRoutes from "./routes/hashLedgerRoutes.js";
import { ensureDataFiles } from "./utils/ensureDataFiles.js";
import { readJsonFile } from "./utils/jsonStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EMAIL_LOGS_PATH = path.join(__dirname, "data", "emailLogs.json");

async function appendEmailLog(record) {
  let existingLogs = [];

  await fs.mkdir(path.dirname(EMAIL_LOGS_PATH), { recursive: true });

  try {
    const raw = await fs.readFile(EMAIL_LOGS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    existingLogs = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("Failed to read emailLogs.json; starting a new log array", error);
    }
  }

  const normalizedEmail = String(record?.email || "").trim().toLowerCase();
  const normalizedCaseId = String(record?.caseId || "").trim();

  const existingMatch = existingLogs.find((entry) => {
    const entryEmail = String(entry?.email || "").trim().toLowerCase();
    const entryCaseId = String(entry?.caseId || "").trim();

    return entryEmail === normalizedEmail && entryCaseId === normalizedCaseId;
  });

  if (existingMatch) {
    return existingMatch;
  }

  existingLogs.push(record);
  await fs.writeFile(
    EMAIL_LOGS_PATH,
    JSON.stringify(existingLogs, null, 2),
    "utf8"
  );
}

function buildPressureProfile(groups = {}, signals = {}) {
  const pressureScore = Number(groups?.pressure_context_score || 0);

  let code = "low_pressure";
  let label = "Low Pressure Environment";

  if (pressureScore >= 9) {
    code = "critical_pressure";
    label = "Critical Pressure Environment";
  } else if (pressureScore >= 6) {
    code = "high_pressure";
    label = "High Pressure Environment";
  } else if (pressureScore >= 3) {
    code = "moderate_pressure";
    label = "Moderate Pressure Environment";
  }

  const activeSignalKeys = Object.entries(signals)
    .filter(([, value]) => typeof value === "number" && value > 0)
    .map(([key]) => key)
    .filter((key) =>
      [
        "external_pressure",
        "triggered_review_environment",
        "explainability_gap",
        "rule_drift",
        "metric_volatility",
        "incident_reconstruction",
        "approval_auditability",
      ].includes(key)
    );

  return {
    code,
    label,
    signals: activeSignalKeys,
  };
}

const app = express();

ensureDataFiles();

app.use(cors());
app.use(express.json());

app.use("/trial", trialRegisterRoutes);
app.use("/trial", trialStartRoutes);
app.use("/case", caseRoutes);
app.use("/event", eventRoutes);
function findLastMatchingRecord(records, caseId) {
  if (!Array.isArray(records) || !caseId) {
    return null;
  }

  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (String(record?.caseId || record?.id || "").trim() === caseId) {
      return record;
    }
  }

  return null;
}

function normalizeCaseRecord(record = {}) {
  if (!record || typeof record !== "object") {
    return {};
  }

  const snapshot = record?.caseSnapshot || {};
  const nestedCaseRecord = snapshot?.caseRecord || {};
  const nestedCaseData = record?.caseData || {};
  const snapshotEvents = Array.isArray(snapshot?.events) ? snapshot.events : [];
  const recordEvents = Array.isArray(record?.events) ? record.events : [];
  const caseRecordEvents = Array.isArray(nestedCaseRecord?.events) ? nestedCaseRecord.events : [];
  const caseDataEvents = Array.isArray(nestedCaseData?.events) ? nestedCaseData.events : [];
  const mergedEvents = [
    ...snapshotEvents,
    ...recordEvents,
    ...caseRecordEvents,
    ...caseDataEvents,
  ].filter(Boolean);
  const flattenedReceiptEligible =
    typeof record?.receiptEligible === "boolean"
      ? record.receiptEligible
      : typeof nestedCaseRecord?.receiptEligible === "boolean"
        ? nestedCaseRecord.receiptEligible
        : typeof nestedCaseData?.receiptEligible === "boolean"
          ? nestedCaseData.receiptEligible
          : Boolean(mergedEvents.length > 0);

  return {
    ...record,
    ...nestedCaseRecord,
    ...nestedCaseData,
    events: mergedEvents.length > 0 ? mergedEvents : record?.events || nestedCaseRecord?.events || nestedCaseData?.events || [],
    eventLogs:
      record?.eventLogs ||
      nestedCaseRecord?.eventLogs ||
      nestedCaseData?.eventLogs ||
      mergedEvents,
    entries:
      record?.entries ||
      nestedCaseRecord?.entries ||
      nestedCaseData?.entries ||
      mergedEvents,
    latestEvent:
      record?.latestEvent ||
      nestedCaseRecord?.latestEvent ||
      nestedCaseData?.latestEvent ||
      mergedEvents[0] ||
      null,
    eventCount:
      typeof snapshot?.eventCount === "number"
        ? snapshot.eventCount
        : typeof record?.eventCount === "number"
          ? record.eventCount
          : mergedEvents.length,
    score:
      typeof nestedCaseRecord?.score === "number"
        ? nestedCaseRecord.score
        : typeof nestedCaseData?.score === "number"
          ? nestedCaseData.score
          : typeof record?.score === "number"
            ? record.score
            : record?.score,
    receiptEligible: flattenedReceiptEligible,
    paymentStatus:
      record?.paymentStatus ||
      snapshot?.paymentStatus ||
      nestedCaseRecord?.paymentStatus ||
      nestedCaseData?.paymentStatus ||
      "unpaid",
    paid:
      typeof record?.paid === "boolean"
        ? record.paid
        : typeof snapshot?.paid === "boolean"
          ? snapshot.paid
          : typeof nestedCaseRecord?.paid === "boolean"
            ? nestedCaseRecord.paid
            : typeof nestedCaseData?.paid === "boolean"
              ? nestedCaseData.paid
              : false,
    verificationStatus:
      record?.verificationStatus ||
      snapshot?.verificationStatus ||
      nestedCaseRecord?.verificationStatus ||
      nestedCaseData?.verificationStatus ||
      null,
    ...snapshot,
  };
}

app.get("/cases", (req, res) => {
  const email = String(req.query?.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ error: "email required" });
  }

  try {
    const storedLogs = readJsonFile("emailLogs.json", []);
    const storedCases = readJsonFile("cases.json", []);
    const storedReceiptRecords = readJsonFile("receiptRecords.json", []);
    const logs = Array.isArray(storedLogs) ? storedLogs : [];
    const cases = Array.isArray(storedCases) ? storedCases : [];
    const receiptRecords = Array.isArray(storedReceiptRecords) ? storedReceiptRecords : [];

    const matches = logs
      .filter((item) => {
      const caseEmail = String(
        item?.email ||
          item?.userEmail ||
          item?.leadEmail ||
          item?.contactEmail ||
          item?.captureEmail ||
          ""
      )
        .trim()
        .toLowerCase();

      return caseEmail && caseEmail === email;
      })
      .map((item) => {
        const caseId = String(item?.caseId || item?.id || "").trim();
        const baseCase = findLastMatchingRecord(cases, caseId) || {};
        const receiptCase = normalizeCaseRecord(
          findLastMatchingRecord(receiptRecords, caseId) || {}
        );

        return {
          email: item?.email || email,
          caseId: caseId || receiptCase?.caseId || baseCase?.caseId || "",
          source: item?.source || "pilot_setup",
          createdAt: item?.createdAt || null,
          title:
            receiptCase?.title ||
            baseCase?.title ||
            caseId ||
            "Untitled case",
          status:
            receiptCase?.status ||
            baseCase?.status ||
            item?.status ||
            "draft",
          ...baseCase,
          ...receiptCase,
          ...item,
          email: item?.email || email,
          caseId: caseId || receiptCase?.caseId || baseCase?.caseId || "",
        };
      });

    return res.json(matches);
  } catch (error) {
    console.error("[GET /cases] error", error);
    return res.status(500).json({ error: "Failed to load cases" });
  }
});
app.get("/receipt-record", (req, res) => {
  const caseId = String(req.query?.caseId || "").trim();

  if (!caseId) {
    return res.status(400).json({ error: "caseId required" });
  }

  try {
    const storedReceiptRecords = readJsonFile("receiptRecords.json", []);
    const receiptRecords = Array.isArray(storedReceiptRecords)
      ? storedReceiptRecords
      : [];

    for (let index = receiptRecords.length - 1; index >= 0; index -= 1) {
      const record = receiptRecords[index];
      if (String(record?.caseId || "").trim() === caseId) {
        return res.json(normalizeCaseRecord(record));
      }
    }

    return res.status(404).json({ error: "receipt record not found" });
  } catch (error) {
    console.error("[GET /receipt-record] error", error);
    return res.status(500).json({ error: "Failed to load receipt record" });
  }
});
app.post("/email/log", async (req, res) => {
  console.log("[email-log] received", req.body);

  const email = String(req.body?.email || "").trim();

  if (!email || !email.includes("@")) {
    return res.status(400).json({
      ok: false,
      error: "Valid email is required",
    });
  }

  const record = {
    email,
    caseId: req.body?.caseId || null,
    source: req.body?.source || "pilot_setup",
    createdAt: new Date().toISOString(),
  };

  try {
    await appendEmailLog(record);

    return res.status(200).json({
      ok: true,
      record,
    });
  } catch (error) {
    console.error("Failed to append email log", error);

    return res.status(500).json({
      ok: false,
      error: "Failed to append email log",
    });
  }
});
app.use("/email", emailRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/hash-ledger", hashLedgerRoutes);

app.post("/api/events/log", (req, res) => {
  console.log("[event log]", req.body);
  return res.status(200).json({
    ok: true,
    received: true,
    event: req.body,
  });
});

app.use("/api", stripeRoutes);
app.use("/", stripeRoutes);

function validateSubmittedAnswers(payload) {
  const answers = payload?.answers;

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return {
      ok: false,
      error: "Answers payload must be an object under req.body.answers",
      details: { received: answers }
    };
  }

  const submittedQuestionIds = Object.keys(answers);

  if (submittedQuestionIds.length === 0) {
    return {
      ok: false,
      error: "No answers submitted",
      details: { missing: [] }
    };
  }

  const missing = submittedQuestionIds.filter((id) => {
    const value = answers[id];

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    return {
      ok: false,
      error: "Missing required questions",
      details: { missing }
    };
  }

  return { ok: true };
}

// health check
app.get("/", (req, res) => {
  res.json({ status: "Nimclea Diagnostic API running" });
});

// questions
app.get("/questions", (req, res) => {
  res.json(questions);
});

// core diagnostic endpoint
app.post("/diagnostic", (req, res) => {
  try {
    const answers = req.body?.answers || {};

    console.log("🔥 RAW BODY:", req.body);
    console.log("🔥 ANSWERS ONLY:", JSON.stringify(answers, null, 2));

    const validation = validateSubmittedAnswers(req.body);
    console.log("🔥 VALIDATION RESULT:", validation);

    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        error: "Invalid diagnostic answers",
        details: validation.details || []
      });
    }

    const signalResult = runSignalEngine(answers);
    console.log("🔥 SIGNAL RESULT:", signalResult);

    const signals = signalResult?.signals || {};
    const groups = signalResult?.groups || {};

    console.log("🔥 SIGNALS ONLY:", JSON.stringify(signals, null, 2));
    console.log("🔥 GROUPS ONLY:", JSON.stringify(groups, null, 2));

    const baseScenarioResult = runScenarioEngine({
      signals,
      groups
    });

    const scenarioResult = {
      ...baseScenarioResult,
      pressureProfile:
        baseScenarioResult?.pressureProfile || buildPressureProfile(groups, signals)
    };

    console.log("🔥 SCENARIO RESULT:", scenarioResult);
    console.log("🔥 SCENARIO JSON:", JSON.stringify(scenarioResult, null, 2));

    const preview = generatePreview(scenarioResult);
    console.log('\n==============================');
    console.log('🧠 FINAL DIAGNOSTIC RESULT');

    console.log('branch =', scenarioResult?.branch);
    console.log('pressureLevel =', scenarioResult?.pressureLevel);
    console.log('scenario =', scenarioResult?.scenario);
    console.log('totalScore =', scenarioResult?.totalScore);

    // ⚠️ 重点：你的系统分数在 groups 里
    console.log('pressure_context_score =', groups?.pressure_context_score ?? 0);
    console.log('evidence_fragmentation_score =', groups?.evidence_fragmentation_score ?? 0);
    console.log('complexity_score =', groups?.complexity_score ?? 0);
    console.log('governance_strength_score =', groups?.governance_strength_score ?? 0);

    console.log('==============================\n');
    console.log("🔥 PREVIEW RESULT:", preview);
    console.log("🔥 PREVIEW META:", JSON.stringify(preview?.meta || {}, null, 2));
    console.log("🔥 PREVIEW JSON:", JSON.stringify(preview, null, 2));

    return res.json({
      success: true,
      version: "diagnostic-api-v2.1",
      hasScenario: !!scenarioResult,
      hasPreview: !!preview,
      scenario: scenarioResult,
      preview,
      groups,
      signals
    });
  } catch (error) {
    console.error("🔥 /diagnostic ERROR:", error);
    console.error(error.stack);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      detail: error.message
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Nimclea API running on http://localhost:${PORT}`);
});
