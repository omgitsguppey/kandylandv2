import { describe, expect, it } from "vitest";

import {
    getRouteRuntimeHealthStatus,
    summarizeRouteRuntimeHealth,
    type RouteRuntimeHealthItem,
} from "@/lib/route-runtime-health";

function buildItem(overrides: Partial<RouteRuntimeHealthItem>): RouteRuntimeHealthItem {
    return {
        key: "creator/relationships:GET",
        routeName: "creator/relationships",
        method: "GET",
        title: "Creator relationships reads",
        slowThresholdMs: 800,
        successCount: 5,
        clientErrorCount: 0,
        serverErrorCount: 0,
        slowCount: 0,
        averageLatencyMs: 140,
        maxLatencyMs: 220,
        lastLatencyMs: 120,
        lastResult: "success",
        lastStatusCode: 200,
        lastErrorMessage: null,
        firstObservedAtMs: 100,
        updatedAtMs: 200,
        lastSuccessAtMs: 200,
        lastClientErrorAtMs: 0,
        lastServerErrorAtMs: 0,
        ...overrides,
    };
}

describe("route runtime health", () => {
    it("treats a current server error as fail", () => {
        expect(getRouteRuntimeHealthStatus(buildItem({
            serverErrorCount: 1,
            lastResult: "server_error",
            lastStatusCode: 500,
        }))).toBe("fail");
    });

    it("treats historical slow or client-error history as warn", () => {
        expect(getRouteRuntimeHealthStatus(buildItem({
            clientErrorCount: 2,
            lastResult: "success",
            lastStatusCode: 200,
        }))).toBe("warn");
        expect(getRouteRuntimeHealthStatus(buildItem({
            slowCount: 1,
            lastResult: "success",
            lastStatusCode: 200,
        }))).toBe("warn");
    });

    it("treats never-observed routes as warn so missing coverage stays visible", () => {
        expect(getRouteRuntimeHealthStatus(buildItem({
            updatedAtMs: 0,
            firstObservedAtMs: 0,
            lastSuccessAtMs: 0,
            lastStatusCode: 0,
        }))).toBe("warn");
    });

    it("summarizes route health totals", () => {
        const summary = summarizeRouteRuntimeHealth([
            buildItem({}),
            buildItem({
                key: "support/threads:POST",
                routeName: "support/threads",
                method: "POST",
                title: "Support ticket creation",
                clientErrorCount: 1,
            }),
            buildItem({
                key: "admin/ai/drop-covers/generate:POST",
                routeName: "admin/ai/drop-covers/generate",
                method: "POST",
                title: "AI cover generation",
                serverErrorCount: 1,
                lastResult: "server_error",
                lastStatusCode: 500,
                slowCount: 2,
            }),
            buildItem({
                key: "admin/debug:GET",
                routeName: "admin/debug",
                method: "GET",
                title: "Admin debug snapshot",
                updatedAtMs: 0,
                firstObservedAtMs: 0,
                lastSuccessAtMs: 0,
                lastStatusCode: 0,
            }),
        ]);

        expect(summary).toMatchObject({
            total: 4,
            healthy: 1,
            warn: 2,
            fail: 1,
            unobserved: 1,
            clientErrors: 1,
            serverErrors: 1,
            slow: 2,
        });
    });
});
