// signalEngine.js
// Nimclea Diagnostic Signal Engine v1.2
// ESM version
//
// Stable version:
// 1. group keys align with scenarioEngine.js
// 2. signal keys align with signalCalcTable.js
// 3. per-question multi-select aggregation uses MAX instead of raw +=
// 4. secondary can be null
// 5. stronger schema validation for SIGNAL_CALC_TABLE

import QUESTION_VALUES from "../questionValues.js";
import SIGNAL_CALC_TABLE from "../signalCalcTable.js";
import { getSignalContent } from "../signalContentMap.js";

const GROUP_KEYS = [
  "evidence_fragmentation_score",
  "governance_strength_score",
  "complexity_score",
  "pressure_context_score"
];

const SIGNAL_KEYS = [
  "external_pressure",
  "triggered_review_environment",
  "explainability_gap",
  "change_clarity",
  "rule_drift",
  "metric_volatility",
  "evidence_readiness",
  "retrieval_friction",
  "traceability_gap",
  "approval_auditability",
  "evidence_fragmentation",
  "storage_chaos",
  "verification_cadence",
  "governance_discipline",
  "governance_formality",
  "control_strength",
  "coordination_complexity",
  "boundary_density",
  "first_retrieval_path",
  "evidence_search_chaos",
  "version_drift",
  "team_misalignment",
  "reconstruction_burden",
  "hidden_process_debt",
  "authority_clarity",
  "ownership_strength",
  "incident_reconstruction",
  "causal_trace_quality",
  "change_governance_maturity",
  "process_repeatability",
  "semantic_misalignment",
  "definition_conflict",
  "handoff_integrity",
  "boundary_clarity",
  "multi_system_coupling",
  "integration_burden",
  "dominant_failure_mode",
  "pressure_revealed_weak_point"
];

const QUESTION_WEIGHT_PROFILE = {
  // 过大题：削峰
  Q1:  { primaryMultiplier: 0.75, secondaryMultiplier: 0.50, groupMultiplier: 0.75, maxScore: 2 },
  Q9:  { primaryMultiplier: 0.85, secondaryMultiplier: 0.65, groupMultiplier: 0.90, maxScore: 3 },
  Q13: { primaryMultiplier: 1.00, secondaryMultiplier: 0.60, groupMultiplier: 0.90, maxScore: 3 },

  // 过小题：补权
  Q5:  { primaryMultiplier: 1.25, secondaryMultiplier: 1.10, groupMultiplier: 1.15, maxScore: 3 },
  Q7:  { primaryMultiplier: 1.15, secondaryMultiplier: 1.00, groupMultiplier: 1.10, maxScore: 2 },
  Q12: { primaryMultiplier: 1.15, secondaryMultiplier: 1.05, groupMultiplier: 1.10, maxScore: 2 },
  Q15: { primaryMultiplier: 1.25, secondaryMultiplier: 1.10, groupMultiplier: 1.20, maxScore: 3 },
  Q17: { primaryMultiplier: 1.20, secondaryMultiplier: 1.10, groupMultiplier: 1.10, maxScore: 3 },
  Q20: { primaryMultiplier: 1.10, secondaryMultiplier: 1.00, groupMultiplier: 1.00, maxScore: 2 },

  // 轻微微调
  Q18: { primaryMultiplier: 1.05, secondaryMultiplier: 1.00, groupMultiplier: 1.00, maxScore: 2 },

  // 其他题默认不调
  DEFAULT: {
    primaryMultiplier: 1,
    secondaryMultiplier: 1,
    groupMultiplier: 1,
    maxScore: 3
  }
};

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getQuestionWeightProfile(questionId) {
  return QUESTION_WEIGHT_PROFILE[questionId] || QUESTION_WEIGHT_PROFILE.DEFAULT;
}

function getWeightedScore(baseSeverity, multiplier = 1, maxScore = 3) {
  const raw = Math.round(toSafeNumber(baseSeverity) * multiplier);
  return Math.max(0, Math.min(maxScore, raw));
}

function createEmptySignals() {
  return Object.fromEntries(SIGNAL_KEYS.map((key) => [key, 0]));
}

function createEmptyGroups() {
  return {
    evidence_fragmentation_score: 0,
    governance_strength_score: 0,
    complexity_score: 0,
    pressure_context_score: 0
  };
}

function getQuestionConfig(questionId) {
  return QUESTION_VALUES?.[questionId] ?? null;
}

function getAllowedValuesFromQuestionConfig(questionConfig) {
  if (!questionConfig) return null;

  if (Array.isArray(questionConfig)) {
    return questionConfig.map((item) => {
      if (isPlainObject(item) && "value" in item) return String(item.value);
      return String(item);
    });
  }

  if (Array.isArray(questionConfig.values)) {
    return questionConfig.values.map((item) => {
      if (isPlainObject(item) && "value" in item) return String(item.value);
      return String(item);
    });
  }

  if (isPlainObject(questionConfig.options)) {
    return Object.keys(questionConfig.options).map(String);
  }

  if (Array.isArray(questionConfig.options)) {
    return questionConfig.options.map((item) => {
      if (isPlainObject(item) && "value" in item) return String(item.value);
      return String(item);
    });
  }

  return null;
}

function normalizeAnswerToArray(answerValue) {
  if (Array.isArray(answerValue)) {
    return answerValue
      .filter((item) => item !== undefined && item !== null && item !== "")
      .map((item) => String(item));
  }

  if (answerValue === undefined || answerValue === null || answerValue === "") {
    return [];
  }

  return [String(answerValue)];
}

