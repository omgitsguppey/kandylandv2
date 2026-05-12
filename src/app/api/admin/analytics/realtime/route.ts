export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN_ANALYTICS_REALTIME_ADAPTIVE } from "@/lib/server/rate-limit";
import {
  AnalyticsReportRow,
  AUTHENTICATED_PAGE_VIEW_EVENT_NAMES,
  safeParams,
  safeRunRealtimeReport,
  toNumber,
  toStringValue,
} from "@/lib/server/admin-analytics-shared";
import { buildRealtimeSurfaceMix } from "@/lib/server/admin-analytics-context";
import { buildWatchCaptureHealthSummary } from "@/lib/server/admin-analytics-capture-health";
import { createAdminAnalyticsDataClient, getAdminAnalyticsPropertyId } from "@/lib/server/admin-analytics-data";
import { buildHistoricalOnboardingOverview } from "@/lib/server/admin-analytics-historical-onboarding";
import { buildAdminOverviewUserIdentityMap } from "@/lib/server/admin-overview-users";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ANALYTICS_CANONICAL_COLLECTIONS, ANALYTICS_OPERATIONAL_COLLECTIONS } from "@/lib/server/analytics-governance";
import { safeQueryWithDiagnostics } from "@/lib/server/diagnostic-read-fallbacks";
import { getErrorMessage, recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample, withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { readThroughEphemeralRouteCache } from "@/lib/server/ephemeral-route-cache";
import { recordAnalyticsRuntimeWarning } from "@/lib/server/analytics-runtime-warning";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import type { RealtimeAnalyticsResponse } from "@/types/admin-analytics";

const propertyId = getAdminAnalyticsPropertyId();
const analyticsClient = createAdminAnalyticsDataClient();
const ADMIN_ANALYTICS_REALTIME_CACHE_TTL_MS = 10_000;
const ADMIN_ANALYTICS_REALTIME_HOT_CACHE_FRESH_MS = 5 * 60_000;
const ADMIN_ANALYTICS_REALTIME_HOT_CACHE_STALE_MS = 30 * 60_000;
const ADMIN_ANALYTICS_REALTIME_HOT_CACHE_DOC_ID = "realtime_summary";
const ADMIN_ANALYTICS_REALTIME_ACTIVE_USER_LIMIT = 500;
const ADMIN_ANALYTICS_REALTIME_EVENT_FACT_LIMIT = 1_500;
const ADMIN_ANALYTICS_REALTIME_SAMPLE_LIMIT = 1_000;

type AdminRealtimePayload = RealtimeAnalyticsResponse & Record<string, unknown>;

type LiveBucket = {
  minute: number;
  userKeys: Set<string>;
  views: number;
};

type RealtimeIdentity = {
  uid: string;
  username: string;
  displayName?: string;
  userIdentityState?: "resolved" | "fallback_uid" | "missing" | "guest";
  lastSeenAt: number;
  lastEventName: string;
  lastPagePath: string;
  lastDropTitle: string;
  lastSemanticScopeLabel: string;
  lastComponentName: string;
  lastEventModules: string;
  lastActionPurpose?: "identity_linkage" | "meaningful_activity" | "viewer_activity" | "admin_activity" | "unknown";
  sourceTruth?: "presence" | "event_fact" | "snapshot" | "estimated";
};

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

function buildEmptyLiveBuckets() {
  return Array.from({ length: 30 }, (_, minute) => ({
    minute,
    userKeys: new Set<string>(),
    views: 0,
  } satisfies LiveBucket));
}

function resolveMinutesAgo(nowMs: number, timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > nowMs) {
    return null;
  }

  const minutesAgo = Math.floor((nowMs - timestamp) / 60_000);
  if (minutesAgo < 0 || minutesAgo >= 30) {
    return null;
  }

  return minutesAgo;
}

function applyRealtimePresence(
  buckets: LiveBucket[],
  minute: number | null,
  userKey: string,
  pageViewCount = 0,
) {
  if (minute === null) {
    return;
  }

  if (userKey) {
    buckets[minute].userKeys.add(userKey);
  }
  if (pageViewCount > 0) {
    buckets[minute].views += pageViewCount;
  }
}

function finalizeRealtimeBuckets(buckets: LiveBucket[]) {
  return buckets
    .map((bucket) => ({
      minute: bucket.minute,
      users: bucket.userKeys.size,
      views: bucket.views,
    }))
    .sort((left, right) => right.minute - left.minute);
}

