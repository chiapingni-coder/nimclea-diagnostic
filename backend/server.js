import 'dotenv/config';
console.log("🔥 THIS IS MY NEW SERVER");
console.log("🔥 SERVER.JS IS RUNNING");
import stripeRoutes from "./routes/stripe.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";
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
import trialStatusRoutes from "./routes/trialStatusRoutes.js";
import caseRoutes from "./routes/caseRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import hashLedgerRoutes from "./routes/hashLedgerRoutes.js";
import { ensureDataFiles } from "./utils/ensureDataFiles.js";
import { readJsonFile } from "./utils/jsonStore.js";
import { persistEmailRecord } from "./db/emailStore.js";
import { isSupabaseEnabled, supabase } from "./utils/supabaseClient.js";
import {
  getCaseRecordByCaseId,
  getCaseRecordsByEmail,
  isSupabaseCoreAuthorityEnabled,
} from "./utils/supabaseCoreAuthorityStore.js";
import {
  deriveMergedCaseEventCount,
  getCaseSortTime,
  getEffectivePaymentStatus,
  hasNestedCaseIdentityConflict,
  getRecordRichnessScore,
  mergeCaseEvents,
  normalizePaymentStatus,
  normalizeReceiptStatus,
  normalizeRecordSource,
  pickHigherStage,
  pickRicherCaseRecord,
  sanitizeCaseIdentity,
  pickStrongestPaymentStatus,
  pickStrongestReceiptStatus,
} from "./utils/caseAggregationHelpers.js";

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
app.use("/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookRoutes);
app.use(express.json());

app.use("/trial", trialRegisterRoutes);
app.use("/trial", trialStartRoutes);
app.use("/trial-status", trialStatusRoutes);
app.use("/case", caseRoutes);
app.use("/event", eventRoutes);

const DEFAULT_AUTHORITY_PROBE_EMAIL = "smoke+cases-existing-001@nimclea.test";
const DEFAULT_AUTHORITY_PROBE_CASE_ID = "00000000-0000-4000-8000-000000000024";
const AUTHORITY_PROBE_ALLOWED_CASE_IDS = new Set([
  "00000000-0000-4000-8000-000000000024",
  "00000000-0000-4000-8000-000000009401",
]);

function areRehearsalEndpointsEnabled() {
  return String(process.env.NIMCLEA_ENABLE_REHEARSAL_ENDPOINTS || "")
    .trim()
    .toLowerCase() === "true";
}

function sanitizeProbeError(error) {
  const rawMessage = String(error || "").trim();
  if (!rawMessage) return undefined;

  let message = rawMessage;
  [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_URL,
  ]
    .filter(Boolean)
    .forEach((value) => {
      message = message.split(value).join("[redacted]");
    });

  return message.slice(0, 240);
}

function summarizeProbeResult(result = {}) {
  return {
    ok: result.ok === true,
    disabled: result.disabled === true,
    reason: result.reason,
    error: sanitizeProbeError(result.error),
  };
}

app.get("/internal/rehearsal/authority-probe", async (req, res) => {
  if (!areRehearsalEndpointsEnabled()) {
    return res.status(404).json({ error: "not found" });
  }

  const email = String(req.query?.email || DEFAULT_AUTHORITY_PROBE_EMAIL)
    .trim()
    .toLowerCase();
  const caseId = String(req.query?.caseId || DEFAULT_AUTHORITY_PROBE_CASE_ID).trim();

  if (!email.endsWith("@nimclea.test")) {
    return res.status(400).json({ error: "fixture_email_required" });
  }

  if (!AUTHORITY_PROBE_ALLOWED_CASE_IDS.has(caseId)) {
    return res.status(400).json({ error: "fixture_case_id_required" });
  }

  const supabaseCoreAuthorityEnabled = isSupabaseCoreAuthorityEnabled();

  if (!supabaseCoreAuthorityEnabled) {
    return res.json({
      success: true,
      probe: "deployed_authority_availability",
      rehearsal: true,
      supabaseCoreAuthorityEnabled: false,
      emailLookup: {
        email,
        ok: false,
        disabled: true,
        reason: "supabase_disabled",
        count: 0,
        caseIds: [],
      },
      caseLookup: {
        requestedCaseId: caseId,
        ok: false,
        disabled: true,
        reason: "supabase_disabled",
        found: false,
      },
    });
  }

  const emailResult = await getCaseRecordsByEmail(email);
  const emailRows = Array.isArray(emailResult.data) ? emailResult.data : [];
  const caseIds = emailRows
    .map((row) => String(row?.case_id || "").trim())
    .filter(Boolean);

  const caseResult = await getCaseRecordByCaseId(caseId);
  const caseRow = caseResult?.data && typeof caseResult.data === "object"
    ? caseResult.data
    : null;
  const foundCaseId = String(caseRow?.case_id || "").trim();

  return res.json({
    success: true,
    probe: "deployed_authority_availability",
    rehearsal: true,
    supabaseCoreAuthorityEnabled: true,
    emailLookup: {
      email,
      ...summarizeProbeResult(emailResult),
      count: emailRows.length,
      caseIds,
    },
    caseLookup: {
      requestedCaseId: caseId,
      ...summarizeProbeResult(caseResult),
      found: Boolean(foundCaseId),
      ...(foundCaseId ? { caseId: foundCaseId } : {}),
    },
  });
});

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

function isProtectedFormalOverlayRecord(record = {}) {
  const paymentStatus = normalizePaymentStatus(
    record?.paymentStatus || record?.payment_status
  );
  const receiptStatus = normalizeReceiptStatus(
    record?.receiptStatus || record?.receipt?.status
  );
  const verificationStatus = String(
    record?.verificationStatus ||
      record?.verification_status ||
      record?.verification?.status ||
      ""
  )
    .trim()
    .toLowerCase();

  return Boolean(
    record?.paid === true ||
      ["paid", "activated", "issued"].includes(paymentStatus) ||
      ["issued", "activated"].includes(receiptStatus) ||
      ["paid", "ready", "issued", "activated"].includes(verificationStatus)
  );
}

const CANONICAL_CASE_SOURCES = new Set([
  "case_route",
  "cases_page",
  "case_save",
  "diagnostic",
  "diagnostic_completed",
  "diagnostic_save",
  "diagnostic_questionnaire",
  "questionnaire_diagnostic_completed",
  "resultpage",
  "result_page_save_case",
  "pilot_page",
  "pilot_page_case_name",
  "pilot_setup",
  "receipt_page",
  "receipt_page_repair",
]);

function isReceiptSnapshotSource(record = {}) {
  return normalizeRecordSource(record) === "receipt_snapshot";
}

function hasRealCanonicalCaseSource(record = {}) {
  const source = normalizeRecordSource(record);

  return Boolean(
    source && CANONICAL_CASE_SOURCES.has(source) && !isReceiptSnapshotSource(record)
  );
}

function canSeedWorkspaceCase(record = {}) {
  if (isReceiptSnapshotSource(record)) return false;
  if (record?._supabaseSource === "cases") return hasRealCanonicalCaseSource(record);
  return true;
}

function getEmailFromCaseRecord(record = {}) {
  return String(
    record?.email ||
      record?.ownerEmail ||
      record?.userEmail ||
      record?.contactEmail ||
      record?.lead?.email ||
      record?.metadata?.email ||
      record?.caseData?.email ||
      record?.preview?.email ||
      record?.result?.email ||
      record?.caseRecord?.email ||
      record?.caseRecord?.lead?.email ||
      record?.caseRecord?.caseData?.email ||
      record?.caseRecord?.preview?.email ||
      record?.caseRecord?.result?.email ||
      record?.caseSnapshot?.email ||
      record?.caseSnapshot?.lead?.email ||
      record?.caseSnapshot?.caseData?.email ||
      record?.caseSnapshot?.preview?.email ||
      record?.caseSnapshot?.result?.email ||
      record?.caseSnapshot?.caseRecord?.email ||
      record?.caseSnapshot?.caseRecord?.lead?.email ||
      record?.caseSnapshot?.caseRecord?.caseData?.email ||
      record?.caseSnapshot?.caseRecord?.preview?.email ||
      record?.caseSnapshot?.caseRecord?.result?.email ||
      ""
  )
    .trim()
    .toLowerCase();
}

function isUnpaidReceiptSnapshotArtifact(record = {}) {
  const paymentStatus = normalizePaymentStatus(record?.paymentStatus);
  const receiptStatus = normalizeReceiptStatus(record?.receiptStatus);
  const verificationStatus = String(record?.verificationStatus || "")
    .trim()
    .toLowerCase();

  return Boolean(
    isReceiptSnapshotSource(record) &&
      record?.paid !== true &&
      !["paid", "activated", "issued"].includes(paymentStatus) &&
      !["issued", "activated"].includes(receiptStatus) &&
      !["paid", "ready", "issued", "activated"].includes(verificationStatus)
  );
}

function normalizeCaseRecord(record = {}) {
  if (!record || typeof record !== "object") {
    return {};
  }

  const canonicalRecordCaseId = String(
    record?.caseId || record?.case_id || record?.id || ""
  ).trim();
  const rawSnapshot = record?.caseSnapshot || {};
  const rawNestedCaseRecord = rawSnapshot?.caseRecord || {};
  const rawNestedCaseData = record?.caseData || {};
  const snapshotCaseId = String(rawSnapshot?.caseId || "").trim();
  const snapshotRecordCaseId = String(rawNestedCaseRecord?.caseId || "").trim();
  const nestedCaseDataCaseId = String(rawNestedCaseData?.caseId || "").trim();
  const snapshotMatchesIdentity =
    !canonicalRecordCaseId ||
    ((!snapshotCaseId || snapshotCaseId === canonicalRecordCaseId) &&
      (!snapshotRecordCaseId || snapshotRecordCaseId === canonicalRecordCaseId));
  const caseDataMatchesIdentity =
    !canonicalRecordCaseId ||
    !nestedCaseDataCaseId ||
    nestedCaseDataCaseId === canonicalRecordCaseId;
  const snapshot = snapshotMatchesIdentity ? rawSnapshot : {};
  const nestedCaseRecord = snapshotMatchesIdentity ? rawNestedCaseRecord : {};
  const nestedCaseData = caseDataMatchesIdentity ? rawNestedCaseData : {};
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
  const flattenedCaseReceiptEligible =
    typeof record?.caseReceiptEligible === "boolean"
      ? record.caseReceiptEligible
      : typeof nestedCaseRecord?.caseReceiptEligible === "boolean"
        ? nestedCaseRecord.caseReceiptEligible
        : typeof nestedCaseData?.caseReceiptEligible === "boolean"
          ? nestedCaseData.caseReceiptEligible
          : flattenedReceiptEligible;
  const flattenedVerificationEligible =
    typeof record?.verificationEligible === "boolean"
      ? record.verificationEligible
      : typeof nestedCaseRecord?.verificationEligible === "boolean"
        ? nestedCaseRecord.verificationEligible
        : typeof nestedCaseData?.verificationEligible === "boolean"
          ? nestedCaseData.verificationEligible
          : false;
  const flattenedEventCount =
    typeof record?.eventCount === "number"
      ? record.eventCount
      : typeof snapshot?.eventCount === "number"
        ? snapshot.eventCount
        : mergedEvents.length;

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
    eventCount: flattenedEventCount,
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
    source:
      record?.source ||
      snapshot?.source ||
      nestedCaseRecord?.source ||
      nestedCaseData?.source,
    status:
      record?.status ||
      snapshot?.status ||
      nestedCaseRecord?.status ||
      nestedCaseData?.status,
    stage:
      record?.stage ||
      snapshot?.stage ||
      nestedCaseRecord?.stage ||
      nestedCaseData?.stage,
    currentStep:
      record?.currentStep ||
      snapshot?.currentStep ||
      nestedCaseRecord?.currentStep ||
      nestedCaseData?.currentStep,
    receiptEligible: flattenedReceiptEligible,
    caseReceiptEligible: flattenedCaseReceiptEligible,
    verificationEligible: flattenedVerificationEligible,
    updatedAt: record?.updatedAt || snapshot?.updatedAt || nestedCaseRecord?.updatedAt || nestedCaseData?.updatedAt,
    savedAt: record?.savedAt || snapshot?.savedAt || nestedCaseRecord?.savedAt || nestedCaseData?.savedAt,
    eventCount: flattenedEventCount,
  };
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeSupabaseCaseRow(row = {}) {
  const raw = objectOrEmpty(row?.raw_record);
  const caseData = objectOrEmpty(
    row?.case_data ||
      raw?.caseData ||
      raw?.caseSchema ||
      raw?.caseSnapshot
  );
  const eventCount =
    typeof raw?.eventCount === "number"
      ? raw.eventCount
      : Array.isArray(raw?.events)
        ? raw.events.length
        : Array.isArray(raw?.eventLogs)
          ? raw.eventLogs.length
          : 0;

  return {
    ...raw,
    caseId: row?.case_id,
    id: raw?.id || row?.case_id,
    email: row?.email || raw?.email,
    name: row?.name || raw?.name,
    company: row?.company || raw?.company,
    status: row?.status || raw?.status,
    stage: row?.stage || raw?.stage,
    currentStep: raw?.currentStep || caseData?.currentStep,
    source: row?.source || raw?.source || "supabase_cases",
    result: row?.result || raw?.result || raw?.preview,
    caseData,
    receiptEligible:
      typeof raw?.receiptEligible === "boolean"
        ? raw.receiptEligible
        : typeof caseData?.receiptEligible === "boolean"
          ? caseData.receiptEligible
          : false,
    caseReceiptEligible:
      typeof raw?.caseReceiptEligible === "boolean"
        ? raw.caseReceiptEligible
        : typeof caseData?.caseReceiptEligible === "boolean"
          ? caseData.caseReceiptEligible
          : false,
    verificationEligible:
      typeof raw?.verificationEligible === "boolean"
        ? raw.verificationEligible
        : typeof caseData?.verificationEligible === "boolean"
          ? caseData.verificationEligible
          : false,
    eventCount,
    savedAt: raw?.savedAt || row?.saved_at,
    createdAt: raw?.createdAt || row?.created_at,
    updatedAt: raw?.updatedAt || row?.updated_at,
    _supabaseSource: "cases",
  };
}

function normalizeSupabaseReceiptRow(row = {}) {
  const raw = objectOrEmpty(row?.raw_record || row?.raw_payload);

  return {
    ...raw,
    caseId: row?.case_id,
    id: raw?.id || row?.case_id,
    hash: row?.hash || row?.receipt_hash || raw?.hash,
    receiptHash: row?.receipt_hash || raw?.receiptHash,
    paymentStatus: row?.payment_status || raw?.paymentStatus,
    verificationStatus: row?.verification_status || raw?.verificationStatus,
    paid: row?.paid === true || raw?.paid === true,
    source: row?.source || raw?.source || "supabase_receipt",
    caseSnapshot: row?.case_snapshot || raw?.caseSnapshot,
    createdAt: raw?.createdAt || row?.created_at,
    updatedAt: raw?.updatedAt || row?.updated_at,
    _supabaseSource: "receipt_records",
  };
}

function normalizeSupabaseEventRow(row = {}) {
  const raw = objectOrEmpty(row?.raw_record);

  return {
    ...raw,
    eventId: row?.event_id,
    id: raw?.id || row?.event_id,
    caseId: row?.case_id,
    userId: row?.user_id || raw?.userId,
    trialId: row?.trial_id || raw?.trialId,
    eventType: row?.event_type || raw?.eventType || raw?.type,
    type: row?.event_type || raw?.type,
    page: row?.page || raw?.page,
    source: row?.source || raw?.source || "supabase_event",
    meta: row?.meta || raw?.meta || {},
    createdAt: raw?.createdAt || row?.created_at,
    timestamp: raw?.timestamp || row?.created_at,
    _supabaseSource: "event_logs",
  };
}

async function loadSupabaseDeletedCaseIds() {
  const ids = new Set();

  if (!isSupabaseEnabled || !supabase) {
    return ids;
  }

  try {
    const { data: rows = [], error } = await supabase
      .from("deleted_cases")
      .select("case_id");

    if (error) throw error;

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const caseId = String(row?.case_id || "").trim();
      if (caseId) ids.add(caseId);
    });
  } catch {
    console.warn("[supabase:/cases] deleted-case reader failed; using local denylist only");
  }

  return ids;
}

