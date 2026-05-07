import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { appendJsonFile, makeId } from "../utils/fileStore.js";
import { persistEmailRecord } from "../db/emailStore.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emailLogsFile = path.join(__dirname, "../data/emailLogs.json");

router.post("/send", async (req, res) => {
  try {
    const {
      userId = "",
      trialId = "",
      to,
      emailType = "welcome",
      variables = {},
    } = req.body || {};

    if (!to || typeof to !== "string" || !to.trim()) {
      return res.status(400).json({
        success: false,
        message: "Recipient email is required",
      });
    }

    const normalizedTo = to.trim().toLowerCase();
    const now = new Date().toISOString();

    // 当前先做 mock send
    console.log("[MOCK EMAIL SEND]", {
      to: normalizedTo,
      emailType,
      variables,
    });

    const emailRecord = {
      emailLogId: makeId("mail"),
      userId,
      trialId,
      to: normalizedTo,
      emailType,
      variables,
      status: "sent_mock",
      sentAt: now,
    };

    appendJsonFile(emailLogsFile, emailRecord, []);

    try {
      await persistEmailRecord({
        ...req.body,
        ...emailRecord,
        source: emailType,
        raw_payload: {
          ...req.body,
          ...emailRecord,
        },
      });
    } catch (dbError) {
      console.warn("[email-send] database write failed:", dbError?.message || dbError);
    }

    return res.json({
      success: true,
      message: "Email sent",
      data: {
        emailLogId: emailRecord.emailLogId,
        emailType: emailRecord.emailType,
        to: emailRecord.to,
        status: emailRecord.status,
        sentAt: emailRecord.sentAt,
      },
    });
  } catch (error) {
    console.error("POST /email/send error:", error);
    return res.status(500).json({
      success: false,
      message: "Email sending failed",
    });
  }
});

export default router;
