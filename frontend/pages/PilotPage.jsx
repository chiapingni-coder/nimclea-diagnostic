import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ROUTES from "../routes";
import { getPilotFocusBySignal } from "../pilotFocusMap.js";
import { normalizeCaseInput, getSafeCaseSummary } from "../utils/caseSchema";
import { getStableUserId } from "../utils/eventLogger";

import {
  registerTrialUser,
  saveCaseSnapshot,
  logTrialEvent,
} from "../lib/trialApi";
import { resolveAccessMode } from "../lib/accessMode";
import { getTrialSession, setTrialSession } from "../lib/trialSession";
import { resolveCaseId, upsertCase } from "../utils/caseRegistry.js";
import TopRightCasesCapsule from "../components/TopRightCasesCapsule.jsx";

const STORAGE_KEYS = {
  PREVIEW: "nimclea_preview_result",
  SESSION_ID: "nimclea_session_id",
};

const SCENARIO_LABEL_MAP = {
  pre_audit_collapse: "Pre-Audit Collapse",
  barely_functional: "Barely Functional",
  boundary_blur: "Boundary Blur",
  basically_stable: "Basically Stable",
  fully_ready: "Fully Ready",
  audit_ready: "Audit-Ready",
  C0: "Moderate Fit / Wedge Unclear",
  C1: "Judgment + Evidence Pain",
  C2: "Standardization Opportunity",
  C3: "Pilot-Ready Diagnostic Fit",
  C4: "Stable Structure",
};

function getEnglishScenarioLabel(preview) {
  const scenarioCode =
    preview?.scenario?.code ||
    preview?.scenarioCode ||
    preview?.scenario_code ||
    "";

  const rawLabel =
    preview?.scenario?.label ||
    preview?.scenarioLabel ||
    "";

  if (SCENARIO_LABEL_MAP[scenarioCode]) {
    return SCENARIO_LABEL_MAP[scenarioCode];
  }

  if (
    typeof rawLabel === "string" &&
    /^[\x00-\x7F\s\-\/+]+$/.test(rawLabel)
  ) {
    return rawLabel;
  }

  return "No Dominant Scenario";
}

