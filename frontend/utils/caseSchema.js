// E:\Nimclea_Products\diagnostic\frontend\lib\caseSchema.js

/**
 * Nimclea Case Schema v0.1
 * --------------------------------------------------
 * 目标：
 * 1. 把各种来源的事件输入，统一整理成同一份 case 结构
 * 2. 给后面的 Pattern / Chain / Stage / RUN 提供稳定入口
 * 3. 先做轻量版，不引入 zod / ajv 等外部依赖，避免你当前项目增加复杂度
 */

/**
 * 统一字段顺序，方便后面页面 / 日志 / receipt 使用同一套结构
 */
export const CASE_SCHEMA_VERSION = "case_schema_v0.1";

/**
 * 当前系统默认的四个维度
 */
export const CASE_DIMENSIONS = [
  "evidence",
  "authority",
  "coordination",
  "timing",
];

/**
 * 结构状态定义
 */
export const STRUCTURE_STATUS = {
  EMPTY: "empty",
  PARTIAL: "partial",
  USABLE: "usable",
  STRONG: "strong",
};

/**
 * 事件来源
 */
export const EVENT_SOURCE = {
  USER_INPUT: "user_input",
  DIAGNOSTIC: "diagnostic",
  PILOT: "pilot",
  RECEIPT: "receipt",
  IMPORTED: "imported",
  UNKNOWN: "unknown",
};

/**
 * 创建一份空白 case
 */
export function createEmptyCaseSchema(overrides = {}) {
  return {
    schemaVersion: CASE_SCHEMA_VERSION,

    caseId: "",
    createdAt: "",
    updatedAt: "",

    source: EVENT_SOURCE.UNKNOWN,
    scenarioCode: "",
    intensityLevel: 0,

    summary: "",
    description: "",

    eventType: "",
    eventTitle: "",
    eventContext: "",

    parties: [],
    evidenceItems: [],
    claims: [],
    actions: [],
    risks: [],

    weakestDimension: "",
    dimensions: {
      evidence: 0,
      authority: 0,
      coordination: 0,
      timing: 0,
    },

    signals: {
      externalPressure: false,
      explainabilityGap: false,
      ruleDrift: false,
      metricVolatility: false,
      evidenceReadiness: false,
      retrievalFriction: false,
      governanceDiscipline: false,
      ownershipStrength: false,
    },

    patternId: "",
    chainId: "",
    stage: "",
    fallbackRunCode: "",

    structureScore: 0,
    structureStatus: STRUCTURE_STATUS.EMPTY,

    routeDecision: {
      mode: "summary_only", // summary_only | case_receipt | final_receipt
      eligibleForReceipt: false,
      eligibleForVerification: false,
      reason: "",
    },

    meta: {
      tags: [],
      notes: "",
      rawInput: null,
    },

    ...overrides,
  };
}

/**
 * 把任意值转成字符串
 */
function toSafeString(value) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

/**
 * 把任意值转成数字，并限制区间
 */
function toClampedNumber(value, min = 0, max = 5) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(max, Math.max(min, num));
}

/**
 * 把任意值转成数组
 */
function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  return [value];
}

/**
 * 空对象保护
 */
function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

/**
 * 计算 weakestDimension
 * 规则：四维里分数最低的那个
 */
export function resolveWeakestDimension(dimensions = {}) {
  const safeDimensions = {
    evidence: toClampedNumber(dimensions.evidence, 0, 4),
    authority: toClampedNumber(dimensions.authority, 0, 4),
    coordination: toClampedNumber(dimensions.coordination, 0, 4),
    timing: toClampedNumber(dimensions.timing, 0, 4),
  };

  let weakestKey = "evidence";
  let lowestValue = safeDimensions.evidence;

  for (const key of CASE_DIMENSIONS) {
    if (safeDimensions[key] < lowestValue) {
      lowestValue = safeDimensions[key];
      weakestKey = key;
    }
  }

  return weakestKey;
}

