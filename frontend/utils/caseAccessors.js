import { getSafeCaseSummary } from "./caseSchema";

export function getCaseSummary(input = {}) {
  return (
    getSafeCaseSummary(input.caseData || {}) ||
    input.summaryText ||
    input.summaryContext ||
    ""
  );
}

export function getCaseContext(input = {}) {
  return (
    input.caseData?.description ||
    input.caseData?.eventContext ||
    input.caseInput ||
    ""
  );
}

export function getCaseScenarioCode(input = {}) {
  return (
    input.caseData?.scenarioCode ||
    input.scenarioCode ||
    input.scenarioLabel ||
    ""
  );
}

export function getCaseStage(input = {}) {
  return (
    input.caseData?.stage ||
    input.stage ||
    input.stageLabel ||
    ""
  );
}

export function getCaseRunCode(input = {}) {
  return (
    input.caseData?.fallbackRunCode ||
    input.runId ||
    input.runLabel ||
    ""
  );
}

export function getCasePatternId(input = {}) {
  return (
    input.caseData?.patternId ||
    input.pattern ||
    input.patternId ||
    ""
  );
}

export function getCaseWeakestDimension(input = {}) {
  return (
    input.caseData?.weakestDimension ||
    input.weakestDimension ||
    input.judgmentFocus ||
    ""
  );
}