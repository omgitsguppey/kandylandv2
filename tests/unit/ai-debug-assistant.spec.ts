import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    recordRouteWarning: vi.fn(),
}));
vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: vi.fn().mockResolvedValue(undefined),
}));

import {
    AI_DEBUG_ASSISTANT_MODEL,
    AI_DEBUG_ASSISTANT_PROMPT_VERSION,
    type AdminAiDebugSignalInput,
} from "@/lib/ai-debug-assistant";
import {
    buildAdminAiDebugFallback,
    buildAdminAiDebugPrompt,
    buildAdminAiDebugSignalInput,
    generateAdminAiDebugSummary,
    resolveAdminAiDebugVertexRuntime,
} from "@/lib/server/ai-debug-assistant";

function createSignal(overrides?: Partial<AdminAiDebugSignalInput>) : AdminAiDebugSignalInput {
    return {
        generatedAt: "2026-04-03T16:45:00.000Z",
        ops: {
            score: 72,
            pipelineFailureCount: 3,
            lastPipelineFailureAt: 12345,
            topRoutes: [{ route: "analytics_ingest", count: 3 }],
            degradedMaterializers: [{ label: "Guest batches", status: "warn", detail: "Stale for 2 days" }],
            runtimeWarnings: ["Missing VAPID key"],
            diagnosticChannels: [{ label: "Analytics", errorCount: 2, warnCount: 3, count: 5 }],
            recentDiagnostics: [{ channel: "analytics", severity: "error", message: "Guest ingest failed", detailPreview: "route: analytics_ingest" }],
        },
        orchestration: {
            score: 68,
            openFindings: 2,
            criticalFindings: 1,
            actionableProposals: 1,
            contaminationRisks: 0,
            lowConfidenceEvents: 2,
            topDomains: [{ key: "drops", eventCount: 10, openFindingCount: 2 }],
            findings: [{ title: "Projection drift", severity: "error", summary: "Drop projection is stale", fixSummary: "Rebuild projection" }],
        },
        creatorOnboarding: {
            totalIssues: 1,
            missingQueueCount: 1,
            missingSourceCount: 0,
      projectionWithoutSourceCount: 0,
      queueParityMismatchCount: 0,
      missingIdMetadataCount: 0,
            stuckAwaitingReviewCount: 0,
            roleMismatchCount: 0,
            sampleIssues: [{ severity: "warn", message: "Queue record missing", detail: "Manual review queue has no canonical source." }],
        },
        ...overrides,
    };
}

