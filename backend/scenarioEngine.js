// scenarioEngine.js
// Nimclea Diagnostic Scenario Engine v1.1
// ESM version
//
// Fixed:
// 1. totalScore === 0 no longer falls into scenario_a by default
// 2. Q11-related signals support dual-group influence without double-counting totalScore
// 3. scenarios.json loading no longer depends on JSON import assertion syntax

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scenarioRegistry = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "scenarios.json"),
    "utf-8"
  )
);

/**
 * Group -> signal keys
 *
 * Notes:
 * - version_drift / team_misalignment are intentionally included in BOTH:
 *   evidence_fragmentation and complexity_score
 *   because Q11 can contribute to both scenario families.
 * - To avoid double-counting in totalScore, totalScore is computed from UNIQUE signal keys,
 *   not by summing group totals when groups are derived locally.
 */

const GROUP_SIGNAL_MAP = {

    evidence_fragmentation_score: [
    "evidence_fragmentation",
    "retrieval_friction",
    "storage_chaos",
    "evidence_search_chaos",
    "reconstruction_burden",
    "hidden_process_debt"
  ],

  governance_strength_score: [
    "explainability_gap",
    "change_clarity",
    "traceability_gap",
    "approval_auditability",
    "verification_cadence",
    "governance_discipline",
    "governance_formality",
    "control_strength",
    "authority_clarity",
    "ownership_strength",
    "incident_reconstruction",
    "causal_trace_quality",
    "change_governance_maturity",
    "process_repeatability"
  ],

  complexity_score: [
    "rule_drift",
    "metric_volatility",
    "coordination_complexity",
    "boundary_density",
    "version_drift",
    "team_misalignment",
    "semantic_misalignment",
    "definition_conflict",
    "handoff_integrity",
    "boundary_clarity",
    "multi_system_coupling",
    "integration_burden"
  ],

  pressure_context_score: [
    "external_pressure",
    "triggered_review_environment",
    "dominant_failure_mode",
    "pressure_revealed_weak_point"
  ]
};

/**
 * Human-readable labels for signal keys
 */
const SIGNAL_LABELS = {
  external_pressure: "External Pressure",
  triggered_review_environment: "Triggered Review Environment",

  explainability_gap: "Explainability Gap",
  change_clarity: "Change Clarity",

  rule_drift: "Rule Drift",
  metric_volatility: "Metric Volatility",

  evidence_readiness: "Evidence Readiness",
  retrieval_friction: "Retrieval Friction",
  traceability_gap: "Traceability Gap",
  approval_auditability: "Approval Auditability",
  evidence_fragmentation: "Evidence Fragmentation",
  storage_chaos: "Storage Chaos",

  verification_cadence: "Verification Cadence",
  governance_discipline: "Governance Discipline",
  governance_formality: "Governance Formality",
  control_strength: "Control Strength",

  coordination_complexity: "Coordination Complexity",
  boundary_density: "Boundary Density",
  first_retrieval_path: "First Retrieval Path",
  evidence_search_chaos: "Evidence Search Chaos",

  version_drift: "Version Drift",
  team_misalignment: "Team Misalignment",
  reconstruction_burden: "Reconstruction Burden",
  hidden_process_debt: "Hidden Process Debt",

  authority_clarity: "Authority Clarity",
  ownership_strength: "Ownership Strength",
  incident_reconstruction: "Incident Reconstruction",
  causal_trace_quality: "Causal Trace Quality",

  change_governance_maturity: "Change Governance Maturity",
  process_repeatability: "Process Repeatability",

  semantic_misalignment: "Semantic Misalignment",
  definition_conflict: "Definition Conflict",
  handoff_integrity: "Handoff Integrity",
  boundary_clarity: "Boundary Clarity",

  multi_system_coupling: "Multi-System Coupling",
  integration_burden: "Integration Burden",

  dominant_failure_mode: "Dominant Failure Mode",
  pressure_revealed_weak_point: "Pressure-Revealed Weak Point"
};

