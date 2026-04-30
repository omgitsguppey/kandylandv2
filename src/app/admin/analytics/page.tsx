"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  Loader2,
  ShoppingBag,
  Smartphone,
} from "lucide-react";






import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import {
  MetricCard,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { TELEMETRY_EVENT_LABELS } from "@/lib/telemetry-catalog";


import {
  TAB_OPTIONS,
  formatCompactNumber,
} from "./AnalyticsHelpers";

const EVENT_LABELS: Record<string, string> = TELEMETRY_EVENT_LABELS;

import { useAdminAnalyticsState } from "./hooks/useAdminAnalyticsState";

const AdminAnalyticsOperationsTab = dynamic(
  () => import("./components/AdminAnalyticsOperationsTab").then((module) => module.AdminAnalyticsOperationsTab),
);
const AdminAnalyticsAudienceTab = dynamic(
  () => import("./components/AdminAnalyticsAudienceTab").then((module) => module.AdminAnalyticsAudienceTab),
);
const AdminAnalyticsCommerceTab = dynamic(
  () => import("./components/AdminAnalyticsCommerceTab").then((module) => module.AdminAnalyticsCommerceTab),
);
const AdminTaskAndNotificationModules = dynamic(
  () => import("@/components/Admin/Analytics/AdminTaskAndNotificationModules").then((module) => ({ default: module.AdminTaskAndNotificationModules })),
);
export default function AdminAnalyticsPage() {
    const state = useAdminAnalyticsState();
  const { range, activeViewerFilter, viewerUserFilter, showHistoricalEmptyState, blockingAnalyticsError, mobileUsers, commerce, funnel, analyticsWarmState, liveSnapshotLabel, historicalSnapshotLabel, isBackgroundSyncing, needsSetup, activeTab, setActiveTab, liveLoading, historicalLoading, isPrimingAnalytics, liveResponse, backgroundAnalyticsIssues, visibleDegradedCopy, liveFeedStatus, liveFeedDetail, liveGuestActiveCount, historicalTruthState, historicalSourceLabel, historicalOverviewSourceLabel, revenueDisplay, purchasesDisplay, mobileShareDisplay, liveActiveDisplay, liveActiveTruthState, historicalOverviewTruthState, overviewCheckoutStarts = 0 } = state;
  useEffect(() => {
    (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__?: unknown;
      __KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__?: unknown;
    }).__KANDYDROPS_ADMIN_ANALYTICS_OVERVIEW_DEBUG__ =
      state.analyticsOverviewDebugMeta;
    (window as typeof window & {
      __KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__?: unknown;
    }).__KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__ =
      state.analyticsSnapshotMigrationDebug;
  }, [state.analyticsOverviewDebugMeta, state.analyticsSnapshotMigrationDebug]);
  const handleClearAllFilters = state.clearAllFilters ?? (() => {
    reportClientIssue({
      channel: "runtime",
      severity: "error",
      message: "Admin analytics missing clear-all filter handler",
      detail: {
        surface: "admin-analytics",
        qualityLabel: "failed",
      },
      consoleLabel: "[Admin Analytics] Missing clear-all filter handler",
    });
  });
  const handleClearViewerFilter = state.clearViewerFilter ?? handleClearAllFilters;

  if (needsSetup) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="glass-panel max-w-xl rounded-[2rem] border border-red-500/20 p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/10 text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Analytics Needs GA Setup
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Add <code>GA_PROPERTY_ID</code> to the environment so the admin
            analytics console can query Google Analytics 4.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:space-y-5 md:pb-8">
      <PageViewEvent eventName="admin_analytics_viewed" />
      <AdminPageHeader
        eyebrow="Admin Analytics"
        title="Analytics Overview"
        subtitle="Server-confirmed activity, revenue, and mobile usage."
        compact
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MetricCard
          label="Live Active"
          value={liveActiveDisplay}
          hint={liveFeedStatus === "realtime"
            ? `${formatCompactNumber(liveGuestActiveCount ?? 0)} guests · Firestore realtime`
            : liveResponse?.liveTruthLabel === "fallback"
              ? "30 min window · polled fallback"
              : "30 min window"}
          icon={Activity}
          truthState={liveActiveTruthState}
          dictionaryTooltip="Current active users on the platform. Can be live via canonical realtime tracking or fall back to historical tracking over 30 mins."
        />
        <MetricCard
          label="Mobile Share"
          value={mobileShareDisplay}
          hint={historicalOverviewTruthState !== "unavailable" ? `${mobileUsers.toLocaleString()} mobile users in range` : historicalOverviewSourceLabel}
          icon={Smartphone}
          truthState={historicalOverviewTruthState}
          dictionaryTooltip="Percentage of visitors in this time range who are on mobile devices. Essential for guiding responsive design priority."
        />
        <MetricCard
          label="Revenue"
          value={revenueDisplay}
          hint={historicalOverviewSourceLabel}
          icon={DollarSign}
          truthState={historicalOverviewTruthState}
          dictionaryTooltip="Total top-line revenue measured in USD across all confirmed transactions within the range. Does not subtract platform fees."
        />
        <MetricCard
          label="Purchases"
          value={purchasesDisplay}
          hint={historicalOverviewTruthState !== "unavailable" ? `${overviewCheckoutStarts.toLocaleString()} checkout starts · ${historicalOverviewSourceLabel}` : historicalOverviewSourceLabel}
          icon={ShoppingBag}
          truthState={historicalOverviewTruthState}
          dictionaryTooltip="Number of distinct successful purchases completed. Compare to checkout starts to monitor conversion dropout."
        />
      </div>

      <div className="sticky top-[8.6rem] z-20 space-y-2.5 rounded-[1.4rem] border border-white/10 bg-black/65 p-2.5 backdrop-blur-xl md:top-24">
        

        

        <div className="flex flex-wrap gap-1.5">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors",
                  active
                    ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                    : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:text-white",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    active ? "text-brand-purple" : "text-gray-500",
                  )}
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {viewerUserFilter ? (
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300 transition-colors hover:border-brand-purple/40 hover:text-white"
          >
            Clear filter
          </button>
        ) : null}
      </div>

      {blockingAnalyticsError && (
        <div className="rounded-[1.8rem] border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-300">
            {blockingAnalyticsError.message || "Analytics request failed."}
          </p>
        </div>
      )}

      {backgroundAnalyticsIssues.length > 0 && !blockingAnalyticsError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <div
            className="min-w-0 space-y-0.5 text-xs text-amber-200"
            title={backgroundAnalyticsIssues.join(" | ")}
          >
            <p>
              <span className="font-semibold">Degraded:</span>{" "}
              {visibleDegradedCopy[0] ?? "Analytics is delayed. Showing the last validated snapshot."}
            </p>
            {visibleDegradedCopy[1] ? <p>{visibleDegradedCopy[1]}</p> : null}
          </div>
        </div>
      ) : null}

      {showHistoricalEmptyState ? (
        <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                No analytics landed for this window yet.
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {activeViewerFilter
                  ? `No tracked events matched ${activeViewerFilter.startsWith("@") ? activeViewerFilter : `@${activeViewerFilter}`} in ${range.toUpperCase()}.`
                  : `No tracked events were found in ${range.toUpperCase()}.`}{" "}
                This usually means the selected window is too narrow for the
                current dataset, or this environment only has older seeded
                analytics.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {viewerUserFilter ? (
                <button
                  type="button"
                  onClick={handleClearViewerFilter}
                  className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300 transition-colors hover:border-white/30 hover:text-white"
                >
                  Clear viewer filter
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isPrimingAnalytics ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            <p className="text-sm text-gray-500">Syncing analytics...</p>
          </div>
        </div>
      ) : null}

      <main className="space-y-4 md:space-y-5">
        {state.activeTab === "operations" ? <AdminAnalyticsOperationsTab {...state} /> : null}
        {state.activeTab === "audience" ? <AdminAnalyticsAudienceTab {...state} /> : null}
        {state.activeTab === "commerce" ? <AdminAnalyticsCommerceTab {...state} /> : null}

        <AdminTaskAndNotificationModules
          renderSectionRangeControl={state.renderSectionRangeControl}
          dailyTaskPipelineModel={state.dailyTaskPipelineModel}
          notificationFunnelModel={state.notificationFunnelModel}
          formatDuration={state.formatDuration}
          formatPercent={state.formatPercent}
        />

        </main>
    </div>
  );
}
