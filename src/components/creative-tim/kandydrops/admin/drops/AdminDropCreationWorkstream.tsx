"use client";

import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";

type AdminDropCreationWorkstreamProps = {
  isOpen: boolean;
  onStart: () => void;
  onClose: () => void;
  children: ReactNode;
};

export function AdminDropCreationWorkstream({
  isOpen,
  onStart,
  onClose,
  children,
}: AdminDropCreationWorkstreamProps) {
  if (!isOpen) {
    return (
      <section
        aria-labelledby="admin-drop-creation-idle-title"
        data-admin-drop-creation-workstream="idle"
        className="relative overflow-hidden rounded-[1.65rem] border border-fuchsia-300/15 bg-[radial-gradient(circle_at_78%_0%,rgba(244,114,182,0.16),transparent_31%),radial-gradient(circle_at_0%_100%,rgba(168,85,247,0.18),transparent_36%),rgba(12,10,31,0.88)] px-4 py-4 shadow-[0_20px_55px_rgba(6,4,24,0.28)] sm:px-5"
      >
        <div className="pointer-events-none absolute -right-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full border border-pink-200/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/80">
              Creation workstream
            </p>
            <h3
              id="admin-drop-creation-idle-title"
              className="mt-1 text-lg font-semibold tracking-[-0.02em] text-white"
            >
              Prepare a new Drop without leaving inventory
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
              Open one focused canvas for the existing release, media, audience, and schedule controls.
            </p>
          </div>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-fuchsia-200/35 bg-fuchsia-300 px-4 text-sm font-semibold text-slate-950 shadow-[0_10px_28px_rgba(232,121,249,0.24)] transition hover:bg-pink-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-200 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Start creation
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="admin-drop-creation-active-title"
      data-admin-drop-creation-workstream="active"
      className="relative overflow-hidden rounded-[1.75rem] border border-fuchsia-300/20 bg-[radial-gradient(circle_at_92%_0%,rgba(236,72,153,0.2),transparent_28%),radial-gradient(circle_at_0%_100%,rgba(124,58,237,0.2),transparent_35%),rgba(9,7,27,0.96)] shadow-[0_26px_70px_rgba(6,4,24,0.42)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-100/80 to-transparent" />
      <header className="relative flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/85">
            Creation workstream
          </p>
          <h3 id="admin-drop-creation-active-title" className="mt-1 text-xl font-semibold tracking-[-0.025em] text-white">
            Build the next Drop
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
            Complete the existing protected release controls here, then save only when the draft is ready.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Drop creation workspace"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-fuchsia-200/35 hover:bg-fuchsia-200/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-200 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      <div className="relative flex min-h-0 flex-col">{children}</div>
    </section>
  );
}