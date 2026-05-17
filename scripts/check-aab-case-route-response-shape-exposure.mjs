#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const caseRoutesPath = path.join(repoRoot, "backend", "routes", "caseRoutes.js");

const approvedAabReadOnlyFunctions = [
  "createAabCaseAuthorityReadPlan",
  "selectAabCaseAuthoritySource",
  "describeAabCaseAuthorityReadBoundary",
  "assertNoAabCaseAuthorityMigrationIntent",
];

const responseInternalMarkers = [
  "aab",
  "AAB",
  "aabPlan",
  "aabSource",
  "aabSelection",
  "migrationPerformed",
  "writePerformed",
  "runtimeAuthorityChanged",
];

const userFacingAabKeys = [
  "aabRehearsal",
  "adapterRehearsal",
  "caseAuthorityReadPlan",
  "caseAuthoritySource",
];

const forbiddenMarkers = [
  "renderJsonMigration",
  "importRenderJson",
  "migrate Render JSON",
  "SUPABASE_SERVICE_ROLE_KEY",
  "service_role",
  "frontendServiceRoleAccess",
  "localStorageAuthority",
  "productionWrite",
  "writeFile",
  "appendFile",
];

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`PASS ${message}`);
}

function extractResJsonPayloads(source = "") {
  const payloads = [];
  let searchIndex = 0;
  const needle = "res.json";

  while (searchIndex < source.length) {
    const callIndex = source.indexOf(needle, searchIndex);
    if (callIndex === -1) break;

    const openParenIndex = source.indexOf("(", callIndex + needle.length);
    if (openParenIndex === -1) break;

    let depth = 0;
    let quote = "";
    let escaped = false;

    for (let index = openParenIndex; index < source.length; index += 1) {
      const char = source[index];

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = "";
        }
        continue;
      }

      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        continue;
      }

      if (char === "(") {
        depth += 1;
        continue;
      }

      if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          payloads.push(source.slice(openParenIndex + 1, index));
          searchIndex = index + 1;
          break;
        }
      }
    }

    if (searchIndex <= callIndex) break;
  }

  return payloads;
}

try {
  console.log("Nimclea AAB Case Route Response-Shape Exposure Guard v0.1");
  console.log("");

  check(existsSync(caseRoutesPath), "backend/routes/caseRoutes.js exists");

  const caseRoutesSource = readFileSync(caseRoutesPath, "utf8");
  const aabFunctionNames = Array.from(
    new Set(caseRoutesSource.match(/\b\w*Aab\w*\b/g) || [])
  );
  const disallowedAabFunctionNames = aabFunctionNames.filter(
    (name) => !approvedAabReadOnlyFunctions.includes(name)
  );

  check(
    disallowedAabFunctionNames.length === 0,
    "caseRoutes.js may import/use only approved AAB read-only adapter functions"
  );

  for (const key of userFacingAabKeys) {
    check(
      !caseRoutesSource.includes(key),
      `caseRoutes.js does not contain user-facing AAB response key: ${key}`
    );
  }

  for (const marker of forbiddenMarkers) {
    check(
      !caseRoutesSource.includes(marker),
      `caseRoutes.js forbidden marker absent: ${marker}`
    );
  }

  const responsePayloads = extractResJsonPayloads(caseRoutesSource);
  check(responsePayloads.length > 0, "caseRoutes.js contains res.json response payloads");

  responsePayloads.forEach((payload, index) => {
    for (const marker of responseInternalMarkers) {
      check(
        !payload.includes(marker),
        `res.json payload ${index + 1} does not expose AAB internal marker: ${marker}`
      );
    }
  });

  console.log("");
  console.log("PASS AAB case route response-shape exposure guard passed.");
} catch (error) {
  console.error("");
  console.error(`FAIL ${error?.message || error}`);
  process.exit(1);
}