const DEFAULT_GROUP_SCORES = {
  evidence_fragmentation_score: 0,
  governance_strength_score: 0,
  complexity_score: 0,
  pressure_context_score: 0
};

function isPreAuditCollapse({ groupScores, signals, totalScore }) {
  const evidence = toSafeNumber(groupScores.evidence_fragmentation_score);
  const governance = toSafeNumber(groupScores.governance_strength_score);
  const complexity = toSafeNumber(groupScores.complexity_score);
  const pressure = toSafeNumber(groupScores.pressure_context_score);

  const evidenceFragmentation = toSafeNumber(signals.evidence_fragmentation);
  const storageChaos = toSafeNumber(signals.storage_chaos);
  const searchChaos = toSafeNumber(signals.evidence_search_chaos);
  const reconstruction = toSafeNumber(signals.reconstruction_burden);
  const hiddenDebt = toSafeNumber(signals.hidden_process_debt);

  const hardEvidenceBreak =
    evidenceFragmentation >= 3 ||
    storageChaos >= 3 ||
    searchChaos >= 2 ||
    reconstruction >= 2 ||
    hiddenDebt >= 2;

  const severeStructure =
    evidence >= 4 && complexity >= 6;

  const pressureAmplifiedBreak =
    evidence >= 4 &&
    pressure >= 3 &&
    (complexity >= 4 || governance >= 6);

  return (
    totalScore >= 14 &&
    (
      severeStructure ||
      pressureAmplifiedBreak ||
      (hardEvidenceBreak && complexity >= 4)
    )
  );
}

function isAuditReady({ groupScores, signals, totalScore }) {
  const evidence = toSafeNumber(groupScores.evidence_fragmentation_score);
  const complexity = toSafeNumber(groupScores.complexity_score);
  const pressure = toSafeNumber(groupScores.pressure_context_score);

  const retrievalFriction = toSafeNumber(signals.retrieval_friction);
  const externalPressure = toSafeNumber(signals.external_pressure);
  const triggeredReview = toSafeNumber(signals.triggered_review_environment);
  const dominantFailureMode = toSafeNumber(signals.dominant_failure_mode);
  const pressureWeakPoint = toSafeNumber(signals.pressure_revealed_weak_point);

  return (
    totalScore > 0 &&
    totalScore <= 6 &&
    evidence <= 1 &&
    complexity <= 1 &&
    pressure <= 3 &&
    retrievalFriction <= 1 &&
    dominantFailureMode === 0 &&
    pressureWeakPoint === 0 &&
    !(externalPressure >= 1 && triggeredReview >= 1)
  );
}

function resolvePressureProfile({ signals, groupScores, scenarioBucket }) {
  const pressure = toSafeNumber(groupScores.pressure_context_score);

  const externalPressure = toSafeNumber(signals.external_pressure);
  const triggeredReview = toSafeNumber(signals.triggered_review_environment);
  const dominantFailureMode = toSafeNumber(signals.dominant_failure_mode);
  const pressureWeakPoint = toSafeNumber(signals.pressure_revealed_weak_point);
  const retrievalFriction = toSafeNumber(signals.retrieval_friction);
  const traceabilityGap = toSafeNumber(signals.traceability_gap);
  const approvalAuditability = toSafeNumber(signals.approval_auditability);
  const evidenceFragmentation = toSafeNumber(signals.evidence_fragmentation);

  const hasPressureContext =
    pressure >= 4 ||
    (externalPressure >= 1 && triggeredReview >= 1);

  const hasPressureWeakness =
    dominantFailureMode >= 1 ||
    pressureWeakPoint >= 1;

  const hasPressureSensitiveFriction =
    retrievalFriction >= 2 ||
    traceabilityGap >= 2 ||
    approvalAuditability >= 2 ||
    evidenceFragmentation >= 2;

  if (!hasPressureContext) {
    return {
      code: "stable",
      label: "Stable"
    };
  }

  if (
    (scenarioBucket === "FULLY_READY" || scenarioBucket === "BASICALLY_STABLE") &&
    !hasPressureWeakness &&
    !hasPressureSensitiveFriction
  ) {
    return {
      code: "pressure_stable",
      label: "Pressure-Stable"
    };
  }

  return {
    code: "pressure_sensitive",
    label: "Pressure-Sensitive"
  };
}

