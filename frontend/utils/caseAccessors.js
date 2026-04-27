import { getSafeCaseSummary } from "./caseSchema";

function getSafeSource(input = {}) {
  return input && typeof input === "object" ? input : {};
}

function getSafeCaseData(input = {}) {
  const source = getSafeSource(input);
  return source.caseData && typeof source.caseData === "object"
    ? source.caseData
    : {};
}

function getSafePilotResult(input = {}, caseData = {}) {
  const source = getSafeSource(input);
  const pilotResult =
    source.pilotResult ||
    source.pilot_result ||
    caseData.pilotResult ||
    caseData.pilot_result ||
    {};

  return pilotResult && typeof pilotResult === "object" ? pilotResult : {};
}

export function getCaseSummary(input = {}) {
  const source = getSafeSource(input);
  const caseData = getSafeCaseData(source);
  const pilotResult = getSafePilotResult(source, caseData);

  return (
    source.summary ||
    source.workspace_summary ||
    source.workspaceSummary ||
    source.summaryText ||
    source.summaryContext ||
    pilotResult.summary ||
    getSafeCaseSummary(caseData) ||
    caseData.summary ||
    caseData.workspace_summary ||
    caseData.workspaceSummary ||
    "No summary available."
  );
}

export function getCaseContext(input = {}) {
  const source = getSafeSource(input);
  const caseData = getSafeCaseData(source);

  return (
    caseData.description ||
    caseData.eventContext ||
    source.caseInput ||
    ""
  );
}

export function getCaseScenarioCode(input = {}) {
  const source = getSafeSource(input);
  const caseData = getSafeCaseData(source);
  const pilotResult = getSafePilotResult(source, caseData);

  return (
    caseData.scenarioCode ||
    pilotResult.scenarioCode ||
    pilotResult.scenario ||
    source.scenarioCode ||
    source.scenarioLabel ||
    ""
  );
}

export function getCaseStage(input = {}) {
  const source = getSafeSource(input);
  const caseData = getSafeCaseData(source);
  const pilotResult = getSafePilotResult(source, caseData);

  return (
    caseData.stage ||
    pilotResult.stage ||
    source.stage ||
    source.stageLabel ||
    ""
  );
}

export function getCaseRunCode(input = {}) {
  const source = getSafeSource(input);
  const caseData = getSafeCaseData(source);
  const pilotResult = getSafePilotResult(source, caseData);

  return (
    caseData.fallbackRunCode ||
    caseData.runId ||
    pilotResult.runId ||
    source.runId ||
    source.runLabel ||
    ""
  );
}

export function getCasePatternId(input = {}) {
  const source = getSafeSource(input);
  const caseData = getSafeCaseData(source);
  const pilotResult = getSafePilotResult(source, caseData);

  return (
    caseData.patternId ||
    pilotResult.patternId ||
    source.pattern ||
    source.patternId ||
    ""
  );
}

export function getCaseWeakestDimension(input = {}) {
  const source = getSafeSource(input);
  const caseData = getSafeCaseData(source);
  const pilotResult = getSafePilotResult(source, caseData);

  return (
    caseData.weakestDimension ||
    pilotResult.weakestDimension ||
    source.weakestDimension ||
    source.judgmentFocus ||
    ""
  );
}
