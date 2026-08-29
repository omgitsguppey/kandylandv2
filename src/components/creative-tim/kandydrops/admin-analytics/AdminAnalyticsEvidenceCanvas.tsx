"use client";

import type { ComponentType, ReactNode } from "react";

type AdminAnalyticsIcon = ComponentType<{
    "aria-hidden"?: boolean | "true" | "false";
    className?: string;
}>;

export type AdminAnalyticsEvidenceFact = {
    detail: string;
    icon: AdminAnalyticsIcon;
    label: string;
    statusLabel?: string;
    truthState: string;
    value: string;
};

type AdminAnalyticsEvidenceCanvasProps = {
    alerts?: ReactNode;
    children: ReactNode;
    evidence?: ReactNode;
    facts?: AdminAnalyticsEvidenceFact[];
    filters?: ReactNode;
    fixture?: ReactNode;
    isPriming?: ReactNode;
    mode?: "default" | "setup";
};

export function AdminAnalyticsEvidenceCanvas({
    alerts,
    children,
    evidence,
    facts = [],
    filters,
    fixture,
    isPriming,
    mode = "default",
}: AdminAnalyticsEvidenceCanvasProps) {
    const isSetup = mode === "setup";

    return (
        <section
            className="min-h-[calc(100dvh-var(--root-shell-top-spacing,0px))] bg-[radial-gradient(circle_at_94%_0%,rgba(118,55,205,0.18),transparent_28rem),linear-gradient(180deg,#100a19_0%,#08050d_42rem)] px-3 pb-20 pt-3 sm:px-4 sm:pt-5 md:pb-8"
            data-admin-mobile-surface="analytics"
            data-admin-analytics-layout="evidence-workspace"
            data-mobile-organization="evidence-first"
            data-mobile-drilldown="true"
            data-desktop-flow-collapsed="true"
        >
            <div className="mx-auto w-full max-w-7xl">
                <header className="border-b border-white/10 pb-5 sm:pb-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-purple-200">Admin analytics / Evidence workspace</p>
                    <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Read what the evidence can support.</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">Server-confirmed activity, revenue, and mobile usage stay labeled with their source, freshness, confidence, and next action.</p>
                        </div>
                        {isSetup ? <span className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-red-100">Setup required</span> : null}
                    </div>
                </header>

                {fixture ? <div className="border-b border-white/8 py-4">{fixture}</div> : null}

                {evidence ? (
                    <section className="border-b border-white/8 py-5 sm:py-6" data-admin-analytics-evidence-context="true">
                        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Evidence basis</p>
                                <h2 className="mt-1 text-xl font-black text-white">Source, freshness, confidence, and recovery.</h2>
                            </div>
                        </div>
                        {evidence}
                    </section>
                ) : null}

                {facts.length > 0 ? (
                    <section className="border-b border-white/8 py-5 sm:py-6" aria-label="Analytics readout">
                        <dl className="divide-y divide-white/8 border-y border-white/8">
                            {facts.map((fact) => {
                                const Icon = fact.icon;
                                return (
                                    <div key={fact.label} className="grid gap-1 py-3 sm:grid-cols-[minmax(10rem,0.7fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4" data-admin-analytics-truth-state={fact.truthState}>
                                        <dt className="flex items-center gap-2 text-sm font-bold text-zinc-200"><Icon className="h-4 w-4 text-brand-purple" aria-hidden="true" />{fact.label}</dt>
                                        <dd className="text-sm text-zinc-400">{fact.detail}</dd>
                                        <dd className="flex items-center justify-between gap-3 sm:justify-end">
                                            <span className="font-black text-white">{fact.value}</span>
                                            {fact.statusLabel ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">{fact.statusLabel}</span> : null}
                                        </dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </section>
                ) : null}

                {filters ? <section className="border-b border-white/8 py-5 sm:py-6" aria-label="Analytics controls">{filters}</section> : null}
                {alerts ? <div className="space-y-3 border-b border-white/8 py-4">{alerts}</div> : null}
                {isPriming ? <div className="border-b border-white/8 py-5">{isPriming}</div> : null}

                <main className="min-w-0 py-5 sm:py-6" data-mobile-drilldown="true">
                    {children}
                </main>
            </div>
        </section>
    );
}
