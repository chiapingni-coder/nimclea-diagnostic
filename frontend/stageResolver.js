export function resolveStage({ scenarioCode, pressureProfile }) {
  if (scenarioCode === "pre_audit_collapse") {
    return "Breakdown Stage";
  }

  if (scenarioCode === "boundary_blur") {
    return "Boundary Drift Stage";
  }

  return "Stabilizing Stage";
}