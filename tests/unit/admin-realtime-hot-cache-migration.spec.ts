import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION,
  validateAdminRealtimeMigrationEntries,
} from "@/lib/admin/admin-realtime-to-hot-cache-migration";

describe("admin realtime to hot-cache migration", () => {
  it("keeps admin overview off Firestore realtime listeners while preserving chat realtime", () => {
    const overviewHook = readFileSync(join(process.cwd(), "src/hooks/useAdminOverviewRealtime.ts"), "utf-8");
    const chatSource = readFileSync(join(process.cwd(), "src/components/Chat/ChatExperience.tsx"), "utf-8");

    expect(overviewHook).not.toContain("onSnapshot");
    expect(overviewHook).not.toContain("realtime_firestore");
    expect(chatSource).toContain("onSnapshot");
    expect(ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION.some((entry) => entry.classification === "realtime_allowed_user_chat")).toBe(true);
  });

  it("requires owner, reason, max query size, detach behavior, and fallback for realtime exceptions", () => {
    expect(validateAdminRealtimeMigrationEntries()).toEqual([]);
    const exception = ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION.find((entry) => entry.classification === "realtime_allowed_operator_live_debug")?.exception;
    expect(exception).toMatchObject({
      owner: "admin_debug",
      detachBehavior: "cleanup_required",
      fallbackHotCachePath: "admin_debug_snapshot",
    });
    expect(exception?.reason).toContain("Operator live debug");
    expect(exception?.maxQuerySize).toBeGreaterThan(0);
  });

  it("keeps admin analytics metric polling disabled by default", () => {
    const analyticsStateHook = readFileSync(
      join(process.cwd(), "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx"),
      "utf-8",
    );
    const normalizedAnalyticsStateHook = analyticsStateHook.replace(/\r\n/g, "\n");

    expect(normalizedAnalyticsStateHook).toContain("ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS = 0");
    expect(normalizedAnalyticsStateHook).toContain(
      'useAdminPollingSWR<RealtimeAnalyticsResponse>(\n    isLocalAdminUiTestSession ? null : "/api/admin/analytics/realtime",\n    ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS',
    );
    expect(normalizedAnalyticsStateHook).toContain(
      "useAdminPollingSWR<HistoricalAnalyticsResponse>(isLocalAdminUiTestSession ? null : historicalUrl, ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS",
    );
    expect(normalizedAnalyticsStateHook).toContain(
      'useAdminPollingSWR<AdminOverviewResponse>(isLocalAdminUiTestSession ? null : "/api/admin/overview", ADMIN_ANALYTICS_METRIC_POLLING_DISABLED_MS',
    );
  });
});
