"use client";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminActivityLogPanel } from "@/components/Admin/AdminActivityLogPanel";
import { AdminAnalyticsCharts } from "@/components/Admin/AdminAnalyticsCharts";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { AdminDropsAtGlancePanel } from "@/components/Admin/AdminDropsAtGlancePanel";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { AdminStatsBar } from "@/components/Admin/AdminStatsBar";
import { RecentTransactionsPanel } from "@/components/Admin/RecentTransactionsPanel";
import { AdminControlTowerLanding } from "@/components/creative-tim/kandydrops/admin/AdminControlTowerLanding";
import { useAuth } from "@/context/AuthContext";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
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
    const fixtureFallbackClassName = "rounded-xl bg-warning/10 px-4 py-4 text-sm text-warning";
    const overviewLoadState = pageData.fallbackState;
    const overviewFallbackClassName = overviewLoadState === "failed"
        ? "rounded-xl bg-destructive/10 px-4 py-4 text-sm text-destructive"
        : overviewLoadState === "loading"
            ? "rounded-xl bg-info/10 px-4 py-4 text-sm text-info"
            : "rounded-xl bg-muted px-4 py-4 text-sm text-muted-foreground";
    const truthVariant = isLocalAdminUiTestSession ? "unavailable" : coerceAdminSurfaceState(pageData.truthState) ?? "unavailable";
    const sourceMissingPanel = (
        <div className={fixtureFallbackClassName}>
            <AdminStatusBadge state="unavailable" className="mb-2" label="No source" />
            <div>source_missing: overview source is not loaded in this fixture.</div>
        </div>
    );
    const fixtureNotice = isLocalAdminUiTestSession ? (
        <div
            className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning"
            data-admin-overview-fixture-boundary="true"
            data-admin-overview-fixture-state="source_missing"
        >
            <p className="font-bold">source_missing fixture.</p>
            <p className="mt-1 text-xs leading-5 text-warning">
                source_missing: layout is visible; verified overview data remains unavailable in this fixture.
            </p>
        </div>
    ) : null;

    return (
        <>
            <PageViewEvent eventName="admin_dashboard_viewed" />
            <PageViewEvent eventName="admin_overview_viewed" />
            <AdminControlTowerLanding
                subtitle={isLocalAdminUiTestSession ? "source_missing fixture. Verified overview data is not loaded." : pageData.serverUpdateLabel}
                truthLabel={isLocalAdminUiTestSession ? "Local fixture only" : pageData.truthLabel}
                fixtureNotice={fixtureNotice}
                evidenceStatus={(
                    <AdminStatusBadge state={truthVariant} label={isLocalAdminUiTestSession ? "No source" : undefined} />
                )}
            >
                <div className="min-w-0 space-y-6 md:space-y-8">
                    <div className="min-w-0">
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

                    <div className="min-w-0">
                        <AdminDashboardModule title="Drops at a glance" defaultOpen={false}>
                            {isLocalAdminUiTestSession ? sourceMissingPanel : <AdminDropsAtGlancePanel />}
                        </AdminDashboardModule>
                    </div>

                    <div className="min-w-0">
                        <AdminDashboardModule title="Revenue + Unwraps" defaultOpen={false}>
                            {isLocalAdminUiTestSession ? sourceMissingPanel : data && data.verification?.status !== "unavailable" ? (
                                <AdminAnalyticsCharts
                                    chartData={data.chartData || []}
                                    trendSummary={data.trendSummary}
                                    topDrops={data.topDrops || []}
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

                    <div className="min-w-0">
                        <AdminDashboardModule title="Recent transactions" defaultOpen={false}>
                            {isLocalAdminUiTestSession ? sourceMissingPanel : data && data.verification?.status !== "unavailable" ? (
                                <RecentTransactionsPanel transactions={data.recentTransactions} />
                            ) : (
                                <div className={overviewFallbackClassName}>
                                    <AdminStatusBadge state={overviewLoadState} className="mb-2" />
                                    <div>{error?.message ?? (isLoading ? "Loading recent transactions source." : "Recent transactions source has no verified snapshot yet.")}</div>
                                </div>
                            )}
                        </AdminDashboardModule>
                    </div>

                    <div className="min-w-0">
                        <AdminDashboardModule title="Admin activity" defaultOpen={false}>
                            {isLocalAdminUiTestSession ? sourceMissingPanel : data && data.verification?.status !== "unavailable" ? (
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
            </AdminControlTowerLanding>
        </>
    );
}
