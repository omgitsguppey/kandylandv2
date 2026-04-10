import { describe, expect, it } from "vitest";

import {
    buildAdminDebugRouteRuntimeRateSummary,
    filterAdminDebugRouteRuntimeHealth,
} from "@/lib/admin-debug-route-runtime";
import type { RouteRuntimeHealthItem } from "@/lib/route-runtime-health";

const NOW_MS = Date.UTC(2026, 3, 9, 12, 0, 0);

function buildItem(overrides: Partial<RouteRuntimeHealthItem>): RouteRuntimeHealthItem {
    return {
        key: "admin/debug:GET",
        routeName: "/api/admin/debug",
        method: "GET",
        title: "Admin debug",
        slowThresholdMs: 1500,
        successCount: 0,
        clientErrorCount: 0,
        serverErrorCount: 0,
        slowCount: 0,
        averageLatencyMs: 0,
        maxLatencyMs: 0,
        lastLatencyMs: 0,
        lastResult: "success",
        lastStatusCode: 200,
        lastErrorMessage: null,
        firstObservedAtMs: NOW_MS - 60_000,
        updatedAtMs: NOW_MS - 30_000,
        lastSuccessAtMs: NOW_MS - 30_000,
        lastClientErrorAtMs: 0,
        lastServerErrorAtMs: 0,
        ...overrides,
    };
}

describe("admin debug route runtime helpers", () => {
    it("filters stale and unseen routes distinctly", () => {
        const items: RouteRuntimeHealthItem[] = [
            buildItem({
                key: "chat/threads:GET",
                routeName: "/api/chat/threads",
            }),
            buildItem({
                key: "chat/attachments/prepare:POST",
                routeName: "/api/chat/attachments/prepare",
                updatedAtMs: NOW_MS - (30 * 60 * 60 * 1000),
                lastSuccessAtMs: NOW_MS - (30 * 60 * 60 * 1000),
            }),
            buildItem({
                key: "creator/messages:POST",
                routeName: "/api/creator/messages",
                updatedAtMs: 0,
                firstObservedAtMs: 0,
                lastSuccessAtMs: 0,
                lastResult: "success",
                lastStatusCode: 0,
            }),
        ];

        expect(filterAdminDebugRouteRuntimeHealth(items, "stale", NOW_MS)).toHaveLength(1);
        expect(filterAdminDebugRouteRuntimeHealth(items, "unseen", NOW_MS)).toHaveLength(1);
        expect(filterAdminDebugRouteRuntimeHealth(items, "native_chat", NOW_MS)).toHaveLength(2);
        expect(filterAdminDebugRouteRuntimeHealth(items, "compatibility_chat", NOW_MS)).toHaveLength(1);
    });

    it("builds separate native error-rate summaries", () => {
        const items: RouteRuntimeHealthItem[] = [
            buildItem({
                key: "chat/messages:POST",
                routeName: "/api/chat/messages",
                successCount: 7,
                clientErrorCount: 1,
                serverErrorCount: 1,
                lastResult: "server_error",
                lastStatusCode: 500,
                lastServerErrorAtMs: NOW_MS - 5_000,
            }),
            buildItem({
                key: "creator/messages:POST",
                routeName: "/api/creator/messages",
                successCount: 4,
                clientErrorCount: 2,
                lastResult: "client_error",
                lastStatusCode: 400,
                lastClientErrorAtMs: NOW_MS - 10_000,
            }),
        ];

        const nativeSummary = buildAdminDebugRouteRuntimeRateSummary(
            filterAdminDebugRouteRuntimeHealth(items, "native_chat", NOW_MS),
            NOW_MS,
        );
        const compatibilitySummary = buildAdminDebugRouteRuntimeRateSummary(
            filterAdminDebugRouteRuntimeHealth(items, "compatibility_chat", NOW_MS),
            NOW_MS,
        );

        expect(nativeSummary.totalSamples).toBe(9);
        expect(nativeSummary.errorSamples).toBe(2);
        expect(nativeSummary.failCount).toBe(1);
        expect(compatibilitySummary.totalSamples).toBe(6);
        expect(compatibilitySummary.errorSamples).toBe(2);
        expect(compatibilitySummary.unseenCount).toBe(0);
    });
});
