import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export type CreatorRunwayFact = {
    label: string;
    value: string;
    detail: string;
};

type CreatorOperatingRunwayProps = {
    actionNeededCount: number;
    connection: ReactNode;
    context: ReactNode;
    facts: CreatorRunwayFact[];
    isProjectionMode: boolean;
    nextAction: ReactNode;
    overviewStatus: string;
    projectionDisplayName: string;
    sourceNotice: ReactNode;
};

export function CreatorOperatingRunway({
    actionNeededCount,
    connection,
    context,
    facts,
    isProjectionMode,
    nextAction,
    overviewStatus,
    projectionDisplayName,
    sourceNotice,
}: CreatorOperatingRunwayProps) {
    const actionLabel = actionNeededCount === 1 ? "1 item needs you" : `${actionNeededCount} items need you`;

    return (
        <section
            className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0e0818]/92 shadow-[0_28px_80px_rgba(0,0,0,0.34)]"
            data-creator-operating-runway="true"
            data-creator-dashboard-layout="serial_runway"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
        >
            {isProjectionMode ? (
                <div className="border-b border-brand-purple/20 bg-brand-purple/10 px-4 py-3 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-white">Viewing {projectionDisplayName}&apos;s creator runway</p>
                        <span className="rounded-full border border-brand-purple/30 bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-purple-100">Read-only projection</span>
                    </div>
                </div>
            ) : null}

            <header className="border-b border-white/8 bg-[radial-gradient(circle_at_88%_0%,rgba(159,82,255,0.25),transparent_38%),linear-gradient(135deg,rgba(43,20,71,0.96),rgba(12,7,20,0.98))] px-4 py-5 sm:px-6 sm:py-7">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-purple-200"><Sparkles className="h-4 w-4" aria-hidden="true" /> Creator operating runway</p>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Work the one thing that moves your creator world forward.</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">Every active task stays tied to its real creator source, money state, and fan-facing outcome.</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold">
                        <span className="text-purple-100">Studio: {overviewStatus}</span>
                        <span className="text-zinc-400">{actionLabel}</span>
                    </div>
                </div>
            </header>

            <div className="space-y-0">
                {sourceNotice ? <div className="border-b border-white/8 px-4 py-4 sm:px-6">{sourceNotice}</div> : null}

                <section className="px-4 py-5 sm:px-6 sm:py-6" data-creator-runway-stage="next_action">
                    <div className="mb-4 flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-purple/30 bg-brand-purple/15 text-xs font-black text-purple-100">01</span>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-200">Next action</p>
                            <h2 className="mt-1 text-xl font-black text-white">Clear the work waiting on you.</h2>
                        </div>
                    </div>
                    {nextAction}
                </section>

                <section className="border-t border-white/8 px-4 py-5 sm:px-6 sm:py-6" data-creator-runway-stage="connection">
                    <div className="mb-4 flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-xs font-black text-zinc-200">02</span>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Stay connected</p>
                            <h2 className="mt-1 text-xl font-black text-white">Reach fans without leaving the flow.</h2>
                        </div>
                    </div>
                    {connection}
                </section>

                <section className="border-t border-white/8 px-4 py-5 sm:px-6 sm:py-6" data-creator-runway-stage="audience">
                    <div className="mb-4 flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-xs font-black text-zinc-200">03</span>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Fan Pass</p>
                            <h2 className="mt-1 text-xl font-black text-white">Keep your members close.</h2>
                        </div>
                    </div>
                    {context}
                </section>

                <section className="border-t border-white/8 bg-black/15 px-4 py-5 sm:px-6" data-creator-runway-stage="context">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Studio context</p>
                            <h2 className="mt-1 text-lg font-black text-white">The numbers behind today&apos;s decisions.</h2>
                        </div>
                        <span className="text-xs font-semibold text-zinc-500">Source-aware creator facts</span>
                    </div>
                    <dl className="mt-4 divide-y divide-white/8 border-y border-white/8">
                        {facts.map((fact) => (
                            <div key={fact.label} className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 py-3">
                                <dt className="text-sm font-bold text-zinc-200">{fact.label}</dt>
                                <dd className="ml-auto text-right">
                                    <span className="text-sm font-black text-white">{fact.value}</span>
                                    <span className="ml-2 text-xs text-zinc-500">{fact.detail}</span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
            </div>
        </section>
    );
}
