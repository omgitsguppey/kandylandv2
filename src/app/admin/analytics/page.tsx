"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  Loader2,
  ShoppingBag,
  Smartphone,
} from "lucide-react";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminAnalyticsEvidenceCanvas } from "@/components/creative-tim/kandydrops/admin-analytics/AdminAnalyticsEvidenceCanvas";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import type {
  AdminAnalyticsConsumerDisplayState,
  AdminAnalyticsSourceHierarchy,
  AdminAnalyticsSourceHierarchyConsumer,
} from "@/lib/analytics/admin-analytics-source-hierarchy";
import { reportClientIssue } from "@/lib/client-error-reporting";

import {
  RANGE_OPTIONS,
  TAB_OPTIONS,
} from "./AnalyticsHelpers";

import { useAdminAnalyticsState } from "./hooks/useAdminAnalyticsState";

type OverviewDisplayState = "ready" | "cached" | "refresh_due" | "partial" | "unavailable" | "loading";
type AdminAnalyticsSourceHierarchySummary = Pick<AdminAnalyticsSourceHierarchy, "status" | "nextAction"> &
  Partial<Pick<AdminAnalyticsSourceHierarchy, "consumerSourceMismatches" | "blockedAnalyticsConsumers" | "consumers">>;

function mapOverviewDisplayStateToTruthState(displayState: OverviewDisplayState) {
  switch (displayState) {
    case "ready":
      return "live";
    case "cached":
    case "refresh_due":
      return "cached";
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

function formatPanelRecoveryStateCount(count: number, label: string) {
  return `${count} ${count === 1 ? "panel" : "panels"}: ${label}`;
}

type PanelRecoveryTruthState =
  | "collecting"
  | "source_ready_collecting"
  | "not_observed_but_expected"
  | "source_missing"
  | "materializer_missing"
  | "bridge_missing"
  | "stale"
  | "permission_blocked"
  | "hidden_by_role"
  | "runtime_evidence_required"
  | "admin_truth_source_required"
  | "provider_gated"
  | "protected_payment_required"
  | "external_required"
  | "broken";

function formatPanelRecoveryTruthState(state: PanelRecoveryTruthState) {
  switch (state) {
    case "source_ready_collecting":
      return "collecting activity";
    case "not_observed_but_expected":
      return "no recent activity";
    case "source_missing":
      return "source missing";
    case "materializer_missing":
      return "materializer missing";
    case "bridge_missing":
      return "bridge missing";
    case "stale":
      return "stale source";
    case "permission_blocked":
      return "permission blocked";
    case "hidden_by_role":
      return "hidden by role";
    case "runtime_evidence_required":
      return "deployed route evidence required";
    case "admin_truth_source_required":
      return "admin source activity sample required";
    case "provider_gated":
      return "provider-backed activity required";
    case "protected_payment_required":
      return "protected payment proof required";
    case "external_required":
      return "external source required";
    case "broken":
      return "source failed";
    case "collecting":
    default:
      return "collecting";
  }
}

function groupPanelRecoveryTruthItems(items: Array<{ state: PanelRecoveryTruthState; count: number }>) {
  const groups = new Map<string, { label: string; count: number; states: PanelRecoveryTruthState[] }>();

  for (const item of items) {
    const label = formatPanelRecoveryTruthState(item.state);
    const existing = groups.get(label) ?? { label, count: 0, states: [] };
    existing.count += item.count;
    existing.states.push(item.state);
    groups.set(label, existing);
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    primaryState: group.states.includes("external_required") ? "external_required" : group.states[0],
  }));
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
      return "Current activity";
    case "live":
      return "Current";
    case "cached":
      return "Cached";
    case "loading":
      return "Hydrating";
    case "stale":
      return "Refresh due";
    case "consumer_source_mismatch":
      return "Source mismatch";
    case "source_agreement_failed":
      return "Source needs repair";
    case "not_enough_sources":
      return "Collecting source coverage";
    case "failed":
      return "Not connected";
    case "unavailable":
    case "missing":
    case "unknown":
    case "":
    case null:
    case undefined:
      return "No source";
    default:
      return value.replaceAll("_", " ");
  }
}

function formatSourceHierarchyCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function labelForSourceHierarchyDisplayState(state: AdminAnalyticsConsumerDisplayState) {
  switch (state) {
    case "second_source_only":
      return "second-source views";
    case "chart_promotion_blocked":
      return "charts waiting for source coverage";
    case "consumer_source_mismatch":
      return "source mismatch";
    case "source_missing":
      return "source missing";
    case "connected":
    default:
      return "connected";
  }
}

function sourceHierarchyStatePriority(state: AdminAnalyticsConsumerDisplayState) {
  switch (state) {
    case "source_missing":
      return 0;
    case "second_source_only":
      return 1;
    case "chart_promotion_blocked":
      return 2;
    case "consumer_source_mismatch":
      return 3;
    case "connected":
    default:
      return 4;
  }
}

function groupedSourceHierarchyConsumers(consumers: AdminAnalyticsSourceHierarchyConsumer[] | undefined) {
  const groups = new Map<AdminAnalyticsConsumerDisplayState, AdminAnalyticsSourceHierarchyConsumer[]>();
  for (const consumer of consumers ?? []) {
    if (consumer.displayState === "connected") continue;
    const existing = groups.get(consumer.displayState) ?? [];
    existing.push(consumer);
    groups.set(consumer.displayState, existing);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => sourceHierarchyStatePriority(a) - sourceHierarchyStatePriority(b));
}

function formatSourceHierarchyConsumerSummary(consumers: AdminAnalyticsSourceHierarchyConsumer[] | undefined) {
  const groups = groupedSourceHierarchyConsumers(consumers);
  if (groups.length === 0) return null;

  return groups
    .map(([state, entries]) => {
      const label = labelForSourceHierarchyDisplayState(state);
      return state === "second_source_only"
        ? `${entries.length} ${label}`
        : formatSourceHierarchyCount(entries.length, label, label);
    })
    .join(", ");
}

function formatSourceHierarchyConsumerDetails(consumers: AdminAnalyticsSourceHierarchyConsumer[] | undefined) {
  return groupedSourceHierarchyConsumers(consumers).map(([state, entries]) => {
    const label = labelForSourceHierarchyDisplayState(state);
    const names = entries.map((entry) => entry.label).join(", ");
    return `${label}: ${names}`;
  });
}

function formatSourceHierarchySummary(sourceHierarchy: AdminAnalyticsSourceHierarchySummary) {
  const mismatchCount = sourceHierarchy.consumerSourceMismatches?.length ?? 0;
  const blockedCount = sourceHierarchy.blockedAnalyticsConsumers?.length ?? 0;
  const consumerSummary = formatSourceHierarchyConsumerSummary(sourceHierarchy.consumers);

  if (sourceHierarchy.status === "source_agreement_failed") {
    if (consumerSummary) {
      return `Source needs repair; ${consumerSummary}.`;
    }

    return blockedCount > 0
      ? `Source needs repair; ${formatSourceHierarchyCount(blockedCount, "analytics view")} paused until first-party coverage is repaired.`
      : "Source needs repair; reconnect first-party coverage before showing charts as current.";
  }

  if (mismatchCount > 0 && blockedCount > 0) {
    const repairVerb = mismatchCount === 1 ? "needs" : "need";
    const sourceLinkLabel = formatSourceHierarchyCount(mismatchCount, "source link");
    const blockedViewLabel = formatSourceHierarchyCount(blockedCount, "analytics view");
    return `${sourceLinkLabel} ${repairVerb} repair; ${blockedViewLabel} paused.`;
  }

  if (mismatchCount > 0) {
    const repairVerb = mismatchCount === 1 ? "needs" : "need";
    return `${formatSourceHierarchyCount(mismatchCount, "source link")} ${repairVerb} repair.`;
  }

  if (blockedCount > 0) {
    return `${formatSourceHierarchyCount(blockedCount, "analytics view")} paused until a connected source is available.`;
  }

  return null;
}

