import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    buildAdminAiDropCoverDashboard: vi.fn(),
    saveAdminAiDropCoverSettings: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.buildAdminAiDropCoverDashboard.mockReset();
        this.saveAdminAiDropCoverSettings.mockReset();
    },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/ai-drop-covers", () => ({
    buildAdminAiDropCoverDashboard: mockState.buildAdminAiDropCoverDashboard,
    saveAdminAiDropCoverSettings: mockState.saveAdminAiDropCoverSettings,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN_AI_CONTROL: {},
    ADMIN_AI_DASHBOARD_READ: {},
}));

import { GET, PUT, dynamic, revalidate } from "@/app/api/admin/ai/drop-covers/route";

describe("GET/PUT /api/admin/ai/drop-covers", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            email: "admin@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.buildAdminAiDropCoverDashboard.mockResolvedValue({
            refreshedAtMs: 1712515200000,
            settings: {
                enabled: true,
                model: "gemini-2.5-flash-image",
                location: "global",
                pricePerGenerationUsd: 0.0387,
                priceBasis: "vertex-ai-pricing-gemini-2.5-flash-image-2026-04-06",
                priceSourceUrl: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
                generationMode: "standard",
                useTemplateReference: false,
                useRecentDropCoverReferences: false,
                templateReferenceUrl: null,
                templateReferenceStoragePath: null,
                templateReferenceFileName: null,
            },
            runtime: {
                enabled: true,
                status: "ready",
                note: "Vertex credentials, Firebase Storage, and AI job recording are configured.",
                project: "kandydrops-by-ikandy",
                location: "global",
                model: "gemini-2.5-flash-image",
                generationMode: "standard",
                pricePerGenerationUsd: 0.0387,
                priceBasis: "vertex-ai-pricing-gemini-2.5-flash-image-2026-04-06",
                priceSourceUrl: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
            },
            preflightChecks: [
                {
                    key: "feature_toggle",
                    label: "Feature toggle",
                    status: "pass",
                    detail: "AI cover generation is enabled from the Admin AI page.",
                },
            ],
            modelHealth: [
                {
                    id: "gemini-2.5-flash-image",
                    label: "Gemini 2.5 Flash Image",
                    shortLabel: "2.5 Flash",
                    provider: "gemini",
                    launchStage: "ga",
                    selected: true,
                    location: "global",
                    runtimeStatus: "ready",
                    preflightStatus: "pass",
                    note: "Last proven by a successful 2.5 Flash generation.",
                    authReady: true,
                    recentGenerationCount: 3,
                    recentSuccessCount: 3,
                    recentFailureCount: 0,
                    activeGenerationCount: 0,
                    lastRequestedAtMs: 1712515200000,
                    lastSuccessAtMs: 1712515200000,
                    lastFailureAtMs: null,
                    lastFailureMessage: null,
                    diagnosticWarnCount: 0,
                    diagnosticErrorCount: 0,
                },
            ],
            recentDiagnostics: [],
            aggregate: {
                generationCount: 4,
                successfulGenerationCount: 3,
                failedGenerationCount: 1,
                acceptedCount: 2,
                likedCount: 1,
                dislikedCount: 1,
                regeneratedCount: 2,
                totalEstimatedCostUsd: 0.08,
                averageLatencyMs: 1492,
                activeGenerationCount: 0,
            },
            recentJobs: [],
            referenceAssets: {
                template: null,
                catalogDropCovers: [],
                retainedAiCovers: [],
            },
            visualSignals: {
                templateCount: 0,
                catalogDropCoverCount: 0,
                retainedAiCoverCount: 0,
                acceptedRetainedCount: 0,
                likedRetainedCount: 0,
                dislikedHistoryCount: 1,
                totalReusableReferenceCount: 0,
                referenceGuidanceReady: false,
            },
        });
        mockState.saveAdminAiDropCoverSettings.mockResolvedValue({
            enabled: false,
            model: "gemini-2.5-flash-image",
            location: "global",
            aspectRatio: "1:1",
            outputMimeType: "image/png",
            pricePerGenerationUsd: 0.0387,
            priceBasis: "vertex-ai-pricing-gemini-2.5-flash-image-2026-04-06",
            priceSourceUrl: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
            generationMode: "standard",
            useTemplateReference: false,
            useRecentDropCoverReferences: false,
            templateReferenceUrl: null,
            templateReferenceStoragePath: null,
            templateReferenceFileName: null,
        });
    });

    it("returns the admin AI cover dashboard as a force-dynamic no-store route", async () => {
        const response = await GET(new NextRequest("http://localhost/api/admin/ai/drop-covers"));
        const body = await response.json();

        expect(dynamic).toBe("force-dynamic");
        expect(revalidate).toBe(0);
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toContain("no-store");
        expect(body.verification.module).toBe("admin_ai_drop_covers");
        expect(body.verification.status).toBe("live");
        expect(body.aggregate.generationCount).toBe(4);
        expect(mockState.buildAdminAiDropCoverDashboard).toHaveBeenCalledTimes(1);
    });

    it("updates the enabled flag through the canonical settings helper", async () => {
        const request = new NextRequest("http://localhost/api/admin/ai/drop-covers", {
            method: "PUT",
            body: JSON.stringify({ enabled: false }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        const response = await PUT(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockState.saveAdminAiDropCoverSettings).toHaveBeenCalledWith({
            enabled: false,
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
        });
    });

    it("updates the default AI model through the canonical settings helper", async () => {
        const request = new NextRequest("http://localhost/api/admin/ai/drop-covers", {
            method: "PUT",
            body: JSON.stringify({ model: "gemini-3-pro-image-preview" }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        const response = await PUT(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockState.saveAdminAiDropCoverSettings).toHaveBeenCalledWith({
            enabled: undefined,
            model: "gemini-3-pro-image-preview",
            useTemplateReference: undefined,
            useRecentDropCoverReferences: undefined,
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
        });
    });

    it("updates reference guidance flags through the canonical settings helper", async () => {
        const request = new NextRequest("http://localhost/api/admin/ai/drop-covers", {
            method: "PUT",
            body: JSON.stringify({
                useTemplateReference: true,
                useRecentDropCoverReferences: true,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        const response = await PUT(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockState.saveAdminAiDropCoverSettings).toHaveBeenCalledWith({
            enabled: undefined,
            useTemplateReference: true,
            useRecentDropCoverReferences: true,
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
        });
    });

    it("rejects unsupported default models before hitting the settings helper", async () => {
        const request = new NextRequest("http://localhost/api/admin/ai/drop-covers", {
            method: "PUT",
            body: JSON.stringify({ model: "imagen-4.0-fast-generate-001" }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        const response = await PUT(request);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toContain("Unsupported default AI image model");
        expect(mockState.saveAdminAiDropCoverSettings).not.toHaveBeenCalled();
    });
});
