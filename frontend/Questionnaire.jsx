import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import questions, { coreQuestions, branchQuestionMap } from "./questions.js";
import { getRoutingResultFromCoreAnswers } from "./routingLogic";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const PHASE = {
  LANDING: "landing",
  CORE: "core",
  ROUTING_FEEDBACK: "routing_feedback",
  BRANCH: "branch",
  SUBMITTING: "submitting",
  DONE: "done"
};

function buildInitialAnswers(questionList) {
  const result = {};
  for (const question of questionList) {
    result[question.id] = question.type === "multi_select" ? [] : "";
  }
  return result;
}

function buildPayloadAnswers(questionList, answers) {
  const payload = {};

  for (const question of questionList) {
    const rawValue = answers[question.id];

    if (question.type === "multi_select") {
      payload[question.id] = Array.isArray(rawValue) ? rawValue : [];
    } else {
      payload[question.id] = typeof rawValue === "string" ? rawValue : "";
    }
  }

  return payload;
}

function isQuestionAnswered(question, value) {
  if (question.type === "multi_select") {
    return Array.isArray(value) && value.length > 0;
  }
  return typeof value === "string" && value.trim() !== "";
}

function formatSectionLabel(question, index) {
  if (!question) return "";
  if (question.sectionLabel) return question.sectionLabel;
  return `Question Group ${index + 1}`;
}

function buildRoutingFeedbackViewModel(routingResult, activeBranchQuestions = []) {
  const scenarioTitle =
    routingResult?.scenarioTitle ||
    "Initial diagnostic path identified";

  const strongestSignalsRaw = Array.isArray(routingResult?.strongestSignals)
    ? routingResult.strongestSignals
    : [];

  const strongestSignals = strongestSignalsRaw.slice(0, 2).map((signal, index) => {
    if (typeof signal === "string") {
      return {
        code: `signal-${index + 1}`,
        label: signal,
        shortText: ""
      };
    }

    return {
      code: signal?.code || `signal-${index + 1}`,
      label: signal?.label || "Structural signal",
      shortText: signal?.shortText || ""
    };
  });

  return {
    scenarioTitle,
    explanation:
      routingResult?.explanation ||
      "Based on your first 9 answers, we identified the most likely diagnostic direction.",
    validationNote:
      routingResult?.validationNote ||
      `The next ${activeBranchQuestions.length || 2} follow-up questions help validate and sharpen this initial result before the final preview.`,
    strongestSignals,
    ctaPrimary: "Continue validation",
    ctaSecondary: "Back to Question 9"
  };
}

