import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    getAdminAiDropCoverSettings: vi.fn(),
    generateAdminAiDropCover: vi.fn(),
    toAdminAiDropCoverClientError: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.getAdminAiDropCoverSettings.mockReset();
        this.generateAdminAiDropCover.mockReset();
        this.toAdminAiDropCoverClientError.mockReset();
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
    toAdminAiDropCoverClientError: mockState.toAdminAiDropCoverClientError,
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
        mockState.toAdminAiDropCoverClientError.mockReturnValue(null);
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
            model: "imagen-4.0-fast-generate-001",
            location: "global",
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
            draftSessionId: null,
            dropType: "content",
            tags: ["Sweet"],
            previousJobId: null,
            requestedByUid: "admin_1",
            requestedByEmail: "admin@example.com",
        });
    });

    it("supports unsaved draft generation when a draft session id is present", async () => {
        mockState.getAdminAiDropCoverSettings.mockResolvedValue({ enabled: true });
        mockState.generateAdminAiDropCover.mockResolvedValue({
            id: "job_draft_1",
            title: "Cherry Rush",
            draftSessionId: "draft-session-123",
            model: "imagen-4.0-fast-generate-001",
            location: "global",
            promptVersion: "drop-cover-v1",
            recipeLabel: "KandyDrops title-safe cover art",
            status: "succeeded",
            feedback: "neutral",
            accepted: false,
            requestedAtMs: 123,
            estimatedCostUsd: 0.02,
            billed: true,
            imageUrl: "https://example.com/cover.png",
            storagePath: "drops/images/generated/2026/04/job_draft_1.png",
            mimeType: "image/png",
            fileName: "job_draft_1.png",
            chainDepth: 0,
        });

        const response = await POST(new NextRequest("http://localhost/api/admin/ai/drop-covers/generate", {
            method: "POST",
            body: JSON.stringify({
                title: "Cherry Rush",
                draftSessionId: "draft-session-123",
                dropType: "content",
            }),
            headers: { "Content-Type": "application/json" },
        }));
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body.job.id).toBe("job_draft_1");
        expect(mockState.generateAdminAiDropCover).toHaveBeenCalledWith({
            title: "Cherry Rush",
            creatorName: null,
            creatorId: null,
            dropId: null,
            draftSessionId: "draft-session-123",
            dropType: "content",
            tags: [],
            previousJobId: null,
            requestedByUid: "admin_1",
            requestedByEmail: "admin@example.com",
        });
    });

    it("blocks unsaved generation without a draft session id", async () => {
        mockState.getAdminAiDropCoverSettings.mockResolvedValue({ enabled: true });

        const response = await POST(new NextRequest("http://localhost/api/admin/ai/drop-covers/generate", {
            method: "POST",
            body: JSON.stringify({
                title: "Cherry Rush",
            }),
            headers: { "Content-Type": "application/json" },
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errorCode).toBe("draft_session_required");
        expect(mockState.generateAdminAiDropCover).not.toHaveBeenCalled();
    });

    it("maps provider/runtime failures to actionable AI errors instead of a generic internal server error", async () => {
        mockState.getAdminAiDropCoverSettings.mockResolvedValue({ enabled: true });
        const providerError = new Error("Permission denied while accessing publishers/google/models/imagen-4.0-fast-generate-001 in location global.");
        mockState.generateAdminAiDropCover.mockRejectedValue(providerError);
        mockState.toAdminAiDropCoverClientError.mockReturnValue({
            status: 503,
            body: {
                error: "The configured Vertex image model (imagen-4.0-fast-generate-001) is not available to this project in global. KandyDrops now targets Imagen 4 Fast on the Vertex global endpoint; if this still fails, check project model access and org location policy.",
                errorCode: "model_location_unavailable",
            },
        });

        const response = await POST(new NextRequest("http://localhost/api/admin/ai/drop-covers/generate", {
            method: "POST",
            body: JSON.stringify({
                title: "Cherry Rush",
                draftSessionId: "draft-session-123",
            }),
            headers: { "Content-Type": "application/json" },
        }));
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.errorCode).toBe("model_location_unavailable");
        expect(body.error).toContain("imagen-4.0-fast-generate-001");
        expect(mockState.toAdminAiDropCoverClientError).toHaveBeenCalledWith(providerError);
        expect(mockState.handleApiError).not.toHaveBeenCalled();
    });
});
