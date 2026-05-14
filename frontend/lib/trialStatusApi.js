const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";

const SAFE_HIDDEN_TRIAL_STATUS = {
  loading: false,
  error: null,
  trialActive: false,
  trialDay: null,
  trialEnded: false,
  casesCreatedDuringTrial: 0,
  shouldShowTrialStatusBar: false,
  shouldShowPilotSummaryEntry: false,
  pilotSummaryAvailable: false,
  pilotSummaryPaid: false,
  source: "none",
};

function hiddenTrialStatus(error = null) {
  return {
    ...SAFE_HIDDEN_TRIAL_STATUS,
    error,
  };
}

function isValidTrialStatusData(data) {
  return (
    data &&
    typeof data === "object" &&
    typeof data.trialActive === "boolean" &&
    typeof data.trialEnded === "boolean" &&
    (typeof data.trialDay === "number" || data.trialDay === null) &&
    typeof data.casesCreatedDuringTrial === "number" &&
    typeof data.shouldShowTrialStatusBar === "boolean" &&
    typeof data.shouldShowPilotSummaryEntry === "boolean" &&
    typeof data.pilotSummaryAvailable === "boolean" &&
    typeof data.pilotSummaryPaid === "boolean" &&
    typeof data.source === "string"
  );
}

function toDisplayModel(data) {
  return {
    loading: false,
    error: null,
    trialActive: data.trialActive,
    trialDay: data.trialDay,
    trialEnded: data.trialEnded,
    casesCreatedDuringTrial: data.casesCreatedDuringTrial,
    shouldShowTrialStatusBar: data.shouldShowTrialStatusBar,
    shouldShowPilotSummaryEntry: data.shouldShowPilotSummaryEntry,
    pilotSummaryAvailable: data.pilotSummaryAvailable,
    pilotSummaryPaid: data.pilotSummaryPaid,
    source: data.source,
  };
}

export async function getTrialStatusDisplayModel({ email } = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return hiddenTrialStatus();
  }

  try {
    // Backend remains the lifecycle authority; this adapter never infers from localStorage or routes.
    const response = await fetch(
      `${API_BASE}/trial-status?email=${encodeURIComponent(normalizedEmail)}`
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.success !== true) {
      return hiddenTrialStatus("trial_status_unavailable");
    }

    if (!isValidTrialStatusData(payload.data)) {
      return hiddenTrialStatus("trial_status_invalid_response");
    }

    return toDisplayModel(payload.data);
  } catch {
    // Failure hides UI rather than guessing trial lifecycle state.
    return hiddenTrialStatus("trial_status_unavailable");
  }
}
