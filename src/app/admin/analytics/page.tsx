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
} from "./AnalyticsHelpers";

const EVENT_LABELS: Record<string, string> = TELEMETRY_EVENT_LABELS;

import { useAdminAnalyticsState } from "./hooks/useAdminAnalyticsState";

type OverviewDisplayState = "ready" | "stale" | "partial" | "unavailable" | "loading";

function mapOverviewDisplayStateToTruthState(displayState: OverviewDisplayState) {
  switch (displayState) {
    case "ready":
      return "live";
    case "stale":
      return "stale";
    case "partial":
      return "degraded";
    case "loading":
      return "loading";
    case "unavailable":
    default:
      return "unavailable";
  }
}

function isKnownOverviewSnapshotUnavailable(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";
  return (
    message.includes("No verified admin metric snapshot display payload") ||
    message.includes("platform_pulse")
  );
}

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
  const { range, activeViewerFilter, viewerUserFilter, showHistoricalEmptyState, blockingAnalyticsError, commerce, funnel, analyticsWarmState, liveSnapshotLabel, historicalSnapshotLabel, isBackgroundSyncing, needsSetup, activeTab, setActiveTab, liveLoading, historicalLoading, isPrimingAnalytics, liveResponse, backgroundAnalyticsIssues, visibleDegradedCopy, liveFeedStatus, liveFeedDetail, historicalTruthState, historicalSourceLabel, analyticsOverviewDisplayMetrics } = state;
  const overviewSnapshotUnavailable = isKnownOverviewSnapshotUnavailable(blockingAnalyticsError);
  const primaryBlockingAnalyticsError = overviewSnapshotUnavailable ? null : blockingAnalyticsError;
  const visibleOverviewDegradedCopy = (visibleDegradedCopy ?? []).filter(
    (copy) =>
      !copy.includes("platform_pulse") &&
      !copy.includes("No verified admin metric snapshot display payload"),
  );
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
    <div
      className="space-y-4 pb-20 md:space-y-5 md:pb-8"
      data-mobile-organization="summary-first"
      data-mobile-drilldown="true"
      data-desktop-flow-collapsed="true"
      data-admin-mobile-surface="analytics"
    >
      <PageViewEvent eventName="admin_analytics_viewed" />
      <AdminPageHeader
        eyebrow="Admin Analytics"
        title="Analytics Overview"
        subtitle="Server-confirmed activity, revenue, and mobile usage."
        compact
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" data-mobile-organization="summary-first" data-admin-analytics-summary="primary">
        <MetricCard
          label="Live Active"
          value={analyticsOverviewDisplayMetrics.liveActive.displayValue}
          hint={analyticsOverviewDisplayMetrics.liveActive.compactFreshnessLine}
          icon={Activity}
          truthState={mapOverviewDisplayStateToTruthState(analyticsOverviewDisplayMetrics.liveActive.displayState)}
          statusBadgeLabel={analyticsOverviewDisplayMetrics.liveActive.badgeLabel}
          badgePlacement={analyticsOverviewDisplayMetrics.liveActive.showBadgeInPrimary ? "footer" : "hidden"}
          compactPrimary
          dictionaryTooltip="Current active users on the platform. If live updates are delayed, this card shows the last verified short-window count."
        />
        <MetricCard
          label="Mobile Share"
          value={analyticsOverviewDisplayMetrics.mobileShare.displayValue}
          hint={analyticsOverviewDisplayMetrics.mobileShare.compactFreshnessLine}
          icon={Smartphone}
          truthState={mapOverviewDisplayStateToTruthState(analyticsOverviewDisplayMetrics.mobileShare.displayState)}
          statusBadgeLabel={analyticsOverviewDisplayMetrics.mobileShare.badgeLabel}
          badgePlacement={analyticsOverviewDisplayMetrics.mobileShare.showBadgeInPrimary ? "footer" : "hidden"}
          compactPrimary
          dictionaryTooltip="Percentage of visitors in this time range who are on mobile devices. Essential for guiding responsive design priority."
        />
        <MetricCard
          label="Revenue"
          value={analyticsOverviewDisplayMetrics.revenue.displayValue}
          hint={analyticsOverviewDisplayMetrics.revenue.compactFreshnessLine}
          icon={DollarSign}
          truthState={mapOverviewDisplayStateToTruthState(analyticsOverviewDisplayMetrics.revenue.displayState)}
          statusBadgeLabel={analyticsOverviewDisplayMetrics.revenue.badgeLabel}
          badgePlacement={analyticsOverviewDisplayMetrics.revenue.showBadgeInPrimary ? "footer" : "hidden"}
          compactPrimary
          dictionaryTooltip="Total top-line revenue measured in USD across all confirmed transactions within the range. Does not subtract platform fees."
        />
        <MetricCard
          label="Purchases"
          value={analyticsOverviewDisplayMetrics.purchases.displayValue}
          hint={analyticsOverviewDisplayMetrics.purchases.compactFreshnessLine}
          icon={ShoppingBag}
          truthState={mapOverviewDisplayStateToTruthState(analyticsOverviewDisplayMetrics.purchases.displayState)}
          statusBadgeLabel={analyticsOverviewDisplayMetrics.purchases.badgeLabel}
          badgePlacement={analyticsOverviewDisplayMetrics.purchases.showBadgeInPrimary ? "footer" : "hidden"}
          compactPrimary
          dictionaryTooltip="Number of distinct successful purchases completed. Compare to checkout starts to monitor conversion dropout."
        />
      </div>

      <div className="z-20 space-y-2 rounded-[1.1rem] border border-white/10 bg-black/65 p-2 backdrop-blur-xl md:sticky md:top-24 md:space-y-2.5 md:rounded-[1.4rem] md:p-2.5" data-mobile-drilldown="true" data-desktop-flow-collapsed="true">
        

        

        <div className="flex flex-wrap gap-1.5">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={active}
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

      {overviewSnapshotUnavailable ? (
        <div
          className="rounded-[1.1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-gray-300"
          data-admin-analytics-overview-status="snapshot-unavailable"
        >
          Overview snapshot unavailable. Showing available confirmed metrics.
        </div>
      ) : null}

      {primaryBlockingAnalyticsError && (
        <div className="rounded-[1.8rem] border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-300">
            {primaryBlockingAnalyticsError.message || "Analytics request failed."}
          </p>
        </div>
      )}

      {backgroundAnalyticsIssues.length > 0 && !primaryBlockingAnalyticsError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <div
              className="min-w-0 space-y-0.5 text-xs text-amber-200"
              title={visibleOverviewDegradedCopy.join(" | ")}
            >
            <p>
              <span className="font-semibold">Needs attention:</span>{" "}
              {visibleOverviewDegradedCopy[0] ?? "Analytics is delayed. Showing last verified data."}
            </p>
            {visibleOverviewDegradedCopy[1] ? <p>{visibleOverviewDegradedCopy[1]}</p> : null}
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

      <main className="space-y-4 md:space-y-5" data-mobile-drilldown="true">
        {state.activeTab === "operations" ? <AdminAnalyticsOperationsTab {...state} /> : null}
        {state.activeTab === "audience" ? <AdminAnalyticsAudienceTab {...state} /> : null}
        {state.activeTab === "commerce" ? <AdminAnalyticsCommerceTab {...state} /> : null}

        <details className="rounded-[1.1rem] border border-white/10 bg-black/35 p-3" data-mobile-drilldown="true" data-desktop-flow-collapsed="true">
          <summary className="cursor-pointer text-sm font-bold text-white">Task and notification drilldowns</summary>
          <div className="mt-3">
            <AdminTaskAndNotificationModules
              renderSectionRangeControl={state.renderSectionRangeControl}
              dailyTaskPipelineModel={state.dailyTaskPipelineModel}
              notificationFunnelModel={state.notificationFunnelModel}
              formatDuration={state.formatDuration}
              formatPercent={state.formatPercent}
            />
          </div>
        </details>

        </main>
    </div>
  );
}