function formatAdminAnalyticsSourceNote(note: string) {
  return note
    .replace("No verified snapshot-first realtime payload is available yet.", "Collecting activity.")
    .replace(/^Snapshot refresh [^.]+\.\s*/u, "")
    .replace(/Live updates (?:are )?delayed/gu, "Cached snapshot")
    .replaceAll("Realtime analytics", "Current activity")
    .replaceAll("realtime payload", "current activity snapshot")
    .replaceAll("Historical analytics", "Historical snapshot");
}

function formatAdminAnalyticsSourceStatusItem(note: string) {
  const formatted = formatAdminAnalyticsSourceNote(note).trim();
  const normalized = formatted.toLowerCase();
  const debugOnlySourceDetail =
    normalized.includes("raw firestore realtime listeners are disabled") ||
    normalized.includes("snapshot-first realtime route") ||
    normalized.includes("admin debug raw evidence");
  const genericVerifiedSnapshotCopy =
    normalized === "last verified data." ||
    normalized === "last verified data" ||
    normalized === "cached snapshot." ||
    normalized === "cached snapshot" ||
    normalized.includes("showing last verified data") ||
    normalized === "verified snapshot shown." ||
    normalized === "verified snapshot shown" ||
    normalized === "refresh due." ||
    normalized === "refresh due";
  const genericDebugPrompt =
    normalized.includes("open debug for source details");
  const genericCollectingCopy =
    normalized === "collecting activity." ||
    normalized === "collecting activity" ||
    normalized === "no current activity snapshot has loaded yet." ||
    normalized === "no current activity snapshot has loaded yet";

  if (debugOnlySourceDetail || genericVerifiedSnapshotCopy || genericDebugPrompt || genericCollectingCopy) {
    return null;
  }

  return formatted;
}

function formatPanelRecoveryAction(action: string) {
  const sourceRepairMatch = action.match(/^([^:]+): Repair [^ ]+ so (.+)$/u);
  if (sourceRepairMatch) {
    return `${sourceRepairMatch[1]}: Reconnect the source so ${sourceRepairMatch[2]}`;
  }

  return action.replaceAll("source_missing", "source missing");
}

function formatLaunchRecoveryStatusLine(
  summary: {
    confidenceLabel: string;
    missingRangeCount: number;
    sourceAgreementState: string;
  },
  rangeLabel?: string | null,
) {
  const label = rangeLabel && rangeLabel.toLowerCase() !== "all" ? `${rangeLabel} history` : "Launch history";
  const suffix = summary.missingRangeCount > 0
    ? ` ${summary.missingRangeCount} range(s) still need recovery.`
    : "";

  if (summary.sourceAgreementState === "pass" && summary.confidenceLabel === "verified") {
    return `${label} is available. Missing stays labeled; estimates are not zero.${suffix}`;
  }

  if (summary.sourceAgreementState === "not_enough_sources" || summary.confidenceLabel === "unknown") {
    return `${label} is collecting source coverage. Missing stays labeled; estimates are not zero.${suffix}`;
  }

  return `${label} shows launch evidence under review. First-party gaps stay labeled until sources agree.${suffix}`;
}

function formatLaunchRecoverySourceLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "unknown") return "Collecting";
  return String(value).trim();
}

function formatLaunchRecoveryConfidenceLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "unknown") return "Partial";
  if (normalized === "verified") return "Verified";
  if (normalized === "strong") return "Strong";
  if (normalized === "directional") return "Directional";
  if (normalized === "weak") return "Weak";
  if (normalized === "partial") return "Partial";
  if (normalized === "review") return "Review";
  return String(value).trim();
}

function formatLaunchRecoverySourceRoleLabel(value: string | null | undefined) {
  switch (String(value ?? "").trim()) {
    case "product_truth":
      return "product truth";
    case "calibration_only":
      return "calibration only";
    case "legacy_review":
      return "legacy review";
    case "snapshot_review":
      return "snapshot review";
    case "missing_source":
      return "missing source";
    default:
      return "source review";
  }
}

