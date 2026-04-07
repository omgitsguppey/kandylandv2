"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import type { AdminOverviewResponse } from "@/lib/admin-overview";
import { paginateOverviewItems } from "@/lib/admin-overview";
import { buildAdminUiChartHealthItem } from "@/lib/admin-ui-chart-health";
import { useAdminUiChartHealthReporter } from "@/hooks/useAdminUiChartHealthReporter";

type AdminActivityLogPanelProps = {
    activity: AdminOverviewResponse["adminActivity"];
    truthNote: string;
};

const PAGE_SIZE = 5;

export function AdminActivityLogPanel({ activity, truthNote }: AdminActivityLogPanelProps) {
    const [page, setPage] = useState(0);
    const chartUpdatedAtMs = useMemo(
        () => activity.reduce((latest, item) => Math.max(latest, item.timestamp), 0),
        [activity],
    );
    const chartHealth = useMemo(() => buildAdminUiChartHealthItem({
        key: "dashboard.admin_activity_feed",
        title: "Admin activity feed",
        page: "dashboard",
        category: "overview",
        source: "overview_snapshot",
        updatedAtMs: chartUpdatedAtMs,
        hasLoaded: true,
        hasData: activity.length > 0,
        healthySummary: "Admin-only activity is loaded from the overview snapshot.",
        emptySummary: "No admin-only activity was returned in the current overview snapshot.",
        emptyAction: "Confirm whether this truly reflects no admin activity or whether the overview route lost its activity sources.",
    }), [activity.length, chartUpdatedAtMs]);
    const paginated = useMemo(
        () => paginateOverviewItems(activity, page, PAGE_SIZE),
        [activity, page],
    );

    useAdminUiChartHealthReporter([chartHealth]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                    Admin-only feed
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                    5s polled snapshot
                </span>
                {chartHealth.status !== "healthy" ? (
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-100">
                        {chartHealth.hydrationState === "empty" ? "Feed empty" : "Feed degraded"}
                    </span>
                ) : null}
                <span className="text-xs text-gray-500">{truthNote}</span>
            </div>

            {activity.length === 0 ? (
                <div className="rounded-[1.35rem] border border-white/8 bg-black/25 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-white">No recent admin-only activity was found.</p>
                    <p className="mt-1 text-sm text-gray-400">{truthNote}</p>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        {paginated.items.map((item) => (
                            <article
                                key={item.id}
                                className="grid grid-cols-[minmax(0,1fr),auto] gap-3 rounded-[1.15rem] border border-white/8 bg-black/30 px-3 py-3"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-300">
                                            {item.source === "transactions" ? "Adjustment" : "Admin event"}
                                        </span>
                                        <p className="line-clamp-1 text-sm font-semibold text-white">{item.label}</p>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                                        <span>{item.actorLabel}</span>
                                        {item.path ? <span>{item.path}</span> : null}
                                        <span>{item.detail}</span>
                                    </div>
                                </div>
                                <div className="whitespace-nowrap text-[11px] text-gray-500">
                                    {item.timestamp > 0 ? formatDistanceToNow(item.timestamp, { addSuffix: true }) : "Unknown time"}
                                </div>
                            </article>
                        ))}
                    </div>

                    {paginated.totalPages > 1 ? (
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <p>
                                Showing {paginated.startIndex + 1}-{paginated.endIndex} of {activity.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                                    disabled={paginated.page === 0}
                                    className="rounded-full border border-white/10 px-3 py-1.5 text-white disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((current) => Math.min(paginated.totalPages - 1, current + 1))}
                                    disabled={paginated.page >= paginated.totalPages - 1}
                                    className="rounded-full border border-white/10 px-3 py-1.5 text-white disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
