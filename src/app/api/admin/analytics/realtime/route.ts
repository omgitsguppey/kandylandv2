export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN_ANALYTICS_REALTIME_ADAPTIVE } from "@/lib/server/rate-limit";
import {
  safeParams,
  toNumber,
  toStringValue,
} from "@/lib/server/admin-analytics-shared";
import { getLatestVerifiedSnapshot } from "@/lib/server/admin-analytics-snapshots";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ANALYTICS_CANONICAL_COLLECTIONS, ANALYTICS_OPERATIONAL_COLLECTIONS } from "@/lib/server/analytics-governance";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { readThroughEphemeralRouteCache } from "@/lib/server/ephemeral-route-cache";
import { recordAnalyticsRuntimeWarning } from "@/lib/server/analytics-runtime-warning";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import type {
  RealtimeActiveUserItem,
  RealtimeAnalyticsResponse,
  RealtimePoint,
  SurfaceMixItem,
} from "@/types/admin-analytics";

const ADMIN_ANALYTICS_REALTIME_CACHE_TTL_MS = 10_000;
const ADMIN_ANALYTICS_REALTIME_HOT_CACHE_FRESH_MS = 5 * 60_000;
const ADMIN_ANALYTICS_REALTIME_HOT_CACHE_DOC_ID = "realtime_summary";
const ADMIN_ANALYTICS_REALTIME_CANONICAL_SNAPSHOT_MODULE_KEY = "live_pulse";
const ADMIN_ANALYTICS_REALTIME_CANONICAL_SNAPSHOT_RANGE = "24h";
const ADMIN_ANALYTICS_REALTIME_CANONICAL_SNAPSHOT_SOURCE_LABEL = "analytics_admin_metric_snapshots/live_pulse:24h";
const ADMIN_ANALYTICS_REALTIME_LEGACY_SUMMARY_SOURCE_LABEL = "analytics_aggregate_stats/realtime_summary:fallback_evidence";

type AdminRealtimePayload = RealtimeAnalyticsResponse & Record<string, unknown>;

type GuestAnalyticsSnapshot = {
  generatedAtMs: number;
  refreshedAtMs: number;
  sourceWindowMs: number;
  sourceWindowLabel: string;
  guestBatchCount: number;
  guestEventCount: number;
  guestSessionCount: number;
  uniqueAnonymousVisitorCount: number;
  guestBounceCount: number;
  guestBounceRate: number | null;
  guestSamplesAvailable: boolean;
  guestTruthState: "live" | "stale" | "unavailable" | "needs_review";
  sourceCollectionsUsed: string[];
  sourceSampleCounts: Record<string, number>;
  notes: string[];
};

function normalizeGuestAnalyticsSnapshotFromCache(
  value: unknown,
  cacheState: NonNullable<RealtimeAnalyticsResponse["cacheState"]>,
): GuestAnalyticsSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const snapshot = value as Record<string, unknown>;
  const sourceSampleCounts = safeParams(snapshot.sourceSampleCounts);
  const guestBatchSamples = toNumber(sourceSampleCounts[ANALYTICS_CANONICAL_COLLECTIONS.guestBatches]);
  const guestSamplesAvailable = snapshot.guestSamplesAvailable === true && guestBatchSamples > 0;
  const cachedTruthState = toStringValue(snapshot.guestTruthState);
  const guestTruthState: GuestAnalyticsSnapshot["guestTruthState"] = cacheState === "stale"
    ? "stale"
    : !guestSamplesAvailable
      ? "unavailable"
      : cachedTruthState === "needs_review"
        ? "needs_review"
        : "live";

  return {
    generatedAtMs: toNumber(snapshot.generatedAtMs),
    refreshedAtMs: toNumber(snapshot.refreshedAtMs),
    sourceWindowMs: toNumber(snapshot.sourceWindowMs),
    sourceWindowLabel: toStringValue(snapshot.sourceWindowLabel) || "last_30_minutes",
    guestBatchCount: toNumber(snapshot.guestBatchCount),
    guestEventCount: toNumber(snapshot.guestEventCount),
    guestSessionCount: toNumber(snapshot.guestSessionCount),
    uniqueAnonymousVisitorCount: toNumber(snapshot.uniqueAnonymousVisitorCount),
    guestBounceCount: toNumber(snapshot.guestBounceCount),
    guestBounceRate: typeof snapshot.guestBounceRate === "number" ? snapshot.guestBounceRate : null,
    guestSamplesAvailable,
    guestTruthState,
    sourceCollectionsUsed: Array.isArray(snapshot.sourceCollectionsUsed)
      ? snapshot.sourceCollectionsUsed.filter((entry): entry is string => typeof entry === "string")
      : [ANALYTICS_CANONICAL_COLLECTIONS.guestBatches],
    sourceSampleCounts: {
      [ANALYTICS_CANONICAL_COLLECTIONS.guestBatches]: guestBatchSamples,
    },
    notes: readIssueList(snapshot.notes),
  };
}

