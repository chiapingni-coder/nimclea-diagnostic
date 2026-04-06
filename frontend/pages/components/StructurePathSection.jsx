import React from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes.js";

export default function StructurePathSection({ data }) {
  const navigate = useNavigate();

  if (!data) return null;

function getRunActionLabel() {
  return "Start My 7-Day Pilot →";
}

  const {
    pattern,
    chain,
    stage,
    runCode,
    explanation,
    nextAction,
    patternId,
    chainId,
    patternDescription,
    chainDescription,
    routeMeta
  } = data;

  const actionLabel = getRunActionLabel(runCode, stage);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Where You Are in the Structure</h2>

      <div style={styles.pathBox}>
        <div style={styles.pathBlock}>
          <div style={styles.pathRow}>
            <span style={styles.label}>Pattern</span>
            <span style={styles.value}>{pattern || "—"}</span>
          </div>

          {patternId ? (
            <div style={styles.metaId}>{patternId}</div>
          ) : null}

          {patternDescription ? (
            <div style={styles.metaText}>{patternDescription}</div>
          ) : null}
        </div>

        <div style={styles.arrow}>↓</div>

        <div style={styles.pathBlock}>
          <div style={styles.pathRow}>
            <span style={styles.label}>Chain</span>
            <span style={styles.value}>{chain || "—"}</span>
          </div>

          {chainId ? (
            <div style={styles.metaId}>{chainId}</div>
          ) : null}

          {chainDescription ? (
            <div style={styles.metaText}>{chainDescription}</div>
          ) : null}
        </div>

        <div style={styles.arrow}>↓</div>

        <div style={styles.pathRow}>
          <span style={styles.label}>Stage</span>
          <span style={styles.value}>{stage || "—"}</span>
        </div>

        <div style={styles.arrow}>↓</div>

        <div style={styles.pathBlock}>
          <div style={styles.pathRow}>
            <span style={styles.label}>RUN</span>
            <span style={styles.value}>{runCode || "—"}</span>
          </div>

          <div style={styles.actionRow}>
            <span style={styles.runHint}>
              This is the path your pilot will test.
            </span>
          </div>
        </div>
      </div>

      {explanation ? (
        <div style={styles.explanation}>
          {explanation}
        </div>
      ) : null}

      {nextAction ? (
        <div style={styles.nextAction}>
          <strong>Next Step:</strong> {nextAction}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    marginBottom: "24px",
    border: "1px solid #eee",
    borderRadius: "12px",
    backgroundColor: "#fafafa"
  },
  title: {
    fontSize: "20px",
    marginBottom: "16px"
  },
  pathBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "16px"
  },
  pathRow: {
    display: "flex",
    justifyContent: "space-between",
    width: "260px",
    padding: "6px 0"
  },
  pathBlock: {
  width: "260px",
  padding: "8px 0"
  },
metaId: {
  marginTop: "2px",
  fontSize: "11px",
  fontWeight: "600",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.08em"
},
metaText: {
  marginTop: "6px",
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#475569"
},
actionRow: {
  marginTop: "8px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "6px"
},
actionButton: {
  border: "none",
  borderRadius: "10px",
  backgroundColor: "#0f172a",
  color: "#fff",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer"
},
runHint: {
  fontSize: "12px",
  color: "#64748b"
},
  label: {
    color: "#888"
  },
  value: {
    fontWeight: "600"
  },
  arrow: {
    fontSize: "14px",
    color: "#bbb"
  },
  explanation: {
    marginTop: "12px",
    fontSize: "14px",
    lineHeight: "1.6"
  },
  nextAction: {
    marginTop: "12px",
    fontSize: "15px",
    color: "#111"
  }
};