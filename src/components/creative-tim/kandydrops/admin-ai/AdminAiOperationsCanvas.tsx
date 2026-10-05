"use client";

import type { ComponentType, ReactNode } from "react";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

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
        <section className="min-w-0 space-y-4" data-ai-dashboard-density="operations-canvas">
            <div className="min-w-0">
                <AdminPageHeader compact eyebrow="Control tower" title="AI operations" subtitle={subtitle} actions={actions} />

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
                            <NativeSelect
                                value={activeOperation}
                                onChange={(event) => onOperationChange(event.target.value)}
                            >
                                {operations.map((operation) => <NativeSelectOption key={operation.id} value={operation.id}>{operation.label}</NativeSelectOption>)}
                            </NativeSelect>
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
