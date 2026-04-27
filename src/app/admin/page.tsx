"use client";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminActivityLogPanel } from "@/components/Admin/AdminActivityLogPanel";
import { AdminAnalyticsCharts } from "@/components/Admin/AdminAnalyticsCharts";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { AdminDropsAtGlancePanel } from "@/components/Admin/AdminDropsAtGlancePanel";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminStatsBar } from "@/components/Admin/AdminStatsBar";
import { RecentTransactionsPanel } from "@/components/Admin/RecentTransactionsPanel";
import { TopDropsPanel } from "@/components/Admin/TopDropsPanel";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { resolveTruthChipVariant } from "@/hooks/useAdminOverviewRealtime";

export default function AdminDashboardPage() {
    const { data, error, isLoading } = useAdminOverview();
    const issueCount = data?.issues?.length ?? 0;

    /* Last server-confirmed update label.
       Uses realtimeDebugMeta.lastServerConfirmedAt when available (actual Firestore
       server-confirmed snapshot timestamp), otherwise falls back to freshness.lastTransactionAt
       which comes from the server rollup. We label the source explicitly. */
    const lastServerConfirmedAt = data?.realtimeDebugMeta?.lastServerConfirmedAt;
    const lastTransactionAt = data?.freshness.lastTransactionAt;
    const serverUpdateLabel = lastServerConfirmedAt && lastServerConfirmedAt > 0
        ? `Last server update ${formatDistanceToNow(lastServerConfirmedAt, { addSuffix: true })}`
        : lastTransactionAt && lastTransactionAt > 0
            ? `Last server update ${formatDistanceToNow(lastTransactionAt, { addSuffix: true })}`
            : "No server update yet";

    /* Truth chip: concise human-readable admin truth state */
    const truthLabel = data?.truthNotes?.overview ?? "Waiting for server truth";
    const truthVariant = resolveTruthChipVariant(truthLabel);

    const TRUTH_CHIP_STYLES: Record<typeof truthVariant, string> = {
        live: "border-emerald-400/20 bg-emerald-500/10 text-emerald-400",
        cached: "border-amber-400/20 bg-amber-500/10 text-amber-400",
        fallback: "border-red-400/20 bg-red-500/10 text-red-400",
        waiting: "border-gray-400/20 bg-gray-500/10 text-gray-400",
    };

    /* Issue chip: only show when there are active listener or read issues */
    const issueChipLabel = issueCount > 0
        ? `${issueCount} issue${issueCount === 1 ? "" : "s"} active`
        : null;

    
    return (
        <div className="space-y-3 md:space-y-4">
            <PageViewEvent eventName="admin_overview_viewed" />
            <AdminPageHeader
                eyebrow={null}
                title="Admin Overview"
                compact
                actions={(
                    <>
                        <span className={cn(
                            "rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
                            TRUTH_CHIP_STYLES[truthVariant],
                        )}>
                            {truthLabel}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] font-bold text-gray-300">
                            {serverUpdateLabel}
                        </span>
                        {issueChipLabel ? (
                            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-400">
                                {issueChipLabel}
                            </span>
                        ) : null}
                    </>
                )}
            />

            <div className="grid gap-3 xl:grid-cols-12">
                <div className="xl:col-span-12">
                    <AdminDashboardModule title="Platform pulse" defaultOpen={true}>
                        {data ? (
                            <AdminStatsBar
                                stats={data.stats}
                                deltas={data.deltas}
                                issueCount={issueCount}
                            />
                        ) : (
                            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <div key={index} className="h-28 animate-pulse rounded-[1.35rem] border border-white/8 bg-white/5" />
                                ))}
                            </div>
                        )}
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-7">
                    <AdminDashboardModule title="Drops at a glance" defaultOpen={false}>
                        <AdminDropsAtGlancePanel />
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-5">
                    <AdminDashboardModule title="Revenue + Unwraps" defaultOpen={false}>
                            <AdminAnalyticsCharts
                                chartData={data?.chartData || []}
                                trendSummary={data?.trendSummary || {
                                    windowDays: 30,
                                    currentStartDayKey: "",
                                    currentEndDayKey: "",
                                    previousStartDayKey: "",
                                    previousEndDayKey: "",
                                    currentRevenueCents: 0,
                                    previousRevenueCents: 0,
                                    currentUnwraps: 0,
                                    previousUnwraps: 0,
                                    currentPurchases: 0,
                                    previousPurchases: 0,
                                    currentNewUsers: 0,
                                    previousNewUsers: 0,
                                    revenueActiveDays: 0,
                                    unwrapActiveDays: 0,
                                    bestRevenueDay: null,
                                    bestUnwrapDay: null,
                                    topUnlockDrop: null,
                                }}
                                truthLabel={truthLabel}
                                truthVariant={truthVariant}
                                loading={isLoading && !data}
                            />
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-5">
                    <AdminDashboardModule title="Top performing drops" defaultOpen={false}>
                        {data ? (
                            <TopDropsPanel
                                topDrops={data.topDrops}
                            />
                        ) : (
                            <div className="space-y-2">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="h-16 animate-pulse rounded-[1.2rem] border border-white/8 bg-white/5" />
                                ))}
                            </div>
                        )}
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-7">
                    <AdminDashboardModule title="Recent transactions" defaultOpen={false}>
                        {data ? (
                            <RecentTransactionsPanel
                                transactions={data.recentTransactions}
                            />
                        ) : (
                            <div className="space-y-2">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="h-16 animate-pulse rounded-[1.2rem] border border-white/8 bg-white/5" />
                                ))}
                            </div>
                        )}
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-12">
                    <AdminDashboardModule title="Admin activity" defaultOpen={false}>
                        {data ? (
                            <AdminActivityLogPanel
                                activity={data.adminActivity}
                            />
                        ) : (
                            <div className="space-y-2">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="h-16 animate-pulse rounded-[1.2rem] border border-white/8 bg-white/5" />
                                ))}
                            </div>
                        )}
                    </AdminDashboardModule>
                </div>
            </div>
        </div>
    );
}