function upsertRealtimeIdentity(
  identities: Map<string, RealtimeIdentity>,
  candidate: RealtimeIdentity,
) {
  if (!candidate.uid) {
    return;
  }

  const current = identities.get(candidate.uid);
  if (!current || candidate.lastSeenAt >= current.lastSeenAt) {
    identities.set(candidate.uid, candidate);
  }
}

function readEventModules(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .join(", ");
  }

  return toStringValue(value);
}

function classifyLastActionPurpose(input: {
  eventName: string;
  pagePath: string;
  semanticScopeLabel: string;
}) {
  const eventName = input.eventName.toLowerCase();
  const pagePath = input.pagePath.toLowerCase();
  const semanticScopeLabel = input.semanticScopeLabel.toLowerCase();

  if (pagePath.startsWith("/admin")) {
    return "admin_activity" as const;
  }
  if (eventName.includes("identity_link")) {
    return "identity_linkage" as const;
  }
  if (eventName.includes("viewer") || semanticScopeLabel.includes("viewer")) {
    return "viewer_activity" as const;
  }
  if (eventName.endsWith("_viewed") || eventName.endsWith("_opened") || eventName.includes("unlock") || eventName.includes("purchase")) {
    return "meaningful_activity" as const;
  }

  return "unknown" as const;
}

function buildFirstPartyLiveData(input: {
  nowMs: number;
  activeUserDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  eventFactDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  guestBatchDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  watchSessionDocs: FirebaseFirestore.QueryDocumentSnapshot[];
}) {
  const buckets = buildEmptyLiveBuckets();

  input.activeUserDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const timestamp = toNumber(data.lastSeenAt);
    const minute = resolveMinutesAgo(input.nowMs, timestamp);
    applyRealtimePresence(buckets, minute, `user:${doc.id}`);
  });

  input.eventFactDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const timestamp = toNumber(data.timestamp);
    const minute = resolveMinutesAgo(input.nowMs, timestamp);
    const userKey = `user:${toStringValue(data.userId)}`;
    const eventName = toStringValue(data.eventName);
    const pageViewCount = AUTHENTICATED_PAGE_VIEW_EVENT_NAMES.has(eventName) || eventName.endsWith("_viewed") ? 1 : 0;
    applyRealtimePresence(buckets, minute, userKey, pageViewCount);
  });

  input.guestBatchDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const guestKey = `guest:${toStringValue(data.sessionKey) || toStringValue(data.clientSessionId) || doc.id}`;
    const events = Array.isArray(data.events) ? data.events as Array<Record<string, unknown>> : [];
    events.forEach((event) => {
      const timestamp = toNumber(event.timestamp) || toNumber(data.receivedAtMs);
      const minute = resolveMinutesAgo(input.nowMs, timestamp);
      const pageViewCount = toStringValue(event.type) === "page_view" ? 1 : 0;
      applyRealtimePresence(buckets, minute, guestKey, pageViewCount);
    });
  });

  input.watchSessionDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const timestamp = toNumber(data.lastSeenAtMs);
    const minute = resolveMinutesAgo(input.nowMs, timestamp);
    const userId = toStringValue(data.userId);
    if (userId) {
      applyRealtimePresence(buckets, minute, `user:${userId}`);
    }
  });

  return finalizeRealtimeBuckets(buckets);
}

