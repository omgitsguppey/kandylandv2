export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { ADMIN_REALTIME } from "@/lib/server/rate-limit";
import { AnalyticsReportRow, safeRunRealtimeReport } from "@/lib/server/admin-analytics-shared";
import { buildRealtimeSurfaceMix } from "@/lib/server/admin-analytics-context";
import { createAdminAnalyticsDataClient, getAdminAnalyticsPropertyId } from "@/lib/server/admin-analytics-data";
import { buildHistoricalOnboardingOverview } from "@/lib/server/admin-analytics-historical-onboarding";
import { guardApiRequest } from "@/lib/server/request-guard";

const propertyId = getAdminAnalyticsPropertyId();
const analyticsClient = createAdminAnalyticsDataClient();

export async function GET(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "admin/analytics/realtime",
      preAuthRouteName: "admin/analytics/realtime/preauth",
      preAuthRateLimit: ADMIN_REALTIME,
      rateLimit: ADMIN_REALTIME,
      auth: "admin",
      scopeToCaller: true,
    });

    if (!propertyId) {
      return NextResponse.json({
        error: "GA_PROPERTY_ID is missing from environment variables.",
        requiresSetup: true,
      }, { status: 400 });
    }

    const nowMs = Date.now();
    const thirtyMinsAgo = nowMs - 30 * 60 * 1000;
    const onboardingWindowStartMs = nowMs - 24 * 60 * 60 * 1000;

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
      adminDb.collection("analytics_active_users")
        .where("lastSeenAt", ">=", thirtyMinsAgo)
        .get(),
      adminDb.collection("analytics_event_facts")
        .where("timestamp", ">=", onboardingWindowStartMs)
        .get(),
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

    return NextResponse.json({
      success: true,
      generatedAtMs: nowMs,
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
    });
  } catch (error) {
    return handleApiError(error, "Admin.Analytics.Realtime.GET");
  }
}
