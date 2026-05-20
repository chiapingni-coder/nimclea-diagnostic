#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const casesPagePath = path.join(repoRoot, "frontend", "pages", "CasesPage.jsx");

const checks = [];

function check(condition, message, observed = "") {
  checks.push({ pass: Boolean(condition), message, observed });
}

function compact(source = "") {
  return String(source).replace(/\s+/g, " ").trim();
}

function extractConst(source, constName) {
  const constNeedle = `const ${constName} =`;
  const letNeedle = `let ${constName} =`;
  const constStart = source.indexOf(constNeedle);
  const letStart = source.indexOf(letNeedle);
  const start =
    constStart === -1 ? letStart : letStart === -1 ? constStart : Math.min(constStart, letStart);
  if (start === -1) return "";

  const nextConst = source.indexOf("\n  const ", start + constName.length);
  const nextLet = source.indexOf("\n  let ", start + constName.length);
  const candidates = [nextConst, nextLet].filter((index) => index !== -1);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.indexOf("\n", start);

  return end === -1 ? source.slice(start) : source.slice(start, end);
}

const sourceExists = existsSync(casesPagePath);
const source = sourceExists ? readFileSync(casesPagePath, "utf8") : "";
const normalizedSource = compact(source);
const strictReceiptAuthorityBlock = compact(
  extractConst(source, "strictBackendOwnedReceiptAuthority")
);
const legacyReadyBlock = compact(extractConst(source, "legacyBackendReceiptReadySignal"));
const directReadyBlock = compact(extractConst(source, "directBackendReceiptReady"));
const paidBlock = compact(extractConst(source, "paid"));
const displayStatusBlock = compact(extractConst(source, "displayStatus"));

check(sourceExists, "CasesPage.jsx exists");
check(
  strictReceiptAuthorityBlock.includes("hasBackendOwnedReceiptAccess(normalized)"),
  "formal UI receipt-ready authority uses hasBackendOwnedReceiptAccess(normalized)",
  strictReceiptAuthorityBlock
);
check(
  directReadyBlock === "const directBackendReceiptReady = strictBackendOwnedReceiptAuthority;",
  "directBackendReceiptReady is strict backend-owned receipt authority only",
  directReadyBlock
);
check(
  legacyReadyBlock.includes("hasCanonicalBackendReceiptReadySignal(normalized)") &&
    legacyReadyBlock.includes("normalized?.receiptEligible === true") &&
    legacyReadyBlock.includes("normalized?.caseReceiptEligible === true") &&
    legacyReadyBlock.includes('normalizeCaseText(normalized?.receiptStatus) === "ready"') &&
    legacyReadyBlock.includes('normalizeCaseText(normalized?.status) === "receipt_ready"') &&
    legacyReadyBlock.includes('normalizeCaseText(normalized?.stage) === "receipt_ready"'),
  "legacy readiness hints are retained only in the legacy diagnostic signal",
  legacyReadyBlock
);
check(
  paidBlock.includes("isBackendOwnedReceiptPaidOrActivated(normalized)") &&
    paidBlock.includes("strictBackendOwnedReceiptAuthority") &&
    paidBlock.includes("strictBackendOwnedVerificationAuthority") &&
    paidBlock.includes("isBackendReceiptPaidOrActivated(normalized)") &&
    !paidBlock.includes("normalized?.paid === true") &&
    !paidBlock.includes('normalized?.paymentStatus === "paid"'),
  "Paid display requires backend-owned paid/activated authority or strict authority paired with paid helper",
  paidBlock
);
check(
  displayStatusBlock.includes("legacyReceiptReadySignal && !receiptReady") &&
    displayStatusBlock.includes('"Result ready"'),
  "raw legacy receipt_ready status is fail-closed before displayStatus fallback",
  displayStatusBlock
);
check(
  !normalizedSource.includes(
    "const directBackendReceiptReady = hasCanonicalBackendReceiptReadySignal(normalized) || normalized?.receiptEligible === true"
  ),
  "directBackendReceiptReady is not produced by canonical/legacy readiness shortcuts",
  directReadyBlock
);

const failed = checks.filter((item) => !item.pass);

for (const item of checks) {
  const status = item.pass ? "PASS" : "FAIL";
  console.log(`${status} ${item.message}`);
  if (!item.pass && item.observed) {
    console.log(`  observed: ${item.observed}`);
  }
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} CasesPage green-card display authority checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} CasesPage green-card display authority checks passed.`
);
