import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    uploadAdminAiDropCoverTemplate: vi.fn(),
    removeAdminAiDropCoverTemplate: vi.fn(),
    toAdminAiDropCoverClientError: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.uploadAdminAiDropCoverTemplate.mockReset();
        this.removeAdminAiDropCoverTemplate.mockReset();
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
    uploadAdminAiDropCoverTemplate: mockState.uploadAdminAiDropCoverTemplate,
    removeAdminAiDropCoverTemplate: mockState.removeAdminAiDropCoverTemplate,
    toAdminAiDropCoverClientError: mockState.toAdminAiDropCoverClientError,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN: {},
}));

import { DELETE, POST, dynamic, revalidate } from "@/app/api/admin/ai/drop-covers/template/route";

describe("POST/DELETE /api/admin/ai/drop-covers/template", () => {
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
        mockState.uploadAdminAiDropCoverTemplate.mockResolvedValue({
            settings: {
                enabled: true,
                model: "imagen-3.0-capability-001",
                location: "us-central1",
                aspectRatio: "1:1",
                outputMimeType: "image/png",
                pricePerGenerationUsd: 0.04,
                priceBasis: "vertex-ai-pricing-imagen-3-customization-2026-04-06",
                priceSourceUrl: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
                generationMode: "reference_guided",
                useTemplateReference: true,
                useRecentDropCoverReferences: false,
                templateReferenceUrl: "https://example.com/template.png",
                templateReferenceStoragePath: "drops/images/ai-references/template.png",
                templateReferenceFileName: "template.png",
            },
            template: {
                id: "template",
                source: "template",
                imageUrl: "https://example.com/template.png",
                fileName: "template.png",
                storagePath: "drops/images/ai-references/template.png",
                dropId: null,
                title: "Current template",
            },
        });
        mockState.removeAdminAiDropCoverTemplate.mockResolvedValue({
            enabled: true,
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

    it("uploads an image template through the canonical helper", async () => {
        const formData = new FormData();
        formData.append("file", new File(["template"], "cover-template.png", { type: "image/png" }));

        const request = new NextRequest("http://localhost/api/admin/ai/drop-covers/template", {
            method: "POST",
            body: formData,
        });
        const response = await POST(request);
        const body = await response.json();

        expect(dynamic).toBe("force-dynamic");
        expect(revalidate).toBe(0);
        expect(response.status).toBe(201);
        expect(body.success).toBe(true);
        expect(mockState.uploadAdminAiDropCoverTemplate).toHaveBeenCalledTimes(1);
    });

    it("removes the current template through the canonical helper", async () => {
        const response = await DELETE(new NextRequest("http://localhost/api/admin/ai/drop-covers/template", {
            method: "DELETE",
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockState.removeAdminAiDropCoverTemplate).toHaveBeenCalledWith({
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
        });
    });
});
