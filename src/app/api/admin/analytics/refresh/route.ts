export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import {
  isAdminMetricSnapshotRange,
  normalizeAdminMetricSnapshotRange,
} from "@/lib/analytics/admin-metric-snapshot";
import {
  getAdminAnalyticsMaterializer,
  isAdminAnalyticsSnapshotModuleKey,
  materializeAdminAnalyticsSnapshot,
} from "@/lib/server/admin-analytics-materializers";
import {
  getLatestVerifiedSnapshot,
  getSnapshotDebugMetadata,
  markSnapshotRefreshCompleted,
  markSnapshotRefreshFailed,
  markSnapshotRefreshStarted,
  runSnapshotRefreshWithDedupe,
} from "@/lib/server/admin-analytics-snapshots";
import { handleApiError } from "@/lib/server/auth";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { guardApiRequest } from "@/lib/server/request-guard";
import { ADMIN_ANALYTICS } from "@/lib/server/rate-limit";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

type RefreshRequestBody = {
  moduleKey?: string;
  rangeKey?: string;
  force?: boolean;
};

const ADMIN_ANALYTICS_REFRESH_BODY_LIMIT_BYTES = 64_000;

const ADMIN_ANALYTICS_PRIVATE_CACHE_HEADERS = {
  "Cache-Control": "private, no-store",
  "CDN-Cache-Control": "no-store",
};

function adminAnalyticsJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...ADMIN_ANALYTICS_PRIVATE_CACHE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

function readModuleAndRange(request: NextRequest, body?: RefreshRequestBody) {
  const moduleKey = body?.moduleKey ?? request.nextUrl.searchParams.get("moduleKey") ?? "";
  const rangeKey = body?.rangeKey ?? request.nextUrl.searchParams.get("rangeKey") ?? "24h";

  if (!isAdminAnalyticsSnapshotModuleKey(moduleKey)) {
    return {
      ok: false as const,
      response: adminAnalyticsJson({
        success: false,
        error: `Unknown admin analytics snapshot module: ${moduleKey || "missing"}`,
      }, { status: 400 }),
    };
  }

  if (!isAdminMetricSnapshotRange(rangeKey)) {
    return {
      ok: false as const,
      response: adminAnalyticsJson({
        success: false,
        error: `Unsupported admin analytics snapshot range: ${rangeKey}`,
      }, { status: 400 }),
    };
  }

  return {
    ok: true as const,
    moduleKey,
    rangeKey: normalizeAdminMetricSnapshotRange(rangeKey),
  };
}

async function GET_handler(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "admin/analytics/refresh",
      preAuthRouteName: "admin/analytics/refresh/preauth",
      preAuthRateLimit: ADMIN_ANALYTICS,
      rateLimit: ADMIN_ANALYTICS,
      auth: "admin",
      scopeToCaller: true,
    });

    const parsed = readModuleAndRange(request);
    if (!parsed.ok) {
      return parsed.response;
    }

    const snapshot = await getLatestVerifiedSnapshot(parsed.moduleKey, parsed.rangeKey);
    const metadata = await getSnapshotDebugMetadata(parsed.moduleKey, parsed.rangeKey);
    const materializer = getAdminAnalyticsMaterializer(parsed.moduleKey);

    return adminAnalyticsJson({
      success: true,
      moduleKey: parsed.moduleKey,
      rangeKey: parsed.rangeKey,
      snapshot,
      metadata,
      materializer: materializer
        ? {
          moduleKey: materializer.moduleKey,
          supportedRanges: materializer.supportedRanges,
          canonicalSources: materializer.canonicalSources,
          parityChecksRequired: materializer.parityChecksRequired,
          legacySupportStatus: materializer.legacySupportStatus,
          currentImplementationStatus: materializer.currentImplementationStatus,
        }
        : null,
    });
  } catch (error) {
    return handleApiError(error, "Admin.Analytics.Refresh.GET");
  }
}

