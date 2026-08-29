import { Activity } from "lucide-react";

export type CreatorOverviewMetric = {
    label: string;
    value: string;
    detail: string;
    tone: string;
};

export function CreatorDashboardOverviewModule({
    metrics,
    overviewStatus,
    fanCountSource,
}: {
    metrics: CreatorOverviewMetric[];
    overviewStatus: string;
    fanCountSource: string;
}) {
    return (
        <section
            className="rounded-[1.75rem] border border-white/10 bg-[#110b20]/90 p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)] sm:p-6"
            data-creator-overview-module="compact_v1"
            data-creator-dashboard-fans-source={fanCountSource}
            data-creator-dashboard-content-scope="creator_owned_or_assigned"
            data-creator-dashboard-public-visibility-separated="true"
            data-creator-dashboard-overview-density="mobile_compact"
            data-creator-dashboard-overview-grid-density="mobile_4x4_compact"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-200"><Activity className="h-4 w-4 text-brand-purple" /> Studio pulse</p>
                    <h2 className="mt-1 text-lg font-black tracking-tight text-white">Your creator numbers</h2>
                </div>
                <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-zinc-200">{overviewStatus}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {metrics.map((metric) => (
                        <article
                            key={metric.label}
                            className="min-h-28 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                            data-creator-overview-metric={metric.label.toLowerCase().replaceAll(" ", "_")}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-bold uppercase tracking-wider text-zinc-500">{metric.label}</p>
                                {metric.tone === "action" ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : null}
                            </div>
                            <p className="mt-3 truncate text-xl font-black tracking-tight text-white" data-creator-landing-unavailable-density="compact">{metric.value}</p>
                            <p className="mt-1 truncate text-xs text-zinc-500">{metric.detail}</p>
                        </article>
                    ))}
            </div>
        </section>
    );
}