/**
 * 结构分计算
 * 当前先做轻量规则，不跟 verificationStatus.js 强绑
 *
 * 组成：
 * - summary
 * - description / eventContext
 * - evidenceItems
 * - parties
 * - 四维维度
 */
export function calculateStructureScore(caseData = {}) {
  let score = 0;

  const summary = toSafeString(caseData.summary);
  const description = toSafeString(caseData.description);
  const eventContext = toSafeString(caseData.eventContext);
  const parties = toArray(caseData.parties);
  const evidenceItems = toArray(caseData.evidenceItems);

  const dimensions = isPlainObject(caseData.dimensions) ? caseData.dimensions : {};
  const dimensionValues = CASE_DIMENSIONS.map((key) =>
    toClampedNumber(dimensions[key], 0, 4)
  );

  // 1. 有 summary
  if (summary.length >= 20) score += 0.75;

  // 2. 有描述或上下文
  if (description.length >= 50 || eventContext.length >= 50) score += 0.75;

  // 3. 有参与方
  if (parties.length >= 1) score += 0.5;
  if (parties.length >= 2) score += 0.25;

  // 4. 有证据
  if (evidenceItems.length >= 1) score += 1.0;
  if (evidenceItems.length >= 2) score += 0.5;

  // 5. 四维平均值
  const avgDimension =
    dimensionValues.reduce((sum, value) => sum + value, 0) / dimensionValues.length;

  if (avgDimension >= 1.5) score += 0.5;
  if (avgDimension >= 2.5) score += 0.5;
  if (avgDimension >= 3.0) score += 0.25;

  // 总分上限 4.5，向下兼容你之前 3.5 / 4 的放行语义
  return Number(score.toFixed(2));
}

/**
 * 根据结构分推断 structureStatus
 */
export function resolveStructureStatus(structureScore = 0) {
  const score = Number(structureScore) || 0;

  if (score <= 0) return STRUCTURE_STATUS.EMPTY;
  if (score < 2.0) return STRUCTURE_STATUS.PARTIAL;
  if (score < 3.5) return STRUCTURE_STATUS.USABLE;
  return STRUCTURE_STATUS.STRONG;
}

/**
 * 根据结构分决定 routeDecision
 * 这里先只管最小可用逻辑：
 * - < 3.5: 只能 summary
 * - >= 3.5: 可以 case receipt
 * - final receipt 先保留给后面 pilotEntries / runEntries 再接
 */
export function resolveRouteDecision(caseData = {}) {
  const structureScore = Number(caseData.structureScore) || 0;
  const structureStatus = caseData.structureStatus || resolveStructureStatus(structureScore);

  if (structureScore >= 3.5 || structureStatus === STRUCTURE_STATUS.STRONG) {
    return {
      mode: "case_receipt",
      eligibleForReceipt: true,
      eligibleForVerification: true,
      reason: "Structure score reached receipt threshold.",
    };
  }

  return {
    mode: "summary_only",
    eligibleForReceipt: false,
    eligibleForVerification: false,
    reason: "Structure is still accumulating.",
  };
}

/**
 * 主入口：
 * 把各种散乱输入收敛成统一 case
 */
