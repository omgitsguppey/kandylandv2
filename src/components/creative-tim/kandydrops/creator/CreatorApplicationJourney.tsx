import type { ReactNode } from "react";
import { ArrowRight, CircleDot, Sparkles } from "lucide-react";

interface CreatorApplicationJourneyProps {
    blockerCount?: number;
    checklist?: ReactNode;
    currentAction?: {
        title: string;
        description: string;
        actions: ReactNode;
    } | null;
    description?: string;
    heading: string;
    loading: boolean;
    primaryActions?: ReactNode;
    primaryWorkflow?: ReactNode;
    revision?: ReactNode;
    secondary?: ReactNode;
    stage: string;
    stageRail?: ReactNode;
    statusFacts?: ReactNode;
    summary?: ReactNode;
    verification?: ReactNode;
}

export function CreatorApplicationJourney({
    blockerCount,
    checklist,
    currentAction,
    description,
    heading,
    loading,
    primaryActions,
    primaryWorkflow,
    revision,
    secondary,
    stage,
    stageRail,
    statusFacts,
    summary,
    verification,
}: CreatorApplicationJourneyProps) {
    const blockerLabel = typeof blockerCount === "number"
        ? blockerCount === 1
            ? "1 review item"
            : String(blockerCount) + " review items"
        : "Application access";

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
            <header className="relative overflow-hidden rounded-[2.4rem] border border-white/12 bg-[linear-gradient(145deg,rgba(37,19,64,0.96),rgba(13,7,25,0.98)_57%,rgba(25,10,38,0.95))] px-5 py-7 shadow-[0_30px_88px_rgba(0,0,0,0.42)] sm:px-8 sm:py-9">
                <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-brand-purple/30 blur-3xl" aria-hidden="true" />
                <div className="pointer-events-none absolute bottom-[-4rem] left-[42%] h-32 w-32 rounded-full bg-[#ff6fcf]/15 blur-3xl" aria-hidden="true" />
                <div className="relative max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        Kreator Experiences
                        <span className="h-px w-8 bg-brand-purple/60" aria-hidden="true" />
                        <span className="text-white/50">{stage}</span>
                    </div>
                    {loading ? (
                        <div className="mt-6 space-y-3">
                            <div className="h-8 w-2/3 animate-pulse rounded-full bg-white/10" />
                            <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
                            <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/10" />
                        </div>
                    ) : (
                        <>
                            <h1 className="mt-4 text-3xl font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-4xl md:text-5xl">{heading}</h1>
                            {description ? <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{description}</p> : null}
                            {primaryActions ? <div className="mt-6 flex flex-wrap gap-3">{primaryActions}</div> : null}
                        </>
                    )}
                </div>
            </header>

            {!loading ? (
                <main className="space-y-5">
                    {stageRail ? <div>{stageRail}</div> : null}

                    {currentAction ? (
                        <section className="relative overflow-hidden rounded-[2rem] border border-brand-purple/30 bg-[linear-gradient(135deg,rgba(178,140,255,0.2),rgba(11,6,20,0.9)_58%,rgba(255,111,207,0.08))] p-5 shadow-[0_22px_66px_rgba(0,0,0,0.3)] sm:p-7" aria-labelledby="creator-current-action">
                            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-brand-purple/25 blur-3xl" aria-hidden="true" />
                            <div className="relative">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple">Your next move</p>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                                        <CircleDot className="h-3 w-3 text-brand-pink" aria-hidden="true" />
                                        {blockerLabel}
                                    </span>
                                </div>
                                <h2 id="creator-current-action" className="mt-4 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{currentAction.title}</h2>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-200">{currentAction.description}</p>
                                <div className="mt-6 flex flex-wrap gap-3">{currentAction.actions}</div>
                            </div>
                        </section>
                    ) : null}

                    {(summary || statusFacts) ? (
                        <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.035] px-5 py-4 sm:px-6" aria-label="Application status">
                            {summary ? <div className="flex flex-wrap gap-2">{summary}</div> : null}
                            {statusFacts ? <div className={summary ? "mt-3" : undefined}>{statusFacts}</div> : null}
                        </section>
                    ) : null}

                    <div className="space-y-5">
                        {primaryWorkflow}
                        {verification}
                        {revision}
                    </div>

                    {checklist ? (
                        <details className="group rounded-[1.6rem] border border-white/10 bg-black/20 px-5 py-4 sm:px-6" open={Boolean(blockerCount && blockerCount > 0)}>
                            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                                Confirmed application details
                                <ArrowRight className="h-4 w-4 text-brand-purple transition-transform group-open:rotate-90" aria-hidden="true" />
                            </summary>
                            <div className="border-t border-white/10 pt-4">{checklist}</div>
                        </details>
                    ) : null}

                </main>
            ) : null}

            {!loading && secondary ? <section className="border-t border-white/10 pt-6">{secondary}</section> : null}
        </div>
    );
}
