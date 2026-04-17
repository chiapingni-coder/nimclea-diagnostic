import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:3000";

function formatTime(value) {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function getEventType(item) {
  return (
    item?.type ||
    item?.eventType ||
    item?.action ||
    item?.event ||
    "unknown_event"
  );
}

function getCaseId(item) {
  return item?.caseId || item?.case_id || item?.diagnosticId || "—";
}

function getUserLabel(item) {
  return (
    item?.userId ||
    item?.email ||
    item?.userEmail ||
    item?.trialUserEmail ||
    "—"
  );
}

function getActorKey(item) {
  return (
    item?.sessionId ||
    item?.session_id ||
    item?.trialId ||
    item?.userId ||
    item?.email ||
    item?.userEmail ||
    item?.trialUserEmail ||
    item?.caseId ||
    item?.case_id ||
    "—"
  );
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function matchEvent(item, patterns = []) {
  const eventType = normalizeText(
    item?.type || item?.eventType || item?.action || item?.event
  );
  const page = normalizeText(item?.page || item?.pageName || item?.sourcePage);
  const raw = normalizeText(JSON.stringify(item));

  return patterns.some((pattern) => {
    const p = normalizeText(pattern);
    return eventType.includes(p) || page.includes(p) || raw.includes(p);
  });
}

function isExactEvent(item, expected) {
  return getEventType(item) === expected;
}

function isDiagnosticEvent(item) {
  return isExactEvent(item, "diagnostic_completed") || matchEvent(item, [
    "submit_diagnostic",
    "diagnostic_submit",
    "questionnaire",
  ]);
}

function isPilotSetupEvent(item) {
  return isExactEvent(item, "pilot_setup_confirmed") || matchEvent(item, [
    "pilot_setup",
    "pilot setup",
    "start_trial",
    "trial_start",
  ]);
}

function isPilotEvent(item) {
  return (
    isExactEvent(item, "pilot_entered") ||
    isExactEvent(item, "pilot_workflow_selected")
  );
}

function isReceiptEvent(item) {
  return isExactEvent(item, "receipt_viewed") || matchEvent(item, [
    "receipt_view",
    "case_receipt",
  ]);
}

function isVerificationEvent(item) {
  return isExactEvent(item, "verification_viewed") || matchEvent(item, [
    "formal_verification",
    "activate verification",
    "verification_page",
    "verification_view",
    "verification_result",
  ]);
}

export default function AnalyticsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/analytics/events`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load analytics events.");
        }

        if (alive) {
          setItems(Array.isArray(data?.items) ? data.items : []);
        }
      } catch (err) {
        if (alive) {
          setError(err.message || "Unknown error");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const summary = useMemo(() => {
    const eventTypeCount = {};

    for (const item of items) {
      const key = getEventType(item);
      eventTypeCount[key] = (eventTypeCount[key] || 0) + 1;
    }

    const topTypes = Object.entries(eventTypeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

    function uniqueBy(list, keyGetter) {
      const set = new Set();

      for (const item of list) {
        const key = keyGetter(item);
        if (key && key !== "—") {
          set.add(key);
        }
      }

      return set.size;
    }

    const diagnosticCount = items.filter(isDiagnosticEvent).length;
    const pilotSetupCount = items.filter(isPilotSetupEvent).length;
    const pilotCount = items.filter(isPilotEvent).length;
    const receiptCount = items.filter(isReceiptEvent).length;
    const verificationCount = items.filter(isVerificationEvent).length;
    const diagnosticUsers = uniqueBy(items.filter(isDiagnosticEvent), getActorKey);
    const pilotSetupUsers = uniqueBy(items.filter(isPilotSetupEvent), getActorKey);
    const pilotUsers = uniqueBy(items.filter(isPilotEvent), getActorKey);
    const receiptUsers = uniqueBy(items.filter(isReceiptEvent), getActorKey);
    const verificationUsers = uniqueBy(items.filter(isVerificationEvent), getActorKey);

    function safeRate(current, previous) {
      if (!previous) return "0%";
      return `${Math.round((current / previous) * 100)}%`;
    }
    
    function buildPriorityScore(prevUsers, currentUsers) {
      const prev = Number(prevUsers || 0);
      const current = Number(currentUsers || 0);

      if (prev <= 0) {
        return {
          drop: 0,
          dropRate: 0,
          confidence: "low",
          score: 0,
        };
      }

      const drop = Math.max(prev - current, 0);
      const dropRate = drop / prev;

      if (drop < 2) {
        return {
          drop,
          dropRate,
          confidence: "low",
          score: 0,
        };
      }

      if (prev < 5) {
       return {
          drop,
          dropRate,
          confidence: "low",
          score: 0,
        };
      }

      let confidenceWeight = 0.4;
      let confidence = "low";

      if (prev >= 20) {
        confidenceWeight = 1;
        confidence = "high";
      } else if (prev >= 8) {
        confidenceWeight = 0.7;
        confidence = "medium";
      }

      const score = Math.round(drop * dropRate * 100 * confidenceWeight);

     return {
        drop,
        dropRate,
        confidence,
        score,
      };
    }

    function classifyIssueType(candidate) {
      if (!candidate) {
        return {
          likelyIssueType: "Unknown",
          issueReason: "No optimization candidate is available yet.",
        };
      }

      const { toKey, dropRate, fromUsers, toUsers } = candidate;

      if (toKey === "pilotSetup") {
        return {
          likelyIssueType: "CTA / Button",
          issueReason:
            "Users finish Diagnostic but do not start the next step. This usually points to weak button visibility, weak CTA wording, or poor placement.",
        };
      }
    
      if (toKey === "pilot") {
        return {
          likelyIssueType: "Path / Routing",
          issueReason:
            "Users begin setup but do not reach Pilot. This usually suggests transition friction, missing navigation, or routing handoff issues.",
        };
      }
    
      if (toKey === "receipt") {
        return {
          likelyIssueType: "Path / Trigger",
          issueReason:
            "Users reach Pilot but do not see Receipt. This usually suggests missing result trigger, weak completion visibility, or an unclear end-state transition.",
        };
      }
    
      if (toKey === "verification") {
        if (dropRate > 0 && dropRate >= 0.4 && fromUsers >= 5) {
          return {
            likelyIssueType: "Copy / Messaging",
            issueReason:
              "Users reach Receipt but do not continue. This often signals trust hesitation, weak value explanation, or next-step copy that does not feel worth clicking.",
          };
        }
    
        return {
          likelyIssueType: "CTA / Next Step",
          issueReason:
            "Users reach Receipt but do not proceed. This may come from weak button hierarchy, low emphasis on the next step, or insufficient visual guidance.",
          };
      }
    
      return {
        likelyIssueType: "Unknown",
        issueReason: "More event data is needed before classifying the likely issue type.",
      };
    }

    function buildStrategyRecommendation(candidate, issueType) {
      if (!candidate || candidate.score === 0) {
        return {
          primary: "No action needed",
          secondary: null,
          note: "No high-impact optimization needed at this stage.",
        };
      }

      const { dropRate, confidence } = candidate;

      // CTA 优先级
      if (issueType === "CTA / Button") {
        return {
          primary: "Improve Button / CTA (High Impact)",
          secondary: "Review copy clarity",
          note: "Users are not entering the next step. Button visibility and wording have the highest leverage.",
        };
      }

      // 路径问题
      if (issueType === "Path / Routing" || issueType === "Path / Trigger") {
        return {
          primary: "Fix Navigation / Routing (High Impact)",
          secondary: "Then review UX flow",
          note: "Users are dropping due to transition friction. Fixing flow will unlock conversion.",
        };
      }

      // 文案问题
      if (issueType === "Copy / Messaging") {
        return {
          primary: "Improve Copy / Value Messaging (High Impact)",
          secondary: "Then adjust CTA emphasis",
          note: "Users hesitate at the decision point. Strengthening perceived value will drive action.",
        };
      }

      return {
        primary: "Review this step",
        secondary: null,
        note: "More data is needed to determine the best optimization strategy.",
      };
    }

    const funnelSteps = [
      { key: "diagnostic", users: diagnosticUsers },
      { key: "pilotSetup", users: pilotSetupUsers },
      { key: "pilot", users: pilotUsers },
      { key: "receipt", users: receiptUsers },
      { key: "verification", users: verificationUsers },
    ];
    
    const optimizationCandidates = [
      {
        fromKey: "diagnostic",
        toKey: "pilotSetup",
        fromLabel: "Diagnostic",
        toLabel: "Pilot Setup",
        fromUsers: diagnosticUsers,
        toUsers: pilotSetupUsers,
        ...buildPriorityScore(diagnosticUsers, pilotSetupUsers),
      },
      {
        fromKey: "pilotSetup",
        toKey: "pilot",
        fromLabel: "Pilot Setup",
        toLabel: "Pilot",
        fromUsers: pilotSetupUsers,
        toUsers: pilotUsers,
        ...buildPriorityScore(pilotSetupUsers, pilotUsers),
      },
      {
        fromKey: "pilot",
        toKey: "receipt",
        fromLabel: "Pilot",
        toLabel: "Receipt",
        fromUsers: pilotUsers,
        toUsers: receiptUsers,
        ...buildPriorityScore(pilotUsers, receiptUsers),
      },
      {
        fromKey: "receipt",
        toKey: "verification",
        fromLabel: "Receipt",
        toLabel: "Verification",
        fromUsers: receiptUsers,
        toUsers: verificationUsers,
        ...buildPriorityScore(receiptUsers, verificationUsers),
      },
    ];

    const highestValueCandidate = [...optimizationCandidates]
      .sort((a, b) => b.score - a.score)[0] || null;

    let biggestDropKey = "";
    let biggestDropValue = -1;
    
    for (let i = 1; i < funnelSteps.length; i += 1) {
      const prev = funnelSteps[i - 1].users;
      const current = funnelSteps[i].users;
      const drop = prev - current;
    
      if (drop > biggestDropValue) {
        biggestDropValue = drop;
        biggestDropKey = funnelSteps[i].key;
      }
    }
    
    const LABEL_MAP = {
      diagnostic: "Diagnostic",
      pilotSetup: "Pilot Setup",
      pilot: "Pilot",
      receipt: "Receipt",
      verification: "Verification",
    };

    const stepIndexMap = {
      diagnostic: 0,
      pilotSetup: 1,
      pilot: 2,
      receipt: 3,
      verification: 4,
    };

    let diagnosticText = "No significant drop detected";
    let recommendedAction = "No action needed right now.";
    let optimizationInsight = null;

    const hasPostDiagnosticData =
      pilotSetupUsers > 0 ||
      pilotUsers > 0 ||
      receiptUsers > 0 ||
      verificationUsers > 0;

    const hasFunnelInconsistency =
      pilotSetupUsers > diagnosticUsers ||
      pilotUsers > pilotSetupUsers ||
      receiptUsers > pilotUsers ||
      verificationUsers > receiptUsers;

    if (diagnosticUsers === 0 && hasPostDiagnosticData) {
      diagnosticText = "No Diagnostic data detected. Funnel may be incomplete.";
      recommendedAction = "Check entry-stage logging.";

      optimizationInsight = {
        step: "Entry",
        problem: "Users are entering later stages without a recorded entry point.",
        hypothesis: "Diagnostic event is not consistently logged.",
        action: "Fix diagnostic_completed event trigger and ensure it fires once per user.",
      };

    } else if (hasFunnelInconsistency) {
      diagnosticText =
        "Funnel inconsistency detected. A later stage exceeds an earlier stage.";
      recommendedAction =
        "Check event naming, deduping, and stage mapping.";

      optimizationInsight = {
        step: "Data Integrity",
        problem: "Later-stage user count exceeds earlier stage.",
        hypothesis: "Event duplication or misaligned event naming.",
        action: "Audit event naming consistency and once-dedup logic.",
      };

    } else if (highestValueCandidate && highestValueCandidate.score > 0) {
      const toKey = highestValueCandidate.toKey;
      const fromLabel = highestValueCandidate.fromLabel;
      const toLabel = highestValueCandidate.toLabel;
      const issueClassification = classifyIssueType(highestValueCandidate);

      const strategy = buildStrategyRecommendation(
        highestValueCandidate,
        issueClassification.likelyIssueType
      );

      diagnosticText = `Highest-value optimization point: ${fromLabel} → ${toLabel}`;

      const PROBLEM_MAP = {
        pilotSetup: "Users complete Diagnostic but do not start Pilot Setup.",
        pilot: "Users start setup but do not enter Pilot.",
        receipt: "Users complete Pilot but do not reach Receipt.",
        verification: "Users reach Receipt but do not proceed to Verification.",
      };

      const HYPOTHESIS_MAP = {
        pilotSetup: "CTA unclear or not compelling.",
        pilot: "Transition friction or missing trigger.",
        receipt: "Outcome not visible or not triggered.",
        verification: "Trust barrier or unclear next step.",
      };

      const ACTION_MAP = {
        pilotSetup: "Improve 'Start Pilot' CTA clarity and placement.",
        pilot: "Ensure automatic navigation into Pilot after setup.",
        receipt: "Check result trigger and ensure receipt is shown clearly.",
        verification: "Highlight verification value and reduce perceived risk.",
      };

      recommendedAction = ACTION_MAP[toKey] || "Review this transition step.";

      optimizationInsight = {
        step: `${fromLabel} → ${toLabel}`,
        problem: PROBLEM_MAP[toKey],
        hypothesis: HYPOTHESIS_MAP[toKey],
        action: ACTION_MAP[toKey],
        drop: highestValueCandidate.drop,
        dropRate: `${Math.round(highestValueCandidate.dropRate * 100)}%`,
        confidence: highestValueCandidate.confidence,
        score: highestValueCandidate.score,
        likelyIssueType: issueClassification.likelyIssueType,
        issueReason: issueClassification.issueReason,
        strategyPrimary: strategy.primary,
        strategySecondary: strategy.secondary,
        strategyNote: strategy.note,
      };
    }

    return {
      total: items.length,
      topTypes,
      funnel: {
        diagnosticCount,
        pilotSetupCount,
        pilotCount,
        receiptCount,
        verificationCount,
        pilotSetupRate: safeRate(pilotSetupCount, diagnosticCount),
        pilotRate: safeRate(pilotCount, pilotSetupCount),
        receiptRate: safeRate(receiptCount, pilotCount),
        verificationRate: safeRate(verificationCount, receiptCount),
        diagnosticUsers,
        pilotSetupUsers,
        pilotUsers,
        receiptUsers,
        verificationUsers,
        biggestDropKey,
        diagnosticText,
        recommendedAction,
        overallConversionRate: safeRate(verificationUsers, diagnosticUsers),
        receiptConversionRate: safeRate(receiptUsers, diagnosticUsers),
        pilotConversionRate: safeRate(pilotUsers, diagnosticUsers),
        setupConversionRate: safeRate(pilotSetupUsers, diagnosticUsers),
        optimizationInsight,
        highestValueCandidate,
        optimizationCandidates,
      },
    };
  }, [items]);

  const hasHighValueDrop =
    summary?.funnel?.highestValueCandidate?.score > 0;

  const fmt = (n) => (Number.isFinite(n) ? n : 0);

  const pathText = (fromLabel, toLabel, fromCount, toCount) => {
    const f = fmt(fromCount);
    const t = fmt(toCount);
    const rate = f > 0 ? Math.round((t / f) * 100) : 0;
    return `${fromLabel} → ${toLabel} · ${rate}% (${f} → ${t})`;
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-neutral-900">
            {hasHighValueDrop
              ? "Funnel Alert: Optimization Needed"
              : "Funnel Status: Stable"}
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            {hasHighValueDrop
              ? "A high-impact drop-off has been detected. See below for the most valuable optimization point."
              : "User flow across key steps is stable. No high-impact drop-off detected."}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            {hasHighValueDrop
              ? "Focus on the highlighted step below to improve conversion."
              : "This view will automatically highlight optimization opportunities when they appear."}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm font-medium leading-6 text-neutral-800">
            {summary.funnel.diagnosticText}
          </p>

          <p className="mt-1 text-sm leading-6 text-neutral-600">
            {summary.funnel.recommendedAction}
          </p>

          {summary.funnel.optimizationInsight ? (
            <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              <div className="font-medium text-neutral-900">
                Focus Step: {summary.funnel.optimizationInsight.step}
              </div>
              <div className="mt-1">
                Problem: {summary.funnel.optimizationInsight.problem}
              </div>
              <div className="mt-1">
                Why: {summary.funnel.optimizationInsight.hypothesis}
              </div>
              <div className="mt-1 text-green-700">
                Action: {summary.funnel.optimizationInsight.action}
              </div>

              <div className="mt-1">
                Likely Issue Type: {summary.funnel.optimizationInsight.likelyIssueType}
              </div>
              <div className="mt-1 text-neutral-600">
                Signal: {summary.funnel.optimizationInsight.issueReason}
              </div>

              <div className="mt-2 font-medium text-neutral-900">
                Strategy: {summary.funnel.optimizationInsight.strategyPrimary}
              </div>

              {summary.funnel.optimizationInsight.strategySecondary ? (
                <div className="text-sm text-neutral-600">
                  Next: {summary.funnel.optimizationInsight.strategySecondary}
                </div>
              ) : null}

              <div className="mt-1 text-xs text-neutral-500">
                {summary.funnel.optimizationInsight.strategyNote}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700">
                  Drop · {summary.funnel.optimizationInsight.drop}
                </span>
                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700">
                  Drop Rate · {summary.funnel.optimizationInsight.dropRate}
                </span>
                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700">
                  Confidence · {summary.funnel.optimizationInsight.confidence}
                </span>
                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-900">
                  Priority Score · {summary.funnel.optimizationInsight.score}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-sm leading-5 text-neutral-500">Total Events</div>
            <div className="mt-2 text-2xl font-semibold leading-none text-neutral-900">
              {summary.total}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-sm leading-5 text-neutral-500">Unique Actors</div>
            <div className="mt-2 text-2xl font-semibold leading-none text-neutral-900">
              {summary.funnel.diagnosticUsers}
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              Based on session / trial / user identity
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-sm leading-5 text-neutral-500">Overall Conversion</div>
            <div className="mt-2 text-2xl font-semibold leading-none text-neutral-900">
              {summary.funnel.overallConversionRate}
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              Diagnostic → Verification
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
          <div className="text-sm leading-5 text-neutral-500">Top Event Types</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.topTypes.length > 0 ? (
              summary.topTypes.map(([type, count]) => (
                <span
                  key={type}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-700"
                >
                  {type} · {count}
                </span>
              ))
            ) : (
              <span className="text-sm text-neutral-400">No events yet</span>
            )}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">

          <div
            className={`rounded-2xl border px-5 py-4 shadow-sm ${
              summary.funnel.highestValueCandidate?.toKey === "diagnostic"
                ? "border-red-300 bg-red-50"
                : "border-neutral-200 bg-white"
            }`}
          >
            <div className="text-sm text-neutral-500">Diagnostic</div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {summary.funnel.diagnosticUsers}
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              Events · {summary.funnel.diagnosticCount}
            </div>
          </div>

          <div
            className={`rounded-2xl border px-5 py-4 shadow-sm ${
              summary.funnel.highestValueCandidate?.toKey === "pilotSetup"
                ? "border-red-300 bg-red-50"
                : "border-neutral-200 bg-white"
            }`}
          >
            <div className="text-sm text-neutral-500">Pilot Setup</div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {summary.funnel.pilotSetupUsers}
            </div>
            <div className="mt-3 text-xs leading-5 text-neutral-500">
              {pathText(
                "Diagnostic",
                "Pilot Setup",
                summary.funnel.diagnosticUsers,
                summary.funnel.pilotSetupUsers
              )}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Events · {summary.funnel.pilotSetupCount}
            </div>
          </div>

          <div
            className={`rounded-2xl border px-5 py-4 shadow-sm ${
              summary.funnel.highestValueCandidate?.toKey === "pilot"
                ? "border-red-300 bg-red-50"
                : "border-neutral-200 bg-white"
            }`}
          >
            <div className="text-sm text-neutral-500">Pilot</div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {summary.funnel.pilotUsers}
            </div>
            <div className="mt-3 text-xs leading-5 text-neutral-500">
              {pathText(
                "Pilot Setup",
                "Pilot",
                summary.funnel.pilotSetupUsers,
                summary.funnel.pilotUsers
              )}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Events · {summary.funnel.pilotCount}
            </div>
          </div>
        
          <div
            className={`rounded-2xl border px-5 py-4 shadow-sm ${
              summary.funnel.highestValueCandidate?.toKey === "receipt"
                ? "border-red-300 bg-red-50"
                : "border-neutral-200 bg-white"
            }`}
          >
            <div className="text-sm text-neutral-500">Receipt</div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {summary.funnel.receiptUsers}
            </div>
            <div className="mt-3 text-xs leading-5 text-neutral-500">
              {pathText(
                "Pilot",
                "Receipt",
                summary.funnel.pilotUsers,
                summary.funnel.receiptUsers
              )}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Events · {summary.funnel.receiptCount}
            </div>
          </div>

        <div
          className={`rounded-2xl border px-5 py-4 shadow-sm ${
            summary.funnel.highestValueCandidate?.toKey === "verification"
              ? "border-red-300 bg-red-50"
              : "border-neutral-200 bg-white"
          }`}
        >
            <div className="text-sm text-neutral-500">Verification</div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {summary.funnel.verificationUsers}
            </div>
            <div className="mt-3 text-xs leading-5 text-neutral-500">
              {pathText(
                "Receipt",
                "Verification",
                summary.funnel.receiptUsers,
                summary.funnel.verificationUsers
              )}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Events · {summary.funnel.verificationCount}
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            Recent Event Stream
          </h2>
          <span className="text-sm text-neutral-500">
            Latest {items.length} items
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">

          {loading ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-sm text-neutral-500">
              Loading analytics...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-sm text-neutral-500">
              No event logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-sm text-neutral-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">Case</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const eventType = getEventType(item);

                    return (
                      <tr
                      key={`${index}-${item?.timestamp || "no-time"}`}
                      className="rounded-xl bg-neutral-50 text-sm text-neutral-800"
                    >
                      <td className="px-3 py-3 align-top">
                        {formatTime(item?.timestamp || item?.createdAt)}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700">
                          {eventType}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top">{getCaseId(item)}</td>
                      <td className="px-3 py-3 align-top">{getUserLabel(item) !== "—" ? getUserLabel(item) : getActorKey(item)}</td>
                      <td className="max-w-[360px] px-3 py-3 align-top text-neutral-600">
                        <div className="space-y-1 text-sm leading-6">
                          <div className="text-neutral-800">
                            {eventType === "pilot_setup_confirmed"
                              ? "User confirmed Pilot Setup"
                              : eventType === "trial_started"
                              ? "User started the 7-day trial"
                              : eventType === "pilot_workflow_selected"
                              ? "User selected a pilot workflow"
                              : eventType === "pilot_entered"
                              ? "User entered Pilot"
                              : eventType === "receipt_viewed"
                              ? "User viewed Receipt"
                              : eventType === "verification_viewed"
                              ? "User viewed Verification"
                              : eventType === "diagnostic_completed"
                              ? "User completed Diagnostic"
                              : `User triggered ${eventType}`}
                          </div>

                          {item.meta?.workflow ? (
                            <div className="text-neutral-500">
                              Workflow: {item.meta.workflow}
                            </div>
                          ) : null}

                          {item.meta?.selectedEventType ? (
                            <div className="text-neutral-500">
                              Intent: {item.meta.selectedEventType}
                            </div>
                          ) : null}

                         {item.meta?.weakestDimension ? (
                            <div className="text-neutral-500">
                              Weakest dimension: {item.meta.weakestDimension}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}