export function normalizeCaseInput(input = {}, options = {}) {
  const now = new Date().toISOString();

  const safeInput = isPlainObject(input) ? input : {};
  const dimensionsInput = isPlainObject(safeInput.dimensions) ? safeInput.dimensions : {};
  const signalsInput = isPlainObject(safeInput.signals) ? safeInput.signals : {};
  const routeDecisionInput = isPlainObject(safeInput.routeDecision)
    ? safeInput.routeDecision
    : {};

  const normalized = createEmptyCaseSchema({
    caseId: toSafeString(safeInput.caseId || options.caseId),
    createdAt: toSafeString(safeInput.createdAt) || now,
    updatedAt: now,

    source: toSafeString(safeInput.source || options.source) || EVENT_SOURCE.UNKNOWN,
    scenarioCode: toSafeString(safeInput.scenarioCode),
    intensityLevel: toClampedNumber(safeInput.intensityLevel, 0, 5),

    summary: toSafeString(safeInput.summary),
    description: toSafeString(safeInput.description),

    eventType: toSafeString(safeInput.eventType),
    eventTitle: toSafeString(safeInput.eventTitle),
    eventContext: toSafeString(safeInput.eventContext),

    parties: toArray(safeInput.parties),
    evidenceItems: toArray(safeInput.evidenceItems),
    claims: toArray(safeInput.claims),
    actions: toArray(safeInput.actions),
    risks: toArray(safeInput.risks),

    dimensions: {
      evidence: toClampedNumber(dimensionsInput.evidence, 0, 4),
      authority: toClampedNumber(dimensionsInput.authority, 0, 4),
      coordination: toClampedNumber(dimensionsInput.coordination, 0, 4),
      timing: toClampedNumber(dimensionsInput.timing, 0, 4),
    },

    signals: {
      externalPressure: Boolean(signalsInput.externalPressure),
      explainabilityGap: Boolean(signalsInput.explainabilityGap),
      ruleDrift: Boolean(signalsInput.ruleDrift),
      metricVolatility: Boolean(signalsInput.metricVolatility),
      evidenceReadiness: Boolean(signalsInput.evidenceReadiness),
      retrievalFriction: Boolean(signalsInput.retrievalFriction),
      governanceDiscipline: Boolean(signalsInput.governanceDiscipline),
      ownershipStrength: Boolean(signalsInput.ownershipStrength),
    },

    patternId: toSafeString(safeInput.patternId),
    chainId: toSafeString(safeInput.chainId),
    stage: toSafeString(safeInput.stage),
    fallbackRunCode: toSafeString(safeInput.fallbackRunCode),

    meta: {
      tags: toArray(safeInput.meta?.tags),
      notes: toSafeString(safeInput.meta?.notes),
      rawInput: safeInput,
    },
  });

  normalized.weakestDimension =
    toSafeString(safeInput.weakestDimension) ||
    resolveWeakestDimension(normalized.dimensions);

  normalized.structureScore =
    typeof safeInput.structureScore === "number"
      ? Number(safeInput.structureScore.toFixed(2))
      : calculateStructureScore(normalized);

  normalized.structureStatus =
    toSafeString(safeInput.structureStatus) ||
    resolveStructureStatus(normalized.structureScore);

  normalized.routeDecision =
    Object.keys(routeDecisionInput).length > 0
      ? {
          mode: toSafeString(routeDecisionInput.mode) || "summary_only",
          eligibleForReceipt: Boolean(routeDecisionInput.eligibleForReceipt),
          eligibleForVerification: Boolean(routeDecisionInput.eligibleForVerification),
          reason: toSafeString(routeDecisionInput.reason),
        }
      : resolveRouteDecision(normalized);

  return normalized;
}

/**
 * 轻校验，不抛异常，只返回结果
 */
export function validateCaseSchema(caseData = {}) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(caseData)) {
    return {
      isValid: false,
      errors: ["Case data must be an object."],
      warnings: [],
    };
  }

  if (!toSafeString(caseData.schemaVersion)) {
    warnings.push("schemaVersion is missing.");
  }

  if (!toSafeString(caseData.summary) && !toSafeString(caseData.description)) {
    warnings.push("Both summary and description are empty.");
  }

  if (!CASE_DIMENSIONS.includes(toSafeString(caseData.weakestDimension))) {
    warnings.push("weakestDimension is missing or invalid.");
  }

  const dimensions = isPlainObject(caseData.dimensions) ? caseData.dimensions : null;
  if (!dimensions) {
    errors.push("dimensions is missing.");
  } else {
    for (const key of CASE_DIMENSIONS) {
      const value = Number(dimensions[key]);
      if (!Number.isFinite(value)) {
        errors.push(`dimensions.${key} must be a number.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 给页面安全取值用
 */
export function getSafeCaseSummary(caseData = {}) {
  return (
    toSafeString(caseData.summary) ||
    toSafeString(caseData.eventTitle) ||
    toSafeString(caseData.description) ||
    "No structured summary available."
  );
}