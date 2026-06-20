import type { AdminSurfaceState } from "@/lib/admin-parity";
import { buildRecoveredLaunchMetricState } from "@/lib/analytics/recovery-timeline-spine";
import type {
  HistoricalAnalyticsResponse,
  PageItem,
  RangeOption,
  TopPathRow,
  TopPathsPanelState,
} from "@/types/admin-analytics";

export type AdminAnalyticsTopPathsModel = TopPathsPanelState & {
  selectedRange: RangeOption;
  truthState: AdminSurfaceState;
  sourceLabel: string;
  freshnessLabel: string;
  visibleCopy: string[];
  snapshotLimited: boolean;
  maxSnapshotRows: number;
  availableFilterKeys: Array<{
    value:
      | "all"
      | "high_volume_low_engagement"
      | "zero_time"
      | "creator"
      | "legal_static"
      | "dashboard_authenticated";
    label: string;
  }>;
};

function mapSourceTruth(response?: HistoricalAnalyticsResponse): TopPathsPanelState["sourceTruth"] {
  if (!response) return "unknown";
  return "ga4";
}

function mapFreshnessState(response?: HistoricalAnalyticsResponse): TopPathsPanelState["freshnessState"] {
  if (!response) return "unknown";
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
  freshnessState: TopPathsPanelState["freshnessState"];
}): AdminSurfaceState {
  if (input.loading && !input.hasResponse) return "loading";
  if (!input.hasResponse) return "unavailable";
  if (input.freshnessState === "stale") return "stale";
  if (input.freshnessState === "partial" || input.freshnessState === "unknown") return "degraded";
  return "cached";
}

function formatSourceLabel(sourceTruth: TopPathsPanelState["sourceTruth"]) {
  switch (sourceTruth) {
    case "ga4":
      return "GA4 page path snapshot";
    case "first_party":
      return "First-party path snapshot";
    case "mixed":
      return "Mixed path snapshot";
    case "fallback":
      return "Fallback path snapshot";
    default:
      return "Unknown";
  }
}

function formatFreshnessLabel(freshness: TopPathsPanelState["freshnessState"]) {
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

function formatAvgTimeDisplay(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) {
    return "Unavailable";
  }
  if (seconds <= 0) {
    return "0s";
  }
  const wholeSeconds = Math.round(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  if (minutes <= 0) {
    return `${remainder}s`;
  }
  return `${minutes}m ${remainder}s`;
}

function normalizePath(path: string) {
  return path?.trim() || "/";
}

function inferRouteGroup(path: string): TopPathRow["routeGroup"] {
  if (path === "/") return "home";
  if (path.startsWith("/drops")) return "drops";
  if (path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/creators")) return "creator";
  if (path.startsWith("/privacy") || path.startsWith("/terms") || path.startsWith("/cookies")) return "legal";
  if (path.startsWith("/support") || path.startsWith("/faq") || path.startsWith("/contact")) return "support";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/auth") || path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/signin")) return "auth";
  return "unknown";
}