async function loadSupabaseCaseSourcesForEmail(email, deletedCaseIds = new Set()) {
  const emptySources = { cases: [], receiptRecords: [], eventLogs: [] };

  if (!isSupabaseEnabled || !supabase) {
    return emptySources;
  }

  try {
    const caseRecordsResult = await getCaseRecordsByEmail(email);
    let caseRows = [];

    if (caseRecordsResult.ok) {
      caseRows = caseRecordsResult.data;
    } else {
      const { data: fallbackCaseRows = [], error: casesError } = await supabase
        .from("cases")
        .select("*");

      if (casesError) throw casesError;
      caseRows = fallbackCaseRows;
    }

    const filteredCaseRows = (Array.isArray(caseRows) ? caseRows : []).filter((row) => {
      const normalizedRow = normalizeSupabaseCaseRow(row);
      const caseId = String(row?.case_id || normalizedRow?.caseId || "").trim();
      const rowEmail = getEmailFromCaseRecord(normalizedRow);

      return (
        rowEmail === email &&
        (!caseId || !deletedCaseIds.has(caseId))
      );
    });

    const caseIds = Array.from(
      new Set(
        filteredCaseRows
          .map((row) => String(row?.case_id || "").trim())
          .filter(Boolean)
      )
    );

    let receiptRows = [];
    let eventRows = [];

    if (caseIds.length > 0) {
      const { data: nextReceiptRows = [], error: receiptError } = await supabase
        .from("receipt_records")
        .select("*")
        .in("case_id", caseIds);

      if (receiptError) throw receiptError;
      receiptRows = Array.isArray(nextReceiptRows) ? nextReceiptRows : [];

      const { data: nextEventRows = [], error: eventError } = await supabase
        .from("event_logs")
        .select("*")
        .in("case_id", caseIds);

      if (eventError) throw eventError;
      eventRows = Array.isArray(nextEventRows) ? nextEventRows : [];
    }

    return {
      cases: filteredCaseRows.map(normalizeSupabaseCaseRow),
      receiptRecords: receiptRows
        .filter((row) => {
          const caseId = String(row?.case_id || "").trim();
          return !caseId || !deletedCaseIds.has(caseId);
        })
        .map(normalizeSupabaseReceiptRow),
      eventLogs: eventRows
        .filter((row) => {
          const caseId = String(row?.case_id || "").trim();
          return !caseId || !deletedCaseIds.has(caseId);
        })
        .map(normalizeSupabaseEventRow),
    };
  } catch {
    console.warn("[supabase:/cases] reader failed; using JSON fallback");
    return emptySources;
  }
}

