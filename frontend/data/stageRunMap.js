export const stageRunMap = {
  "CHAIN-001": {
    S1: "RUN061",
    S2: "RUN062",
    S3: "RUN063",
    S4: "RUN064",
    S5: "RUN065",
  },
  "CHAIN-002": {
    S1: "RUN042",
    S2: "RUN048",
    S3: "RUN050",
    S4: "RUN052",
    S5: "RUN052",
  },
  "CHAIN-003": {
    S1: "RUN007",
    S2: "RUN044",
    S3: "RUN063",
    S4: "RUN064",
    S5: "RUN065",
  },
};

export function getRun(chainId, stage) {
  return stageRunMap[chainId]?.[stage] || null;
}