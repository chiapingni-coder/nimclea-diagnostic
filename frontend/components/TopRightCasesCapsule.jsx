import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAllCases } from "../utils/caseRegistry.js";

export default function TopRightCasesCapsule({
  children = "View all cases",
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isPilotRoute =
    location.pathname === "/pilot" || location.pathname.startsWith("/pilot/");

  if (location.pathname === "/cases") {
    return null;
  }

  let cases = [];

  try {
    cases = getAllCases?.() || [];
  } catch {
    cases = [];
  }

  const validCases = Array.isArray(cases)
    ? cases.filter((item) => item?.caseId || item?.id)
    : [];

  if (!isPilotRoute && validCases.length < 1) {
    return null;
  }

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: "16px",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/cases")}
        className="inline-flex items-center justify-center whitespace-nowrap px-4 py-1.5 text-xs font-semibold rounded-full bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 transition"
        style={{
          minWidth: "116px",
          height: "28px",
          lineHeight: "1",
        }}
      >
        {children}
      </button>
    </div>
  );
}