function inferLabel(path: string) {
  if (path === "/") return "Home";
  if (path === "/drops") return "Drops";
  if (path === "/dashboard") return "Dashboard";
  if (path === "/faq") return "FAQ";
  if (path === "/privacy") return "Privacy";
  if (path === "/terms") return "Terms";
  const trimmed = path.replace(/^\/+/u, "");
  if (!trimmed) return "Home";
  return trimmed
    .split(/[/-]/u)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildIssueState(input: {
  routeGroup: TopPathRow["routeGroup"];
  views: number;
  totalViews: number;
  avgTimeSeconds: number | null;
  engagementRatePct: number | null;
}): TopPathRow["issueState"] {
  const share = input.totalViews > 0 ? input.views / input.totalViews : 0;
  if ((input.avgTimeSeconds ?? 0) <= 0) {
    return input.routeGroup === "legal" ? "review" : "warning";
  }
  if (share >= 0.03 && (input.engagementRatePct ?? 0) <= 0.08) {
    return "warning";
  }
  if ((input.engagementRatePct ?? 0) <= 0.15) {
    return "review";
  }
  return "healthy";
}

function buildExplanation(input: {
  path: string;
  routeGroup: TopPathRow["routeGroup"];
  views: number;
  totalViews: number;
  avgTimeSeconds: number | null;
  engagementRatePct: number | null;
}) {
  const share = input.totalViews > 0 ? input.views / input.totalViews : 0;
  if ((input.avgTimeSeconds ?? 0) <= 0) {
    return input.routeGroup === "legal"
      ? "0s avg time on a legal/static path can reflect quick policy reads or immediate exits; verify timing source before treating it as zero engagement."
      : "0s avg time suggests timing is unavailable for this path or users are exiting immediately after arrival.";
  }
  if (share >= 0.03 && (input.engagementRatePct ?? 0) <= 0.08) {
    return "High view volume with low engagement needs review before this route is treated as healthy traffic.";
  }
  if (input.routeGroup === "creator") {
    return "Creator path traffic is grouped separately so creator intake/profile routes do not blend into general fan navigation.";
  }
  if (input.routeGroup === "dashboard") {
    return "Dashboard paths represent authenticated-user navigation rather than public acquisition traffic.";
  }
  return "Views are GA page-path counts for the selected range, with engagement kept separate from share.";
}

function buildTopPathRecoveryMetadata(input: {
  path: string;
  views: number;
  generatedAtMs: number | null | undefined;
}) {
  const sourceObserved = input.views > 0;
  return buildRecoveredLaunchMetricState({
    eventName: "page_view",
    sourceObserved,
    sourceTruth: sourceObserved ? "ga4_evidence_only" : "source_missing",
    evidenceKind: sourceObserved ? "modeled" : "missing",
    route: "admin_analytics_top_paths",
    objectId: input.path,
    timestampMs: input.generatedAtMs ?? null,
  });
}

export function buildAdminAnalyticsTopPathsModel(input: {
  response?: Partial<HistoricalAnalyticsResponse> | null;
  selectedRange: RangeOption;
  loading: boolean;
}): AdminAnalyticsTopPathsModel {
  const response = input.response;
  const pages = (response?.pages ?? []) as PageItem[];
  const generatedAtUtc = response?.generatedAtMs
    ? new Date(response.generatedAtMs).toISOString()
    : new Date(0).toISOString();
  const sourceTruth = mapSourceTruth(response as HistoricalAnalyticsResponse | undefined);
  const freshnessState = mapFreshnessState(response as HistoricalAnalyticsResponse | undefined);
  const totalViews = pages.reduce((sum, item) => sum + Math.max(0, item.views), 0);
  const rows = pages.map<TopPathRow>((item) => {
    const path = normalizePath(item.path);
    const routeGroup = inferRouteGroup(path);
    const views = Math.max(0, item.views);
    const avgTimeSeconds = Number.isFinite(item.avgTime) ? item.avgTime : null;
    const engagementRatePct = Number.isFinite(item.engagementRate) ? item.engagementRate : null;
    const recoveryMetadata = buildTopPathRecoveryMetadata({
      path,
      views,
      generatedAtMs: response?.generatedAtMs,
    });
    return {
      path,
      label: inferLabel(path),
      routeGroup,
      views,
      viewSharePct: totalViews > 0 ? views / totalViews : 0,
      avgTimeSeconds,
      avgTimeDisplay: formatAvgTimeDisplay(avgTimeSeconds),
      engagementRatePct,
      bounceRatePct: null,
      uniqueUsers: null,
      sessions: null,
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
      issueState: buildIssueState({
        routeGroup,
        views,
        totalViews,
        avgTimeSeconds,
        engagementRatePct,
      }),
      explanation: buildExplanation({
        path,
        routeGroup,
        views,
        totalViews,
        avgTimeSeconds,
        engagementRatePct,
      }),
    };
  });

  const maxSnapshotRows = pages.length;
  const snapshotLimited = pages.length >= 25;
  const warnings: string[] = [];
  if (sourceTruth === "ga4") {
    warnings.push("Views, average time, and engagement are GA4 path metrics for the selected range, not authenticated-user-only navigation.");
  }
  if (snapshotLimited) {
    warnings.push("Top 25 snapshot only. This panel paginates the available snapshot, not every path in GA.");
  }
  if (rows.some((row) => (row.avgTimeSeconds ?? 0) <= 0)) {
    warnings.push("Some paths show 0s avg time; treat these as timing-unavailable or immediate-exit review, not automatic zero engagement.");
  }
  if (rows.some((row) => row.issueState === "warning")) {
    warnings.push("High-volume low-engagement paths are flagged for review.");
  }

  const visibleCopy = [
    `Top paths uses ${formatSourceLabel(sourceTruth)} data for the selected range.`,
    "Views are path view counts, Share is path views / total top-path views, and Engagement is the labeled path engagement metric.",
    ...warnings,
  ];

  return {
    generatedAtUtc,
    range: input.selectedRange,
    sourceTruth,
    freshnessState,
    totalPathCount: rows.length,
    totalViews,
    page: 1,
    pageSize: 10,
    hasNextPage: rows.length > 10,
    rows,
    warnings,
    selectedRange: input.selectedRange,
    truthState: mapTruthState({
      loading: input.loading,
      hasResponse: Boolean(response),
      freshnessState,
    }),
    sourceLabel: formatSourceLabel(sourceTruth),
    freshnessLabel: formatFreshnessLabel(freshnessState),
    visibleCopy,
    snapshotLimited,
    maxSnapshotRows,
    availableFilterKeys: [
      { value: "all", label: "All paths" },
      { value: "high_volume_low_engagement", label: "High-volume low-engagement" },
      { value: "zero_time", label: "0s or near-zero time" },
      { value: "creator", label: "Creator pages" },
      { value: "legal_static", label: "Legal/static pages" },
      { value: "dashboard_authenticated", label: "Dashboard/authenticated" },
    ],
  };
}
