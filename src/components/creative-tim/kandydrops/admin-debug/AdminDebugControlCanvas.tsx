"use client";

import type { ElementType, ReactNode } from "react";

import { AdminTruthBadge } from "@/components/Admin/AdminTruthBadge";
import type { AdminSurfaceState } from "@/lib/admin-parity";
import { resolveAdminInputTruthState, type AdminTruthState } from "@/lib/admin-truth-state";

type AdminDebugControlTab = {
    id: string;
    label: string;
    icon: ElementType;
};

type AdminDebugPriorityAction = {
    label: string;
    value: string | number;
    meta: string;
    truthState: AdminTruthState | AdminSurfaceState | "loading";
};

type AdminDebugControlCanvasProps = {
    title: string;
    subtitle: string;
    statusLabel: string;
    statusClassName: string;
    statusTextClassName: string;
    tabs: readonly AdminDebugControlTab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    priorityAction: AdminDebugPriorityAction;
    evidenceBoundary: ReactNode;
    beforeContent?: ReactNode;
    children: ReactNode;
};

export function AdminDebugControlCanvas({
    title,
    subtitle,
    statusLabel,
    statusClassName,
    statusTextClassName,
    tabs,
    activeTab,
    onTabChange,
    priorityAction,
    evidenceBoundary,
    beforeContent,
    children,
}: AdminDebugControlCanvasProps) {
    const resolvedActionTruth = resolveAdminInputTruthState({
        truthState: priorityAction.truthState,
        value: priorityAction.value,
        pendingInitialLoad: priorityAction.truthState === "loading",
    });

    return (
        <main
            className="relative isolate min-h-screen overflow-x-hidden bg-kandy-void px-3 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+5.5rem)] text-white sm:px-5 lg:px-7"
            data-admin-control-tower="true"
            data-mobile-organization="summary-first"
            data-mobile-drilldown="true"
            data-desktop-flow-collapsed="true"
            data-admin-mobile-surface="debug"
            data-admin-debug-sprawl-reduction="target-75-95"
            data-admin-debug-canvas="control_tower"
        >
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_12%_0%,rgba(178,140,255,0.2),transparent_40%),radial-gradient(circle_at_86%_6%,rgba(236,72,153,0.14),transparent_32%)]" />
            <div className="relative w-full">
                {beforeContent}

                <section className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(125deg,rgba(255,255,255,0.08),rgba(10,7,21,0.94)_52%,rgba(82,40,124,0.22))] shadow-[0_28px_84px_rgba(0,0,0,0.32)]">
                    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.52fr)] lg:p-6">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-kandy-lilac">Admin Debug</p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68 sm:text-base">{subtitle}</p>
                        </div>

                        <div className="grid gap-3 self-end sm:grid-cols-2 lg:grid-cols-1">
                            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">Source state</p>
                                    <span className={`h-2.5 w-2.5 rounded-full ${statusClassName}`} aria-hidden="true" />
                                </div>
                                <p className={`mt-2 text-lg font-black ${statusTextClassName}`}>{statusLabel}</p>
                            </div>
                            <div className="rounded-2xl border border-kandy-lilac/20 bg-kandy-lilac/10 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-kandy-lilac">{priorityAction.label}</p>
                                    <AdminTruthBadge
                                        state={resolvedActionTruth.truthState}
                                        pendingInitialLoad={resolvedActionTruth.pendingInitialLoad}
                                        hasUsableValue={resolvedActionTruth.hasUsableValue}
                                    />
                                </div>
                                <p className="mt-2 text-2xl font-black text-white">{priorityAction.value}</p>
                                <p className="mt-1 text-sm leading-5 text-white/62">{priorityAction.meta}</p>
                            </div>
                        </div>
                    </div>

                    <section
  className="border-t border-white/10 bg-black/20 px-4 py-4 sm:px-6"
  aria-label="Debug workstream decision rail"
  data-admin-debug-workstream-control="decision-rail"
  data-admin-debug-active-workstream={activeTab}
>
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100/55">Workstream queue</p>
      <p className="mt-1 text-xs leading-5 text-violet-100/62">Choose the evidence lane that needs an operator decision.</p>
    </div>
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/48">Current selection remains open below</p>
  </div>
  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const active = tab.id === activeTab;

      return (
        <button
          key={tab.id}
          type="button"
          aria-pressed={active}
          onClick={() => onTabChange(tab.id)}
          className={[
            "group flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12091f]",
            active
              ? "border-fuchsia-200/45 bg-fuchsia-300/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
              : "border-white/10 bg-white/[0.03] text-violet-100/72 hover:border-fuchsia-200/25 hover:bg-white/[0.07] hover:text-white",
          ].join(" ")}
        >
          <span className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            active ? "border-fuchsia-200/35 bg-fuchsia-200/12 text-fuchsia-100" : "border-white/10 bg-black/20 text-violet-200/62",
          ].join(" ")}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black">{tab.label}</span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-200/48">
              {active ? "Current decision lane" : "Open workstream"}
            </span>
          </span>
          <span className={[
            "shrink-0 text-[9px] font-black uppercase tracking-[0.14em]",
            active ? "text-fuchsia-100" : "text-violet-200/42",
          ].join(" ")}>
            {active ? "Active" : "Review"}
          </span>
        </button>
      );
    })}
  </div>
</section>
                </section>

                <section className="mt-5" data-admin-debug-evidence-boundary="true">
                    {evidenceBoundary}
                </section>

                <section className="mt-5 rounded-3xl border border-white/10 bg-[linear-gradient(155deg,rgba(255,255,255,0.055),rgba(6,5,13,0.84))] p-3 shadow-[0_24px_72px_rgba(0,0,0,0.24)] sm:p-4">
                    {children}
                </section>
            </div>
        </main>
    );
}
