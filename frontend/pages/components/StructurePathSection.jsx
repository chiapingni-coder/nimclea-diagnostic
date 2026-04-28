import React from "react";
import {
  formatCustomerStructureValue,
  getCustomerStructureStatus,
} from "../../lib/customerStructureDisplay";
import { sanitizeText } from "../../lib/sanitizeText";
import { getStageDisplay } from "../../lib/stageMap";

export default function StructurePathSection({ data }) {
  if (!data) return null;

  const {
    pattern,
    chain,
    stage,
    runCode,
    explanation,
    nextAction,
    patternId,
    patternDescription,
    chainDescription,
    routeMeta,
  } = data;

  const customerSnapshot = {
    pattern,
    patternId,
    runCode,
    routeDecision: routeMeta?.routeDecision || routeMeta?.mode,
  };

  const stageInfo = getStageDisplay(stage);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Where You Are in the Structure</h2>

      <div style={styles.pathBox}>
        <div style={styles.pathBlock}>
          <div style={styles.pathRow}>
            <span style={styles.label}>Pattern</span>
            <span style={styles.value}>
              {formatCustomerStructureValue(pattern)}
            </span>
          </div>

          {patternDescription ? (
            <div style={styles.metaText}>{sanitizeText(patternDescription)}</div>
          ) : null}
        </div>

        <div style={styles.arrow}>-&gt;</div>

        <div style={styles.pathBlock}>
          <div style={styles.pathRow}>
            <span style={styles.label}>Chain</span>
            <span style={styles.value}>
              {formatCustomerStructureValue(chain, "Structure path")}
            </span>
          </div>

          {chainDescription ? (
            <div style={styles.metaText}>{sanitizeText(chainDescription)}</div>
          ) : null}
        </div>

        <div style={styles.arrow}>-&gt;</div>

        <div style={styles.pathBlock}>
          <div style={styles.pathRow}>
            <span style={styles.label}>Stage</span>
            <span style={styles.value}>
              {stageInfo.label}
            </span>
          </div>

          {stageInfo.description ? (
            <div style={styles.metaText}>
              {sanitizeText(stageInfo.description)}
            </div>
          ) : null}
        </div>

        <div style={styles.arrow}>-&gt;</div>

        <div style={styles.pathBlock}>
          <div style={styles.pathRow}>
            <span style={styles.label}>Status</span>
            <span style={styles.value}>
              {getCustomerStructureStatus(customerSnapshot)}
            </span>
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
          {sanitizeText(explanation)}
        </div>
      ) : null}

      {nextAction ? (
        <div style={styles.nextAction}>
          <strong>Next Step:</strong> {sanitizeText(nextAction)}
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
    backgroundColor: "#fafafa",
  },
  title: {
    fontSize: "20px",
    marginBottom: "16px",
  },
  pathBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "16px",
  },
  pathRow: {
    display: "flex",
    justifyContent: "space-between",
    width: "260px",
    padding: "6px 0",
  },
  pathBlock: {
    width: "260px",
    padding: "8px 0",
  },
  metaText: {
    marginTop: "6px",
    fontSize: "13px",
    lineHeight: "1.5",
    color: "#475569",
  },
  actionRow: {
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
  },
  runHint: {
    fontSize: "12px",
    color: "#64748b",
  },
  label: {
    color: "#888",
  },
  value: {
    fontWeight: "600",
    textAlign: "right",
  },
  arrow: {
    fontSize: "14px",
    color: "#bbb",
  },
  explanation: {
    marginTop: "12px",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  nextAction: {
    marginTop: "12px",
    fontSize: "15px",
    color: "#111",
  },
};