async function POST_handler(request: NextRequest) {
  try {
    const admin = await guardApiRequest(request, {
      routeName: "admin/analytics/refresh",
      preAuthRouteName: "admin/analytics/refresh/preauth",
      preAuthRateLimit: ADMIN_ANALYTICS,
      rateLimit: ADMIN_ANALYTICS,
      auth: "admin",
      scopeToCaller: true,
      requireTrustedOrigin: true,
    });

    const body = await readBoundedJsonBody<RefreshRequestBody>(request, {
      maxBytes: ADMIN_ANALYTICS_REFRESH_BODY_LIMIT_BYTES,
      routeName: "admin/analytics/refresh",
      allowEmpty: true,
    });
    const parsed = readModuleAndRange(request, body);
    if (!parsed.ok) {
      return parsed.response;
    }

    const force = body.force === true;
    const started = await markSnapshotRefreshStarted({
      moduleKey: parsed.moduleKey,
      rangeKey: parsed.rangeKey,
      force,
    });

    if (started.duplicateRefreshPrevented) {
      const metadata = await getSnapshotDebugMetadata(parsed.moduleKey, parsed.rangeKey);
      return adminAnalyticsJson({
        success: true,
        moduleKey: parsed.moduleKey,
        rangeKey: parsed.rangeKey,
        refreshStatus: "duplicate_prevented",
        duplicateRefreshPrevented: true,
        snapshot: started.snapshot ?? await getLatestVerifiedSnapshot(parsed.moduleKey, parsed.rangeKey),
        metadata,
        warnings: ["A refresh is already running for this module and range."],
      });
    }

    try {
      const refreshed = await runSnapshotRefreshWithDedupe({
        moduleKey: parsed.moduleKey,
        rangeKey: parsed.rangeKey,
        force,
        refresh: () => materializeAdminAnalyticsSnapshot({
          moduleKey: parsed.moduleKey,
          rangeKey: parsed.rangeKey,
          force,
          requestedBy: admin?.uid ?? "admin_unknown",
        }),
      });
      const completed = await markSnapshotRefreshCompleted(parsed.moduleKey, parsed.rangeKey, {
        ...refreshed.snapshot,
        refreshStartedAt: started.refreshStartedAt ?? refreshed.snapshot.refreshStartedAt,
        duplicateRefreshPrevented: refreshed.duplicateRefreshPrevented,
      });
      const metadata = await getSnapshotDebugMetadata(parsed.moduleKey, parsed.rangeKey);

      return adminAnalyticsJson({
        success: true,
        moduleKey: parsed.moduleKey,
        rangeKey: parsed.rangeKey,
        refreshStatus: completed.refreshStatus,
        duplicateRefreshPrevented: completed.duplicateRefreshPrevented,
        snapshot: completed,
        metadata,
        warnings: completed.warnings,
      });
    } catch (error) {
      const failed = await markSnapshotRefreshFailed(parsed.moduleKey, parsed.rangeKey, error);
      const snapshot = await getLatestVerifiedSnapshot(parsed.moduleKey, parsed.rangeKey);
      const metadata = await getSnapshotDebugMetadata(parsed.moduleKey, parsed.rangeKey);

      return adminAnalyticsJson({
        success: false,
        moduleKey: parsed.moduleKey,
        rangeKey: parsed.rangeKey,
        refreshStatus: "failed",
        snapshot,
        metadata,
        error: failed.refreshError,
      }, { status: snapshot ? 200 : 500 });
    }
  } catch (error) {
    if (isBoundedJsonBodyError(error)) {
      return adminAnalyticsJson({
        success: false,
        error: error.message,
        code: error.code,
      }, { status: error.status });
    }
    return handleApiError(error, "Admin.Analytics.Refresh.POST");
  }
}

export let GET = withRouteRuntimeHealth("admin/analytics/refresh:GET", GET_handler);
export let POST = withRouteRuntimeHealth("admin/analytics/refresh:POST", POST_handler);
