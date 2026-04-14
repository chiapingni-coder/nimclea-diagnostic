import { PILOT_STAGE_META } from "./pilotStageMeta";
import { PILOT_DAY_COPY } from "./pilotDayCopy";

const STAGE_START_INDEX = {
  S1: 0,
  S2: 1,
  S3: 2,
  S4: 3,
  S5: 4,
};

function getSafeChainId(chainId) {
  if (PILOT_STAGE_META[chainId] && PILOT_DAY_COPY[chainId]) {
    return chainId;
  }
  return "CHAIN-002";
}

function getSafeStage(chainId, stage) {
  if (PILOT_STAGE_META[chainId]?.[stage]) {
    return stage;
  }
  return "S1";
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toSafeNumber(value, fallback = 0) {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function getResolvedCtaLabel(resultData = {}) {
  return resultData?.routeMeta?.ctaLabel || "";
}

function getWindowStatus(resultData = {}) {
  if (
    resultData?.samplingWindowClosed === true ||
    resultData?.windowClosed === true ||
    resultData?.pilotComplete === true ||
    resultData?.isPilotComplete === true
  ) {
    return "closing";
  }

  const structuredEventCount =
    resultData?.structuredEventCount ??
    resultData?.reviewedEventCount ??
    resultData?.eventReviewCount ??
    resultData?.eventHistory?.length ??
    resultData?.pilotEntries?.length ??
    0;

  if (structuredEventCount > 0) {
    return "active";
  }

  return "ready";
}

function getProgressLabel(resultData = {}) {
  return resultData?.routeMeta?.progressLabel || "";
}

function getWindowExplanation({
  workflowName,
  weakestDimension,
  structuredEventCount,
  targetStage,
}) {
  if (structuredEventCount <= 0) {
    return `Start with one real ${workflowName || "workflow"} and log the first event where structural pressure becomes visible.`;
  }

  if (weakestDimension) {
    return `This pilot window is observing how ${weakestDimension} affects real execution as events accumulate toward ${targetStage}.`;
  }

  return `This pilot window is tracking real event pressure and structural progress toward ${targetStage}.`;
}

function getNextAction({ resultData = {} }) {
  return resultData?.routeMeta?.nextAction || "";
}

export function buildPilotPageData(resultData = {}) {
  const rawChainId = resultData?.chainId || "CHAIN-002";
  const chainId = getSafeChainId(rawChainId);

  const rawStage = resultData?.stage || "S1";
  const stage = getSafeStage(chainId, rawStage);

  const meta = PILOT_STAGE_META[chainId][stage];
  const chainCopy = PILOT_DAY_COPY[chainId];

  const currentRun = resultData?.currentRun || "RUN-UNKNOWN";
  const nextRun =
    resultData?.nextRun ||
    (meta.targetStage === "STABLE" ? "STABLE" : "RUN-NEXT");

  const patternName = resultData?.patternName || "Pattern not available";
  const chainName = resultData?.chainName || chainId;
  const stageName = resultData?.stageName || stage;

  const workflowName =
    resultData?.workflow ||
    resultData?.workflowName ||
    resultData?.selectedWorkflow ||
    "workflow";

  const weakestDimension =
    resultData?.weakestDimension ||
    resultData?.caseSchema?.weakestDimension ||
    resultData?.caseData?.weakestDimension ||
    "";

  const eventHistory = toSafeArray(
    resultData?.eventHistory || resultData?.pilotEntries
  );

  const structuredEventCount = toSafeNumber(
    resultData?.structuredEventCount ??
      resultData?.reviewedEventCount ??
      resultData?.eventReviewCount ??
      eventHistory.length,
    0
  );

  const targetStage = meta.targetStage;
  const targetOutcome = meta.targetOutcome;

  const milestone =
    targetStage === "STABLE"
      ? "Stabilize and preserve the achieved result."
      : `Move from ${stage} to ${targetStage}.`;

  const ctaLabel =
    getResolvedCtaLabel(resultData) ||
    "Continue Event Logging";

  const windowStatus = getWindowStatus({
    ...resultData,
    structuredEventCount,
    eventHistory,
  });

  const progressLabel = getProgressLabel({
    ...resultData,
    structuredEventCount,
    eventHistory,
  });

  const windowExplanation = getWindowExplanation({
    workflowName,
    weakestDimension,
    structuredEventCount,
    targetStage,
  });

  const nextAction = getNextAction({
    resultData,
  });

  return {
    pilotTitle: meta.pilotTitle,
    pilotGoal: meta.pilotGoal,
    targetStage,
    targetOutcome,
    milestone,
    expectedOutcome: targetOutcome,
    ctaLabel,

    chainId,
    chainName,
    stage,
    stageName,
    patternName,
    currentRun,
    nextRun,

    workflowName,
    weakestDimension,
    structuredEventCount,
    eventHistory,
    windowStatus,
    progressLabel,
    windowExplanation,
    nextAction,

    eventWindow:
      resultData?.routeMeta?.eventWindow || "",

    eventWindowCard: {
      status: windowStatus,
      workflowName,
      structuredEventCount,
      progressLabel,
      explanation: windowExplanation,
      nextAction,
    },

    structurePath: {
      pattern: patternName,
      chain: chainName,
      stage: stageName,
      run: currentRun,
      explanation: `You are currently at ${stageName} within ${chainName}. This pilot now tracks real events instead of relying on a day-by-day plan.`,
      nextAction,
    },

    // legacy fallback: 保留这个字段，避免旧页面 map(dayPlanList) 时直接白屏
    dayPlanList: [],
    legacyDayPlanList: chainCopy ? [] : [],
    stageStartIndex: STAGE_START_INDEX[stage] ?? 0,
  };
}