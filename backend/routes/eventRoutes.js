import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { appendJsonFile, makeId, readJsonFile } from "../utils/fileStore.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventLogsFile = path.join(__dirname, "../data/eventLogs.json");
const EVENT_LOGS_PATH = path.resolve(__dirname, "../data/eventLogs.json");

router.post("/log", (req, res) => {
  try {
    const {
      userId = "",
      trialId = "",
      caseId = "",
      eventType,
      page = "",
      meta = {},
    } = req.body || {};

    if (!eventType || typeof eventType !== "string") {
      return res.status(400).json({
        success: false,
        message: "Event type is required",
      });
    }

    const record = {
      eventId: makeId("evt"),
      userId,
      trialId,
      caseId,
      eventType: eventType.trim(),
      page,
      meta: meta && typeof meta === "object" ? meta : {},
      createdAt: new Date().toISOString(),
    };

    appendJsonFile(eventLogsFile, record, []);

    return res.json({
      success: true,
      message: "Event logged",
      data: {
        eventId: record.eventId,
        eventType: record.eventType,
        page: record.page,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    console.error("POST /event/log error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to log event",
    });
  }
});

router.get("/by-trial/:trialId", (req, res) => {
  try {
    const { trialId } = req.params;
    const events = readJsonFile(eventLogsFile, []);
    const matched = events.filter((item) => item.trialId === trialId);

    return res.json({
      success: true,
      message: "Events fetched",
      data: matched,
    });
  } catch (error) {
    console.error("GET /event/by-trial/:trialId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
});

router.get("/logs", async (req, res) => {
  try {
    const raw = await fs.readFile(EVENT_LOGS_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return res.json({ events: parsed });
    }

    if (Array.isArray(parsed?.events)) {
      return res.json({ events: parsed.events });
    }

    return res.json({ events: [] });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.json({ events: [] });
    }

    return res.status(500).json({
      error: "Failed to read eventLogs.json",
      detail: error.message,
    });
  }
});

export default router;