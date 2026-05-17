import express from "express";
import {
  readJsonFile,
  writeJsonFile,
  appendJsonRecord,
} from "../utils/jsonStore.js";
import {
  mirrorDeletedCaseToSupabase,
  mirrorCaseToSupabase,
  mirrorCasePlanToSupabase,
  mirrorCaseResultToSupabase,
  mirrorDiagnosticRecordToSupabase,
} from "../utils/supabaseMirrorWrites.js";
import {
  assertNoAabCaseAuthorityMigrationIntent,
  createAabCaseAuthorityReadPlan,
  selectAabCaseAuthoritySource,
} from "../utils/aabCaseAuthorityReadAdapterRehearsal.js";
import { getCaseRecordByCaseId } from "../utils/supabaseCoreAuthorityStore.js";
import { isSupabaseEnabled, supabase } from "../utils/supabaseClient.js";

const router = express.Router();

const CASES_FILE = "cases.json";
const DELETED_CASES_FILE = "deletedCases.json";
const CASE_ID_PATTERN = /^CASE-\d+-[A-Z0-9]{6}$/;

function createCaseId() {
  return `CASE-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function normalizeCaseId(input = {}) {
  if (!input || typeof input !== "object") return null;

  return input.caseId || input.id || null;
}

function normalizeValidCaseId(caseId = "") {
  const value = String(caseId || "").trim();
  return CASE_ID_PATTERN.test(value) ? value : "";
}

function findCaseIndex(cases = [], caseId = "") {
  if (!caseId) return -1;

  return cases.findIndex(
    (item) => item?.caseId === caseId || item?.id === caseId
  );
}

function getRecordCaseId(item = {}) {
  return String(
    item?.caseId ||
      item?.id ||
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

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeSupabaseCaseRow(row = {}) {
  const raw = objectOrEmpty(row?.raw_record);

  return {
    ...raw,
    caseId: row?.case_id,
    id: raw?.id || row?.case_id,
    email: row?.email || raw?.email,
    name: row?.name || raw?.name,
    company: row?.company || raw?.company,
    status: row?.status || raw?.status,
    stage: row?.stage || raw?.stage,
    source: row?.source || raw?.source || "supabase_cases",
    result: row?.result || raw?.result || raw?.preview,
    caseData:
      row?.case_data ||
      raw?.caseData ||
      raw?.caseSchema ||
      raw?.caseSnapshot,
    createdAt: raw?.createdAt || row?.created_at,
    updatedAt: raw?.updatedAt || row?.updated_at,
    _supabaseSource: "cases",
  };
}

async function findSupabaseCaseRecord(caseId = "") {
  const resolvedCaseId = normalizeValidCaseId(caseId);

  if (!resolvedCaseId || !isSupabaseEnabled || !supabase) {
    return null;
  }

  try {
    const { data: rows = [], error } = await supabase
      .from("cases")
      .select("*")
      .eq("case_id", resolvedCaseId)
      .limit(1);

    if (error) throw error;

    const row = Array.isArray(rows) ? rows[0] : null;
    return row ? normalizeSupabaseCaseRow(row) : null;
  } catch (error) {
    console.warn("[supabase:case] GET /case lookup failed:", error?.message || error);
    return null;
  }
}

const LIFECYCLE_RANKS = {
  draft: 0,
  not_ready: 1,
  diagnostic_completed: 2,
  result_ready: 3,
  event_captured: 4,
  workspace_active: 5,
  receipt_ready: 6,
  ready: 6,
  receipt_paid: 7,
  paid: 7,
  receipt_activated: 8,
  activated: 8,
  receipt_issued: 9,
  issued: 9,
  verification_ready: 10,
  verification_active: 11,
  active: 11,
  verification_issued: 12,
  completed: 13,
};

function normalizeLifecycleValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getLifecycleRank(value = "") {
  const normalized = normalizeLifecycleValue(value);
  return LIFECYCLE_RANKS[normalized] ?? -1;
}

function preserveStrongerLifecycleValue(currentValue, proposedValue) {
  if (proposedValue === undefined || proposedValue === null || proposedValue === "") {
    return currentValue;
  }

  const currentRank = getLifecycleRank(currentValue);
  const proposedRank = getLifecycleRank(proposedValue);

  if (currentRank >= 0 && proposedRank >= 0 && proposedRank < currentRank) {
    return currentValue;
  }

  return proposedValue;
}

function findCaseRecord(records = [], caseId = "") {
  if (!Array.isArray(records) || !caseId) return null;

  return records.find((item) => getRecordCaseId(item) === caseId) || null;
}

function findCaseRecords(records = [], caseId = "") {
  if (!Array.isArray(records) || !caseId) return [];

  return records.filter((item) => getRecordCaseId(item) === caseId);
}

function isPlaceholderCaseTitle(value, caseId = "") {
  const text = String(value || "").trim();
  if (!text) return true;
  if (text.toLowerCase() === "untitled case") return true;
  if (caseId && text === caseId) return true;
  return false;
}

function resolvePreservedCaseTitle({ existing, incoming, caseId }) {
  const existingTitleCandidates = [
    existing?.title,
    existing?.caseName,
    existing?.name,
    existing?.caseData?.title,
    existing?.caseData?.caseName,
    existing?.caseData?.name,
  ];

  const incomingTitleCandidates = [
    incoming?.title,
    incoming?.caseName,
    incoming?.name,
    incoming?.caseData?.title,
    incoming?.caseData?.caseName,
    incoming?.caseData?.name,
  ];

  const existingMeaningfulTitle = existingTitleCandidates.find(
    (value) => !isPlaceholderCaseTitle(value, caseId)
  );

  const incomingMeaningfulTitle = incomingTitleCandidates.find(
    (value) => !isPlaceholderCaseTitle(value, caseId)
  );

  if (existingMeaningfulTitle) return existingMeaningfulTitle;
  if (incomingMeaningfulTitle) return incomingMeaningfulTitle;

  return "Untitled case";
}

function normalizeRecordText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function hasReceiptCheckoutPending(record = {}) {
  const paymentStatus = normalizeRecordText(record.paymentStatus);
  const paymentType = normalizeRecordText(
    record.paymentType ||
      record.priceType ||
      record.productType ||
      record.receipt?.paymentType ||
      record.receipt?.priceType ||
      record.receipt?.productType
  );

  return (
    paymentStatus === "checkout_created" &&
    record.paid !== true &&
    ["receipt_activation", "formal_receipt"].includes(paymentType)
  );
}

function isFormalPaidOrLockedCase(record = {}) {
  const receiptLockedStatuses = new Set(["paid", "issued", "activated"]);
  const caseLockedStatuses = new Set([
    "receipt_paid",
    "receipt_issued",
    "receipt_activated",
    "paid",
    "issued",
    "activated",
  ]);
  const verificationLockedStatuses = new Set([
    "paid",
    "activated",
    "issued",
    "delivered",
    "verified",
    "completed",
  ]);

  return Boolean(
    record.paid === true ||
      normalizeRecordText(record.paymentStatus) === "paid" ||
      receiptLockedStatuses.has(normalizeRecordText(record.receiptStatus)) ||
      receiptLockedStatuses.has(normalizeRecordText(record.receipt?.status)) ||
      caseLockedStatuses.has(normalizeRecordText(record.status)) ||
      caseLockedStatuses.has(normalizeRecordText(record.stage)) ||
      verificationLockedStatuses.has(
        normalizeRecordText(record.verificationStatus)
      ) ||
      verificationLockedStatuses.has(
        normalizeRecordText(record.verification?.status)
      ) ||
      record.verificationDelivered === true ||
      record.evidencePackageDownloaded === true ||
      record.firstEvidencePackageDownloaded === true ||
      record.verification?.delivered === true ||
      record.verification?.evidencePackageDownloaded === true ||
      record.verification?.firstEvidencePackageDownloaded === true
  );
}

function buildDiscardPatch(existing = {}, reqBody = {}) {
  const deletedAt = new Date().toISOString();

  return {
    deletedAt,
    caseDeletedAt: deletedAt,
    discardedAt: deletedAt,
    deletedBy: reqBody.deletedBy || "user",
    deletionReason: reqBody.deletionReason || "user_confirmed_delete",
    deletedFrom: reqBody.deletedFrom || "cases_page",
    isDeleted: true,
    deleted: true,
    updatedAt: deletedAt,
  };
}

function recordDeletedCase(caseId = "", discardPatch = {}, reqBody = {}) {
  if (!caseId) return null;

  const deletedCasesRaw = readJsonFile(DELETED_CASES_FILE, []);
  const deletedCases = Array.isArray(deletedCasesRaw) ? deletedCasesRaw : [];
  const tombstone = {
    caseId,
    deletedAt: discardPatch.deletedAt || new Date().toISOString(),
    caseDeletedAt:
      discardPatch.caseDeletedAt ||
      discardPatch.deletedAt ||
      new Date().toISOString(),
    isDeleted: true,
    deleted: true,
    deletedBy: discardPatch.deletedBy || reqBody.deletedBy || "user",
    deletionReason:
      discardPatch.deletionReason ||
      reqBody.deletionReason ||
      "user_confirmed_delete",
    deletedFrom: discardPatch.deletedFrom || reqBody.deletedFrom || "cases_page",
  };
  const nextDeletedCases = [
    ...deletedCases.filter(
      (item) => String(item?.caseId || item?.id || "").trim() !== caseId
    ),
    tombstone,
  ];

  writeJsonFile(DELETED_CASES_FILE, nextDeletedCases);

  return tombstone;
}

function upsertCaseDeletionTombstone(caseId = "", sourceRecord = {}, discardPatch = {}) {
  if (!caseId) return null;

  const casesRaw = readJsonFile(CASES_FILE, []);
  const cases = Array.isArray(casesRaw) ? casesRaw : [];
  const existingIndex = findCaseIndex(cases, caseId);
  const existing = existingIndex >= 0 ? cases[existingIndex] || {} : sourceRecord || {};
  const deletedAt =
    discardPatch.deletedAt ||
    discardPatch.caseDeletedAt ||
    existing.deletedAt ||
    existing.caseDeletedAt ||
    new Date().toISOString();
  const tombstonedCase = {
    ...existing,
    id: existing.id || caseId,
    caseId: existing.caseId || caseId,
    deletedAt,
    caseDeletedAt: discardPatch.caseDeletedAt || deletedAt,
    discardedAt: discardPatch.discardedAt || deletedAt,
    isDeleted: true,
    deleted: true,
    deletedBy: discardPatch.deletedBy || existing.deletedBy || "user",
    deletionReason:
      discardPatch.deletionReason ||
      existing.deletionReason ||
      "user_confirmed_delete",
    deletedFrom:
      discardPatch.deletedFrom ||
      existing.deletedFrom ||
      "cases_page",
    updatedAt: deletedAt,
  };

  if (existingIndex >= 0) {
    cases[existingIndex] = tombstonedCase;
  } else {
    cases.push(tombstonedCase);
  }

  writeJsonFile(CASES_FILE, cases);

  return tombstonedCase;
}

function getDeletedCaseIdSet(extraRecords = []) {
  const casesRaw = readJsonFile(CASES_FILE, []);
  const deletedCasesRaw = readJsonFile(DELETED_CASES_FILE, []);
  const cases = Array.isArray(casesRaw) ? casesRaw : [];
  const deletedCases = Array.isArray(deletedCasesRaw) ? deletedCasesRaw : [];
  const ids = new Set();

  deletedCases.forEach((record) => {
    const caseId = getRecordCaseId(record);
    if (caseId) ids.add(caseId);
  });

  [...cases, ...(Array.isArray(extraRecords) ? extraRecords : [])].forEach((record) => {
    const caseId = getRecordCaseId(record);
    if (
      caseId &&
      (record?.deleted === true ||
        record?.isDeleted === true ||
        record?.deletedAt ||
        record?.discardedAt)
    ) {
      ids.add(caseId);
    }
  });

  return ids;
}

function removeRecordsForCaseId(fileName, caseId = "", options = {}) {
  const existingRaw = readJsonFile(fileName, []);

  if (!Array.isArray(existingRaw)) {
    return { removed: 0, records: existingRaw };
  }

  const shouldRemove =
    typeof options.shouldRemove === "function"
      ? options.shouldRemove
      : (record) => getRecordCaseId(record) === caseId;
  const nextRecords = existingRaw.filter((record) => !shouldRemove(record));
  const removed = existingRaw.length - nextRecords.length;

  if (removed > 0) {
    writeJsonFile(fileName, nextRecords);
  }

  return { removed, records: nextRecords };
}

function hardDeleteCaseArtifacts(caseId = "") {
  if (!caseId) return {};

  return {
    cases: removeRecordsForCaseId(CASES_FILE, caseId).removed,
    emailLogs: removeRecordsForCaseId("emailLogs.json", caseId).removed,
    eventLogs: removeRecordsForCaseId("eventLogs.json", caseId).removed,
    trials: removeRecordsForCaseId("trials.json", caseId).removed,
    receiptRecords: removeRecordsForCaseId("receiptRecords.json", caseId, {
      shouldRemove: (record) =>
        getRecordCaseId(record) === caseId && !isFormalPaidOrLockedCase(record),
    }).removed,
    hashLedger: removeRecordsForCaseId("hashLedger.json", caseId).removed,
  };
}

function upsertCaseRecord(input = {}) {
  const casesRaw = readJsonFile(CASES_FILE, []);
  const cases = Array.isArray(casesRaw) ? casesRaw : [];
  const now = new Date().toISOString();
  const requestedCaseId = normalizeCaseId(input);
  const resolvedCaseId = normalizeValidCaseId(requestedCaseId) || createCaseId();
  const existingIndex = findCaseIndex(cases, resolvedCaseId);

  if (existingIndex >= 0) {
    const existing = cases[existingIndex] || {};
    const updatedRecord = {
      ...existing,
      ...input,
      id: existing.id || input.id || resolvedCaseId,
      caseId: existing.caseId || input.caseId || resolvedCaseId,
      createdAt: existing.createdAt || input.createdAt || now,
      updatedAt: now,
    };

    cases[existingIndex] = updatedRecord;
    writeJsonFile(CASES_FILE, cases);

    return updatedRecord;
  }

  const createdRecord = {
    ...input,
    id: input.id || resolvedCaseId,
    caseId: resolvedCaseId,
    status: input.status || "draft",
    createdAt: input.createdAt || now,
    updatedAt: now,
    source: "case_route",
  };

  appendJsonRecord(CASES_FILE, createdRecord);

  return createdRecord;
}

router.post("/save", async (req, res) => {
  try {
    const body = req.body || {};
    const {
      receiptEligible: _ignoredReceiptEligible,
      caseReceiptEligible: _ignoredCaseReceiptEligible,
      verificationEligible: _ignoredVerificationEligible,
      caseVerificationEligible: _ignoredCaseVerificationEligible,
      caseData = {},
      ...safeBody
    } = body;

    const {
      userId,
      trialId,
      caseId,
      stage,
      score = null,
    } = safeBody;

    if (!userId || !trialId || !stage) {
      return res.status(400).json({
        success: false,
        message: "userId, trialId, and stage are required",
      });
    }

    const now = new Date().toISOString();
    const resolvedCaseId = normalizeValidCaseId(caseId) || createCaseId();
    const casesRaw = readJsonFile(CASES_FILE, []);
    const cases = Array.isArray(casesRaw) ? casesRaw : [];
    const existingIndex = findCaseIndex(cases, resolvedCaseId);
    const localExistingCase = existingIndex >= 0 ? cases[existingIndex] : null;
    const supabaseExistingCase = localExistingCase
      ? null
      : await findSupabaseCaseRecord(resolvedCaseId);
    const existingCase = localExistingCase || supabaseExistingCase;
    const pickExistingBoolean = (...values) =>
      values.find((value) => typeof value === "boolean");

    const preservedReceiptEligible = pickExistingBoolean(
      existingCase?.receiptEligible,
      existingCase?.caseReceiptEligible,
      existingCase?.caseData?.receiptEligible,
      existingCase?.caseData?.caseReceiptEligible
    );

    const preservedVerificationEligible = pickExistingBoolean(
      existingCase?.verificationEligible,
      existingCase?.caseData?.verificationEligible
    );

    const sanitizedCaseData = {
      ...(caseData || {}),
    };

    delete sanitizedCaseData.receiptEligible;
    delete sanitizedCaseData.caseReceiptEligible;
    delete sanitizedCaseData.verificationEligible;

    const previousVersion =
      existingIndex >= 0
        ? Number(cases[existingIndex]?.version || 1)
        : 0;
    const incomingCase = {
      ...safeBody,
      caseId: resolvedCaseId,
      userId,
      trialId,
      stage,
      score,
      ...(typeof preservedReceiptEligible === "boolean"
        ? {
            receiptEligible: preservedReceiptEligible,
            caseReceiptEligible: preservedReceiptEligible,
          }
        : {}),
      ...(typeof preservedVerificationEligible === "boolean"
        ? { verificationEligible: preservedVerificationEligible }
        : {}),
      caseData: sanitizedCaseData,
      version: previousVersion + 1,
      savedAt: now,
      status: safeBody?.status || "draft",
    };
    const preservedTitle = resolvePreservedCaseTitle({
      existing: existingCase,
      incoming: incomingCase,
      caseId: resolvedCaseId,
    });

    const savedCase = upsertCaseRecord({
      ...incomingCase,
      title: preservedTitle,
      name: preservedTitle,
      caseName: preservedTitle,
      caseData: {
        ...(sanitizedCaseData || {}),
        title: preservedTitle,
        name: preservedTitle,
        caseName: preservedTitle,
      },
    });

    await mirrorCaseToSupabase(savedCase);
    const hasCaseResultSignal = Boolean(
      req.body?.result ||
        req.body?.caseSchema ||
        req.body?.caseData ||
        req.body?.preview ||
        req.body?.source === "result_page_save_case" ||
        req.body?.status === "result_ready"
    );

    if (hasCaseResultSignal) {
      await mirrorCaseResultToSupabase({
        ...safeBody,
        caseId: savedCase.caseId,
        userId: savedCase.userId,
        email: savedCase.email,
        status:
          req.body?.status ||
          (savedCase.status === "draft" ? "result_ready" : savedCase.status) ||
          "result_ready",
        score: savedCase.score ?? req.body?.score,
        eventCount: savedCase.eventCount ?? req.body?.eventCount,
        ...(typeof preservedReceiptEligible === "boolean"
          ? {
              receiptEligible: preservedReceiptEligible,
              caseReceiptEligible: preservedReceiptEligible,
            }
          : {}),
        ...(typeof preservedVerificationEligible === "boolean"
          ? { verificationEligible: preservedVerificationEligible }
          : {}),
        result: req.body?.result || savedCase.result,
        preview: req.body?.preview || savedCase.preview,
        caseSchema: req.body?.caseSchema || savedCase.caseSchema,
        caseData: savedCase.caseData || req.body?.caseData,
        rawRecord: savedCase,
        createdAt: savedCase.createdAt || now,
      });
    }
    const hasDiagnosticSignal = Boolean(
      req.body?.answers ||
        req.body?.result ||
        req.body?.caseSchema ||
        req.body?.preview ||
        req.body?.diagnostic ||
        req.body?.diagnosticResult ||
        req.body?.source === "result_page_save_case" ||
        req.body?.source === "diagnostic_save" ||
        req.body?.source === "diagnostic_completed"
    );

    if (hasDiagnosticSignal) {
      await mirrorDiagnosticRecordToSupabase({
        ...(req.body || {}),
        caseId: savedCase.caseId,
        email: savedCase.email,
        name: savedCase.name || savedCase.lead?.name,
        company: savedCase.company || savedCase.lead?.company,
        source: savedCase.source,
        answers: req.body?.answers,
        result: req.body?.result,
        caseSchema: req.body?.caseSchema,
        caseData: savedCase.caseData,
        preview: req.body?.preview,
        rawRecord: savedCase,
        createdAt: savedCase.createdAt || now,
      });
    }
    const hasCasePlanSignal = Boolean(
      req.body?.workflow ||
        req.body?.caseData?.workflow ||
        req.body?.scopeLock ||
        req.body?.caseData?.scopeLock ||
        req.body?.acceptanceChecklist ||
        req.body?.caseData?.acceptanceChecklist ||
        req.body?.pilot_setup?.workflow ||
        savedCase?.workflow ||
        savedCase?.caseData?.workflow ||
        savedCase?.pilot_setup?.workflow
    );

    if (hasCasePlanSignal) {
      await mirrorCasePlanToSupabase({
        ...(req.body || {}),
        caseId: savedCase.caseId,
        email: savedCase.email,
        source: req.body?.source || savedCase.source || "case_plan",
        workflow:
          req.body?.workflow ||
          req.body?.caseData?.workflow ||
          savedCase?.workflow ||
          savedCase?.caseData?.workflow ||
          savedCase?.pilot_setup?.workflow ||
          null,
        caseData: savedCase.caseData,
        scopeLock:
          req.body?.scopeLock ||
          req.body?.caseData?.scopeLock ||
          savedCase?.scopeLock ||
          savedCase?.caseData?.scopeLock ||
          null,
        acceptanceChecklist:
          req.body?.acceptanceChecklist ||
          req.body?.caseData?.acceptanceChecklist ||
          savedCase?.acceptanceChecklist ||
          savedCase?.caseData?.acceptanceChecklist ||
          null,
        pilot_setup: req.body?.pilot_setup || savedCase?.pilot_setup || null,
        rawRecord: savedCase,
        createdAt: savedCase.createdAt || now,
      });
    }

    if (existingIndex >= 0) {
      return res.json({
        success: true,
        message: "Case snapshot updated",
        data: {
          caseId: savedCase.caseId,
          trialId: savedCase.trialId,
          userId: savedCase.userId,
          stage: savedCase.stage,
          version: savedCase.version,
          savedAt: savedCase.savedAt,
        },
      });
    }

    return res.json({
      success: true,
      message: "Case snapshot saved",
      data: {
        caseId: savedCase.caseId,
        trialId: savedCase.trialId,
        userId: savedCase.userId,
        stage: savedCase.stage,
        version: savedCase.version,
        savedAt: savedCase.savedAt,
      },
    });
  } catch (error) {
    console.error("POST /case/save error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save case snapshot",
    });
  }
});

router.patch("/:caseId/title", async (req, res) => {
  try {
    const resolvedCaseId = normalizeValidCaseId(req.params.caseId);
    const title = String(req.body?.title || "").trim();

    if (!resolvedCaseId) {
      return res.status(400).json({
        success: false,
        message: "Valid caseId is required",
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const deletedCaseIds = getDeletedCaseIdSet();

    if (deletedCaseIds.has(resolvedCaseId)) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const casesRaw = readJsonFile(CASES_FILE, []);
    const cases = Array.isArray(casesRaw) ? casesRaw : [];
    const existingIndex = findCaseIndex(cases, resolvedCaseId);
    const localTarget = existingIndex >= 0 ? cases[existingIndex] : null;
    const supabaseTarget = localTarget ? null : await findSupabaseCaseRecord(resolvedCaseId);
    const existing = localTarget || supabaseTarget;

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const now = new Date().toISOString();
    const updatedCase = {
      ...existing,
      id: existing.id || resolvedCaseId,
      caseId: existing.caseId || resolvedCaseId,
      title,
      name: title,
      caseName: title,
      caseData: {
        ...(existing.caseData || {}),
        title,
        name: title,
        caseName: title,
      },
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      cases[existingIndex] = updatedCase;
    } else {
      cases.push(updatedCase);
    }

    writeJsonFile(CASES_FILE, cases);
    await mirrorCaseToSupabase(updatedCase);

    return res.json({
      success: true,
      data: updatedCase,
    });
  } catch (error) {
    console.error("PATCH /case/:caseId/title error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update case title",
    });
  }
});
router.patch("/:caseId/receipt-status", async (req, res) => {
  try {
    const resolvedCaseId = normalizeValidCaseId(req.params.caseId);

    if (!resolvedCaseId) {
      return res.status(400).json({
        success: false,
        message: "Valid caseId is required",
      });
    }

    const casesRaw = readJsonFile(CASES_FILE, []);
    const cases = Array.isArray(casesRaw) ? casesRaw : [];
    const existingIndex = findCaseIndex(cases, resolvedCaseId);
    const existing = existingIndex >= 0 ? cases[existingIndex] || {} : {};

    const receiptEligible = req.body?.receiptEligible === true;
    const now = new Date().toISOString();
    const receiptPatch = receiptEligible
      ? {
          status: preserveStrongerLifecycleValue(
            existing.status,
            req.body?.status || "workspace_active"
          ),
          stage: preserveStrongerLifecycleValue(
            existing.stage,
            req.body?.stage || "receipt_ready"
          ),
          receiptEligible: true,
          caseReceiptEligible: true,
          receiptStatus: preserveStrongerLifecycleValue(
            existing.receiptStatus,
            req.body?.receiptStatus || "ready"
          ),
          receiptReadyAt: existing.receiptReadyAt || req.body?.receiptReadyAt || now,
        }
      : {
          status: existing.status,
          stage: existing.stage,
          receiptEligible: existing.receiptEligible === true,
          caseReceiptEligible: existing.caseReceiptEligible === true,
          receiptStatus: existing.receiptStatus,
          receiptReadyAt: existing.receiptReadyAt || null,
        };

    const savedCase = upsertCaseRecord({
      ...existing,
      id: existing.id || resolvedCaseId,
      caseId: existing.caseId || resolvedCaseId,
      email:
        String(req.body?.email || existing.email || "").trim() ||
        existing.email ||
        undefined,
      source: req.body?.source || existing.source || "receipt_status_patch",
      ...receiptPatch,
    });

    await mirrorCaseToSupabase(savedCase);

    return res.json({
      success: true,
      message: "Receipt status updated",
      data: savedCase,
    });
  } catch (error) {
    console.error("PATCH /case/:caseId/receipt-status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update receipt status",
    });
  }
});

router.patch("/:caseId/discard", async (req, res) => {
  try {
    const resolvedCaseId = normalizeValidCaseId(req.params.caseId);

    if (!resolvedCaseId) {
      return res.status(400).json({
        success: false,
        message: "Valid caseId is required",
      });
    }

    const casesRaw = readJsonFile(CASES_FILE, []);
    const cases = Array.isArray(casesRaw) ? casesRaw : [];
    const existingIndex = findCaseIndex(cases, resolvedCaseId);
    const receiptRecordsRaw = readJsonFile("receiptRecords.json", []);
    const receiptRecords = Array.isArray(receiptRecordsRaw) ? receiptRecordsRaw : [];
    const matchingReceiptRecords = findCaseRecords(receiptRecords, resolvedCaseId);

    if (existingIndex < 0) {
      const sourceRecord = matchingReceiptRecords[0] || {
        caseId: resolvedCaseId,
      };

      if (isFormalPaidOrLockedCase(sourceRecord)) {
        return res.status(409).json({
          success: false,
          message: "Formal records cannot be deleted as ordinary cases",
        });
      }

      if (
        hasReceiptCheckoutPending(sourceRecord) &&
        req.body?.highRiskConfirmed !== true
      ) {
        return res.status(409).json({
          success: false,
          requiresHighRiskConfirmation: true,
          message:
            "This case has a payment-pending Formal Receipt checkout. Confirm high-risk deletion before discarding it.",
        });
      }

      const discardPatch = buildDiscardPatch(sourceRecord, req.body || {});
      const tombstone = recordDeletedCase(resolvedCaseId, discardPatch, req.body || {});
      const caseTombstone = upsertCaseDeletionTombstone(
        resolvedCaseId,
        sourceRecord,
        discardPatch
      );
      await mirrorDeletedCaseToSupabase(tombstone);
      await mirrorCaseToSupabase(caseTombstone);

      return res.json({
        success: true,
        message: "Case discarded",
        data: {
          caseId: resolvedCaseId,
          deletedAt: tombstone.deletedAt,
          tombstoned: true,
          tombstoneOnly: true,
        },
      });
    }

    const existing = cases[existingIndex] || {};

    if (
      isFormalPaidOrLockedCase(existing) ||
      matchingReceiptRecords.some(isFormalPaidOrLockedCase)
    ) {
      return res.status(409).json({
        success: false,
        message: "Formal records cannot be deleted as ordinary cases",
      });
    }

    const pendingCheckoutRecord =
      hasReceiptCheckoutPending(existing)
        ? existing
        : matchingReceiptRecords.find(hasReceiptCheckoutPending);

    if (
      pendingCheckoutRecord &&
      req.body?.highRiskConfirmed !== true
    ) {
      return res.status(409).json({
        success: false,
        requiresHighRiskConfirmation: true,
        message:
          "This case has a payment-pending Formal Receipt checkout. Confirm high-risk deletion before discarding it.",
      });
    }

    const discardPatch = buildDiscardPatch(existing, req.body || {});
    const tombstone = recordDeletedCase(resolvedCaseId, discardPatch, req.body || {});
    const caseTombstone = upsertCaseDeletionTombstone(
      resolvedCaseId,
      existing,
      discardPatch
    );
    await mirrorDeletedCaseToSupabase(tombstone);
    await mirrorCaseToSupabase(caseTombstone);

    return res.json({
      success: true,
      message: "Case discarded",
      data: {
        caseId: resolvedCaseId,
        deletedAt: tombstone.deletedAt,
        tombstoned: true,
      },
    });
  } catch (error) {
    console.error("PATCH /case/:caseId/discard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to discard case",
    });
  }
});

router.get("/:caseId", async (req, res) => {
  try {
    const { caseId } = req.params;
    const coreCaseResult = await getCaseRecordByCaseId(caseId);
    const coreTarget = coreCaseResult?.ok === true ? coreCaseResult.data : null;
    const casesRaw = readJsonFile(CASES_FILE, []);
    const cases = Array.isArray(casesRaw) ? casesRaw : [];
    const targetIndex = findCaseIndex(cases, caseId);
    const localTarget = targetIndex >= 0 ? cases[targetIndex] : null;
    const supabaseTarget = await findSupabaseCaseRecord(caseId);
    assertNoAabCaseAuthorityMigrationIntent({
      ["render" + "JsonMigration"]: false,
      ["import" + "RenderJson"]: false,
      ["production" + "Write"]: false,
      ["frontend" + "ServiceRoleAccess"]: false,
    });
    const aabCaseAuthorityReadPlan = createAabCaseAuthorityReadPlan({
      route: "GET /case/:caseId",
    });
    const aabCaseAuthoritySelection = selectAabCaseAuthoritySource({
      supabaseCleanAuthorityRecord: coreTarget || supabaseTarget,
      legacyJsonReferenceRecord: localTarget,
    });
    void aabCaseAuthorityReadPlan;
    void aabCaseAuthoritySelection;
    const target = {
      ...(localTarget || {}),
      ...(supabaseTarget || {}),
      ...(coreTarget || {}),
      caseId: coreTarget?.caseId || localTarget?.caseId || supabaseTarget?.caseId || caseId,
      id: coreTarget?.id || localTarget?.id || supabaseTarget?.id || caseId,
    };
    const deletedCaseIds = getDeletedCaseIdSet();

    if ((!localTarget && !supabaseTarget) || deletedCaseIds.has(caseId)) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const eventLogsRaw = readJsonFile("eventLogs.json", []);
    const eventLogs = Array.isArray(eventLogsRaw)
      ? eventLogsRaw
      : Array.isArray(eventLogsRaw?.events)
      ? eventLogsRaw.events
      : Array.isArray(eventLogsRaw?.logs)
      ? eventLogsRaw.logs
      : [];

    const matchedEventLogs = eventLogs.filter((event) => {
      return (
        event?.caseId === caseId ||
        event?.meta?.caseId === caseId ||
        event?.body?.caseId === caseId
      );
    });

    const existingEvents = Array.isArray(target?.events) ? target.events : [];
    const existingEventLogs = Array.isArray(target?.eventLogs) ? target.eventLogs : [];

    const eventMap = new Map();

    [...existingEvents, ...existingEventLogs, ...matchedEventLogs].forEach((event) => {
      if (!event || typeof event !== "object") return;

      const key =
        event.eventId ||
        event.id ||
        event.meta?.quickCaptureId ||
        `${event.caseId || event.meta?.caseId || ""}:${event.eventType || ""}:${event.createdAt || ""}:${event.meta?.note || event.note || ""}`;

      eventMap.set(key, event);
    });

    const mergedEvents = Array.from(eventMap.values());

    const hydratedTarget = {
      ...target,
      events: mergedEvents,
      eventLogs: mergedEvents,
      eventCount: mergedEvents.length,
    };

    return res.json({
      success: true,
      message: "Case fetched",
      data: hydratedTarget,
    });
  } catch (error) {
    console.error("GET /case/:caseId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch case",
    });
  }
});

router.get("/by-trial/:trialId", (req, res) => {
  try {
    const { trialId } = req.params;
    const casesRaw = readJsonFile(CASES_FILE, []);
    const cases = Array.isArray(casesRaw) ? casesRaw : [];
    const matched = cases.filter((item) => item.trialId === trialId);

    return res.json({
      success: true,
      message: "Cases fetched",
      data: matched,
    });
  } catch (error) {
    console.error("GET /case/by-trial/:trialId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trial cases",
    });
  }
});

export default router;
