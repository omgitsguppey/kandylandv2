import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    getErrorMessage: vi.fn(),
    recordRouteRuntimeSample: vi.fn(),
    listAdminAiDropCoverLibraryAssets: vi.fn(),
    uploadAdminAiDropCoverReferenceAsset: vi.fn(),
    updateAdminAiDropCoverReferenceAsset: vi.fn(),
    removeAdminAiDropCoverReferenceAsset: vi.fn(),
    getAdminAiDropCoverPromptPolicy: vi.fn(),
    saveAdminAiDropCoverPromptPolicy: vi.fn(),
    listAdminAiDropCoverReviewGallery: vi.fn(),
    updateAdminAiDropCoverReviewGalleryItem: vi.fn(),
    toAdminAiDropCoverClientError: vi.fn(),
    getAdminUiPreferences: vi.fn(),
    saveAdminUiCollapsedModulePreference: vi.fn(),
    reset() {
        this.guardApiRequest.mockReset();
        this.handleApiError.mockReset();
        this.getErrorMessage.mockReset();
        this.recordRouteRuntimeSample.mockReset();
        this.listAdminAiDropCoverLibraryAssets.mockReset();
        this.uploadAdminAiDropCoverReferenceAsset.mockReset();
        this.updateAdminAiDropCoverReferenceAsset.mockReset();
        this.removeAdminAiDropCoverReferenceAsset.mockReset();
        this.getAdminAiDropCoverPromptPolicy.mockReset();
        this.saveAdminAiDropCoverPromptPolicy.mockReset();
        this.listAdminAiDropCoverReviewGallery.mockReset();
        this.updateAdminAiDropCoverReviewGalleryItem.mockReset();
        this.toAdminAiDropCoverClientError.mockReset();
        this.getAdminUiPreferences.mockReset();
        this.saveAdminUiCollapsedModulePreference.mockReset();
    },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    getErrorMessage: mockState.getErrorMessage,
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
    withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    ADMIN_AI_CONTROL: {},
    ADMIN_AI_DASHBOARD_READ: {},
    ADMIN: {},
    HEAVY_READ: {},
}));
vi.mock("@/lib/server/ai-drop-covers", () => ({
    listAdminAiDropCoverLibraryAssets: mockState.listAdminAiDropCoverLibraryAssets,
    uploadAdminAiDropCoverReferenceAsset: mockState.uploadAdminAiDropCoverReferenceAsset,
    updateAdminAiDropCoverReferenceAsset: mockState.updateAdminAiDropCoverReferenceAsset,
    removeAdminAiDropCoverReferenceAsset: mockState.removeAdminAiDropCoverReferenceAsset,
    getAdminAiDropCoverPromptPolicy: mockState.getAdminAiDropCoverPromptPolicy,
    saveAdminAiDropCoverPromptPolicy: mockState.saveAdminAiDropCoverPromptPolicy,
    listAdminAiDropCoverReviewGallery: mockState.listAdminAiDropCoverReviewGallery,
    updateAdminAiDropCoverReviewGalleryItem: mockState.updateAdminAiDropCoverReviewGalleryItem,
    toAdminAiDropCoverClientError: mockState.toAdminAiDropCoverClientError,
}));
vi.mock("@/lib/server/admin-ui-preferences", () => ({
    getAdminUiPreferences: mockState.getAdminUiPreferences,
    saveAdminUiCollapsedModulePreference: mockState.saveAdminUiCollapsedModulePreference,
}));

import { DELETE as deleteReference, GET as getReferences, POST as postReference, PUT as putReference } from "@/app/api/admin/ai/drop-covers/references/route";
import { GET as getPromptPolicy, PUT as putPromptPolicy } from "@/app/api/admin/ai/drop-covers/prompt-policy/route";
import { GET as getReviewGallery, PUT as putReviewGallery } from "@/app/api/admin/ai/drop-covers/review-gallery/route";
import { GET as getUiPreferences, PUT as putUiPreferences } from "@/app/api/admin/ui/preferences/route";

