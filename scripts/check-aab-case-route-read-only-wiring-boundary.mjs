#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const caseRoutesPath = path.join(repoRoot, "backend", "routes", "caseRoutes.js");
const adapterPath = path.join(
  repoRoot,
  "backend",
  "utils",
  "aabCaseAuthorityReadAdapterRehearsal.js"
);

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function checkMissing(source, needle, message) {
  check(!source.includes(needle), message);
}

function checkAllMissing(source, needles, messagePrefix) {
  for (const needle of needles) {
    checkMissing(source, needle, `${messagePrefix}: ${needle}`);
  }
}

try {
  console.log("Nimclea AAB GET /case/:caseId Read-Only Wiring Boundary Guard v0.1");
  console.log("");

  check(existsSync(caseRoutesPath), "backend/routes/caseRoutes.js exists");
  check(
    existsSync(adapterPath),
    "backend/utils/aabCaseAuthorityReadAdapterRehearsal.js exists"
  );

  const caseRoutesSource = readFileSync(caseRoutesPath, "utf8");
  const adapterSource = readFileSync(adapterPath, "utf8");

  check(
    !/from\s+["']node:fs["']|from\s+["']fs["']/.test(adapterSource),
    "AAB case authority read adapter has no fs import"
  );
  checkMissing(
    adapterSource,
    "supabaseClient",
    "AAB case authority read adapter has no supabaseClient import"
  );
  checkMissing(
    adapterSource,
    "service_role",
    "AAB case authority read adapter does not reference service_role"
  );
  checkMissing(
    adapterSource,
    "SUPABASE_SERVICE_ROLE_KEY",
    "AAB case authority read adapter does not reference SUPABASE_SERVICE_ROLE_KEY"
  );
  checkMissing(
    adapterSource,
    "writeFile",
    "AAB case authority read adapter does not write files"
  );
  checkMissing(
    adapterSource,
    "appendFile",
    "AAB case authority read adapter does not append files"
  );

  checkAllMissing(
    caseRoutesSource,
    [
      "renderJsonMigration",
      "importRenderJson",
      "migrate Render JSON",
      "bulk migration",
      "SUPABASE_SERVICE_ROLE_KEY",
      "service_role",
      "frontendServiceRoleAccess",
      "localStorageAuthority",
      "productionWrite",
      "writeFile",
      "appendFile",
    ],
    "caseRoutes.js forbidden boundary marker absent"
  );

  const adapterImportPresent = caseRoutesSource.includes(
    "aabCaseAuthorityReadAdapterRehearsal"
  );
  const readOnlyFunctionNames = [
    "createAabCaseAuthorityReadPlan",
    "selectAabCaseAuthoritySource",
    "describeAabCaseAuthorityReadBoundary",
    "assertNoAabCaseAuthorityMigrationIntent",
  ];
  const readOnlyFunctionUsed = readOnlyFunctionNames.some((name) =>
    caseRoutesSource.includes(name)
  );
  const isControlledWiringMode = adapterImportPresent || readOnlyFunctionUsed;

  if (!isControlledWiringMode) {
    check(true, "Mode A: AAB case route remains unwired");
  } else {
    check(true, "Mode B: controlled read-only AAB case route wiring detected");

    const aabFunctionNames = Array.from(
      new Set(caseRoutesSource.match(/\b\w*Aab\w*\b/g) || [])
    );
    const disallowedAabFunctionNames = aabFunctionNames.filter(
      (name) => !readOnlyFunctionNames.includes(name)
    );

    check(
      disallowedAabFunctionNames.length === 0,
      "caseRoutes.js uses only approved read-only AAB adapter function names"
    );

    checkAllMissing(
      caseRoutesSource,
      [
        "confirmAabPayment",
        "paymentConfirmed",
        "confirm-checkout-session",
        "pdfExportUnlocked",
        "pdfExportUnlock",
        "verificationUnlocked",
        "verificationUnlock",
        "createMigration",
        "migration script",
      ],
      "caseRoutes.js controlled wiring forbidden write/unlock marker absent"
    );
  }

  console.log("");
  console.log("PASS AAB case route read-only wiring boundary guard passed.");
} catch (error) {
  console.error("");
  console.error(`FAIL ${error?.message || error}`);
  process.exit(1);
}
