import express from "express";
import {
  readJsonFile,
  writeJsonFile,
  appendJsonRecord,
} from "../utils/jsonStore.js";

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

router.post("/save", (req, res) => {
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

    return res.json({
      success: true,
      message: "Case fetched",
      data: target,
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