function resolveScenarioBucket({ groupScores, signals, totalScore }) {
  const pressure = toSafeNumber(groupScores.pressure_context_score);
  const evidence = toSafeNumber(groupScores.evidence_fragmentation_score);
  const complexity = toSafeNumber(groupScores.complexity_score);
  const governance = toSafeNumber(groupScores.governance_strength_score);

  // S5 完全准备好型
  if (
    totalScore <= 3 &&
    evidence <= 1 &&
    pressure <= 2 &&
    complexity <= 2 &&
    governance <= 2
  ) {
    return "FULLY_READY";
  }

  // S4 基本稳定型
  if (
    totalScore >= 4 &&
    totalScore <= 9 &&
    evidence <= 2 &&
    pressure <= 3 &&
    complexity <= 3 &&
    governance <= 3
  ) {
    return "BASICALLY_STABLE";
  }

  // S1 审计前崩溃型
  if (
    totalScore >= 20 &&
    (evidence >= 5 || pressure >= 5 || complexity >= 5)
  ) {
    return "PRE_AUDIT_COLLAPSE";
  }

  // S2 勉强能用型
  // 收紧中段门槛，避免 13-14 分、仅单一 pressure 偏高的样本过早落入 S2
  if (
    totalScore >= 15 &&
    totalScore <= 19 &&
    (
      evidence >= 4 ||
      pressure >= 4 ||
      complexity >= 4 ||
      governance >= 4
    )
  ) {
    return "BARELY_FUNCTIONAL";
  }

  // 13-14 分属于中段缓冲带：
  // 只有在至少两个维度同时偏高时，才判为 S2；否则落入 S3
  if (
    totalScore >= 13 &&
    totalScore <= 14 &&
    (
      [evidence, pressure, complexity, governance].filter(score => score >= 4).length >= 2
    )
  ) {
    return "BARELY_FUNCTIONAL";
  }

  // S3 边界模糊型
  return "BOUNDARY_BLUR";
}

function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSignals(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const normalized = {};
  for (const [key, value] of Object.entries(input)) {
    normalized[key] = toSafeNumber(value);
  }
  return normalized;
}

function normalizeGroupScores(input) {
  const groups = { ...DEFAULT_GROUP_SCORES };

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return groups;
  }

  for (const key of Object.keys(groups)) {
    groups[key] = toSafeNumber(input[key]);
  }

  return groups;
}

function hasAnyPositiveValue(obj) {
  return Object.values(obj).some((v) => toSafeNumber(v) > 0);
}

function deriveGroupScoresFromSignals(signals) {
  const derived = { ...DEFAULT_GROUP_SCORES };

  for (const [groupKey, signalKeys] of Object.entries(GROUP_SIGNAL_MAP)) {
    derived[groupKey] = signalKeys.reduce((sum, signalKey) => {
      return sum + toSafeNumber(signals[signalKey]);
    }, 0);
  }

  return derived;
}

/**
 * Total score from UNIQUE signal keys only.
 * This prevents double counting when a signal belongs to multiple groups.
 */
function getUniqueSignalTotal(signals) {
  const allKeys = new Set();

  for (const signalKeys of Object.values(GROUP_SIGNAL_MAP)) {
    for (const key of signalKeys) {
      allKeys.add(key);
    }
  }

  let total = 0;
  for (const key of allKeys) {
    total += toSafeNumber(signals[key]);
  }

  return total;
}

function getTotalScore({ groupScores, signals, usedDerivedGroups }) {
  if (usedDerivedGroups) {
    return getUniqueSignalTotal(signals);
  }

  return Object.values(groupScores).reduce((sum, value) => {
    return sum + toSafeNumber(value);
  }, 0);
}

