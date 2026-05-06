import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDoc = {
    id: string;
    data: () => Record<string, unknown>;
    exists?: boolean;
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, MockDoc[]>();
    const documents = new Map<string, Record<string, unknown>>();

    const createQuerySnapshot = (docs: MockDoc[]) => ({
        docs,
        size: docs.length,
        empty: docs.length === 0,
    });

    const createCollectionRef = (name: string) => {
        const docs = collections.get(name) ?? [];

        return {
            where() {
                return this;
            },
            orderBy() {
                return this;
            },
            limit() {
                return this;
            },
            doc(id: string) {
                return {
                    get: async () => ({
                        exists: documents.has(`${name}/${id}`),
                        data: () => documents.get(`${name}/${id}`),
                    }),
                };
            },
            async get() {
                return createQuerySnapshot(docs) as FirebaseFirestore.QuerySnapshot;
            },
        };
    };

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        buildAdminOpsHealth: vi.fn(),
        buildAdminOrchestrationSnapshot: vi.fn(),
        buildCreatorOnboardingDiagnostics: vi.fn(),
        buildAdminAiDebugSignalInput: vi.fn(),
        buildAdminAiDebugFallback: vi.fn(),
        buildAdminAiDebugSavedSummary: vi.fn(),
        resolveAdminAiDebugVertexRuntime: vi.fn(),
        generateAdminAiDebugSummary: vi.fn(),
        getAdminAiDebugAssistantSettings: vi.fn(),
        saveAdminAiDebugAssistantSettings: vi.fn(),
        recordRouteRuntimeSample: vi.fn(),
        adminDb: {
            collection(name: string) {
                return createCollectionRef(name);
            },
        },
        collections,
        documents,
        reset() {
            collections.clear();
            documents.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.buildAdminOpsHealth.mockReset();
            this.buildAdminOrchestrationSnapshot.mockReset();
            this.buildCreatorOnboardingDiagnostics.mockReset();
            this.buildAdminAiDebugSignalInput.mockReset();
            this.buildAdminAiDebugFallback.mockReset();
            this.buildAdminAiDebugSavedSummary.mockReset();
            this.resolveAdminAiDebugVertexRuntime.mockReset();
            this.generateAdminAiDebugSummary.mockReset();
            this.getAdminAiDebugAssistantSettings.mockReset();
            this.saveAdminAiDebugAssistantSettings.mockReset();
            this.recordRouteRuntimeSample.mockReset();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN_DEBUG_ASSISTANT: {},
}));
vi.mock("@/lib/server/admin-ops-health", () => ({
    buildAdminOpsHealth: mockState.buildAdminOpsHealth,
}));
vi.mock("@/lib/server/admin-orchestration", () => ({
    buildAdminOrchestrationSnapshot: mockState.buildAdminOrchestrationSnapshot,
}));
vi.mock("@/lib/server/creator-onboarding-diagnostics", () => ({
    buildCreatorOnboardingDiagnostics: mockState.buildCreatorOnboardingDiagnostics,
}));
vi.mock("@/lib/server/ai-debug-assistant", () => ({
    buildAdminAiDebugSignalInput: mockState.buildAdminAiDebugSignalInput,
    buildAdminAiDebugFallback: mockState.buildAdminAiDebugFallback,
    buildAdminAiDebugSavedSummary: mockState.buildAdminAiDebugSavedSummary,
    resolveAdminAiDebugVertexRuntime: mockState.resolveAdminAiDebugVertexRuntime,
    generateAdminAiDebugSummary: mockState.generateAdminAiDebugSummary,
}));
vi.mock("@/lib/server/admin-debug-settings", () => ({
    getAdminAiDebugAssistantSettings: mockState.getAdminAiDebugAssistantSettings,
    saveAdminAiDebugAssistantSettings: mockState.saveAdminAiDebugAssistantSettings,
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
    withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { GET, POST, dynamic, revalidate } from "@/app/api/admin/debug/assistant/route";

describe("GET /api/admin/debug/assistant", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            role: "admin",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.buildAdminOpsHealth.mockReturnValue({
            score: 91,
            runtime: {
                gaPropertyConfigured: true,
                vapidConfigured: true,
                databaseUrlConfigured: true,
                projectId: "kandydrops-by-ikandy",
                navigationSessionSigningReady: true,
                warnings: [],
            },
            diagnostics: {
                total: 0,
                errorCount: 0,
                warnCount: 0,
                infoCount: 0,
                activeErrorCount: 0,
                activeWarnCount: 0,
                recentErrorCount: 0,
                recentWarnCount: 0,
                activeIssueClusterCount: 0,
                recentIssueClusterCount: 0,
                activeWindowMs: 21600000,
                recentWindowMs: 86400000,
                lastDiagnosticAt: 0,
                channels: [],
                recent: [],
            },
            pipeline: {
                status: "healthy",
                failureCount: 0,
                lastFailureAt: 0,
                lastRouteName: "",
                lastErrorMessage: "",
                activeWindowMs: 21600000,
                recentWindowMs: 86400000,
                routes: [],
            },
            materializers: [],
        });
        mockState.buildAdminOrchestrationSnapshot.mockReturnValue({
            summary: {
                score: 88,
                openFindings: 0,
                criticalFindings: 0,
                actionableProposals: 0,
                contaminationRisks: 0,
                lowConfidenceEvents: 0,
            },
            domainSummary: [],
            findings: [],
        });
        mockState.buildCreatorOnboardingDiagnostics.mockReturnValue({
            summary: {
                totalIssues: 0,
                missingQueueCount: 0,
                missingSourceCount: 0,
                projectionWithoutSourceCount: 0,
                queueParityMismatchCount: 0,
                missingIdMetadataCount: 0,
                stuckAwaitingReviewCount: 0,
                roleMismatchCount: 0,
            },
            issues: [],
        });
        mockState.buildAdminAiDebugSignalInput.mockReturnValue({
            generatedAt: "2026-04-03T16:45:00.000Z",
        });
        mockState.resolveAdminAiDebugVertexRuntime.mockReturnValue({
            project: "kandydrops-by-ikandy",
            location: "us-central1",
            model: "gemini-3.1-flash-lite-preview",
        });
        mockState.getAdminAiDebugAssistantSettings.mockResolvedValue({
            enabled: true,
            model: "gemini-3.1-flash-lite-preview",
            lastSummary: null,
            lastLiveCallAtMs: null,
        });
        mockState.saveAdminAiDebugAssistantSettings.mockImplementation(async (payload: Record<string, unknown>) => ({
            enabled: payload.enabled ?? true,
            model: payload.model ?? "gemini-3.1-flash-lite-preview",
            lastSummary: payload.lastSummary ?? null,
            lastLiveCallAtMs: payload.lastLiveCallAtMs ?? null,
        }));
        mockState.buildAdminAiDebugFallback.mockReturnValue({
            summary: "Fallback summary.",
            issue_summary: "Fallback issue summary.",
            source_evidence: ["bounded evidence"],
            likely_cause: "No saved summary is available yet.",
            likely_root_causes: ["route sample only"],
            affected_systems: ["admin debug"],
            safe_fix_plan: ["inspect diagnostics"],
            files_to_inspect: ["src/app/api/admin/debug/assistant/route.ts"],
            validators_to_run: ["npm run check:admin-debug-control-tower"],
            apply_eligibility: { state: "inspect_only", reason: "fallback", allowed_fix_types: ["inspect"] },
            rollback_note: "No mutation.",
            confidence: "medium",
            confidence_notes: ["fallback only"],
            suggested_next_checks: ["refresh live guidance explicitly"],
            fallback_used: true,
            response_state: "fallback",
            enabled: true,
            runtime_ready: true,
            live_call_eligible: true,
            cost_guard_state: "admin_gated",
            provider: "vertex_ai",
            model_role: "admin_debug_assistant",
            configured_model: "gemini-3.1-flash-lite-preview",
            runtime_project: "kandydrops-by-ikandy",
            runtime_location: "us-central1",
            model: "gemini-3.1-flash-lite-preview",
            prompt_version: "debug-assistant-v2",
            generated_at: "2026-04-03T16:45:00.000Z",
            latency_ms: 21,
            availability_note: "Live AI summary delayed. Showing deterministic fallback.",
            fallback_reason: "page_load_no_live_call",
        });
        mockState.generateAdminAiDebugSummary.mockResolvedValue({
            summary: "All canonical admin signals look stable.",
            issue_summary: "Canonical admin signals look stable in the bounded live sample.",
            source_evidence: ["no dominant issue cluster"],
            likely_cause: "No major route or orchestration incident is active.",
            likely_root_causes: ["No dominant issue cluster in current bounded sample."],
            affected_systems: ["admin debug"],
            safe_fix_plan: ["continue monitoring"],
            files_to_inspect: ["src/app/api/admin/debug/assistant/route.ts"],
            validators_to_run: ["npm run check:admin-debug-control-tower"],
            apply_eligibility: { state: "inspect_only", reason: "No fix required.", allowed_fix_types: ["inspect"] },
            rollback_note: "No mutation.",
            confidence: "high",
            confidence_notes: ["Bounded admin summary only."],
            suggested_next_checks: ["Continue monitoring canonical diagnostics."],
            fallback_used: false,
            response_state: "live",
            enabled: true,
            runtime_ready: true,
            live_call_eligible: true,
            cost_guard_state: "admin_gated",
            provider: "vertex_ai",
            model_role: "admin_debug_assistant",
            configured_model: "gemini-3.1-flash-lite-preview",
            runtime_project: "kandydrops-by-ikandy",
            runtime_location: "us-central1",
            model: "gemini-3.1-flash-lite-preview",
            prompt_version: "debug-assistant-v2",
            generated_at: "2026-04-03T16:45:00.000Z",
            latency_ms: 21,
        });
    });

    it("is force-dynamic and returns saved or fallback status without triggering a live model call on GET", async () => {
        const response = await GET(new NextRequest("http://localhost/api/admin/debug/assistant"));
        const body = await response.json();

        expect(dynamic).toBe("force-dynamic");
        expect(revalidate).toBe(0);
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toContain("no-store");
        expect(body).toMatchObject({
            summary: "Fallback summary.",
            fallback_used: true,
            model: "gemini-3.1-flash-lite-preview",
        });
        expect(mockState.guardApiRequest).toHaveBeenCalledTimes(1);
        expect(mockState.generateAdminAiDebugSummary).not.toHaveBeenCalled();
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });

    it("runs a live generation only on explicit POST", async () => {
        const response = await POST(new NextRequest("http://localhost/api/admin/debug/assistant", {
            method: "POST",
            body: JSON.stringify({ action: "generate_live_summary" }),
            headers: { "content-type": "application/json" },
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            summary: "All canonical admin signals look stable.",
            response_state: "live",
        });
        expect(mockState.generateAdminAiDebugSummary).toHaveBeenCalledTimes(1);
        expect(mockState.saveAdminAiDebugAssistantSettings).toHaveBeenCalledTimes(1);
    });
});
