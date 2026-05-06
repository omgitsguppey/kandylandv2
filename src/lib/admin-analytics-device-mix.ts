import type { AdminSurfaceState } from "@/lib/admin-parity";
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

function mapSourceTruth(response?: HistoricalAnalyticsResponse): DeviceMixPanelState["sourceTruth"] {
  if (!response) return "unknown";
  return "ga4";
}

function mapFreshnessState(response?: HistoricalAnalyticsResponse): DeviceMixPanelState["freshnessState"] {
  if (!response) {
    return "unknown";
  }
  const sourceFreshness = response.analyticsSourceHealth?.availability.ga4.freshnessState;
  if (response.cacheState === "stale" || sourceFreshness === "stale") {
    return "stale";
  }
  if (sourceFreshness === "missing" || sourceFreshness === "unknown") {
    return "partial";
  }
  return "live";
}

function mapTruthState(input: {
  loading: boolean;
  hasResponse: boolean;
  freshnessState: DeviceMixPanelState["freshnessState"];
}): AdminSurfaceState {
  if (input.loading && !input.hasResponse) {
    return "loading";
  }
  if (!input.hasResponse) {
    return "unavailable";
  }
  if (input.freshnessState === "stale") {
    return "stale";
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

function formatSourceLabel(sourceTruth: DeviceMixPanelState["sourceTruth"]) {
  switch (sourceTruth) {
    case "ga4":
      return "GA4 device category";
    case "first_party":
      return "First-party device sample";
    case "mixed":
      return "Mixed device sample";
    case "fallback":
      return "Fallback device sample";
    default:
      return "Unknown";
  }
}

function formatFreshnessLabel(freshness: DeviceMixPanelState["freshnessState"]) {
  switch (freshness) {
    case "live":
      return "Recent";
    case "recent":
      return "Recent";
    case "stale":
      return "Stale";
    case "partial":
      return "Partial";
    default:
      return "Unknown";
  }
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
  const sourceTruth = mapSourceTruth(response as HistoricalAnalyticsResponse | undefined);
  const freshnessState = mapFreshnessState(response as HistoricalAnalyticsResponse | undefined);
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
      sourceTruth: "ga4_device_category",
      confidenceState: "verified",
      recommendation: buildRecommendation({
        deviceCategory,
        sharePct,
        engagementRatePct,
      }),
    };
  });

  const rows = sortDeviceRows(
    unknownSessions > 0
      ? [
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
          sourceTruth: "ga4_device_category_missing",
          confidenceState: "partial",
          recommendation: "Unknown device sessions need classification review before layout decisions assume full coverage.",
        },
      ]
      : rawRows,
  );

  const warnings: string[] = [];
  if (unknownSessions > 0) {
    warnings.push(`Device classification is partial; ${unknownSessions.toLocaleString()} sessions have no verified device bucket.`);
  }
  if (sourceTruth === "ga4") {
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
    `Device mix uses ${formatSourceLabel(sourceTruth)} sessions for the selected range.`,
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
    }),
    sourceLabel: formatSourceLabel(sourceTruth),
    freshnessLabel: formatFreshnessLabel(freshnessState),
    visibleCopy,
    commerceByDeviceAvailable: false,
    watchByDeviceAvailable: false,
  };
}