function safeParse(jsonString) {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

function getStoredPreview(sessionId = "") {
  if (typeof window === "undefined") return null;

  const bySession = sessionId
    ? safeParse(localStorage.getItem(`nimclea_preview_result_${sessionId}`))
    : null;

  if (bySession) return bySession;

  return safeParse(localStorage.getItem(STORAGE_KEYS.PREVIEW));
}

function buildPilotRegisterEmail(stableUserId = "") {
  if (!stableUserId) return "pilot@nimclea.local";
  return `${stableUserId}@nimclea.local`;
}

function createPilotId(sessionId = "") {
  if (!sessionId) return "NIM-PILOT";
  return `PILOT-${String(sessionId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}`;
}

function isValidPreview(preview) {
  return !!(
    preview &&
    typeof preview === "object" &&
    typeof preview.title === "string" &&
    preview.scenario &&
    typeof preview.scenario === "object" &&
    Array.isArray(preview.top_signals) &&
    preview.top_signals.length > 0 &&
    preview.pilot_preview &&
    typeof preview.pilot_preview === "object"
  );
}

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-3xl border border-slate-200/70 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function Pill({ children, dark = false, success = false, style = {} }) {
  const cls = success
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : dark
    ? "bg-amber-100 text-amber-800 border border-amber-300"
    : "bg-white text-slate-700 border border-slate-200";

  return (
    <span
      style={style}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function SectionTitle({ title, hint }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      {hint ? (
        <p className="mt-1 text-sm leading-6 text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function EmptyState({ onBack }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="relative mx-auto max-w-3xl px-6 py-10">
        <TopRightCasesCapsule />
        <Card className="p-8">
          <h1 className="text-2xl font-semibold text-slate-950">
            No pilot context available
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            Open this page from the result screen so the pilot can inherit your result, current scenario, and recommended next step.
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={onBack}
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Back to Result
            </button>
          </div>
        </Card>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="relative mx-auto max-w-3xl px-6 py-10">
        <TopRightCasesCapsule />
        <div className="space-y-5">
          <div className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    </main>
  );
}

function PilotHero({
  preview,
  sessionId,
  onStart,
  pcMeta = null,
  pilotFocusKey = "",
  firstGuidedAction = "",
  firstStepLabel = "",
  weakestDimension = "",
  eventWindow = "",
  progressLabel = "",
  nextAction = "",
}) {

  const pilotId = useMemo(() => createPilotId(sessionId), [sessionId]);

  const strongestSignal = preview?.top_signals?.[0] || null;
  const scenarioLabel = getEnglishScenarioLabel(preview);

  const effectivePilotFocusKey =
    pilotFocusKey ||
    strongestSignal?.key ||
    strongestSignal?.signalKey ||
    "";

  const pilotFocus = getPilotFocusBySignal(effectivePilotFocusKey);

  const focusText =
    firstStepLabel ||
    pilotFocus?.title ||
    preview?.pilot_preview?.entry ||
    "Start with one workflow where structural friction is easiest to observe.";

  const resolvedEventWindow =
    eventWindow || "7-day pilot window";

  const resolvedProgressLabel =
    progressLabel || "Pilot access opened";

  const resolvedNextAction =
    nextAction || focusText;

  return (
    <Card className="overflow-hidden">
      <div className="p-8 md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          {pcMeta?.pc_id ? <Pill>{pcMeta.pc_id}</Pill> : null}
          <Pill success>7-Day Pilot</Pill>
          {scenarioLabel ? <Pill>{scenarioLabel}</Pill> : null}
          {preview?.pressureProfile?.label ? (
            <Pill
              style={{
                backgroundColor: "#FEF3C7",
                color: "#78350F",
                border: "1px solid #FCD34D",
              }}
            >
              {preview.pressureProfile.label}
            </Pill>
          ) : null}
        </div>

        <>
          {pcMeta?.pc_name ? (
            <div className="mt-5 text-sm font-medium text-slate-500">
              {pcMeta.pc_name}
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-4">
            <h1 className="max-w-[820px] text-2xl font-semibold tracking-tight text-slate-950">
              Prepare your decision path for a real 7-day pilot
            </h1>
          </div>
        </>

        <p
          className="mt-4 max-w-[820px] text-slate-800"
          style={{ fontSize: "14px", lineHeight: "22px" }}
        >
          This 7-day pilot is not about improvement. It is about proof.
          You will take one real workflow and see whether your path actually works under real conditions.
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-700 italic">
          This is not a simulation.  
          You are testing whether your real workflow can survive structural pressure.
        </p>

        <p className="mt-3 max-w-[820px] text-sm leading-6 text-emerald-700">
          One workflow. Seven days. Either it holds, or it breaks.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span>Pilot ID: {pilotId}</span>
        <span>{resolvedEventWindow}</span>
        <span>{resolvedNextAction}</span>
      </div>
    </Card>
  );
}

function WorkflowPicker({
  selectedWorkflow,
  onSelect,
  onStart,
}) {
  const workflowOptions = [
    "Audit preparation",
    "Approval review",
    "Incident reconstruction",
    "Cross-team handoff",
    "Evidence retrieval",
    "Policy exception review",
    "Escalation handling",
    "Vendor or partner coordination",
    "Customer complaint resolution",
    "Decision trace reconstruction",
    "Compliance documentation check",
    "Ownership clarification",
    "Post-incident follow-up",
    "Other",
  ];

  return (
    <Card className="p-6 md:p-7">
      <SectionTitle
        title="Choose a workflow. Your pilot is ready to start."
      />

      <div
        className="mt-5"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          width: "100%",
        }}
      >
        <div
          className="relative"
          style={{
            width: "58%",
            minWidth: "420px",
            maxWidth: "560px",
          }}
        >
          <select
            id="workflow-select"
            value={selectedWorkflow}
            onChange={(e) => onSelect(e.target.value)}
            style={{
              height: "40px",
              minHeight: "40px",
              lineHeight: "40px",
              paddingTop: "0px",
              paddingBottom: "0px",
            }}
           className="w-full appearance-none rounded-full border border-slate-200 bg-white px-4 pr-14 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            {workflowOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center text-slate-400">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
      </svg>
    </div>
  </div>

  <div
  style={{
    width: "280px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    flexShrink: 0,
  }}
>
  <button
    type="button"
    onClick={onStart}
    style={{
      height: "40px",
      minHeight: "40px",
      padding: "0 20px",
      borderRadius: "9999px",
      border: "1px solid #047857",
      backgroundColor: "#047857",
      color: "#FFFFFF",
      fontSize: "14px",
      fontWeight: 600,
      lineHeight: "40px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
      cursor: "pointer",
      boxShadow: "0 4px 10px rgba(15, 23, 42, 0.12)",
    }}
  >
    Create new case
  </button>
</div>
</div>
    </Card>
  );
}

function getPilotTradeoffTags(weakestDimension = "") {
  const normalized = String(weakestDimension || "").toLowerCase();

  if (normalized === "evidence") {
    return {
      effort: "Moderate effort",
      tradeoff: "Better proof quality",
    };
  }

  if (normalized === "continuity") {
    return {
      effort: "Moderate effort",
      tradeoff: "Faster flow recovery",
    };
  }

  if (normalized === "authority") {
    return {
      effort: "Low to moderate effort",
      tradeoff: "Slower decision speed",
    };
  }

  if (normalized === "pressure") {
    return {
      effort: "Moderate effort",
      tradeoff: "Lower distortion risk",
    };
  }

  return {
    effort: "Low effort",
    tradeoff: "Partial structural gain",
  };
}

function getPilotTradeoffCopy(weakestDimension = "") {
  const normalized = String(weakestDimension || "").toLowerCase();

  if (normalized === "evidence") {
    return "Lower execution risk, but evidence repair usually takes extra collection effort. Faster than restarting everything, but may still leave upstream gaps if proof was never captured.";
  }

  if (normalized === "continuity") {
    return "Moderate effort, but reveals where the workflow actually breaks across handoffs. Useful for restoring flow without immediately rebuilding the whole pilot.";
  }

  if (normalized === "authority") {
    return "Lower external risk once clarified, but decision speed may slow down while ownership and approval boundaries are being reset.";
  }

  if (normalized === "pressure") {
    return "Reduces distortion risk, but may delay momentum while the workflow is stabilized under real pressure conditions.";
  }

  return "This path is usually the fastest controlled test, but it may improve one weak point without fully repairing upstream structural issues.";
}

function PilotPlanCard({
  preview,
  selectedWorkflow,
  pilotFocusKey = "",
  firstGuidedAction = "",
  firstStepLabel = "",
  weakestDimension = "",
}) {

  const [open, setOpen] = useState(false);
  const strongestSignal = preview?.top_signals?.[0] || null;
  const workflowName = selectedWorkflow || "Selected workflow";

  const effectivePilotFocusKey =
    pilotFocusKey ||
    strongestSignal?.key ||
    strongestSignal?.signalKey ||
    "";

  const pilotFocus = getPilotFocusBySignal(effectivePilotFocusKey);

  const focus =
    firstStepLabel ||
    pilotFocus?.title ||
    preview?.pilot_preview?.entry ||
    "Clarify one structural improvement in one workflow.";

  const observe =
    strongestSignal?.pilotMetric ||
    preview?.pilot_preview?.outcome ||
    "Reduction in friction, reconstruction effort, or repeated clarification.";

  const firstPilotStep =
    firstGuidedAction ||
    pilotFocus?.bullets?.[0] ||
    strongestSignal?.pilotStep ||
    preview?.pilot_preview?.actions?.[0] ||
    "Apply one small structural change and observe whether it holds.";

  const tradeoffDetail = getPilotTradeoffCopy(weakestDimension);
  const tradeoffTags = getPilotTradeoffTags(weakestDimension);

  return (
    <Card className="p-6 md:p-7">
      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold text-slate-950">
          Your 7-day pilot plan
        </h2>
        <span className="text-sm text-slate-500">
          {open ? "Hide" : "View"}
        </span>
      </div>

      {open && (
        <p className="mt-1 text-sm leading-6 text-slate-500">
          This plan is intentionally narrow. It is designed to test one structural improvement in one real workflow.
        </p>
      )}

      {/* 缁楊兛绔寸仦鍌︾窗濮樻瓕绻欓弰鍓с仛 */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Focus */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Focus
          </div>
          <p className="mt-2 text-sm font-medium text-emerald-900">
            {focus}
          </p>
        </div>

        {/* What to change */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
            What to change
          </div>
          <p className="mt-2 text-sm text-sky-900">{firstPilotStep}</p>
        </div>
      </div>

      {/* 缁楊兛绨╃仦鍌︾窗閹舵ê褰?*/}
      {open && (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* What to observe */}
            <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fuchsia-700">
                What to observe
              </div>
              <p className="mt-2 text-sm text-fuchsia-900">{observe}</p>
            </div>

            {/* Workflow */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Workflow
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {workflowName}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              What this path costs
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                {tradeoffTags.effort}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                {tradeoffTags.tradeoff}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-700">
              {tradeoffDetail}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
              What success looks like
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              The workflow becomes easier to execute, easier to explain, and easier to verify without extra coordination effort.
            </p>
          </div>          
        </>
      )}
    </Card>
  );
}

function CarryOverSection({
  preview,
  pilotFocusKey = "",
  firstGuidedAction = "",
  firstStepLabel = "",
  weakestDimension = "",
}) {

  const [open, setOpen] = useState(false);
  const strongestSignal = preview?.top_signals?.[0] || null;

  const effectivePilotFocusKey =
    pilotFocusKey ||
    strongestSignal?.key ||
    strongestSignal?.signalKey ||
    "";

  const pilotFocus = getPilotFocusBySignal(effectivePilotFocusKey);
  const tradeoffDetail = getPilotTradeoffCopy(weakestDimension);
  const tradeoffTags = getPilotTradeoffTags(weakestDimension);

  return (
    <Card className="p-6 md:p-7">
      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold text-slate-950">
          Why this pilot is the recommended next step
        </h2>
        <span className="text-sm text-slate-500">
          {open ? "Hide" : "View"}
        </span>
      </div>

      {open && (
        <div className="mt-5 space-y-3">
          <p className="text-sm leading-6 text-slate-500">
            This recommendation comes directly from your result, current scenario, and strongest structural signal.
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Scenario
            </div>
            <p className="mt-2 text-sm text-slate-900">
              {getEnglishScenarioLabel(preview)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Strongest signal
            </div>
            <p className="mt-2 text-sm text-slate-900">
              {strongestSignal?.label || "Structural Signal"}
            </p>
            {strongestSignal?.description ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {strongestSignal.description}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Recommended focus
            </div>
            <p className="mt-2 text-sm text-emerald-900">
              {firstStepLabel ||
                pilotFocus?.title ||
                preview?.pilot_preview?.entry ||
                "Clarify one structural improvement in one workflow."}
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
              First guided action
            </div>
            <p className="mt-2 text-sm text-sky-900">
              {firstGuidedAction ||
                "Start with the first place where this workflow becomes harder to explain, verify, or sustain."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              What this path costs
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                {tradeoffTags.effort}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                {tradeoffTags.tradeoff}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-700 leading-6">
              {tradeoffDetail}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function PilotActions({ onBack }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
      >
        Back to Result
      </button>
    </div>
  );
}

export default function PilotPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const pcMeta = location.state?.pcMeta || {
    pc_id: "PC-001",
    pc_name: "Decision Risk Diagnostic",
  };

  const incomingCaseSchema =
    location.state?.caseSchema && typeof location.state.caseSchema === "object"
      ? normalizeCaseInput(location.state.caseSchema)
      : null;

  console.log("棣冾潵 location.state:", location.state);

  const resolvedChainId =
    incomingCaseSchema?.chainId ||
    location.state?.chainId ||
    location.state?.result?.chainId ||
    location.state?.preview?.chainId ||
    location.state?.sourceInput?.chainId ||
    "CHAIN-001";

  const rawStage =
    incomingCaseSchema?.stage ||
    location.state?.stage ||
    location.state?.resolvedStage ||
    location.state?.result?.stage ||
    location.state?.preview?.stage ||
    location.state?.sourceInput?.stage ||
    "S3";

  const resolvedStage =
    typeof rawStage === "string" ? rawStage.toUpperCase() : "S3";

  const resolvedSessionId =
    location.state?.session_id ||
    location.state?.sessionId ||
    (typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEYS.SESSION_ID)
      : "") ||
    "";

  const resolvedCaseId = useMemo(
    () =>
      resolveCaseId({
        caseId:
          location.state?.caseId ||
          location.state?.case_id ||
          incomingCaseSchema?.caseId ||
          "",
      }),
    [incomingCaseSchema, location.state]
  );

  const weakestDimension =
    incomingCaseSchema?.weakestDimension ||
    location.state?.weakestDimension ||
    location.state?.result?.weakestDimension ||
    location.state?.preview?.weakestDimension ||
    "";

  const incomingPilotFocusKey =
    location.state?.pilotFocusKey ||
    location.state?.result?.pilotFocusKey ||
    location.state?.preview?.pilotFocusKey ||
    "";

  const incomingFirstGuidedAction =
    location.state?.firstGuidedAction ||
    location.state?.result?.firstGuidedAction ||
    location.state?.preview?.firstGuidedAction ||
    "";

  const incomingFirstStepLabel =
    location.state?.firstStepLabel ||
    location.state?.result?.firstStepLabel ||
    location.state?.preview?.firstStepLabel ||
    "";

  const summarySeed =
    location.state?.summarySeed ||
    location.state?.result?.summarySeed ||
    null;

  const incomingEventWindow =
    location.state?.routeMeta?.eventWindow || "";

  const incomingProgressLabel =
    location.state?.routeMeta?.progressLabel || "";

  const incomingNextAction =
    location.state?.routeMeta?.nextAction || "";

  const previewFromLocation =
    location.state?.preview && typeof location.state.preview === "object"
      ? location.state.preview
      : null;

  const previewFromCaseSchema = incomingCaseSchema
    ? {
        title: "Nimclea Pilot Context",
        scenario: {
          code: incomingCaseSchema.scenarioCode || "",
          label: incomingCaseSchema.scenarioCode || "No Dominant Scenario",
        },
        top_signals: [
          {
            key: incomingCaseSchema.pilotFocusKey || "",
            signalKey: incomingCaseSchema.pilotFocusKey || "",
            label:
              incomingCaseSchema.pilotFocusKey ||
              incomingCaseSchema.weakestDimension ||
              "Structural Signal",
            description: getSafeCaseSummary(incomingCaseSchema),
            pilotStep: incomingCaseSchema.routeDecision?.reason || "",
            pilotMetric: incomingCaseSchema.structureStatus || "",
          },
        ],
        pilot_preview: {
          entry:
            location.state?.firstStepLabel ||
            "Start with one workflow where structural friction is easiest to observe.",
          actions: [
            location.state?.firstGuidedAction ||
              "Start with the first place where this workflow becomes harder to explain, verify, or sustain.",
          ],
          outcome:
            incomingCaseSchema.routeDecision?.reason ||
            "Observe whether the workflow becomes easier to execute and verify.",
          eventWindow:
            location.state?.eventWindow ||
            location.state?.routeMeta?.eventWindow ||
            "7-day pilot window",
          progressLabel:
            location.state?.progressLabel ||
            location.state?.routeMeta?.progressLabel ||
            "Pilot access opened",
          nextAction:
            location.state?.nextAction ||
            location.state?.routeMeta?.nextAction ||
            location.state?.firstStepLabel ||
            "Start with one workflow where structural friction is easiest to observe.",
        },
        eventWindow:
          location.state?.eventWindow ||
          location.state?.routeMeta?.eventWindow ||
          "7-day pilot window",
        progressLabel:
          location.state?.progressLabel ||
          location.state?.routeMeta?.progressLabel ||
          "Pilot access opened",
        nextAction:
          location.state?.nextAction ||
          location.state?.routeMeta?.nextAction ||
          location.state?.firstStepLabel ||
          "Start with one workflow where structural friction is easiest to observe.",
        weakestDimension: incomingCaseSchema.weakestDimension || "",
        chainId: incomingCaseSchema.chainId || "",
        stage: incomingCaseSchema.stage || "",
        summary: [getSafeCaseSummary(incomingCaseSchema)],
      }
    : null;

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState("Audit preparation");
  const access = resolveAccessMode(incomingCaseSchema || preview || location.state || {});

  const stableUserId = useMemo(() => getStableUserId(), []);
  const startInFlightRef = useRef(false);
  
  useEffect(() => {
    const source =
      previewFromLocation ||
      previewFromCaseSchema ||
      getStoredPreview(resolvedSessionId) ||
      null;

    if (source && isValidPreview(source)) {
      setPreview(source);
      setLoading(false);
      return;
    }

    setPreview(null);
    setLoading(false);
    }, [previewFromLocation, previewFromCaseSchema, resolvedSessionId]);

  const handleBack = useCallback(() => {
    navigate(
      resolvedSessionId
        ? `/result?session_id=${resolvedSessionId}`
        : "/result",
      {
        state: {
          pcMeta,
          session_id: resolvedSessionId,
          preview,
        },
      }
    );
  }, [navigate, pcMeta, preview, resolvedSessionId]);

  const handleStart = useCallback(async () => {
    const workflow = selectedWorkflow || "Audit preparation";

    const scopeLock = {
      scopeStatement: `This case evaluates whether the selected workflow "${workflow}" can be executed, explained, and carried forward under a 7-day pilot record.`,
      lockedAt: new Date().toISOString(),
      source: "pilot_page",
      caseId: "",
      workflow,
    };

    const acceptanceChecklist = [
      {
        id: "acceptance_scope_defined",
        label: "The case has a clearly selected workflow scope.",
        status: workflow ? "met" : "missing",
      },
      {
        id: "acceptance_focus_defined",
        label: "The pilot has a defined structural focus.",
        status:
          incomingFirstStepLabel || incomingPilotFocusKey || weakestDimension
            ? "met"
            : "partial",
      },
      {
        id: "acceptance_event_capture_required",
        label: "At least one real event must be captured before formal carry-forward.",
        status: "partial",
      },
    ];

    const normalizedChecklist = acceptanceChecklist.map(item => {
      let decision = "NEEDS_INPUT";

      if (item.status === "met") {
        decision = "PASS";
      } else if (item.status === "missing") {
        decision = "BLOCK";
      } else {
        decision = "NEEDS_INPUT";
      }

      return {
        ...item,
        decision,
      };
    });

    const resolvedEventWindowForStart = incomingEventWindow;
    const resolvedProgressLabelForStart = incomingProgressLabel;
    const resolvedNextActionForStart = incomingNextAction;

    let trialSession =
      location.state?.trialSession ||
      getTrialSession() ||
      {};

    let resolvedUserId = trialSession?.userId || stableUserId;

    if (startInFlightRef.current) return;
    startInFlightRef.current = true;

    try {
      if (trialSession?.userId && !trialSession?.stableUserId) {
        trialSession = {
          ...trialSession,
          stableUserId,
        };
        setTrialSession(trialSession);
      }

      if (!trialSession?.userId || !trialSession?.trialId) {
        const leadPayload = {
          email: buildPilotRegisterEmail(stableUserId),
          name: "",
          company: "",
          stableUserId,
          caseId: resolvedCaseId || null,
        };

        const registerRes = await registerTrialUser(leadPayload);

        trialSession = {
          userId:
            registerRes?.data?.userId ||
            stableUserId,
          trialId: registerRes?.data?.trialId || "",
          email:
            registerRes?.data?.email ||
            buildPilotRegisterEmail(stableUserId),
          status: registerRes?.data?.status || "registered",
          createdAt: registerRes?.data?.createdAt || "",
          stableUserId,
        };

        setTrialSession(trialSession);
        resolvedUserId = trialSession.userId || stableUserId;
      }
    } catch (error) {
      console.error("PilotPage registerTrialUser error:", error);
      alert(error?.message || "Failed to create workspace session.");
      startInFlightRef.current = false;
      return;
    }

    if (!trialSession?.userId || !trialSession?.trialId) {
      console.error("PilotPage trialSession missing after register", {
        trialSession,
      });
      alert("Workspace session was not created. Stop here and check registerTrialUser response.");
      startInFlightRef.current = false;
      return;
    }

    console.log("PILOT_PAGE_TO_SETUP", {
      fromState: location.state?.trialSession,
      fromStorage: getTrialSession(),
      finalTrialSession: trialSession,
    });

    const fallbackCaseSchema =
      incomingCaseSchema ||
      normalizeCaseInput({
        summary:
          Array.isArray(preview?.summary) && preview.summary.length > 0
            ? preview.summary.join(" ")
            : "",
        scenarioCode:
          preview?.scenario?.code ||
          preview?.scenarioCode ||
          "",
        weakestDimension,
        chainId: resolvedChainId,
        stage: resolvedStage,
        patternId: incomingPilotFocusKey || "",
        routeDecision: {
          mode: "summary_only",
          eligibleForReceipt: false,
          eligibleForVerification: false,
          reason: "Pilot starter page fallback schema.",
        },
      });

    const incomingCaseId =
      location.state?.caseId ||
      location.state?.case_id ||
      incomingCaseSchema?.caseId ||
      "";

    let caseIdForPilot = incomingCaseId || resolvedCaseId;

    const scopedScopeLock = {
      ...scopeLock,
      caseId: caseIdForPilot,
    };

    if (!incomingCaseId) {
      const createdCase = upsertCase({
        caseId: resolvedCaseId,
        source: "pilot",
        currentStep: "pilot",
        summary: getSafeCaseSummary(fallbackCaseSchema),
        weakestDimension:
          weakestDimension ||
          fallbackCaseSchema?.weakestDimension ||
          "",
        stageLabel: resolvedStage,
        scopeLock: scopedScopeLock,
        acceptanceChecklist: normalizedChecklist,
      });

      caseIdForPilot = createdCase?.caseId || resolvedCaseId;
    }

    if (trialSession?.userId && trialSession?.trialId) {
      try {          
        await saveCaseSnapshot({
          userId: resolvedUserId,
          trialId: trialSession.trialId,
          caseId: caseIdForPilot,
          stage: "pilot",
          score:
            typeof preview?.intensity?.level === "number"
              ? preview.intensity.level
              : null,
          receiptEligible: false,
          verificationEligible: false,
          caseData: {
            sessionId: resolvedSessionId,
            stableUserId,
            workflow,
            scopeLock: scopedScopeLock,
            acceptanceChecklist: normalizedChecklist,
            scenarioCode:
              preview?.scenario?.code ||
              fallbackCaseSchema?.scenarioCode ||
              "",
            weakestDimension:
              weakestDimension ||
              fallbackCaseSchema?.weakestDimension ||
              "",
            chainId: resolvedChainId,
            stage: resolvedStage,
            pilotFocusKey: incomingPilotFocusKey || "",
            firstGuidedAction: incomingFirstGuidedAction || "",
            firstStepLabel: incomingFirstStepLabel || "",
          },
        });
      } catch (error) {
        console.error("PilotPage sync error:", error);
      }
    }
  
    const pilotState = {
      pcMeta,
      session_id: resolvedSessionId,
      sessionId: resolvedSessionId,
      caseId: caseIdForPilot,
      case_id: caseIdForPilot,
      preview,
      result: preview,
      sourceInput: preview,
      trialSession,
      caseSchema: fallbackCaseSchema,
      stage: resolvedStage,
      resolvedStage,
      chainId: resolvedChainId,
      runEntries: [],
      totalRunHits: 0,
      primaryRunLabel: "",
      runSummaryText: "",
      stableUserId,
      summarySeed,
      scopeLock: scopedScopeLock,
      acceptanceChecklist: normalizedChecklist,

      pilot_setup: {
        workflow,
        created_from: "pilot_starter_page",
        scopeLock: scopedScopeLock,
        acceptanceChecklist: normalizedChecklist,
      },

      weakestDimension,
      pilotFocusKey: incomingPilotFocusKey,
      firstGuidedAction: incomingFirstGuidedAction,
      firstStepLabel: incomingFirstStepLabel,
      eventWindow: resolvedEventWindowForStart,
      progressLabel: resolvedProgressLabelForStart,
      nextAction: resolvedNextActionForStart,
    };
  
    if (caseIdForPilot) {
      try {
        await logTrialEvent(
          {
            userId: resolvedUserId,
            trialId: trialSession.trialId,
            caseId: caseIdForPilot,
            eventType: "pilot_entered",
            page: "PilotPage",
            stableUserId,
            meta: {
              stableUserId,
              source: "funnel_event",
              workflow,
              scenarioCode:
                preview?.scenario?.code ||
                fallbackCaseSchema?.scenarioCode ||
                "",
              weakestDimension:
                weakestDimension ||
                fallbackCaseSchema?.weakestDimension ||
                "",
              chainId: resolvedChainId,
              stage: resolvedStage,
            }
          },
          { once: true }
        );
      } catch (eventError) {
        console.error("pilot_entered log failed:", eventError);
      }

      try {
        await logTrialEvent(
          {
            userId: resolvedUserId,
            trialId: trialSession.trialId,
            caseId: caseIdForPilot,
            eventType: "pilot_workflow_selected",
            page: "PilotPage",
            stableUserId,
            meta: {
              stableUserId,
              source: "funnel_event",
              workflow,
              scenarioCode:
                preview?.scenario?.code ||
                fallbackCaseSchema?.scenarioCode ||
                "",
              weakestDimension:
                weakestDimension ||
                fallbackCaseSchema?.weakestDimension ||
                "",
              chainId: resolvedChainId,
              stage: resolvedStage,
            },
          },
          { once: true }
        );
      } catch (eventError) {
        console.error("pilot_workflow_selected log failed:", eventError);
      }
    }

    startInFlightRef.current = false;

    console.log("PILOT_PAGE_OUTBOUND_STATE", pilotState);
    
    navigate(
      resolvedSessionId
        ? `/pilot/setup?session_id=${resolvedSessionId}`
        : "/pilot/setup",
      { state: pilotState }
    );
  }, [
    navigate,
    location.state,
    preview,
    resolvedSessionId,
    resolvedCaseId,
    resolvedChainId,
    resolvedStage,
    selectedWorkflow,
    weakestDimension,
    incomingPilotFocusKey,
    incomingFirstGuidedAction,
    incomingFirstStepLabel,
    incomingEventWindow,
    incomingProgressLabel,
    incomingNextAction,
    incomingCaseSchema,
    pcMeta,
  ]);

  if (loading) {
    return <LoadingState />;
  }

  if (!preview || !isValidPreview(preview)) {
    return <EmptyState onBack={handleBack} />;
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="relative mx-auto max-w-3xl px-6 py-10">
        <TopRightCasesCapsule />
        <div className="space-y-6">
          <PilotHero
            preview={preview}
            sessionId={resolvedSessionId}
            onStart={handleStart}
            pcMeta={pcMeta}
            pilotFocusKey={incomingPilotFocusKey}
            firstGuidedAction={incomingFirstGuidedAction}
            firstStepLabel={incomingFirstStepLabel}
            weakestDimension={weakestDimension}
            eventWindow={incomingEventWindow}
            progressLabel={incomingProgressLabel}
            nextAction={incomingNextAction}
          />

          <WorkflowPicker
            selectedWorkflow={selectedWorkflow}
            onSelect={setSelectedWorkflow}
            onStart={handleStart}
          />

          <PilotPlanCard
            preview={preview}
            selectedWorkflow={selectedWorkflow}
            pilotFocusKey={incomingPilotFocusKey}
            firstGuidedAction={incomingFirstGuidedAction}
            firstStepLabel={incomingFirstStepLabel}
            weakestDimension={weakestDimension}
          />

          <CarryOverSection
            preview={preview}
            pilotFocusKey={incomingPilotFocusKey}
            firstGuidedAction={incomingFirstGuidedAction}
            firstStepLabel={incomingFirstStepLabel}
            weakestDimension={weakestDimension}
          />

          <PilotActions onBack={handleBack} />
        </div>
      </div>
    </main>
  );
}
