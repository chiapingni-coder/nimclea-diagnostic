// frontend/utils/pilotRouting.js

/**
 * pilotRouting.js
 *
 * 作用：
 * 统一管理 Pilot / Pilot Result / Pilot Summary / Receipt 的前端分流规则
 *
 * 核心原则：
 * 1) Pilot 输入不是“收据触发器”，而是“结构采样器”
 * 2) Receipt 不是每次输入都生成
 * 3) 7天完成（pilot_complete）不等于自动生成 Receipt
 * 4) pilot_complete 表示“采样窗口关闭，进入总结/收束阶段”
 * 5) receipt_ready 表示“结构已确认，并明确允许生成 Receipt”
 */

/* ------------------------- 路由目标常量 ------------------------- */

export const PILOT_ROUTE_TARGETS = {
  RESULT: "result",
  PILOT: "pilot",
  PILOT_RESULT: "pilot_result",
  PILOT_SUMMARY: "pilot_summary",
  RECEIPT: "receipt",
};

/* ------------------------- 结构状态常量 ------------------------- */

export const PILOT_STRUCTURE_STATUS = {
  INSUFFICIENT: "insufficient",
  EMERGING: "emerging",
  RESOLVED: "resolved",
  PILOT_COMPLETE: "pilot_complete",
  RECEIPT_READY: "receipt_ready",
};

/* ------------------------- 基础工具 ------------------------- */

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function isPositiveNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) && value > 0;
}

function isNonNegativeNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) && value >= 0;
}

function toNumber(value) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function getReviewMode(source = {}) {
  return (
    source?.reviewMode ||
    source?.routeMeta?.reviewMode ||
    source?.pilot_result?.reviewMode ||
    source?.pilot_setup?.reviewMode ||
    source?.caseData?.reviewMode ||
    null
  );
}

export function getStructuredEventCount(source = {}) {
  const candidates = [
    source?.structuredEventCount,
    source?.structured_event_count,
    source?.eventReviewCount,
    source?.reviewedEventCount,
    source?.runEntries?.length,
    source?.pilotEntries?.length,
    source?.eventHistory?.length,
    source?.pilot_result?.structuredEventCount,
    source?.pilot_result?.eventReviewCount,
    source?.pilot_setup?.structuredEventCount,
    source?.pilot_setup?.eventReviewCount,
    source?.routeMeta?.structuredEventCount,
  ];

  for (const candidate of candidates) {
    const value = toNumber(candidate);
    if (isNonNegativeNumber(value)) return value;
  }

  return 0;
}

export function getEvidenceSupportScore(source = {}) {
  const candidates = [
    source?.evidenceSupport,
    source?.evidenceSupportScore,
    source?.evidence_support,
    source?.evidence_score,
    source?.caseData?.evidenceSupport,
    source?.caseData?.evidenceSupportScore,
    source?.pilot_result?.evidenceSupport,
    source?.pilot_result?.evidenceSupportScore,
    source?.pilot_setup?.evidenceSupport,
    source?.pilot_setup?.evidenceSupportScore,
    source?.routeMeta?.evidenceSupport,
  ];

  for (const candidate of candidates) {
    const value = toNumber(candidate);
    if (value !== null) return value;
  }

  return null;
}

export function getStructureCompletenessScore(source = {}) {
  const candidates = [
    source?.structureCompleteness,
    source?.structureCompletenessScore,
    source?.structure_completeness,
    source?.structure_score,
    source?.caseData?.structureCompleteness,
    source?.caseData?.structureCompletenessScore,
    source?.pilot_result?.structureCompleteness,
    source?.pilot_result?.structureCompletenessScore,
    source?.pilot_setup?.structureCompleteness,
    source?.pilot_setup?.structureCompletenessScore,
    source?.routeMeta?.structureCompleteness,
  ];

  for (const candidate of candidates) {
    const value = toNumber(candidate);
    if (value !== null) return value;
  }

  return null;
}

/* ------------------------- 字段提取器 ------------------------- */

