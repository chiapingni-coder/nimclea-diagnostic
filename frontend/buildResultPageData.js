// frontend/buildResultPageData.js

import { getStageCopy } from "./resultsStageCopy";
import { getStageFromRun } from "./stageRunMap";

export function buildResultPageData(input = {}) {
  const {
    runId,
    pattern,
    signals = [],
    score,
    summary,
    nextStep,
  } = input;

  const stage = getStageFromRun(runId);
  const stageCopy = getStageCopy(stage);

  return {
    header: {
      title: "Diagnostic Result",
      subtitle: stageCopy.title,
    },

    summary: {
      runId: runId || "RUN-UNKNOWN",
      pattern: pattern || "UNCLASSIFIED",
      stage,
      score: score ?? null,
      text: summary || stageCopy.description,
    },

    signals: signals.map((s, i) => ({
      id: i + 1,
      label: s.label || `Signal ${i + 1}`,
      value: s.value || "unknown",
    })),

    nextAction: {
      title: "Recommended Next Step",
      text: nextStep || stageCopy.next,
    },
  };
}