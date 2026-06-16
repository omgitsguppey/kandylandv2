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
import { useAuth } from "@/context/AuthContext";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { coerceAdminSurfaceState } from "@/lib/admin-parity";
import { buildAdminOverviewPageData } from "@/lib/server/admin-page-data-loader";

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);
    const { data, error, isLoading } = useAdminOverview({ enabled: !isLocalAdminUiTestSession });
    const pageData = buildAdminOverviewPageData({
        data,
        error,
        isLoading: isLocalAdminUiTestSession ? false : isLoading,
    });
    const fixtureFallbackClassName = "rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100";
    const overviewLoadState = pageData.fallbackState;
    const overviewFallbackClassName = overviewLoadState === "failed"
        ? "rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-sm text-red-100"
        : overviewLoadState === "loading"
            ? "rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-4 text-sm text-sky-100"
            : "rounded-xl border border-slate-400/20 bg-slate-500/10 px-4 py-4 text-sm text-slate-100";
    const truthVariant = isLocalAdminUiTestSession ? "unavailable" : coerceAdminSurfaceState(pageData.truthState) ?? "unavailable";
    const sourceMissingPanel = (
        <div className={fixtureFallbackClassName}>
            <AdminStatusBadge state="unavailable" className="mb-2" label="Source missing" />
            <div>Verified admin records are not loaded in local UI review.</div>
        </div>
    );


    return (
        <div className="space-y-3 md:space-y-4">
            <PageViewEvent eventName="admin_dashboard_viewed" />
            <PageViewEvent eventName="admin_overview_viewed" />
            <AdminPageHeader
                eyebrow={null}
                title="Admin Overview"
                subtitle={isLocalAdminUiTestSession ? "Local UI review only. Verified overview data is not loaded." : pageData.serverUpdateLabel}
                compact
                actions={(
                    <div className="flex items-center gap-2">
                        <AdminStatusBadge state={truthVariant} label={isLocalAdminUiTestSession ? "Source missing" : undefined} />
                        <span className="text-[11px] font-semibold text-gray-400">{isLocalAdminUiTestSession ? "Local fixture only" : pageData.truthLabel}</span>
                    </div>
                )}
            />

            {isLocalAdminUiTestSession ? (
                <div
                    className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                    data-admin-overview-fixture-boundary="true"
                    data-admin-overview-fixture-state="source_missing"
                >
                    <p className="font-bold">Local admin UI review only.</p>
                    <p className="mt-1 text-xs leading-5 text-amber-100/80">
                        Overview layout is inspectable; platform pulse, drop queue, revenue, transactions, and admin activity require a real admin session before they can show verified snapshots.
                    </p>
                </div>
            ) : null}

            <div className="grid gap-3 xl:grid-cols-12">
                <div className="xl:col-span-12">
                    <AdminDashboardModule title="Platform pulse" defaultOpen={true}>
                        {isLocalAdminUiTestSession ? sourceMissingPanel : data ? (
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
                        {isLocalAdminUiTestSession ? sourceMissingPanel : <AdminDropsAtGlancePanel />}
                    </AdminDashboardModule>
                </div>

                <div className="xl:col-span-7">
                    <AdminDashboardModule title="Revenue + Unwraps" defaultOpen={false}>
                        {isLocalAdminUiTestSession ? sourceMissingPanel : data ? (
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
                        {isLocalAdminUiTestSession ? sourceMissingPanel : data ? (
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
                        {isLocalAdminUiTestSession ? sourceMissingPanel : data ? (
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
