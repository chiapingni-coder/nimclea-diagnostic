import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { makeId, readJsonFile, writeJsonFile } from "../utils/fileStore.js";
import {
  getSupabaseTrial,
  upsertSupabaseTrial,
} from "../utils/supabaseTrialStore.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const trialsFile = path.join(__dirname, "../data/trials.json");

router.post("/start", async (req, res) => {
  try {
    const { userId, trialId, entryPoint = "unknown", pcCode = "PC-CORE" } = req.body || {};
    const normalizedEmail =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!trialId || !userId) {
      return res.status(400).json({
        success: false,
        message: "userId and trialId are required",
      });
    }

    const trials = readJsonFile(trialsFile, []);
    const targetIndex = trials.findIndex(
      (item) => item.trialId === trialId && item.userId === userId
    );
    const supabaseLookup = await getSupabaseTrial({ trialId, userId });
    const supabaseTrial = supabaseLookup.record;

    if (targetIndex === -1 && !supabaseTrial) {
      return res.status(404).json({
        success: false,
        message: "Trial not found",
      });
    }

    const existingTrial =
      supabaseTrial ||
      trials[targetIndex] ||
      {};
    const existingStartedAt = existingTrial.startedAt || existingTrial.trialStartedAt || "";

    if (existingStartedAt) {
      const shouldBackfillEmail = Boolean(
        normalizedEmail && (!existingTrial.email || !existingTrial.userEmail)
      );
      const startedTrial = shouldBackfillEmail
        ? {
            ...existingTrial,
            email: existingTrial.email || normalizedEmail,
            userEmail: existingTrial.userEmail || normalizedEmail,
          }
        : existingTrial;

      if (shouldBackfillEmail) {
        if (targetIndex >= 0) {
          trials[targetIndex] = {
            ...trials[targetIndex],
            email: startedTrial.email,
            userEmail: startedTrial.userEmail,
          };
          writeJsonFile(trialsFile, trials);
        }
        await upsertSupabaseTrial(startedTrial);
      }

      return res.json({
        success: true,
        message: "Trial already started",
        data: {
          trialId: startedTrial.trialId,
          trialSessionId: startedTrial.trialSessionId,
          userId: startedTrial.userId,
          email: startedTrial.email,
          userEmail: startedTrial.userEmail,
          pcCode: startedTrial.pcCode,
          entryPoint: startedTrial.entryPoint,
          status: startedTrial.status,
          startedAt: startedTrial.startedAt || startedTrial.trialStartedAt,
          expiresAt: startedTrial.expiresAt || startedTrial.trialEndsAt,
        },
      });
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    const startedTrial = {
      ...existingTrial,
      trialSessionId: existingTrial.trialSessionId || makeId("ts"),
      email: normalizedEmail || existingTrial.email || existingTrial.userEmail || "",
      userEmail: normalizedEmail || existingTrial.userEmail || existingTrial.email || "",
      status: "active",
      entryPoint,
      pcCode,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    if (targetIndex >= 0) {
      trials[targetIndex] = startedTrial;
      writeJsonFile(trialsFile, trials);
    }

    await upsertSupabaseTrial(startedTrial);

    return res.json({
      success: true,
      message: "Trial started",
      data: {
        trialId: startedTrial.trialId,
        trialSessionId: startedTrial.trialSessionId,
        userId: startedTrial.userId,
        email: startedTrial.email,
        userEmail: startedTrial.userEmail,
        pcCode: startedTrial.pcCode,
        entryPoint: startedTrial.entryPoint,
        status: startedTrial.status,
        startedAt: startedTrial.startedAt,
        expiresAt: startedTrial.expiresAt,
      },
    });
  } catch (error) {
    console.error("POST /trial/start error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start trial",
    });
  }
});

export default router;