function getCaseIdFromRecord(item = {}) {
  return String(
    item?.caseId ||
      item?.id ||
      item?.case_id ||
      item?.caseSnapshot?.caseId ||
      item?.caseSnapshot?.caseRecord?.caseId ||
      item?.caseData?.caseId ||
      item?.caseRecord?.caseId ||
      item?.meta?.caseId ||
      item?.meta?.case_id ||
      item?.body?.caseId ||
      item?.body?.case_id ||
      ""
  ).trim();
}

function isDeletedOrDiscardedCaseRecord(item = {}) {
  return Boolean(
    item?.deletedAt ||
      item?.discardedAt ||
      item?.caseDeletedAt ||
      item?.isDeleted === true ||
      item?.deleted === true
  );
}

function getDeletedCaseIds(records = []) {
  const ids = new Set();

  records.forEach((item) => {
    if (!isDeletedOrDiscardedCaseRecord(item)) return;

    const caseId = getCaseIdFromRecord(item);

    if (caseId) ids.add(caseId);
  });

  return ids;
}

function getDeletedCaseIdsFromTombstones(records = []) {
  const ids = new Set();

  records.forEach((item) => {
    const caseId = getCaseIdFromRecord(item);
    if (caseId) ids.add(caseId);
  });

  return ids;
}