function validateAnswer(questionId, answerValue) {
  const questionConfig = getQuestionConfig(questionId);
  const normalizedValues = normalizeAnswerToArray(answerValue);

  if (normalizedValues.length === 0) {
    return [];
  }

  const allowedValues = getAllowedValuesFromQuestionConfig(questionConfig);

  if (!allowedValues || allowedValues.length === 0) {
    return normalizedValues;
  }

  for (const value of normalizedValues) {
    if (!allowedValues.includes(value)) {
      throw new Error(
        `Invalid answer value for ${questionId}: '${value}'. Allowed: ${allowedValues.join(", ")}`
      );
    }
  }

  return normalizedValues;
}

function validateRuleShape(rule, questionId, value, signals, groups) {
  if (!isPlainObject(rule)) {
    throw new Error(
      `Invalid SIGNAL_CALC_TABLE rule for ${questionId}: ${value}. Rule must be an object.`
    );
  }

  const { severity, primary, secondary, group } = rule;

  if (typeof severity !== "number") {
    throw new Error(
      `Invalid severity in SIGNAL_CALC_TABLE for ${questionId}: ${value}`
    );
  }

  if (typeof primary !== "string" || !(primary in signals)) {
    throw new Error(
      `Unknown primary signal '${primary}' in SIGNAL_CALC_TABLE for ${questionId}: ${value}`
    );
  }

  if (secondary !== null && secondary !== undefined) {
    if (typeof secondary !== "string" || !(secondary in signals)) {
      throw new Error(
        `Unknown secondary signal '${secondary}' in SIGNAL_CALC_TABLE for ${questionId}: ${value}`
      );
    }
  }

  if (typeof group !== "string" || !(group in groups)) {
    throw new Error(
      `Unknown group '${group}' in SIGNAL_CALC_TABLE for ${questionId}: ${value}`
    );
  }

  return {
    severity,
    primary,
    secondary: secondary ?? null,
    group
  };
}

function getRule(questionId, value, signals, groups) {
  const rule = SIGNAL_CALC_TABLE?.[questionId]?.[value];

  if (!rule) {
    throw new Error(
      `Missing SIGNAL_CALC_TABLE rule for ${questionId}: ${value}`
    );
  }

  return validateRuleShape(rule, questionId, value, signals, groups);
}

function applyQuestionLevelAggregation(normalizedValues, questionId, signals, groups) {
  const questionSignalMax = {};
  const questionGroupMax = {};

  const {
    primaryMultiplier,
    secondaryMultiplier,
    groupMultiplier,
    maxScore
  } = getQuestionWeightProfile(questionId);

  for (const value of normalizedValues) {
    const { severity, primary, secondary, group } = getRule(
      questionId,
      value,
      signals,
      groups
    );

    const weightedPrimary = getWeightedScore(
      severity,
      primaryMultiplier,
      maxScore
    );

    const weightedSecondary = getWeightedScore(
      severity,
      secondaryMultiplier,
      maxScore
    );

    const weightedGroup = getWeightedScore(
      severity,
      groupMultiplier,
      maxScore
    );

    questionSignalMax[primary] = Math.max(
      toSafeNumber(questionSignalMax[primary]),
      weightedPrimary
    );

    if (secondary !== null) {
      questionSignalMax[secondary] = Math.max(
        toSafeNumber(questionSignalMax[secondary]),
        weightedSecondary
      );
    }

    questionGroupMax[group] = Math.max(
      toSafeNumber(questionGroupMax[group]),
      weightedGroup
    );
  }

  for (const [signalKey, score] of Object.entries(questionSignalMax)) {
    signals[signalKey] += score;
  }

  for (const [groupKey, score] of Object.entries(questionGroupMax)) {
    groups[groupKey] += score;
  }
}

function buildTopSignals(signals, limit = 4) {
  return Object.entries(signals)
    .map(([key, score]) => {
      const content = getSignalContent(key);

      return {
        key,
        score: toSafeNumber(score),
        label: content.label,
        description: content.description,
        whyThisMatters: content.whyThisMatters,
        insight: content.insight
      };
    })
    .filter((signal) => signal.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function calculateSignalsWithContent(rawAnswers = {}, limit = 4) {
  const { signals, groups } = calculateSignals(rawAnswers);
  const topSignals = buildTopSignals(signals, limit);

  return {
    signals,
    groups,
    topSignals
  };
}

export function calculateSignals(rawAnswers = {}) {
  if (!isPlainObject(rawAnswers)) {
    throw new Error("calculateSignals expects an object of answers.");
  }

  const signals = createEmptySignals();
  const groups = createEmptyGroups();

  for (const [questionId, answerValue] of Object.entries(rawAnswers)) {
    const normalizedValues = validateAnswer(questionId, answerValue);

    if (normalizedValues.length === 0) {
      continue;
    }

    applyQuestionLevelAggregation(
      normalizedValues,
      questionId,
      signals,
      groups
    );
  }

  return {
    signals,
    groups
  };
}

// Optional aliases for compatibility
export const detectSignals = calculateSignals;
export const buildSignals = calculateSignals;

export {
  GROUP_KEYS,
  SIGNAL_KEYS,
  createEmptyGroups,
  buildTopSignals
};

export default calculateSignals;
