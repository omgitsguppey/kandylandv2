"use client";

import type { ReactNode } from "react";

type AdminRosterWorkspaceTab = {
    key: string;
    label: string;
};

type AdminRosterWorkspaceMetric = {
    label: string;
    value: string | number;
    description: string;
};

type AdminRosterWorkspaceProps = {
    eyebrow: string;
    title: string;
    subtitle: string;
    tabs: readonly AdminRosterWorkspaceTab[];
    activeTab: string;
    onTabChange: (key: string) => void;
    metrics: readonly AdminRosterWorkspaceMetric[];
    sourceNotice?: ReactNode;
    beforeContent?: ReactNode;
    children: ReactNode;
};

export function AdminRosterWorkspace({
    eyebrow,
    title,
    subtitle,
    tabs,
    activeTab,
    onTabChange,
    metrics,
    sourceNotice,
    beforeContent,
    children,
}: AdminRosterWorkspaceProps) {
    return (
        <main
            className="relative isolate min-h-screen overflow-x-hidden bg-kandy-void px-3 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+5.5rem)] text-white sm:px-5 lg:px-7"
            data-admin-roster-workspace="creator-review"
            data-roster-mode="decision_queue"
        >
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_12%_0%,rgba(178,140,255,0.2),transparent_42%),radial-gradient(circle_at_88%_12%,rgba(236,72,153,0.13),transparent_34%)]" />
            <div className="relative w-full">
                {beforeContent}

                <section className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(125deg,rgba(255,255,255,0.085),rgba(11,7,22,0.9)_46%,rgba(91,44,132,0.22))] shadow-[0_28px_80px_rgba(0,0,0,0.3)]">
                    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:p-6">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-kandy-lilac">{eyebrow}</p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/68 sm:text-base">{subtitle}</p>
                        </div>

                        <section
  className="w-full border border-white/10 bg-black/20 p-3 sm:p-4"
  aria-label="Creator review decision switcher"
  data-admin-roster-review-control="decision-switcher"
  data-admin-roster-active-view={activeTab}
>
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100/55">Review focus</p>
      <p className="mt-1 text-xs leading-5 text-violet-100/62">Keep the current creator-review decision in one visible lane.</p>
    </div>
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/48">Selection controls the workspace below</p>
  </div>
  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
    {tabs.map((tab) => {
      const active = tab.key === activeTab;

      return (
        <button
          key={tab.key}
          type="button"
          aria-pressed={active}
          onClick={() => onTabChange(tab.key)}
          className={[
            "flex min-h-14 items-center justify-between gap-3 border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12091f]",
            active
              ? "border-fuchsia-200/45 bg-fuchsia-300/12 text-white"
              : "border-white/10 bg-white/[0.03] text-violet-100/72 hover:border-fuchsia-200/25 hover:bg-white/[0.07] hover:text-white",
          ].join(" ")}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-black">{tab.label}</span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-200/48">
              {active ? "Current review" : "Switch focus"}
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
                    </div>

                    <div className="grid border-t border-white/10 sm:grid-cols-3">
                        {metrics.map((metric) => (
                            <div key={metric.label} className="min-w-0 border-b border-white/10 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:px-6">
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">{metric.label}</p>
                                <p className="mt-2 text-2xl font-black text-white">{metric.value}</p>
                                <p className="mt-1 text-sm leading-5 text-white/55">{metric.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {sourceNotice ? <aside className="mt-4">{sourceNotice}</aside> : null}

                <section className="mt-5 flex flex-col gap-4 2xl:flex-row 2xl:items-start [&>div:first-child]:min-w-0 [&>div:first-child]:2xl:flex-1 [&>div:last-child]:min-w-0 [&>div:last-child]:2xl:w-96">
                    {children}
                </section>
            </div>
        </main>
    );
}
