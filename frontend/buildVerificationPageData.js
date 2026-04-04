// frontend/buildVerificationPageData.js

export function buildVerificationPageData(receipt) {
  if (!receipt) {
    return {
      status: "invalid",
      checks: [],
    };
  }

  const checks = [
    {
      name: "Receipt Exists",
      passed: !!receipt.receipt_id,
    },
    {
      name: "RUN ID Valid",
      passed: !!receipt.summary?.runId,
    },
    {
      name: "Stage Valid",
      passed: !!receipt.summary?.stage,
    },
    {
      name: "Timestamp Present",
      passed: !!receipt.timestamp,
    },
  ];

  const allPassed = checks.every((c) => c.passed);

  return {
    status: allPassed ? "verified" : "failed",
    checks,
  };
}