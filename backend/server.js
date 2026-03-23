console.log("🔥 THIS IS MY NEW SERVER");
console.log("🔥 SERVER.JS IS RUNNING");

// server.js
import express from "express";
import cors from "cors";
import questions from "./questions.js";
import runSignalEngine from "./engine/signalEngine.js";
import runScenarioEngine from "./scenarioEngine.js";
import generatePreview from "./previewGenerator.js";
// import { validateAnswersPayload } from "./validateAnswers.js";

function buildPressureProfile(groups = {}, signals = {}) {
  const pressureScore = Number(groups?.pressure_context_score || 0);

  let code = "low_pressure";
  let label = "Low Pressure Environment";

  if (pressureScore >= 9) {
    code = "critical_pressure";
    label = "Critical Pressure Environment";
  } else if (pressureScore >= 6) {
    code = "high_pressure";
    label = "High Pressure Environment";
  } else if (pressureScore >= 3) {
    code = "moderate_pressure";
    label = "Moderate Pressure Environment";
  }

  const activeSignalKeys = Object.entries(signals)
    .filter(([, value]) => typeof value === "number" && value > 0)
    .map(([key]) => key)
    .filter((key) =>
      [
        "external_pressure",
        "triggered_review_environment",
        "explainability_gap",
        "rule_drift",
        "metric_volatility",
        "incident_reconstruction",
        "approval_auditability",
      ].includes(key)
    );

  return {
    code,
    label,
    signals: activeSignalKeys,
  };
}

const app = express();

app.use(cors());
app.use(express.json());

function validateSubmittedAnswers(payload) {
  const answers = payload?.answers;

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return {
      ok: false,
      error: "Answers payload must be an object under req.body.answers",
      details: { received: answers }
    };
  }

  const submittedQuestionIds = Object.keys(answers);

  if (submittedQuestionIds.length === 0) {
    return {
      ok: false,
      error: "No answers submitted",
      details: { missing: [] }
    };
  }

  const missing = submittedQuestionIds.filter((id) => {
    const value = answers[id];

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    return {
      ok: false,
      error: "Missing required questions",
      details: { missing }
    };
  }

  return { ok: true };
}

// health check
app.get("/", (req, res) => {
  res.json({ status: "Nimclea Diagnostic API running" });
});

// questions
app.get("/questions", (req, res) => {
  res.json(questions);
});

// core diagnostic endpoint
app.post("/diagnostic", (req, res) => {
  try {
    const answers = req.body?.answers || {};

    console.log("🔥 RAW BODY:", req.body);
    console.log("🔥 ANSWERS ONLY:", JSON.stringify(answers, null, 2));

    const validation = validateSubmittedAnswers(req.body);
    console.log("🔥 VALIDATION RESULT:", validation);

    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        error: "Invalid diagnostic answers",
        details: validation.details || []
      });
    }

    const signalResult = runSignalEngine(answers);
    console.log("🔥 SIGNAL RESULT:", signalResult);

    const signals = signalResult?.signals || {};
    const groups = signalResult?.groups || {};

    console.log("🔥 SIGNALS ONLY:", JSON.stringify(signals, null, 2));
    console.log("🔥 GROUPS ONLY:", JSON.stringify(groups, null, 2));

    const baseScenarioResult = runScenarioEngine({
      signals,
      groups
    });

    const scenarioResult = {
      ...baseScenarioResult,
      pressureProfile:
        baseScenarioResult?.pressureProfile || buildPressureProfile(groups, signals)
    };

    console.log("🔥 SCENARIO RESULT:", scenarioResult);
    console.log("🔥 SCENARIO JSON:", JSON.stringify(scenarioResult, null, 2));

    const preview = generatePreview(scenarioResult);
    console.log('\n==============================');
    console.log('🧠 FINAL DIAGNOSTIC RESULT');

    console.log('branch =', scenarioResult?.branch);
    console.log('pressureLevel =', scenarioResult?.pressureLevel);
    console.log('scenario =', scenarioResult?.scenario);
    console.log('totalScore =', scenarioResult?.totalScore);

    // ⚠️ 重点：你的系统分数在 groups 里
    console.log('pressure_context_score =', groups?.pressure_context_score ?? 0);
    console.log('evidence_fragmentation_score =', groups?.evidence_fragmentation_score ?? 0);
    console.log('complexity_score =', groups?.complexity_score ?? 0);
    console.log('governance_strength_score =', groups?.governance_strength_score ?? 0);

    console.log('==============================\n');
    console.log("🔥 PREVIEW RESULT:", preview);
    console.log("🔥 PREVIEW META:", JSON.stringify(preview?.meta || {}, null, 2));
    console.log("🔥 PREVIEW JSON:", JSON.stringify(preview, null, 2));

    return res.json({
      success: true,
      version: "diagnostic-api-v2.1",
      hasScenario: !!scenarioResult,
      hasPreview: !!preview,
      scenario: scenarioResult,
      preview,
      groups,
      signals
    });
  } catch (error) {
    console.error("🔥 /diagnostic ERROR:", error);
    console.error(error.stack);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      detail: error.message
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Nimclea API running on http://localhost:${PORT}`);
});