"use client";

import { Button } from "@/components/ui/Button";


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
        className="relative overflow-hidden rounded-[1.65rem] border border-primary/15 bg-card px-4 py-4 shadow-none sm:px-5"
      >
        <div className="pointer-events-none absolute -right-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full border border-primary/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/80">
              Creation workstream
            </p>
            <h3
              id="admin-drop-creation-idle-title"
              className="mt-1 text-lg font-semibold tracking-[-0.02em] text-foreground"
            >
              Prepare a new Drop without leaving inventory
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Open one focused canvas for the existing release, media, audience, and schedule controls.
            </p>
          </div>
          <Button variant="ghost"
            type="button"
            onClick={onStart}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary px-4 text-sm font-semibold text-muted-foreground shadow-none transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Start creation
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="admin-drop-creation-active-title"
      data-admin-drop-creation-workstream="active"
      className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-card shadow-none"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-card from-transparent to-transparent" />
      <header className="relative flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/85">
            Creation workstream
          </p>
          <h3 id="admin-drop-creation-active-title" className="mt-1 text-xl font-semibold tracking-[-0.025em] text-foreground">
            Build the next Drop
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Complete the existing protected release controls here, then save only when the draft is ready.
          </p>
        </div>
        <Button variant="ghost"
          type="button"
          onClick={onClose}
          aria-label="Close Drop creation workspace"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </header>
      <div className="relative flex min-h-0 flex-col">{children}</div>
    </section>
  );
}