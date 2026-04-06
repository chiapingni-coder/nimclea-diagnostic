export function extractStructure(answers = {}) {
  if (!answers || typeof answers !== "object") {
    return {
      scenarioKey: "scenario_default",
      patternCode: "PAT-UNKNOWN",
      stageCode: "S0",
      runCode: "RUN-UNMAPPED",
      signals: [],
      scores: {},
      summary: "No structured answers were available.",
    };
  }

  const answerEntries = Object.entries(answers);

  const selectedValues = answerEntries.flatMap(([, value]) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) return [value];
    return [];
  });

  const textBlob = selectedValues.join(" ").toLowerCase();

  let scenarioKey = "scenario_default";
  let patternCode = "PAT-UNKNOWN";
  let stageCode = "S2";
  let runCode = "RUN044";

  if (textBlob.includes("audit") || textBlob.includes("evidence")) {
    scenarioKey = "pre_audit_collapse";
    patternCode = "PAT-012";
    stageCode = "S5";
    runCode = "RUN065";
  } else if (textBlob.includes("boundary") || textBlob.includes("ownership")) {
    scenarioKey = "boundary_blur";
    patternCode = "PAT-014";
    stageCode = "S3";
    runCode = "RUN050";
  } else if (textBlob.includes("stable") || textBlob.includes("clear")) {
    scenarioKey = "fully_ready";
    patternCode = "PAT-001";
    stageCode = "S4";
    runCode = "RUN064";
  }

  return {
    scenarioKey,
    patternCode,
    stageCode,
    runCode,
    signals: selectedValues.slice(0, 5),
    scores: {},
    summary: `Structure extraction suggests ${patternCode} at ${stageCode} with ${runCode}.`,
  };
}

export default extractStructure;