async function getDeletedCaseIdSet(extraRecords = []) {
  const storedCases = readJsonFile("cases.json", []);
  const storedDeletedCases = readJsonFile("deletedCases.json", []);
  const cases = Array.isArray(storedCases) ? storedCases : [];
  const deletedCases = Array.isArray(storedDeletedCases) ? storedDeletedCases : [];
  const supabaseDeletedCaseIds = await loadSupabaseDeletedCaseIds();

  // Non-recoverable denylist: it only prevents orphan sources from rebuilding deleted cases.
  return new Set([
    ...getDeletedCaseIds(cases),
    ...getDeletedCaseIds(extraRecords),
    ...getDeletedCaseIdsFromTombstones(deletedCases),
    ...supabaseDeletedCaseIds,
  ]);
}

app.get("/cases", async (req, res) => {
  const email = String(req.query?.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ error: "email required" });
  }

  try {
    const storedLogs = readJsonFile("emailLogs.json", []);
    const storedCases = readJsonFile("cases.json", []);
    const storedReceiptRecords = readJsonFile("receiptRecords.json", []);
    const storedEventLogs = readJsonFile("eventLogs.json", []);
    const storedTrials = readJsonFile("trials.json", []);
    const storedSubscriptionRecords = readJsonFile("subscriptionRecords.json", []);
    const storedUsers = readJsonFile("users.json", []);

    const localLogs = Array.isArray(storedLogs) ? storedLogs : [];
    const localCases = Array.isArray(storedCases) ? storedCases : [];
    const localReceiptRecords = Array.isArray(storedReceiptRecords) ? storedReceiptRecords : [];
    const localEventLogs = Array.isArray(storedEventLogs)
      ? storedEventLogs
      : Array.isArray(storedEventLogs?.events)
      ? storedEventLogs.events
      : Array.isArray(storedEventLogs?.logs)
      ? storedEventLogs.logs
      : [];
    const localTrials = Array.isArray(storedTrials) ? storedTrials : [];
    const subscriptionRecords = Array.isArray(storedSubscriptionRecords)
      ? storedSubscriptionRecords
      : [];
    const users = Array.isArray(storedUsers) ? storedUsers : [];
    const localDeletedCaseIds = await getDeletedCaseIdSet([
      ...localLogs,
      ...localCases,
      ...localReceiptRecords,
      ...localEventLogs,
      ...localTrials,
    ]);
    const supabaseSources = await loadSupabaseCaseSourcesForEmail(email, localDeletedCaseIds);
    const deletedCaseIds = new Set([
      ...localDeletedCaseIds,
      ...getDeletedCaseIds(supabaseSources.cases),
      ...getDeletedCaseIds(supabaseSources.receiptRecords),
      ...getDeletedCaseIds(supabaseSources.eventLogs),
    ]);
    const isDeletedCaseRecord = (item = {}) => {
      const caseId = getCaseIdFromRecord(item);
      return Boolean(caseId && deletedCaseIds.has(caseId));
    };
    const filterDeletedCases = (records = []) =>
      (Array.isArray(records) ? records : []).filter((item) => !isDeletedCaseRecord(item));
    const logs = filterDeletedCases(localLogs);
    const cases = filterDeletedCases([...localCases, ...supabaseSources.cases]);
    const receiptRecords = filterDeletedCases([
      ...localReceiptRecords,
      ...supabaseSources.receiptRecords,
    ]);
    const eventLogs = filterDeletedCases([...localEventLogs, ...supabaseSources.eventLogs]);

    const caseIdOf = (item = {}) => getCaseIdFromRecord(item);

    const emailFromLog = (item = {}) =>
      String(
        item?.email ||
          item?.userEmail ||
          item?.leadEmail ||
          item?.contactEmail ||
          item?.captureEmail ||
          ""
      )
        .trim()
        .toLowerCase();

    const emailFromPersistedCase = getEmailFromCaseRecord;

    const latestSubscriptionRecord = subscriptionRecords
      .filter((item) => {
        const itemEmail = String(item?.email || "").trim().toLowerCase();
        return itemEmail && itemEmail === email;
      })
      .sort((a, b) => {
        const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
        return bTime - aTime;
      })[0] || null;

    const userSubscriptionRecord =
      users.find(
        (item) => String(item?.email || "").trim().toLowerCase() === email
      ) || null;

    const backendSubscription =
      latestSubscriptionRecord || userSubscriptionRecord?.subscription
        ? {
            ...(userSubscriptionRecord?.subscription || {}),
            ...(latestSubscriptionRecord || {}),
            _backendConfirmed:
              latestSubscriptionRecord?.source === "stripe_checkout_confirmed" ||
              userSubscriptionRecord?.subscription?.source === "stripe_checkout_confirmed",
          }
        : null;

    const canonicalCaseIds = new Set(
      cases
        .filter((item) => {
          return (
            emailFromPersistedCase(item) === email &&
            canSeedWorkspaceCase(item)
          );
        })
        .map(caseIdOf)
        .filter(Boolean)
    );

    const candidateMap = new Map();
    const addCandidate = (item = {}, options = {}) => {
      const caseId = caseIdOf(item);
      if (!caseId) return;
      if (deletedCaseIds.has(caseId)) return;
      const existing = candidateMap.get(caseId) || {};
      candidateMap.set(caseId, {
        ...existing,
        ...item,
        caseId,
        _hasCanonicalCaseSource:
          existing?._hasCanonicalCaseSource === true ||
          options.hasCanonicalCaseSource === true,
        _allowStandaloneReceiptRecord:
          existing?._allowStandaloneReceiptRecord === true ||
          options.allowStandaloneReceiptRecord === true,
      });
    };

    cases.forEach((item) => {
      const caseId = caseIdOf(item);
      if (!caseId) return;
      if (emailFromPersistedCase(item) !== email) return;
      if (isReceiptSnapshotSource(item)) return;

      addCandidate(item, { hasCanonicalCaseSource: true });
    });

    logs.forEach((item) => {
      const caseId = caseIdOf(item);
      if (emailFromLog(item) === email && canonicalCaseIds.has(caseId)) {
        addCandidate(item);
      }
    });

    cases.forEach((item) => {
      if (emailFromPersistedCase(item) !== email) return;

      if (canSeedWorkspaceCase(item)) {
        addCandidate(item, { hasCanonicalCaseSource: true });
        return;
      }

      if (isReceiptSnapshotSource(item) && isProtectedFormalOverlayRecord(item)) {
        addCandidate(item, { allowStandaloneReceiptRecord: true });
      }
    });

    receiptRecords.forEach((item) => {
      const rawCaseId = caseIdOf(item);
      if (hasNestedCaseIdentityConflict(item, rawCaseId)) return;

      const normalizedItem = normalizeCaseRecord(item);
      const caseId = caseIdOf(normalizedItem);
      const hasCanonicalCaseSource = canonicalCaseIds.has(caseId);
      const isProtectedFormalRecord = isProtectedFormalOverlayRecord(normalizedItem);
      const hasMatchingEmail =
        emailFromPersistedCase(item) === email ||
        emailFromPersistedCase(normalizedItem) === email;

      if (!hasMatchingEmail) return;

      if (hasCanonicalCaseSource) {
        addCandidate(normalizedItem);
        return;
      }

      if (isProtectedFormalRecord) {
        addCandidate(normalizedItem, { allowStandaloneReceiptRecord: true });
      }
    });

    const matches = Array.from(candidateMap.values())
      .map((item) => {
        const caseId = String(item?.caseId || item?.id || "").trim();
        const baseCase = findLastMatchingRecord(cases, caseId) || {};
        const rawReceiptCase = findLastMatchingRecord(receiptRecords, caseId) || {};
        const receiptCase = hasNestedCaseIdentityConflict(rawReceiptCase, caseId)
          ? {}
          : normalizeCaseRecord(rawReceiptCase);

        const matchedEventLogs = eventLogs.filter((event) => {
          return (
            event?.caseId === caseId ||
            event?.meta?.caseId === caseId ||
            event?.body?.caseId === caseId
          );
        });

        const mergedEvents = mergeCaseEvents(
          baseCase?.events,
          baseCase?.eventLogs,
          receiptCase?.events,
          receiptCase?.eventLogs,
          matchedEventLogs
        );
        const mergedEventCount = deriveMergedCaseEventCount(
          baseCase,
          receiptCase,
          mergedEvents
        );

        const isReceiptReady =
          baseCase?.receiptEligible === true ||
          receiptCase?.receiptEligible === true ||
          baseCase?.caseReceiptEligible === true ||
          receiptCase?.caseReceiptEligible === true ||
          baseCase?.receiptStatus === "ready" ||
          receiptCase?.receiptStatus === "ready" ||
          baseCase?.stage === "receipt_ready" ||
          receiptCase?.stage === "receipt_ready";
        const eventDerivedStage = mergedEventCount > 0 ? "event_captured" : "";
        const finalStage = pickHigherStage(
          item?.stage,
          item?.status,
          baseCase?.stage,
          baseCase?.status,
          receiptCase?.stage,
          receiptCase?.status,
          eventDerivedStage,
          isReceiptReady ? "receipt_ready" : ""
        );
        const finalStatus = finalStage || receiptCase?.status || baseCase?.status || item?.status || "draft";
        const matchingCaseRecords = cases.filter((record) => caseIdOf(record) === caseId);
        const finalPaymentStatus = pickStrongestPaymentStatus(
          ...matchingCaseRecords.map(getEffectivePaymentStatus),
          ...matchingCaseRecords.map((record) => record?.paymentStatus),
          getEffectivePaymentStatus(item),
          getEffectivePaymentStatus(baseCase),
          getEffectivePaymentStatus(receiptCase),
          item?.paymentStatus,
          baseCase?.paymentStatus,
          receiptCase?.paymentStatus
        );
        const finalPaid =
          finalPaymentStatus === "paid" ||
          matchingCaseRecords.some((record) => record?.paid === true) ||
          item?.paid === true ||
          baseCase?.paid === true ||
          receiptCase?.paid === true;
        const finalReceiptStatus = pickStrongestReceiptStatus(
          ...matchingCaseRecords.map((record) => record?.receiptStatus),
          ...matchingCaseRecords.map((record) => record?.receipt?.status),
          item?.receiptStatus,
          item?.receipt?.status,
          baseCase?.receiptStatus,
          baseCase?.receipt?.status,
          receiptCase?.receiptStatus,
          receiptCase?.receipt?.status,
          isReceiptReady ? "ready" : ""
        );

        const hasCanonicalBaseCase = item?._hasCanonicalCaseSource === true;
        const allowStandaloneReceiptRecord =
          item?._allowStandaloneReceiptRecord === true ||
          isProtectedFormalOverlayRecord(receiptCase) ||
          isProtectedFormalOverlayRecord(item);
        const hasPersistedCase = hasCanonicalBaseCase || allowStandaloneReceiptRecord;
        const isLegacyFirstCaseLog = item?.source === "cases_page_first_case";

        if (isLegacyFirstCaseLog && !hasPersistedCase) {
          return null;
        }

        const mergedCase = {
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
          ...item,
          ...baseCase,
          ...receiptCase,
          _supabaseSource:
            baseCase?._supabaseSource ||
            item?._supabaseSource ||
            receiptCase?._supabaseSource,
          status: finalStatus,
          paymentStatus: finalPaymentStatus || "unpaid",
          paid: finalPaid,
          stage: finalStage || undefined,
          events: mergedEvents.length > 0 ? mergedEvents : receiptCase?.events || baseCase?.events || [],
          eventLogs: mergedEvents.length > 0 ? mergedEvents : receiptCase?.eventLogs || baseCase?.eventLogs || [],
          entries: mergedEvents.length > 0 ? mergedEvents : receiptCase?.entries || baseCase?.entries || [],
          eventCount: mergedEventCount,
          email: item?.email || baseCase?.email || receiptCase?.email || email,
          caseId: caseId || receiptCase?.caseId || baseCase?.caseId || "",
          receiptEligible: isReceiptReady,
          caseReceiptEligible: isReceiptReady,
          receiptStatus: finalReceiptStatus || "",
          subscription: {
            ...(baseCase?.subscription || {}),
            ...(backendSubscription || {}),
          },
          pilotExtensionPaid:
            backendSubscription?._backendConfirmed === true &&
            backendSubscription?.pilotExtensionPaid === true,
          subscriptionStatus:
            backendSubscription?.subscriptionStatus ||
            baseCase?.subscriptionStatus ||
            "",
          pilotExtensionPaymentStatus:
            backendSubscription?.pilotExtensionPaymentStatus ||
            baseCase?.pilotExtensionPaymentStatus ||
            "",
        };

        return sanitizeCaseIdentity(mergedCase, caseId, email);
      })
      .filter((item) => {
        if (!item) return false;
        const caseId = caseIdOf(item);
        if (caseId && deletedCaseIds.has(caseId)) return false;

        if (
          isReceiptSnapshotSource(item) &&
          item?._hasCanonicalCaseSource !== true &&
          item?._allowStandaloneReceiptRecord !== true &&
          !isProtectedFormalOverlayRecord(item)
        ) {
          return false;
        }

        if (
          item?._supabaseSource === "receipt_records" &&
          item?._hasCanonicalCaseSource !== true &&
          item?._allowStandaloneReceiptRecord !== true &&
          !isProtectedFormalOverlayRecord(item)
        ) {
          return false;
        }

        return true;
      })
      .map((item) => {
        const {
          _hasCanonicalCaseSource,
          _allowStandaloneReceiptRecord,
          ...publicItem
        } = item;

        return publicItem;
      });

    const finalCaseMap = new Map();

    matches
      .filter((item) => !isUnpaidReceiptSnapshotArtifact(item))
      .forEach((item) => {
        const caseId = caseIdOf(item);
        if (!caseId || deletedCaseIds.has(caseId)) return;

        finalCaseMap.set(
          caseId,
          pickRicherCaseRecord(finalCaseMap.get(caseId) || {}, item)
        );
      });

    const durableCandidates = [...localCases, ...supabaseSources.cases];

    durableCandidates.forEach((item) => {
      const caseId = caseIdOf(item);
      if (!caseId) return;
      if (emailFromPersistedCase(item) !== email) return;
      if (isReceiptSnapshotSource(item)) return;
      if (isDeletedOrDiscardedCaseRecord(item)) return;

      const normalizedItem = normalizeCaseRecord(item);
      const sanitizedItem = sanitizeCaseIdentity(normalizedItem, caseId, email);
      finalCaseMap.set(
        caseId,
        pickRicherCaseRecord(finalCaseMap.get(caseId) || {}, {
          ...sanitizedItem,
          caseId,
          email,
          _hasCanonicalCaseSource: true,
        })
      );
    });

    // receipt_snapshot rows are overlay/protected-only and must not seed ordinary workspace cases.
    const finalCases = Array.from(finalCaseMap.values())
      .filter((item) => !isUnpaidReceiptSnapshotArtifact(item))
      .filter((item) => {
        const caseId = caseIdOf(item);
        return !caseId || !deletedCaseIds.has(caseId);
      })
      .sort((a, b) => getCaseSortTime(b) - getCaseSortTime(a))
      .map((item) => {
        const {
          _hasCanonicalCaseSource,
          _allowStandaloneReceiptRecord,
          ...publicItem
        } = item;

        return sanitizeCaseIdentity(publicItem, caseIdOf(publicItem), email);
      });

    return res.json(finalCases);
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
    const storedCases = readJsonFile("cases.json", []);

    const receiptRecords = Array.isArray(storedReceiptRecords)
      ? storedReceiptRecords
      : [];

    const cases = Array.isArray(storedCases) ? storedCases : [];

    const latestCase = normalizeCaseRecord(
      findLastMatchingRecord(cases, caseId) || {}
    );

    for (let index = receiptRecords.length - 1; index >= 0; index -= 1) {
      const record = receiptRecords[index];

      if (String(record?.caseId || "").trim() === caseId) {
        const receiptCase = normalizeCaseRecord(record);

        const mergedReceipt = {
          ...(receiptCase.receipt || {}),
          ...(latestCase.receipt || {}),
        };

        const isReceiptReady =
          mergedReceipt.decisionStatus === "READY FOR FORMAL DETERMINATION" ||
          mergedReceipt.receiptEligible === true ||
          latestCase.receiptEligible === true ||
          latestCase.caseReceiptEligible === true;

        return res.json({
          ...receiptCase,
          ...latestCase,
          caseId,
          receipt: mergedReceipt,
          decisionStatus:
            latestCase.decisionStatus ||
            receiptCase.decisionStatus ||
            mergedReceipt.decisionStatus ||
            "",
          receiptEligible: isReceiptReady,
          caseReceiptEligible: isReceiptReady,
          receiptStatus: isReceiptReady
            ? "ready"
            : latestCase.receiptStatus || receiptCase.receiptStatus || mergedReceipt.status || "",
          paymentStatus: getEffectivePaymentStatus(record),
          hash: receiptCase.hash || latestCase.hash || "",
          receiptHash:
            receiptCase.receiptHash ||
            latestCase.receiptHash ||
            receiptCase.hash ||
            latestCase.hash ||
            "",
          caseSnapshot: receiptCase.caseSnapshot || latestCase.caseSnapshot,
        });
      }
    }

    if (latestCase?.caseId || latestCase?.id) {
      return res.json({
        ...latestCase,
        caseId,
      });
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

    try {
      await persistEmailRecord({
        ...req.body,
        ...record,
        raw_payload: {
          ...req.body,
          ...record,
        },
      });
    } catch (dbError) {
      console.warn("[email-log] database write failed:", dbError?.message || dbError);
    }

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
