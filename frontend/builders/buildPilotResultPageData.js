export default function buildPilotResultPageData({
  resultSeed,
  resultPageData,
  pilotData,
}) {
  const scenario =
    pilotData?.scenario ||
    resultPageData?.scenario ||
    resultSeed?.scenario ||
    "General Decision Risk";

  const summary =
    pilotData?.summary ||
    resultPageData?.summary ||
    resultSeed?.summary ||
    "No summary available yet.";

  const signals =
    pilotData?.signals ||
    resultPageData?.signals ||
    resultSeed?.signals ||
    [];

  const nextStep =
    pilotData?.nextStep ||
    resultPageData?.nextStep ||
    resultSeed?.nextStep ||
    "Continue verification.";

  return {
    scenario,
    summary,
    signals,
    nextStep,
    raw: {
      resultSeed,
      resultPageData,
      pilotData,
    },
  };
}