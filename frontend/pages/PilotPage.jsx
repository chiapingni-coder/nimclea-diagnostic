import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPilotFocusBySignal } from "../pilotFocusMap.js";
import { buildPilotPageData } from "../lib/buildPilotPageData.js";

const STORAGE_KEYS = {
  PREVIEW: "nimclea_preview_result",
  SESSION_ID: "nimclea_session_id",
};

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

function toArray(value) {
  return Array.isArray(value) ? value : [];
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

function Pill({ children, dark = false, success = false }) {
  const cls = success
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : dark
    ? "bg-slate-950 text-white border border-slate-950"
    : "bg-white text-slate-700 border border-slate-200";

  return (
    <span
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
            No pilot context found
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            Open this page from the result screen so the pilot can inherit your
            scenario, top signals, and recommended next step.
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

function PilotHero({ preview, sessionId }) {
  const pilotId = useMemo(() => createPilotId(sessionId), [sessionId]);

  const strongestSignal = preview?.top_signals?.[0] || null;
  const scenarioLabel = preview?.scenario?.label || "No Dominant Scenario";

  const primarySignalKey =
    strongestSignal?.key ||
    strongestSignal?.signalKey ||
    "";

  const pilotFocus = getPilotFocusBySignal(primarySignalKey);

  const focusText =
    pilotFocus?.title ||
    preview?.pilot_preview?.entry ||
    "Start with one workflow where structural friction is easiest to observe.";

  return (
    <Card className="overflow-hidden">
      <div className="p-8 md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Pill success>Pilot Starter</Pill>
          {scenarioLabel ? <Pill>{scenarioLabel}</Pill> : null}
          {preview?.pressureProfile?.label ? (
            <Pill dark>{preview.pressureProfile.label}</Pill>
          ) : null}
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          Start Your 7-Day Pilot
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-800">
          This 7-day pilot turns your diagnostic result into one real test. You will use one workflow to see whether Nimclea can reduce friction, sharpen boundaries, and make the decision path easier to verify.
        </p>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-700">
          Small scope. One workflow. No full rollout required.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Scenario
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {scenarioLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Strongest signal
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {strongestSignal?.label || "Structural Signal"}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Pilot focus
            </div>
            <p className="mt-2 text-sm font-medium text-emerald-900">
              {focusText}
            </p>
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

function WorkflowPicker({ selectedWorkflow, onSelect, customWorkflow, onCustomChange }) {
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
        title="Choose the workflow for this 7-day pilot"
        hint="Use one real workflow to test the plan above. Do not pilot the whole system at once."
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
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              <div className="text-sm font-semibold">{option}</div>
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

function PilotPlanCard({ preview, selectedWorkflow, customWorkflow }) {
  const strongestSignal = preview?.top_signals?.[0] || null;
  const workflowName =
    selectedWorkflow === "Other"
      ? customWorkflow.trim() || "Custom workflow"
      : selectedWorkflow || "Selected workflow";

  const primarySignalKey =
    strongestSignal?.key ||
    strongestSignal?.signalKey ||
    "";

  const pilotFocus = getPilotFocusBySignal(primarySignalKey);

  const focus =
    pilotFocus?.title ||
    preview?.pilot_preview?.entry ||
    "Clarify one structural improvement in one workflow.";

  const observe =
    strongestSignal?.pilotMetric ||
    preview?.pilot_preview?.outcome ||
    "Reduction in friction, reconstruction effort, or repeated clarification.";

  const success =
    strongestSignal?.expectedShift ||
    "The workflow becomes easier to explain, easier to verify, and less dependent on hidden effort.";

  const firstPilotStep =
    pilotFocus?.bullets?.[0] ||
    strongestSignal?.pilotStep ||
    preview?.pilot_preview?.actions?.[0] ||
    "Apply one small structural change and observe whether it holds.";

  return (
    <Card className="p-6 md:p-7">
      <SectionTitle
        title="Your pilot plan"
        hint="This plan is intentionally narrow. It is designed to help you test one improvement without opening a full rollout."
      />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Focus
          </div>
          <p className="mt-2 text-sm font-medium text-emerald-900">
            {focus}
          </p>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
            What to change
          </div>
          <p className="mt-2 text-sm text-sky-900">{firstPilotStep}</p>
        </div>

        <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fuchsia-700">
            What to observe
          </div>
          <p className="mt-2 text-sm text-fuchsia-900">{observe}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Workflow
          </div>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {workflowName}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
          What success looks like
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {success}
        </p>
      </div>
    </Card>
  );
}

function CarryOverSection({ preview }) {
  const strongestSignal = preview?.top_signals?.[0] || null;

  const primarySignalKey =
    strongestSignal?.key ||
    strongestSignal?.signalKey ||
    "";

  const pilotFocus = getPilotFocusBySignal(primarySignalKey);

  return (
    <Card className="p-6 md:p-7">
      <SectionTitle
        title="Why this pilot was suggested"
        hint="This recommendation comes directly from your diagnostic result and strongest structural signal."
      />

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Scenario
          </div>
          <p className="mt-2 text-sm text-slate-900">
            {preview?.scenario?.label || "No Dominant Scenario"}
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
            {pilotFocus?.title ||
              preview?.pilot_preview?.entry ||
              "Clarify one structural improvement in one workflow."}
          </p>
        </div>
      </div>
    </Card>
  );
}

function PilotActions({ onBack, onStart }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onStart}
        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Start 7-Day Pilot →
      </button>

      <button
        type="button"
        onClick={onBack}
        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
      >
        Back to Result
      </button>
    </div>
  );
}

function StagePilotPlanSection({ preview }) {
  const scenarioKey =
    preview?.scenario?.key ||
    preview?.scenario?.id ||
    "";

  const strongestSignal = preview?.top_signals?.[0] || null;

  const signalKey =
    strongestSignal?.key ||
    strongestSignal?.signalKey ||
    "";

  function resolveChainId() {
    if (scenarioKey.includes("authority")) return "CHAIN-001";
    if (signalKey.includes("boundary")) return "CHAIN-003";
    return "CHAIN-002";
  }

  function resolveStage() {
    const score =
      strongestSignal?.score ??
      strongestSignal?.value ??
      strongestSignal?.strength ??
      0;

    if (score >= 85) return "S4";
    if (score >= 70) return "S3";
    if (score >= 50) return "S2";
    return "S1";
  }

  const chainId = resolveChainId();
  const stage = resolveStage();

  const pilotData = buildPilotPageData({
    chainId,
    chainName:
      chainId === "CHAIN-001"
        ? "Authority Infrastructure"
        : chainId === "CHAIN-003"
        ? "Boundary Pressure"
        : "Reality Control Recovery",
    stage,
    stageName: stage,
    patternName:
      preview?.scenario?.label ||
      preview?.title ||
      "Pattern not available",
    currentRun:
      strongestSignal?.currentRun ||
      strongestSignal?.run ||
      "RUN-UNKNOWN",
    nextRun:
      strongestSignal?.nextRun ||
      preview?.pilot_preview?.next_run ||
      "RUN-NEXT",
  });

  if (!pilotData) return null;

  return (
    <Card className="p-6 md:p-7">
      <SectionTitle
        title="Your 7-day stage-driven plan"
        hint="This layer converts your current structural position into a 7-day execution path."
      />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Chain
          </div>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {pilotData.chainName}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Current stage
          </div>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {pilotData.stage}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
          Pilot goal
        </div>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          {pilotData.pilotGoal}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {pilotData.dayPlanList.map((item) => (
          <div
            key={item.day}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {item.day} · {item.status}
            </div>

            <h3 className="mt-2 text-base font-semibold text-slate-950">
              {item.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
            Milestone
          </div>
          <p className="mt-2 text-sm leading-6 text-sky-900">
            {pilotData.milestone}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
            Expected outcome
          </div>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            {pilotData.expectedOutcome}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function PilotPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const resolvedSessionId =
    location.state?.session_id ||
    location.state?.sessionId ||
    (typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEYS.SESSION_ID)
      : "") ||
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
      preview,
      pilot_setup: {
        workflow,
        created_from: "pilot_starter_page",
      },
    };

    navigate(
      resolvedSessionId
        ? `/pilot/setup?session_id=${resolvedSessionId}`
        : "/pilot/setup",
      { state: pilotState }
    );
  }, [navigate, preview, resolvedSessionId, selectedWorkflow, customWorkflow]);

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
          <PilotHero preview={preview} sessionId={resolvedSessionId} />

          <PilotPlanCard
            preview={preview}
            selectedWorkflow={selectedWorkflow}
            customWorkflow={customWorkflow}
          />

          <StagePilotPlanSection preview={preview} />

          <WorkflowPicker
            selectedWorkflow={selectedWorkflow}
            onSelect={setSelectedWorkflow}
            customWorkflow={customWorkflow}
            onCustomChange={setCustomWorkflow}
          />

          <CarryOverSection preview={preview} />

          <PilotActions onBack={handleBack} onStart={handleStart} />
        </div>
      </div>
    </main>
  );
}