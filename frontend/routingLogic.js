// routingLogic.js
import SIGNAL_CALC_TABLE from "../backend/signalCalcTable.js";
// Q1–Q9 初判层：answers -> routing result
// 用于：Q9 后显示 Initial Diagnostic / strongest 2 signals / scenario / 继续6题验证

// =========================
// 1) value alias 归一化
// =========================

const VALUE_ALIASES = {
  // Q1
  external_audit: "external_audit",
  customer_or_partner_verification_request: "customer_or_partner_verification_request",
  customer_partner_verification: "customer_or_partner_verification_request",
  compliance_review_or_regulatory_check: "compliance_review_or_regulatory_check",
  compliance_review: "compliance_review_or_regulatory_check",
  incident_investigation: "incident_investigation",
  internal_reporting_deadlines: "internal_reporting_deadlines",
  routine_internal_review: "routine_internal_review",
  none_of_the_above: "none_of_the_above",
  none: "none_of_the_above",

  // Q2
  very_easy: "very_easy",
  somewhat_easy: "somewhat_easy",
  difficult: "difficult",
  very_difficult: "very_difficult",

  // Q3
  rarely: "rarely",
  occasionally: "occasionally",
  frequently: "frequently",
  very_frequently: "very_frequently",

  // Q4
  immediately: "immediately",
  within_same_day: "within_same_day",
  same_day: "within_same_day",
  within_a_week: "within_a_week",
  within_week: "within_a_week",
  must_be_reconstructed: "must_be_reconstructed",

  // Q5
  fully_traceable: "fully_traceable",
  partially_traceable: "partially_traceable",
  difficult_to_trace: "difficult_to_trace",
  not_traceable: "not_traceable",

  // Q6
  one_centralized_system: "one_centralized_system",
  centralized_system: "one_centralized_system",
  a_few_structured_systems: "a_few_structured_systems",
  few_structured_systems: "a_few_structured_systems",
  multiple_spreadsheets: "multiple_spreadsheets",
  mixed_documents_emails_folders: "mixed_documents_emails_folders",

  // Q7
  monthly: "monthly",
  quarterly: "quarterly",
  only_during_audits: "only_during_audits",

  // Q8
  formal_approval_process: "formal_approval_process",
  formal_approval: "formal_approval_process",
  informal_review_by_colleagues: "informal_review_by_colleagues",
  informal_review: "informal_review_by_colleagues",
  direct_change_without_approval: "direct_change_without_approval",
  direct_change: "direct_change_without_approval",
  no_clear_process: "no_clear_process",

  // Q9
  one_team: "one_team",
  two_teams: "two_teams",
  multiple_teams: "multiple_teams",
  multiple_organizations: "multiple_organizations",
};

// =========================
// 2) Q1–Q9 severity 表
// 参考 Question Bank / Signal Engine
// =========================

// =========================
// 3) signal / scenario 文案
// 参考 9+6 与 Q9 routing feedback 文档
// =========================

const SIGNAL_META = {
  S1: {
    code: "S1",
    label: "Evidence Chaos",
    shortText: "Evidence appears fragmented and slow to assemble",
  },
  S2: {
    code: "S2",
    label: "Workflow Repeatability Gap",
    shortText: "Your workflow shows repeatability gaps and still relies on manual coordination",
  },
  S3: {
    code: "S3",
    label: "External Pressure Exposure",
    shortText: "High-pressure situations are likely exposing structural weakness",
  },
  S4: {
    code: "S4",
    label: "Trustworthy AI Readiness",
    shortText: "You appear more ready for explainable, reviewable support",
  },
  S5: {
    code: "S5",
    label: "Pilot Fit",
    shortText: "A small pilot may be commercially realistic",
  },
};

const SCENARIO_META = {
  C0: {
    code: "C0",
    title: "There is meaningful potential here, but the sharpest entry point is still emerging",
    shortLabel: "Moderate Fit / Wedge Unclear",
    explanation:
      "Your responses show some signal, but the strongest pattern is not fully clear yet.",
    validationNote:
      "You can optionally validate this result with deeper signals.",
  },
  C1: {
    code: "C1",
    title: "Your workflow shows strong signs of judgment and evidence friction",
    shortLabel: "Judgment + Evidence Pain",
    explanation:
      "The strongest signals so far are fragmented evidence and unstable decision structure.",
    validationNote:
      "You can optionally validate this result with deeper signals.",
  },
  C2: {
    code: "C2",
    title: "Your workflow shows a clear standardization opportunity",
    shortLabel: "Standardization Opportunity",
    explanation:
      "The strongest signals so far are repeatability potential and demand for explainable support.",
    validationNote:
      "You can optionally validate this result with deeper signals.",
  },
  C3: {
    code: "C3",
    title: "Your responses suggest strong pilot readiness for a diagnostic layer",
    shortLabel: "Pilot-Ready Diagnostic Fit",
    explanation:
      "The strongest signals so far are pilot openness and trust in reviewable AI assistance.",
    validationNote:
      "You can optionally validate this result with deeper signals.",
  },
    C4: {
    code: "C4",
    title: "Your workflow appears stable and structurally clear",
    shortLabel: "Stable Structure",
    explanation:
      "The strongest signals so far suggest relatively low friction, clearer boundaries, and more stable operating pathways.",
    validationNote:
      "You can optionally validate this result with deeper signals.",
  },
};

