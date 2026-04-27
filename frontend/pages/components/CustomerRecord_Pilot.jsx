import React from "react";

export default function CustomerRecordBlock({ caseData, events }) {
  console.log("events length =", events?.length);
  const getEventText = (event) =>
    event?.text ||
    event?.note ||
    event?.label ||
    event?.type?.replaceAll?.("_", " ") ||
    "";

  const safeEvents = Array.isArray(events) ? events : [];

  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-white">
      <summary
        className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-900"
        style={{ listStyle: "none" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-900">▶</span>
            <span>What you submitted</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const lines = [
                "What you submitted",
                "",
                "[Case Summary]",
                "You described:",
                `→ “${caseData || ""}”`,
                "",
                "[Captured Events]",
                ...safeEvents.map((event, index) => {
                  const timeText = event?.time
                    ? new Date(event.time).toLocaleString()
                    : "No timestamp";
      
                  return `Event ${index + 1} — ${timeText}\n“${getEventText(event)}”`;
                }),
              ];
      
              const blob = new Blob([lines.join("\n\n")], {
                type: "text/plain;charset=utf-8",
              });
      
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
      
              a.href = url;
              a.download = "nimclea-draft-record.txt";
              a.click();
      
              URL.revokeObjectURL(url);
            }}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            Export Summary
          </button>
        </div>
      </summary>

      <div className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm text-slate-700">
        <div
          className="px-1 py-2"
          style={{
            height: "360px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <div className="space-y-5">
            {caseData && (
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Case Summary
                </p>
                <p className="mt-1 text-slate-900">You described:</p>
                <p
                  className="mt-1 italic text-slate-700"
                  style={{
                    lineHeight: "1.45",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  → “{caseData}”
                </p>
              </div>
            )}
      
            {safeEvents.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Captured Events
                </p>
      
                <div className="mt-2 space-y-3">
                  {safeEvents.map((e, i) => (
                    <div key={i} className="text-sm">
                      <p className="text-xs text-slate-500">
                        Event {i + 1}
                        {e?.time && (
                          <span className="ml-2 text-slate-400">
                            · {new Date(e.time).toLocaleString()}
                          </span>
                        )}
                      </p>
      
                      <p
                        className="mt-1 italic text-slate-700"
                        style={{
                          lineHeight: "1.45",
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        “{getEventText(e)}”
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
