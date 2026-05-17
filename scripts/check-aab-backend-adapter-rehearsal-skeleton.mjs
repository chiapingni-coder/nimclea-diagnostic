#!/usr/bin/env node

import {
  AAB_ADAPTER_REHEARSAL_SCOPE,
  assertAabAdapterInput,
  describeAabTrustLoopAuthority,
  getAabAdapterRehearsalScope,
  isAabWriteRehearsalAllowed,
} from "../backend/utils/aabBackendAdapterRehearsal.js";

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function checkThrows(fn, message) {
  let threw = false;

  try {
    fn();
  } catch (error) {
    threw = error instanceof Error && Boolean(error.message);
  }

  check(threw, message);
}

try {
  console.log("Nimclea AAB Backend Adapter Rehearsal Skeleton Guard v0.1");
  console.log("");

  check(
    AAB_ADAPTER_REHEARSAL_SCOPE &&
      typeof AAB_ADAPTER_REHEARSAL_SCOPE === "object",
    "AAB_ADAPTER_REHEARSAL_SCOPE export exists"
  );
  check(
    typeof getAabAdapterRehearsalScope === "function",
    "getAabAdapterRehearsalScope export exists"
  );
  check(
    typeof assertAabAdapterInput === "function",
    "assertAabAdapterInput export exists"
  );
  check(
    typeof describeAabTrustLoopAuthority === "function",
    "describeAabTrustLoopAuthority export exists"
  );
  check(
    typeof isAabWriteRehearsalAllowed === "function",
    "isAabWriteRehearsalAllowed export exists"
  );

  const scope = getAabAdapterRehearsalScope();
  check(
    scope !== AAB_ADAPTER_REHEARSAL_SCOPE &&
      scope.renderJsonMigration === "prohibited" &&
      scope.backendOnlyAdapterBoundary === true &&
      scope.frontendDirectSupabaseWrites === "prohibited" &&
      scope.isolatedRehearsalBeforeProductionWrite === true,
    "rehearsal scope returns a plain object copy with required boundary statements"
  );

  check(assertAabAdapterInput({}) === true, "safe adapter input returns true");
  checkThrows(
    () => assertAabAdapterInput({ renderJsonMigration: true }),
    "Render JSON migration input throws"
  );
  checkThrows(
    () => assertAabAdapterInput({ frontendServiceRoleAccess: true }),
    "frontend service_role access input throws"
  );
  checkThrows(
    () => assertAabAdapterInput({ localStorageAuthority: true }),
    "localStorage authority input throws"
  );
  checkThrows(
    () => assertAabAdapterInput({ productionWrite: true }),
    "production write input throws"
  );

  const authority = describeAabTrustLoopAuthority();
  for (const key of [
    "caseAuthority",
    "receiptReady",
    "paymentConfirmed",
    "pdfExportUnlocked",
    "verificationUnlocked",
  ]) {
    check(
      authority?.[key] &&
        Array.isArray(authority[key].allowed) &&
        Array.isArray(authority[key].disallowed),
      `${key} authority description exists`
    );
  }

  check(
    isAabWriteRehearsalAllowed({
      isolated: true,
      production: false,
      renderJsonMigration: false,
      frontendServiceRoleAccess: false,
    }) === true,
    "isolated non-production write rehearsal returns true"
  );
  check(
    isAabWriteRehearsalAllowed({ isolated: true, production: true }) === false,
    "production write returns false"
  );
  check(
    isAabWriteRehearsalAllowed({
      isolated: true,
      production: false,
      renderJsonMigration: true,
    }) === false,
    "Render JSON migration write rehearsal returns false"
  );
  check(
    isAabWriteRehearsalAllowed({
      isolated: true,
      production: false,
      frontendServiceRoleAccess: true,
    }) === false,
    "frontend service role access write rehearsal returns false"
  );

  console.log("");
  console.log("PASS AAB backend adapter rehearsal skeleton guard passed.");
} catch (error) {
  console.error("");
  console.error(`FAIL ${error?.message || error}`);
  process.exit(1);
}
