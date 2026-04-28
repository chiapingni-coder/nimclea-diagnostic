import React from "react";
import html2pdf from "html2pdf.js";
import { sanitizeText } from "../../lib/sanitizeText";
import { getWeakestDimensionDisplay } from "../../lib/customerDecisionDisplay";

export default function VerificationTraceBlock({
  caseData,
  events,
  correction,
  verificationHash,
  weakestDimension,
}) {
  const safeEvents = Array.isArray(events)
    ? events.filter((event) =>
        sanitizeText(
          event?.text ||
            event?.note ||
            event?.label ||
            event?.type ||
            event ||
            ""
        )
      )
    : [];

  const getEventText = (event) =>
    sanitizeText(
      event?.text ||
        event?.note ||
        event?.label ||
        event?.type?.replaceAll("_", " ") ||
        String(event || "")
    );

  const fallbackCorrection =
    "Minimal intervention or recovery path is derived from the weakest structural dimension.";

  return (
    <details className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60">
      <summary
        className="cursor-pointer px-5 py-2 text-sm font-medium text-slate-900"
        style={{ listStyle: "none" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-900">&gt;</span>
            <span>Supporting Evidence & Notes</span>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();

              const content = `
                <h2>Full Input Trace</h2>

                <h3>Case</h3>
                <p>${sanitizeText(caseData, "No case input attached.")}</p>

                <h3>Events</h3>
                <ul>
                  ${safeEvents
                    .map(
                      (item, index) =>
                        `<li>Event ${index + 1}: ${getEventText(item)}</li>`
                    )
                    .join("")}
                </ul>

                <h3>Corrections</h3>
                <p>${sanitizeText(correction, fallbackCorrection)}</p>

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
              Corrections
            </p>
            <p className="text-slate-700 leading-6">
              {sanitizeText(correction, fallbackCorrection)}
            </p>

            {weakestDimension && (
              <p className="mt-1 text-xs text-slate-400">
                Where it is weakest: {sanitizeText(getWeakestDimensionDisplay(weakestDimension))}
              </p>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