function getIntensityLevel(totalScore) {
  const levels = Array.isArray(scenarioRegistry.intensity_levels)
    ? scenarioRegistry.intensity_levels
    : [];

  for (const level of levels) {
    const min = toSafeNumber(level.min_score);
    const max = toSafeNumber(level.max_score);
    if (totalScore >= min && totalScore <= max) {
      return {
        level: level.level,
        label: level.label,
        minScore: min,
        maxScore: max
      };
    }
  }

  return {
    level: null,
    label: "Unknown Intensity",
    minScore: null,
    maxScore: null
  };
}

function getScenarioMap() {
  return scenarioRegistry?.scenarios ?? {};
}

function getTieBreakPriority() {
  return Array.isArray(scenarioRegistry.tie_break_priority) &&
    scenarioRegistry.tie_break_priority.length > 0
    ? scenarioRegistry.tie_break_priority
    : Object.keys(DEFAULT_GROUP_SCORES);
}

function resolveWinningGroup(groupScores) {
  const tieBreakPriority = getTieBreakPriority();

  let bestGroup = null;
  let bestScore = -Infinity;

  for (const groupKey of tieBreakPriority) {
    const score = toSafeNumber(groupScores[groupKey]);

    if (score > bestScore) {
      bestGroup = groupKey;
      bestScore = score;
    }
  }

  return {
    groupKey: bestGroup,
    score: bestScore < 0 ? 0 : bestScore
  };
}

function findScenarioByGroupKey(groupKey) {
  const scenarios = getScenarioMap();

  for (const scenario of Object.values(scenarios)) {
    if (scenario.primary_signal_group === groupKey) {
      return scenario;
    }
  }

  return null;
}

function sortSignalsDesc(signalEntries) {
  return [...signalEntries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.key.localeCompare(b.key);
  });
}

function pickTopSignals(signals, groupScores, targetCount = 3) {
  const safeTarget = Math.max(1, toSafeNumber(targetCount) || 3);
  const tieBreakPriority = getTieBreakPriority();

  const sortedGroups = Object.entries(groupScores)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return tieBreakPriority.indexOf(a[0]) - tieBreakPriority.indexOf(b[0]);
    })
    .map(([groupKey]) => groupKey);

  const selected = [];
  const seen = new Set();

  outer: for (const groupKey of sortedGroups) {
    const signalKeys = GROUP_SIGNAL_MAP[groupKey] || [];
    const entries = signalKeys
      .map((key) => ({
        key,
        label: SIGNAL_LABELS[key] || key,
        score: toSafeNumber(signals[key]),
        group: groupKey
      }))
      .filter((item) => item.score >= 0);

    for (const item of sortSignalsDesc(entries)) {
      if (!seen.has(item.key)) {
        selected.push(item);
        seen.add(item.key);
      }

      if (selected.length >= safeTarget) {
        break outer;
      }
    }
  }

  return selected.map((item) => ({
    ...item,
    insight: generateWhyThisMatters(item, {
      totalScore: item.score,
      pressureLevel: "stable",
      scenarioCode: null
    })
  }));
}

function generateWhyThisMatters(signal, { totalScore = 0, pressureLevel = "stable", scenarioCode = null } = {}) {
  const key = signal?.key || "";

  if (key === "traceability_strength") {
    return "Your current structure appears to make evidence easier to locate, follow, and verify across normal workflows.";
  }

  if (key === "governance_clarity") {
    return "Decision paths and ownership appear relatively clear, which reduces ambiguity when work moves across people or steps.";
  }

  if (key === "coordination_simplicity") {
    return "Work appears to move through fewer coordination layers, which lowers friction and makes execution easier to sustain.";
  }

  if (key === "evidence_fragmentation") {
    return "Evidence may exist, but it is likely distributed across places or people, which increases retrieval and verification effort.";
  }

  if (key === "evidence_search_chaos") {
    return "Teams may not share a reliable first place to look when evidence is needed, slowing down explanation and review.";
  }

  if (key === "hidden_process_debt") {
    return "Some parts of the workflow may rely on manual fixes or informal knowledge, which can create drag over time.";
  }

  if (key === "boundary_clarity") {
    return "Unclear boundaries may be making ownership, decisions, or handoffs harder to interpret consistently.";
  }

  if (key === "handoff_integrity") {
    return "Work may not be transferring cleanly across steps or teams, which can create drift or repeated clarification.";
  }

  if (key === "definition_conflict") {
    return "Important terms or outputs may not be interpreted the same way across the workflow, reducing consistency.";
  }

  return totalScore === 0
    ? "This appears to be a relative structural strength in the current workflow."
    : "This is likely contributing to the current structural pattern shown in your result.";
}