function readIssueList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((issue): issue is string => typeof issue === "string" && issue.trim().length > 0)
    : [];
}

function normalizeRealtimeTruthLabel(
  value: unknown,
  fallback: NonNullable<RealtimeAnalyticsResponse["liveTruthLabel"]>,
) {
  const candidate = toStringValue(value);
  return candidate === "live"
    || candidate === "cached"
    || candidate === "stale"
    || candidate === "fallback"
    || candidate === "partial"
    || candidate === "failed"
    ? candidate
    : fallback;
}

type AdminMetricSnapshotLike = {
  generatedAt?: string | null;
  lastVerifiedAt?: string | null;
  expiresAt?: string | null;
  sourceMode?: string | null;
  truthState?: string | null;
  values?: Record<string, unknown>;
  warnings?: Array<{ message?: unknown; code?: unknown }>;
  sourceBreakdown?: Record<string, unknown>;
};

function readSnapshotMetric(snapshot: AdminMetricSnapshotLike, keys: string[]) {
  const values = snapshot.values ?? {};
  for (const key of keys) {
    const metric = values[key];
    if (!metric || typeof metric !== "object" || Array.isArray(metric)) {
      continue;
    }

    const metricRecord = metric as Record<string, unknown>;
    if (metricRecord.available === false) {
      continue;
    }

    return metricRecord;
  }

  return null;
}

