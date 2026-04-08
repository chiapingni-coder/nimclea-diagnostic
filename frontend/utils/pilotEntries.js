const PILOT_ENTRIES_KEY = "pilotEntries";

export function getPilotEntries() {
  try {
    const raw = localStorage.getItem(PILOT_ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to read pilot entries:", error);
    return [];
  }
}

export function appendPilotEntry(entry) {
  try {
    const existing = getPilotEntries();
    const next = [...existing, entry];
    localStorage.setItem(PILOT_ENTRIES_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error("Failed to append pilot entry:", error);
    return getPilotEntries();
  }
}

export function clearPilotEntries() {
  try {
    localStorage.removeItem(PILOT_ENTRIES_KEY);
  } catch (error) {
    console.error("Failed to clear pilot entries:", error);
  }
}