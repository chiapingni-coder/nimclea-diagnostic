#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const contractPath = path.join(
  repoRoot,
  "docs",
  "NIMCLEA_CASES_PAGE_TRIAL_STATUS_BAR_UI_IMPLEMENTATION_CONTRACT_V0_1.md"
);

function pass(message) {
  return { pass: true, message };
}

function fail(message, details = null) {
  return { pass: false, message, details };
}

function expect(condition, message, details = null) {
  return condition ? pass(message) : fail(message, details);
}

function normalize(value) {
  return String(value || "")
    .replace(/[`*_"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const contractExists = existsSync(contractPath);
const source = contractExists ? readFileSync(contractPath, "utf8") : "";
const normalizedSource = normalize(source);

function hasPhrase(phrase) {
  return normalizedSource.includes(normalize(phrase));
}

function hasAny(phrases) {
  return phrases.some((phrase) => hasPhrase(phrase));
}

function readTextIfPresent(relativeFile) {
  const absoluteFile = path.join(repoRoot, relativeFile);
  return existsSync(absoluteFile) ? readFileSync(absoluteFile, "utf8") : "";
}

const purposeAnchors = [
  "CasesPage trial status bar",
  "lightweight",
  "getTrialStatusDisplayModel",
  "case cards",
  "Detail routing",
  "foldouts",
  "payment",
  "receipt",
  "verification",
  "scoring",
  "/cases behavior",
];

const conceptualChecks = [
  {
    message: "insertion point is inside main CasesPage container",
    phrases: ["inside the main CasesPage container"],
  },
  {
    message: "insertion point is above Active Cases list",
    phrases: ["above the Active Cases list", "before Active Cases"],
  },
  {
    message: "insertion point is above case cards",
    phrases: ["above the Active Cases list / case cards", "above case cards"],
  },
  {
    message: "insertion point is not outside page shell",
    phrases: ["outside the page shell"],
  },
  {
    message: "insertion point is not floating independently",
    phrases: ["floating independently"],
  },
  {
    message: "insertion point is not inside individual case card",
    phrases: ["inside an individual case card"],
  },
  {
    message: "insertion point is not inside foldout content",
    phrases: ["inside foldout content"],
  },
  {
    message: "insertion point does not replace heading, button, or case list content",
    phrases: ["replacement for any existing heading, button, or case list content"],
  },
  {
    message: "data source uses getTrialStatusDisplayModel({ email })",
    phrases: ["getTrialStatusDisplayModel({ email })"],
  },
  {
    message: "CasesPage must pass resolved email",
    phrases: ["CasesPage must pass the resolved email"],
  },
  {
    message: "UI must not call /trial-status directly",
    phrases: ["call /trial-status directly"],
  },
  {
    message: "UI must not derive lifecycle from localStorage",
    phrases: ["derive trial lifecycle from localStorage"],
  },
  {
    message: "UI must not derive lifecycle from route text",
    phrases: ["derive trial lifecycle from route text"],
  },
  {
    message: "UI must not derive lifecycle from button text",
    phrases: ["derive trial lifecycle from button text"],
  },
  {
    message: "UI must not derive lifecycle from visual labels",
    phrases: ["derive trial lifecycle from visual labels"],
  },
  {
    message: "UI must not derive lifecycle from PilotResultPage existence",
    phrases: ["derive trial lifecycle from PilotResultPage existence"],
  },
  {
    message: "UI must not call /cases for trial lifecycle state",
    phrases: ["call /cases for trial lifecycle state"],
  },
  {
    message: "display condition requires shouldShowTrialStatusBar true",
    phrases: ["shouldShowTrialStatusBar === true"],
  },
  {
    message: "display condition hides for missing email",
    phrases: ["email is missing", "missing email"],
  },
  {
    message: "display condition hides for loading hidden state",
    phrases: ["loading hidden state"],
  },
  {
    message: "display condition hides for network failure",
    phrases: ["network failure"],
  },
  {
    message: "display condition hides for backend success false",
    phrases: ["backend returns success: false", "backend success false"],
  },
  {
    message: "display condition hides for malformed data",
    phrases: ["malformed"],
  },
  {
    message: "display condition hides for source none",
    phrases: ['source === "none"'],
  },
  {
    message: "failure states must not block CasesPage rendering",
    phrases: ["block CasesPage rendering"],
  },
  {
    message: "failure states must not show summary entry",
    phrases: ["show the pilot summary entry", "show summary entry"],
  },
  {
    message: "active bar includes Trial Day X of 7",
    phrases: ["Trial Day X of 7"],
  },
  {
    message: "active bar includes Cases created: N",
    phrases: ["Cases created: N"],
  },
  {
    message: "active bar requires same visual line",
    phrases: ["same visual line"],
  },
  {
    message: "active bar must not split into two stacked rows",
    phrases: ["two stacked rows"],
  },
  {
    message: "active bar is lightweight",
    phrases: ["lightweight"],
  },
  {
    message: "active bar is green-tinted",
    phrases: ["green-tinted"],
  },
  {
    message: "active bar is not a large hero banner",
    phrases: ["large hero banner"],
  },
  {
    message: "active bar is not scary warning styling",
    phrases: ["scary warning styling"],
  },
  {
    message: "active bar has no payment copy during active trial",
    phrases: ["payment copy during active trial"],
  },
  {
    message: "trial day uses adapter output only",
    phrases: ["Use trialDay from adapter output only"],
  },
  {
    message: "trial day is not calculated inside CasesPage",
    phrases: ["calculate trialDay"],
  },
  {
    message: "null trialDay hides bar",
    phrases: ["If trialDay is null, hide the active trial bar", "If trialDay is null, hide the bar"],
  },
  {
    message: "trial day must not be clamped or fabricated",
    phrases: ["clamp trialDay", "fabricate trialDay"],
    requireAll: true,
  },
  {
    message: "trial day must not use client time to correct backend result",
    phrases: ["client time to correct backend result"],
  },
  {
    message: "case count uses casesCreatedDuringTrial from adapter output",
    phrases: ["Use casesCreatedDuringTrial from adapter output"],
  },
  {
    message: "case count must not recalculate from visible case cards",
    phrases: ["recalculate trial case count from visible case cards"],
  },
  {
    message: "case count must not use total case count unless backend/adapter says so",
    phrases: ["use total case count unless backend / adapter says so", "use total case count unless backend/adapter says so"],
  },
  {
    message: "case count must not mutate cases to compute display",
    phrases: ["mutate cases to compute the display"],
  },
  {
    message: "loading avoids flashing incorrect trial UI",
    phrases: ["avoid flashing incorrect trial UI"],
  },
  {
    message: "loading hides bar by default",
    phrases: ["hide the bar by default"],
  },
  {
    message: "neutral placeholder is deferred",
    phrases: ["neutral placeholder", "separately approved"],
    requireAll: true,
  },
  {
    message: "adapter error does not surface raw backend error",
    phrases: ["do not surface raw backend error text to the user"],
  },
  {
    message: "adapter error does not alter case card routing",
    phrases: ["alter case card routing"],
  },
  {
    message: "error does not show pilot summary entry",
    phrases: ["do not show the pilot summary entry"],
  },
  {
    message: "pilot summary entry uses shouldShowPilotSummaryEntry true",
    phrases: ["shouldShowPilotSummaryEntry === true"],
  },
  {
    message: "pilot summary entry is part of trial status area",
    phrases: ["part of the trial status area or directly associated with it"],
  },
  {
    message: "pilot summary entry is not inside individual case cards",
    phrases: ["not appear inside individual case cards"],
  },
  {
    message: "pilot summary entry is CasesPage-level",
    phrases: ["CasesPage-level UI", "CasesPage-level pilot summary entry"],
  },
  {
    message: "pilot summary entry must not replace PilotResultPage",
    phrases: ["not replace PilotResultPage"],
  },
  {
    message: "pilot summary entry must not create, delete, or mutate summary data",
    phrases: ["not create summary data", "not delete summary data", "not mutate summary data"],
    requireAll: true,
  },
  {
    message: "pilot summary entry must not decide availability from PilotResultPage existence",
    phrases: ["not decide summary availability from PilotResultPage existence"],
  },
  {
    message: "pilot summary entry must not treat UI dismissal as payment",
    phrases: ["not treat UI dismissal as payment"],
  },
  {
    message: "pilotSummaryPaid true hides payment prompt entry",
    phrases: ["pilotSummaryPaid === true"],
  },
  {
    message: "copy includes active trial example",
    phrases: ["Trial Day X of 7 · Cases created: N"],
  },
  {
    message: "copy includes 7-day pilot summary available",
    phrases: ["7-day pilot summary available"],
  },
  {
    message: "copy includes Review summary",
    phrases: ["Review summary"],
  },
  {
    message: "copy must not imply receipt issuance",
    phrases: ["receipt issuance"],
  },
  {
    message: "copy must not imply verification",
    phrases: ["formal verification", "verification"],
  },
  {
    message: "copy must not imply payment success",
    phrases: ["payment success"],
  },
  {
    message: "copy must not say approved or certified",
    phrases: ["case approval", "certification"],
    requireAll: true,
  },
  {
    message: "copy must not replace ResultPage",
    phrases: ["ResultPage"],
  },
  {
    message: "copy must not replace PilotResult",
    phrases: ["PilotResultPage", "PilotResult"],
  },
  {
    message: "copy must not replace Receipt",
    phrases: ["Receipt"],
  },
  {
    message: "copy must not replace Verification terminology",
    phrases: ["Verification terminology"],
  },
  {
    message: "styling is lightweight green-tinted bar",
    phrases: ["lightweight", "green-tinted"],
    requireAll: true,
  },
  {
    message: "styling has calm status tone",
    phrases: ["calm in tone", "calm status tone"],
  },
  {
    message: "styling has compact vertical height",
    phrases: ["compact in vertical height", "compact vertical height"],
  },
  {
    message: "styling is inside page content container",
    phrases: ["inside the page content container"],
  },
  {
    message: "styling is responsive",
    phrases: ["responsive"],
  },
  {
    message: "styling keeps same-line Trial Day and Cases created",
    phrases: ["same line where space permits"],
  },
  {
    message: "narrow wrapping keeps content visually grouped",
    phrases: ["wrapping is unavoidable", "visually grouped"],
    requireAll: true,
  },
  {
    message: "styling does not create large banner",
    phrases: ["avoid large banner height", "large banner"],
  },
  {
    message: "no-touch: alter case cards",
    phrases: ["alter case cards"],
  },
  {
    message: "no-touch: alter Active Cases heading logic",
    phrases: ["alter Active Cases heading logic"],
  },
  {
    message: "no-touch: alter Detail button behavior",
    phrases: ["alter Detail button behavior"],
  },
  {
    message: "no-touch: alter Continue Case behavior",
    phrases: ["alter Continue Case behavior"],
  },
  {
    message: "no-touch: alter foldout behavior",
    phrases: ["alter foldout behavior"],
  },
  {
    message: "no-touch: alter Redo Diagnostic placement",
    phrases: ["alter Redo Diagnostic placement"],
  },
  {
    message: "no-touch: alter Archive case placement",
    phrases: ["alter Archive case placement"],
  },
  {
    message: "no-touch: alter View all cases capsule",
    phrases: ["alter View all cases capsule"],
  },
  {
    message: "no-touch: alter case sorting",
    phrases: ["alter case sorting"],
  },
  {
    message: "no-touch: alter case status labels",
    phrases: ["alter case status labels"],
  },
  {
    message: "no-touch: alter /cases fetch behavior",
    phrases: ["alter /cases fetch behavior"],
  },
  {
    message: "no-touch: alter routing",
    phrases: ["alter routing"],
  },
  {
    message: "no-touch: alter payment state",
    phrases: ["alter payment state"],
  },
  {
    message: "no-touch: alter receipt behavior",
    phrases: ["alter receipt behavior"],
  },
  {
    message: "no-touch: alter verification behavior",
    phrases: ["alter verification behavior"],
  },
  {
    message: "no-touch: alter scoring behavior",
    phrases: ["alter scoring behavior"],
  },
  {
    message: "no-touch: alter PilotResultPage",
    phrases: ["alter PilotResultPage"],
  },
  {
    message: "sequencing imports getTrialStatusDisplayModel",
    phrases: ["import getTrialStatusDisplayModel"],
  },
  {
    message: "sequencing adds isolated trialStatusDisplayModel state",
    phrases: ["isolated state for trialStatusDisplayModel"],
  },
  {
    message: "sequencing calls adapter only when resolved email exists",
    phrases: ["call the adapter only when resolved email exists"],
  },
  {
    message: "sequencing renders isolated TrialStatusBar above Active Cases list",
    phrases: ["render one isolated TrialStatusBar block above the Active Cases list"],
  },
  {
    message: "sequencing avoids changing existing case card JSX except insertion point",
    phrases: ["avoid changing existing case card JSX except for the insertion point"],
  },
  {
    message: "sequencing has no payment actions in first UI implementation",
    phrases: ["no payment actions in first UI implementation", "avoid payment actions in the first UI implementation"],
  },
  {
    message: "sequencing has no modal in first UI implementation unless contracted",
    phrases: ["no modal in first UI implementation unless separately contracted", "avoid a modal in the first UI implementation unless separately contracted"],
  },
  {
    message: "recommended next step points to 16-A22",
    phrases: ["16-A22"],
  },
  {
    message: "recommended next step is minimal CasesPage UI implementation",
    phrases: ["minimal CasesPage UI implementation"],
  },
  {
    message: "recommended next step imports adapter",
    phrases: ["import adapter", "import getTrialStatusDisplayModel"],
  },
  {
    message: "recommended next step uses isolated state",
    phrases: ["isolated state"],
  },
  {
    message: "recommended next step has no payment actions",
    phrases: ["no payment actions"],
  },
  {
    message: "recommended next step has no modal",
    phrases: ["no modal"],
  },
];

const checks = [
  expect(contractExists, "CasesPage trial status bar UI implementation contract doc should exist"),
  ...purposeAnchors.map((anchor) =>
    expect(hasPhrase(anchor), `purpose anchor present: ${anchor}`)
  ),
  ...conceptualChecks.map((check) =>
    expect(
      check.requireAll
        ? check.phrases.every((phrase) => hasPhrase(phrase))
        : hasAny(check.phrases),
      check.message
    )
  ),
];

const casesPageSource = readTextIfPresent("frontend/pages/CasesPage.jsx");
const routesSource = readTextIfPresent("frontend/routes.js");

checks.push(
  expect(
    !/getTrialStatusDisplayModel/.test(casesPageSource),
    "CasesPage does not import getTrialStatusDisplayModel"
  )
);
checks.push(
  expect(!/trialStatusApi/.test(casesPageSource), "CasesPage does not import trialStatusApi")
);
checks.push(
  expect(!/\/trial-status/.test(casesPageSource), "CasesPage does not contain /trial-status")
);
checks.push(
  expect(!/Trial Day X of 7/.test(casesPageSource), "CasesPage does not contain Trial Day X of 7")
);
checks.push(
  expect(!/Cases created:/.test(casesPageSource), "CasesPage does not contain Cases created:")
);
checks.push(
  expect(!/trialStatusApi/.test(routesSource), "routes.js does not reference trialStatusApi")
);
checks.push(
  expect(
    !/getTrialStatusDisplayModel/.test(routesSource),
    "routes.js does not reference getTrialStatusDisplayModel"
  )
);
checks.push(
  expect(!/trial-status/.test(routesSource), "routes.js does not reference trial-status")
);

const failed = checks.filter((check) => !check.pass);

console.log("\nNimclea CasesPage Trial Status Bar UI Contract Guard v0.1\n");

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.message}`);
  if (!check.pass && check.details) {
    console.error(
      typeof check.details === "string"
        ? check.details
        : JSON.stringify(check.details, null, 2)
    );
  }
}

if (failed.length > 0) {
  console.error(
    `\nFAIL: ${failed.length}/${checks.length} CasesPage trial status bar UI contract checks failed.`
  );
  process.exit(1);
}

console.log(
  `\nPASS: ${checks.length}/${checks.length} CasesPage trial status bar UI contract checks passed.`
);
