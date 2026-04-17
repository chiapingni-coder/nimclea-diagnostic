import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ROUTES from "./routes";
import { buildPilotNavigationState } from "./utils/pilotRouting";
import { appendPilotEntry } from "./utils/pilotEntries";
import { normalizeCaseInput } from "./utils/caseSchema";
import { registerTrialUser, startTrial, logTrialEvent } from "./lib/trialApi";
import { getTrialSession, setTrialSession } from "./lib/trialSession";

import {
  getCaseSummary,
  getCaseContext,
  getCaseScenarioCode,
  getCaseStage,
} from "./utils/caseAccessors";

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

function resolveByWeakestDimension(weakestDimension, eventType, preview) {
  if (!weakestDimension) {
    return resolveEventRoute(eventType, preview);
  }

  // 🧠 核心映射（你可以后面升级成 registry）
  const DIMENSION_ROUTE_MAP = {
    authority: {
      pattern: "PAT-02",
      runId: "RUN062",
      patternLabel: "Authority Interaction Structure",
      reason: "Weak authority structure drives interpretation of this event."
    },
    boundary: {
      pattern: "PAT-04",
      runId: "RUN050",
      patternLabel: "Boundary Defense Structure",
      reason: "Weak boundary turns this into a boundary defense issue."
    },
    evidence: {
      pattern: "PAT-01",
      runId: "RUN030",
      patternLabel: "Evidence & Traceability Structure",
      reason: "Weak evidence structure reframes this event as traceability risk."
    },
    coordination: {
      pattern: "PAT-05",
      runId: "RUN070",
      patternLabel: "Coordination Structure",
      reason: "Weak coordination causes execution ambiguity."
    }
  };

  const mapped = DIMENSION_ROUTE_MAP[weakestDimension];

  if (mapped) {
    return {
      runId: mapped.runId,
      pattern: mapped.pattern,
      patternLabel: mapped.patternLabel,
      routeReason: mapped.reason,
      source: "weakest_dimension"
    };
  }

  // fallback
  return resolveEventRoute(eventType, preview);
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

function SetupHero({
  preview,
  workflow,
  sessionId,
  weakestDimension = "",
  firstStepLabel = "",
  firstGuidedAction = "",
  eventWindow = "",
  progressLabel = "",
}) {

  const scenarioLabel = getEnglishScenarioLabel(preview);

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
          This 7-day pilot lets you log real events as they happen, without forcing them
          into a daily schedule. You can record unlimited event activity during the pilot
          window, with up to 5 structured reviews generated from those inputs.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 h-full flex flex-col justify-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Scenario
            </div>
            <p className="mt-2 text-sm text-slate-900">
              {scenarioLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 h-full flex flex-col justify-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Progress
            </div>
            <p className="mt-2 text-sm text-slate-900">
              {progressLabel || "Pilot access opened"}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 h-full flex flex-col justify-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
              Weakest dimension
            </div>
            <p className="mt-2 text-sm text-amber-900">
              {weakestDimension || "Not specified"}
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              This dimension will shape the cost of your pilot path.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span>Pilot ID: {pilotId}</span>
        <span>{eventWindow || "7-Day Event Window"}</span>
      </div>
    </Card>
  );
}

const MAX_CONTEXT_LENGTH = 280;
const MAX_SUMMARY_CONTEXT_LENGTH = 120;
const CONTEXT_SUMMARY_CACHE_PREFIX = "nim_context_summary_";

function buildContextSummary(raw = "") {
  const cleaned = normalizeUserContext(raw);

  if (!cleaned) return "";

  const firstSentence =
    cleaned.split(/(?<=[.!?。！？])\s+/).filter(Boolean)[0] || cleaned;

  return firstSentence.slice(0, MAX_SUMMARY_CONTEXT_LENGTH).trim();
}

function buildContextCacheKey(raw = "") {
  return `${CONTEXT_SUMMARY_CACHE_PREFIX}${raw}`;
}

function normalizeUserContext(raw = "") {
  return String(raw)
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function buildContextForSubmission(raw = "") {
  const cleaned = normalizeUserContext(raw);

  if (!cleaned) return "";

  const sentenceParts = cleaned
    .split(/(?<=[.!?。！？])\s+/)
    .filter(Boolean);

  const shortened = sentenceParts.slice(0, 2).join(" ").trim();

  return shortened.slice(0, MAX_CONTEXT_LENGTH);
}

function DayPlanSection({
  workflow,
  preview,
  firstGuidedAction = "",
  firstStepLabel = "",
}) {
  
  const [open, setOpen] = useState(false);

  const entry =
    firstStepLabel ||
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
      text:
        firstGuidedAction ||
        actions[0] ||
        "Apply one small change to the workflow structure.",
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

function CarryOverSection({
  preview,
  workflow,
  weakestDimension = "",
  firstGuidedAction = "",
  firstStepLabel = "",
}) {

  const strongestSignal = preview?.top_signals?.[0] || null;

  return (
    <Card className="p-6 md:p-7">
      <SectionTitle
        title="Pilot carry-over context"
        hint="These values are inherited from your previous pages so the pilot stays connected to the diagnostic."
      />

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 h-full flex flex-col justify-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Scenario
          </div>
          <p className="mt-2 text-sm text-slate-900">
            {getEnglishScenarioLabel(preview)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 h-full flex flex-col justify-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Progress
          </div>
          <p className="mt-2 text-sm text-slate-900">
            Pilot access opened
          </p>
        </div>
      
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 h-full flex flex-col justify-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
            Weakest dimension
          </div>
          <p className="mt-2 text-sm text-amber-900">
            {weakestDimension || "Not specified"}
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            This dimension will shape the cost of your pilot path.
          </p>
        </div>
      </div>
    </Card>
  );
}

function PilotEventInputSection({
  eventType,
  setEventType,
  showEventRequired,
  setShowEventRequired,
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
          <div className="mt-3">
            <select
              value={eventType || ""}
              onChange={(e) => {
                setEventType(e.target.value);
                setShowEventRequired(false);
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                showEventRequired && !eventType
                  ? "border-red-300 bg-red-50"
                  : "border-slate-300 bg-white focus:border-slate-950"
              }`}
            >
              <option value="" disabled>
                Select what happened
              </option>

              {EVENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {showEventRequired && !eventType ? (
            <div className="mt-3 text-sm font-medium text-red-600">
              Please select what just happened before continuing.
            </div>
          ) : null}
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
            onChange={(e) =>
              setDescription(e.target.value.slice(0, MAX_CONTEXT_LENGTH))
            }
            maxLength={MAX_CONTEXT_LENGTH}
            rows={4}
            placeholder="Brief context (one sentence is enough)."
            className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />

          <div className="mt-2 text-right text-xs text-slate-400">
            {description.length} / {MAX_CONTEXT_LENGTH} characters
          </div>
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
        Start Logging Events →
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

  console.log("PILOT_SETUP_LIVE_CHECK", "frontend-root-PilotSetupPage");

  const pcMeta = location.state?.pcMeta || {
    pc_id: "PC-001",
    pc_name: "Decision Risk Diagnostic",
  };

  const incomingCaseSchema =
  location.state?.caseSchema && typeof location.state.caseSchema === "object"
    ? normalizeCaseInput(location.state.caseSchema)
    : null;

  const [eventType, setEventType] = useState("");
  const [showEventRequired, setShowEventRequired] = useState(false);

  console.log("HAS_SET_SHOW_EVENT_REQUIRED", typeof setShowEventRequired);
  const [signalLevels, setSignalLevels] = useState({
    externalPressure: "medium",
    authorityBoundary: "slightly_unclear",
    dependency: "medium",
  });
  const [description, setDescription] = useState("");
  const pilotSetupPageViewedLoggedRef = useRef(false);

  const pilotSetup = location.state?.pilot_setup || null;

  const preview =
    location.state?.preview ||
    (incomingCaseSchema
      ? {
          title: "Nimclea Pilot Setup Context",
          scenario: {
            code: incomingCaseSchema.scenarioCode || "",
            label: incomingCaseSchema.scenarioCode || "No Dominant Scenario",
          },
          top_signals: [
            {
              key: incomingCaseSchema.patternId || "",
              signalKey: incomingCaseSchema.patternId || "",
              label:
                incomingCaseSchema.patternId ||
                incomingCaseSchema.weakestDimension ||
                "Structural Signal",
              description: getCaseSummary({
                caseData: incomingCaseSchema,
                summaryText: "",
              }),
            },
          ],
          pilot_preview: {
            entry:
              location.state?.firstStepLabel ||
              "Start with one structural improvement path.",
            actions: [
              location.state?.firstGuidedAction ||
                "Start with the first place where this workflow becomes harder to explain, verify, or sustain.",
            ],
            outcome:
              incomingCaseSchema.routeDecision?.reason ||
              "Observe whether the workflow becomes easier to execute and verify.",
          },
          weakestDimension: incomingCaseSchema.weakestDimension || "",
          chainId: incomingCaseSchema.chainId || "",
          stage: incomingCaseSchema.stage || "",
        }
      : null);

  const sessionId =
    location.state?.session_id ||
    location.state?.sessionId ||
    "";

  const workflow =
    pilotSetup?.workflow || "Selected workflow";

  const weakestDimension =
    incomingCaseSchema?.weakestDimension ||
    location.state?.weakestDimension ||
    "";

  const pilotFocusKey =
    location.state?.pilotFocusKey ||
    incomingCaseSchema?.patternId ||
    "";

  const firstGuidedAction =
    location.state?.firstGuidedAction ||
    incomingCaseSchema?.routeDecision?.reason ||
    "";

  const firstStepLabel =
    location.state?.firstStepLabel ||
    getCaseSummary({
      caseData: incomingCaseSchema,
      summaryText: "",
    }) ||
    "";

  const hasRequiredContext =
    ((preview && typeof preview === "object") || incomingCaseSchema) &&
    pilotSetup &&
    typeof pilotSetup === "object";

  useEffect(() => {
    if (pilotSetupPageViewedLoggedRef.current) return;
    if (!hasRequiredContext) return;

    const session =
      location.state?.trialSession || getTrialSession();

    if (!session?.userId || !session?.trialId) return;

    pilotSetupPageViewedLoggedRef.current = true;

    logTrialEvent({
      userId: session.userId,
      trialId: session.trialId,
      caseId: sessionId || "case_result_entry",
      eventType: "pilot_setup_page_viewed",
      page: "PilotSetupPage",
      meta: {
        workflow: pilotSetup?.workflow || preview?.workflow || "Selected workflow",
        scenarioCode:
          incomingCaseSchema?.scenarioCode ||
          preview?.scenario?.code ||
          "",
        weakestDimension,
        pilotFocusKey,
      },
    }).catch((error) => {
      console.error("pilot_setup_page_viewed log error:", error);
      pilotSetupPageViewedLoggedRef.current = false;
    });
  }, [
    hasRequiredContext,
    sessionId,
  ]);

  const handleBack = () => {
    navigate(
      sessionId ? `${ROUTES.PILOT}?session_id=${sessionId}` : ROUTES.PILOT,
      {
        state: {
          pcMeta,
          session_id: sessionId,
          sessionId,
          preview,
          result: preview,
          caseSchema: incomingCaseSchema,
          stage:
            incomingCaseSchema?.stage ||
            location.state?.stage ||
            location.state?.result?.stage ||
            preview?.stage ||
            preview?.extraction?.stageCode ||
            "S1",
          weakestDimension,
          pilotFocusKey,
          firstGuidedAction,
          firstStepLabel,
        }
      }
    );
  };

const handleConfirm = async () => {
  if (!eventType) {
    setShowEventRequired(true);
    return;
  }

  const trimmedDescription = buildContextForSubmission(description);
  let summarizedDescription = "";

  if (trimmedDescription) {
    const contextCacheKey = buildContextCacheKey(trimmedDescription);

    try {
      summarizedDescription =
        localStorage.getItem(contextCacheKey) ||
        buildContextSummary(trimmedDescription);

      localStorage.setItem(contextCacheKey, summarizedDescription);
    } catch {
      summarizedDescription = buildContextSummary(trimmedDescription);
    }
  }
  
  let existingTrialSession =
    location.state?.trialSession || getTrialSession();

  console.log("TRIAL_SESSION_CHECK", {
    fromState: location.state?.trialSession,
    fromStorage: getTrialSession(),
  });

  if (!existingTrialSession?.userId || !existingTrialSession?.trialId) {
    try {
      const registerRes = await registerTrialUser({
        email: "pilot@nimclea.local",
        name: "",
        company: "",
      });

      existingTrialSession = {
        userId: registerRes?.data?.userId || "",
        trialId: registerRes?.data?.trialId || "",
        email: registerRes?.data?.email || "pilot@nimclea.local",
        status: registerRes?.data?.status || "registered",
        createdAt: registerRes?.data?.createdAt || "",
      };
  
      if (!existingTrialSession?.userId || !existingTrialSession?.trialId) {
        console.error("PilotSetupPage registerTrialUser returned empty session", {
          registerRes,
       });
        alert("Trial session was not created.");
        return;
      }
  
      setTrialSession(existingTrialSession);
    } catch (error) {
      console.error("PilotSetupPage registerTrialUser error:", error);
      alert(error?.message || "Failed to create trial session.");
      return;
    }
  }

  let mergedTrialSession = existingTrialSession;

  try {
    const startRes = await startTrial({
      userId: existingTrialSession.userId,
      trialId: existingTrialSession.trialId,
      entryPoint: "pilot_setup_page",
      pcCode: pcMeta?.pc_id || "PC-001",
    });

    mergedTrialSession = {
      ...existingTrialSession,
      trialSessionId:
        startRes?.data?.trialSessionId ||
        existingTrialSession?.trialSessionId ||
        "",
      startedAt:
        startRes?.data?.startedAt ||
        existingTrialSession?.startedAt ||
        "",
      expiresAt:
        startRes?.data?.expiresAt ||
        existingTrialSession?.expiresAt ||
        "",
      status:
        startRes?.data?.status ||
        existingTrialSession?.status ||
        "active",
    };

    setTrialSession(mergedTrialSession);
  } catch (error) {
    console.error("startTrial error:", error);
    alert(error?.message || "Failed to start pilot.");
    return;
  }

  const evidenceState =
    summarizedDescription || trimmedDescription
      ? "present"
      : "missing";

  const responseState =
    eventType === "decision_override_attempt" ||
    eventType === "high_pressure_decision"
      ? "required"
      : eventType === "decision_suggested" ||
        eventType === "resource_control_request" ||
        eventType === "role_boundary_blur"
      ? "emerging"
      : "unknown";

  const boundaryState =
    signalLevels.authorityBoundary === "unclear"
      ? "weak"
      : signalLevels.authorityBoundary === "slightly_unclear"
      ? "partial"
      : signalLevels.authorityBoundary === "clear"
      ? "clear"
      : "unknown";

  setShowEventRequired(false);

  try {
    await logTrialEvent({
      userId: mergedTrialSession.userId,
      trialId: mergedTrialSession.trialId,
      caseId: sessionId || "case_result_entry",
      eventType: "trial_started",
      page: "PilotSetupPage",
      meta: {
        workflow: pilotSetup?.workflow || preview?.workflow || "Selected workflow",
        eventType,
        weakestDimension,
        pcId: pcMeta?.pc_id || "PC-001",
      },
    });

    await logTrialEvent({
      userId: mergedTrialSession.userId,
      trialId: mergedTrialSession.trialId,
      caseId: sessionId || "case_result_entry",
      eventType: "pilot_setup_confirmed",
      page: "PilotSetupPage",
      meta: {
        workflow: pilotSetup?.workflow || preview?.workflow || "Selected workflow",
        selectedEventType: eventType,
        externalPressure: signalLevels.externalPressure,
        authorityBoundary: signalLevels.authorityBoundary,
        dependency: signalLevels.dependency,
        weakestDimension,
      },
    });
  } catch (error) {
    console.error("logTrialEvent error:", error);
  }

  const entryTimestamp = new Date().toISOString();

  const structuredEvent = {
    eventType,
    signals: {
      externalPressure: signalLevels.externalPressure,
      authorityBoundary: signalLevels.authorityBoundary,
      dependency: signalLevels.dependency,
    },
    description: trimmedDescription,
    summaryContext: summarizedDescription,
    evidenceText: summarizedDescription || trimmedDescription || "",
    evidenceState,
    responseState,
    boundaryState,
    timestamp: entryTimestamp,
  };

  const strongestSignal = Array.isArray(preview?.top_signals)
    ? preview.top_signals[0]
    : null;

  const extraction = preview?.extraction || {};
  const resultSeed = preview?.resultSeed || preview?.extraction || {};

  const resolvedRoute = resolveByWeakestDimension(
    weakestDimension,
    eventType,
    preview
  );

  const evidenceLevel =
    summarizedDescription || eventType !== "other"
      ? "has_explanation"
      : "low_evidence";

  const entryCaseData = normalizeCaseInput(
    {
      ...(incomingCaseSchema || {}),
      source: "pilot",
      summary: summarizedDescription || trimmedDescription || "",
      description: trimmedDescription || "",
      eventType,
      eventContext: trimmedDescription || "",
      evidenceText: summarizedDescription || trimmedDescription || "",
      evidenceState,
      responseState,
      boundaryState,
      weakestDimension:
        weakestDimension ||
        incomingCaseSchema?.weakestDimension ||
        "",
      scenarioCode:
        incomingCaseSchema?.scenarioCode ||
        preview?.scenario?.code ||
        "unknown_scenario",
      patternId: resolvedRoute.pattern,
      fallbackRunCode: resolvedRoute.runId,
      stage:
        incomingCaseSchema?.stage ||
        extraction?.stageCode ||
        resultSeed?.stageCode ||
        preview?.stage ||
        "S0",
      chainId:
        incomingCaseSchema?.chainId ||
        location.state?.chainId ||
        "CHAIN-001",
    },
    { source: "pilot" }
  );

  const pilotEntry = {
    id: `entry_${Date.now()}`,
    timestamp: entryTimestamp,
    eventType,

    workflow: pilotSetup?.workflow || preview?.workflow || "Selected workflow",

    eventInput: {
      description: trimmedDescription || "",
      summaryContext: summarizedDescription || "",
      externalPressure: signalLevels.externalPressure,
      authorityBoundary: signalLevels.authorityBoundary,
      dependency: signalLevels.dependency,
      evidenceText: summarizedDescription || trimmedDescription || "",
      evidenceState,
      responseState,
      boundaryState,
      evidenceLevel,
      workflow: pilotSetup?.workflow || preview?.workflow || "Selected workflow",
    },
    reviewResult: {
      runId: resolvedRoute.runId,
      pattern: resolvedRoute.pattern,
      patternLabel: resolvedRoute.patternLabel,
      scenarioLabel: getEnglishScenarioLabel(preview),
      scenarioCode:
        getCaseScenarioCode({
          caseData: entryCaseData,
          scenarioCode:
            extraction?.scenarioKey ||
            resultSeed?.scenarioKey ||
            preview?.scenario?.code ||
            "unknown_scenario",
        }) || "unknown_scenario",
      stage:
        getCaseStage({
          caseData: entryCaseData,
          stage:
            incomingCaseSchema?.stage ||
            extraction?.stageCode ||
            resultSeed?.stageCode ||
            preview?.stage ||
            "S0",
        }) || "S0",
      summaryText:
        getCaseSummary({
          caseData: entryCaseData,
          summaryText:
            summarizedDescription ||
            trimmedDescription ||
            "No structured summary available.",
        }) || "No structured summary available.",
      caseInput: getCaseContext({
        caseData: entryCaseData,
        caseInput: trimmedDescription || "",
      }),
      caseData: entryCaseData,
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
        {
          label: "Evidence State",
          value: evidenceState,
        },
        {
          label: "Response State",
          value: responseState,
        },
        {
          label: "Boundary State",
          value: boundaryState,
        },
        ...(trimmedDescription
          ? [
              {
                label: "Context",
                value: summarizedDescription || trimmedDescription,
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
      routeReason: resolvedRoute.routeReason,
      routeSource: resolvedRoute.source,
    },
  
    weakestDimensionSnapshot:
      weakestDimension ||
      entryCaseData?.weakestDimension ||
      "",
  
    caseSchema: entryCaseData,
    eventHistory: [structuredEvent],
  
    // legacy fallback，先留
    judgmentFocus: weakestDimension || "event_based",
    description: trimmedDescription,
    summaryContext: summarizedDescription,
    externalPressure: signalLevels.externalPressure,
    authorityBoundary: signalLevels.authorityBoundary,
    dependency: signalLevels.dependency,
    runId: resolvedRoute.runId,
    pattern: resolvedRoute.pattern,
    patternLabel: resolvedRoute.patternLabel,
    scenarioLabel: getEnglishScenarioLabel(preview),
    scenarioCode:
      getCaseScenarioCode({
        caseData: entryCaseData,
        scenarioCode:
          extraction?.scenarioKey ||
          resultSeed?.scenarioKey ||
          preview?.scenario?.code ||
          "unknown_scenario",
      }) || "unknown_scenario",
    evidenceText: summarizedDescription || trimmedDescription || "",
    evidenceState,
    responseState,
    boundaryState,
    evidenceLevel,
    summaryMode: false,
    caseData: entryCaseData,
  };
  
  const allPilotEntries = appendPilotEntry(pilotEntry);

  const structuredEventCount = Array.isArray(allPilotEntries)
    ? allPilotEntries.length
    : 0;

  const evidenceSupport = evidenceState === "present" ? 1 : 0;
    const hasCoreSignals =
    Boolean(eventType) &&
    Boolean(signalLevels.externalPressure) &&
    Boolean(signalLevels.authorityBoundary) &&
    Boolean(signalLevels.dependency);

  const hasStructuredNarrative =
    Boolean(
      String(summarizedDescription || trimmedDescription || "").trim()
    ) || eventType !== "other";

  const hasResolvedStructure =
    Boolean(resolvedRoute?.runId) &&
    Boolean(resolvedRoute?.pattern);

  const structureCompleteness =
    hasCoreSignals && hasStructuredNarrative && hasResolvedStructure
      ? 1
      : hasCoreSignals || hasStructuredNarrative
      ? 0.5
      : 0;

  const currentReviewMode =
    structuredEventCount >= 1 ? "event_review" : "pilot_setup";

  const samplingWindowClosed =
    location.state?.routeMeta?.samplingWindowClosed === true ||
    location.state?.pilot_result?.samplingWindowClosed === true ||
    location.state?.pilot_setup?.samplingWindowClosed === true ||
    false;

  const pilotComplete =
    location.state?.routeMeta?.structureStatus === "pilot_complete" ||
    location.state?.pilot_result?.structureStatus === "pilot_complete" ||
    samplingWindowClosed === true;

  const pilotResult = {
    judgmentFocus: weakestDimension || "event_based",
    resolvedBy: weakestDimension || "event_type",
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
      {
        label: "Evidence State",
        value: evidenceState,
      },
      {
        label: "Response State",
        value: responseState,
      },
      {
        label: "Boundary State",
        value: boundaryState,
      },
      ...(trimmedDescription
        ? [
            {
              label: "Context",
              value: summarizedDescription || trimmedDescription,
            }
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

    scenarioCode: getCaseScenarioCode({
      caseData: entryCaseData,
      scenarioCode:
        extraction?.scenarioKey ||
        resultSeed?.scenarioKey ||
        preview?.scenario?.code ||
        "unknown_scenario",
    }) || "unknown_scenario",

    successMetric:
      strongestSignal?.pilotMetric ||
      preview?.pilot_preview?.outcome ||
      "Reduction in friction and clearer workflow structure.",

    summaryText:
      summarizedDescription ||
      trimmedDescription ||
      preview?.summary?.[0] ||
      resultSeed?.summary ||
      "No structured summary available.",
    
    pilotEntriesCount: structuredEventCount,
    latestEntryId: pilotEntry.id,
    summaryTriggerMode: "manual_click",
  };

  const navState = buildPilotNavigationState({
    ...location.state,
    caseSchema: entryCaseData,

    session_id: sessionId,
    sessionId,

    preview,
    sourceInput: {
      ...preview,
      weakestDimension: weakestDimension || "",
      firstGuidedAction,
      firstStepLabel,
      runId: resolvedRoute.runId,
      pattern: resolvedRoute.pattern,
      patternLabel: resolvedRoute.patternLabel,
      scenarioLabel: getEnglishScenarioLabel(preview),
      scenarioCode:
        getCaseScenarioCode({
          caseData: entryCaseData,
          scenarioCode:
            extraction?.scenarioKey ||
            resultSeed?.scenarioKey ||
            preview?.scenario?.code ||
            "unknown_scenario",
        }) || "unknown_scenario",
      stage: getCaseStage({
       caseData: entryCaseData,
        stage:
          extraction?.stageCode ||
          resultSeed?.stageCode ||
          preview?.stage ||
          "S0",
      }),
      summaryText:
        getCaseSummary({
          caseData: entryCaseData,
          summaryText:
            summarizedDescription ||
            trimmedDescription ||
            "No structured summary available.",
        }) || "No structured summary available.",
      caseInput: getCaseContext({
        caseData: entryCaseData,
        caseInput: trimmedDescription || "",
      }),
      caseData: entryCaseData,
      signals: pilotResult.signals,
      reviewMode: currentReviewMode,
      structuredEventCount,
      evidenceSupport,
      structureCompleteness,
      samplingWindowClosed,
    },
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

    reviewMode: currentReviewMode,
    structuredEventCount,
    evidenceSupport,
    structureCompleteness,
    samplingWindowClosed,
    pilotComplete,
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
      resolvedBy: weakestDimension || "event_type",
    },

    pilot_entries: Array.isArray(allPilotEntries) ? allPilotEntries : [],
    latest_pilot_entry: pilotEntry,
    pilot_result: {
      ...pilotResult,
      caseData: entryCaseData,
      caseInput: getCaseContext({
        caseData: entryCaseData,
        caseInput: trimmedDescription || "",
      }),
      summaryText:
        getCaseSummary({
          caseData: entryCaseData,
          summaryText:
            summarizedDescription ||
            trimmedDescription ||
            "No structured summary available.",
        }) || "No structured summary available.",
      reviewMode: currentReviewMode,
      structuredEventCount,
      evidenceSupport,
      structureCompleteness,
      samplingWindowClosed,
    },
    weakestDimension,
    pilotFocusKey,
    firstGuidedAction,
    firstStepLabel,
  });

  console.log("🧾 final pilot_entries =", allPilotEntries);

  navigate(
    sessionId
      ? `${navState.routeMeta.pathname}?session_id=${sessionId}`
      : navState.routeMeta.pathname,
    {
      state: {
        ...location.state,
        ...navState,
        pcMeta,
        trialSession: mergedTrialSession,
        caseSchema: entryCaseData,

        session_id: sessionId,
        sessionId,

        preview,
        sourceInput: {
          ...preview,
          weakestDimension: weakestDimension || "",
          firstGuidedAction,
          firstStepLabel,
          runId: resolvedRoute.runId,
          pattern: resolvedRoute.pattern,
          patternLabel: resolvedRoute.patternLabel,
          scenarioLabel:
            getCaseScenarioCode({
              caseData: entryCaseData,
              scenarioCode:
                extraction?.scenarioKey ||
                resultSeed?.scenarioKey ||
                preview?.scenario?.code ||
                "unknown_scenario",
            })
              ? getEnglishScenarioLabel(preview)
              : "No Dominant Scenario",
          scenarioCode: getCaseScenarioCode({
            caseData: entryCaseData,
            scenarioCode:
              extraction?.scenarioKey ||
              resultSeed?.scenarioKey ||
              preview?.scenario?.code ||
              "unknown_scenario",
          }) || "unknown_scenario",
          stage:
            extraction?.stageCode ||
            resultSeed?.stageCode ||
            preview?.stage ||
            "S0",
          summaryText:
            getCaseSummary({
              caseData: entryCaseData,
              summaryText:
                summarizedDescription ||
                trimmedDescription ||
                "No structured summary available.",
            }) || "No structured summary available.",
          caseInput: getCaseContext({
            caseData: entryCaseData,
            caseInput: trimmedDescription || "",
          }),
          caseData: entryCaseData,
          signals: pilotResult.signals,
          reviewMode: currentReviewMode,
          structuredEventCount,
          evidenceSupport,
          structureCompleteness,
          samplingWindowClosed,
        },
        extraction,
        resultSeed,

        weakestDimension,
        pilotFocusKey,
        firstGuidedAction,
        firstStepLabel,

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
          resolvedBy: weakestDimension || "event_type",
        },

        pilot_entries: Array.isArray(allPilotEntries) ? allPilotEntries : [],
        latest_pilot_entry: pilotEntry,

        pilot_result: {
          ...pilotResult,
          ...navState.pilot_result,
          caseData: entryCaseData,
          caseInput: getCaseContext({
            caseData: entryCaseData,
            caseInput: trimmedDescription || "",
          }),
          summaryText:
            getCaseSummary({
              caseData: entryCaseData,
              summaryText:
                summarizedDescription ||
                trimmedDescription ||
                "No structured summary available.",
            }) || "No structured summary available.",
          summaryMode: navState.pilot_result.summaryMode,
          structureStatus: navState.routeMeta.structureStatus,
          nextAction: navState.routeMeta.nextAction,
          reviewMode: navState.routeMeta.reviewMode || navState.pilot_result.reviewMode || "event_review",
          structuredEventCount:
            navState.routeMeta.structuredEventCount ??
            navState.pilot_result.structuredEventCount ??
            structuredEventCount,
          evidenceSupport:
            navState.routeMeta.evidenceSupport ??
            navState.pilot_result.evidenceSupport ??
            (evidenceState === "present" ? 1 : 0),
          structureCompleteness:
            navState.routeMeta.structureCompleteness ??
            navState.pilot_result.structureCompleteness ??
            1,
          samplingWindowClosed:
            navState.routeMeta.samplingWindowClosed === true ||
            navState.pilot_result.samplingWindowClosed === true,
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
          weakestDimension={weakestDimension}
          firstStepLabel={firstStepLabel}
          firstGuidedAction={firstGuidedAction}
          eventWindow={location.state?.routeMeta?.eventWindow || ""}
          progressLabel={location.state?.routeMeta?.progressLabel || "Pilot access opened"}
        />

        <PilotEventInputSection
          eventType={eventType}
          setEventType={setEventType}
          showEventRequired={showEventRequired}
          setShowEventRequired={setShowEventRequired}
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