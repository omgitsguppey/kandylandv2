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
    ADMIN: {},
    HEAVY_READ: {},
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
            settings: {
                enabled: true,
                model: "imagen-3.0-fast-generate-001",
                location: "us-central1",
                pricePerGenerationUsd: 0.02,
                priceBasis: "vertex-ai-pricing-imagen-fast-2026-04-05",
                priceSourceUrl: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
            },
            runtime: {
                enabled: true,
                status: "ready",
                note: "Vertex image generation is ready.",
                project: "kandydrops-by-ikandy",
                location: "us-central1",
                model: "imagen-3.0-fast-generate-001",
                pricePerGenerationUsd: 0.02,
                priceBasis: "vertex-ai-pricing-imagen-fast-2026-04-05",
                priceSourceUrl: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
            },
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
        });
        mockState.saveAdminAiDropCoverSettings.mockResolvedValue({
            enabled: false,
            model: "imagen-3.0-fast-generate-001",
            location: "us-central1",
            aspectRatio: "1:1",
            outputMimeType: "image/png",
            pricePerGenerationUsd: 0.02,
            priceBasis: "vertex-ai-pricing-imagen-fast-2026-04-05",
            priceSourceUrl: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
        });
    });

    it("returns the admin AI cover dashboard as a force-dynamic no-store route", async () => {
        const response = await GET(new NextRequest("http://localhost/api/admin/ai/drop-covers"));
        const body = await response.json();

        expect(dynamic).toBe("force-dynamic");
        expect(revalidate).toBe(0);
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toContain("no-store");
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
});
