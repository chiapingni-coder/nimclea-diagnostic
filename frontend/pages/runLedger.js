const STORAGE_KEY = "nimclea_run_ledger";

export function getRunLedger() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to read run ledger:", error);
    return [];
  }
}

export function recordRun(entry) {
  try {
    const current = getRunLedger();
    const next = [
      ...current,
      {
        id: `RUNLOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...entry,
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error("Failed to write run ledger:", error);
    return [];
  }
}