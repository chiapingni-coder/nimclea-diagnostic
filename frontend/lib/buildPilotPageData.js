import { PILOT_STAGE_META } from "./pilotStageMeta";
import { PILOT_DAY_COPY } from "./pilotDayCopy";

const PILOT_DAY_BLUEPRINT = [
  "diagnose",
  "extract",
  "design",
  "execute",
  "advance",
  "stabilize",
  "close",
];

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

function getStepStatus(index) {
  if (index === 0) return "current";
  if (index <= 2) return "next";
  return "upcoming";
}

export function buildPilotPageData(resultData = {}) {
  const rawChainId = resultData?.chainId || "CHAIN-002";
  const chainId = getSafeChainId(rawChainId);
  const rawStage = resultData?.stage || "S1";
  const stage = getSafeStage(chainId, rawStage);

  const meta = PILOT_STAGE_META[chainId][stage];
  const chainCopy = PILOT_DAY_COPY[chainId];

  const startIndex = STAGE_START_INDEX[stage] ?? 0;

  const dayPlanList = Array.from({ length: 7 }, (_, index) => {
    const blueprintIndex = startIndex + index;
    const stepKey =
      PILOT_DAY_BLUEPRINT[blueprintIndex] || "close";

    const step = chainCopy[stepKey] || chainCopy.close;

    return {
      day: `Day ${index + 1}`,
      stepKey,
      title: step.title,
      description: step.desc,
      status: getStepStatus(index),
    };
  });

  const currentRun = resultData?.currentRun || "RUN-UNKNOWN";
  const nextRun =
    resultData?.nextRun ||
    (meta.targetStage === "STABLE" ? "STABLE" : "RUN-NEXT");

  const patternName = resultData?.patternName || "Pattern not available";
  const chainName = resultData?.chainName || chainId;
  const stageName = resultData?.stageName || stage;

  const milestone =
    meta.targetStage === "STABLE"
      ? "Stabilize and preserve the achieved result."
      : `Move from ${stage} to ${meta.targetStage}.`;

  const ctaLabel =
    meta.targetStage === "STABLE"
      ? "Generate Pilot Summary"
      : `Advance Toward ${meta.targetStage}`;

  return {
    pilotTitle: meta.pilotTitle,
    pilotGoal: meta.pilotGoal,
    targetStage: meta.targetStage,
    targetOutcome: meta.targetOutcome,
    milestone,
    expectedOutcome: meta.targetOutcome,
    ctaLabel,

    chainId,
    chainName,
    stage,
    stageName,
    patternName,
    currentRun,
    nextRun,

    dayPlanList,
    
    structurePath: {
      pattern: patternName,
      chain: chainName,
      stage: stageName,
      run: currentRun,
      explanation: `You are currently at ${stageName} within ${chainName}. This stage focuses on progressing toward ${meta.targetStage}.`,
      nextAction:
        meta.targetStage === "STABLE"
          ? "Stabilize the result and prepare a verification-ready summary."
          : `Advance from ${stage} to ${meta.targetStage}.`,
    },
  };
}