/**
 * 从多种可能命名中提取 resolvedRunId
 */
export function getResolvedRunId(source = {}) {
  return (
    source?.caseData?.fallbackRunCode ||
    source?.resolvedRunId ||
    source?.runId ||
    source?.resolved_run_id ||
    source?.pilot_result?.caseData?.fallbackRunCode ||
    source?.pilot_result?.runId ||
    source?.pilot_result?.resolvedRunId ||
    source?.pilot_setup?.caseData?.fallbackRunCode ||
    source?.pilot_setup?.resolvedRunId ||
    source?.pilot_setup?.runId ||
    source?.routeMeta?.resolvedRunId ||
    null
  );
}

/**
 * 提取 pattern
 */
export function getResolvedPattern(source = {}) {
  return (
    source?.caseData?.patternId ||
    source?.pattern ||
    source?.patternId ||
    source?.resolvedPattern ||
    source?.pilot_result?.caseData?.patternId ||
    source?.pilot_result?.pattern ||
    source?.pilot_result?.patternId ||
    source?.pilot_setup?.caseData?.patternId ||
    source?.pilot_setup?.pattern ||
    source?.pilot_setup?.patternId ||
    source?.routeMeta?.pattern ||
    null
  );
}

/**
 * 提取 patternLabel
 */
export function getResolvedPatternLabel(source = {}) {
  return (
    source?.patternLabel ||
    source?.resolvedPatternLabel ||
    source?.pilot_result?.patternLabel ||
    source?.pilot_setup?.patternLabel ||
    source?.routeMeta?.patternLabel ||
    null
  );
}

/**
 * 提取 chainId
 */
export function getResolvedChainId(source = {}) {
  return (
    source?.chainId ||
    source?.resolvedChainId ||
    source?.pilot_result?.chainId ||
    source?.pilot_setup?.chainId ||
    source?.routeMeta?.chainId ||
    null
  );
}

/**
 * 提取 stage
 */
export function getResolvedStage(source = {}) {
  return (
    source?.caseData?.stage ||
    source?.stage ||
    source?.resolvedStage ||
    source?.pilot_result?.caseData?.stage ||
    source?.pilot_result?.stage ||
    source?.pilot_setup?.caseData?.stage ||
    source?.pilot_setup?.stage ||
    source?.routeMeta?.stage ||
    null
  );
}

/**
 * 提取 caseId
 */
export function getResolvedCaseId(source = {}) {
  return (
    source?.caseData?.caseId ||
    source?.caseId ||
    source?.case_id ||
    source?.pilot_result?.caseData?.caseId ||
    source?.pilot_result?.caseId ||
    source?.pilot_setup?.caseData?.caseId ||
    source?.pilot_setup?.caseId ||
    source?.routeMeta?.caseId ||
    null
  );
}

/**
 * 提取 eventWindow
 */
export function getResolvedEventWindow(source = {}) {
  return (
    source?.eventWindow ||
    source?.routeMeta?.eventWindow ||
    source?.pilot_result?.eventWindow ||
    source?.pilot_setup?.eventWindow ||
    source?.preview?.eventWindow ||
    source?.preview?.pilot_preview?.eventWindow ||
    "7-day pilot window"
  );
}

/**
 * 提取 progressLabel
 */
export function getResolvedProgressLabel(source = {}) {
  return (
    source?.progressLabel ||
    source?.routeMeta?.progressLabel ||
    source?.pilot_result?.progressLabel ||
    source?.pilot_setup?.progressLabel ||
    source?.preview?.progressLabel ||
    source?.preview?.pilot_preview?.progressLabel ||
    "Pilot access opened"
  );
}

/**
 * 提取 nextAction
 *
 * 注意：
 * - resolvedNextAction 是“页面展示 / 导航提示语义”
 * - legacyNextActionCode 是旧 routing 决策码
 * 两者不要再混成一个字段
 */