const SCENARIO_TO_BRANCH = {
  C0: "D",
  C1: "A",
  C2: "B",
  C3: "C",
  C4: "D",
};

// =========================
// 4) 基础工具函数
// =========================

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((v) => VALUE_ALIASES[v] ?? v);
  }
  return VALUE_ALIASES[value] ?? value;
}

function scoreSingle(questionId, rawValue) {
  const value = normalizeValue(rawValue);
  const questionTable = SIGNAL_CALC_TABLE[questionId] || {};
  const config = questionTable[value];

  if (config && typeof config.severity === "number") {
    return config.severity;
  }

  return null;
}

function scoreQ1(rawValue) {
  const value = normalizeValue(rawValue);
  const table = SIGNAL_CALC_TABLE.Q1 || {};

  if (Array.isArray(value)) {
    if (value.length === 0) return 0;

    const normalizedList = value.filter(
      (item) => table[item] && typeof table[item].severity === "number"
    );

    if (normalizedList.length === 0) return 0;

    if (normalizedList.includes("none_of_the_above")) {
      return normalizedList.length === 1 ? 0 : 1;
    }

    return Math.max(...normalizedList.map((item) => table[item].severity));
  }

  if (table[value] && typeof table[value].severity === "number") {
    return table[value].severity;
  }

  return 0;
}

function getCoreSeverity(answers = {}) {
  const severity = {
    Q1: scoreQ1(answers.Q1),
    Q2: scoreSingle("Q2", answers.Q2),
    Q3: scoreSingle("Q3", answers.Q3),
    Q4: scoreSingle("Q4", answers.Q4),
    Q5: scoreSingle("Q5", answers.Q5),
    Q6: scoreSingle("Q6", answers.Q6),
    Q7: scoreSingle("Q7", answers.Q7),
    Q8: scoreSingle("Q8", answers.Q8),
    Q9: scoreSingle("Q9", answers.Q9),
  };

  return Object.fromEntries(
    Object.entries(severity).map(([key, value]) => [key, typeof value === "number" ? value : 0])
  );
}

// =========================
// 5) 核心：Q1–Q9 -> S1~S5
// 这里采用“求和/映射到 0–6”以接通文档阈值
// =========================

export function calculateCoreSignals(answers = {}) {
  const normalizedAnswers = Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [key, normalizeValue(value)])
  );

  const rawSeverity = getCoreSeverity(normalizedAnswers);

  const groupScores = {
    evidence_fragmentation_score: 0,
    governance_strength_score: 0,
    complexity_score: 0,
    pressure_context_score: 0,
  };

Object.entries(normalizedAnswers).forEach(([questionId, rawValue]) => {
  const questionTable = SIGNAL_CALC_TABLE[questionId];
  if (!questionTable) return;

  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  values.forEach((value) => {
    const normalizedValue = normalizeValue(value);

    // 1) 先做精确匹配
    let config = questionTable[normalizedValue];

    // 2) 如果没匹配到，做一次模糊匹配
    if (!config) {
      const tableKeys = Object.keys(questionTable);

      const matchedKey = tableKeys.find(
        (key) =>
          normalizedValue === key ||
          normalizedValue.includes(key) ||
          key.includes(normalizedValue)
      );

      if (matchedKey) {
        config = questionTable[matchedKey];
      }
    }

    // 3) 还是没有，就直接跳过，不报错
    if (!config || typeof config.severity !== "number") return;

    if (groupScores[config.group] !== undefined) {
      groupScores[config.group] += config.severity;
    }
  });
});

  const evidenceChaos = groupScores.evidence_fragmentation_score;
  const workflowGap = groupScores.governance_strength_score;
  const pressureExposure =
    groupScores.pressure_context_score + Math.floor(groupScores.complexity_score / 2);

  // readiness 只能作为辅助信号，不能因为 governance 低就自动显得“AI 很 ready”
  const aiReadiness = Math.max(
    0,
    5 -
      Math.floor(groupScores.governance_strength_score / 3) +
      (normalizedAnswers.Q8 === "formal_approval_process" ? 1 : 0)
  );

  // pilotFit 只反映“切口大小合不合适”，不代表结构成熟
  const pilotFit =
    normalizedAnswers.Q9 === "one_team"
      ? 3
      : normalizedAnswers.Q9 === "two_teams"
      ? 3
      : normalizedAnswers.Q9 === "multiple_teams"
      ? 2
      : 1;

  const signals = {
    S1: evidenceChaos,
    S2: workflowGap,
    S3: pressureExposure,
    S4: aiReadiness,
    S5: pilotFit,
  };

  return {
    rawSeverity,
    signals,
  };
}

