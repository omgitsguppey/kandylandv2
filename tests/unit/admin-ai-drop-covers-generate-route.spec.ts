import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    getAdminAiDropCoverSettings: vi.fn(),
    generateAdminAiDropCover: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.getAdminAiDropCoverSettings.mockReset();
        this.generateAdminAiDropCover.mockReset();
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
    getAdminAiDropCoverSettings: mockState.getAdminAiDropCoverSettings,
    generateAdminAiDropCover: mockState.generateAdminAiDropCover,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN: {},
}));

import { POST, dynamic, revalidate } from "@/app/api/admin/ai/drop-covers/generate/route";

describe("POST /api/admin/ai/drop-covers/generate", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            email: "admin@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("returns a truthful disabled-state error when the feature is off", async () => {
        mockState.getAdminAiDropCoverSettings.mockResolvedValue({ enabled: false });

        const response = await POST(new NextRequest("http://localhost/api/admin/ai/drop-covers/generate", {
            method: "POST",
            body: JSON.stringify({ title: "Cherry Rush" }),
            headers: { "Content-Type": "application/json" },
        }));
        const body = await response.json();

        expect(dynamic).toBe("force-dynamic");
        expect(revalidate).toBe(0);
        expect(response.status).toBe(409);
        expect(body.error).toContain("turned off");
        expect(mockState.generateAdminAiDropCover).not.toHaveBeenCalled();
    });

    it("passes the bounded generation input to the server helper and returns the created job", async () => {
        mockState.getAdminAiDropCoverSettings.mockResolvedValue({ enabled: true });
        mockState.generateAdminAiDropCover.mockResolvedValue({
            id: "job_1",
            title: "Cherry Rush",
            model: "imagen-3.0-fast-generate-001",
            location: "us-central1",
            promptVersion: "drop-cover-v1",
            recipeLabel: "KandyDrops title-safe cover art",
            status: "succeeded",
            feedback: "neutral",
            accepted: false,
            requestedAtMs: 123,
            estimatedCostUsd: 0.02,
            billed: true,
            imageUrl: "https://example.com/cover.png",
            storagePath: "drops/images/generated/2026/04/job_1.png",
            mimeType: "image/png",
            fileName: "job_1.png",
            chainDepth: 0,
        });

        const response = await POST(new NextRequest("http://localhost/api/admin/ai/drop-covers/generate", {
            method: "POST",
            body: JSON.stringify({
                title: "Cherry Rush",
                creatorName: "Kandy Lux",
                creatorId: "creator_1",
                dropId: "drop_1",
                dropType: "content",
                tags: ["Sweet"],
            }),
            headers: { "Content-Type": "application/json" },
        }));
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body.success).toBe(true);
        expect(body.job.id).toBe("job_1");
        expect(mockState.generateAdminAiDropCover).toHaveBeenCalledWith({
            title: "Cherry Rush",
            creatorName: "Kandy Lux",
            creatorId: "creator_1",
            dropId: "drop_1",
            dropType: "content",
            tags: ["Sweet"],
            previousJobId: null,
            requestedByUid: "admin_1",
            requestedByEmail: "admin@example.com",
        });
    });
});