export function getResolvedNextAction(source = {}) {
  return (
    source?.nextAction ||
    source?.routeMeta?.nextAction ||
    source?.pilot_result?.nextAction ||
    source?.pilot_setup?.nextAction ||
    source?.preview?.nextAction ||
    source?.preview?.pilot_preview?.nextAction ||
    source?.preview?.pilot_preview?.entry ||
    ""
  );
}

/* ------------------------- 状态判断器 ------------------------- */

/**
 * 是否已有结构结论
 * v1:
 * - runId / pattern 任一存在即可视为已有结构结论
 */
/**
 * Structural resolution must come from resolved identifiers (runId / pattern),
 * not from routeDecision flags.
 */
export function hasStructuralResolution(source = {}) {
  const runId = getResolvedRunId(source);
  const pattern = getResolvedPattern(source);

  return (
    hasValue(runId) ||
    hasValue(pattern)
  );
}

/**
 * 是否存在可用于“结构正在浮现”的信号
 */
export function hasEmergingSignals(source = {}) {
  if (Array.isArray(source?.signals) && source.signals.length > 0) return true;
  if (Array.isArray(source?.topSignals) && source.topSignals.length > 0) return true;
  if (Array.isArray(source?.top_signals) && source.top_signals.length > 0) return true;

  const signalCount =
    source?.signalCount ||
    source?.signal_count ||
    source?.pilot_result?.signalCount ||
    source?.pilot_result?.signal_count;

  return isPositiveNumber(signalCount);
}

/**
 * 是否进入“7天已到 / 采样窗关闭”
 *
 * 说明：
 * 这不是 Receipt Ready
 * 只是说明 Pilot 进入总结阶段
 */
export function isPilotComplete(source = {}) {
  return (
    source?.pilotComplete === true ||
    source?.isPilotComplete === true ||
    source?.samplingWindowClosed === true ||
    source?.windowClosed === true ||
    source?.pilot_result?.pilotComplete === true ||
    source?.pilot_result?.samplingWindowClosed === true ||
    source?.pilot_setup?.pilotComplete === true
  );
}

export function isSamplingWindowClosed(source = {}) {
  const dayCount =
    source?.dayCount ??
    source?.day_count ??
    source?.currentDay ??
    source?.current_day ??
    source?.pilot_result?.dayCount ??
    source?.pilot_result?.currentDay ??
    source?.pilot_setup?.dayCount ??
    source?.pilot_setup?.currentDay;

  return (
    source?.samplingWindowClosed === true ||
    source?.windowClosed === true ||
    source?.pilot_result?.samplingWindowClosed === true ||
    source?.pilot_setup?.samplingWindowClosed === true ||
    (typeof dayCount === "number" && dayCount >= 7)
  );
}

/**
 * 是否允许使用独立总结页
 *
 * 现在先默认 false
 * 以后你单独做 /pilot-summary 时，只要传 usePilotSummary: true 即可
 */
export function shouldUsePilotSummary(source = {}) {
  return (
    source?.usePilotSummary === true ||
    source?.preferPilotSummary === true ||
    source?.routeMeta?.usePilotSummary === true
  );
}

/**
 * 是否达到 Receipt 可生成状态
 *
 * 规则：
 * 1) 必须已有结构结论
 * 2) 必须显式允许生成 Receipt
 *
 * 注意：
 * - pilot_complete 不等于 receipt_ready
 * - resolved 也不等于 receipt_ready
 */
export function isReceiptReady(source = {}) {
  const hasResolution =
    hasStructuralResolution(source) ||
    isReviewModeResolved(source) ||
    (
      hasEnoughStructuredEvents(source, 1) &&
      hasEvidenceSupport(source, 1) &&
      hasStructureCompleteness(source, 1)
    );

  const explicitReady =
    source?.allowReceipt === true ||
    source?.receiptReady === true ||
    source?.canGenerateReceipt === true ||
    source?.generateReceipt === true ||
    source?.routeMeta?.allowReceipt === true ||
    source?.structureStatus === PILOT_STRUCTURE_STATUS.RECEIPT_READY;

  return hasResolution && explicitReady;
}

