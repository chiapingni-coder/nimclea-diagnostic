export function getAccessMode(caseData) {
  if (!caseData) return "trial";

  if (
    caseData?.receipt?.paid === true ||
    caseData?.payment?.status === "paid" ||
    caseData?.accessMode === "paid"
  ) {
    return "paid";
  }

  return "trial";
}

export function isPaidCase(caseData) {
  return getAccessMode(caseData) === "paid";
}
