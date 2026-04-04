// frontend/stageRunMap.js

const STAGE_RUN_MAP = {
  S1: ["RUN001", "RUN002", "RUN003", "RUN004", "RUN005"],
  S2: ["RUN006", "RUN007", "RUN008", "RUN009", "RUN010"],
  S3: ["RUN011", "RUN012", "RUN013", "RUN014", "RUN015"],
  S4: ["RUN016", "RUN017", "RUN018", "RUN019", "RUN020"],
  S5: ["RUN021", "RUN022", "RUN023", "RUN024", "RUN025"],
};

export function getStageFromRun(runId) {
  if (!runId) return "S1";

  for (const [stage, runList] of Object.entries(STAGE_RUN_MAP)) {
    if (runList.includes(runId)) {
      return stage;
    }
  }

  return "S1";
}

export default STAGE_RUN_MAP;