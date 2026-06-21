import type { AdminSurfaceState } from "@/lib/admin-parity";
import {
  formatAdminAnalyticsSourceStateLabel,
  formatAdminAnalyticsSourceTruthLabel,
  resolveAdminAnalyticsRecoveryPanelFreshnessState,
  resolveAdminAnalyticsRecoveryPanelSourceTruth,
} from "@/lib/analytics/admin-analytics-display-state";
import { buildRecoveredLaunchMetricState } from "@/lib/analytics/recovery-timeline-spine";
import type {
  DeviceMixItem,
  DeviceMixPanelState,
  DeviceMixRow,
  HistoricalAnalyticsResponse,
  RangeOption,
} from "@/types/admin-analytics";

export type AdminAnalyticsDeviceMixModel = DeviceMixPanelState & {
  selectedRange: RangeOption;
  truthState: AdminSurfaceState;
  sourceLabel: string;
  freshnessLabel: string;
  visibleCopy: string[];
  commerceByDeviceAvailable: boolean;
  watchByDeviceAvailable: boolean;
};

function normalizeDeviceCategory(value: string): DeviceMixRow["deviceCategory"] {
  const normalized = value.trim().toLowerCase();
  if (normalized === "mobile") return "mobile";
  if (normalized === "desktop") return "desktop";
  if (normalized === "tablet") return "tablet";
  return "unknown";
}

function sortDeviceRows(rows: DeviceMixRow[]) {
  const order: Record<DeviceMixRow["deviceCategory"], number> = {
    mobile: 0,
    desktop: 1,
    tablet: 2,
    unknown: 3,
  };
  return rows.slice().sort((left, right) => order[left.deviceCategory] - order[right.deviceCategory]);
}

function mapTruthState(input: {
  loading: boolean;
  hasResponse: boolean;
  freshnessState: DeviceMixPanelState["freshnessState"];
  sourceTruth: DeviceMixPanelState["sourceTruth"];
}): AdminSurfaceState {
  if (input.loading && !input.hasResponse) {
    return "loading";
  }
  if (!input.hasResponse || input.sourceTruth === "source_missing" || input.freshnessState === "source_missing") {
    return "unavailable";
  }
  if (input.freshnessState === "external_evidence_required") {
    return "degraded";
  }
  if (input.freshnessState === "partial" || input.freshnessState === "unknown") {
    return "degraded";
  }
  return "cached";
}

function buildRecommendation(input: {
  deviceCategory: DeviceMixRow["deviceCategory"];
  sharePct: number;
  engagementRatePct: number | null;
}) {
  if (input.deviceCategory === "mobile") {
    return input.sharePct >= 0.75
      ? "Mobile dominates this range; keep thumb-reach CTAs, compact density, and restrained image payloads first."
      : "Mobile remains significant; preserve mobile-first layout and verify primary actions stay reachable.";
  }
  if (input.deviceCategory === "desktop") {
    return input.engagementRatePct !== null && input.engagementRatePct < 0.1
      ? "Desktop engagement is low; inspect desktop routing friction after mobile-critical fixes are stable."
      : "Desktop is secondary in this range; keep desktop parity but prioritize mobile changes first.";
  }
  if (input.deviceCategory === "tablet") {
    return "Tablet traffic is small; keep layouts adaptable without letting tablet-specific polish block mobile work.";
  }
  return "Unknown device classification needs review before device-specific product decisions rely on it.";
}

function buildDeviceMixRecoveryMetadata(input: {
  deviceCategory: DeviceMixRow["deviceCategory"];
  sessions: number;
  generatedAtMs: number | null | undefined;
}) {
  const sourceObserved = input.sessions > 0;
  return buildRecoveredLaunchMetricState({
    eventName: "page_view",
    sourceObserved,
    sourceTruth: sourceObserved ? "ga4_evidence_only" : "source_missing",
    evidenceKind: sourceObserved ? "modeled" : "missing",
    route: "admin_analytics_device_mix",
    objectId: input.deviceCategory,
    timestampMs: input.generatedAtMs ?? null,
  });
}

