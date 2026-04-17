import React from "react";
import ROUTES from "../routes";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { logEvent } from "../utils/eventLogger";

export default function Homepage() {
  useEffect(() => {
  logEvent("homepage_viewed");
}, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f7fb",
        padding: "40px 24px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          margin: "0 auto"
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "40px 28px",
            boxShadow: "0 12px 40px rgba(19, 28, 45, 0.08)"
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#58657a",
              marginBottom: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.08em"
            }}
          >
            Nimclea Diagnostic
          </div>

          <h1
            style={{
              fontSize: "40px",
              lineHeight: 1.15,
              margin: "0 0 16px",
              color: "#142033"
            }}
          >
            Find where your decision path will fail—and fix it before it does
          </h1>

          <p
            style={{
              maxWidth: "760px",
              fontSize: "18px",
              lineHeight: 1.7,
              color: "#314156",
              margin: "0 0 18px"
            }}
          >
            A 3-minute diagnostic that shows where your structure fails, what it affects, and what to do next.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#6b7789",
              margin: "0 0 24px"
            }}
          >
            No prep required • Takes ~3 minutes • One clear next step
          </p>

          <Link
            to={ROUTES.DIAGNOSTIC}
            state={{
              pcMeta: {
                pc_id: "PC-001",
                pc_name: "Decision Risk Diagnostic"
              }
            }}
            style={{
              display: "inline-block",
              padding: "12px 18px",
              background: "#142033",
              color: "#fff",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: 700
            }}
          >
            Find My Structural Risk →
          </Link>
        </div>

        <section
          style={{
            marginTop: "24px",
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "22px",
              border: "1px solid #e6ebf2"
            }}
          >
            <h3
              style={{
                margin: "0 0 10px",
                fontSize: "18px",
                color: "#142033"
              }}
            >
              What you’ll get in 3 minutes
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: 1.7,
                color: "#5b677a"
              }}
            >
              A clear structural result showing where the current decision path creates friction, ambiguity, or weak traceability.
            </p>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "22px",
              border: "1px solid #e6ebf2"
            }}
          >
            <h3
              style={{
                margin: "0 0 10px",
                fontSize: "18px",
                color: "#142033"
              }}
            >
              A recommended next step
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: 1.7,
                color: "#5b677a"
              }}
            >
              Understand whether the right move is to stabilize, clarify, or test the path in action.
            </p>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "22px",
              border: "1px solid #e6ebf2"
            }}
          >
            <h3
              style={{
                margin: "0 0 10px",
                fontSize: "18px",
                color: "#142033"
              }}
            >
              A 7-day pilot entry point
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: 1.7,
                color: "#5b677a"
              }}
            >
              Move into one controlled pilot without committing to a full rollout.
            </p>
          </div>
        </section>

        <section
          style={{
            marginTop: "20px",
            maxWidth: "760px",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "22px",
            border: "1px solid #e6ebf2"
          }}
        >
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: "16px",
              color: "#142033"
            }}
          >
            This is not a scorecard
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: 1.7,
              color: "#5b677a"
            }}
          >
            This diagnostic does not rate your organization with a generic score. It identifies where the current decision path becomes harder to execute, explain, or verify.
          </p>
        </section>
      </div>
    </div>
  );
}