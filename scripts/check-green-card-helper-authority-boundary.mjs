#!/usr/bin/env node

import {
  hasBackendOwnedReceiptAccess,
  hasStrictBackendOwnedReceiptAccess,
  isBackendOwnedReceiptPaidOrActivated,
  isBackendOwnedReceiptReady,
} from "../frontend/utils/dataContractLifecycle.js";

const checks = [];

function check(condition, message, observed) {
  checks.push({ pass: Boolean(condition), message, observed });
}

const legacyOnlyReadyFixture = {
  receiptEligible: true,
  caseReceiptEligible: true,
  receipt_ready: true,
  receipt: { eligible: true },
  receiptStatus: "ready",
  stage: "receipt_ready",
  status: "receipt_ready",
};

const canonicalBackendReadyFixture = {
  receiptEligible: true,
  receiptStatus: "ready",
  receipt: {
    eligible: true,
    source: "backend_canonical_receipt_authority",
  },
};

const legacyOnlyPaidFixture = {
  paid: true,
  paymentStatus: "paid",
  receipt_paid: true,
  receiptStatus: "paid",
  stage: "receipt_paid",
  status: "receipt_paid",
};

check(
  isBackendOwnedReceiptReady(legacyOnlyReadyFixture) === false,
  "legacy-only ready fixture does not satisfy strict backend-owned receipt readiness",
  isBackendOwnedReceiptReady(legacyOnlyReadyFixture)
);

check(
  hasStrictBackendOwnedReceiptAccess(legacyOnlyReadyFixture) === false,
  "legacy-only ready fixture does not satisfy strict backend-owned receipt access",
  hasStrictBackendOwnedReceiptAccess(legacyOnlyReadyFixture)
);

check(
  isBackendOwnedReceiptReady(canonicalBackendReadyFixture) === true,
  "explicit backend/canonical authority fixture satisfies strict backend-owned receipt readiness",
  isBackendOwnedReceiptReady(canonicalBackendReadyFixture)
);

check(
  hasStrictBackendOwnedReceiptAccess(canonicalBackendReadyFixture) === true,
  "explicit backend/canonical authority fixture satisfies strict backend-owned receipt access",
  hasStrictBackendOwnedReceiptAccess(canonicalBackendReadyFixture)
);

check(
  isBackendOwnedReceiptPaidOrActivated(legacyOnlyPaidFixture) === false,
  "legacy-only paid fixture does not satisfy strict backend-owned paid/activated authority",
  isBackendOwnedReceiptPaidOrActivated(legacyOnlyPaidFixture)
);

check(
  hasBackendOwnedReceiptAccess(legacyOnlyReadyFixture) === false,
  "hasBackendOwnedReceiptAccess is not satisfiable by legacy readiness hints alone",
  hasBackendOwnedReceiptAccess(legacyOnlyReadyFixture)
);

const failed = checks.filter((item) => !item.pass);

for (const item of checks) {
  const status = item.pass ? "PASS" : "FAIL";
  console.log(`${status} ${item.message} - observed ${JSON.stringify(item.observed)}`);
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} green-card helper authority checks failed.`
  );
  process.exit(1);
}

console.log(`\nPASS: ${checks.length}/${checks.length} green-card helper authority checks passed.`);
