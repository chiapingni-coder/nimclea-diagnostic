import React from "react";
import { routeInput } from "../lib/inputRouter";
import { addCaseEvent } from "../utils/caseRegistry.js";

export default function EventCaptureBox({ caseId }) {
  const [text, setText] = React.useState("");
  const [hint, setHint] = React.useState("");

  function handleCaptureEvent() {
    const route = routeInput(text);

    if (route?.type !== "event") {
      setHint("This input may not be a clear event");
      console.log("[EventCaptureBox] Input route:", route);
      return;
    }

    const eventPayload = {
      id: `event_${Date.now()}`,
      caseId,
      type: "manual_event",
      text,
      routeType: route?.type || "",
      routeReason: route?.reason || "",
      routeConfidence: route?.confidence || 0,
      createdAt: new Date().toISOString(),
    };

    const updatedCase = addCaseEvent(caseId, eventPayload);
    console.log("[EventCaptureBox] Event captured:", eventPayload);
    console.log("[EventCaptureBox] Case updated:", updatedCase);
    setHint("");
    setText("");
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #CBD5E1",
          borderRadius: "12px",
          padding: "10px 12px",
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      />
      <button
        type="button"
        onClick={handleCaptureEvent}
        style={{
          marginTop: "10px",
          border: "1px solid #CBD5E1",
          background: "#0F172A",
          color: "#FFFFFF",
          borderRadius: "999px",
          padding: "8px 14px",
          fontSize: "13px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Capture Event
      </button>
      {hint ? (
        <p
          style={{
            margin: "8px 0 0 0",
            color: "#92400E",
            fontSize: "13px",
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
