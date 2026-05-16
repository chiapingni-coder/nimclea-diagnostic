#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const results = [];

function addResult(status, detail) {
  results.push({ status, detail });
  console.log(`${status} ${detail}`);
}

function readRepoFile(relativeFile) {
  return readFileSync(path.join(repoRoot, relativeFile), "utf8");
}

function includesFolded(source, term) {
  return source.toLowerCase().includes(term.toLowerCase());
}

function includesAnyFolded(source, terms) {
  return terms.some((term) => includesFolded(source, term));
}

console.log("Nimclea 20A event review boundary smoke guard");
console.log("");

const requiredDoc = "docs/NIMCLEA_20A_EVENT_REVIEW_RECOVERY_PLAN_V0_1.md";
const requiredDocPath = path.join(repoRoot, requiredDoc);

if (!existsSync(requiredDocPath)) {
  addResult("FAIL", `${requiredDoc} is missing`);
} else {
  addResult("PASS", `${requiredDoc} exists`);

  const docSource = readRepoFile(requiredDoc);
  const requiredIntentChecks = [
    {
      label: "v5 Schema / Event-driven kernel",
      terms: ["v5 Schema / Event-driven kernel", "v5 schema", "event review layer"],
    },
    {
      label: "page-assembled state",
      terms: ["page-assembled state", "current event layer", "not yet a formal review system"],
    },
    {
      label: "event-driven + schema-backed foundation",
      terms: [
        "event-driven + schema-backed foundation",
        "event-driven and schema-backed foundation",
        "v5 schema planning boundary",
      ],
    },
    {
      label: "current release path remains authoritative",
      terms: [
        "current release path remains authoritative",
        "current release path remains untouched",
        "no production behavior change",
      ],
    },
    {
      label: "do not change payment",
      terms: ["Do not change payment", "Change payment behavior"],
    },
    {
      label: "do not change routing",
      terms: ["Do not change routing", "No route changes", "routing change"],
    },
    {
      label: "Receipt / Verification three-state behavior",
      terms: [
        "Receipt / Verification three-state behavior",
        "receipt readiness",
        "verification gating",
      ],
    },
    {
      label: "minimal eventReview object",
      terms: ["minimal eventReview object", "eventReview"],
    },
    {
      label: "caseSchema.js",
      terms: ["caseSchema.js", "caseSchema", "Candidate v5 Case Fields", "schemaVersion"],
    },
    {
      label: "schemaMapper.js",
      terms: ["schemaMapper.js", "schemaMapper", "v5 Schema Planning Boundary"],
    },
    {
      label: "eventReviewEngine.js",
      terms: ["eventReviewEngine.js", "eventReviewEngine", "Event Review Layer"],
    },
    {
      label: "check-event-review-contract.mjs",
      terms: ["check-event-review-contract.mjs", "smoke guard", "Acceptance Criteria"],
    },
  ];

  for (const check of requiredIntentChecks) {
    if (includesAnyFolded(docSource, check.terms)) {
      addResult("PASS", `required intent present: ${check.label}`);
    } else {
      addResult("FAIL", `required intent missing: ${check.label}`);
    }
  }
}

const pageFiles = [
  "frontend/pages/ResultPage.jsx",
  "frontend/pages/PilotPage.jsx",
  "frontend/pages/PilotSetupPage.jsx",
  "frontend/pages/PilotResultPage.jsx",
  "frontend/pages/ReceiptPage.jsx",
  "frontend/pages/VerificationPage.jsx",
  "frontend/pages/CasesPage.jsx",
  "frontend/ResultPage.jsx",
  "frontend/PilotPage.jsx",
  "frontend/PilotSetupPage.jsx",
  "frontend/PilotResultPage.jsx",
];

const forbiddenImportPatterns = [
  {
    label: "caseSchema",
    pattern: /\bimport\b[\s\S]*?\bfrom\s*["'][^"']*caseSchema[^"']*["']|require\s*\(\s*["'][^"']*caseSchema[^"']*["']\s*\)/,
  },
  {
    label: "schemaMapper",
    pattern: /\bimport\b[\s\S]*?\bfrom\s*["'][^"']*schemaMapper[^"']*["']|require\s*\(\s*["'][^"']*schemaMapper[^"']*["']\s*\)/,
  },
  {
    label: "eventReviewEngine",
    pattern: /\bimport\b[\s\S]*?\bfrom\s*["'][^"']*eventReviewEngine[^"']*["']|require\s*\(\s*["'][^"']*eventReviewEngine[^"']*["']\s*\)/,
  },
];

const allowedExistingRuntimeImports = new Set([
  "frontend/pages/ResultPage.jsx:schemaMapper",
  "frontend/pages/PilotPage.jsx:caseSchema",
  "frontend/pages/PilotSetupPage.jsx:caseSchema",
  "frontend/pages/PilotResultPage.jsx:caseSchema",
  "frontend/pages/ReceiptPage.jsx:caseSchema",
  "frontend/pages/VerificationPage.jsx:caseSchema",
  "frontend/ResultPage.jsx:schemaMapper",
  "frontend/PilotPage.jsx:caseSchema",
  "frontend/PilotSetupPage.jsx:caseSchema",
  "frontend/PilotResultPage.jsx:caseSchema",
]);

let scannedPageCount = 0;

for (const relativeFile of pageFiles) {
  const absoluteFile = path.join(repoRoot, relativeFile);
  if (!existsSync(absoluteFile)) continue;

  scannedPageCount += 1;
  const source = readRepoFile(relativeFile);

  for (const { label, pattern } of forbiddenImportPatterns) {
    if (pattern.test(source)) {
      const importKey = `${relativeFile}:${label}`;
      if (allowedExistingRuntimeImports.has(importKey)) {
        addResult("PASS", `${relativeFile} has baselined legacy ${label} import`);
      } else {
        addResult("FAIL", `${relativeFile} imports/requires ${label}`);
      }
    }
  }
}

if (scannedPageCount > 0) {
  addResult("PASS", `runtime coupling scan completed for ${scannedPageCount} page files`);
} else {
  addResult("FAIL", "no frontend page files were available for runtime coupling scan");
}

const eventReviewEngineFile = "frontend/utils/eventReviewEngine.js";
const eventReviewEnginePath = path.join(repoRoot, eventReviewEngineFile);

if (!existsSync(eventReviewEnginePath)) {
  addResult("FAIL", `${eventReviewEngineFile} is missing`);
} else {
  const eventReviewEngineSource = readRepoFile(eventReviewEngineFile);
  const requiredEventReviewSkeletonMarkers = [
    "export function reviewEventEntry",
    "reviewMode",
    "structureDelta",
    "hasEvidence",
    "hasResponse",
    "hasBoundary",
    "nextStepHint",
    "receipt_ready",
    "structured_progress",
    "summary_only",
  ];

  for (const marker of requiredEventReviewSkeletonMarkers) {
    if (eventReviewEngineSource.includes(marker)) {
      addResult("PASS", `${eventReviewEngineFile} passive skeleton marker present: ${marker}`);
    } else {
      addResult("FAIL", `${eventReviewEngineFile} passive skeleton marker missing: ${marker}`);
    }
  }
}

const failed = results.some((result) => result.status === "FAIL");

console.log("");
console.log(failed ? "Final result: FAIL" : "Final result: PASS");

if (failed) {
  process.exit(1);
}
