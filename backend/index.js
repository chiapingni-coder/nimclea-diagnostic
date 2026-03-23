import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import QUESTION_VALUES from "./questionValues.js";
import SIGNAL_CALC_TABLE from "./signalCalcTable.js";
import generatePreview from "./previewGenerator.js";

const PORT = Number(process.env.PORT) || 3000;

const QUESTION_ORDER = [
  "Q1","Q2","Q3","Q4","Q5",
  "Q6","Q7","Q8","Q9","Q10",
  "Q11","Q12","Q13","Q14","Q15",
  "Q16","Q17","Q18","Q19","Q20"
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCENARIO_REGISTRY_PATH = path.join(__dirname, "scenarios.json");

const SCENARIO_REGISTRY = JSON.parse(
  fs.readFileSync(SCENARIO_REGISTRY_PATH, "utf-8")
);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });

  res.end(JSON.stringify(data, null, 2));
}

function sendEmpty(res, statusCode) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });

  res.end();
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getAllowedValuesMap() {
  const result = {};
  for (const qid of QUESTION_ORDER) {
    result[qid] = [...QUESTION_VALUES[qid]];
  }
  return result;
}

function getTieBreakPriority() {
  return Array.isArray(SCENARIO_REGISTRY.tie_break_priority)
    ? SCENARIO_REGISTRY.tie_break_priority
    : [];
}

function getTieBreakRank(group) {
  const priority = getTieBreakPriority();
  const index = priority.indexOf(group);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function compareGroups(a, b) {
  const scoreDiff = toSafeNumber(b.score) - toSafeNumber(a.score);
  if (scoreDiff !== 0) return scoreDiff;

  const rankDiff = getTieBreakRank(a.group) - getTieBreakRank(b.group);
  if (rankDiff !== 0) return rankDiff;

  return String(a.group).localeCompare(String(b.group));
}

function validateAnswers(answers) {
  const errors = [];
  const normalizedAnswers = {};

  if (!isPlainObject(answers)) {
    return {
      isValid: false,
      errors: [
        {
          code: "INVALID_ANSWERS_SHAPE",
          message: "answers must be a plain object keyed by Q1-Q20"
        }
      ],
      normalizedAnswers: {}
    };
  }

  for (const qid of QUESTION_ORDER) {
    if (!(qid in answers)) {
      errors.push({
        code: "MISSING_ANSWER",
        questionId: qid,
        message: `${qid} is required`
      });
      continue;
    }

    const value = answers[qid];

    if (qid === "Q1") {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          errors.push({
            code: "INVALID_ANSWER_VALUE",
            questionId: qid,
            value,
            allowedValues: QUESTION_VALUES[qid],
            message: `${qid} must contain at least one selected value`
          });
          continue;
        }

        const invalidValues = value.filter(
          (item) => typeof item !== "string" || !QUESTION_VALUES[qid].includes(item)
        );

        if (invalidValues.length > 0) {
          errors.push({
            code: "INVALID_ANSWER_VALUE",
            questionId: qid,
            value,
            allowedValues: QUESTION_VALUES[qid],
            message: `${qid} has an invalid value`
          });
          continue;
        }

        normalizedAnswers[qid] = value;
        continue;
      }

      if (typeof value === "string") {
        if (!QUESTION_VALUES[qid].includes(value)) {
          errors.push({
            code: "INVALID_ANSWER_VALUE",
            questionId: qid,
            value,
            allowedValues: QUESTION_VALUES[qid],
            message: `${qid} has an invalid value`
          });
          continue;
        }

        normalizedAnswers[qid] = value;
        continue;
      }

      errors.push({
        code: "INVALID_ANSWER_TYPE",
        questionId: qid,
        message: `${qid} must be a string or string array`
      });
      continue;
    }

    if (typeof value !== "string") {
      errors.push({
        code: "INVALID_ANSWER_TYPE",
        questionId: qid,
        message: `${qid} must be a string value`
      });
      continue;
    }

    if (!QUESTION_VALUES[qid].includes(value)) {
      errors.push({
        code: "INVALID_ANSWER_VALUE",
        questionId: qid,
        value,
        allowedValues: QUESTION_VALUES[qid],
        message: `${qid} has an invalid value`
      });
      continue;
    }

    normalizedAnswers[qid] = value;
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedAnswers
  };
}

function buildEmptyScores() {
  return {
    evidence_fragmentation_score: 0,
    governance_strength_score: 0,
    complexity_score: 0,
    pressure_context_score: 0
  };
}

function buildSignalAccumulator() {
  return {};
}

