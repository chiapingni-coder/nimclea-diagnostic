import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  appendJsonFile,
  makeId,
  readJsonFile,
  writeJsonFile,
} from "../utils/fileStore.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const casesFile = path.join(__dirname, "../data/cases.json");

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

    const cases = readJsonFile(casesFile, []);
    const resolvedCaseId = caseId || makeId("case");
    const existingIndex = cases.findIndex((item) => item.caseId === resolvedCaseId);

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const previousVersion = Number(cases[existingIndex]?.version || 1);

      cases[existingIndex] = {
        ...cases[existingIndex],
        userId,
        trialId,
        stage,
        score,
        receiptEligible,
        verificationEligible,
        caseData,
        version: previousVersion + 1,
        savedAt: now,
      };

      writeJsonFile(casesFile, cases);

      return res.json({
        success: true,
        message: "Case snapshot updated",
        data: {
          caseId: cases[existingIndex].caseId,
          trialId: cases[existingIndex].trialId,
          userId: cases[existingIndex].userId,
          stage: cases[existingIndex].stage,
          version: cases[existingIndex].version,
          savedAt: cases[existingIndex].savedAt,
        },
      });
    }

    const record = {
      caseId: resolvedCaseId,
      userId,
      trialId,
      stage,
      score,
      receiptEligible,
      verificationEligible,
      caseData,
      version: 1,
      savedAt: now,
    };

    appendJsonFile(casesFile, record, []);

    return res.json({
      success: true,
      message: "Case snapshot saved",
      data: {
        caseId: record.caseId,
        trialId: record.trialId,
        userId: record.userId,
        stage: record.stage,
        version: record.version,
        savedAt: record.savedAt,
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
    const cases = readJsonFile(casesFile, []);
    const target = cases.find((item) => item.caseId === caseId);

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
    const cases = readJsonFile(casesFile, []);
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