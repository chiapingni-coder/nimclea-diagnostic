export function resolveAccessMode(caseData = {}) {
  const normalizedScore = Number(
    caseData.normalizedScore ??
      caseData.score ??
      caseData.receiptScore ??
      0
  );

  const eventCount = Number(
    caseData.eventCount ??
      caseData.events?.length ??
      caseData.capturedEvents?.length ??
      0
  );

  const receiptPaid = Boolean(
    caseData.receiptPaid ??
      caseData.payment?.receiptPaid ??
      caseData.paid?.receipt ??
      false
  );

  const verificationPaid = Boolean(
    caseData.verificationPaid ??
      caseData.payment?.verificationPaid ??
      caseData.paid?.verification ??
      false
  );

  const receiptEligible = normalizedScore >= 3.0;
  const verificationEligible = receiptEligible && eventCount > 0;

  let mode = "trial";

  if (receiptPaid && verificationPaid) {
    mode = "paid_full";
  } else if (receiptPaid) {
    mode = "paid_receipt";
  }

  return {
    mode,

    normalizedScore,
    eventCount,

    receiptEligible,
    verificationEligible,

    receiptPaid,
    verificationPaid,

    canViewReceipt: receiptEligible,
    canViewFullReceipt: receiptPaid,

    canViewVerification: verificationEligible,
    canRunVerification: verificationPaid,

    canExportPDF: receiptPaid,
    canUploadFiles: verificationPaid,

    needsScore: !receiptEligible,
    needsEvent: eventCount <= 0,
    isTrial: mode === "trial",
    isPaidReceipt: mode === "paid_receipt",
    isPaidFull: mode === "paid_full",
  };
}
