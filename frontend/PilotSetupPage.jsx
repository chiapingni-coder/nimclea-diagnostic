import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ROUTES from "./routes";
import { logEvent } from "./utils/eventLogger";
import { buildPilotNavigationState } from "./utils/pilotRouting";
import { appendPilotEntry } from "./utils/pilotEntries";

const SCENARIO_LABEL_MAP = {
  pre_audit_collapse: "Pre-Audit Collapse",
  barely_functional: "Barely Functional",
  boundary_blur: "Boundary Blur",
  fully_ready: "Fully Ready",
};

const EVENT_ROUTE_MAP = {
  decision_suggested: {
    pattern: "PAT-02",
    runId: "RUN066",
    patternLabel: "Authority Interaction Structure",
    routeReason: "Suggested decision enters an authority interaction pattern.",
  },
  decision_override_attempt: {
    pattern: "PAT-02",
    runId: "RUN062",
    patternLabel: "Authority Interaction Structure",
    routeReason: "Override attempt points to an authority interaction pattern.",
  },
  resource_control_request: {
    pattern: "PAT-03",
    runId: "RUN044",
    patternLabel: "Reality-Critical Decision Structure",
    routeReason: "Resource or control requests usually trigger a critical decision path.",
  },
  high_pressure_decision: {
    pattern: "PAT-03",
    runId: "RUN064",
    patternLabel: "Reality-Critical Decision Structure",
    routeReason: "High-pressure decisions belong to the critical decision layer.",
  },
  role_boundary_blur: {
    pattern: "PAT-04",
    runId: "RUN050",
    patternLabel: "Boundary Defense Structure",
    routeReason: "Blurred responsibility or role shifts point to a boundary defense pattern.",
  },
  other: {
    pattern: "PAT-11",
    runId: "RUN040",
    patternLabel: "Product and Wiring Structure",
    routeReason: "Fallback route for uncategorized inputs.",
  },
};

function resolveEventRoute(eventType, preview) {
  const mapped = EVENT_ROUTE_MAP[eventType];

  if (mapped) {
    return {
      runId: mapped.runId,
      pattern: mapped.pattern,
      patternLabel: mapped.patternLabel,
      routeReason: mapped.routeReason,
      source: "event_route_map",
    };
  }

  return {
    runId:
      preview?.extraction?.runCode ||
      preview?.resultSeed?.runCode ||
      preview?.run_id ||
      preview?.anchor_run ||
      "RUN000",
    pattern:
      preview?.extraction?.patternCode ||
      preview?.resultSeed?.patternCode ||
      preview?.pattern ||
      preview?.pattern_id ||
      "PAT-00",
    patternLabel: "Unresolved Pattern",
    routeReason: "No direct event mapping found. Fell back to preview.",
    source: "preview_fallback",
  };
}

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

