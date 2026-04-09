export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN_ANALYTICS_REALTIME_ADAPTIVE } from "@/lib/server/rate-limit";
import { AnalyticsReportRow, safeRunRealtimeReport } from "@/lib/server/admin-analytics-shared";
import { buildRealtimeSurfaceMix } from "@/lib/server/admin-analytics-context";
import { createAdminAnalyticsDataClient, getAdminAnalyticsPropertyId } from "@/lib/server/admin-analytics-data";
import { buildHistoricalOnboardingOverview } from "@/lib/server/admin-analytics-historical-onboarding";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ANALYTICS_CANONICAL_COLLECTIONS, ANALYTICS_OPERATIONAL_COLLECTIONS } from "@/lib/server/analytics-governance";
import { safeQueryWithDiagnostics } from "@/lib/server/diagnostic-read-fallbacks";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";

const propertyId = getAdminAnalyticsPropertyId();
const analyticsClient = createAdminAnalyticsDataClient();

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

    if (!propertyId) {
      return finalize(NextResponse.json({
        error: "GA_PROPERTY_ID is missing from environment variables.",
        requiresSetup: true,
      }, { status: 400 }));
    }

    const nowMs = Date.now();
    const thirtyMinsAgo = nowMs - 30 * 60 * 1000;
    const onboardingWindowStartMs = nowMs - 24 * 60 * 60 * 1000;
    const issues: string[] = [];

    const totalActiveResponse = await safeRunRealtimeReport(analyticsClient, {
      property: `properties/${propertyId}`,
      metrics: [{ name: "activeUsers" }],
    });
    const totalActive = parseInt(totalActiveResponse.rows?.[0]?.metricValues?.[0]?.value || "0", 10);

    const intervalResponse = await safeRunRealtimeReport(analyticsClient, {
      property: `properties/${propertyId}`,
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      dimensions: [{ name: "minutesAgo" }],
    });

    const rows = intervalResponse.rows || [];
    const liveData = Array.from({ length: 30 }, (_, i) => ({
      minute: i,
      users: 0,
      views: 0,
    }));

    rows.forEach((row: AnalyticsReportRow) => {
      const minAgo = parseInt(row.dimensionValues?.[0]?.value || "0", 10);
      const usersCount = parseInt(row.metricValues?.[0]?.value || "0", 10);
      const viewsCount = parseInt(row.metricValues?.[1]?.value || "0", 10);
      if (minAgo < 30) {
        liveData[minAgo].users = usersCount;
        liveData[minAgo].views = viewsCount;
      }
    });

    liveData.sort((a, b) => b.minute - a.minute);

    const [sessionsQuery, onboardingFactsSnapshot] = await Promise.all([
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
    ]);

    const onboardingOverview = buildHistoricalOnboardingOverview({
      onboardingRows: [],
      analyticsEventFacts: onboardingFactsSnapshot.docs,
      startMs: onboardingWindowStartMs,
      eventsData: {},
    });
    const activeUsers = sessionsQuery.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          uid: doc.id,
          username: typeof data.username === "string" ? data.username : doc.id,
          lastSeenAt: typeof data.lastSeenAt === "number" ? data.lastSeenAt : 0,
          lastEventName: typeof data.lastEventName === "string" ? data.lastEventName : "",
          lastPagePath: typeof data.lastPagePath === "string" ? data.lastPagePath : "",
          lastDropTitle: typeof data.lastDropTitle === "string" ? data.lastDropTitle : "",
          lastSemanticScopeLabel: typeof data.lastSemanticScopeLabel === "string" ? data.lastSemanticScopeLabel : "",
          lastComponentName: typeof data.lastComponentName === "string" ? data.lastComponentName : "",
          lastEventModules: typeof data.lastEventModules === "string" ? data.lastEventModules : "",
        };
      })
      .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
      .slice(0, 8);
    const surfaceMix = buildRealtimeSurfaceMix({ activeUsers });

    return finalize(NextResponse.json({
      success: true,
      generatedAtMs: nowMs,
      issues,
      totalActive,
      deepTrackerActive: sessionsQuery.size,
      data: liveData,
      activeUsers,
      surfaceMix,
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
