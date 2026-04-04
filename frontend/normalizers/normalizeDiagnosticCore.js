export function normalizeDiagnosticCore(input) {
  return {
    raw: input,
    answers: input || {}
  };
}