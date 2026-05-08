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

    const receiptEligible = req.body?.receiptEligible !== false;
    const now = new Date().toISOString();

    const savedCase = upsertCaseRecord({
      ...existing,
      ...(req.body || {}),
      id: existing.id || resolvedCaseId,
      caseId: existing.caseId || resolvedCaseId,
      status: req.body?.status || existing.status || "workspace_active",
      stage: req.body?.stage || existing.stage || "receipt_ready",
      receiptEligible,
      caseReceiptEligible: receiptEligible,
      receiptStatus: receiptEligible ? "ready" : "not_ready",
      receiptReadyAt: receiptEligible
        ? existing.receiptReadyAt || req.body?.receiptReadyAt || now
        : existing.receiptReadyAt || null,
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
