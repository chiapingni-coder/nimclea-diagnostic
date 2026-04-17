const STORAGE_KEY = "nimclea_trial_session";

export function getTrialSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("getTrialSession error:", error);
    return null;
  }
}

export function setTrialSession(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("setTrialSession error:", error);
  }
}

export function clearTrialSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("clearTrialSession error:", error);
  }
}