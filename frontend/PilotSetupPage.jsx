import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ROUTES from "./routes";
import { logEvent } from "./utils/eventLogger";

const SCENARIO_LABEL_MAP = {
  pre_audit_collapse: "Pre-Audit Collapse",
  barely_functional: "Barely Functional",
  boundary_blur: "Boundary Blur",
  fully_ready: "Fully Ready",
};

function getEnglishScenarioLabel(preview) {
  const scenarioCode =
    preview?.scenario?.code ||
    preview?.scenarioCode ||
    preview?.scenario_code ||
    preview?.extraction?.scenarioKey ||
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
            No pilot setup context found
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            Open this page from the pilot starter page so Nimclea can inherit
            your workflow, scenario, and signal context.
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={onBack}
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Back to Pilot
            </button>
          </div>
        </Card>
      </div>
    </main>
  );
}

function SetupHero({ preview, workflow, sessionId }) {
  const scenarioLabel = getEnglishScenarioLabel(preview);
  const strongestSignal = preview?.top_signals?.[0] || null;
  const pilotId = useMemo(() => {
    if (!sessionId) return "NIM-PILOT";
    return `PILOT-${String(sessionId)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 10)
      .toUpperCase()}`;
  }, [sessionId]);

  return (
    <Card className="overflow-hidden">
      <div className="p-8 md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Pill success>Pilot Setup</Pill>
          <Pill>{scenarioLabel}</Pill>
          {preview?.pressureProfile?.label ? (
            <Pill dark>{preview.pressureProfile.label}</Pill>
          ) : null}
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          Lock in your execution path
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-800">
          You are committing one real workflow to execution. No expansion. No fallback.
          You are not rolling out the full system. You are testing one real
          workflow in a controlled way.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Workflow
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {workflow}
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
              Pilot target
            </div>
            <p className="mt-2 text-sm font-medium text-emerald-900">
              Make one real workflow easier to explain, verify, and stabilize.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span>Pilot ID: {pilotId}</span>
        <span>Execution Setup</span>
      </div>
    </Card>
  );
}

