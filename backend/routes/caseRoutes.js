import express from "express";
import {
  readJsonFile,
  writeJsonFile,
  appendJsonRecord,
} from "../utils/jsonStore.js";
import {
  mirrorCaseToSupabase,
  mirrorCasePlanToSupabase,
  mirrorCaseResultToSupabase,
  mirrorDiagnosticRecordToSupabase,
} from "../utils/supabaseMirrorWrites.js";

const router = express.Router();

const CASES_FILE = "cases.json";
const CASE_ID_PATTERN = /^CASE-\d+-[A-Z0-9]{6}$/;
const UNPAID_ACTIVE_RECOVERY_DAYS = 30;
const UNPAID_PENDING_CHECKOUT_RECOVERY_DAYS = 60;

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

function normalizeRecordText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function addDaysIso(baseIso, days) {
  const date = new Date(baseIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
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

function getDiscardRetentionPolicy(existing = {}) {
  if (hasReceiptCheckoutPending(existing)) {
    return {
      retentionCategory: "unpaid_pending_checkout_60_days",
      recoveryDays: UNPAID_PENDING_CHECKOUT_RECOVERY_DAYS,
    };
  }

  return {
    retentionCategory: "unpaid_active_case_30_days",
    recoveryDays: UNPAID_ACTIVE_RECOVERY_DAYS,
  };
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
  const retentionPolicy = getDiscardRetentionPolicy(existing);
  const purgeAfter = addDaysIso(deletedAt, retentionPolicy.recoveryDays);

  return {
    deletedAt,
    discardedAt: deletedAt,
    deletedBy: reqBody.deletedBy || "user",
    deletionReason: reqBody.deletionReason || "user_confirmed_delete",
    deletedFrom: reqBody.deletedFrom || "cases_page",
    retentionCategory: retentionPolicy.retentionCategory,
    recoverableUntil: purgeAfter,
    purgeAfter,
    purgeStatus: "scheduled",
    paymentStatusAtDeletion: existing.paymentStatus || "",
    paymentTypeAtDeletion:
      existing.paymentType || existing.priceType || existing.productType || "",
    stripeSessionIdAtDeletion:
      existing.stripeSessionId ||
      existing.sessionId ||
      existing.checkoutSessionId ||
      "",
    isDeleted: true,
    deleted: true,
    updatedAt: deletedAt,
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
    const {
      userId,
      trialId,
      caseId,
      stage,
      score = null,
      receiptEligible = false,
      verificationEligible = false,
      caseData = {},
    } = req.body || {};

    if (!userId || !trialId || !stage) {
      return res.status(400).json({
        success: false,
        message: "userId, trialId, and stage are required",
      });
    }

    const now = new Date().toISOString();
    const resolvedCaseId = normalizeValidCaseId(caseId) || createCaseId();
    const cases = readJsonFile(CASES_FILE, []);
    const existingIndex = findCaseIndex(Array.isArray(cases) ? cases : [], resolvedCaseId);
    const previousVersion =
      existingIndex >= 0
        ? Number(cases[existingIndex]?.version || 1)
        : 0;

    const savedCase = upsertCaseRecord({
      ...(req.body || {}),
      caseId: resolvedCaseId,
      userId,
      trialId,
      stage,
      score,
      receiptEligible,
      verificationEligible,
      caseData,
      version: previousVersion + 1,
      savedAt: now,
      status: req.body?.status || "draft",
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
        ...(req.body || {}),
        caseId: savedCase.caseId,
        userId: savedCase.userId,
        email: savedCase.email,
        status:
          req.body?.status ||
          (savedCase.status === "draft" ? "result_ready" : savedCase.status) ||
          "result_ready",
        score: savedCase.score ?? req.body?.score,
        eventCount: savedCase.eventCount ?? req.body?.eventCount,
        receiptEligible: savedCase.receiptEligible,
        verificationEligible: savedCase.verificationEligible,
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

    if (existingIndex < 0) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const existing = cases[existingIndex] || {};

    if (isFormalPaidOrLockedCase(existing)) {
      return res.status(409).json({
        success: false,
        message: "Formal records cannot be deleted as ordinary cases",
      });
    }

    if (
      hasReceiptCheckoutPending(existing) &&
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
    const discardedCase = {
      ...existing,
      ...discardPatch,
      id: existing.id || resolvedCaseId,
      caseId: existing.caseId || resolvedCaseId,
    };

    cases[existingIndex] = discardedCase;
    writeJsonFile(CASES_FILE, cases);

    await mirrorCaseToSupabase(discardedCase);

    return res.json({
      success: true,
      message: "Case discarded",
      data: {
        caseId: resolvedCaseId,
        deletedAt: discardPatch.deletedAt,
        discardedAt: discardPatch.discardedAt,
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

router.get("/:caseId", (req, res) => {
  try {
    const { caseId } = req.params;
    const casesRaw = readJsonFile(CASES_FILE, []);
    const cases = Array.isArray(casesRaw) ? casesRaw : [];
    const targetIndex = findCaseIndex(cases, caseId);
    const target = targetIndex >= 0 ? cases[targetIndex] : null;

    if (!target) {
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
