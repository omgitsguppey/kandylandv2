import { CheckCircle2, CircleDot, Clock3 } from "lucide-react";

type CreatorApplicationHistoryEntry = {
    label: string;
    at: number;
};

interface CreatorApplicationStepRailProps {
    blockerCount: number;
    currentStage: string;
    idStatus: string;
    legalStatus: string;
    stageHistory: CreatorApplicationHistoryEntry[];
}

export function CreatorApplicationStepRail({
    blockerCount,
    currentStage,
    idStatus,
    legalStatus,
    stageHistory,
}: CreatorApplicationStepRailProps) {
    const blockerLabel = blockerCount === 0
        ? "No active blockers"
        : blockerCount === 1
            ? "1 item needs attention"
            : String(blockerCount) + " items need attention";

    return (
        <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(110deg,rgba(255,255,255,0.06),rgba(178,140,255,0.1),rgba(255,255,255,0.025))] shadow-[0_20px_60px_rgba(0,0,0,0.25)]" aria-labelledby="creator-application-progress">
            <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple">Confirmed progress</p>
                        <h2 id="creator-application-progress" className="mt-2 text-xl font-black tracking-[-0.035em] text-white">Your application, at a glance</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-400">Only confirmed milestones and review requirements appear here.</p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple/10 px-3 py-1.5 text-xs font-bold text-white">
                        <CircleDot className="h-3.5 w-3.5 text-brand-pink" aria-hidden="true" />
                        {currentStage}
                    </span>
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                    <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 text-xs font-semibold text-gray-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-brand-purple" aria-hidden="true" />
                        {blockerLabel}
                    </span>
                    <span className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.035] px-3 text-xs font-semibold text-white">
                        Legal: {legalStatus}
                    </span>
                    <span className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.035] px-3 text-xs font-semibold text-white">
                        Identity: {idStatus}
                    </span>
                </div>

                <details className="group mt-5 border-t border-white/10 pt-4">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-xs font-black uppercase tracking-[0.16em] text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                        Confirmed history
                        <Clock3 className="h-4 w-4 text-brand-purple transition-transform group-open:rotate-12" aria-hidden="true" />
                    </summary>
                    <ol className="mt-4 border-t border-white/10">
                        {stageHistory.length > 0 ? stageHistory.map((entry) => (
                            <li key={entry.label + "-" + entry.at} className="flex gap-3 border-b border-white/10 py-3 last:border-b-0">
                                <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-purple/25 bg-brand-purple/10 text-brand-purple">
                                    <Clock3 className="h-3.5 w-3.5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white">{entry.label}</p>
                                    <p className="mt-1 text-[11px] leading-4 text-gray-500">{new Date(entry.at).toLocaleString()}</p>
                                </div>
                            </li>
                        )) : (
                            <li className="py-3 text-xs leading-5 text-gray-400">
                                Your confirmed review milestones will appear here.
                            </li>
                        )}
                    </ol>
                </details>
            </div>
        </section>
    );
}