/* ------------------------- 状态解析 ------------------------- */

export function isReviewModeResolved(source = {}) {
  const reviewMode = getReviewMode(source);

  return (
    reviewMode === "case_receipt" ||
    reviewMode === "final_receipt" ||
    reviewMode === "resolved" ||
    reviewMode === "verification_ready" ||
    reviewMode === "summary"
  );
}

export function hasEnoughStructuredEvents(source = {}, minimum = 1) {
  return getStructuredEventCount(source) >= minimum;
}

export function hasEvidenceSupport(source = {}, minimum = 1) {
  const score = getEvidenceSupportScore(source);
  return score !== null && score >= minimum;
}

export function hasStructureCompleteness(source = {}, minimum = 1) {
  const score = getStructureCompletenessScore(source);
  return score !== null && score >= minimum;
}

/**
 * 根据当前 source 推断结构状态
 *
 * 优先级很重要：
 * 1) 显式 structureStatus
 * 2) receipt_ready
 * 3) pilot_complete
 * 4) resolved
 * 5) emerging
 * 6) insufficient
 */
export function resolveStructureStatus(source = {}) {
  const explicitStatus = source?.structureStatus || source?.routeMeta?.structureStatus;
  if (hasValue(explicitStatus)) return explicitStatus;

  if (isReceiptReady(source)) {
    return PILOT_STRUCTURE_STATUS.RECEIPT_READY;
  }

  const reviewModeResolved = isReviewModeResolved(source);
  const enoughStructuredEvents = hasEnoughStructuredEvents(source, 1);
  const enoughEvidenceSupport = hasEvidenceSupport(source, 1);
  const enoughStructureCompleteness = hasStructureCompleteness(source, 1);
  const samplingWindowClosed = isSamplingWindowClosed(source);

  if (
    reviewModeResolved ||
    hasStructuralResolution(source) ||
    (enoughStructuredEvents && enoughEvidenceSupport && enoughStructureCompleteness)
  ) {
    return PILOT_STRUCTURE_STATUS.RESOLVED;
  }

  if (
    enoughStructuredEvents ||
    enoughEvidenceSupport ||
    enoughStructureCompleteness ||
    hasEmergingSignals(source)
  ) {
    return samplingWindowClosed
      ? PILOT_STRUCTURE_STATUS.PILOT_COMPLETE
      : PILOT_STRUCTURE_STATUS.EMERGING;
  }

  if (samplingWindowClosed || isPilotComplete(source)) {
    return PILOT_STRUCTURE_STATUS.PILOT_COMPLETE;
  }

  return PILOT_STRUCTURE_STATUS.INSUFFICIENT;
}

/* ------------------------- 路由决策 ------------------------- */

/**
 * 根据结构状态，决定前端应跳转到哪个目标页
 *
 * 返回结构：
 * {
 *   target,
 *   structureStatus,
 *   resolvedRunId,
 *   pattern,
 *   patternLabel,
 *   chainId,
 *   stage,
 *   caseId,
 *   reason,
 *   nextAction,
 *   allowReceipt,
 *   usePilotSummary
 * }
 */