function buildNoScenarioResult({ groupScores, totalScore, intensity, topSignals = [] }) {
  return {
    scenarioId: null,
    scenarioCode: null,
    scenarioLabel: "No Dominant Scenario",
    scenario: null,
    pressureLevel: "stable",
    branch: null,
    pressureProfile: {
      code: "stable",
      label: "Stable"
    },
    primarySignalGroup: null,
    primaryGroupCode: null,
    primaryGroupScore: 0,
    groupScores,
    totalScore,
    intensity,
    topSignals,
    signals: topSignals,
    previewBlock: null,
    triggerQuestions: [],
    topSignalPriority: []
  };
}

/**
 * Main scenario resolver
 *
 * Preferred input:
 * detectScenario({
 *   signals: {...},
 *   groups: {
 *     evidence_fragmentation: ...,
 *     governance_strength_score: ...,
 *     complexity_score: ...,
 *     pressure_context_score: ...
 *   }
 * })
 *
 * Fallback:
 * - If groups are missing, this file derives them from signals.
 *
 * @param {Object} input
 * @param {Object} input.signals
 * @param {Object} [input.groups]
 * @returns {Object}
 */

function hasProvidedGroups(input) {
  return (
    !!input &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    Object.keys(input).length > 0
  );
}

export function detectScenario(input = {}) {
  const signals = normalizeSignals(input.signals);
  const providedGroups = normalizeGroupScores(input.groups);
  const usingProvidedGroups = hasProvidedGroups(input.groups);

  const groupScores = usingProvidedGroups
    ? providedGroups
    : deriveGroupScoresFromSignals(signals);

  const totalScore = getTotalScore({
    groupScores,
    signals,
    usedDerivedGroups: !usingProvidedGroups
  });

  const intensity = getIntensityLevel(totalScore);

  // Fix 1: do not force a default scenario when nothing is triggered
if (totalScore === 0) {
  const healthySignals = [
    {
      key: "traceability_strength",
      label: "Traceability Strength",
      score: 0,
      group: "healthy_structure",
      description: "Evidence appears relatively easy to locate, follow, and verify across normal workflows."
    },
    {
      key: "governance_clarity",
      label: "Governance Clarity",
      score: 0,
      group: "healthy_structure",
      description: "Decision paths and ownership appear relatively clear, reducing ambiguity in execution."
    },
    {
      key: "coordination_simplicity",
      label: "Coordination Simplicity",
      score: 0,
      group: "healthy_structure",
      description: "Work appears to move through fewer coordination layers, lowering friction and improving flow."
    }
  ].map((item) => ({
    ...item,
    insight: generateWhyThisMatters(item, {
      totalScore,
      pressureLevel: "stable",
      scenarioCode: null
    })
  }));

  return buildNoScenarioResult({
    groupScores,
    totalScore,
    intensity,
    topSignals: healthySignals
  });
}

  const winner = resolveWinningGroup(groupScores);

  // Defensive guard: if all group scores are 0, return no scenario
  if (!winner.groupKey || winner.score === 0) {
    return buildNoScenarioResult({
      groupScores,
      totalScore,
      intensity
    });
  }

  const scenarioBucket = resolveScenarioBucket({
    groupScores,
    signals,
    totalScore
  });

  const pressureProfile = resolvePressureProfile({
    signals,
    groupScores,
    scenarioBucket
  });

  const topSignals = pickTopSignals(signals, groupScores, 3);

  let scenarioSubtype = null;

  if (scenarioBucket === "BOUNDARY_BLUR") {
    if (
      groupScores.pressure_context_score >= 5 &&
      groupScores.pressure_context_score > groupScores.governance_strength_score
    ) {
      scenarioSubtype = "pressure_fragile";
    } else {
      scenarioSubtype = "moderate_accumulation";
    }
  }

  let scenario = null;

  if (scenarioBucket === "PRE_AUDIT_COLLAPSE") {
    scenario = {
      id: "scenario_1",
      code: "pre_audit_collapse",
      label: "Pre-Audit Collapse",
      primary_signal_group: "evidence_fragmentation_score",
      primary_group_code: "collapse_risk",
      preview_block: {
        title: "Structural Breakdown Under Pressure"
      },
      trigger_questions: [],
      top_signal_priority: [
        "evidence_fragmentation",
        "evidence_search_chaos",
        "reconstruction_burden"
      ]
    };
  } else if (scenarioBucket === "BARELY_FUNCTIONAL") {
    scenario = {
      id: "scenario_2",
      code: "barely_functional",
      label: "Barely Functional",
      primary_signal_group: winner.groupKey,
      primary_group_code: "operational_friction",
      preview_block: {
        title: "Operational Friction with Hidden Cost"
      },
      trigger_questions: [],
      top_signal_priority: [
        "retrieval_friction",
        "traceability_gap",
        "coordination_complexity"
      ]
    };
  } else if (scenarioBucket === "BOUNDARY_BLUR") {
    scenario = {
      id: "scenario_3",
      code: "boundary_blur",
      label: "Boundary Blur",
      primary_signal_group: winner.groupKey,
      primary_group_code: "mixed_readiness",
      preview_block: {
        title: "Mixed Signals with Boundary Ambiguity"
      },
      trigger_questions: [],
      top_signal_priority: [
        "external_pressure",
        "retrieval_friction",
        "coordination_complexity"
      ]
    };
  } else if (scenarioBucket === "BASICALLY_STABLE") {
    scenario = {
      id: "scenario_4",
      code: "basically_stable",
      label: "Basically Stable",
      primary_signal_group: "governance_strength_score",
      primary_group_code: "stable_foundation",
      preview_block: {
        title: "Stable Foundation with Minor Gaps"
      },
      trigger_questions: [],
      top_signal_priority: [
        "process_repeatability",
        "ownership_strength",
        "control_strength"
      ]
    };
  } else {
    scenario = {
      id: "scenario_5",
      code: "fully_ready",
      label: "Fully Ready",
      primary_signal_group: "governance_strength_score",
      primary_group_code: "fully_ready",
      preview_block: {
        title: "Fully Ready for Pilot"
      },
      trigger_questions: [],
      top_signal_priority: [
        "process_repeatability",
        "ownership_strength",
        "control_strength"
      ]
    };
  }

  return {
    scenarioId: scenario.id,
    scenarioCode: scenario.code,
    scenarioLabel: scenario.label,
    scenarioSubtype: scenarioSubtype,
    scenarioSubtypeLabel:
      scenarioSubtype === "pressure_fragile"
        ? "Pressure Fragility"
        : scenarioSubtype === "moderate_accumulation"
          ? "Moderate Accumulation"
          : null,
    scenarioTitle: scenario.preview_block?.title || scenario.label,

    // 兼容旧字段
    scenario: scenario.code,
    pressureLevel: pressureProfile.code,
    branch: scenario.primary_signal_group,

    pressureProfile,
    primarySignalGroup: scenario.primary_signal_group,
    primaryGroupCode: scenario.primary_group_code,
    primaryGroupScore: winner.score,
    groupScores,
    totalScore,
    intensity,
    topSignals,
    signals: topSignals,
    previewBlock: scenario.preview_block,
    triggerQuestions: Array.isArray(scenario.trigger_questions)
      ? scenario.trigger_questions
      : [],
    topSignalPriority: Array.isArray(scenario.top_signal_priority)
      ? scenario.top_signal_priority
      : []
  };
}

export default detectScenario;