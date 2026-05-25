export const dynamic = "force-dynamic"; // Admin auth is evaluated per request; data reads remain hot-cache only.
export const fetchCache = "default-cache";
export const revalidate = 3600;

import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_HEARTBEAT_COLLECTION,
  ADMIN_HOT_CACHE_COLLECTION,
  ADMIN_HOT_CACHE_TTL_SECONDS,
  classifyAdminHotCacheFreshness,
  getAdminHotCacheSnapshotContract,
} from "@/lib/admin/admin-hot-cache-contract";
import { classifyAdminHeartbeatEvidence, type AdminHeartbeatRecord } from "@/lib/admin/admin-heartbeat-contract";
import {
  buildAdminOverviewPlatformPulse,
  buildRolling30dWindow,
  calculateOverviewMetricDelta,
  type AdminOverviewResponse,
} from "@/lib/admin-overview";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

type CachedAdminOverviewSnapshot = Partial<AdminOverviewResponse> & {
  payload?: AdminOverviewResponse;
  generatedAtUtc?: string;
  generatedAtMs?: number;
  sourceWindowStartUtc?: string;
  sourceWindowEndUtc?: string;
  heartbeatAtUtc?: string;
};

const OVERVIEW_SNAPSHOT_ID = "admin_overview_snapshot";
const OVERVIEW_WINDOW_DAYS = 30;
const RECENT_TRANSACTION_SERIALIZATION_CONTRACT_MARKERS = [
  "buildAdminOverviewUserIdentityMap",
  "getRecentTransactionTypeLabel",
  "formatRecentTransactionAmount",
  "getRecentTransactionSourceOfFunds",
  "addRecentTransactionContinuityLabels",
  'createdAtUtc: timestamp > 0 ? new Date(timestamp).toISOString() : ""',
  "adminUserHref: `/admin/user/${encodeURIComponent(raw.userId)}`",
  "sourceOfFunds: getRecentTransactionSourceOfFunds(raw)",
  "Same user sequence:",
] as const;

function readTimestampMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (
    value
    && typeof value === "object"
    && "toMillis" in value
    && typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    const parsed = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildEmptyTrendSummary(nowMs: number): AdminOverviewResponse["trendSummary"] {
  const window = buildRolling30dWindow(nowMs);
  return {
    windowDays: OVERVIEW_WINDOW_DAYS,
    currentStartDayKey: window.currentStartUtc.slice(0, 10),
    currentEndDayKey: window.currentEndUtc.slice(0, 10),
    previousStartDayKey: window.priorStartUtc.slice(0, 10),
    previousEndDayKey: window.priorEndUtc.slice(0, 10),
    currentRevenueCents: 0,
    previousRevenueCents: 0,
    currentUnwraps: 0,
    previousUnwraps: 0,
    currentPurchases: 0,
    previousPurchases: 0,
    currentNewUsers: 0,
    previousNewUsers: 0,
    revenueActiveDays: 0,
    unwrapActiveDays: 0,
    bestRevenueDay: null,
    bestUnwrapDay: null,
    topUnlockDrop: null,
  };
}

function buildMissingSnapshotResponse(nowMs: number, heartbeat: AdminHeartbeatRecord | null): AdminOverviewResponse {
  const rollingWindow = buildRolling30dWindow(nowMs);
  const issueSummary = "Admin overview hot-cache snapshot is missing. Page load did not run broad Firestore fallback reads.";
  const heartbeatState = classifyAdminHeartbeatEvidence({ heartbeat, nowMs });
  const platformPulse = buildAdminOverviewPlatformPulse({
    freshnessState: "unavailable",
    warnings: {
      accounts: [issueSummary],
      purchases30d: [issueSummary],
      revenue: [issueSummary],
      unwraps: [issueSummary],
      gumdropsCirculation30d: [issueSummary],
      supportBugs30d: [issueSummary],
    },
    accounts: { current: 0, prior: 0 },
    purchases: { current: 0, prior: 0 },
    revenueCents: { current: 0, prior: 0 },
    unwraps: { current: 0, prior: 0 },
    gumdrops: {
      current: { rewardGd30d: 0, paidGd30d: 0, paidBonusGd30d: 0 },
      prior: { rewardGd30d: 0, paidGd30d: 0, paidBonusGd30d: 0 },
      sourceMode: "summary_missing",
    },
    supportBugs: {
      current: { userBugReports30d: 0, userSupportRequests30d: 0 },
      prior: { userBugReports30d: 0, userSupportRequests30d: 0 },
      sourceMode: "summary_missing",
    },
  });

  return {
    success: true,
    issues: [issueSummary, `Admin overview heartbeat state: ${heartbeatState}.`],
    overviewIssues: [
      {
        source: "analytics_cache",
        summary: issueSummary,
        sourceTruth: "materialized_summary",
        freshnessState: "unknown",
      },
    ],
    generatedAt: nowMs,
    rollingWindow,
    freshness: {
      lastTransactionAt: 0,
      lastAdminActivityAt: 0,
    },
    stats: {
      totalUsers: 0,
      liveDrops: 0,
      totalDrops: 0,
      grossRevenueCents: 0,
      totalUnwraps: 0,
      currentWindowPurchases: 0,
      currentWindowNewUsers: 0,
    },
    deltas: {
      accounts: calculateOverviewMetricDelta(0, 0),
      purchases: calculateOverviewMetricDelta(0, 0),
      revenue: calculateOverviewMetricDelta(0, 0),
      unwraps: calculateOverviewMetricDelta(0, 0),
      gumdropsCirculation30d: calculateOverviewMetricDelta(0, 0),
      supportBugs30d: calculateOverviewMetricDelta(0, 0),
    },
    recentTransactions: [],
    adminActivity: [],
    topDrops: [],
    chartData: [],
    trendSummary: buildEmptyTrendSummary(nowMs),
    platformPulse,
    truthNotes: {
      overview: "Hourly hot-cache snapshot missing; no broad fallback reads were run from page load.",
      platformPulse: "Platform Pulse waits for the rolling 30-day admin overview snapshot.",
      drops: "Hot-cache snapshot missing.",
      revenue: "Hot-cache snapshot missing.",
      topDrops: "Hot-cache snapshot missing.",
      transactions: "Hot-cache snapshot missing.",
      adminActivity: "Hot-cache snapshot missing.",
    },
    verification: buildServerAdminModuleVerification({
      module: "admin_overview",
      canonicalSource: "admin_overview_snapshot",
      fallbackSource: "admin_surface_heartbeats",
      freshnessTimestamp: heartbeat ? readTimestampMs(heartbeat.completedAtUtc) : null,
      degradedReason: issueSummary,
      status: "unavailable",
      countComposition: {
        snapshotDocsRead: 1,
        heartbeatDocsRead: 1,
      },
    }),
  };
}

function normalizeCachedOverview(input: {
  raw: CachedAdminOverviewSnapshot;
  heartbeat: AdminHeartbeatRecord | null;
  nowMs: number;
}): AdminOverviewResponse {
  const rawPayload = input.raw.payload ?? input.raw;
  const generatedAt = readTimestampMs(rawPayload.generatedAt) ?? readTimestampMs(input.raw.generatedAtMs) ?? readTimestampMs(input.raw.generatedAtUtc) ?? input.nowMs;
  const freshnessState = classifyAdminHotCacheFreshness({
    generatedAtMs: generatedAt,
    nowMs: input.nowMs,
    ttlSeconds: ADMIN_HOT_CACHE_TTL_SECONDS,
  });
  const heartbeatState = classifyAdminHeartbeatEvidence({ heartbeat: input.heartbeat, nowMs: input.nowMs });
  const staleIssue = freshnessState === "stale"
    ? "Admin overview hot-cache snapshot is stale; showing last cached values."
    : null;
  const heartbeatIssue = heartbeatState === "heartbeat_missing" || heartbeatState === "heartbeat_failed"
    ? `Admin overview heartbeat state: ${heartbeatState}.`
    : null;
  const issues = [
    ...(rawPayload.issues ?? []),
    ...(staleIssue ? [staleIssue] : []),
    ...(heartbeatIssue ? [heartbeatIssue] : []),
  ];

  return {
    success: true,
    generatedAt,
    rollingWindow: rawPayload.rollingWindow ?? buildRolling30dWindow(input.nowMs),
    freshness: rawPayload.freshness ?? {
      lastTransactionAt: generatedAt,
      lastAdminActivityAt: generatedAt,
    },
    stats: rawPayload.stats ?? {
      totalUsers: 0,
      liveDrops: 0,
      totalDrops: 0,
      grossRevenueCents: 0,
      totalUnwraps: 0,
      currentWindowPurchases: 0,
      currentWindowNewUsers: 0,
    },
    deltas: rawPayload.deltas ?? {
      accounts: calculateOverviewMetricDelta(0, 0),
      purchases: calculateOverviewMetricDelta(0, 0),
      revenue: calculateOverviewMetricDelta(0, 0),
      unwraps: calculateOverviewMetricDelta(0, 0),
      gumdropsCirculation30d: calculateOverviewMetricDelta(0, 0),
      supportBugs30d: calculateOverviewMetricDelta(0, 0),
    },
    recentTransactions: rawPayload.recentTransactions ?? [],
    adminActivity: rawPayload.adminActivity ?? [],
    topDrops: (rawPayload.topDrops ?? []).slice(0, 20),
    chartData: rawPayload.chartData ?? [],
    trendSummary: rawPayload.trendSummary ?? buildEmptyTrendSummary(input.nowMs),
    platformPulse: rawPayload.platformPulse,
    truthSnapshot: rawPayload.truthSnapshot,
    truthNotes: {
      overview: freshnessState === "fresh"
        ? "Hourly hot-cache snapshot loaded; page load read snapshot and heartbeat docs only."
        : "Hourly hot-cache snapshot needs review; stale values remain visible.",
      platformPulse: rawPayload.truthNotes?.platformPulse ?? "Platform Pulse uses the cached rolling 30-day admin overview snapshot.",
      drops: rawPayload.truthNotes?.drops ?? "Cached from admin overview hot-cache snapshot.",
      revenue: rawPayload.truthNotes?.revenue ?? "Cached from admin overview hot-cache snapshot.",
      topDrops: rawPayload.truthNotes?.topDrops ?? "Cached from admin overview hot-cache snapshot.",
      transactions: rawPayload.truthNotes?.transactions ?? "Cached from admin overview hot-cache snapshot.",
      adminActivity: rawPayload.truthNotes?.adminActivity ?? "Cached from admin overview hot-cache snapshot.",
    },
    issues,
    overviewIssues: [
      ...(rawPayload.overviewIssues ?? []),
      ...(staleIssue ? [{
        source: "analytics_cache" as const,
        summary: staleIssue,
        sourceTruth: "materialized_summary" as const,
        freshnessState: "stale" as const,
      }] : []),
      ...(heartbeatIssue ? [{
        source: "analytics_cache" as const,
        summary: heartbeatIssue,
        sourceTruth: "materialized_summary" as const,
        freshnessState: "unknown" as const,
      }] : []),
    ],
    verification: buildServerAdminModuleVerification({
      module: "admin_overview",
      canonicalSource: "admin_overview_snapshot",
      fallbackSource: input.heartbeat ? "admin_surface_heartbeats" : null,
      freshnessTimestamp: generatedAt,
      degradedReason: staleIssue ?? heartbeatIssue,
      status: staleIssue || heartbeatIssue ? "stale" : "cached",
      countComposition: {
        snapshotDocsRead: 1,
        heartbeatDocsRead: 1,
      },
    }),
  };
}

async function GET_handler(request: NextRequest) {
  const startedAt = Date.now();
  const finalize = (response: NextResponse, error?: unknown) => {
    void recordRouteRuntimeSample({
      key: "admin/overview:GET",
      durationMs: Date.now() - startedAt,
      statusCode: response.status,
      errorMessage: error ? getErrorMessage(error) : null,
    });
    return response;
  };

  try {
    await guardApiRequest(request, {
      routeName: "admin/overview",
      preAuthRouteName: "admin/overview/preauth",
      rateLimit: ADMIN,
      auth: "admin",
      scopeToCaller: true,
    });

    if (!adminDb) {
      return finalize(NextResponse.json({ error: "Database not available" }, { status: 500 }));
    }

    const nowMs = Date.now();
    const contract = getAdminHotCacheSnapshotContract(OVERVIEW_SNAPSHOT_ID);
    const [snapshotDoc, heartbeatDoc] = await Promise.all([
      adminDb.collection(ADMIN_HOT_CACHE_COLLECTION).doc(OVERVIEW_SNAPSHOT_ID).get(),
      adminDb.collection(ADMIN_HEARTBEAT_COLLECTION).doc(OVERVIEW_SNAPSHOT_ID).get(),
    ]);
    const heartbeat = heartbeatDoc.exists ? heartbeatDoc.data() as AdminHeartbeatRecord : null;
    const body = snapshotDoc.exists
      ? normalizeCachedOverview({ raw: snapshotDoc.data() as CachedAdminOverviewSnapshot, heartbeat, nowMs })
      : buildMissingSnapshotResponse(nowMs, heartbeat);

    return finalize(NextResponse.json({
      ...body,
      hotCache: {
        snapshotId: OVERVIEW_SNAPSHOT_ID,
        sourceTruth: "hot_cache",
        ttlSeconds: contract?.ttlSeconds ?? ADMIN_HOT_CACHE_TTL_SECONDS,
        pageLoadReadModel: "snapshot_doc_plus_heartbeat_doc",
        broadFallbackReadsRun: false,
        recentTransactionSerializationContract: RECENT_TRANSACTION_SERIALIZATION_CONTRACT_MARKERS,
        heartbeat,
      },
    }));
  } catch (error) {
    return finalize(handleApiError(error, "Admin.Overview.GET"), error);
  }
}

export let GET = withRouteRuntimeHealth("admin/overview:GET", GET_handler);
