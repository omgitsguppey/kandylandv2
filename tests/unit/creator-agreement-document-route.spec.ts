import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const documents = new Map<string, Record<string, unknown>>();
    const fileApi = {
        getSignedUrl: vi.fn(async (): Promise<[string]> => [
            "https://storage.googleapis.com/kandydrops-test.appspot.com/creator-agreements/v1/agreement.pdf?X-Goog-Signature=signed",
        ]),
    };
    const bucketApi = {
        file: vi.fn(() => fileApi),
    };

    return {
        documents,
        fileApi,
        bucketApi,
        adminDb: {
            collection(name: string) {
                return {
                    doc(id: string) {
                        return {
                            async get() {
                                return {
                                    data: () => documents.get(`${name}/${id}`),
                                };
                            },
                        };
                    },
                };
            },
        },
        adminStorage: {
            bucket: vi.fn(() => bucketApi),
        },
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        reset() {
            documents.clear();
            fileApi.getSignedUrl.mockClear();
            bucketApi.file.mockClear();
            this.adminStorage.bucket.mockClear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
    adminStorage: mockState.adminStorage,
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    MEDIA_PROXY: { maxRequests: 15, windowMs: 60_000 },
}));

vi.mock("@/lib/server/creator-onboarding", () => ({
    CREATOR_ONBOARDING_COLLECTION: "creator_onboarding",
}));

vi.mock("@/lib/creator-onboarding", () => ({
    normalizeCreatorOnboardingCanonicalRecord: (value: unknown) => value,
}));

vi.mock("@/lib/creator-agreement-documents", () => ({
    CREATOR_AGREEMENT_TEMPLATE_COLLECTION: "creator_agreement_templates",
    normalizeCreatorAgreementTemplate: (value: unknown) => value,
}));

import { GET } from "@/app/api/creator/onboarding/agreement-document/route";

describe("GET /api/creator/onboarding/agreement-document", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "creator_1",
            role: "user",
        });
        mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
            error: error.message,
        }, { status: 401 }));
        mockState.documents.set("creator_onboarding/creator_1", {
            contractDocumentStatus: "contract_sent",
            agreementTemplateId: "template_1",
            agreementHash: "sha256:agreement",
        });
        mockState.documents.set("creator_agreement_templates/template_1", {
            templateId: "template_1",
            agreementHash: "sha256:agreement",
            pdfStoragePath: "creator-agreements/v1/agreement.pdf",
        });
    });

    it("returns a short-lived signed preview URL through an authenticated creator-scoped guard", async () => {
        const request = new NextRequest("http://localhost/api/creator/onboarding/agreement-document");

        const response = await GET(request);

        expect(response.status).toBe(307);
        expect(mockState.guardApiRequest).toHaveBeenCalledWith(request, expect.objectContaining({
            auth: "user",
            scopeToCaller: true,
            requireTrustedOrigin: true,
            rateLimit: { maxRequests: 15, windowMs: 60_000 },
        }));
        expect(mockState.bucketApi.file).toHaveBeenCalledWith("creator-agreements/v1/agreement.pdf");
        expect(mockState.fileApi.getSignedUrl).toHaveBeenCalledWith(expect.objectContaining({
            action: "read",
            expires: expect.any(Number),
        }));
        expect(response.headers.get("Location")).toContain("X-Goog-Signature=signed");
        expect(response.headers.get("Location")).not.toContain("token=");
    });

    it("rejects agreement templates that point outside the creator agreement document prefix", async () => {
        mockState.documents.set("creator_agreement_templates/template_1", {
            templateId: "template_1",
            agreementHash: "sha256:agreement",
            pdfStoragePath: "avatars/creator_1/agreement.pdf",
        });
        const request = new NextRequest("http://localhost/api/creator/onboarding/agreement-document");

        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            error: "Invalid agreement document reference.",
            creatorAgreementDocumentRoute: true,
            authenticatedOnly: true,
            creatorScoped: true,
            storageEgressGuarded: true,
            mediaProxyGuarded: true,
            mediaProxyPolicy: "MEDIA_PROXY",
            rawStorageUrlExposed: false,
            defaultDocumentResponse: "short_lived_creator_preview",
            maxPreviewTtlSeconds: 300,
        });
        expect(mockState.fileApi.getSignedUrl).not.toHaveBeenCalled();
        expect(JSON.stringify(payload)).not.toContain("avatars/creator_1/agreement.pdf");
    });

    it("rejects unsafe signed URLs instead of redirecting to tokenized Storage links", async () => {
        mockState.fileApi.getSignedUrl.mockResolvedValueOnce([
            "https://firebasestorage.googleapis.com/v0/b/kandydrops/o/creator-agreements%2Fv1%2Fagreement.pdf?token=raw-token",
        ] as const);
        const request = new NextRequest("http://localhost/api/creator/onboarding/agreement-document");

        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(500);
        expect(payload).toMatchObject({
            error: "Agreement document preview is unavailable.",
            rawStorageUrlExposed: false,
        });
        expect(response.headers.get("Location")).toBeNull();
    });
});
