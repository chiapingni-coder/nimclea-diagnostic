import React from "react";
import ROUTES from "../routes";
import { Link } from "react-router-dom";

export default function Homepage() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>Nimclea Diagnostic</h1>
      <p>Start your decision analysis.</p>

      <Link
        to={ROUTES.DIAGNOSTIC}
        style={{
          display: "inline-block",
          marginTop: "12px",
          padding: "10px 16px",
          background: "#142033",
          color: "#fff",
          borderRadius: "10px",
          textDecoration: "none",
          fontWeight: 700
        }}
      >
        Start Diagnostic
      </Link>
    </div>
  );
}