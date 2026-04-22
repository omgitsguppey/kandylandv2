import { describe, expect, it } from "vitest";

import { AI_DEBUG_ASSISTANT_MODEL, type AdminAiDebugSummary } from "@/lib/ai-debug-assistant";
import {
    ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS,
    buildAdminAiDebugRealtimeSignals,
    normalizeAdminAiDebugAssistantSettingsSnapshot,
} from "@/lib/admin-ai-debug-runtime";
import type { RouteRuntimeHealthItem } from "@/lib/route-runtime-health";

function createSummary(overrides?: Partial<AdminAiDebugSummary>): AdminAiDebugSummary {
    return {
        summary: "Canonical assistant summary.",
        likely_root_causes: ["route failures"],
        affected_systems: ["admin debug"],
        confidence_notes: ["bounded sample"],
        suggested_next_checks: ["inspect recent diagnostics"],
        fallback_used: false,
        enabled: true,
        runtime_ready: true,
        configured_model: AI_DEBUG_ASSISTANT_MODEL,
        runtime_project: "kandydrops-by-ikandy",
        runtime_location: "us-central1",
        model: AI_DEBUG_ASSISTANT_MODEL,
        prompt_version: "debug-assistant-v1",
        generated_at: "2026-04-22T18:30:00.000Z",
        latency_ms: 42,
        ...overrides,
    };
}

function createRouteHealth(overrides?: Partial<RouteRuntimeHealthItem>): RouteRuntimeHealthItem {
    return {
        key: ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.read,
        routeName: "admin/debug/assistant",
        title: "Admin debug assistant",
        method: "GET",
        slowThresholdMs: 5000,
        updatedAtMs: Date.parse("2026-04-22T18:31:00.000Z"),
        successCount: 3,
        clientErrorCount: 0,
        serverErrorCount: 0,
        slowCount: 0,
        averageLatencyMs: 220,
        maxLatencyMs: 220,
        lastLatencyMs: 180,
        lastStatusCode: 200,
        lastResult: "success",
        lastErrorMessage: "",
        firstObservedAtMs: Date.parse("2026-04-22T18:20:00.000Z"),
        lastClientErrorAtMs: 0,
        lastSuccessAtMs: Date.parse("2026-04-22T18:31:00.000Z"),
        lastServerErrorAtMs: 0,
        ...overrides,
    };
}

describe("admin AI debug runtime", () => {
    it("normalizes the debug assistant settings model to the canonical alias", () => {
        const result = normalizeAdminAiDebugAssistantSettingsSnapshot({
            enabled: true,
            model: "gemini-2.5-flash-lite-preview-09-2025",
            updatedAtMs: 123,
        });

        expect(result.model).toBe(AI_DEBUG_ASSISTANT_MODEL);
    });

    it("reports a realtime feed and passing preflight checks when live signals are healthy", () => {
        const result = buildAdminAiDebugRealtimeSignals({
            summary: createSummary(),
            settings: {
                enabled: true,
                model: AI_DEBUG_ASSISTANT_MODEL,
                updatedAtMs: Date.parse("2026-04-22T18:29:00.000Z"),
            },
            diagnostics: [],
            routeHealth: {
                [ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.read]: createRouteHealth(),
                [ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.write]: createRouteHealth({
                    key: ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.write,
                    method: "PUT",
                }),
            },
            listenerState: {
                settingsLoaded: true,
                diagnosticsLoaded: true,
                routesLoaded: true,
            },
            nowMs: Date.parse("2026-04-22T18:35:00.000Z"),
        });

        expect(result.feedStatus).toBe("realtime");
        expect(result.preflightChecks.find((entry) => entry.key === "runtime_gate")?.status).toBe("pass");
        expect(result.preflightChecks.find((entry) => entry.key === "recent_ai_diagnostics")?.status).toBe("pass");
    });

    it("degrades to partial when realtime lanes fail and diagnostics report recent errors", () => {
        const result = buildAdminAiDebugRealtimeSignals({
            summary: createSummary({
                runtime_ready: false,
                availability_note: "Vertex AI credentials are unavailable.",
            }),
            settings: {
                enabled: true,
                model: AI_DEBUG_ASSISTANT_MODEL,
                updatedAtMs: Date.parse("2026-04-22T18:29:00.000Z"),
            },
            diagnostics: [{
                id: "diag_1",
                severity: "error",
                message: "Vertex call failed",
                createdAtMs: Date.parse("2026-04-22T18:32:00.000Z"),
            }],
            routeHealth: {
                [ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.read]: createRouteHealth({
                    lastResult: "server_error",
                    serverErrorCount: 2,
                    lastServerErrorAtMs: Date.parse("2026-04-22T18:33:00.000Z"),
                }),
            },
            listenerState: {
                settingsLoaded: true,
                diagnosticsLoaded: false,
                routesLoaded: true,
                diagnosticsFailed: true,
            },
            nowMs: Date.parse("2026-04-22T18:35:00.000Z"),
        });

        expect(result.feedStatus).toBe("partial");
        expect(result.preflightChecks.find((entry) => entry.key === "runtime_gate")?.status).toBe("fail");
        expect(result.preflightChecks.find((entry) => entry.key === "recent_ai_diagnostics")?.status).toBe("fail");
        expect(result.preflightChecks.find((entry) => entry.key === "assistant_read_route")?.status).toBe("fail");
    });
});