function Pill({ children, variant = "default" }) {
  const cls =
    variant === "success"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : variant === "pressure"
      ? "border text-xs font-semibold"
      : variant === "scenario"
      ? "bg-slate-100 text-slate-700 border border-slate-200"
      : "bg-white text-slate-700 border border-slate-200";

  const style =
    variant === "pressure"
      ? {
          backgroundColor: "#FEF3C7",
          color: "#78350F",
          borderColor: "#FCD34D",
        }
      : undefined;

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
          <Pill variant="success">Pilot Setup</Pill>
          <Pill variant="scenario">{scenarioLabel}</Pill>
          {preview?.pressureProfile?.label ? (
            <Pill variant="pressure">
              {preview.pressureProfile.label}
            </Pill>
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
  const [open, setOpen] = useState(false);

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
      <div
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center justify-between"
      >
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          View 7-day structure (optional)
        </h2>
        <span className="text-sm text-slate-500">
          {open ? "Hide" : "View"}
        </span>
      </div>

      {open ? (
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
      ) : null}
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

function PilotEventInputSection({
  eventType,
  setEventType,
  signalLevels,
  setSignalLevels,
  description,
  setDescription,
}) {
  const EVENT_OPTIONS = [
    { value: "decision_suggested", label: "Someone suggested a decision for me" },
    { value: "decision_override_attempt", label: "Someone tried to decide on my behalf" },
    { value: "resource_control_request", label: "A resource / money / control request" },
    { value: "high_pressure_decision", label: "I felt pressure to decide quickly" },
    { value: "role_boundary_blur", label: "Roles or responsibilities became unclear" },
    { value: "other", label: "Other" },
  ];

  const SIGNAL_OPTIONS = ["low", "medium", "high"];
  const AUTHORITY_OPTIONS = ["clear", "slightly_unclear", "unclear"];

  const signalButtonClass = (isActive) =>
    `rounded-xl border px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "border-slate-950 bg-slate-950 text-white"
        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <Card className="p-6 md:p-7">
      <SectionTitle
        title="Record a real event"
        hint="Pilot input should help the system identify structure, not just collect text."
      />

      <div className="mt-6 space-y-8">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            1. What just happened?
          </div>
          <div className="mt-3 grid gap-3">
            {EVENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                  eventType === option.value
                    ? "border-slate-950 bg-slate-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="eventType"
                  value={option.value}
                  checked={eventType === option.value}
                  onChange={(e) => setEventType(e.target.value)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-slate-800">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900">
            2. Confirm system signals
          </div>

          <div className="mt-4 grid gap-5">
            <div>
              <div className="text-sm text-slate-700">External pressure</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SIGNAL_OPTIONS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      setSignalLevels((prev) => ({
                        ...prev,
                        externalPressure: level,
                      }))
                    }
                    className={signalButtonClass(
                      signalLevels.externalPressure === level
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-700">Authority boundary</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {AUTHORITY_OPTIONS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      setSignalLevels((prev) => ({
                        ...prev,
                        authorityBoundary: level,
                      }))
                    }
                    className={signalButtonClass(
                      signalLevels.authorityBoundary === level
                    )}
                  >
                    {level.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-700">Dependency</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SIGNAL_OPTIONS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      setSignalLevels((prev) => ({
                        ...prev,
                        dependency: level,
                      }))
                    }
                    className={signalButtonClass(
                      signalLevels.dependency === level
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900">
            3. Describe what happened (optional)
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Add one sentence of context if needed."
            className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
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

  const [eventType, setEventType] = useState("");
  const [signalLevels, setSignalLevels] = useState({
    externalPressure: "medium",
    authorityBoundary: "slightly_unclear",
    dependency: "medium",
  });
  const [description, setDescription] = useState("");

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
  const trimmedDescription = description.trim();

  if (!eventType) {
    alert("Please select what just happened before confirming the pilot.");
    return;
  }

  logEvent("pilot_entry_clicked");

  const entryTimestamp = new Date().toISOString();

  const structuredEvent = {
    eventType,
    signals: {
      externalPressure: signalLevels.externalPressure,
      authorityBoundary: signalLevels.authorityBoundary,
      dependency: signalLevels.dependency,
    },
    description: trimmedDescription,
    timestamp: entryTimestamp,
  };

  logEvent("pilot_event_structured", structuredEvent);

  const strongestSignal = Array.isArray(preview?.top_signals)
    ? preview.top_signals[0]
    : null;

  const extraction = preview?.extraction || {};
  const resultSeed = preview?.resultSeed || preview?.extraction || {};
  const resolvedRoute = resolveEventRoute(eventType, preview);

    const evidenceLevel =
    trimmedDescription || eventType !== "other" ? "has_explanation" : "low_evidence";

  const pilotEntry = {
    id: `entry_${Date.now()}`,
    timestamp: entryTimestamp,
    workflow: pilotSetup?.workflow || preview?.workflow || "Selected workflow",
    eventType,
    externalPressure: signalLevels.externalPressure,
    authorityBoundary: signalLevels.authorityBoundary,
    dependency: signalLevels.dependency,
    description: trimmedDescription,
    runId: resolvedRoute.runId,
    pattern: resolvedRoute.pattern,
    patternLabel: resolvedRoute.patternLabel,
    scenarioLabel: getEnglishScenarioLabel(preview),
    scenarioCode:
      extraction?.scenarioKey ||
      resultSeed?.scenarioKey ||
      preview?.scenario?.code ||
      "unknown_scenario",
    evidenceLevel,
    summaryMode: false,
  };

  const allPilotEntries = appendPilotEntry(pilotEntry);

  const pilotResult = {
    runId: resolvedRoute.runId,
    pattern: resolvedRoute.pattern,
    patternLabel: resolvedRoute.patternLabel,
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

    signals: [
      {
        label: "Event Type",
        value: eventType,
      },
      {
        label: "External Pressure",
        value: signalLevels.externalPressure,
      },
      {
        label: "Authority Boundary",
        value: signalLevels.authorityBoundary,
      },
      {
        label: "Dependency",
        value: signalLevels.dependency,
      },
      ...(trimmedDescription
        ? [
            {
              label: "Description",
              value: trimmedDescription,
            },
          ]
        : []),
      {
        label: "Resolved Pattern",
        value: resolvedRoute.pattern,
      },
      {
        label: "Resolved RUN",
        value: resolvedRoute.runId,
      },
    ],

    workflow: pilotSetup?.workflow || preview?.workflow || "Selected workflow",

    scenarioLabel: getEnglishScenarioLabel(preview),
    routeReason: resolvedRoute.routeReason,
    routeSource: resolvedRoute.source,

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
      trimmedDescription ||
      preview?.summary?.[0] ||
      resultSeed?.summary ||
      "No structured summary available.",
    
    pilotEntriesCount: allPilotEntries.length,
    latestEntryId: pilotEntry.id,
    summaryTriggerMode: "manual_click",
  };

  const navState = buildPilotNavigationState({
    ...location.state,

    session_id: sessionId,
    sessionId,

    preview,
    sourceInput: preview,
    extraction,
    resultSeed,

    resolvedRunId: resolvedRoute.runId,
    pattern: resolvedRoute.pattern,
    patternLabel: resolvedRoute.patternLabel,

    stage:
      extraction?.stageCode ||
      resultSeed?.stageCode ||
      preview?.stage ||
      "S0",

    caseId:
      location.state?.caseId ||
      location.state?.case_id ||
      preview?.caseId ||
      null,

    signals: pilotResult.signals,

    // 现在先把“确认 Pilot Setup 后”视为进入总结页模式
    // 这样会走 pilot_complete -> /pilot-result
    pilotComplete: true,
    usePilotSummary: false,
    allowReceipt: false,

    pilot_setup: {
      ...pilotSetup,
      eventType,
      signalLevels,
      description: trimmedDescription,
      events: [structuredEvent],
      resolvedPattern: resolvedRoute.pattern,
      resolvedRunId: resolvedRoute.runId,
      resolvedPatternLabel: resolvedRoute.patternLabel,
      routeReason: resolvedRoute.routeReason,
      routeSource: resolvedRoute.source,
    },

    pilot_entries: allPilotEntries,
    latest_pilot_entry: pilotEntry,
    pilot_result: pilotResult,
  });

  navigate(
    sessionId
      ? `${navState.routeMeta.pathname}?session_id=${sessionId}`
      : navState.routeMeta.pathname,
    {
      state: {
        ...location.state,
        ...navState,

        session_id: sessionId,
        sessionId,

        preview,
        sourceInput: preview,
        extraction,
        resultSeed,

        pilot_setup: {
          ...navState.pilot_setup,
          workflow: pilotSetup?.workflow || preview?.workflow || "Selected workflow",
          eventType,
          signalLevels,
          description: trimmedDescription,
          events: [structuredEvent],
          resolvedPattern: resolvedRoute.pattern,
          resolvedRunId: resolvedRoute.runId,
          resolvedPatternLabel: resolvedRoute.patternLabel,
          routeReason: resolvedRoute.routeReason,
          routeSource: resolvedRoute.source,
        },

        pilot_entries: allPilotEntries,
        latest_pilot_entry: pilotEntry,

        pilot_result: {
          ...pilotResult,
          summaryMode: navState.pilot_result.summaryMode,
          structureStatus: navState.routeMeta.structureStatus,
          nextAction: navState.routeMeta.nextAction,
        },
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

        <PilotEventInputSection
          eventType={eventType}
          setEventType={setEventType}
          signalLevels={signalLevels}
          setSignalLevels={setSignalLevels}
          description={description}
          setDescription={setDescription}
        />

        <ActionBar onBack={handleBack} onConfirm={handleConfirm} />
      </div>
    </div>
  </main>
);
}