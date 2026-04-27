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
        className="px-4 py-1.5 text-sm rounded-full bg-[#FFF7CC] text-[#8A6D1F] border border-[#F3D36B] hover:bg-[#FFEFA3] transition"
      >
        {children}
      </button>
    </div>
  );
}
