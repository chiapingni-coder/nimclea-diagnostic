import React from "react";
import html2pdf from "html2pdf.js";

export default function VerificationTraceBlock({
  caseData,
  events,
  correction,
  verificationHash,
  weakestDimension,
}) {
  const safeEvents = Array.isArray(events)
    ? events.filter((e) =>
        String(e?.text || e?.note || e?.label || e?.type || e || "").trim()
      )
    : [];

  const getEventText = (event) =>
    event?.text ||
    event?.note ||
    event?.label ||
    event?.type?.replaceAll("_", " ") ||
    String(event || "");

  const displayHash =
    verificationHash && verificationHash !== "Unavailable"
      ? `${verificationHash.slice(0, 10)}…${verificationHash.slice(-6)}`
      : "Not available";

  return (
    <details className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60" open>
      <summary
        className="cursor-pointer px-5 py-2 text-sm font-medium text-slate-900"
        style={{ listStyle: "none" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-900">▶</span>
            <span>Full Input Trace</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const content = `
                <h2>Full Input Trace</h2>

                <h3>Case</h3>
                <p>${caseData || "No case input attached."}</p>
          
                <h3>Events</h3>
                <ul>
                  ${safeEvents
                    .map((event, index) => `<li>Event ${index + 1}: ${getEventText(event)}</li>`)
                    .join("")}
                </ul>

                <h3>Corrections</h3>
                <p>${correction || "Minimal intervention or recovery path is derived from the weakest structural dimension."}</p>

                <h3>Hash coverage</h3>
                <p>${verificationHash || "Not available"}</p>
              `;

              const element = document.createElement("div");
              element.innerHTML = content;

              html2pdf().from(element).save("nimclea-verification-input-trace.pdf");
            }}
            className="rounded-full border border-amber-300 bg-white px-3 py-[3px] text-[11px] font-normal text-slate-500 hover:bg-amber-50"
          >
            Export PDF
          </button>
        </div>
      </summary>

      <div
        className="border-t border-slate-100 px-5 pt-5 text-sm text-slate-700"
        style={{
          maxHeight: "320px",
          overflowY: "auto",
          paddingBottom: "20px",
        }}
      >
        <div className="space-y-5">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              Case
            </p>
            <p className="text-slate-900 leading-6">
              → {caseData || "No case input attached to this verification record."}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">
              Events
            </p>

            {safeEvents.length > 0 ? (
              <ul className="space-y-2">
                {safeEvents.slice(0, 5).map((event, index) => (
                  <li key={event?.id || index} className="text-slate-700 leading-6">
                    <span className="font-medium text-slate-900">
                      Event {index + 1}
                    </span>
                    <span className="text-slate-400"> · </span>
                    {getEventText(event)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                No structured events attached to this verification trace.
              </p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              Corrections
            </p>
            <p className="text-slate-700 leading-6">
              {correction ||
                "Minimal intervention or recovery path is derived from the weakest structural dimension."}
            </p>

            {weakestDimension && (
              <p className="mt-1 text-xs text-slate-400">
                Weakest dimension: {weakestDimension}
              </p>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}