// =========================
// 6) strongest 2 signals
// =========================

export function getStrongestSignals(signalScores) {
  return Object.entries(signalScores)
    .map(([code, score]) => ({
      code,
      score,
      ...SIGNAL_META[code],
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      // 固定 tie-break，避免结果漂移
      const priority = ["S1", "S2", "S3", "S4", "S5"];
      return priority.indexOf(a.code) - priority.indexOf(b.code);
    })
    .slice(0, 2);
}

// =========================
// 7) Scenario 判定
// 依据 Q9 后最小判定规则
// =========================

export function getScenarioFromSignals(signalScores) {
  const { S1, S2, S3, S4, S5 } = signalScores;
  const frictionTotal = S1 + S2;

  // C1：审计前崩溃型
  // 证据混乱 + 流程不稳已经非常高，压力只会放大，不是主触发器
  if (
    frictionTotal >= 8 ||
    (S1 >= 5 && S2 >= 3) ||
    (S1 >= 4 && S2 >= 4)
  ) {
    return "C1";
  }

  // C4：稳定结构
  // 必须是低摩擦 + 低压力，readiness 高不等于结构稳
  if (
    S1 <= 1 &&
    S2 <= 1 &&
    S3 <= 2
  ) {
    return "C4";
  }

  // C3：边界模糊型
  // 核心特征：压力敏感，且存在中度结构问题，但还没崩到 C1
  if (
    (
      S3 >= 4 &&
      frictionTotal >= 3 &&
      frictionTotal <= 7
    ) ||
    (
      S3 >= 3 &&
      S1 >= 2 &&
      S2 >= 2 &&
      frictionTotal <= 7
    ) ||
    (
      S3 >= 3 &&
      S1 >= 3 &&
      S2 <= 2
    ) ||
    (
      S3 >= 3 &&
      S2 >= 3 &&
      S1 <= 2
    )
  ) {
    return "C3";
  }

  // C2：勉强能用型
  // 有一定重复性，但明显靠人工维持，压力还没成为主导矛盾
  if (
    frictionTotal >= 4 &&
    frictionTotal <= 7 &&
    S2 >= 2 &&
    S3 <= 3
  ) {
    return "C2";
  }

  // C0：楔子还不清晰
  return "C0";
}

// =========================
// 8) 给 Questionnaire.jsx 用的总出口
// =========================

export function getRoutingResultFromCoreAnswers(answers = {}) {
  const normalizedAnswers = Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [key, normalizeValue(value)])
  );

  const { rawSeverity, signals } = calculateCoreSignals(normalizedAnswers);
  const strongestSignals = getStrongestSignals(signals);

  let scenarioCode = getScenarioFromSignals(signals);

  // 后置保险：边界模糊型不能被 readiness / pilot fit 假性抬高
  if (
    scenarioCode === "C0" &&
    signals.S3 >= 3 &&
    signals.S1 + signals.S2 >= 4
  ) {
    scenarioCode = "C3";
  }

  const scenario = SCENARIO_META[scenarioCode] || SCENARIO_META.C0;
  const branchKey = SCENARIO_TO_BRANCH[scenarioCode] || "D";

  return {
    phase: "routing",
    scenarioCode: SCENARIO_META[scenarioCode] ? scenarioCode : "C0",
    branchKey,
    branch: branchKey,
    scenarioTitle: scenario.title,
    scenarioShortLabel: scenario.shortLabel,
    explanation: scenario.explanation,
    validationNote: scenario.validationNote,

    rawSeverity,
    signals,
    strongestSignals,
    strongestSignalTexts: strongestSignals.map((s) => s.shortText),

    cta: {
      primary: "Continue 6-question validation",
      secondary: "View initial result now",
    },
  };
}

// =========================
// 9) 兼容旧名字
// 如果你前端已经写了 getBranchFromCoreAnswers
// 可直接继续用，不用全局搜改
// =========================

export function getBranchFromCoreAnswers(answers = {}) {
  return getRoutingResultFromCoreAnswers(answers).branchKey;
}
