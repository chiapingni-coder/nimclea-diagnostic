import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 按你自己的实际位置改这个路径
const EVENT_LOG_FILE = path.resolve(__dirname, "../data/eventLogs.json");

async function readEventLogsSafe() {
  try {
    const raw = await fs.readFile(EVENT_LOG_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.logs)) return parsed.logs;

    return [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

router.get("/events", async (req, res) => {
  try {
    const logs = await readEventLogsSafe();

    const sorted = [...logs].sort((a, b) => {
      const timeA = new Date(a?.timestamp || a?.createdAt || 0).getTime();
      const timeB = new Date(b?.timestamp || b?.createdAt || 0).getTime();
      return timeB - timeA;
    });

    res.json({
      ok: true,
      count: sorted.length,
      items: sorted.slice(0, 200), // 最小版先只返回最近200条
    });
  } catch (error) {
    console.error("[analytics/events] read failed:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to read event logs.",
    });
  }
});

export default router;