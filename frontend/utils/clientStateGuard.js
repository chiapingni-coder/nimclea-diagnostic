export function getUrlCaseId(locationLike = {}) {
  try {
    const params = new URLSearchParams(locationLike?.search || "");
    return String(params.get("caseId") || "").trim();
  } catch {
    return "";
  }
}

export function runClientStateGuard(locationLike = {}) {
  if (typeof window === "undefined") {
    return {
      workspaceEmail: "",
      urlCaseId: getUrlCaseId(locationLike),
      currentCaseId: "",
    };
  }

  const nimcleaEmail = String(localStorage.getItem("nimclea_email") || "").trim();

  const urlCaseId = getUrlCaseId(locationLike);
  const storedCaseId = String(localStorage.getItem("nimclea_current_case_id") || "").trim();

  if (urlCaseId && storedCaseId && storedCaseId !== urlCaseId) {
    localStorage.removeItem("nimclea_current_case_id");
  }

  return {
    workspaceEmail: nimcleaEmail,
    urlCaseId,
    currentCaseId: urlCaseId || storedCaseId,
  };
}