function buildGuestAnalyticsSnapshot(input: {
  nowMs: number;
  guestBatchDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  guestBatchLimit: number;
}): GuestAnalyticsSnapshot {
  const anonymousVisitorIds = new Set<string>();
  const sessionKeys = new Set<string>();
  let guestEventCount = 0;
  let pageLeaveCount = 0;
  let guestBounceCount = 0;

  input.guestBatchDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const anonymousVisitorId = toStringValue(data.anonymousVisitorId)
      || toStringValue(data.sessionKey)
      || toStringValue(data.clientSessionId)
      || doc.id;
    const sessionKey = toStringValue(data.sessionKey)
      || toStringValue(data.serverSessionKey)
      || toStringValue(data.clientSessionId)
      || doc.id;
    if (anonymousVisitorId) anonymousVisitorIds.add(anonymousVisitorId);
    if (sessionKey) sessionKeys.add(sessionKey);

    const events = Array.isArray(data.events) ? data.events as Array<Record<string, unknown>> : [];
    guestEventCount += Math.max(toNumber(data.eventCount), events.length);
    events.forEach((event) => {
      if (toStringValue(event.type) === "page_leave") {
        pageLeaveCount += 1;
        if (toStringValue(event.exitIntent) === "bounce") {
          guestBounceCount += 1;
        }
      }
    });
  });

  const notes: string[] = [];
  if (input.guestBatchDocs.length === 0) {
    notes.push("No guest analytics batches were materialized in the realtime source window.");
  }
  if (input.guestBatchDocs.length >= input.guestBatchLimit) {
    notes.push("Guest analytics snapshot hit the bounded source sample cap and needs review.");
  }

  const guestSamplesAvailable = input.guestBatchDocs.length > 0;
  const guestTruthState = !guestSamplesAvailable
    ? "unavailable"
    : input.guestBatchDocs.length >= input.guestBatchLimit
      ? "needs_review"
      : "live";

  return {
    generatedAtMs: input.nowMs,
    refreshedAtMs: input.nowMs,
    sourceWindowMs: 30 * 60 * 1000,
    sourceWindowLabel: "last_30_minutes",
    guestBatchCount: input.guestBatchDocs.length,
    guestEventCount,
    guestSessionCount: sessionKeys.size,
    uniqueAnonymousVisitorCount: anonymousVisitorIds.size,
    guestBounceCount,
    guestBounceRate: pageLeaveCount > 0 ? Number((guestBounceCount / pageLeaveCount).toFixed(4)) : null,
    guestSamplesAvailable,
    guestTruthState,
    sourceCollectionsUsed: [ANALYTICS_CANONICAL_COLLECTIONS.guestBatches],
    sourceSampleCounts: {
      [ANALYTICS_CANONICAL_COLLECTIONS.guestBatches]: input.guestBatchDocs.length,
    },
    notes,
  };
}

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

function buildFallbackActiveUsers(input: {
  activeUserDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  eventFactDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  watchSessionDocs: FirebaseFirestore.QueryDocumentSnapshot[];
}) {
  const identities = new Map<string, RealtimeIdentity>();

  input.activeUserDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    upsertRealtimeIdentity(identities, {
      uid: doc.id,
      username: toStringValue(data.username) || doc.id,
      displayName: toStringValue(data.displayName) || toStringValue(data.username) || doc.id,
      userIdentityState: toStringValue(data.username) || toStringValue(data.displayName) ? "resolved" : "fallback_uid",
      lastSeenAt: toNumber(data.lastSeenAt),
      lastEventName: toStringValue(data.lastEventName),
      lastPagePath: toStringValue(data.lastPagePath),
      lastDropTitle: toStringValue(data.lastDropTitle),
      lastSemanticScopeLabel: toStringValue(data.lastSemanticScopeLabel),
      lastComponentName: toStringValue(data.lastComponentName),
      lastEventModules: toStringValue(data.lastEventModules),
      lastActionPurpose: classifyLastActionPurpose({
        eventName: toStringValue(data.lastEventName),
        pagePath: toStringValue(data.lastPagePath),
        semanticScopeLabel: toStringValue(data.lastSemanticScopeLabel),
      }),
      sourceTruth: "presence",
    });
  });

  input.eventFactDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const userId = toStringValue(data.userId);
    if (!userId) {
      return;
    }

    const params = safeParams(data.params);
    upsertRealtimeIdentity(identities, {
      uid: userId,
      username: toStringValue(data.username) || userId,
      displayName: toStringValue(data.displayName) || toStringValue(data.username) || userId,
      userIdentityState: toStringValue(data.username) || toStringValue(data.displayName) ? "resolved" : "fallback_uid",
      lastSeenAt: toNumber(data.timestamp),
      lastEventName: toStringValue(data.eventName),
      lastPagePath: toStringValue(data.pagePath) || toStringValue(params.page_path),
      lastDropTitle: toStringValue(data.dropTitle) || toStringValue(params.drop_title),
      lastSemanticScopeLabel: toStringValue(params.semantic_scope_label),
      lastComponentName: toStringValue(params.component_name),
      lastEventModules: readEventModules(params.event_modules),
      lastActionPurpose: classifyLastActionPurpose({
        eventName: toStringValue(data.eventName),
        pagePath: toStringValue(data.pagePath) || toStringValue(params.page_path),
        semanticScopeLabel: toStringValue(params.semantic_scope_label),
      }),
      sourceTruth: "event_fact",
    });
  });

  input.watchSessionDocs.forEach((doc) => {
    const data = doc.data() as Record<string, unknown>;
    const userId = toStringValue(data.userId);
    if (!userId) {
      return;
    }

    upsertRealtimeIdentity(identities, {
      uid: userId,
      username: toStringValue(data.username) || userId,
      displayName: toStringValue(data.displayName) || toStringValue(data.username) || userId,
      userIdentityState: toStringValue(data.username) || toStringValue(data.displayName) ? "resolved" : "fallback_uid",
      lastSeenAt: toNumber(data.lastSeenAtMs),
      lastEventName: data.isClosed === true ? "viewer_session_closed" : "viewer_session_active",
      lastPagePath: toStringValue(data.pagePath),
      lastDropTitle: toStringValue(data.dropTitle),
      lastSemanticScopeLabel: "Viewer",
      lastComponentName: "",
      lastEventModules: "viewer",
      lastActionPurpose: "viewer_activity",
      sourceTruth: "event_fact",
    });
  });

  return Array.from(identities.values())
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
    .slice(0, 8);
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
    cacheSourceLabel: "analytics_aggregate_stats/realtime_summary",
    liveTruthLabel: cacheState === "stale"
      ? "stale"
      : normalizeRealtimeTruthLabel(input.aggregateData.liveTruthLabel, "live"),
    activeUsersTruthLabel: cacheState === "stale"
      ? "stale"
      : normalizeRealtimeTruthLabel(input.aggregateData.activeUsersTruthLabel, "live"),
    guestAnalyticsSnapshot,
    issues: [...input.issues, ...aggregateIssues, ...staleIssue],
  };
}

