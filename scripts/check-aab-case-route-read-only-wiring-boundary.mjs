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

  checkMissing(
    caseRoutesSource,
    "aabCaseAuthorityReadAdapterRehearsal",
    "caseRoutes.js has not imported the AAB read adapter"
  );
  checkMissing(
    caseRoutesSource,
    "createAabCaseAuthorityReadPlan",
    "caseRoutes.js does not call createAabCaseAuthorityReadPlan"
  );
  checkMissing(
    caseRoutesSource,
    "selectAabCaseAuthoritySource",
    "caseRoutes.js does not call selectAabCaseAuthoritySource"
  );

  checkMissing(
    caseRoutesSource,
    "renderJsonMigration",
    "caseRoutes.js has no renderJsonMigration intent"
  );
  checkMissing(
    caseRoutesSource,
    "importRenderJson",
    "caseRoutes.js has no importRenderJson intent"
  );
  checkMissing(
    caseRoutesSource,
    "bulk migration",
    "caseRoutes.js has no bulk migration intent"
  );
  checkMissing(
    caseRoutesSource,
    "migrate Render JSON",
    "caseRoutes.js has no migrate Render JSON intent"
  );

  checkMissing(
    caseRoutesSource,
    "SUPABASE_SERVICE_ROLE_KEY",
    "caseRoutes.js does not expose SUPABASE_SERVICE_ROLE_KEY"
  );
  checkMissing(
    caseRoutesSource,
    "service_role",
    "caseRoutes.js does not expose service_role"
  );
  checkMissing(
    caseRoutesSource,
    "frontendServiceRoleAccess",
    "caseRoutes.js has no frontend service-role authority flag"
  );

  console.log("");
  console.log("PASS AAB case route read-only wiring boundary guard passed.");
} catch (error) {
  console.error("");
  console.error(`FAIL ${error?.message || error}`);
  process.exit(1);
}
