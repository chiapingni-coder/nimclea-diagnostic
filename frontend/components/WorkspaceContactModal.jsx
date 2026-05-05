import React from "react";

export default function WorkspaceContactModal({
  isOpen,
  lead,
  setLead,
  emailError = "",
  isSaving = false,
  onSubmit,
  onCancel,
  title = "Access your Nimclea workspace",
  description = "Add your contact details so this case can stay connected to your workspace.",
  submitLabel = "Continue",
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.45)",
        padding: "16px",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "448px",
          borderRadius: "24px",
          border: "1px solid #E2E8F0",
          background: "#FFFFFF",
          padding: "24px",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)",
        }}
      >
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {description}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          You are entering in trial mode. Full verification will be required later.
        </p>

        <div className="mt-5 space-y-3">
          <input
            type="text"
            value={lead.name}
            onChange={(event) =>
              setLead((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Name"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
          />
          <input
            type="email"
            value={lead.email}
            onChange={(event) =>
              setLead((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="Work Email"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
          />
          {emailError ? (
            <p className="text-xs font-medium text-red-600">
              {emailError}
            </p>
          ) : null}
          <input
            type="text"
            value={lead.company}
            onChange={(event) =>
              setLead((prev) => ({ ...prev, company: event.target.value }))
            }
            placeholder="Company / Team"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : submitLabel}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          We only use this to keep this case connected to your result.
        </p>
      </form>
    </div>
  );
}
