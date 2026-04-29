"use client";

import { formatDistanceToNow } from "date-fns";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminActivityLogPanel } from "@/components/Admin/AdminActivityLogPanel";
import { AdminAnalyticsCharts } from "@/components/Admin/AdminAnalyticsCharts";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { AdminDropsAtGlancePanel } from "@/components/Admin/AdminDropsAtGlancePanel";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { AdminStatsBar } from "@/components/Admin/AdminStatsBar";
import { RecentTransactionsPanel } from "@/components/Admin/RecentTransactionsPanel";
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


    return (
        <div className="space-y-3 md:space-y-4">
            <PageViewEvent eventName="admin_dashboard_viewed" />
            <PageViewEvent eventName="admin_overview_viewed" />
            <AdminPageHeader
                eyebrow={null}
                title="Admin Overview"
                subtitle={serverUpdateLabel}
                compact
                actions={(
                    <div className="flex items-center gap-2">
                        <AdminStatusBadge state={truthVariant} />
                        <span className="text-[11px] font-semibold text-gray-400">{truthLabel}</span>
                    </div>
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
                                truthState={truthVariant}
                            />
                        ) : (
                            <div className="rounded-[1.35rem] border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                                <AdminStatusBadge state={error ? "failed" : "unavailable"} className="mb-2" />
                                <div>{error?.message ?? "Overview snapshot is not available yet."}</div>
                            </div>
                        )}
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-7">
                    <AdminDashboardModule title="Drops at a glance" defaultOpen={false}>
                        <AdminDropsAtGlancePanel />
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-7">
                    <AdminDashboardModule title="Revenue + Unwraps" defaultOpen={false}>
                        {data ? (
                            <AdminAnalyticsCharts
                                chartData={data?.chartData || []}
                                trendSummary={data.trendSummary}
                                topDrops={data?.topDrops || []}
                                truthLabel={truthLabel}
                                truthVariant={truthVariant}
                                loading={isLoading && !data}
                            />
                        ) : (
                            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-6 text-sm text-red-100">
                                <AdminStatusBadge state={error ? "failed" : "unavailable"} className="mb-2" />
                                <div>{error?.message ?? "Revenue chart source is unavailable."}</div>
                            </div>
                        )}
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-5">
                    <AdminDashboardModule title="Recent transactions" defaultOpen={false}>
                        {data ? (
                            <RecentTransactionsPanel
                                transactions={data.recentTransactions}
                            />
                        ) : (
                            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                                <AdminStatusBadge state={error ? "failed" : "unavailable"} className="mb-2" />
                                <div>{error?.message ?? "Recent transactions source is unavailable."}</div>
                            </div>
                        )}
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-12">
                    <AdminDashboardModule title="Admin activity" defaultOpen={false}>
                        {data ? (
                            <AdminActivityLogPanel
                                activity={data.adminActivity}
                                lastAdminActivityAt={data.freshness.lastAdminActivityAt}
                                truthNote={data.truthNotes?.adminActivity}
                            />
                        ) : (
                            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                                <AdminStatusBadge state={error ? "failed" : "unavailable"} className="mb-2" />
                                <div>{error?.message ?? "Admin activity source is unavailable."}</div>
                            </div>
                        )}
                    </AdminDashboardModule>
                </div>
            </div>
        </div>
    );
}