function readSnapshotNumber(snapshot: AdminMetricSnapshotLike, keys: string[]) {
  const metric = readSnapshotMetric(snapshot, keys);
  if (!metric || metric.value === null || metric.value === undefined) {
    return null;
  }

  const numeric = typeof metric.value === "number"
    ? metric.value
    : typeof metric.value === "string" && metric.value.trim()
      ? Number(metric.value)
      : Number.NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function readSnapshotArray<T>(snapshot: AdminMetricSnapshotLike, keys: string[]) {
  const metric = readSnapshotMetric(snapshot, keys);
  return Array.isArray(metric?.value) ? metric.value as T[] : [];
}

function readSnapshotGeneratedAtMs(snapshot: AdminMetricSnapshotLike, fallbackMs: number) {
  const sourceTimestamp = snapshot.lastVerifiedAt ?? snapshot.generatedAt;
  const parsed = sourceTimestamp ? Date.parse(sourceTimestamp) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

function resolveSnapshotPayloadCacheState(snapshot: AdminMetricSnapshotLike, generatedAtMs: number, nowMs: number) {
  if (snapshot.sourceMode === "stale_cache" || snapshot.truthState === "stale") {
    return "stale" as const;
  }
  if (snapshot.expiresAt) {
    const expiresAtMs = Date.parse(snapshot.expiresAt);
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs) {
      return "stale" as const;
    }
  }
  return nowMs - generatedAtMs < ADMIN_ANALYTICS_REALTIME_HOT_CACHE_FRESH_MS ? "fresh" as const : "stale" as const;
}

function readSnapshotWarnings(snapshot: AdminMetricSnapshotLike) {
  return (snapshot.warnings ?? [])
    .map((warning) => toStringValue(warning.message) || toStringValue(warning.code))
    .filter((warning) => warning.length > 0);
}

function buildEmptyWatchCaptureHealth() {
  return {
    sessionCount: 0,
    fullCaptureCount: 0,
    degradedSessionCount: 0,
    replayRecoveredCount: 0,
    gapDetectedCount: 0,
    flushDegradedCount: 0,
    closeMissingCount: 0,
    degradedRate: 0,
    averageGapMs: 0,
    averageHiddenSeconds: 0,
    averageWaitSeconds: 0,
    averageSeekCount: 0,
    averagePlaybackRate: 0,
    mutedSessionCount: 0,
    transportBreakdown: [],
    lastSeenAtMs: 0,
    warnings: [],
  };
}

function buildSnapshotGuestAnalyticsSnapshot(input: {
  snapshot: AdminMetricSnapshotLike;
  generatedAtMs: number;
  cacheState: NonNullable<RealtimeAnalyticsResponse["cacheState"]>;
}): GuestAnalyticsSnapshot | null {
  const sourceBreakdown = input.snapshot.sourceBreakdown ?? {};
  const sourceSampleCounts = safeParams(sourceBreakdown.sourceSampleCounts);
  const guestBatchSamples = toNumber(sourceSampleCounts[ANALYTICS_CANONICAL_COLLECTIONS.guestBatches]);
  const uniqueAnonymousVisitorCount = readSnapshotNumber(input.snapshot, [
    "uniqueAnonymousVisitorCount",
    "guestCount",
    "guestActive",
    "guestUsers",
  ]);
  const guestEventCount = readSnapshotNumber(input.snapshot, ["guestEventCount", "guestEvents"]);
  const guestSessionCount = readSnapshotNumber(input.snapshot, ["guestSessionCount", "guestSessions"]);
  const guestBatchCount = readSnapshotNumber(input.snapshot, ["guestBatchCount", "guestBatches"]);
  const guestBounceCount = readSnapshotNumber(input.snapshot, ["guestBounceCount", "guestBounces"]);
  const guestBounceRate = readSnapshotNumber(input.snapshot, ["guestBounceRate"]);
  const guestSamplesAvailable = guestBatchSamples > 0 || (uniqueAnonymousVisitorCount ?? 0) > 0;
  const notes = guestSamplesAvailable
    ? []
    : ["No verified guest sample evidence exists in the canonical admin metric snapshot."];

  return {
    generatedAtMs: input.generatedAtMs,
    refreshedAtMs: input.generatedAtMs,
    sourceWindowMs: 30 * 60 * 1000,
    sourceWindowLabel: "last_30_minutes",
    guestBatchCount: guestBatchCount ?? guestBatchSamples,
    guestEventCount: guestEventCount ?? 0,
    guestSessionCount: guestSessionCount ?? 0,
    uniqueAnonymousVisitorCount: uniqueAnonymousVisitorCount ?? 0,
    guestBounceCount: guestBounceCount ?? 0,
    guestBounceRate,
    guestSamplesAvailable,
    guestTruthState: input.cacheState === "stale"
      ? "stale"
      : guestSamplesAvailable
        ? "live"
        : "unavailable",
    sourceCollectionsUsed: ["analytics_admin_metric_snapshots"],
    sourceSampleCounts: {
      [ANALYTICS_CANONICAL_COLLECTIONS.guestBatches]: guestBatchSamples,
    },
    notes,
  };
}

function buildAdminMetricSnapshotRealtimePayload(input: {
  snapshot: AdminMetricSnapshotLike;
  nowMs: number;
  issues: string[];
}): AdminRealtimePayload {
  const generatedAtMs = readSnapshotGeneratedAtMs(input.snapshot, input.nowMs);
  const cacheState = resolveSnapshotPayloadCacheState(input.snapshot, generatedAtMs, input.nowMs);
  const cacheAgeMs = Math.max(0, input.nowMs - generatedAtMs);
  const totalActive = readSnapshotNumber(input.snapshot, ["totalActive", "activeUsers", "activeUserCount", "liveActiveUsers"]);
  const deepTrackerActive = readSnapshotNumber(input.snapshot, ["deepTrackerActive", "firstPartyActiveUsers", "identifiedActiveUsers"]);
  const activeUsers = readSnapshotArray<RealtimeActiveUserItem>(input.snapshot, ["activeUsers", "activeUserRows"]);
  const data = readSnapshotArray<RealtimePoint>(input.snapshot, ["data", "liveData", "liveSeries", "graphPoints"]);
  const surfaceMix = readSnapshotArray<SurfaceMixItem>(input.snapshot, ["surfaceMix", "surfaces"]);
  const guestAnalyticsSnapshot = buildSnapshotGuestAnalyticsSnapshot({
    snapshot: input.snapshot,
    generatedAtMs,
    cacheState,
  });
  const staleIssue = cacheState === "stale"
    ? ["Serving stale canonical admin metric snapshot; realtime_summary remains fallback evidence only."]
    : [];

  return {
    success: true,
    generatedAtMs,
    cacheState,
    cacheAgeMs,
    cacheSourceLabel: ADMIN_ANALYTICS_REALTIME_CANONICAL_SNAPSHOT_SOURCE_LABEL,
    staleButVerified: cacheState === "stale",
    issues: [
      ...input.issues,
      ...readSnapshotWarnings(input.snapshot),
      ...staleIssue,
    ],
    totalActive: totalActive ?? undefined,
    deepTrackerActive: deepTrackerActive ?? undefined,
    guestAnalyticsSnapshot,
    liveTruthLabel: cacheState === "stale" ? "stale" : "cached",
    liveSourceLabel: ADMIN_ANALYTICS_REALTIME_CANONICAL_SNAPSHOT_SOURCE_LABEL,
    activeUsersTruthLabel: cacheState === "stale" ? "stale" : "cached",
    activeUsersSourceLabel: ADMIN_ANALYTICS_REALTIME_CANONICAL_SNAPSHOT_SOURCE_LABEL,
    data,
    activeUsers,
    surfaceMix,
    watchCaptureHealth: buildEmptyWatchCaptureHealth(),
  };
}

function buildUnavailableSnapshotAuthorityPayload(input: {
  nowMs: number;
  issues: string[];
}): AdminRealtimePayload {
  return {
    success: true,
    generatedAtMs: input.nowMs,
    cacheState: "miss",
    cacheAgeMs: 0,
    cacheSourceLabel: "analytics_admin_metric_snapshots/unavailable",
    liveTruthLabel: "failed",
    liveSourceLabel: "analytics_admin_metric_snapshots/unavailable",
    activeUsersTruthLabel: "failed",
    activeUsersSourceLabel: "analytics_admin_metric_snapshots/unavailable",
    data: [],
    activeUsers: [],
    surfaceMix: [],
    guestAnalyticsSnapshot: null,
    watchCaptureHealth: buildEmptyWatchCaptureHealth(),
    issues: [
      ...input.issues,
      "No verified admin metric snapshot is available; raw analytics collections are debug-only and were not used as compact display fallback.",
    ],
  };
}

function buildHotCachePayload(input: {
  aggregateData: Record<string, unknown>;
  generatedAtMs: number;
  nowMs: number;
  issues: string[];
}): AdminRealtimePayload {
  const cacheAgeMs = Math.max(0, input.nowMs - input.generatedAtMs);
  const cacheState: NonNullable<RealtimeAnalyticsResponse["cacheState"]> =
    cacheAgeMs < ADMIN_ANALYTICS_REALTIME_HOT_CACHE_FRESH_MS ? "fresh" : "stale";
  const aggregateIssues = readIssueList(input.aggregateData.issues);
  const guestAnalyticsSnapshot = normalizeGuestAnalyticsSnapshotFromCache(
    input.aggregateData.guestAnalyticsSnapshot,
    cacheState,
  );
  const staleIssue = cacheState === "stale"
    ? ["Serving stale admin realtime analytics hot cache while the scheduled materializer catches up."]
    : [];

  return {
    success: true,
    ...input.aggregateData,
    generatedAtMs: input.generatedAtMs,
    cacheState,
    cacheAgeMs,
    cacheSourceLabel: ADMIN_ANALYTICS_REALTIME_LEGACY_SUMMARY_SOURCE_LABEL,
    liveSourceLabel: ADMIN_ANALYTICS_REALTIME_LEGACY_SUMMARY_SOURCE_LABEL,
    activeUsersSourceLabel: ADMIN_ANALYTICS_REALTIME_LEGACY_SUMMARY_SOURCE_LABEL,
    liveTruthLabel: cacheState === "stale"
      ? "stale"
      : normalizeRealtimeTruthLabel(input.aggregateData.liveTruthLabel, "cached") === "live"
        ? "cached"
        : normalizeRealtimeTruthLabel(input.aggregateData.liveTruthLabel, "cached"),
    activeUsersTruthLabel: cacheState === "stale"
      ? "stale"
      : normalizeRealtimeTruthLabel(input.aggregateData.activeUsersTruthLabel, "cached") === "live"
        ? "cached"
        : normalizeRealtimeTruthLabel(input.aggregateData.activeUsersTruthLabel, "cached"),
    guestAnalyticsSnapshot,
    issues: [
      ...input.issues,
      "Using legacy realtime_summary fallback evidence because canonical admin metric snapshot is unavailable.",
      ...aggregateIssues,
      ...staleIssue,
    ],
  };
}

async function GET_handler(request: NextRequest) {
  const startedAt = Date.now();
  const finalize = (response: NextResponse, error?: unknown) => {
    void recordRouteRuntimeSample({
      key: "admin/analytics/realtime:GET",
      durationMs: Date.now() - startedAt,
      statusCode: response.status,
      errorMessage: error ? getErrorMessage(error) : null,
    });
    return response;
  };

  try {
    await guardApiRequest(request, {
      routeName: "admin/analytics/realtime",
      preAuthRouteName: "admin/analytics/realtime/preauth",
      preAuthRateLimit: ADMIN_ANALYTICS_REALTIME_ADAPTIVE,
      rateLimit: ADMIN_ANALYTICS_REALTIME_ADAPTIVE,
      auth: "admin",
      scopeToCaller: true,
    });

    const payload = await readThroughEphemeralRouteCache<AdminRealtimePayload>({
      key: "admin-analytics-realtime:summary",
      ttlMs: ADMIN_ANALYTICS_REALTIME_CACHE_TTL_MS,
      loader: async () => {
        const nowMs = Date.now();
        const issues: string[] = [];

        try {
          const canonicalSnapshot = await getLatestVerifiedSnapshot(
            ADMIN_ANALYTICS_REALTIME_CANONICAL_SNAPSHOT_MODULE_KEY,
            ADMIN_ANALYTICS_REALTIME_CANONICAL_SNAPSHOT_RANGE,
          );

          if (canonicalSnapshot) {
            return buildAdminMetricSnapshotRealtimePayload({
              snapshot: canonicalSnapshot,
              nowMs,
              issues,
            });
          }

          issues.push("Canonical admin metric snapshot is unavailable; checking legacy realtime summary as fallback evidence.");
        } catch (error) {
          issues.push(`Failed to read canonical admin metric snapshot: ${getErrorMessage(error)}.`);
        }

        try {
          const aggregateDoc = await adminDb
            .collection(ANALYTICS_OPERATIONAL_COLLECTIONS.aggregateStats)
            .doc(ADMIN_ANALYTICS_REALTIME_HOT_CACHE_DOC_ID)
            // bounded document read: legacy realtime summary is fallback evidence only.
            .get();

          if (aggregateDoc.exists) {
            const aggData = aggregateDoc.data() as Record<string, unknown>;
            const generatedAtMs = toNumber(aggData.generatedAtMs);

            if (generatedAtMs) {
              return buildHotCachePayload({
                aggregateData: aggData,
                generatedAtMs,
                nowMs,
                issues,
              });
            }

            issues.push("Legacy realtime_summary fallback evidence is missing generatedAtMs.");
          }
        } catch (error) {
          issues.push(`Failed to read legacy realtime_summary fallback evidence: ${getErrorMessage(error)}.`);
        }

        return buildUnavailableSnapshotAuthorityPayload({ nowMs, issues });
      },
    });
    await recordAnalyticsRuntimeWarning({
      surface: "admin/analytics/realtime",
      routeName: "admin/analytics/realtime",
      truthLabel: payload.liveTruthLabel,
      sourceLabel: payload.liveSourceLabel,
      issues: payload.issues,
      moduleKey: "realtime",
    });

    return finalize(NextResponse.json({
      ...payload,
      verification: buildServerAdminModuleVerification({
        module: "admin_analytics_realtime",
        canonicalSource: "analytics_admin_metric_snapshots",
        fallbackSource: payload.cacheSourceLabel === ADMIN_ANALYTICS_REALTIME_LEGACY_SUMMARY_SOURCE_LABEL
          ? "analytics_aggregate_stats/realtime_summary"
          : null,
        freshnessTimestamp: payload.generatedAtMs ?? Date.now(),
        status: payload.liveTruthLabel === "failed"
          ? "failed"
          : payload.liveTruthLabel === "stale"
            ? "stale"
            : payload.liveTruthLabel === "partial"
              ? "degraded"
              : payload.liveTruthLabel === "fallback"
                ? "fallback"
                : payload.liveTruthLabel === "cached"
                  ? "cached"
                  : "live",
        degradedReason: payload.issues?.[0] ?? null,
        countComposition: {
          totalActive: Number(payload.totalActive ?? 0),
          deepTrackerActive: Number(payload.deepTrackerActive ?? 0),
          activeUsers: Array.isArray(payload.activeUsers) ? payload.activeUsers.length : 0,
          issues: Array.isArray(payload.issues) ? payload.issues.length : 0,
        },
      }),
    }));
  } catch (error) {
    return finalize(handleApiError(error, "Admin.Analytics.Realtime.GET"), error);
  }
}

export let GET = withRouteRuntimeHealth("admin/analytics/realtime:GET", GET_handler);
