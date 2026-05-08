"use client";
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
import { coerceAdminSurfaceState } from "@/lib/admin-parity";
import { buildAdminOverviewPageData } from "@/lib/server/admin-page-data-loader";

export default function AdminDashboardPage() {
    const { data, error, isLoading } = useAdminOverview();
    const pageData = buildAdminOverviewPageData({ data, error, isLoading });
    const overviewLoadState = pageData.fallbackState;
    const overviewFallbackClassName = overviewLoadState === "failed"
        ? "rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100"
        : overviewLoadState === "loading"
            ? "rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-4 text-sm text-sky-100"
            : "rounded-xl border border-slate-400/20 bg-slate-500/10 px-4 py-4 text-sm text-slate-100";
    const truthVariant = coerceAdminSurfaceState(pageData.truthState) ?? "unavailable";


    return (
        <div className="space-y-3 md:space-y-4">
            <PageViewEvent eventName="admin_dashboard_viewed" />
            <PageViewEvent eventName="admin_overview_viewed" />
            <AdminPageHeader
                eyebrow={null}
                title="Admin Overview"
                subtitle={pageData.serverUpdateLabel}
                compact
                actions={(
                    <div className="flex items-center gap-2">
                        <AdminStatusBadge state={truthVariant} />
                        <span className="text-[11px] font-semibold text-gray-400">{pageData.truthLabel}</span>
                    </div>
                )}
            />

            <div className="grid gap-3 xl:grid-cols-12">
                <div className="xl:col-span-12">
                    <AdminDashboardModule title="Platform pulse" defaultOpen={true}>
                        {data ? (
                            <AdminStatsBar
                                platformPulse={pageData.platformPulse}
                                overviewIssues={data.overviewIssues}
                                truthState={pageData.truthState}
                            />
                        ) : (
                            <div className={overviewFallbackClassName}>
                                <AdminStatusBadge state={overviewLoadState} className="mb-2" />
                                <div>{pageData.fallbackMessage}</div>
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
                                truthLabel={pageData.truthLabel}
                                truthVariant={truthVariant}
                                loading={isLoading && !data}
                            />
                        ) : (
                            <div className={overviewFallbackClassName}>
                                <AdminStatusBadge state={overviewLoadState} className="mb-2" />
                                <div>{error?.message ?? (isLoading ? "Loading revenue chart source." : "Revenue chart source has no verified snapshot yet.")}</div>
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
                            <div className={overviewFallbackClassName}>
                                <AdminStatusBadge state={overviewLoadState} className="mb-2" />
                                <div>{error?.message ?? (isLoading ? "Loading recent transactions source." : "Recent transactions source has no verified snapshot yet.")}</div>
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
                            <div className={overviewFallbackClassName}>
                                <AdminStatusBadge state={overviewLoadState} className="mb-2" />
                                <div>{error?.message ?? (isLoading ? "Loading admin activity source." : "Admin activity source has no verified snapshot yet.")}</div>
                            </div>
                        )}
                    </AdminDashboardModule>
                </div>
            </div>
        </div>
    );
}
