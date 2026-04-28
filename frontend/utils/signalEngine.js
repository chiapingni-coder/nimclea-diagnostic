export const SIGNAL_PRIORITY = {
  duplicate_transaction: 5,
  data_inconsistency: 4,
  authority_boundary_unclear: 4,
  interpretation_conflict: 3,
  manual_reconciliation: 3,
  external_pressure: 2,
};

export const inferSignalsFromText = (text = "") => {
  const t = String(text || "").toLowerCase();
  const signals = [];

  if (t.includes("duplicate")) {
    signals.push("duplicate_transaction");
  }

  if (
    t.includes("inconsistency") ||
    t.includes("inconsistencies") ||
    t.includes("conflict") ||
    t.includes("conflicting")
  ) {
    signals.push("data_inconsistency");
  }

  if (
    t.includes("unclear") ||
    t.includes("scope unclear") ||
    t.includes("authority") ||
    t.includes("boundary")
  ) {
    signals.push("authority_boundary_unclear");
  }

  if (
    t.includes("interpreted differently") ||
    t.includes("interpret differently") ||
    t.includes("different interpretation")
  ) {
    signals.push("interpretation_conflict");
  }

  if (
    t.includes("manual") ||
    t.includes("manual reconciliation") ||
    t.includes("reconciled")
  ) {
    signals.push("manual_reconciliation");
  }

  if (
    t.includes("pressure") ||
    t.includes("urgent") ||
    t.includes("rushed") ||
    t.includes("delay")
  ) {
    signals.push("external_pressure");
  }

  return Array.from(new Set(signals));
};