describe("admin AI ops routes", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            email: "admin@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.getErrorMessage.mockImplementation((error: unknown) => error instanceof Error ? error.message : String(error));
        mockState.toAdminAiDropCoverClientError.mockReturnValue(null);
    });

    it("lists and uploads reference library assets", async () => {
        mockState.listAdminAiDropCoverLibraryAssets.mockResolvedValue([{ id: "ref_1", imageUrl: "https://example.com/ref.png" }]);
        mockState.uploadAdminAiDropCoverReferenceAsset.mockResolvedValue({ id: "ref_2", imageUrl: "https://example.com/ref-2.png" });

        const getResponse = await getReferences(new NextRequest("http://localhost/api/admin/ai/drop-covers/references"));
        const getBody = await getResponse.json();
        expect(getResponse.status).toBe(200);
        expect(getBody.assets).toHaveLength(1);

        const formData = new FormData();
        formData.append("file", new File(["ref"], "style.png", { type: "image/png" }));
        const postResponse = await postReference(new NextRequest("http://localhost/api/admin/ai/drop-covers/references", {
            method: "POST",
            body: formData,
        }));
        const postBody = await postResponse.json();
        expect(postResponse.status).toBe(201);
        expect(postBody.asset.id).toBe("ref_2");
        expect(mockState.uploadAdminAiDropCoverReferenceAsset).toHaveBeenCalledTimes(1);
    });

    it("updates and removes references through the canonical helpers", async () => {
        mockState.updateAdminAiDropCoverReferenceAsset.mockResolvedValue({ id: "ref_1", primary: true });
        mockState.removeAdminAiDropCoverReferenceAsset.mockResolvedValue(true);

        const putResponse = await putReference(new NextRequest("http://localhost/api/admin/ai/drop-covers/references", {
            method: "PUT",
            body: JSON.stringify({ id: "ref_1", primary: true }),
            headers: { "Content-Type": "application/json" },
        }));
        expect(putResponse.status).toBe(200);
        expect(mockState.updateAdminAiDropCoverReferenceAsset).toHaveBeenCalledWith({
            id: "ref_1",
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
            primary: true,
            pinned: undefined,
            active: undefined,
        });

        const deleteResponse = await deleteReference(new NextRequest("http://localhost/api/admin/ai/drop-covers/references", {
            method: "DELETE",
            body: JSON.stringify({ id: "ref_1" }),
            headers: { "Content-Type": "application/json" },
        }));
        expect(deleteResponse.status).toBe(200);
        expect(mockState.removeAdminAiDropCoverReferenceAsset).toHaveBeenCalledWith({
            id: "ref_1",
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
        });
    });

    it("reads and writes the prompt policy workbench", async () => {
        mockState.getAdminAiDropCoverPromptPolicy.mockResolvedValue({ version: 4, currentMutablePrompt: "current prompt" });
        mockState.saveAdminAiDropCoverPromptPolicy.mockResolvedValue({ version: 5, currentMutablePrompt: "next prompt" });

        const getResponse = await getPromptPolicy(new NextRequest("http://localhost/api/admin/ai/drop-covers/prompt-policy"));
        const getBody = await getResponse.json();
        expect(getResponse.status).toBe(200);
        expect(getBody.promptPolicy.version).toBe(4);

        const putResponse = await putPromptPolicy(new NextRequest("http://localhost/api/admin/ai/drop-covers/prompt-policy", {
            method: "PUT",
            body: JSON.stringify({
                baseStylePrompt: "base",
                lockedClauses: ["locked"],
                mutableClauses: ["mutable"],
                currentMutablePrompt: "next prompt",
                autoOptimize: true,
            }),
            headers: { "Content-Type": "application/json" },
        }));
        expect(putResponse.status).toBe(200);
        expect(mockState.saveAdminAiDropCoverPromptPolicy).toHaveBeenCalledWith({
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
            baseStylePrompt: "base",
            lockedClauses: ["locked"],
            mutableClauses: ["mutable"],
            currentMutablePrompt: "next prompt",
            autoOptimize: true,
            source: "manual_override",
            action: "manual_edit",
        });
    });

    it("reads and updates the review gallery reuse state", async () => {
        mockState.listAdminAiDropCoverReviewGallery.mockResolvedValue([{ id: "job_1", reusable: false }]);
        mockState.updateAdminAiDropCoverReviewGalleryItem.mockResolvedValue({ id: "job_1", reusable: true });

        const getResponse = await getReviewGallery(new NextRequest("http://localhost/api/admin/ai/drop-covers/review-gallery"));
        const getBody = await getResponse.json();
        expect(getResponse.status).toBe(200);
        expect(getBody.items).toHaveLength(1);

        const putResponse = await putReviewGallery(new NextRequest("http://localhost/api/admin/ai/drop-covers/review-gallery", {
            method: "PUT",
            body: JSON.stringify({ jobId: "job_1", reusable: true }),
            headers: { "Content-Type": "application/json" },
        }));
        expect(putResponse.status).toBe(200);
        expect(mockState.updateAdminAiDropCoverReviewGalleryItem).toHaveBeenCalledWith({
            jobId: "job_1",
            reusable: true,
            actorUid: "admin_1",
            actorEmail: "admin@example.com",
        });
    });

    it("reads and writes admin UI collapsed-module preferences", async () => {
        mockState.getAdminUiPreferences.mockResolvedValue({ collapsedModules: { "admin_ai.runtime": false } });
        mockState.saveAdminUiCollapsedModulePreference.mockResolvedValue({ collapsedModules: { "admin_ai.runtime": true } });

        const getResponse = await getUiPreferences(new NextRequest("http://localhost/api/admin/ui/preferences"));
        const getBody = await getResponse.json();
        expect(getResponse.status).toBe(200);
        expect(getBody.preferences.collapsedModules["admin_ai.runtime"]).toBe(false);

        const putResponse = await putUiPreferences(new NextRequest("http://localhost/api/admin/ui/preferences", {
            method: "PUT",
            body: JSON.stringify({ key: "admin_ai.runtime", collapsed: true }),
            headers: { "Content-Type": "application/json" },
        }));
        expect(putResponse.status).toBe(200);
        expect(mockState.saveAdminUiCollapsedModulePreference).toHaveBeenCalledWith({
            uid: "admin_1",
            key: "admin_ai.runtime",
            collapsed: true,
        });
    });
});
