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

/* ------------------------- 字段提取器 ------------------------- */

/**
 * 从多种可能命名中提取 resolvedRunId
 */
export function getResolvedRunId(source = {}) {
  return (
    source?.resolvedRunId ||
    source?.runId ||
    source?.resolved_run_id ||
    source?.pilot_result?.runId ||
    source?.pilot_result?.resolvedRunId ||
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
    source?.pattern ||
    source?.patternId ||
    source?.resolvedPattern ||
    source?.pilot_result?.pattern ||
    source?.pilot_result?.patternId ||
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
    source?.stage ||
    source?.resolvedStage ||
    source?.pilot_result?.stage ||
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
    source?.caseId ||
    source?.case_id ||
    source?.pilot_result?.caseId ||
    source?.pilot_setup?.caseId ||
    source?.routeMeta?.caseId ||
    null
  );
}

/* ------------------------- 状态判断器 ------------------------- */

/**
 * 是否已有结构结论
 * v1:
 * - runId / pattern 任一存在即可视为已有结构结论
 */
export function hasStructuralResolution(source = {}) {
  const runId = getResolvedRunId(source);
  const pattern = getResolvedPattern(source);
  return hasValue(runId) || hasValue(pattern);
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
    source?.pilotComplete === true ||
    source?.isPilotComplete === true ||
    source?.samplingWindowClosed === true ||
    source?.windowClosed === true ||
    source?.pilot_result?.pilotComplete === true ||
    source?.pilot_result?.samplingWindowClosed === true ||
    source?.pilot_setup?.pilotComplete === true ||
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
  const hasResolution = hasStructuralResolution(source);

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

  if (isPilotComplete(source)) {
    return PILOT_STRUCTURE_STATUS.PILOT_COMPLETE;
  }

  if (hasStructuralResolution(source)) {
    return PILOT_STRUCTURE_STATUS.RESOLVED;
  }

  if (hasEmergingSignals(source)) {
    return PILOT_STRUCTURE_STATUS.EMERGING;
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
      nextAction: "generate_receipt",
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
      nextAction: usePilotSummary ? "open_pilot_summary" : "open_pilot_result_summary_mode",
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
      nextAction: "review_resolved_structure",
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
      nextAction: "continue_sampling",
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
    nextAction: "return_to_result",
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
    },

    pilot_result: {
      runId: routeMeta.resolvedRunId || null,
      pattern: routeMeta.pattern || null,
      patternLabel: routeMeta.patternLabel || null,
      chainId: routeMeta.chainId || null,
      stage: routeMeta.stage || null,
      caseId: routeMeta.caseId || null,
      structureStatus: routeMeta.structureStatus || null,
      nextAction: routeMeta.nextAction || null,
      summaryMode: routeMeta.structureStatus === PILOT_STRUCTURE_STATUS.PILOT_COMPLETE,
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