function QuestionCard({
  question,
  value,
  stepLabel,
  sectionLabel,
  onSingleSelect,
  onMultiSelect,
  onBack,
  onNext,
  submitLabel,
  canProceed,
  isSubmitting
}) {
  return (
    <div style={styles.card}>
      <div style={styles.progressRow}>
        <span style={styles.progressText}>{stepLabel}</span>
      </div>

      <div style={styles.sectionTag}>{sectionLabel}</div>

      <h2 style={styles.questionTitle}>{question.prompt}</h2>

      {question.example ? (
        <div style={styles.exampleHint}>{question.example}</div>
      ) : null}

      <div style={styles.optionsWrap}>
        {question.options.map((option) => {
          const checked =
            question.type === "multi_select"
              ? Array.isArray(value) && value.includes(option.value)
              : value === option.value;

          return (
            <label key={option.value} style={styles.optionCard}>
              <input
                type={question.type === "multi_select" ? "checkbox" : "radio"}
                name={question.id}
                value={option.value}
                checked={checked}
                onChange={() => {
                  if (question.type === "multi_select") {
                    onMultiSelect(question, option);
                  } else {
                    onSingleSelect(question.id, option.value);
                  }
                }}
                style={styles.optionInput}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>

      <div style={styles.navRow}>
        <button
          type="button"
          onClick={onBack}
          style={{
            ...styles.secondaryButton,
            opacity: isSubmitting ? 0.5 : 1,
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
          disabled={isSubmitting}
        >
          Back
        </button>

        <button
          type="button"
          onClick={onNext}
          style={{
            ...styles.primaryButton,
            opacity: !canProceed || isSubmitting ? 0.5 : 1,
            cursor: !canProceed || isSubmitting ? "not-allowed" : "pointer"
          }}
          disabled={!canProceed || isSubmitting}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export default function Questionnaire() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState(PHASE.LANDING);
  const [answers, setAnswers] = useState(() => buildInitialAnswers(questions));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [activeBranchKey, setActiveBranchKey] = useState("");
  const [activeBranchQuestions, setActiveBranchQuestions] = useState([]);
  const [routingResult, setRoutingResult] = useState(null);

const currentQuestions =
  phase === PHASE.CORE
    ? coreQuestions
    : phase === PHASE.BRANCH
      ? activeBranchQuestions
      : [];

const currentQuestion = currentQuestions?.[currentQuestionIndex] ?? null;
const isLastCurrentQuestion =
  currentQuestions.length > 0 &&
  currentQuestionIndex === currentQuestions.length - 1;
const routingFeedbackViewModel = buildRoutingFeedbackViewModel(
  routingResult,
  activeBranchQuestions
);

  function updateSingleSelect(questionId, selectedValue) {
    console.log("👉 SELECT:", questionId, selectedValue);

    setAnswers((prev) => {
      const next = {
        ...prev,
        [questionId]: selectedValue
      };

      console.log("🔥 ANSWERS AFTER SELECT:", next);

      return next;
   });
  }

  function updateMultiSelect(question, option) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[question.id]) ? prev[question.id] : [];
      const isSelected = current.includes(option.value);
      const exclusiveOption = question.options.find((item) => item.exclusive);
      const exclusiveValue = exclusiveOption?.value;

      let next = current;

      if (option.exclusive) {
        next = isSelected ? [] : [option.value];
      } else {
        const withoutExclusive = exclusiveValue
          ? current.filter((item) => item !== exclusiveValue)
          : [...current];

        if (isSelected) {
          next = withoutExclusive.filter((item) => item !== option.value);
        } else {
          next = [...withoutExclusive, option.value];
        }
      }

      return {
        ...prev,
        [question.id]: next
      };
    });
  }

function clearDiagnosticStorage() {
  Object.keys(localStorage)
    .filter(
      (key) =>
        key.startsWith("nimclea_result") ||
        key.startsWith("nimclea_preview_result") ||
        key === "nimclea_session_id"
    )
    .forEach((key) => {
      localStorage.removeItem(key);
    });
}

function resetDiagnostic() {
  clearDiagnosticStorage();
  submittingRef.current = false;
  setAnswers(buildInitialAnswers(questions));
  setCurrentQuestionIndex(0);
  setSubmitError("");
  setIsSubmitting(false);
  setActiveBranchKey("");
  setActiveBranchQuestions([]);
  setPhase(PHASE.LANDING);
  setRoutingResult(null);
}

function startDiagnostic() {
  clearDiagnosticStorage();
  submittingRef.current = false;
  setAnswers(buildInitialAnswers(questions));
  setSubmitError("");
  setIsSubmitting(false);
  setActiveBranchKey("");
  setActiveBranchQuestions([]);
  setCurrentQuestionIndex(0);
  setPhase(PHASE.CORE);
  setRoutingResult(null);
}

function handleCoreBack() {
  setSubmitError("");

  if (currentQuestionIndex === 0) {
    setPhase(PHASE.LANDING);
    return;
  }

  setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
}

function handleBranchBack() {
  setSubmitError("");

  if (currentQuestionIndex === 0) {
    setActiveBranchKey("");
    setActiveBranchQuestions([]);
    setRoutingResult(null);
    setPhase(PHASE.CORE);
    setCurrentQuestionIndex(coreQuestions.length - 1);
    return;
  }

  setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
}

function handleRoutingFeedbackNext() {
  setSubmitError("");
  setCurrentQuestionIndex(0);
  setPhase(PHASE.BRANCH);
}

function getSubmitLabel() {
  if (phase === PHASE.SUBMITTING) return "Submitting...";
  if (phase === PHASE.CORE && isLastCurrentQuestion) return "Next";
  if (phase === PHASE.BRANCH && isLastCurrentQuestion) return "See Result";
  return "Next";
}

async function handleNext() {
  console.log("👉 CURRENT VALUE:", currentQuestion?.id, answers[currentQuestion?.id]);
  console.log("👉 handleNext triggered", {
    phase,
    currentQuestionIndex,
    total:
      phase === PHASE.CORE
        ? coreQuestions.length
        : activeBranchQuestions.length
  });

  if (!currentQuestion) return;
  if (phase === PHASE.SUBMITTING || phase === PHASE.DONE) return;

  setSubmitError("");

  const currentValue = answers[currentQuestion.id];
  if (!isQuestionAnswered(currentQuestion, currentValue)) return;

  // CORE 非最后一题
  if (phase === PHASE.CORE && !isLastCurrentQuestion) {
    setCurrentQuestionIndex((prev) => prev + 1);
    return;
  }

  // CORE 最后一题（Q9）→ 做 routing，进入 BRANCH
if (phase === PHASE.CORE && isLastCurrentQuestion) {
  const result = getRoutingResultFromCoreAnswers(answers);
  const nextBranchKey = result?.branchKey || result?.branch || "";
  const nextBranchQuestions = branchQuestionMap?.[nextBranchKey] ?? [];

  if (!nextBranchKey || nextBranchQuestions.length === 0) {
    setSubmitError("Routing failed: branch not found.");
    return;
  }

  setRoutingResult(result);
  setActiveBranchKey(nextBranchKey);
  setActiveBranchQuestions(nextBranchQuestions);
  setCurrentQuestionIndex(0);
  setPhase(PHASE.ROUTING_FEEDBACK);
  return;
}

  // BRANCH 非最后一题
  if (phase === PHASE.BRANCH && !isLastCurrentQuestion) {
    setCurrentQuestionIndex((prev) => prev + 1);
    return;
  }

console.log("🧪 isLastCurrentQuestion =", isLastCurrentQuestion, {
  phase,
  index: currentQuestionIndex,
  total: activeBranchQuestions.length
});

  // BRANCH 最后一题 → 提交
  if (phase === PHASE.BRANCH && isLastCurrentQuestion) {
    console.log("🔥 about to submit");
    await submitDiagnostic();
  }
}

  async function submitDiagnostic() {
    if (submittingRef.current || isSubmitting || phase === PHASE.DONE) {
      return null;
    }

    const previousPhase = phase;

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");
    setPhase(PHASE.SUBMITTING);

    try {
      const includedQuestions = [...coreQuestions, ...activeBranchQuestions];
      const payloadAnswers = buildPayloadAnswers(includedQuestions, answers);

      // 🧹 清理旧 preview + session
      clearDiagnosticStorage();
      const response = await fetch(`${API_BASE_URL}/diagnostic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          answers: payloadAnswers
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const detailMessage = Array.isArray(data?.details)
          ? data.details
              .map((item) => item.message || JSON.stringify(item))
              .join(" | ")
          : typeof data?.details === "string"
            ? data.details
            : data?.details && typeof data.details === "object"
              ? JSON.stringify(data.details)
              : data?.error || "Failed to generate diagnostic preview.";

        throw new Error(detailMessage);
      }

      const result = data || null;
      const preview = result?.preview || null;
      const scenario = result?.scenario || null;

      const returnedSessionId =
        result?.session_id ||
        result?.sessionId ||
        result?.id ||
        "";

      const sessionId = returnedSessionId || "";

      if (!preview) {
        throw new Error("Preview payload is missing.");
      }

      try {
        localStorage.setItem("nimclea_result", JSON.stringify(result));
        localStorage.setItem("nimclea_preview_result", JSON.stringify(preview));

        if (sessionId) {
          localStorage.setItem("nimclea_session_id", sessionId);
          localStorage.setItem(
            `nimclea_result_${sessionId}`,
            JSON.stringify(result)
          );
          localStorage.setItem(
            `nimclea_preview_result_${sessionId}`,
            JSON.stringify(preview)
          );
        }
      } catch (storageError) {
        console.error("localStorage write error:", storageError);
      }

      const resultUrl = sessionId
        ? `/result?session_id=${encodeURIComponent(sessionId)}`
        : "/result";

      console.log("🔥 SAVED RESULT:", result);
      console.log("🔥 SAVED PREVIEW:", preview);
      console.log("🔥 SAVED SCENARIO:", scenario);

      setPhase(PHASE.DONE);

      navigate(resultUrl, {
        state: {
          session_id: sessionId,
          result
        }
      });

      return result;
      } catch (error) {
        console.error("submitDiagnostic error:", error);
        setSubmitError(error.message || "Something went wrong.");
        setPhase(previousPhase);
        return null;
      } finally {
        setIsSubmitting(false);
        submittingRef.current = false;
      }
    }

  if (phase === PHASE.LANDING) {
    return (
      <div style={styles.shell}>
        <div style={styles.heroCard}>
          <div style={styles.kicker}>Nimclea Diagnostic</div>
          <h1 style={styles.heroTitle}>3-Minute Responsibility Diagnostic</h1>
          <p style={styles.heroSubtitle}>
            Understand how resilient your audit, compliance, or evidence chain really is in about 3 minutes.
          </p>
          <p style={styles.heroText}>
            Answer a few quick questions and receive a one-page structural diagnostic preview.
            After the preview, you can apply for a 14-day pilot to test Nimclea with your real workflow.
          </p>
          <button type="button" style={styles.primaryButton} onClick={startDiagnostic}>
            Start the Diagnostic
          </button>
          <div style={styles.microcopy}>Takes about 3 minutes • No preparation needed</div>
        </div>
      </div>
    );
  }

  if (phase === PHASE.SUBMITTING) {
    return (
      <div style={styles.shell}>
        <div style={styles.card}>
          <div style={styles.questionTitle}>Submitting diagnostic...</div>
          <div style={styles.exampleHint}>
            Please wait while we generate your preview.
          </div>
          {submitError ? <div style={styles.errorText}>{submitError}</div> : null}
        </div>
      </div>
    );
  }

if (phase === PHASE.ROUTING_FEEDBACK) {
  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <div style={styles.sectionTag}>Initial Diagnostic Ready</div>

        <div style={styles.questionTitle}>
          {routingFeedbackViewModel.scenarioTitle}
        </div>

        <div style={styles.exampleHint}>
          {routingFeedbackViewModel.explanation}
        </div>

        <div style={styles.routingBlock}>
          <div style={styles.routingBlockTitle}>What stands out so far</div>

 {routingFeedbackViewModel.strongestSignals.length > 0 ? (
  <ul style={styles.signalList}>
    {routingFeedbackViewModel.strongestSignals.map((signal) => (
      <li key={signal.code} style={styles.signalListItem}>
        <strong>{signal.label}</strong>
        {signal.shortText ? `: ${signal.shortText}` : ""}
      </li>
    ))}
  </ul>
) : (
  <div style={styles.exampleHint}>
    No dominant structural signals were identified yet.
  </div>
)}
        </div>

        <div style={styles.exampleHint}>
          {routingFeedbackViewModel.validationNote}
        </div>

        <div style={styles.exampleHint}>
          Follow-up questions selected: {activeBranchQuestions.length}
        </div>

        {submitError ? <div style={styles.errorText}>{submitError}</div> : null}

        <div style={styles.navRow}>
          <button
            type="button"
            onClick={() => {
              setPhase(PHASE.CORE);
              setCurrentQuestionIndex(coreQuestions.length - 1);
            }}
            style={styles.secondaryButton}
          >
            {routingFeedbackViewModel.ctaSecondary}
          </button>

          <button
            type="button"
            onClick={handleRoutingFeedbackNext}
            style={styles.primaryButton}
          >
            {routingFeedbackViewModel.ctaPrimary}
          </button>
        </div>
      </div>
    </div>
  );
}

  if (phase === PHASE.BRANCH) {
    if (!currentQuestion) {
      return (
        <div style={styles.shell}>
          <div style={styles.card}>
            <div style={styles.errorText}>
              Branch question is unavailable. Please restart the diagnostic.
            </div>
            <div style={{ marginTop: "16px" }}>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={startDiagnostic}
              >
                Restart Diagnostic
              </button>
            </div>
          </div>
        </div>
      );
    }

    const value = answers[currentQuestion.id];
    const stepLabel = `Branch Question ${currentQuestionIndex + 1} of ${activeBranchQuestions.length}`;

    return (
      <div style={styles.shell}>
        <QuestionCard
          question={currentQuestion}
          value={value}
          stepLabel={stepLabel}
          sectionLabel={formatSectionLabel(currentQuestion, currentQuestionIndex)}
          onSingleSelect={updateSingleSelect}
          onMultiSelect={updateMultiSelect}
          onBack={handleBranchBack}
          onNext={handleNext}
          submitLabel={getSubmitLabel()}
          canProceed={isQuestionAnswered(currentQuestion, value)}
          isSubmitting={isSubmitting || phase === PHASE.SUBMITTING}
        />
        {submitError ? <div style={styles.errorText}>{submitError}</div> : null}
      </div>
    );
  }

  if (phase === PHASE.CORE) {
    if (!currentQuestion) {
      return (
        <div style={styles.shell}>
          <div style={styles.card}>
            <div style={styles.errorText}>
              Core question is unavailable. Please restart the diagnostic.
            </div>
            <div style={{ marginTop: "16px" }}>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={startDiagnostic}
              >
                Restart Diagnostic
              </button>
            </div>
          </div>
        </div>
      );
    }

    const value = answers[currentQuestion.id];
    const stepLabel = `Question ${currentQuestionIndex + 1} of ${coreQuestions.length}`;

    return (
      <div style={styles.shell}>
        <QuestionCard
          question={currentQuestion}
          value={value}
          stepLabel={stepLabel}
          sectionLabel={formatSectionLabel(currentQuestion, currentQuestionIndex)}
          onSingleSelect={updateSingleSelect}
          onMultiSelect={updateMultiSelect}
          onBack={handleCoreBack}
          onNext={handleNext}
          submitLabel={getSubmitLabel()}
          canProceed={isQuestionAnswered(currentQuestion, value)}
          isSubmitting={isSubmitting || phase === PHASE.SUBMITTING}
        />
        {submitError ? <div style={styles.errorText}>{submitError}</div> : null}
      </div>
    );
  }

    return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <div style={styles.errorText}>
          Questionnaire state is unavailable. Please restart the diagnostic.
        </div>
        <div style={{ marginTop: "16px" }}>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={startDiagnostic}
          >
            Restart Diagnostic
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    background: "#f6f7fb",
    padding: "32px 16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    boxSizing: "border-box"
  },
  heroCard: {
    width: "100%",
    maxWidth: "760px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "40px 28px",
    boxShadow: "0 12px 40px rgba(19, 28, 45, 0.08)",
    boxSizing: "border-box"
  },
  kicker: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#58657a",
    marginBottom: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.08em"
  },
  heroTitle: {
    fontSize: "36px",
    lineHeight: 1.15,
    margin: "0 0 14px",
    color: "#142033"
  },
  heroSubtitle: {
    fontSize: "18px",
    lineHeight: 1.6,
    color: "#314156",
    margin: "0 0 14px"
  },
  heroText: {
    fontSize: "16px",
    lineHeight: 1.7,
    color: "#516074",
    margin: "0 0 24px"
  },
  microcopy: {
    marginTop: "14px",
    fontSize: "14px",
    color: "#6b7789"
  },
  card: {
    width: "100%",
    maxWidth: "760px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 12px 40px rgba(19, 28, 45, 0.08)",
    boxSizing: "border-box"
  },
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  progressText: {
    fontSize: "14px",
    color: "#68768b",
    fontWeight: 600
  },
  sectionTag: {
    display: "inline-block",
    fontSize: "12px",
    color: "#44536a",
    background: "#eef2f8",
    borderRadius: "999px",
    padding: "8px 12px",
    marginBottom: "18px",
    fontWeight: 600
  },
  questionTitle: {
    fontSize: "28px",
    lineHeight: 1.3,
    color: "#142033",
    margin: "0 0 14px"
  },
  exampleHint: {
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#6a7689",
    background: "#f8fafc",
    border: "1px solid #e6ebf2",
    borderRadius: "14px",
    padding: "12px 14px",
    marginBottom: "20px"
  },
  optionsWrap: {
    display: "grid",
    gap: "12px",
    marginBottom: "24px"
  },
  optionCard: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    border: "1px solid #d8e0eb",
    borderRadius: "16px",
    padding: "16px 18px",
    background: "#fff",
    cursor: "pointer",
    color: "#1d2a3d",
    lineHeight: 1.5
  },
  optionInput: {
    marginTop: "3px",
    transform: "scale(1.15)"
  },
  navRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap"
  },
  primaryButton: {
    background: "#142033",
    color: "#ffffff",
    border: "none",
    borderRadius: "14px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    opacity: 1
  },
  secondaryButton: {
    background: "#ffffff",
    color: "#1f2b3d",
    border: "1px solid #ced7e4",
    borderRadius: "14px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    opacity: 1
  },
  errorText: {
    marginTop: "14px",
    color: "#b42318",
    fontSize: "14px",
    fontWeight: 600
  },
  signalList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#314156",
    lineHeight: 1.7
  },
signalListItem: {
  marginBottom: "8px"
},

routingBlock: {
  marginBottom: "20px",
  padding: "16px 18px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e6ebf2"
},

routingBlockTitle: {
  fontSize: "14px",
  fontWeight: 700,
  color: "#142033",
  marginBottom: "10px"
}

};