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
        generateAdminAiDebugSummary: vi.fn(),
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
            this.generateAdminAiDebugSummary.mockReset();
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
    generateAdminAiDebugSummary: mockState.generateAdminAiDebugSummary,
}));

import { GET, dynamic, revalidate } from "@/app/api/admin/debug/assistant/route";

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
                missingIdMetadataCount: 0,
                stuckAwaitingReviewCount: 0,
                roleMismatchCount: 0,
            },
            issues: [],
        });
        mockState.buildAdminAiDebugSignalInput.mockReturnValue({
            generatedAt: "2026-04-03T16:45:00.000Z",
        });
        mockState.generateAdminAiDebugSummary.mockResolvedValue({
            summary: "All canonical admin signals look stable.",
            likely_root_causes: ["No dominant issue cluster in current bounded sample."],
            affected_systems: ["admin debug"],
            confidence_notes: ["Bounded admin summary only."],
            suggested_next_checks: ["Continue monitoring canonical diagnostics."],
            fallback_used: false,
            model: "gemini-2.5-flash-lite",
            prompt_version: "debug-assistant-v1",
            generated_at: "2026-04-03T16:45:00.000Z",
            latency_ms: 21,
        });
    });

    it("is force-dynamic and returns a bounded summary without mutating product state", async () => {
        const response = await GET(new NextRequest("http://localhost/api/admin/debug/assistant"));
        const body = await response.json();

        expect(dynamic).toBe("force-dynamic");
        expect(revalidate).toBe(0);
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toContain("no-store");
        expect(body).toMatchObject({
            summary: "All canonical admin signals look stable.",
            fallback_used: false,
            model: "gemini-2.5-flash-lite",
        });
        expect(mockState.guardApiRequest).toHaveBeenCalledTimes(1);
        expect(mockState.generateAdminAiDebugSummary).toHaveBeenCalledTimes(1);
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });
});
