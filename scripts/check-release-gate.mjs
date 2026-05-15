#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const results = [];

function addResult(status, area, detail) {
  results.push({ status, area, detail });
}

function checkDocExists(relativeFile) {
  const absoluteFile = path.join(repoRoot, relativeFile);

  if (existsSync(absoluteFile)) {
    addResult("PASS", `doc: ${relativeFile}`, "required document exists");
  } else {
    addResult("FAIL", `doc: ${relativeFile}`, "required document is missing");
  }
}

function runExistingScript(relativeFile, area) {
  const absoluteFile = path.join(repoRoot, relativeFile);

  if (!existsSync(absoluteFile)) {
    addResult("WARN", area, `${relativeFile} is missing; check skipped`);
    return;
  }

  const result = spawnSync("node", [absoluteFile], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    addResult("FAIL", area, `${relativeFile} could not run: ${result.error.message}`);
    return;
  }

  if (result.status === 0) {
    addResult("PASS", area, `${relativeFile} exited 0`);
    return;
  }

  const stderr = (result.stderr || "").trim();
  const stdout = (result.stdout || "").trim();
  const detail = stderr || stdout || `exit code ${result.status}`;
  addResult("FAIL", area, `${relativeFile} failed: ${detail.split(/\r?\n/).slice(-1)[0]}`);
}

function printResults() {
  console.log("Nimclea Golden Case release gate v0.1");
  console.log("");

  for (const result of results) {
    console.log(`${result.status} ${result.area} - ${result.detail}`);
  }

  const counts = results.reduce(
    (summary, result) => {
      summary[result.status] += 1;
      return summary;
    },
    { PASS: 0, WARN: 0, FAIL: 0 }
  );

  const finalResult = counts.FAIL > 0 ? "FAIL" : counts.WARN > 0 ? "WARN" : "PASS";

  console.log("");
  console.log(`Summary: PASS ${counts.PASS} / WARN ${counts.WARN} / FAIL ${counts.FAIL}`);
  console.log(`Final result: ${finalResult}`);

  return finalResult;
}

const requiredDocs = [
  "docs/NIMCLEA_RELEASE_GATE_ALIGNMENT_V0_1.md",
  "docs/NIMCLEA_PROGRESS_AND_RISK_MAP_V0_1.md",
  "docs/NIMCLEA_GOLDEN_CASE_RELEASE_GATE_EXECUTION_PLAN_V0_1.md",
  "docs/NIMCLEA_GOLDEN_TEST_CASES_V0_1.md",
  "docs/NIMCLEA_GOLDEN_TEST_SMOKE_CHECK_V0_1.md",
  "docs/NIMCLEA_GOLDEN_TEST_EXECUTION_PLAN_V0_1.md",
  "docs/NIMCLEA_READINESS_SCORING_RULE_TABLE_V0_1.md",
  "docs/NIMCLEA_17G5A_RELEASE_STABILITY_STOP_LINE_V0_1.md",
];

for (const doc of requiredDocs) {
  checkDocExists(doc);
}

runExistingScript(
  "scripts/check-golden-readiness.mjs",
  "golden readiness smoke"
);
runExistingScript(
  "scripts/check-golden-backend-aggregation.mjs",
  "backend /cases aggregation smoke"
);
runExistingScript(
  "scripts/check-receipt-verification-contract.mjs",
  "receipt verification access contract"
);
runExistingScript(
  "scripts/check-verification-locked-contract.mjs",
  "verification locked page contract"
);
runExistingScript(
  "scripts/check-7-day-trial-lifecycle-contract.mjs",
  "7-day trial lifecycle contract"
);
runExistingScript(
  "scripts/check-save-eligibility-boundary.mjs",
  "save eligibility boundary contract"
);
runExistingScript(
  "scripts/check-receipt-readiness-transition-contract.mjs",
  "receipt readiness transition contract"
);
runExistingScript(
  "scripts/check-receipt-readiness-visual-gate.mjs",
  "receipt readiness visual gate"
);
runExistingScript(
  "scripts/check-cases-page-trial-status-bar-contract.mjs",
  "CasesPage trial status bar contract"
);
runExistingScript(
  "scripts/check-backend-trial-status-helper-contract.mjs",
  "backend trial status helper contract"
);
runExistingScript(
  "scripts/check-backend-trial-status-helper-runtime.mjs",
  "backend trial status helper runtime smoke"
);
runExistingScript(
  "scripts/check-backend-trial-status-endpoint-contract.mjs",
  "backend trial status endpoint contract"
);
runExistingScript(
  "scripts/check-backend-trial-status-endpoint-runtime.mjs",
  "backend trial status endpoint runtime smoke"
);
runExistingScript(
  "scripts/check-frontend-trial-status-adapter-contract.mjs",
  "frontend trial status adapter contract"
);
runExistingScript(
  "scripts/check-frontend-trial-status-adapter-runtime.mjs",
  "frontend trial status adapter runtime smoke"
);
runExistingScript(
  "scripts/check-cases-page-trial-status-bar-guard.mjs",
  "CasesPage 7-day trial status bar guard"
);
runExistingScript(
  "scripts/check-result-review-cta-guard.mjs",
  "ResultPage review CTA guard"
);

addResult("WARN", "receipt readiness UI smoke", "manual-only release area");
addResult("WARN", "verification unlock UI smoke", "manual-only release area");
addResult("WARN", "payment ledger / Stripe dry-run smoke", "manual-only release area");
addResult("WARN", "new vs returning user routing smoke", "manual-only release area");
addResult("WARN", "stale local case naming smoke", "manual-only release area");

const finalResult = printResults();

if (finalResult === "FAIL") {
  process.exit(1);
}