function formatLaunchRecoverySourceRoleSummary(counts: Record<string, number> | null | undefined) {
  const entries = Object.entries(counts ?? {})
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) return null;

  return `Launch source roles: ${entries
    .map(([role, count]) => `${count} ${formatLaunchRecoverySourceRoleLabel(role)}`)
    .join(", ")}.`;
}

function formatLaunchRecoveryMathReasonSample(sample: {
  familyId: string;
  sourceRole: string;
  mathReason: string;
}) {
  return `${sample.familyId.replaceAll("_", " ")} (${formatLaunchRecoverySourceRoleLabel(sample.sourceRole)}): ${sample.mathReason}`;
}

function formatLaunchRecoverySourceGateBlocker(blocker: {
  blocker: string;
  reason: string;
}) {
  const label = blocker.blocker
    .replaceAll("_", " ")
    .replace(/^./u, (char) => char.toUpperCase());
  return `${label}: ${blocker.reason}`;
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
  const { range, activeViewerFilter, viewerUserFilter, showHistoricalEmptyState, blockingAnalyticsError, commerce, funnel, analyticsWarmState, liveSnapshotLabel, historicalSnapshotLabel, isBackgroundSyncing, activeTab, setActiveTab, liveLoading, historicalLoading, isPrimingAnalytics, liveResponse, backgroundAnalyticsIssues, visibleDegradedCopy, liveFeedStatus, liveFeedDetail, historicalSourceLabel, analyticsOverviewDisplayMetrics, adminAnalyticsSourceHierarchy } = state;
  const overviewSnapshotUnavailable = isKnownOverviewSnapshotUnavailable(blockingAnalyticsError);
  const sourceHierarchy: AdminAnalyticsSourceHierarchySummary = adminAnalyticsSourceHierarchy ?? {
    status: "unavailable",
    nextAction: "Analytics source hierarchy has not hydrated yet.",
  };
  const sourceHierarchyStatusLabel = formatAnalyticsShellStateLabel(sourceHierarchy.status);
  const sourceHierarchySummary = formatSourceHierarchySummary(sourceHierarchy);
  const sourceHierarchyDetailItems = useMemo(() => {
    const consumerDetails = formatSourceHierarchyConsumerDetails(sourceHierarchy.consumers);
    return sourceHierarchy.status !== "aligned"
      ? [
          `Source state: ${sourceHierarchyStatusLabel}`,
          sourceHierarchySummary,
          ...consumerDetails,
          sourceHierarchy.nextAction,
        ].filter((item): item is string => Boolean(item))
      : [];
  }, [
    sourceHierarchy.consumers,
    sourceHierarchy.nextAction,
    sourceHierarchy.status,
    sourceHierarchyStatusLabel,
    sourceHierarchySummary,
  ]);
  const dataStatusSummary = [
    `Last updated: ${liveSnapshotLabel}`,
    `Coverage: ${state.launchRecoverySummary.coverageLabel}`,
  ];
  const sourceQualitySummary = [
    `Source: ${formatLaunchRecoverySourceLabel(state.launchRecoverySummary.sourceLabel)}`,
    `Confidence: ${formatLaunchRecoveryConfidenceLabel(state.launchRecoverySummary.confidenceLabel)}`,
  ];
  const launchRecoverySourceRoleSummary = formatLaunchRecoverySourceRoleSummary(
    state.launchRecoverySummary.sourceRoleCounts,
  );
  const launchRecoveryMathReasonItems = useMemo(
    () => (state.launchRecoverySummary.mathReasonSamples ?? [])
      .slice(0, 3)
      .map(formatLaunchRecoveryMathReasonSample),
    [state.launchRecoverySummary.mathReasonSamples],
  );
  const launchRecoveryBlockerItems = useMemo(
    () => (state.launchRecoverySummary.sourceGateBlockers ?? [])
      .slice(0, 4)
      .map(formatLaunchRecoverySourceGateBlocker),
    [state.launchRecoverySummary.sourceGateBlockers],
  );
  const primaryBlockingAnalyticsError = overviewSnapshotUnavailable ? null : blockingAnalyticsError;
  const visibleOverviewDegradedCopy = (visibleDegradedCopy ?? []).filter(
    (copy) =>
      !copy.includes("platform_pulse") &&
      !copy.includes("No verified admin metric snapshot display payload"),
  ).map(formatAdminAnalyticsSourceStatusItem).filter((copy): copy is string => Boolean(copy));
  const liveFeedSourceStatusItem =
    liveFeedStatus === "snapshot" ? null : liveFeedDetail ? formatAdminAnalyticsSourceStatusItem(liveFeedDetail) : null;
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
      overviewSnapshotUnavailable ? "Overview snapshot unavailable. Showing available confirmed metrics." : null,
      ...visibleOverviewDegradedCopy,
      showHistoricalEmptyState ? "No events observed in this selected range" : null,
      isBackgroundSyncing ? "Background refresh running" : null,
    ]
      .filter((item): item is string => Boolean(item))
      .map(formatAdminAnalyticsSourceStatusItem)
      .filter((item): item is string => Boolean(item));

    return Array.from(new Set(items));
  }, [
    isBackgroundSyncing,
    overviewSnapshotUnavailable,
    showHistoricalEmptyState,
    visibleOverviewDegradedCopy,
  ]);
  const sourceDetailItems = useMemo(() => (
    Array.from(new Set([
      ...sourceHierarchyDetailItems,
      ...launchRecoveryBlockerItems,
      launchRecoverySourceRoleSummary,
      ...launchRecoveryMathReasonItems,
      ...sourceStatusItems,
      liveFeedSourceStatusItem,
    ].filter((item): item is string => Boolean(item))))
  ), [
    launchRecoveryBlockerItems,
    launchRecoveryMathReasonItems,
    launchRecoverySourceRoleSummary,
    liveFeedSourceStatusItem,
    sourceHierarchyDetailItems,
    sourceStatusItems,
  ]);
  const panelHydrationSummary = state.panelHydration?.summary;
  const connectedPanelCount = panelHydrationSummary?.hydrated ?? 0;
  const totalPanelCount = panelHydrationSummary?.totalPanels ?? 0;
  const panelRecoveryTruthItems: Array<{ state: PanelRecoveryTruthState; count: number }> = panelHydrationSummary
    ? ([
        { state: "collecting", count: panelHydrationSummary.collecting },
        { state: "source_ready_collecting", count: panelHydrationSummary.sourceReadyWaitingForActivity },
        { state: "not_observed_but_expected", count: panelHydrationSummary.notObservedButExpected },
        { state: "source_missing", count: panelHydrationSummary.sourceMissing },
        { state: "materializer_missing", count: panelHydrationSummary.materializerMissing },
        { state: "bridge_missing", count: panelHydrationSummary.bridgeMissing },
        { state: "stale", count: panelHydrationSummary.stale },
        { state: "permission_blocked", count: panelHydrationSummary.permissionBlocked ?? 0 },
        { state: "hidden_by_role", count: panelHydrationSummary.hiddenByRole ?? 0 },
        { state: "runtime_evidence_required", count: panelHydrationSummary.runtimeEvidenceRequired ?? 0 },
        { state: "admin_truth_source_required", count: panelHydrationSummary.adminTruthSourceRequired ?? 0 },
        { state: "provider_gated", count: panelHydrationSummary.providerGated ?? 0 },
        { state: "protected_payment_required", count: panelHydrationSummary.protectedPaymentRequired ?? 0 },
        { state: "external_required", count: panelHydrationSummary.externalRequired },
        { state: "broken", count: panelHydrationSummary.broken },
      ] satisfies Array<{ state: PanelRecoveryTruthState; count: number }>).filter((item) => item.count > 0)
    : [];
  const panelRecoveryTruthGroups = groupPanelRecoveryTruthItems(panelRecoveryTruthItems);
  const panelRecoveryWaitingCount = panelRecoveryTruthItems
    .filter((item) =>
      item.state === "collecting" ||
      item.state === "source_ready_collecting" ||
      item.state === "not_observed_but_expected",
    )
    .reduce((total, item) => total + item.count, 0);
  const panelRecoveryNeedsEvidenceCount = panelRecoveryTruthItems
    .filter((item) =>
      item.state !== "collecting" &&
      item.state !== "source_ready_collecting" &&
      item.state !== "not_observed_but_expected",
    )
    .reduce((total, item) => total + item.count, 0);
  const panelRecoverySourceGapCount = panelRecoveryTruthItems
    .filter((item) =>
      item.state === "source_missing" ||
      item.state === "materializer_missing" ||
      item.state === "bridge_missing" ||
      item.state === "stale" ||
      item.state === "broken",
    )
    .reduce((total, item) => total + item.count, 0);
  const panelRecoveryEvidenceGateCount = panelRecoveryTruthItems
    .filter((item) =>
      item.state === "runtime_evidence_required" ||
      item.state === "admin_truth_source_required" ||
      item.state === "provider_gated" ||
      item.state === "protected_payment_required" ||
      item.state === "external_required",
    )
    .reduce((total, item) => total + item.count, 0);
  const panelRecoveryAccessCount = panelRecoveryTruthItems
    .filter((item) => item.state === "permission_blocked" || item.state === "hidden_by_role")
    .reduce((total, item) => total + item.count, 0);
  const panelRecoveryActions = panelHydrationSummary?.topNextActions ?? [];
  const showPanelRecovery = Boolean(panelHydrationSummary) && (panelRecoveryTruthItems.length > 0 || connectedPanelCount < totalPanelCount);
  const panelRecoveryReviewCount = Math.max(
    0,
    panelRecoveryNeedsEvidenceCount - panelRecoverySourceGapCount - panelRecoveryEvidenceGateCount - panelRecoveryAccessCount,
  );
  const panelRecoveryGateSummary = panelRecoveryEvidenceGateCount > 0
    ? groupPanelRecoveryTruthItems(panelRecoveryTruthItems.filter((item) =>
        item.state === "runtime_evidence_required" ||
        item.state === "admin_truth_source_required" ||
        item.state === "provider_gated" ||
        item.state === "protected_payment_required" ||
        item.state === "external_required",
      ))
        .map((item) => formatPanelRecoveryStateCount(item.count, item.label))
        .join(", ")
    : null;
  const sourceRecoverySummaryParts = [
    panelRecoverySourceGapCount > 0 ? formatPanelRecoveryCount(panelRecoverySourceGapCount, "source gap") : null,
    panelRecoveryGateSummary,
    panelRecoveryAccessCount > 0 ? formatPanelRecoveryStateCount(panelRecoveryAccessCount, "access restricted") : null,
    panelRecoveryWaitingCount > 0 ? formatPanelRecoveryStateCount(panelRecoveryWaitingCount, "collecting activity") : null,
    panelRecoveryReviewCount > 0 ? formatPanelRecoveryStateCount(panelRecoveryReviewCount, "needs review") : null,
  ].filter((item): item is string => Boolean(item));
  const sourceRecoverySummary = sourceRecoverySummaryParts.length > 0
    ? sourceRecoverySummaryParts.join(" - ")
    : showPanelRecovery ? `${connectedPanelCount}/${totalPanelCount} connected` : "";

  return (
    <>
      <PageViewEvent eventName="admin_analytics_viewed" />
      <AdminAnalyticsEvidenceCanvas
        fixture={state.isLocalAdminUiTestSession ? (
        <div
          className="border-l-2 border-amber-400 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
          data-admin-analytics-fixture-boundary="true"
          data-admin-analytics-fixture-state="source_missing"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-semibold text-foreground">source_missing fixture.</span>{" "}
              Layout works here; analytics data waits for verified snapshots from a real
              admin session.
            </p>
          </div>
        </div>
        ) : null}
        evidence={(
          <div
        className="min-w-0 space-y-3"
        data-admin-analytics-recovery-range="all"
        data-mobile-drilldown="true"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-foreground">Data status</h2>
            <p className="mt-1 wrap-anywhere text-sm font-medium text-foreground">
              {activeTabLabel} view - {historicalSourceLabel || "Historical source pending"}
            </p>
            <p className="mt-1 wrap-anywhere text-sm leading-6 text-muted-foreground">
              {formatLaunchRecoveryStatusLine(state.launchRecoverySummary, launchRecoveryRange?.label)}
            </p>
          </div>
        </div>
        <div
          className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-x-4 gap-y-2 text-sm leading-6 text-muted-foreground"
          data-admin-analytics-status-summary="compact"
          data-admin-analytics-source-hierarchy={sourceHierarchy.status}
        >
          <p className="min-w-0 wrap-anywhere font-medium text-foreground">{dataStatusSummary.join(" - ")}</p>
          <p className="min-w-0 wrap-anywhere text-muted-foreground">{sourceQualitySummary.join(" - ")}</p>
        </div>
        {sourceDetailItems.length > 0 || showPanelRecovery ? (
          <details
            className="min-w-0 border-t border-border text-sm text-muted-foreground"
            data-admin-analytics-source-recovery="compact"
            title={sourceDetailItems.length > 0 ? sourceDetailItems.join(" | ") : undefined}
          >
            <summary className="min-h-11 cursor-pointer content-center py-3 font-medium text-foreground">
              <span className="wrap-anywhere">Source and recovery details</span>
            </summary>
            <div className="min-w-0 space-y-4 pb-3 text-sm leading-6 text-muted-foreground">
              {sourceRecoverySummary ? <p className="min-w-0 wrap-anywhere">{sourceRecoverySummary}</p> : null}
              {sourceDetailItems.length > 0 ? (
                <ul className="grid min-w-0 gap-2">
                  {sourceDetailItems.map((item) => (
                    <li key={item} className="min-w-0 wrap-anywhere border-b border-border py-2 last:border-0">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
              {showPanelRecovery ? (
                <div className="min-w-0 space-y-3">
                  {panelRecoveryTruthGroups.length > 0 ? (
                    <ul className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-x-4 gap-y-2 pl-0">
                      {panelRecoveryTruthGroups.map((item) => {
                        return (
                          <li
                            key={item.label}
                            className="min-w-0 list-none wrap-anywhere"
                            data-panel-recovery-truth-state={item.primaryState}
                            data-panel-recovery-truth-states={item.states.join(",")}
                          >
                            {formatPanelRecoveryStateCount(item.count, item.label)}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {panelRecoveryActions.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Next action</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                      {panelRecoveryActions.slice(0, 3).map((action) => (
                        <li key={action} className="min-w-0 wrap-anywhere" title={action}>{formatPanelRecoveryAction(action)}</li>
                      ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
          </div>
        )}
        facts={[
          { label: "Active Users", value: analyticsOverviewDisplayMetrics.liveActive.displayValue, detail: analyticsOverviewDisplayMetrics.liveActive.compactFreshnessLine, icon: Activity, truthState: mapOverviewDisplayStateToTruthState(analyticsOverviewDisplayMetrics.liveActive.displayState), statusLabel: analyticsOverviewDisplayMetrics.liveActive.showBadgeInPrimary ? analyticsOverviewDisplayMetrics.liveActive.badgeLabel : undefined },
          { label: "Mobile Share", value: analyticsOverviewDisplayMetrics.mobileShare.displayValue, detail: analyticsOverviewDisplayMetrics.mobileShare.compactFreshnessLine, icon: Smartphone, truthState: mapOverviewDisplayStateToTruthState(analyticsOverviewDisplayMetrics.mobileShare.displayState), statusLabel: analyticsOverviewDisplayMetrics.mobileShare.showBadgeInPrimary ? analyticsOverviewDisplayMetrics.mobileShare.badgeLabel : undefined },
          { label: "Revenue", value: analyticsOverviewDisplayMetrics.revenue.displayValue, detail: analyticsOverviewDisplayMetrics.revenue.compactFreshnessLine, icon: DollarSign, truthState: mapOverviewDisplayStateToTruthState(analyticsOverviewDisplayMetrics.revenue.displayState), statusLabel: analyticsOverviewDisplayMetrics.revenue.showBadgeInPrimary ? analyticsOverviewDisplayMetrics.revenue.badgeLabel : undefined },
          { label: "Purchases", value: analyticsOverviewDisplayMetrics.purchases.displayValue, detail: analyticsOverviewDisplayMetrics.purchases.compactFreshnessLine, icon: ShoppingBag, truthState: mapOverviewDisplayStateToTruthState(analyticsOverviewDisplayMetrics.purchases.displayState), statusLabel: analyticsOverviewDisplayMetrics.purchases.showBadgeInPrimary ? analyticsOverviewDisplayMetrics.purchases.badgeLabel : undefined },
        ]}
        filters={(
          <div className="flex flex-wrap items-end justify-between gap-3" data-mobile-drilldown="true" data-desktop-flow-collapsed="true">
            <label className="min-w-0 w-full sm:max-w-xs">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-purple-200">Evidence lens</span>
              <NativeSelect
                value={activeTab}
                onChange={(event) => setActiveTab(event.target.value as typeof activeTab)}
              >
                {TAB_OPTIONS.map((tab) => <NativeSelectOption key={tab.id} value={tab.id}>{tab.label}</NativeSelectOption>)}
              </NativeSelect>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {viewerUserFilter ? (
                <Button variant="outline" type="button" onClick={handleClearAllFilters}>
                  Clear filter
                </Button>
              ) : null}
            </div>
          </div>
        )}
        alerts={(
          <>
            {primaryBlockingAnalyticsError && (
        <div className="border-l-2 border-red-400 bg-red-500/10 px-4 py-4">
          <p className="text-sm font-medium text-red-300">
            {formatAdminAnalyticsSourceNote(primaryBlockingAnalyticsError.message || "Analytics request failed.")}
          </p>
        </div>
            )}
            {backgroundAnalyticsIssues.length > 0 && !primaryBlockingAnalyticsError && sourceStatusItems.length === 0 && visibleOverviewDegradedCopy.length > 0 ? (
        <div className="flex items-start gap-2 border-l-2 border-amber-400 bg-amber-500/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <div
              className="min-w-0 space-y-0.5 text-xs text-amber-200"
              title={visibleOverviewDegradedCopy.join(" | ")}
            >
            <p>
              <span className="font-semibold">Needs attention:</span>{" "}
              {visibleOverviewDegradedCopy[0]}
            </p>
            {visibleOverviewDegradedCopy[1] ? <p>{visibleOverviewDegradedCopy[1]}</p> : null}
          </div>
        </div>
            ) : null}
            {showHistoricalEmptyState && sourceStatusItems.length === 0 ? (
        <div className="border-l-2 border-white/15 bg-white/[0.03] px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                No analytics landed for this window yet.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
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
                <Button variant="outline" type="button" onClick={handleClearViewerFilter}>
                  Clear viewer filter
                </Button>
              ) : null}
            </div>
          </div>
        </div>
            ) : null}
          </>
        )}
        isPriming={isPrimingAnalytics ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            <p className="text-sm text-muted-foreground">Syncing analytics...</p>
          </div>
        </div>
        ) : null}
      >
      <div className="min-w-0 space-y-4" data-mobile-drilldown="true">
        {state.activeTab === "operations" ? <AdminAnalyticsOperationsTab {...state} /> : null}
        {state.activeTab === "audience" ? <AdminAnalyticsAudienceTab {...state} /> : null}
        {state.activeTab === "commerce" ? <AdminAnalyticsCommerceTab {...state} /> : null}

        <Card className="min-w-0 gap-0 p-4 shadow-none" data-mobile-drilldown="true" data-desktop-flow-collapsed="true">
        <details>
          <summary className="min-h-11 cursor-pointer content-center py-2 text-sm font-medium">Tasks and notifications</summary>
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
        </Card>

        </div>
      </AdminAnalyticsEvidenceCanvas>
    </>
  );
}
