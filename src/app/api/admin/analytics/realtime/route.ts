export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

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
import { guardApiRequest } from "@/lib/server/request-guard";
import { ANALYTICS_CANONICAL_COLLECTIONS, ANALYTICS_OPERATIONAL_COLLECTIONS } from "@/lib/server/analytics-governance";
import { safeQueryWithDiagnostics } from "@/lib/server/diagnostic-read-fallbacks";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

const propertyId = getAdminAnalyticsPropertyId();
const analyticsClient = createAdminAnalyticsDataClient();

type LiveBucket = {
  minute: number;
  userKeys: Set<string>;
  views: number;
};

type RealtimeIdentity = {
  uid: string;
  username: string;
  lastSeenAt: number;
  lastEventName: string;
  lastPagePath: string;
  lastDropTitle: string;
  lastSemanticScopeLabel: string;
  lastComponentName: string;
  lastEventModules: string;
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

function buildFirstPartyLiveData(input: {
  nowMs: number;
  eventFactDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  guestBatchDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  watchSessionDocs: FirebaseFirestore.QueryDocumentSnapshot[];
}) {
  const buckets = buildEmptyLiveBuckets();

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
      lastSeenAt: toNumber(data.lastSeenAt),
      lastEventName: toStringValue(data.lastEventName),
      lastPagePath: toStringValue(data.lastPagePath),
      lastDropTitle: toStringValue(data.lastDropTitle),
      lastSemanticScopeLabel: toStringValue(data.lastSemanticScopeLabel),
      lastComponentName: toStringValue(data.lastComponentName),
      lastEventModules: toStringValue(data.lastEventModules),
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
      lastSeenAt: toNumber(data.timestamp),
      lastEventName: toStringValue(data.eventName),
      lastPagePath: toStringValue(data.pagePath) || toStringValue(params.page_path),
      lastDropTitle: toStringValue(data.dropTitle) || toStringValue(params.drop_title),
      lastSemanticScopeLabel: toStringValue(params.semantic_scope_label),
      lastComponentName: toStringValue(params.component_name),
      lastEventModules: readEventModules(params.event_modules),
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
      lastSeenAt: toNumber(data.lastSeenAtMs),
      lastEventName: data.isClosed === true ? "viewer_session_closed" : "viewer_session_active",
      lastPagePath: toStringValue(data.pagePath),
      lastDropTitle: toStringValue(data.dropTitle),
      lastSemanticScopeLabel: "Viewer",
      lastComponentName: "",
      lastEventModules: "viewer",
    });
  });

  return Array.from(identities.values())
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
    .slice(0, 8);
}

export async function GET(request: NextRequest) {
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

    const nowMs = Date.now();
    const thirtyMinsAgo = nowMs - 30 * 60 * 1000;
    const onboardingWindowStartMs = nowMs - 24 * 60 * 60 * 1000;
    const issues: string[] = [];

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
          .get(),
      }),
      safeQueryWithDiagnostics({
        routeName: "admin/analytics/realtime",
        channel: "analytics",
        label: "onboarding event facts",
        issues,
        reader: () => adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.identifiedEventFacts)
          .where("timestamp", ">=", onboardingWindowStartMs)
          .get(),
      }),
      safeQueryWithDiagnostics({
        routeName: "admin/analytics/realtime",
        channel: "analytics",
        label: "recent event facts",
        issues,
        reader: () => adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.identifiedEventFacts)
          .where("timestamp", ">=", thirtyMinsAgo)
          .get(),
      }),
      safeQueryWithDiagnostics({
        routeName: "admin/analytics/realtime",
        channel: "analytics",
        label: "recent guest batches",
        issues,
        reader: () => adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.guestBatches)
          .where("receivedAtMs", ">=", thirtyMinsAgo)
          .get(),
      }),
      safeQueryWithDiagnostics({
        routeName: "admin/analytics/realtime",
        channel: "analytics",
        label: "watch sessions",
        issues,
        reader: () => adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.watchSessions)
          .where("lastSeenAtMs", ">=", thirtyMinsAgo)
          .get(),
      }),
      safeQueryWithDiagnostics({
        routeName: "admin/analytics/realtime",
        channel: "analytics",
        label: "watch assets",
        issues,
        reader: () => adminDb.collection(ANALYTICS_CANONICAL_COLLECTIONS.watchAssets)
          .where("lastSeenAtMs", ">=", thirtyMinsAgo)
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
    const activeUsers = fallbackActiveUsers;
    if (sessionsQuery.size === 0 && activeUsers.length > 0) {
      issues.push("Live identity lane fell back from analytics_active_users to recent event facts and watch sessions.");
    }

    const firstPartyLiveData = buildFirstPartyLiveData({
      nowMs,
      eventFactDocs: recentEventFactsSnapshot.docs,
      guestBatchDocs: recentGuestBatchesSnapshot.docs,
      watchSessionDocs: watchSessionsSnapshot.docs,
    });
    const gaTotalActive = parseInt(totalActiveResponse.rows?.[0]?.metricValues?.[0]?.value || "0", 10);
    const useFirstPartyFallback = Boolean(totalActiveResponse.fallbackUsed || intervalResponse.fallbackUsed)
      || (gaTotalActive <= 0 && activeUsers.length > 0);
    if (!propertyId || totalActiveResponse.fallbackUsed || intervalResponse.fallbackUsed) {
      // issue already recorded above
    } else if (gaTotalActive <= 0 && activeUsers.length > 0) {
      issues.push("GA realtime returned no active users; live pulse is using first-party fallback counts.");
    }

    const totalActive = useFirstPartyFallback ? activeUsers.length : gaTotalActive;
    const liveData = (useFirstPartyFallback ? firstPartyLiveData : gaLiveData)
      .sort((a, b) => b.minute - a.minute);
    const surfaceMix = buildRealtimeSurfaceMix({ activeUsers });
    const watchCaptureHealth = buildWatchCaptureHealthSummary({
      watchSessionDocs: watchSessionsSnapshot.docs,
      watchAssetDocs: watchAssetsSnapshot.docs,
    });

    return finalize(NextResponse.json({
      success: true,
      generatedAtMs: nowMs,
      issues,
      totalActive,
      deepTrackerActive: activeUsers.length,
      liveTruthLabel: useFirstPartyFallback ? "fallback" : "live",
      liveSourceLabel: useFirstPartyFallback ? "first_party_realtime" : "ga_realtime",
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
    }));
  } catch (error) {
    return finalize(handleApiError(error, "Admin.Analytics.Realtime.GET"), error);
  }
}