function accumulateSignal(signalScores, key, group, amount, triggerQuestion) {
  if (!key) return;

  if (!signalScores[key]) {
    signalScores[key] = {
      key,
      group: group || null,
      score: 0,
      triggerQuestions: []
    };
  }

  signalScores[key].score += toSafeNumber(amount);

  if (triggerQuestion && !signalScores[key].triggerQuestions.includes(triggerQuestion)) {
    signalScores[key].triggerQuestions.push(triggerQuestion);
  }
}

function calculateDiagnosticCore(answers) {
  const groupScores = buildEmptyScores();
  const signalScores = buildSignalAccumulator();
  const questionBreakdown = [];
  const triggerQuestions = [];
  let totalScore = 0;

  for (const qid of QUESTION_ORDER) {
    const answerValue = answers[qid];
    const questionTable = SIGNAL_CALC_TABLE[qid];

    if (!questionTable) {
      throw new Error(`Missing SIGNAL_CALC_TABLE entry for ${qid}`);
    }

    const answerValues = Array.isArray(answerValue) ? answerValue : [answerValue];

    for (const singleValue of answerValues) {
      const calc = questionTable[singleValue];

      if (!calc) {
        throw new Error(`No calc rule found for ${qid}.${singleValue}`);
      }

      const severity = toSafeNumber(calc.severity);
      const group = calc.group || null;
      const primary = calc.primary || null;
      const secondary = calc.secondary || null;

      totalScore += severity;

      if (group && Object.prototype.hasOwnProperty.call(groupScores, group)) {
        groupScores[group] += severity;
      }

      if (severity > 0 && !triggerQuestions.includes(qid)) {
        triggerQuestions.push(qid);
      }

      accumulateSignal(signalScores, primary, group, severity, qid);
      accumulateSignal(signalScores, secondary, group, severity, qid);

      questionBreakdown.push({
        questionId: qid,
        answer: singleValue,
        severity,
        primarySignal: primary,
        secondarySignal: secondary,
        group
      });
    }
  }

  const sortedGroups = Object.entries(groupScores)
    .map(([group, score]) => ({ group, score }))
    .sort(compareGroups);

  const primaryGroup = sortedGroups[0]?.group || null;
  const primaryGroupScore = toSafeNumber(sortedGroups[0]?.score);

  const sortedSignals = Object.values(signalScores)
    .filter((item) => toSafeNumber(item.score) > 0)
    .sort((a, b) => {
      const scoreDiff = toSafeNumber(b.score) - toSafeNumber(a.score);
      if (scoreDiff !== 0) return scoreDiff;
      return String(a.key).localeCompare(String(b.key));
    });

  return {
    totalScore,
    groupScores,
    groupRanking: sortedGroups,
    primaryGroup,
    primaryGroupScore,
    topSignals: sortedSignals.slice(0, 3),
    allSignals: sortedSignals,
    triggerQuestions,
    questionBreakdown
  };
}

function getScenarioEntries() {
  return Object.entries(SCENARIO_REGISTRY.scenarios || {});
}

function resolveScenarioByPrimaryGroup(primaryGroup, groupRanking) {
  const scenarios = getScenarioEntries();

  const directMatch = scenarios.find(([, scenario]) => {
    return scenario.primary_signal_group === primaryGroup;
  });

  if (directMatch) {
    const [scenarioId, scenario] = directMatch;
    return {
      scenarioId,
      ...scenario
    };
  }

  const tieBreakPriority = getTieBreakPriority();

  for (const preferredGroup of tieBreakPriority) {
    const rankedMatch = groupRanking.find((item) => item.group === preferredGroup);
    if (!rankedMatch) continue;

    const scenarioMatch = scenarios.find(([, scenario]) => {
      return scenario.primary_signal_group === preferredGroup;
    });

    if (scenarioMatch) {
      const [scenarioId, scenario] = scenarioMatch;
      return {
        scenarioId,
        ...scenario
      };
    }
  }

  return {
    scenarioId: null,
    code: null,
    label: "No Dominant Scenario",
    primary_signal_group: null,
    trigger_questions: []
  };
}

function deriveIntensityFromRegistry(totalScore) {
  const levels = Array.isArray(SCENARIO_REGISTRY.intensity_levels)
    ? SCENARIO_REGISTRY.intensity_levels
    : [];

  const matchedLevel = levels.find((level) => {
    return totalScore >= level.min_score && totalScore <= level.max_score;
  });

  if (matchedLevel) {
    return {
      level: matchedLevel.level,
      label: matchedLevel.label
    };
  }

  return {
    level: null,
    label: "Unknown Intensity"
  };
}

