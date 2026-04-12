import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPilotFocusBySignal } from "../pilotFocusMap.js";
import { logEvent } from "../utils/eventLogger";

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
      <div className="mx-auto max-w-3xl px-6 py-16">
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
      <div className="mx-auto max-w-5xl px-6 py-12">
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
  pilotFocusKey = "",
  firstGuidedAction = "",
  firstStepLabel = "",
  weakestDimension = "",
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

  return (
    <Card className="overflow-hidden">
      <div className="p-8 md:p-10">
        <div className="flex flex-wrap items-center gap-2">
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

        <h1 className="mt-5 max-w-[820px] text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          Prepare your decision path for a real 7-day pilot
        </h1>

        <p className="mt-4 max-w-[820px] text-lg leading-8 text-slate-800">
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

        <div className="mt-8">
          <div className="grid gap-4 md:grid-cols-4 md:items-stretch">
            <div className="h-full w-full rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Scenario
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {scenarioLabel}
              </p>
            </div>

            <div className="h-full w-full rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Strongest signal
              </div>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {strongestSignal?.label || "Structural Signal"}
              </p>
            </div>

            <div className="h-full w-full rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                Weakest dimension
              </div>
              <p className="mt-2 text-sm font-medium text-amber-900">
                {weakestDimension || "Not specified"}
              </p>
              <p className="mt-2 text-xs leading-5 text-amber-800">
                This dimension will shape the cost of your pilot path.
              </p>
            </div>

            <div className="h-full w-full flex items-center justify-center">
              <button
                type="button"
                onClick={onStart}
                style={{
                  backgroundColor: "#047857",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "9999px",
                  padding: "24px 28px",
                  fontSize: "16px",
                  fontWeight: 600,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
                className="inline-flex items-center justify-center"
              >
                Start My 7-Day Pilot →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span>Pilot ID: {pilotId}</span>
        <span>Built from your diagnostic result</span>
      </div>
    </Card>
  );
}

function WorkflowPicker({
  selectedWorkflow,
  onSelect,
  customWorkflow,
  onCustomChange,
}) {
  const workflowOptions = [
    "Audit preparation",
    "Approval review",
    "Incident reconstruction",
    "Cross-team handoff",
    "Evidence retrieval",
    "Other",
  ];

  return (
    <Card className="p-6 md:p-7">
      <SectionTitle
        title="Choose one workflow to test"
        hint="Use one real workflow for this pilot. Keep the scope narrow so the result is easier to observe and verify."
      />

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {workflowOptions.map((option) => {
          const isSelected = selectedWorkflow === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                isSelected
                  ? "text-slate-900 shadow-md"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
              style={
                isSelected
                  ? {
                      backgroundColor: "#FEE2E2",
                      borderColor: "#FCA5A5",
                    }
                  : undefined
              }
            >
              <div
                className="text-sm font-semibold"
                style={isSelected ? { color: "#991B1B" } : undefined}
              >
                {option}
              </div>
            </button>
          );
        })}
      </div>

      {selectedWorkflow === "Other" ? (
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Custom workflow
          </label>
          <input
            type="text"
            value={customWorkflow}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="Name the workflow you want to test"
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>
      ) : null}
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
  customWorkflow,
  pilotFocusKey = "",
  firstGuidedAction = "",
  firstStepLabel = "",
  weakestDimension = "",
}) {

  const [open, setOpen] = useState(false);
  const strongestSignal = preview?.top_signals?.[0] || null;
  const workflowName =
    selectedWorkflow === "Other"
      ? customWorkflow.trim() || "Custom workflow"
      : selectedWorkflow || "Selected workflow";

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

      {/* 第一层：永远显示 */}
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

      {/* 第二层：折叠 */}
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
  useEffect(() => {
    logEvent("pilot_started");
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  console.log("🧠 location.state:", location.state);

  const resolvedChainId =
    location.state?.chainId ||
    location.state?.result?.chainId ||
    location.state?.preview?.chainId ||
    location.state?.sourceInput?.chainId ||
    "CHAIN-001";

  const rawStage =
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

  const weakestDimension =
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

  const previewFromLocation =
    location.state?.preview && typeof location.state.preview === "object"
      ? location.state.preview
      : null;

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState("Audit preparation");
  const [customWorkflow, setCustomWorkflow] = useState("");

  useEffect(() => {
    const source =
      previewFromLocation ||
      getStoredPreview(resolvedSessionId) ||
      null;

    if (source && isValidPreview(source)) {
      setPreview(source);
      setLoading(false);
      return;
    }

    setPreview(null);
    setLoading(false);
  }, [previewFromLocation, resolvedSessionId]);

  const handleBack = useCallback(() => {
    navigate(
      resolvedSessionId
        ? `/result?session_id=${resolvedSessionId}`
        : "/result",
      {
        state: {
          session_id: resolvedSessionId,
          preview,
        },
      }
    );
  }, [navigate, preview, resolvedSessionId]);

  const handleStart = useCallback(() => {
    const workflow =
      selectedWorkflow === "Other"
        ? customWorkflow.trim() || "Custom workflow"
        : selectedWorkflow;

    const pilotState = {
      session_id: resolvedSessionId,
      sessionId: resolvedSessionId,
      preview,
      result: preview,
      sourceInput: preview,
      stage: resolvedStage,
      resolvedStage,
      chainId: resolvedChainId,
      runEntries: [],
      totalRunHits: 0,
      primaryRunLabel: "",
      runSummaryText: "",

      pilot_setup: {
        workflow,
        created_from: "pilot_starter_page",
      },

      weakestDimension,
      pilotFocusKey: incomingPilotFocusKey,
      firstGuidedAction: incomingFirstGuidedAction,
      firstStepLabel: incomingFirstStepLabel,
    };

    navigate(
      resolvedSessionId
        ? `/pilot/setup?session_id=${resolvedSessionId}`
        : "/pilot/setup",
      { state: pilotState }
    );
  }, [
    navigate,
    preview,
    resolvedSessionId,
    resolvedChainId,
    resolvedStage,
    selectedWorkflow,
    customWorkflow,
    weakestDimension,
    incomingPilotFocusKey,
    incomingFirstGuidedAction,
    incomingFirstStepLabel,
  ]);

  if (loading) {
    return <LoadingState />;
  }

  if (!preview || !isValidPreview(preview)) {
    return <EmptyState onBack={handleBack} />;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
        <div className="space-y-6">
          <PilotHero
            preview={preview}
            sessionId={resolvedSessionId}
            onStart={handleStart}
            pilotFocusKey={incomingPilotFocusKey}
            firstGuidedAction={incomingFirstGuidedAction}
            firstStepLabel={incomingFirstStepLabel}
            weakestDimension={weakestDimension}
          />

          <WorkflowPicker
            selectedWorkflow={selectedWorkflow}
            onSelect={setSelectedWorkflow}
            customWorkflow={customWorkflow}
            onCustomChange={setCustomWorkflow}
          />

          <PilotPlanCard
            preview={preview}
            selectedWorkflow={selectedWorkflow}
            customWorkflow={customWorkflow}
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