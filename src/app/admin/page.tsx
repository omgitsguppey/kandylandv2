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
import { useAdminOverview } from "@/hooks/useAdminOverview";

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
            
            
            
        ];
    }, [data, error, isLoading, overviewUpdatedAtMs]);
    const overviewHealthSummary = useMemo(
        () => ({ fail: 0, warn: 0, total: 0 }),
        [overviewHealthItems],
    );

    
    return (
        <div className="space-y-3 md:space-y-4">
            <PageViewEvent eventName="admin_dashboard_viewed" />
            <AdminPageHeader
                eyebrow="Control Room"
                title="Admin Dashboard"
                compact
                actions={(
                    <>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            Overview snapshot, refreshed every 5s
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white">
                            Last commerce activity {lastCommerceLabel}
                        </span>
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