function DayPlanSection({ workflow, preview }) {
  const entry =
    preview?.pilot_preview?.entry ||
    "Start with one workflow where structural friction is easiest to observe.";

  const actions =
    Array.isArray(preview?.pilot_preview?.actions) &&
    preview.pilot_preview.actions.length > 0
      ? preview.pilot_preview.actions
      : [
          "Clarify where the workflow currently breaks or slows down.",
          "Make one structural improvement visible.",
          "Observe whether the workflow becomes easier to explain and verify.",
        ];

  const outcome =
    preview?.pilot_preview?.outcome ||
    "You should see reduced friction and a clearer operating path.";

  const days = [
    {
      day: "Day 1",
      title: "Define the workflow boundary",
      text: `Choose "${workflow}" as the only workflow for this pilot. Do not expand scope.`,
    },
    {
      day: "Day 2",
      title: "Locate current friction",
      text: entry,
    },
    {
      day: "Day 3",
      title: "Apply one structural change",
      text: actions[0] || "Apply one small change to the workflow structure.",
    },
    {
      day: "Day 4",
      title: "Stabilize handoff or evidence path",
      text: actions[1] || "Clarify one ownership or evidence boundary.",
    },
    {
      day: "Day 5",
      title: "Run a real workflow instance",
      text: actions[2] || "Test the workflow under a real decision or review moment.",
    },
    {
      day: "Day 6",
      title: "Observe what changed",
      text: outcome,
    },
    {
      day: "Day 7",
      title: "Decide next step",
      text: "Decide whether this workflow is clearer, easier to verify, and worth extending.",
    },
  ];

  return (
    <Card className="p-6 md:p-7">
      <SectionTitle
        title="Your 7-day pilot plan"
        hint="This is the smallest executable version. One workflow, one boundary, one test."
      />

      <div className="mt-6 grid gap-4">
        {days.map((item) => (
          <div
            key={item.day}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {item.day}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-950">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CarryOverSection({ preview, workflow }) {
  const strongestSignal = preview?.top_signals?.[0] || null;

  return (
    <Card className="p-6 md:p-7">
      <SectionTitle
        title="Pilot carry-over context"
        hint="These values are inherited from your previous pages so the pilot stays connected to the diagnostic."
      />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
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
            Workflow
          </div>
          <p className="mt-2 text-sm text-slate-900">{workflow}</p>
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
            Expected shift
          </div>
          <p className="mt-2 text-sm text-emerald-900">
            {strongestSignal?.expectedShift ||
              preview?.pilot_preview?.outcome ||
              "The workflow becomes easier to explain, verify, and defend."}
          </p>
        </div>
      </div>
    </Card>
  );
}

function CaseInputSection({ caseInput, setCaseInput }) {
  return (
    <Card className="p-6 md:p-7">
      <SectionTitle
        title="Case to test"
        hint="Name one real case in a single sentence so this pilot stays tied to a real event."
      />

      <div className="mt-5">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          What case are you testing?
        </label>

        <input
          type="text"
          value={caseInput}
          onChange={(e) => setCaseInput(e.target.value)}
          placeholder="e.g. Q1 audit evidence reconstruction for vendor files"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          This is not the whole project. Just one concrete case for this 7-day pilot.
        </p>
      </div>
    </Card>
  );
}

function ActionBar({ onBack, onConfirm }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onConfirm}
        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Confirm Pilot Setup →
      </button>

      <button
        type="button"
        onClick={onBack}
        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
      >
        Back to Pilot
      </button>
    </div>
  );
}

export default function PilotSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [caseInput, setCaseInput] = useState("");

  const pilotSetup = location.state?.pilot_setup || null;
  const preview = location.state?.preview || null;
  const sessionId =
    location.state?.session_id ||
    location.state?.sessionId ||
    "";

  const workflow =
    pilotSetup?.workflow || "Selected workflow";

  const hasRequiredContext =
    preview &&
    typeof preview === "object" &&
    pilotSetup &&
    typeof pilotSetup === "object";

  const handleBack = () => {
    navigate(
      sessionId ? `${ROUTES.PILOT}?session_id=${sessionId}` : ROUTES.PILOT,
      {
        state: {
          session_id: sessionId,
          preview,
          result: preview,
          stage:
            location.state?.stage ||
            location.state?.result?.stage ||
            preview?.stage ||
            preview?.extraction?.stageCode ||
            "S1",
        }
      }
    );
  };

  const handleConfirm = () => {
    const trimmedCaseInput = caseInput.trim();

    if (!trimmedCaseInput) {
      alert("Please enter one real case before confirming the pilot setup.");
      return;
    }

    logEvent("pilot_entry_clicked");
    logEvent("case_created", {
      case_input: trimmedCaseInput,
      workflow: pilotSetup?.workflow || preview?.workflow || "Selected workflow",
      session_id: sessionId,
    });

    const strongestSignal = Array.isArray(preview?.top_signals)
      ? preview.top_signals[0]
      : null;

  const extraction = preview?.extraction || {};
  const resultSeed = preview?.resultSeed || preview?.extraction || {};

  const pilotResult = {
    runId:
      extraction?.runCode ||
      resultSeed?.runCode ||
      preview?.run_id ||
      preview?.anchor_run ||
      "RUN000",

    pattern:
      extraction?.patternCode ||
      resultSeed?.patternCode ||
      preview?.pattern ||
      preview?.pattern_id ||
      "PAT-00",

    stage:
      extraction?.stageCode ||
      resultSeed?.stageCode ||
      preview?.stage ||
      "S0",

    decision:
      resultSeed?.recommendedAction ||
      preview?.recommended_next_step ||
      preview?.pilot_preview?.entry ||
      "Continue with structured pilot execution.",

    signals: Array.isArray(preview?.top_signals)
      ? preview.top_signals.map((signal) => ({
          label: signal?.label || signal?.key || "unknown_signal",
          value: signal?.value || signal?.level || signal?.description || "unknown",
        }))
      : Array.isArray(resultSeed?.signals)
      ? resultSeed.signals.map((signal, index) => ({
          label:
            typeof signal === "string"
              ? signal
              : signal?.label || signal?.key || `signal_${index + 1}`,
          value:
            typeof signal === "string"
              ? "present"
              : signal?.description || signal?.value || "present",
        }))
      : [],

    workflow: pilotSetup?.workflow || preview?.workflow || "Selected workflow",

    scenarioLabel: getEnglishScenarioLabel(preview),

    scenarioCode:
      extraction?.scenarioKey ||
      resultSeed?.scenarioKey ||
      preview?.scenario?.code ||
      "unknown_scenario",

    successMetric:
      strongestSignal?.pilotMetric ||
      preview?.pilot_preview?.outcome ||
      "Reduction in friction and clearer workflow structure.",

    summaryText:
      preview?.summary?.[0] ||
      resultSeed?.summary ||
      "No structured summary available.",
  };

    caseInput: trimmedCaseInput,

  navigate(
    sessionId
      ? `${ROUTES.PILOT_RESULT}?session_id=${sessionId}`
      : ROUTES.PILOT_RESULT,
    {
      state: {
        ...location.state,
        session_id: sessionId,
        sessionId: sessionId,

        preview,
        sourceInput: preview,

        extraction: preview?.extraction || {},
        resultSeed: preview?.resultSeed || preview?.extraction || {},

        pilot_setup: {
          ...pilotSetup,
          caseInput: trimmedCaseInput,
        },
        pilot_result: pilotResult,
        caseInput: trimmedCaseInput,
      },
    }
  );
};

if (!hasRequiredContext) {
  return <EmptyState onBack={handleBack} />;
}

return (
  <main className="min-h-screen bg-slate-50">
    <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
      <div className="space-y-6">
        <SetupHero
          preview={preview}
          workflow={workflow}
          sessionId={sessionId}
        />

        <DayPlanSection preview={preview} workflow={workflow} />

        <CarryOverSection preview={preview} workflow={workflow} />

        <CaseInputSection
          caseInput={caseInput}
          setCaseInput={setCaseInput}
        />

        <ActionBar onBack={handleBack} onConfirm={handleConfirm} />
      </div>
    </div>
  </main>
);
}