"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminActivityLogPanel } from "@/components/Admin/AdminActivityLogPanel";
import { AdminAnalyticsCharts } from "@/components/Admin/AdminAnalyticsCharts";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { AdminDropsAtGlancePanel } from "@/components/Admin/AdminDropsAtGlancePanel";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminStatsBar } from "@/components/Admin/AdminStatsBar";
import { RecentTransactionsPanel } from "@/components/Admin/RecentTransactionsPanel";
import { TopDropsPanel } from "@/components/Admin/TopDropsPanel";
import { useAdminUiChartHealthReporter } from "@/hooks/useAdminUiChartHealthReporter";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { buildAdminUiChartHealthItem, summarizeAdminUiChartHealth } from "@/lib/admin-ui-chart-health";

export default function AdminDashboardPage() {
    const { data, error, isLoading } = useAdminOverview();
    const issueCount = data?.issues?.length ?? 0;
    const lastCommerceLabel = data?.freshness.lastTransactionAt
        ? formatDistanceToNow(data.freshness.lastTransactionAt, { addSuffix: true })
        : "No recent transaction timestamp";
    const overviewUpdatedAtMs = data?.generatedAt ?? 0;
    const overviewHealthItems = useMemo(() => {
        const overviewIssues = data?.issues ?? [];
        const blockingOverviewIssues = !data && error ? [error.message || "Overview request failed."] : [];
        const backgroundOverviewIssues = data && error
            ? [`Overview refresh failed: ${error.message || "Background refresh failed."}`]
            : [];

        return [
            buildAdminUiChartHealthItem({
                key: "dashboard.platform_pulse",
                title: "Platform pulse",
                page: "dashboard",
                category: "overview",
                source: "overview_snapshot",
                updatedAtMs: overviewUpdatedAtMs,
                hasLoaded: Boolean(data) || Boolean(error),
                loading: isLoading,
                hasData: Boolean(data?.stats),
                blockingIssues: blockingOverviewIssues,
                backgroundIssues: [...backgroundOverviewIssues, ...overviewIssues.map((issue) => `Overview read issue: ${issue}`)],
                healthySummary: "Overview metrics are loaded from the canonical 5s overview snapshot.",
                emptySummary: "Overview metrics did not return a usable snapshot.",
            }),
            buildAdminUiChartHealthItem({
                key: "dashboard.revenue_trends",
                title: "Revenue trends",
                page: "dashboard",
                category: "overview",
                source: "overview_snapshot",
                updatedAtMs: overviewUpdatedAtMs,
                hasLoaded: Boolean(data) || Boolean(error),
                loading: isLoading,
                hasData: Boolean(data?.chartData?.some((entry) => entry.revenue > 0 || entry.unwraps > 0)),
                blockingIssues: blockingOverviewIssues,
                backgroundIssues: [...backgroundOverviewIssues, ...overviewIssues.map((issue) => `Revenue trend issue: ${issue}`)],
                healthySummary: "Revenue trend data is loaded for the current 30-day overview window.",
                emptySummary: "Revenue trends loaded without any revenue or unwrap activity in the current window.",
            }),
            buildAdminUiChartHealthItem({
                key: "dashboard.top_performing_drops",
                title: "Top performing drops",
                page: "dashboard",
                category: "overview",
                source: "overview_snapshot",
                updatedAtMs: overviewUpdatedAtMs,
                hasLoaded: Boolean(data) || Boolean(error),
                loading: isLoading,
                hasData: Boolean((data?.topDrops?.length ?? 0) > 0),
                blockingIssues: blockingOverviewIssues,
                backgroundIssues: [...backgroundOverviewIssues, ...overviewIssues.map((issue) => `Top drops issue: ${issue}`)],
                healthySummary: "Top-performing drops are ranked from the current overview snapshot.",
                emptySummary: "No drops are ranked in the current overview snapshot.",
            }),
        ];
    }, [data, error, isLoading, overviewUpdatedAtMs]);
    const overviewHealthSummary = useMemo(
        () => summarizeAdminUiChartHealth(overviewHealthItems),
        [overviewHealthItems],
    );

    useAdminUiChartHealthReporter(overviewHealthItems);

    return (
        <div className="space-y-3 md:space-y-4">
            <PageViewEvent eventName="admin_dashboard_viewed" />
            <AdminPageHeader
                eyebrow="Control Room"
                title="Admin Dashboard"
                actions={(
                    <>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            5s polled snapshot
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            Last commerce activity {lastCommerceLabel}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            {overviewHealthSummary.healthy}/{overviewHealthSummary.total} overview modules healthy
                        </span>
                        {overviewHealthSummary.warn + overviewHealthSummary.fail > 0 ? (
                            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
                                {overviewHealthSummary.warn + overviewHealthSummary.fail} module issue{overviewHealthSummary.warn + overviewHealthSummary.fail === 1 ? "" : "s"}
                            </span>
                        ) : null}
                        {issueCount > 0 ? (
                            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
                                {issueCount} overview issue{issueCount === 1 ? "" : "s"}
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
                                truthNote={data.truthNotes.platformPulse}
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
                    <AdminDashboardModule title="Drops at a glance" defaultOpen={true}>
                        <AdminDropsAtGlancePanel />
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-5">
                    <AdminDashboardModule title="Revenue trends" defaultOpen={true}>
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
                            truthNote={data?.truthNotes.revenue || "30-day revenue and unwrap trends are loading."}
                            issueCount={issueCount}
                            loading={isLoading && !data}
                        />
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-5">
                    <AdminDashboardModule title="Top performing drops" defaultOpen={true}>
                        {data ? (
                            <TopDropsPanel
                                topDrops={data.topDrops}
                                truthNote={data.truthNotes.topDrops}
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
                    <AdminDashboardModule title="Recent transactions" defaultOpen={true}>
                        {data ? (
                            <RecentTransactionsPanel
                                transactions={data.recentTransactions}
                                truthNote={data.truthNotes.transactions}
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
                    <AdminDashboardModule title="Admin activity" defaultOpen={true}>
                        {data ? (
                            <AdminActivityLogPanel
                                activity={data.adminActivity}
                                truthNote={data.truthNotes.adminActivity}
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