function getTopSignalPriorityKeys(scenarioMeta) {
  return Array.isArray(scenarioMeta.top_signal_priority)
    ? scenarioMeta.top_signal_priority
    : [];
}

function getTopSignalPriorityRank(signalKey, priorityKeys) {
  const index = priorityKeys.indexOf(signalKey);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function sortSignalsForScenario(signals, scenarioMeta) {
  const priorityKeys = getTopSignalPriorityKeys(scenarioMeta);

  return [...signals].sort((a, b) => {
    const rankDiff =
      getTopSignalPriorityRank(a.key, priorityKeys) -
      getTopSignalPriorityRank(b.key, priorityKeys);

    if (rankDiff !== 0) return rankDiff;

    const scoreDiff = toSafeNumber(b.score) - toSafeNumber(a.score);
    if (scoreDiff !== 0) return scoreDiff;

    return String(a.key).localeCompare(String(b.key));
  });
}

function buildScenarioResult(core) {
  const scenarioMeta = resolveScenarioByPrimaryGroup(
    core.primaryGroup,
    core.groupRanking
  );

  const intensity = deriveIntensityFromRegistry(core.totalScore);
  const scenarioAwareSignals = sortSignalsForScenario(core.allSignals, scenarioMeta);

  return {
    scenarioId: scenarioMeta.scenarioId,
    scenarioCode: scenarioMeta.code,
    scenarioLabel: scenarioMeta.label,
    intensity,
    primarySignalGroup: scenarioMeta.primary_signal_group || core.primaryGroup,
    primaryGroupScore: core.primaryGroupScore,
    totalScore: core.totalScore,
    topSignals: scenarioAwareSignals.slice(0, 3),
    topSignalsBeforeScenarioSort: core.topSignals,
    topSignalsAfterScenarioSort: scenarioAwareSignals.slice(0, 3),
    triggerQuestions: scenarioMeta.trigger_questions?.length
      ? scenarioMeta.trigger_questions
      : core.triggerQuestions,
    groupScores: core.groupScores,
    groupRanking: core.groupRanking,
    previewBlock: scenarioMeta.preview_block || null,
    primaryGroupCode: scenarioMeta.primary_group_code || null,
    topSignalPriority: scenarioMeta.top_signal_priority || [],
    tieBreakPriority: getTieBreakPriority()
  };
}

function runDiagnostic(answers) {
  const core = calculateDiagnosticCore(answers);
  const scenarioResult = buildScenarioResult(core);
  const preview = generatePreview({ scenarioResult });

  return {
    version: "diagnostic-api-v2.2",
    inputAnswers: answers,
    diagnosticCore: core,
    scenarioResult,
    preview
  };
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();

      if (body.length > 1_000_000) {
        reject(new Error("REQUEST_BODY_TOO_LARGE"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("INVALID_JSON_BODY"));
      }
    });

    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return sendEmpty(res, 200);
  }

  if (req.method === "GET" && req.url === "/") {
    return sendJson(res, 200, {
      message: "Nimclea Diagnostic API running",
      version: "diagnostic-api-v2.2",
      routes: {
        health: "GET /health",
        diagnostic: "POST /diagnostic",
        schema: "GET /diagnostic/schema"
      }
    });
  }

  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "nimclea-diagnostic-api",
      version: "diagnostic-api-v2.2"
    });
  }

  if (req.method === "GET" && req.url === "/diagnostic/schema") {
    return sendJson(res, 200, {
      questions: getAllowedValuesMap()
    });
  }

  if (req.method === "POST" && req.url === "/diagnostic") {
    try {
      const parsedBody = await parseRequestBody(req);
      const answers = parsedBody?.answers;

      const validation = validateAnswers(answers);

      if (!validation.isValid) {
        return sendJson(res, 400, {
          error: "Invalid diagnostic answers",
          details: validation.errors
        });
      }

      const diagnosticResult = runDiagnostic(validation.normalizedAnswers);

      return sendJson(res, 200, diagnosticResult);
    } catch (error) {
      if (error.message === "INVALID_JSON_BODY") {
        return sendJson(res, 400, {
          error: "Invalid JSON body"
        });
      }

      if (error.message === "REQUEST_BODY_TOO_LARGE") {
        return sendJson(res, 413, {
          error: "Request body too large"
        });
      }

      return sendJson(res, 500, {
        error: "Internal server error",
        message: error.message
      });
    }
  }

  return sendJson(res, 404, {
    error: "Route not found"
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});