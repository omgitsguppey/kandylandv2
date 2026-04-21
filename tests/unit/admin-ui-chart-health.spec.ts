import { describe, expect, it } from "vitest";

import {
    buildAdminUiChartHealthItem,
    summarizeAdminUiChartHealth,
} from "@/lib/admin-ui-chart-health";

describe("admin UI chart health helpers", () => {
    it("marks blocking failures as failed hydration", () => {
        const item = buildAdminUiChartHealthItem({
            key: "analytics.operations.live_pulse",
            title: "Live Pulse",
            page: "analytics",
            category: "operations",
            source: "mixed_client_live",
            updatedAtMs: 123,
            hasLoaded: true,
            hasData: false,
            blockingIssues: ["Realtime analytics request failed."],
            healthySummary: "Loaded.",
            emptySummary: "Empty.",
        });

        expect(item).toMatchObject({
            status: "fail",
            hydrationState: "failed",
            issueCount: 1,
            summary: "Realtime analytics request failed.",
        });
    });

    it("marks loaded empty sections as warn without inventing a failure", () => {
        const nowMs = Date.UTC(2026, 3, 18, 12, 0, 0);
        const item = buildAdminUiChartHealthItem({
            key: "analytics.audience.regions",
            title: "Regions",
            page: "analytics",
            category: "audience",
            source: "historical_analytics",
            updatedAtMs: nowMs - 10 * 60 * 1000,
            nowMs,
            staleAfterMs: 24 * 60 * 60 * 1000,
            hasLoaded: true,
            hasData: false,
            healthySummary: "Loaded.",
            emptySummary: "No regional rows were returned.",
        });

        expect(item).toMatchObject({
            status: "warn",
            hydrationState: "empty",
            summary: "No regional rows were returned.",
            issueCount: 0,
        });
    });

    it("marks loaded sections with background issues as degraded instead of failed", () => {
        const nowMs = Date.UTC(2026, 3, 18, 12, 0, 0);
        const item = buildAdminUiChartHealthItem({
            key: "dashboard.recent_transactions",
            title: "Recent transactions",
            page: "dashboard",
            category: "overview",
            source: "realtime_analytics",
            updatedAtMs: nowMs - 2 * 60 * 1000,
            nowMs,
            staleAfterMs: 24 * 60 * 60 * 1000,
            hasLoaded: true,
            hasData: true,
            backgroundIssues: ["Live transaction listener failed."],
            healthySummary: "Loaded.",
            emptySummary: "Empty.",
        });

        expect(item).toMatchObject({
            status: "warn",
            hydrationState: "background_degraded",
            summary: "Live transaction listener failed.",
            issueCount: 1,
        });
    });

    it("downgrades loaded sections with stale freshness to warn", () => {
        const nowMs = Date.UTC(2026, 3, 18, 12, 0, 0);
        const item = buildAdminUiChartHealthItem({
            key: "dashboard.platform_pulse",
            title: "Platform pulse",
            page: "dashboard",
            category: "overview",
            source: "overview_snapshot",
            updatedAtMs: nowMs - 20 * 60 * 1000,
            nowMs,
            hasLoaded: true,
            hasData: true,
            healthySummary: "Loaded.",
            emptySummary: "Empty.",
        });

        expect(item).toMatchObject({
            status: "warn",
            hydrationState: "background_degraded",
            issueCount: 1,
        });
        expect(item.summary).toContain("stale data");
    });

    it("summarizes category counts from the reported chart items", () => {
        const nowMs = Date.UTC(2026, 3, 18, 12, 0, 0);
        const summary = summarizeAdminUiChartHealth([
            buildAdminUiChartHealthItem({
                key: "dashboard.platform_pulse",
                title: "Platform pulse",
                page: "dashboard",
                category: "overview",
                source: "overview_snapshot",
                updatedAtMs: Date.UTC(2026, 3, 18, 11, 59, 0),
                nowMs,
                staleAfterMs: 24 * 60 * 60 * 1000,
                hasLoaded: true,
                hasData: true,
                healthySummary: "Loaded.",
                emptySummary: "Empty.",
            }),
            buildAdminUiChartHealthItem({
                key: "analytics.operations.event_mix",
                title: "Event Mix",
                page: "analytics",
                category: "operations",
                source: "historical_analytics",
                updatedAtMs: Date.UTC(2026, 3, 18, 11, 58, 0),
                nowMs,
                staleAfterMs: 24 * 60 * 60 * 1000,
                hasLoaded: true,
                hasData: false,
                healthySummary: "Loaded.",
                emptySummary: "No events.",
            }),
        ]);

        expect(summary).toMatchObject({
            total: 2,
            healthy: 1,
            warn: 1,
            fail: 0,
            byCategory: {
                overview: {
                    total: 1,
                    healthy: 1,
                    warn: 0,
                    fail: 0,
                },
                operations: {
                    total: 1,
                    healthy: 0,
                    warn: 1,
                    fail: 0,
                },
            },
        });
    });
});
