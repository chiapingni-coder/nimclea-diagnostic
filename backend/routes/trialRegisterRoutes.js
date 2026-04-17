import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { appendJsonFile, makeId, readJsonFile } from "../utils/fileStore.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usersFile = path.join(__dirname, "../data/users.json");
const trialsFile = path.join(__dirname, "../data/trials.json");

router.post("/register", (req, res) => {
  try {
    const { email, name = "", company = "" } = req.body || {};

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = readJsonFile(usersFile, []);
    const existingUser = users.find(
      (item) => item.email?.toLowerCase() === normalizedEmail
    );

    const now = new Date().toISOString();

    let userRecord = existingUser;
    if (!userRecord) {
      userRecord = {
        userId: makeId("usr"),
        email: normalizedEmail,
        name: typeof name === "string" ? name.trim() : "",
        company: typeof company === "string" ? company.trim() : "",
        createdAt: now,
      };
      appendJsonFile(usersFile, userRecord, []);
    }

    const trialRecord = {
      trialId: makeId("trial"),
      userId: userRecord.userId,
      status: "registered",
      createdAt: now,
      startedAt: null,
      expiresAt: null,
      trialSessionId: null,
    };

    appendJsonFile(trialsFile, trialRecord, []);

    return res.json({
      success: true,
      message: "Trial registration created",
      data: {
        userId: userRecord.userId,
        trialId: trialRecord.trialId,
        email: userRecord.email,
        name: userRecord.name,
        company: userRecord.company,
        status: trialRecord.status,
        createdAt: trialRecord.createdAt,
      },
    });
  } catch (error) {
    console.error("POST /trial/register error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register trial",
    });
  }
});

export default router;