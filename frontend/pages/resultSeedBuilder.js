// resultSeedBuilder.js
// Minimal safe builder for ResultPage / PilotPage seed data
// Goal: avoid white screen and provide stable fallback structure

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function safeArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function safeObject(value, fallback = {}) {
  return isObject(value) ? value : fallback;
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function normalizeRunCode(value) {
  const raw = safeString(value);
  if (!raw) return "RUN-UNMAPPED";

  const match = raw.match(/RUN[-_ ]?(\d{1,3})/i);
  if (match) {
    return `RUN${match[1].padStart(3, "0")}`;
  }

  return raw.toUpperCase();
}

function normalizeStage(value) {
  const raw = safeString(value);
  if (!raw) return "S0";

  const match = raw.match(/S(\d+)/i);
  if (match) {
    return `S${match[1]}`;
  }

  return raw.toUpperCase();
}

function normalizePattern(value) {
  const raw = safeString(value);
  if (!raw) return "PAT-UNKNOWN";

  const match = raw.match(/PAT[-_ ]?(\d{1,3})/i);
  if (match) {
    return `PAT-${match[1].padStart(3, "0")}`;
  }

  return raw.toUpperCase();
}

function normalizeScenario(value) {
  const raw = safeString(value);
  return raw || "scenario_default";
}

function normalizeScores(rawScores = {}) {
  const scores = safeObject(rawScores);

  return {
    evidence_fragmentation_score: Number(scores.evidence_fragmentation_score ?? 0),
    governance_strength_score: Number(scores.governance_strength_score ?? 0),
    complexity_score: Number(scores.complexity_score ?? 0),
    pressure_context_score: Number(scores.pressure_context_score ?? 0),
  };
}

function normalizeSignals(rawSignals) {
  if (Array.isArray(rawSignals)) {
    return rawSignals.filter(Boolean);
  }

  if (isObject(rawSignals)) {
    return Object.entries(rawSignals)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key);
  }

  return [];
}

function buildSummaryText({ patternCode, stageCode, runCode, scenarioKey }) {
  return (
    `This result suggests a structural decision pattern anchored in ${patternCode}, ` +
    `currently interpreted at ${stageCode}, with routing focus on ${runCode}. ` +
    `Scenario context: ${scenarioKey}.`
  );
}

function buildRecommendedAction({ stageCode, runCode }) {
  if (stageCode === "S1") {
    return "Clarify the trigger condition and stabilize the immediate decision boundary.";
  }

  if (stageCode === "S2") {
    return "Reduce ambiguity, align ownership, and collect the missing support signals.";
  }

  if (stageCode === "S3") {
    return "Translate the detected pattern into an executable pilot path with evidence checkpoints.";
  }

  if (stageCode === "S4") {
    return "Lock the decision path, reduce drift, and prepare receipt-ready execution.";
  }

  if (stageCode === "S5") {
    return "Confirm closure conditions, verify the output path, and protect against regression.";
  }

  return `Use ${runCode} as the next operational anchor and move into a structured pilot step.`;
}

function buildPilotSeed({ stageCode, runCode, patternCode, scenarioKey }) {
  return {
    recommended: true,
    pilotType: "7_DAY_PILOT",
    stageCode,
    runCode,
    patternCode,
    scenarioKey,
    entryAction: buildRecommendedAction({ stageCode, runCode }),
  };
}

export function buildResultSeed(source = {}) {
  const input = safeObject(source);

  const preview = safeObject(input.preview);
  const result = safeObject(input.result);
  const diagnostic = safeObject(input.diagnostic);
  const routing = safeObject(input.routing);
  const structure = safeObject(input.structure);

  const patternCode = normalizePattern(
    firstDefined(
      input.patternCode,
      input.pattern,
      preview.patternCode,
      preview.pattern,
      result.patternCode,
      result.pattern,
      diagnostic.patternCode,
      routing.patternCode,
      structure.patternCode
    )
  );

  const stageCode = normalizeStage(
    firstDefined(
      input.stageCode,
      input.stage,
      preview.stageCode,
      preview.stage,
      result.stageCode,
      result.stage,
      diagnostic.stageCode,
      routing.stageCode,
      structure.stageCode
    )
  );

  const runCode = normalizeRunCode(
    firstDefined(
      input.runCode,
      input.run,
      preview.runCode,
      preview.run,
      result.runCode,
      result.run,
      diagnostic.runCode,
      routing.runCode,
      structure.runCode
    )
  );

  const scenarioKey = normalizeScenario(
    firstDefined(
      input.scenarioKey,
      input.scenario,
      preview.scenarioKey,
      preview.scenario,
      result.scenarioKey,
      result.scenario,
      diagnostic.scenarioKey,
      structure.scenarioKey
    )
  );

  const scores = normalizeScores(
    firstDefined(
      input.scores,
      preview.scores,
      result.scores,
      diagnostic.scores,
      structure.scores,
      {}
    )
  );

  const signals = normalizeSignals(
    firstDefined(
      input.signals,
      preview.signals,
      result.signals,
      diagnostic.signals,
      structure.signals,
      []
    )
  );

  const title = firstDefined(
    input.title,
    preview.title,
    result.title,
    "Decision Risk Diagnostic Result"
  );

  const headline = firstDefined(
    input.headline,
    preview.headline,
    result.headline,
    `${patternCode} detected with ${stageCode} routing`
  );

  const summary = firstDefined(
    input.summary,
    preview.summary,
    result.summary,
    buildSummaryText({ patternCode, stageCode, runCode, scenarioKey })
  );

  const recommendedAction = firstDefined(
    input.recommendedAction,
    preview.recommendedAction,
    result.recommendedAction,
    buildRecommendedAction({ stageCode, runCode })
  );

  return {
    title,
    headline,
    summary,

    patternCode,
    stageCode,
    runCode,
    scenarioKey,

    scores,
    signals,

    recommendedAction,

    pilot: buildPilotSeed({
      stageCode,
      runCode,
      patternCode,
      scenarioKey,
    }),

    meta: {
      builderVersion: "result-seed-builder-v0.1",
      generatedAt: new Date().toISOString(),
      hasSignals: signals.length > 0,
      signalCount: signals.length,
    },
  };
}

export default buildResultSeed;