describe("admin AI debug assistant", () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
    });

    it("assembles a bounded prompt from existing canonical summaries", () => {
        const prompt = buildAdminAiDebugPrompt(createSignal());

        expect(prompt).toContain("Return JSON only with these exact keys");
        expect(prompt).toContain("\"pipelineFailureCount\":3");
        expect(prompt).toContain("\"title\":\"Projection drift\"");
        expect(prompt).toContain("\"message\":\"Queue record missing\"");
        expect(prompt).toContain("You are KandyDrops' internal debug assistant.");
    });

    it("builds a deterministic fallback when the feature flag is disabled", async () => {
        const result = await generateAdminAiDebugSummary(createSignal(), {
            settings: {
                enabled: false,
                model: AI_DEBUG_ASSISTANT_MODEL,
                updatedAtMs: 0,
                updatedByUid: "",
                updatedByEmail: null,
            },
        });

        expect(result.fallback_used).toBe(true);
        expect(result.model).toBe(AI_DEBUG_ASSISTANT_MODEL);
        expect(result.prompt_version).toBe(AI_DEBUG_ASSISTANT_PROMPT_VERSION);
        expect(result.availability_note).toContain("disabled in admin settings");
        expect(result.likely_root_causes.length).toBeGreaterThan(0);
    });

    it("uses the configured model location when Vertex location env vars are absent", () => {
        vi.stubEnv("VERTEX_AI_LOCATION", "");
        vi.stubEnv("GOOGLE_CLOUD_LOCATION", "");
        vi.stubEnv("GCLOUD_LOCATION", "");

        expect(resolveAdminAiDebugVertexRuntime(AI_DEBUG_ASSISTANT_MODEL)).toMatchObject({
            model: AI_DEBUG_ASSISTANT_MODEL,
            location: "global",
        });
    });

    it("returns a live structured summary when the model responds with valid JSON", async () => {
        const runner = vi.fn().mockResolvedValue(JSON.stringify({
            summary: "Analytics ingest is failing and creator onboarding parity also needs review.",
            likely_root_causes: ["analytics ingest route failures", "stale drop projection rebuild backlog"],
            affected_systems: ["analytics pipeline", "behavior orchestration"],
            confidence_notes: ["bounded operational sample only"],
            suggested_next_checks: ["inspect analytics_ingest failures", "review projection drift finding"],
        }));
        const result = await generateAdminAiDebugSummary(createSignal(), {
            settings: {
                enabled: true,
                model: "gemini-custom-debug-model",
                updatedAtMs: 0,
                updatedByUid: "",
                updatedByEmail: null,
            },
            project: "kandydrops-by-ikandy",
            location: "us-central1",
            runner,
        });

        expect(result.fallback_used).toBe(false);
        expect(result.summary).toContain("Analytics ingest is failing");
        expect(result.model).toBe("gemini-custom-debug-model");
        expect(result.configured_model).toBe("gemini-custom-debug-model");
        expect(result.prompt_version).toBe(AI_DEBUG_ASSISTANT_PROMPT_VERSION);
        expect(result.generated_at).toBe("2026-04-03T16:45:00.000Z");
        expect(runner).toHaveBeenCalledWith(expect.objectContaining({
            model: "gemini-custom-debug-model",
        }));
    });

    it("falls back safely when ADC or Vertex auth is unavailable", async () => {
        const result = await generateAdminAiDebugSummary(createSignal(), {
            settings: {
                enabled: true,
                model: AI_DEBUG_ASSISTANT_MODEL,
                updatedAtMs: 0,
                updatedByUid: "",
                updatedByEmail: null,
            },
            project: "kandydrops-by-ikandy",
            runner: vi.fn().mockRejectedValue(new Error("Could not load the default credentials.")),
        });

        expect(result.fallback_used).toBe(true);
        expect(result.availability_note).toContain("gcloud auth application-default login");
        expect(result.suggested_next_checks).toContain("Review pipeline failures for analytics_ingest.");
    });

    it("falls back safely when the model emits malformed output", async () => {
        const result = await generateAdminAiDebugSummary(createSignal(), {
            settings: {
                enabled: true,
                model: AI_DEBUG_ASSISTANT_MODEL,
                updatedAtMs: 0,
                updatedByUid: "",
                updatedByEmail: null,
            },
            project: "kandydrops-by-ikandy",
            runner: vi.fn().mockResolvedValue("not json"),
        });

        expect(result.fallback_used).toBe(true);
        expect(result.summary).toContain("fallback");
    });

    it("builds a bounded signal payload from current debug summaries", () => {
        const signal = buildAdminAiDebugSignalInput({
            generatedAt: "2026-04-03T16:45:00.000Z",
            opsHealth: {
                score: 72,
                canonicalState: { status: "Live" },
                runtime: {
                    gaPropertyConfigured: true,
                    vapidConfigured: false,
                    databaseUrlConfigured: true,
                    projectId: "kandydrops-by-ikandy",
                    navigationSessionSigningReady: true,
                    warnings: ["Missing VAPID key", "Duplicate warning", "Missing VAPID key"],
                },
                diagnostics: {
                    total: 1,
                    errorCount: 1,
                    warnCount: 0,
                    infoCount: 0,
                    activeErrorCount: 1,
                    activeWarnCount: 0,
                    recentErrorCount: 1,
                    recentWarnCount: 0,
                    activeIssueClusterCount: 1,
                    recentIssueClusterCount: 1,
                    activeWindowMs: 21600000,
                    recentWindowMs: 86400000,
                    lastDiagnosticAt: 100,
                    channels: [{
                        key: "analytics",
                        label: "Analytics",
                        count: 1,
                        errorCount: 1,
                        warnCount: 0,
                        infoCount: 0,
                        activeErrorCount: 1,
                        activeWarnCount: 0,
                        recentErrorCount: 1,
                        recentWarnCount: 0,
                        lastSeenAt: 100,
                    }],
                    recent: [{ id: "diag_1", channel: "analytics", severity: "error", message: "Ingest failed", timestamp: 100, detailPreview: "route" }],
                },
                pipeline: {
                    status: "warn",
                    failureCount: 2,
                    activeFailureCount: 2,
                    recentFailureCount: 2,
                    sampleFailureCount: 2,
                    lastFailureAt: 100,
                    lastRouteName: "analytics/ingest",
                    lastErrorMessage: "ingest failed",
                    activeWindowMs: 21600000,
                    recentWindowMs: 86400000,
                    routes: [{ routeKey: "analytics_ingest", label: "Analytics Ingest", count: 2 }],
                },
                materializers: [{ key: "guest_batches", label: "Guest batches", engine: "firestore", status: "warn", count: 0, lastSeenAt: 0, detail: "Missing" }],
            },
            orchestration: {
                summary: {
                    score: 88,
                    eventCount: 10,
                    openFindings: 1,
                    criticalFindings: 0,
                    actionableProposals: 1,
                    contaminationRisks: 0,
                    trainingEligible: 4,
                    recommendationReady: 3,
                    lowConfidenceEvents: 1,
                },
                domainSummary: [{ key: "drops", eventCount: 4, findingCount: 2, openFindingCount: 1, trainingEligibleCount: 1, recommendationReadyCount: 1, lowConfidenceCount: 0 }],
                dependencyReadiness: {
                    actorMissingCount: 0,
                    sessionMissingCount: 0,
                    routeMissingCount: 0,
                    creatorContextMissingCount: 0,
                },
                events: [],
                findings: [{ id: "finding_1", findingKey: "projection_drift", sourceDocumentPath: "drops/1", domain: "drops", systemKey: "projection", severity: "warn", status: "open", title: "Projection drift", detail: "detail", humanSummary: "Projection drift", fixSummary: "Rebuild projection", detectedAtMs: 10, updatedAtMs: 11, actorKey: "actor", sessionKey: "session", eventRecordId: "event", repair: { actionType: "rebuild_projection", label: "Rebuild", detail: "Rebuild it", requiresAdminConfirmation: true } }],
                proposals: [],
                actorSummaries: [],
                repairActions: [],
            },
            creatorOnboardingDiagnostics: {
                summary: {
                    totalIssues: 1,
                    missingQueueCount: 1,
                    missingSourceCount: 0,
      projectionWithoutSourceCount: 0,
      queueParityMismatchCount: 0,
      missingIdMetadataCount: 0,
                    stuckAwaitingReviewCount: 0,
                    roleMismatchCount: 0,
                },
                issues: [{ key: "missing_queue_record", severity: "warn", userId: "user_1", creatorDisplayName: "Creator One", message: "Missing queue", detail: "detail", link: "/admin/user/user_1" }],
            },
        });

        expect(signal.ops.runtimeWarnings).toEqual(["Missing VAPID key", "Duplicate warning"]);
        expect(signal.orchestration.findings[0]).toMatchObject({
            title: "Projection drift",
            fixSummary: "Rebuild projection",
        });
        expect(signal.creatorOnboarding.sampleIssues[0]).toMatchObject({
            message: "Missing queue",
        });
    });

    it("creates explicit fallback summaries without mutating the signal shape", () => {
        const fallback = buildAdminAiDebugFallback({
            signal: createSignal(),
            settings: {
                enabled: true,
                model: AI_DEBUG_ASSISTANT_MODEL,
                updatedAtMs: 0,
                updatedByUid: "",
                updatedByEmail: null,
            },
            runtime: {
                project: "kandydrops-by-ikandy",
                location: "us-central1",
                model: AI_DEBUG_ASSISTANT_MODEL,
            },
            availabilityNote: "Vertex AI is temporarily unavailable.",
            latencyMs: 42,
        });

        expect(fallback).toMatchObject({
            fallback_used: true,
            model: AI_DEBUG_ASSISTANT_MODEL,
            prompt_version: AI_DEBUG_ASSISTANT_PROMPT_VERSION,
            latency_ms: 42,
            availability_note: "Vertex AI is temporarily unavailable.",
        });
    });
});
