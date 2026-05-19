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
        <div
            className="rounded-2xl border border-white/10 bg-black/45 p-2.5 sm:rounded-3xl sm:p-4"
            data-creator-overview-module="compact_v1"
            data-creator-dashboard-fans-source={fanCountSource}
            data-creator-dashboard-content-scope="creator_owned_or_assigned"
            data-creator-dashboard-public-visibility-separated="true"
            data-creator-dashboard-overview-density="mobile_compact"
            data-creator-dashboard-overview-grid-density="mobile_4x4_compact"
        >
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[13px] font-black text-white sm:text-sm">
                    <Activity className="h-3.5 w-3.5 text-brand-purple sm:h-4 sm:w-4" />
                    Creator Overview
                </h3>
                <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-200 sm:px-2 sm:py-1 sm:text-[10px]">
                    {overviewStatus}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
                {metrics.map((metric) => (
                    <div
                        key={metric.label}
                        className="min-h-[3.25rem] rounded-lg border border-white/5 bg-white/[0.04] px-2 py-1.5 sm:rounded-xl sm:px-2.5 sm:py-2"
                        data-creator-overview-metric={metric.label.toLowerCase().replaceAll(" ", "_")}
                    >
                        <div className="flex items-center justify-between gap-1.5">
                            <p className="truncate text-[10px] font-semibold leading-3 text-gray-400 sm:text-[11px]">{metric.label}</p>
                            {metric.tone === "action" ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
                        </div>
                        <p className="truncate text-[13px] font-black leading-4 text-white sm:mt-0.5 sm:text-base" data-creator-landing-unavailable-density="compact">{metric.value}</p>
                        <p className="truncate text-[9px] leading-3 text-gray-500 sm:text-[10px]">{metric.detail}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
