import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    updateAdminAiDropCoverFeedback: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.updateAdminAiDropCoverFeedback.mockReset();
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
    updateAdminAiDropCoverFeedback: mockState.updateAdminAiDropCoverFeedback,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN: {},
}));

import { POST, dynamic, revalidate } from "@/app/api/admin/ai/drop-covers/feedback/route";

describe("POST /api/admin/ai/drop-covers/feedback", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            email: "admin@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.updateAdminAiDropCoverFeedback.mockResolvedValue({
            id: "job_1",
            title: "Cherry Rush",
            model: "imagen-3.0-fast-generate-001",
            location: "us-central1",
            promptVersion: "drop-cover-v1",
            recipeLabel: "KandyDrops title-safe cover art",
            status: "succeeded",
            feedback: "liked",
            accepted: true,
            requestedAtMs: 123,
            estimatedCostUsd: 0.02,
            billed: true,
            imageUrl: "https://example.com/cover.png",
            mimeType: "image/png",
            fileName: "job_1.png",
            chainDepth: 0,
            acceptedForDropId: "drop_1",
        });
    });

    it("accepts canonical feedback actions and returns the updated job", async () => {
        const response = await POST(new NextRequest("http://localhost/api/admin/ai/drop-covers/feedback", {
            method: "POST",
            body: JSON.stringify({
                jobId: "job_1",
                action: "accept",
                dropId: "drop_1",
            }),
            headers: { "Content-Type": "application/json" },
        }));
        const body = await response.json();

        expect(dynamic).toBe("force-dynamic");
        expect(revalidate).toBe(0);
        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockState.updateAdminAiDropCoverFeedback).toHaveBeenCalledWith({
            jobId: "job_1",
            action: "accept",
            dropId: "drop_1",
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
        });
    });

    it("rejects unsupported actions before calling the helper", async () => {
        const response = await POST(new NextRequest("http://localhost/api/admin/ai/drop-covers/feedback", {
            method: "POST",
            body: JSON.stringify({
                jobId: "job_1",
                action: "archive",
            }),
            headers: { "Content-Type": "application/json" },
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toContain("Unsupported");
        expect(mockState.updateAdminAiDropCoverFeedback).not.toHaveBeenCalled();
    });
});
