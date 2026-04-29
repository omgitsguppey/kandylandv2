import { describe, expect, it } from "vitest";

import {
    getRouteRuntimeHealthFreshness,
    getRouteRuntimeHealthStatus,
    summarizeRouteRuntimeHealth,
    type RouteRuntimeHealthItem,
} from "@/lib/route-runtime-health";

const BASE_NOW_MS = Date.UTC(2026, 3, 8, 12, 0, 0);

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
        firstObservedAtMs: BASE_NOW_MS - 10_000,
        updatedAtMs: BASE_NOW_MS - 5_000,
        lastSuccessAtMs: BASE_NOW_MS - 5_000,
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
            lastServerErrorAtMs: BASE_NOW_MS - 500,
        }), BASE_NOW_MS)).toBe("fail");
    });

    it("treats the latest slow or client-error sample as warn", () => {
        expect(getRouteRuntimeHealthStatus(buildItem({
            clientErrorCount: 2,
            lastResult: "client_error",
            lastStatusCode: 404,
            lastClientErrorAtMs: BASE_NOW_MS - 500,
        }), BASE_NOW_MS)).toBe("warn");
        expect(getRouteRuntimeHealthStatus(buildItem({
            slowCount: 1,
            lastLatencyMs: 900,
            lastResult: "success",
            lastStatusCode: 200,
        }), BASE_NOW_MS)).toBe("warn");
    });

    it("treats recovered historical slow or error samples as healthy", () => {
        expect(getRouteRuntimeHealthStatus(buildItem({
            clientErrorCount: 2,
            slowCount: 1,
            lastResult: "success",
            lastStatusCode: 200,
            lastLatencyMs: 120,
            lastClientErrorAtMs: BASE_NOW_MS - 30_000,
        }), BASE_NOW_MS)).toBe("healthy");
    });

    it("treats never-observed routes as warn so missing coverage stays visible", () => {
        expect(getRouteRuntimeHealthStatus(buildItem({
            updatedAtMs: 0,
            firstObservedAtMs: 0,
            lastSuccessAtMs: 0,
            lastStatusCode: 0,
        }))).toBe("warn");
    });

    it("treats old route samples as stale instead of healthy", () => {
        const staleItem = buildItem({
            updatedAtMs: Date.UTC(2026, 3, 1, 0, 0, 0),
            lastSuccessAtMs: Date.UTC(2026, 3, 1, 0, 0, 0),
        });

        expect(getRouteRuntimeHealthFreshness(staleItem, Date.UTC(2026, 3, 3, 12, 0, 0))).toBe("stale");
        expect(getRouteRuntimeHealthStatus(staleItem, Date.UTC(2026, 3, 3, 12, 0, 0))).toBe("stale");
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
                lastResult: "client_error",
                lastStatusCode: 404,
                lastClientErrorAtMs: BASE_NOW_MS - 500,
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
                lastLatencyMs: 12_500,
                lastServerErrorAtMs: BASE_NOW_MS - 500,
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
        ], BASE_NOW_MS);

        expect(summary).toMatchObject({
            total: 4,
            healthy: 1,
            warn: 2,
            fail: 1,
            stale: 0,
            unobserved: 1,
            clientErrors: 1,
            serverErrors: 1,
            slow: 1,
        });
    });
});
