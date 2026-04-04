import React from "react";

export default function StructurePathSection({ data }) {
  if (!data) return null;

  const {
    pattern,
    chain,
    stage,
    run,
    explanation,
    nextAction
  } = data;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Where You Are in the Structure</h2>

      <div style={styles.pathBox}>
        <div style={styles.pathRow}>
          <span style={styles.label}>Pattern</span>
          <span style={styles.value}>{pattern}</span>
        </div>

        <div style={styles.arrow}>↓</div>

        <div style={styles.pathRow}>
          <span style={styles.label}>Chain</span>
          <span style={styles.value}>{chain}</span>
        </div>

        <div style={styles.arrow}>↓</div>

        <div style={styles.pathRow}>
          <span style={styles.label}>Stage</span>
          <span style={styles.value}>{stage}</span>
        </div>

        <div style={styles.arrow}>↓</div>

        <div style={styles.pathRow}>
          <span style={styles.label}>RUN</span>
          <span style={styles.value}>{run}</span>
        </div>
      </div>

      <div style={styles.explanation}>
        {explanation}
      </div>

      <div style={styles.nextAction}>
        <strong>Next Step:</strong> {nextAction}
      </div>
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