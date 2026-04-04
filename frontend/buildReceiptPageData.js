// frontend/buildReceiptPageData.js

export function buildReceiptPageData(input) {
  const {
    runId,
    pattern,
    stage,
    signals = [],
    decision,
  } = input || {};

  return {
    receipt_id: `RCPT-${Date.now()}`,

    summary: {
      runId: runId || "RUN-UNKNOWN",
      pattern: pattern || "UNCLASSIFIED",
      stage: stage || "S1",
    },

    decision: decision || "No formal decision recorded",

    signals: signals.map((s, i) => ({
      id: i + 1,
      label: s.label || "signal",
      value: s.value || "unknown",
    })),

    timestamp: new Date().toISOString(),
  };
}