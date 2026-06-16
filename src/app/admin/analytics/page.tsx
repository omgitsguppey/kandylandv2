"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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
  AnalyticsViewModeToggle,
  MetricCard,
  type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import type { AdminAnalyticsSourceHierarchy } from "@/lib/analytics/admin-analytics-source-hierarchy";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { TELEMETRY_EVENT_LABELS } from "@/lib/telemetry-catalog";


import {
  RANGE_OPTIONS,
  TAB_OPTIONS,
} from "./AnalyticsHelpers";

const EVENT_LABELS: Record<string, string> = TELEMETRY_EVENT_LABELS;

import { useAdminAnalyticsState } from "./hooks/useAdminAnalyticsState";

type OverviewDisplayState = "ready" | "cached" | "refresh_due" | "stale" | "partial" | "unavailable" | "loading";
type AdminAnalyticsSourceHierarchySummary = Pick<AdminAnalyticsSourceHierarchy, "status" | "nextAction"> &
  Partial<Pick<AdminAnalyticsSourceHierarchy, "consumerSourceMismatches" | "blockedAnalyticsConsumers">>;

function mapOverviewDisplayStateToTruthState(displayState: OverviewDisplayState) {
  switch (displayState) {
    case "ready":
      return "live";
    case "cached":
    case "refresh_due":
      return "cached";
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

function formatPanelRecoveryCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

type PanelRecoveryTruthState =
  | "collecting"
  | "source_ready_waiting_for_activity"
  | "not_observed_but_expected"
  | "source_missing"
  | "materializer_missing"
  | "bridge_missing"
  | "runtime_evidence_required"
  | "admin_truth_source_required"
  | "provider_gated"
  | "external_required"
  | "broken";

function formatPanelRecoveryTruthState(state: PanelRecoveryTruthState) {
  switch (state) {
    case "source_ready_waiting_for_activity":
      return "ready, waiting";
    case "not_observed_but_expected":
      return "not observed yet";
    case "source_missing":
      return "source missing";
    case "materializer_missing":
      return "materializer missing";
    case "bridge_missing":
      return "bridge missing";
    case "runtime_evidence_required":
      return "runtime source needed";
    case "admin_truth_source_required":
      return "admin source needed";
    case "provider_gated":
      return "provider evidence required";
    case "external_required":
      return "external evidence required";
    case "broken":
      return "broken";
    case "collecting":
    default:
      return "collecting";
  }
}

function formatAnalyticsShellStateLabel(value: string | null | undefined) {
  switch (value) {
    case "aligned":
      return "Aligned";
    case "snapshot":
      return "Snapshot";
    case "partial":
      return "Partial snapshot";
    case "realtime":
      return "Realtime feed";
    case "live":
      return "Current";
    case "cached":
      return "Cached";
    case "stale":
      return "Refresh due";
    case "consumer_source_mismatch":
      return "Source mismatch";
    case "source_agreement_failed":
      return "Source agreement failed";
    case "not_enough_sources":
      return "More source evidence needed";
    case "failed":
      return "Unavailable";
    case "unavailable":
    case "missing":
    case "unknown":
    case "":
    case null:
    case undefined:
      return "Unknown";
    default:
      return value.replaceAll("_", " ");
  }
}

function formatSourceHierarchyCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatSourceHierarchySummary(sourceHierarchy: AdminAnalyticsSourceHierarchySummary) {
  const mismatchCount = sourceHierarchy.consumerSourceMismatches?.length ?? 0;
  const blockedCount = sourceHierarchy.blockedAnalyticsConsumers?.length ?? 0;

  if (mismatchCount > 0 && blockedCount > 0) {
    const repairVerb = mismatchCount === 1 ? "needs" : "need";
    const sourceLinkLabel = formatSourceHierarchyCount(mismatchCount, "source link");
    const blockedViewLabel = formatSourceHierarchyCount(blockedCount, "analytics view");
    return `${sourceLinkLabel} ${repairVerb} repair; ${blockedViewLabel} blocked.`;
  }

  if (mismatchCount > 0) {
    const repairVerb = mismatchCount === 1 ? "needs" : "need";
    return `${formatSourceHierarchyCount(mismatchCount, "source link")} ${repairVerb} repair.`;
  }

  if (blockedCount > 0) {
    return `${formatSourceHierarchyCount(blockedCount, "analytics view")} blocked by source evidence.`;
  }

  return null;
}

function formatAdminAnalyticsSourceNote(note: string) {
  return note
    .replace("No verified snapshot-first realtime payload is available yet.", "Current activity snapshot is still unavailable.")
    .replaceAll("Realtime analytics", "Current activity")
    .replaceAll("realtime payload", "current activity snapshot")
    .replaceAll("Historical analytics", "Historical snapshot");
}

function formatPanelRecoveryAction(action: string) {
  const sourceRepairMatch = action.match(/^([^:]+): Repair [^ ]+ so (.+)$/u);
  if (sourceRepairMatch) {
    return `${sourceRepairMatch[1]}: Reconnect the source so ${sourceRepairMatch[2]}`;
  }

  return action.replaceAll("source_missing", "source missing");
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
  const { range, activeViewerFilter, viewerUserFilter, showHistoricalEmptyState, blockingAnalyticsError, commerce, funnel, analyticsWarmState, liveSnapshotLabel, historicalSnapshotLabel, isBackgroundSyncing, needsSetup, activeTab, setActiveTab, liveLoading, historicalLoading, isPrimingAnalytics, liveResponse, backgroundAnalyticsIssues, visibleDegradedCopy, liveFeedStatus, liveFeedDetail, historicalTruthState, historicalSourceLabel, analyticsOverviewDisplayMetrics, adminAnalyticsSourceHierarchy } = state;
  const [mobileViewMode, setMobileViewMode] = useState<AnalyticsViewMode>("chart");
  const overviewSnapshotUnavailable = isKnownOverviewSnapshotUnavailable(blockingAnalyticsError);
  const sourceHierarchy: AdminAnalyticsSourceHierarchySummary = adminAnalyticsSourceHierarchy ?? {
    status: "unavailable",
    nextAction: "Analytics source hierarchy has not hydrated yet.",
  };
  const sourceHierarchyStatusLabel = formatAnalyticsShellStateLabel(sourceHierarchy.status);
  const sourceHierarchySummary = formatSourceHierarchySummary(sourceHierarchy);
  const liveFeedStatusLabel = formatAnalyticsShellStateLabel(liveFeedStatus);
  const historicalQualityLabel = formatAnalyticsShellStateLabel(historicalTruthState);
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
  const launchRecoveryRange = RANGE_OPTIONS.find((option) => option.value === "all");
  const activeTabLabel = TAB_OPTIONS.find((tab) => tab.id === activeTab)?.label ?? "Analytics";
  const sourceStatusItems = useMemo(() => {
    const items = [
      overviewSnapshotUnavailable ? "Overview snapshot unavailable" : null,
      ...visibleOverviewDegradedCopy,
      showHistoricalEmptyState ? "No events observed in this selected range" : null,
      isBackgroundSyncing ? "Background refresh running" : null,
    ]
      .filter((item): item is string => Boolean(item))
      .map(formatAdminAnalyticsSourceNote);

    return Array.from(new Set(items));
  }, [
    isBackgroundSyncing,
    overviewSnapshotUnavailable,
    showHistoricalEmptyState,
    visibleOverviewDegradedCopy,
  ]);
  const panelHydrationSummary = state.panelHydration?.summary;
  const connectedPanelCount = panelHydrationSummary?.hydrated ?? 0;
  const totalPanelCount = panelHydrationSummary?.totalPanels ?? 0;
  const panelRecoveryTruthItems: Array<{ state: PanelRecoveryTruthState; count: number }> = panelHydrationSummary
    ? ([
        { state: "collecting", count: panelHydrationSummary.collecting },
        { state: "source_ready_waiting_for_activity", count: panelHydrationSummary.sourceReadyWaitingForActivity },
        { state: "not_observed_but_expected", count: panelHydrationSummary.notObservedButExpected },
        { state: "source_missing", count: panelHydrationSummary.sourceMissing },
        { state: "materializer_missing", count: panelHydrationSummary.materializerMissing },
        { state: "bridge_missing", count: panelHydrationSummary.bridgeMissing },
        { state: "runtime_evidence_required", count: panelHydrationSummary.runtimeEvidenceRequired ?? 0 },
        { state: "admin_truth_source_required", count: panelHydrationSummary.adminTruthSourceRequired ?? 0 },
        { state: "provider_gated", count: panelHydrationSummary.providerGated ?? 0 },
        { state: "external_required", count: panelHydrationSummary.externalRequired },
        { state: "broken", count: panelHydrationSummary.broken },
      ] satisfies Array<{ state: PanelRecoveryTruthState; count: number }>).filter((item) => item.count > 0)
    : [];
  const panelRecoveryWaitingCount = panelRecoveryTruthItems
    .filter((item) =>
      item.state === "collecting" ||
      item.state === "source_ready_waiting_for_activity" ||
      item.state === "not_observed_but_expected",
    )
    .reduce((total, item) => total + item.count, 0);
  const panelRecoveryNeedsEvidenceCount = panelRecoveryTruthItems
    .filter((item) =>
      item.state !== "collecting" &&
      item.state !== "source_ready_waiting_for_activity" &&
      item.state !== "not_observed_but_expected",
    )
    .reduce((total, item) => total + item.count, 0);
  const panelRecoveryActions = panelHydrationSummary?.topNextActions ?? [];
  const showPanelRecovery =
    Boolean(panelHydrationSummary) &&
    (panelRecoveryTruthItems.length > 0 || connectedPanelCount < totalPanelCount);

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

      {state.isLocalAdminUiTestSession ? (
        <div
          className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
          data-admin-analytics-fixture-boundary="true"
          data-admin-analytics-fixture-state="source_missing"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-semibold text-white">Local UI review only.</span>{" "}
              Layout works here; analytics data waits for verified snapshots from a real
              admin session.
            </p>
          </div>
        </div>
      ) : null}

      {sourceHierarchy.status !== "aligned" ? (
        <div
          className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
          data-admin-analytics-source-hierarchy={sourceHierarchy.status}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Analytics source state: {sourceHierarchyStatusLabel}</p>
              {sourceHierarchySummary ? <p>{sourceHierarchySummary}</p> : null}
              <p>{sourceHierarchy.nextAction}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" data-mobile-organization="summary-first" data-admin-analytics-summary="primary">
        <MetricCard
          label="Active Users"
          value={analyticsOverviewDisplayMetrics.liveActive.displayValue}
          hint={analyticsOverviewDisplayMetrics.liveActive.compactFreshnessLine}
          icon={Activity}
          truthState={mapOverviewDisplayStateToTruthState(analyticsOverviewDisplayMetrics.liveActive.displayState)}
          statusBadgeLabel={analyticsOverviewDisplayMetrics.liveActive.badgeLabel}
          badgePlacement={analyticsOverviewDisplayMetrics.liveActive.showBadgeInPrimary ? "footer" : "hidden"}
          compactPrimary
          dictionaryTooltip="Current active users on the platform. If the current snapshot is delayed, this card shows the last verified short-window count."
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

      <div
        className="rounded-lg border border-white/10 bg-black/35 p-2.5"
        data-admin-analytics-recovery-range="all"
        data-admin-analytics-mobile-view-mode={mobileViewMode}
        data-mobile-drilldown="true"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Data status</p>
            <p className="mt-1 text-xs font-semibold text-white">
              {activeTabLabel} view - {historicalSourceLabel || "Historical source pending"}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-gray-400">
              Use {launchRecoveryRange?.label ?? "All"} on a section when you need launch-to-now history. Missing samples stay labeled; estimates never count as verified zero.
            </p>
          </div>
          <AnalyticsViewModeToggle value={mobileViewMode} onChange={setMobileViewMode} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-300 md:grid-cols-4">
          <div className="rounded-md border border-white/10 bg-black/25 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-[0.12em] text-gray-500">Current</p>
            <p className="truncate font-semibold text-white">{liveSnapshotLabel}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/25 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-[0.12em] text-gray-500">Historical</p>
            <p className="truncate font-semibold text-white">{historicalSnapshotLabel}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/25 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-[0.12em] text-gray-500">Source</p>
            <p className="truncate font-semibold text-white">{liveFeedStatusLabel}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/25 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-[0.12em] text-gray-500">Quality</p>
            <p className="truncate font-semibold text-white">{historicalQualityLabel}</p>
          </div>
        </div>
        {sourceStatusItems.length > 0 ? (
          <details
            className="mt-2 rounded-md border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-100"
            title={backgroundAnalyticsIssues.join(" | ")}
          >
            <summary className="min-h-9 cursor-pointer pt-2 font-semibold">Source notes ({sourceStatusItems.length})</summary>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {sourceStatusItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {liveFeedDetail ? (
              <p className="mt-2 text-amber-200/80">{formatAdminAnalyticsSourceNote(liveFeedDetail)}</p>
            ) : null}
          </details>
        ) : null}
        {showPanelRecovery ? (
          <div
            className="mt-2 rounded-md border border-white/10 bg-black/25 px-2.5 py-2 text-xs text-gray-200"
            data-admin-analytics-panel-recovery="compact"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-white">Panel status</p>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-300">
                <span>{connectedPanelCount}/{totalPanelCount} connected</span>
                {panelRecoveryWaitingCount > 0 ? <span>{panelRecoveryWaitingCount} waiting</span> : null}
                {panelRecoveryNeedsEvidenceCount > 0 ? <span>{panelRecoveryNeedsEvidenceCount} need source</span> : null}
              </div>
            </div>
            {panelRecoveryTruthItems.length > 0 ? (
              <details className="mt-2 text-[11px] text-gray-300">
                <summary className="min-h-8 cursor-pointer pt-1 font-semibold text-gray-100">
                  Status details
                </summary>
                <ul className="mt-1 grid gap-1 pl-0 sm:grid-cols-2">
                  {panelRecoveryTruthItems.map((item) => {
                    const label = formatPanelRecoveryTruthState(item.state);
                    return (
                      <li
                        key={item.state}
                        className="list-none rounded-md border border-white/10 bg-black/20 px-2 py-1"
                        data-panel-recovery-truth-state={item.state}
                      >
                        {formatPanelRecoveryCount(item.count, label, label)}
                      </li>
                    );
                  })}
                </ul>
              </details>
            ) : null}
            {panelRecoveryActions.length > 0 ? (
              <details className="mt-2 text-[11px] text-gray-300">
                <summary className="min-h-8 cursor-pointer pt-1 font-semibold text-gray-100">
                  Next actions
                </summary>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {panelRecoveryActions.slice(0, 3).map((action) => (
                    <li key={action} title={action}>{formatPanelRecoveryAction(action)}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
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

      <span className="sr-only" data-admin-analytics-overview-status={overviewSnapshotUnavailable ? "snapshot-unavailable" : "connected"}>
        {overviewSnapshotUnavailable ? "Overview snapshot unavailable. Showing available confirmed metrics." : "Overview snapshot connected."}
      </span>

      {primaryBlockingAnalyticsError && (
        <div className="rounded-[1.8rem] border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-300">
            {formatAdminAnalyticsSourceNote(primaryBlockingAnalyticsError.message || "Analytics request failed.")}
          </p>
        </div>
      )}

      {backgroundAnalyticsIssues.length > 0 && !primaryBlockingAnalyticsError && sourceStatusItems.length === 0 ? (
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

      {showHistoricalEmptyState && sourceStatusItems.length === 0 ? (
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

      <main className="space-y-3 md:space-y-5" data-mobile-drilldown="true" data-admin-analytics-view-mode={mobileViewMode}>
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