export function resolvePilotRoute(source = {}) {
  const structureStatus = resolveStructureStatus(source);

  const resolvedRunId = getResolvedRunId(source);
  const pattern = getResolvedPattern(source);
  const patternLabel = getResolvedPatternLabel(source);
  const chainId = getResolvedChainId(source);
  const stage = getResolvedStage(source);
  const caseId = getResolvedCaseId(source);

  const resolvedEventWindow = getResolvedEventWindow(source);
  const resolvedProgressLabel = getResolvedProgressLabel(source);
  const resolvedNextAction = getResolvedNextAction(source);

  const allowReceipt = isReceiptReady(source);
  const usePilotSummary = shouldUsePilotSummary(source);

  // 1) Receipt ready
  if (structureStatus === PILOT_STRUCTURE_STATUS.RECEIPT_READY) {
    return {
      target: PILOT_ROUTE_TARGETS.RECEIPT,
      structureStatus,
      resolvedRunId,
      pattern,
      patternLabel,
      chainId,
      stage,
      caseId,
      reason: "structure_confirmed_for_receipt",
      nextAction: resolvedNextAction || "Generate receipt review",
      legacyNextActionCode: "generate_receipt",
      eventWindow: resolvedEventWindow,
      progressLabel: resolvedProgressLabel,
      allowReceipt: true,
      usePilotSummary,
    };
  }

  // 2) Pilot complete: 默认先进 pilot-result
  // 如果以后你单独做了总结页，则可切到 /pilot-summary
  if (structureStatus === PILOT_STRUCTURE_STATUS.PILOT_COMPLETE) {
    return {
      target: usePilotSummary
        ? PILOT_ROUTE_TARGETS.PILOT_SUMMARY
        : PILOT_ROUTE_TARGETS.PILOT_RESULT,
      structureStatus,
      resolvedRunId,
      pattern,
      patternLabel,
      chainId,
      stage,
      caseId,
      reason: "pilot_window_closed_summary_required",
      nextAction:
        resolvedNextAction ||
        (usePilotSummary
          ? "Open pilot summary"
          : "Open pilot result summary mode"),
      legacyNextActionCode: usePilotSummary
        ? "open_pilot_summary"
        : "open_pilot_result_summary_mode",
      eventWindow: resolvedEventWindow,
      progressLabel: resolvedProgressLabel,
      allowReceipt: false,
      usePilotSummary,
    };
  }

  // 3) Resolved but not receipt-ready
  if (structureStatus === PILOT_STRUCTURE_STATUS.RESOLVED) {
    return {
      target: PILOT_ROUTE_TARGETS.PILOT_RESULT,
      structureStatus,
      resolvedRunId,
      pattern,
      patternLabel,
      chainId,
      stage,
      caseId,
      reason: "structure_resolved_but_not_receipt_ready",
      nextAction: resolvedNextAction || "Review resolved structure",
      legacyNextActionCode: "review_resolved_structure",
      eventWindow: resolvedEventWindow,
      progressLabel: resolvedProgressLabel,
      allowReceipt: false,
      usePilotSummary,
    };
  }

  // 4) Emerging
  if (structureStatus === PILOT_STRUCTURE_STATUS.EMERGING) {
    return {
      target: PILOT_ROUTE_TARGETS.PILOT,
      structureStatus,
      resolvedRunId,
      pattern,
      patternLabel,
      chainId,
      stage,
      caseId,
      reason: "signals_emerging_continue_sampling",
      nextAction: resolvedNextAction || "Continue sampling",
      legacyNextActionCode: "continue_sampling",
      eventWindow: resolvedEventWindow,
      progressLabel: resolvedProgressLabel,
      allowReceipt: false,
      usePilotSummary,
    };
  }

  // 5) Insufficient
  return {
    target: PILOT_ROUTE_TARGETS.RESULT,
    structureStatus,
    resolvedRunId,
    pattern,
    patternLabel,
    chainId,
    stage,
    caseId,
    reason: "insufficient_structure_return_to_result",
    nextAction: resolvedNextAction || "Return to result",
    legacyNextActionCode: "return_to_result",
    eventWindow: resolvedEventWindow,
    progressLabel: resolvedProgressLabel,
    allowReceipt: false,
    usePilotSummary,
  };
}

/* ------------------------- 路径映射 ------------------------- */

/**
 * target -> pathname
 *
 * 现在先写死最小版
 * 以后如果你 routes.js 统一了 ROUTES，再改成从 ROUTES 导入
 */
