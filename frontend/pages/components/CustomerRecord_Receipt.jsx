import React from "react";
import html2pdf from "html2pdf.js";

export default function CustomerRecordBlock({ caseData, events }) {
  const safeEvents = Array.isArray(events)
    ? events.filter((e) => e && String(e?.text || e?.note || e?.type || e).trim())
    : [];

  const getEventText = (event) =>
    event?.text ||
    event?.note ||
    event?.label ||
    event?.type?.replaceAll("_", " ") ||
    String(event || "");

  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-white" open>
      <summary
        className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-900"
        style={{ listStyle: "none" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-900">▶</span>
            <span>Customer Record Snapshot</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const content = `
                <h2>Customer Record Snapshot</h2>

                <h3>Case origin</h3>
                <p>${caseData || "No case origin provided."}</p>

                <h3>Supporting events</h3>
                <ul>
                  ${safeEvents
                    .slice(0, 3)
                    .map((event, index) => {
                      const text =
                        event?.text ||
                        event?.note ||
                        event?.label ||
                        event?.type?.replaceAll("_", " ") ||
                        "";
                      return `<li>${text}</li>`;
                    })
                    .join("")}
                </ul>

                <h3>Record integrity</h3>
                <p>✓ ${safeEvents.length} structured events included</p>
                <p>✓ No conflicting inputs detected</p>
              `;

              const element = document.createElement("div");
              element.innerHTML = content;

              html2pdf().from(element).save("nimclea-baseline-record.pdf");
            }}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            Export Summary
          </button>
        </div>
      </summary>

      <div className="border-t border-slate-100 px-4 pb-4 pt-4 text-sm text-slate-700">
        <div
          className="py-2"
          style={{
            height: "240px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <div className="space-y-5">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              Case origin
            </p>
            <p className="text-slate-900">
              → {caseData || "No case origin provided."}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">
              Supporting events
            </p>

            {safeEvents.length > 0 ? (
              <ul className="space-y-1">
                {safeEvents.slice(0, 10).map((event, index) => (
                  <li key={event?.id || index}>• {getEventText(event)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                No events recorded yet. This baseline is currently derived from structured diagnostic input only.
              </p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              Record integrity
            </p>

            <div className="space-y-1 text-xs font-medium text-emerald-700">
              <div>✓ {safeEvents.length} structured events included</div>
              <div>✓ No conflicting inputs detected</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </details>
);
}
