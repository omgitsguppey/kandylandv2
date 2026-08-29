"use client";

import type { ComponentType, ReactNode } from "react";

export type AdminAiOperation = {
    id: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
};

export type AdminAiOperationFact = {
    detail: string;
    label: string;
    truthState: string;
    value: string;
};

type AdminAiOperationsCanvasProps = {
    actions: ReactNode;
    activeOperation: string;
    children: ReactNode;
    error?: ReactNode;
    facts: AdminAiOperationFact[];
    fixture?: ReactNode;
    onOperationChange: (id: string) => void;
    operations: AdminAiOperation[];
    subtitle: string;
};

export function AdminAiOperationsCanvas({
    actions,
    activeOperation,
    children,
    error,
    facts,
    fixture,
    onOperationChange,
    operations,
    subtitle,
}: AdminAiOperationsCanvasProps) {
    const active = operations.find((operation) => operation.id === activeOperation) ?? operations[0];

    return (
        <section className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_88%_0%,rgba(130,55,221,0.2),transparent_27rem),linear-gradient(180deg,#0e0917_0%,#07050b_44rem)] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:px-8" data-ai-dashboard-density="operations-canvas">
            <div className="mx-auto min-w-0 max-w-7xl overflow-x-clip">
                <header className="border-b border-white/10 pb-5 sm:pb-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-purple-200">Admin AI / Cover Ops</p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Make the next safe AI decision.</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">{subtitle}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">{actions}</div>
                    </div>
                </header>

                {fixture ? <div className="border-b border-white/8 py-4">{fixture}</div> : null}

                <section className="border-b border-white/8 py-5 sm:py-6" aria-label="AI operational truth">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Operational truth</p>
                            <h2 className="mt-1 text-xl font-black text-white">Read the source before you act.</h2>
                        </div>
                        <span className="text-xs font-semibold text-zinc-500">Runtime, policy, reference, and review context</span>
                    </div>
                    <dl className="mt-4 divide-y divide-white/8 border-y border-white/8">
                        {facts.map((fact) => (
                            <div key={fact.label} className="grid gap-1 py-3 sm:grid-cols-[minmax(10rem,0.65fr)_minmax(0,1fr)_auto] sm:items-baseline sm:gap-4" data-admin-ai-truth-state={fact.truthState}>
                                <dt className="text-sm font-bold text-zinc-200">{fact.label}</dt>
                                <dd className="text-sm text-zinc-400">{fact.detail}</dd>
                                <dd className="flex items-center justify-between gap-3 sm:justify-end">
                                    <span className="font-black text-white">{fact.value}</span>
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">{fact.truthState.replaceAll("_", " ")}</span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section className="border-b border-white/8 py-5 sm:py-6" aria-label="AI operation chooser">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_18rem] sm:items-end">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-200">Choose an operation</p>
                            <h2 className="mt-1 text-xl font-black text-white">{active?.label ?? "AI operations"}</h2>
                            <p className="mt-1 text-sm leading-6 text-zinc-400">Only the active operation is open, so review and intervention stay focused.</p>
                        </div>
                        <label className="block">
                            <span className="sr-only">AI operation</span>
                            <select
                                value={activeOperation}
                                onChange={(event) => onOperationChange(event.target.value)}
                                className="min-h-12 w-full rounded-2xl border border-white/12 bg-black/30 px-3 text-sm font-bold text-white outline-none transition focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/25"
                            >
                                {operations.map((operation) => <option key={operation.id} value={operation.id}>{operation.label}</option>)}
                            </select>
                        </label>
                    </div>
                </section>

                {error ? <div className="border-b border-white/8 py-4">{error}</div> : null}

                <main className="min-w-0 py-5 sm:py-6" aria-label={`${active?.label ?? "AI"} operations`}>
                    {children}
                </main>
            </div>
        </section>
    );
}