async function persistRealtimeHotSummary(payload: AdminRealtimePayload) {
  await adminDb
    .collection(ANALYTICS_OPERATIONAL_COLLECTIONS.aggregateStats)
    .doc(ADMIN_ANALYTICS_REALTIME_HOT_CACHE_DOC_ID)
    .set({
      ...payload,
      writer: "admin/analytics/realtime:GET",
      cacheSourceLabel: "analytics_aggregate_stats/realtime_summary",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
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
        const thirtyMinsAgo = nowMs - 30 * 60 * 1000;
        const onboardingWindowStartMs = nowMs - 24 * 60 * 60 * 1000;
        const issues: string[] = [];

        try {
          const aggregateDoc = await adminDb
            .collection(ANALYTICS_OPERATIONAL_COLLECTIONS.aggregateStats)
            .doc(ADMIN_ANALYTICS_REALTIME_HOT_CACHE_DOC_ID)
            // bounded document read: hot-cache summary uses a single known document id.
            .get();

          if (aggregateDoc.exists) {
            const aggData = aggregateDoc.data() as Record<string, unknown>;
            const generatedAtMs = toNumber(aggData.generatedAtMs);

            if (generatedAtMs && nowMs - generatedAtMs < ADMIN_ANALYTICS_REALTIME_HOT_CACHE_STALE_MS) {
              return buildHotCachePayload({
                aggregateData: aggData,
                generatedAtMs,
                nowMs,
                issues,
              });
            } else {
              issues.push("Realtime hot cache is expired; rebuilding from GA4 and first-party sources.");
            }
          }
        } catch (error) {
          issues.push(`Failed to read realtime hot cache: ${getErrorMessage(error)}. Falling back to cold reads.`);
        }

        const totalActiveResponse = propertyId
          ? await safeRunRealtimeReport(analyticsClient, {
            property: `properties/${propertyId}`,
            metrics: [{ name: "activeUsers" }],
          })
          : { rows: [], fallbackUsed: true };

        const intervalResponse = propertyId
          ? await safeRunRealtimeReport(analyticsClient, {
            property: `properties/${propertyId}`,
            metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
            dimensions: [{ name: "minutesAgo" }],
          })
          : { rows: [], fallbackUsed: true };

        if (!propertyId) {
          issues.push("GA realtime is not configured; using first-party fallback only.");
        } else if (totalActiveResponse.fallbackUsed || intervalResponse.fallbackUsed) {
          issues.push("GA realtime request failed; using first-party fallback for live analytics.");
        }

        const rows = intervalResponse.rows || [];
        const gaLiveData = Array.from({ length: 30 }, (_, i) => ({
          minute: i,
          users: 0,
          views: 0,
        }));

        rows.forEach((row: AnalyticsReportRow) => {
          const minAgo = parseInt(row.dimensionValues?.[0]?.value || "0", 10);
          const usersCount = parseInt(row.metricValues?.[0]?.value || "0", 10);
          const viewsCount = parseInt(row.metricValues?.[1]?.value || "0", 10);
          if (minAgo < 30) {
            gaLiveData[minAgo].users = usersCount;
            gaLiveData[minAgo].views = viewsCount;
          }
        });

        const [
          sessionsQuery,
          onboardingFactsSnapshot,
          recentEventFactsSnapshot,
          recentGuestBatchesSnapshot,
          watchSessionsSnapshot,
          watchAssetsSnapshot,
        ] = await Promise.all([
          safeQueryWithDiagnostics({
            routeName: "admin/analytics/realtime",
            channel: "analytics",
            label: "active user sessions",
            issues,
            reader: () => adminDb.collection(ANALYTICS_OPERATIONAL_COLLECTIONS.activeUsers)
              .where("lastSeenAt", ">=", thirtyMinsAgo)
              .limit(ADMIN_ANALYTICS_REALTIME_ACTIVE_USER_LIMIT)
              .get(),
          }),
          safeQueryWithDiagnostics({
            routeName: "admin/analytics/realtime",
            channel: "analytics",
            label: "onboarding event facts",
            issues,
            reader: () => adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.identifiedEventFacts)
              .where("timestamp", ">=", onboardingWindowStartMs)
              .limit(ADMIN_ANALYTICS_REALTIME_EVENT_FACT_LIMIT)
              .get(),
          }),
          safeQueryWithDiagnostics({
            routeName: "admin/analytics/realtime",
            channel: "analytics",
            label: "recent event facts",
            issues,
            reader: () => adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.identifiedEventFacts)
              .where("timestamp", ">=", thirtyMinsAgo)
              .limit(ADMIN_ANALYTICS_REALTIME_EVENT_FACT_LIMIT)
              .get(),
          }),
          safeQueryWithDiagnostics({
            routeName: "admin/analytics/realtime",
            channel: "analytics",
            label: "recent guest batches",
            issues,
            reader: () => adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.guestBatches)
              .where("receivedAtMs", ">=", thirtyMinsAgo)
              .limit(ADMIN_ANALYTICS_REALTIME_SAMPLE_LIMIT)
              .get(),
          }),
          safeQueryWithDiagnostics({
            routeName: "admin/analytics/realtime",
            channel: "analytics",
            label: "watch sessions",
            issues,
            reader: () => adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.watchSessions)
              .where("lastSeenAtMs", ">=", thirtyMinsAgo)
              .limit(ADMIN_ANALYTICS_REALTIME_SAMPLE_LIMIT)
              .get(),
          }),
          safeQueryWithDiagnostics({
            routeName: "admin/analytics/realtime",
            channel: "analytics",
            label: "watch assets",
            issues,
            reader: () => adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.watchAssets)
              .where("lastSeenAtMs", ">=", thirtyMinsAgo)
              .limit(ADMIN_ANALYTICS_REALTIME_SAMPLE_LIMIT)
              .get(),
          }),
        ]);

        const onboardingOverview = buildHistoricalOnboardingOverview({
          onboardingRows: [],
          analyticsEventFacts: onboardingFactsSnapshot.docs,
          startMs: onboardingWindowStartMs,
          eventsData: {},
        });
        const fallbackActiveUsers = buildFallbackActiveUsers({
          activeUserDocs: sessionsQuery.docs,
          eventFactDocs: recentEventFactsSnapshot.docs,
          watchSessionDocs: watchSessionsSnapshot.docs,
        });
        const activeUserIdentityMap = await buildAdminOverviewUserIdentityMap({
          usersCollection: adminDb.collection("users"),
          userIds: fallbackActiveUsers.map((item) => item.uid),
        });
        const activeUsers = fallbackActiveUsers.map((item) => {
          const identity = activeUserIdentityMap.get(item.uid);
          if (!identity) {
            return item;
          }

          return {
            ...item,
            displayName: identity.userDisplayName,
            username: identity.username ?? item.username,
            userIdentityState: identity.userIdentityState,
          };
        });
        if (sessionsQuery.size === 0 && activeUsers.length > 0) {
          issues.push("Live identity lane fell back from analytics_active_users to recent event facts and watch sessions.");
        }

        const firstPartyLiveData = buildFirstPartyLiveData({
          nowMs,
          activeUserDocs: sessionsQuery.docs,
          eventFactDocs: recentEventFactsSnapshot.docs,
          guestBatchDocs: recentGuestBatchesSnapshot.docs,
          watchSessionDocs: watchSessionsSnapshot.docs,
        });
        const guestAnalyticsSnapshot = buildGuestAnalyticsSnapshot({
          nowMs,
          guestBatchDocs: recentGuestBatchesSnapshot.docs,
          guestBatchLimit: ADMIN_ANALYTICS_REALTIME_SAMPLE_LIMIT,
        });
        if (guestAnalyticsSnapshot.guestTruthState === "needs_review") {
          issues.push("Guest analytics snapshot hit its bounded sample cap and needs review.");
        }
        const gaTotalActive = parseInt(totalActiveResponse.rows?.[0]?.metricValues?.[0]?.value || "0", 10);
        const useFirstPartyFallback = Boolean(totalActiveResponse.fallbackUsed || intervalResponse.fallbackUsed)
          || (gaTotalActive <= 0 && activeUsers.length > 0);
        const activeUsersSourceIsPrimary = sessionsQuery.size > 0;

        const totalActive = useFirstPartyFallback ? activeUsers.length : gaTotalActive;
        const liveData = (useFirstPartyFallback ? firstPartyLiveData : gaLiveData)
          .sort((a, b) => b.minute - a.minute);
        const surfaceMix = buildRealtimeSurfaceMix({ activeUsers });
        const watchCaptureHealth = buildWatchCaptureHealthSummary({
          watchSessionDocs: watchSessionsSnapshot.docs,
          watchAssetDocs: watchAssetsSnapshot.docs,
        });

        const coldPayload: AdminRealtimePayload = {
          success: true,
          generatedAtMs: nowMs,
          cacheState: "miss",
          cacheAgeMs: 0,
          cacheSourceLabel: "cold_route_refresh",
          issues,
          totalActive,
          deepTrackerActive: activeUsers.length,
          guestAnalyticsSnapshot,
          liveTruthLabel: activeUsersSourceIsPrimary || !useFirstPartyFallback ? "live" : "fallback",
          liveSourceLabel: useFirstPartyFallback
            ? activeUsersSourceIsPrimary
              ? "analytics_active_users"
              : "first_party_realtime"
            : "ga_realtime",
          activeUsersTruthLabel: sessionsQuery.size > 0 ? "live" : (activeUsers.length > 0 ? "fallback" : "partial"),
          activeUsersSourceLabel: sessionsQuery.size > 0 ? "analytics_active_users" : "analytics_event_facts + analytics_watch_sessions",
          data: liveData,
          activeUsers,
          surfaceMix,
          watchCaptureHealth,
          onboardingStats: {
            starts: onboardingOverview.onboardingStartCount,
            completions: onboardingOverview.normalizedOnboardingCompletions,
            avgDuration: onboardingOverview.avgOnboardingDuration,
            completionRate: onboardingOverview.onboardingCompletionRate,
            startSource: onboardingOverview.onboardingStartSource,
          },
        };

        void persistRealtimeHotSummary(coldPayload).catch((error) => {
          recordRouteWarning(
            "admin/analytics/realtime",
            "Failed to persist realtime hot cache.",
            error,
            { channel: "analytics", moduleKey: "realtime" },
          );
        });

        return coldPayload;
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
        canonicalSource: "ga4_realtime+analytics_active_users+analytics_event_facts",
        fallbackSource: payload.liveTruthLabel === "fallback" ? "first_party_realtime" : null,
        freshnessTimestamp: payload.generatedAtMs ?? Date.now(),
        status: payload.liveTruthLabel === "failed"
          ? "failed"
          : payload.liveTruthLabel === "stale"
            ? "stale"
            : payload.liveTruthLabel === "partial"
              ? "degraded"
              : payload.liveTruthLabel === "fallback" ? "fallback" : "live",
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