export function buildAdminAnalyticsDeviceMixModel(input: {
  response?: Partial<HistoricalAnalyticsResponse> | null;
  selectedRange: RangeOption;
  loading: boolean;
}): AdminAnalyticsDeviceMixModel {
  const response = input.response;
  const devices = (response?.devices ?? []) as DeviceMixItem[];
  const generatedAtUtc = response?.generatedAtMs
    ? new Date(response.generatedAtMs).toISOString()
    : new Date(0).toISOString();
  const totalSessions = Math.max(0, response?.totals?.sessions ?? devices.reduce((sum, item) => sum + Math.max(0, item.sessions), 0));
  const classifiedSessions = devices.reduce((sum, item) => sum + Math.max(0, item.sessions), 0);
  const unknownSessions = Math.max(0, totalSessions - classifiedSessions);
  const rawRows = devices.map<DeviceMixRow>((item) => {
    const deviceCategory = normalizeDeviceCategory(item.device);
    const sessions = Math.max(0, item.sessions);
    const engagementRatePct = Number.isFinite(item.engagementRate) ? item.engagementRate : null;
    const engagedSessions =
      engagementRatePct !== null ? Math.round(sessions * engagementRatePct) : null;
    const sharePct = totalSessions > 0 ? sessions / totalSessions : 0;
    const recoveryMetadata = buildDeviceMixRecoveryMetadata({
      deviceCategory,
      sessions,
      generatedAtMs: response?.generatedAtMs,
    });
    return {
      deviceCategory,
      sessions,
      sessionSharePct: sharePct,
      engagedSessions,
      engagementRatePct,
      avgSessionSeconds: null,
      bounceRatePct: null,
      views: null,
      purchases: null,
      purchaseRatePct: null,
      unwraps: null,
      watchSeconds: null,
      sourceTruth: recoveryMetadata.sourceTruth,
      confidenceState: recoveryMetadata.confidenceBand === "missing"
        ? "unknown"
        : recoveryMetadata.confidenceBand === "verified" || recoveryMetadata.confidenceBand === "strong"
          ? "verified"
          : "estimated",
      freshnessState: recoveryMetadata.freshnessState,
      confidenceScore: recoveryMetadata.confidenceScore,
      confidenceBand: recoveryMetadata.confidenceBand,
      evidenceKind: recoveryMetadata.evidenceKind,
      dedupeKey: recoveryMetadata.dedupeKey,
      dedupeDimensions: recoveryMetadata.dedupeDimensions,
      lateArrivalWindowDays: recoveryMetadata.lateArrivalWindowDays,
      productTruthEligible: recoveryMetadata.productTruthEligible,
      missingVsZeroState: recoveryMetadata.missingVsZeroState,
      mathReason: recoveryMetadata.mathReason,
      recommendation: buildRecommendation({
        deviceCategory,
        sharePct,
        engagementRatePct,
      }),
    };
  });

  const rows = sortDeviceRows(
    unknownSessions > 0
      ? (() => {
        const recoveryMetadata = buildDeviceMixRecoveryMetadata({
          deviceCategory: "unknown",
          sessions: unknownSessions,
          generatedAtMs: response?.generatedAtMs,
        });
        return [
          ...rawRows,
          {
            deviceCategory: "unknown",
            sessions: unknownSessions,
            sessionSharePct: totalSessions > 0 ? unknownSessions / totalSessions : 0,
            engagedSessions: null,
            engagementRatePct: null,
            avgSessionSeconds: null,
            bounceRatePct: null,
            views: null,
            purchases: null,
            purchaseRatePct: null,
            unwraps: null,
            watchSeconds: null,
            sourceTruth: recoveryMetadata.sourceTruth,
            confidenceState: "partial" as const,
            freshnessState: recoveryMetadata.freshnessState,
            confidenceScore: recoveryMetadata.confidenceScore,
            confidenceBand: recoveryMetadata.confidenceBand,
            evidenceKind: recoveryMetadata.evidenceKind,
            dedupeKey: recoveryMetadata.dedupeKey,
            dedupeDimensions: recoveryMetadata.dedupeDimensions,
            lateArrivalWindowDays: recoveryMetadata.lateArrivalWindowDays,
            productTruthEligible: recoveryMetadata.productTruthEligible,
            missingVsZeroState: recoveryMetadata.missingVsZeroState,
            mathReason: recoveryMetadata.mathReason,
            recommendation: "Unknown device sessions need classification review before layout decisions assume full coverage.",
          },
        ];
      })()
      : rawRows,
  );

  const sourceTruth = resolveAdminAnalyticsRecoveryPanelSourceTruth({
    hasResponse: Boolean(response),
    rows,
    fallbackSourceTruth: response ? "ga4" : "unknown",
  });
  const freshnessState = resolveAdminAnalyticsRecoveryPanelFreshnessState({
    hasResponse: Boolean(response),
    rows,
    cacheState: response?.cacheState,
    fallbackFreshnessState: response?.analyticsSourceHealth?.availability.ga4.freshnessState,
  });

  const warnings: string[] = [];
  if (unknownSessions > 0) {
    warnings.push(`Device classification is partial; ${unknownSessions.toLocaleString()} sessions have no verified device bucket.`);
  }
  if (sourceTruth === "ga4_evidence_only") {
    warnings.push("Device mix is GA session-based, not authenticated-user based.");
  }

  const mobileRow = rows.find((row) => row.deviceCategory === "mobile");
  const desktopRow = rows.find((row) => row.deviceCategory === "desktop");
  const designImplications: string[] = [];
  if ((mobileRow?.sessionSharePct ?? 0) >= 0.75) {
    designImplications.push("Mobile is dominant; prioritize mobile layout, thumb-reach CTAs, and image payload limits.");
  }
  if ((desktopRow?.engagementRatePct ?? 0) < 0.1 && (desktopRow?.sessions ?? 0) > 0) {
    designImplications.push("Desktop engagement is low; inspect desktop flow only after mobile v1 is stable.");
  }
  if (designImplications.length === 0) {
    designImplications.push("Device split is stable enough for compact cross-device QA, with mobile still treated as the default surface.");
  }

  const visibleCopy = [
    `Device mix uses ${formatAdminAnalyticsSourceTruthLabel(sourceTruth)} sessions for the selected range.`,
    "Engagement is GA engaged sessions divided by GA sessions for each device bucket.",
  ];
  warnings.forEach((warning) => {
    if (!visibleCopy.includes(warning)) {
      visibleCopy.push(warning);
    }
  });

  return {
    generatedAtUtc,
    range: input.selectedRange,
    sourceTruth,
    freshnessState,
    totalSessions,
    classifiedSessions,
    unknownSessions,
    engagementDefinition: "GA engaged sessions / GA sessions for each device category.",
    rows,
    warnings,
    designImplications,
    selectedRange: input.selectedRange,
    truthState: mapTruthState({
      loading: input.loading,
      hasResponse: Boolean(response),
      freshnessState,
      sourceTruth,
    }),
    sourceLabel: formatAdminAnalyticsSourceTruthLabel(sourceTruth),
    freshnessLabel: formatAdminAnalyticsSourceStateLabel(freshnessState),
    visibleCopy,
    commerceByDeviceAvailable: false,
    watchByDeviceAvailable: false,
  };
}
