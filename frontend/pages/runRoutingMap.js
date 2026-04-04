// E:\Nimclea_Products\diagnostic\frontend\pages\runRoutingMap.js

export const runRoutingMap = {
  default: {
    title: "Decision Path Identified",
    stageLabel: "Structure recognized",
    nextStep: "Start the 7-day pilot",
    recommendedPage: "/pilot",
    summary:
      "Your diagnostic result has identified a usable decision structure. The next step is to validate it through a short pilot flow.",
  },

  RUN065: {
    title: "Refund Execution Path",
    stageLabel: "Escalation-ready",
    nextStep: "Generate a receipt and verification trail",
    recommendedPage: "/receipt",
    summary:
      "This route indicates a service non-delivery pattern with responsibility diffusion. The recommended action is to formalize the judgment and move into receipt-based validation.",
    microNote:
      "This RUN represents the current structural failure point under pressure.",
  },

  RUN037: {
    title: "Boundary Recovery Path",
    stageLabel: "Authority reclaim",
    nextStep: "Start the 7-day pilot",
    recommendedPage: "/pilot",
    summary:
      "This route indicates boundary pressure and authority erosion. The system recommends a pilot phase to test controlled response and verification logic.",
  },
};

export function getRunRouteMeta(runId) {
  if (!runId) return runRoutingMap.default;
  return runRoutingMap[runId] || runRoutingMap.default;
}