export function getPilotRoutePath(target) {
  switch (target) {
    case PILOT_ROUTE_TARGETS.RESULT:
      return "/result";

    case PILOT_ROUTE_TARGETS.PILOT:
      return "/pilot";

    case PILOT_ROUTE_TARGETS.PILOT_RESULT:
      return "/pilot-result";

    case PILOT_ROUTE_TARGETS.PILOT_SUMMARY:
      return "/pilot-summary";

    case PILOT_ROUTE_TARGETS.RECEIPT:
      return "/receipt";

    default:
      return "/result";
  }
}

/* ------------------------- routeMeta 构建 ------------------------- */

/**
 * 构建统一 routeMeta
 * 供 navigate(..., { state }) 使用
 */
export function buildPilotRouteMeta(source = {}) {
  const decision = resolvePilotRoute(source);

  return {
    ...decision,
    pathname: getPilotRoutePath(decision.target),
    reviewMode: getReviewMode(source),
    structuredEventCount: getStructuredEventCount(source),
    evidenceSupport: getEvidenceSupportScore(source),
    structureCompleteness: getStructureCompletenessScore(source),
    samplingWindowClosed: isSamplingWindowClosed(source),
    eventWindow: decision.eventWindow || getResolvedEventWindow(source),
    progressLabel: decision.progressLabel || getResolvedProgressLabel(source),
    nextAction: decision.nextAction || getResolvedNextAction(source),
  };
}

/* ------------------------- 页面 state 构建器 ------------------------- */

/**
 * 给 navigate 的 state 做一个统一壳子
 * 这样你后面各页读取字段会更稳
 */
export function buildPilotNavigationState(source = {}) {
  const routeMeta = buildPilotRouteMeta(source);

  return {
    routeMeta,

    pilot_setup: {
      resolvedRunId: routeMeta.resolvedRunId || null,
      pattern: routeMeta.pattern || null,
      patternLabel: routeMeta.patternLabel || null,
      chainId: routeMeta.chainId || null,
      stage: routeMeta.stage || null,
      caseId: routeMeta.caseId || null,
      structureStatus: routeMeta.structureStatus || null,
      allowReceipt: routeMeta.allowReceipt === true,
      usePilotSummary: routeMeta.usePilotSummary === true,
      reviewMode: routeMeta.reviewMode || null,
      structuredEventCount: routeMeta.structuredEventCount || 0,
      evidenceSupport: routeMeta.evidenceSupport ?? null,
      structureCompleteness: routeMeta.structureCompleteness ?? null,
      samplingWindowClosed: routeMeta.samplingWindowClosed === true,
      eventWindow: routeMeta.eventWindow || null,
      progressLabel: routeMeta.progressLabel || null,
      nextAction: routeMeta.nextAction || null,
    },

    pilot_result: {
      runId: routeMeta.resolvedRunId || null,
      pattern: routeMeta.pattern || null,
      patternLabel: routeMeta.patternLabel || null,
      chainId: routeMeta.chainId || null,
      stage: routeMeta.stage || null,
      caseId: routeMeta.caseId || null,
      structureStatus: routeMeta.structureStatus || null,
      eventWindow: routeMeta.eventWindow || null,
      progressLabel: routeMeta.progressLabel || null,
      nextAction: routeMeta.nextAction || null,
      summaryMode: routeMeta.structureStatus === PILOT_STRUCTURE_STATUS.PILOT_COMPLETE,
      reviewMode: routeMeta.reviewMode || null,
      structuredEventCount: routeMeta.structuredEventCount || 0,
      evidenceSupport: routeMeta.evidenceSupport ?? null,
      structureCompleteness: routeMeta.structureCompleteness ?? null,
      samplingWindowClosed: routeMeta.samplingWindowClosed === true,
    },
  };
}

/* ------------------------- 调试函数 ------------------------- */

/**
 * 用于 console 快速验 routing 决策
 */
export function debugPilotRouting(source = {}) {
  const structureStatus = resolveStructureStatus(source);
  const decision = resolvePilotRoute(source);
  const routeMeta = buildPilotRouteMeta(source);
  const navState = buildPilotNavigationState(source);

  return {
    input: source,
    structureStatus,
    decision,
    routeMeta,
    navState,
  };
}