import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const documents = new Map<string, Record<string, unknown>>();

    const fileApi = {
        exists: vi.fn(async () => [true] as const),
        download: vi.fn(async () => [Buffer.from("file-bytes")] as const),
    };

    return {
        documents,
        adminDb: {
            collection(name: string) {
                return {
                    doc(id: string) {
                        return {
                            async get() {
                                return {
                                    exists: documents.has(`${name}/${id}`),
                                    data: () => documents.get(`${name}/${id}`),
                                };
                            },
                        };
                    },
                };
            },
        },
        adminStorage: {
            bucket: vi.fn(() => ({
                file: vi.fn(() => fileApi),
            })),
        },
        fileApi,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        recordServerDiagnostic: vi.fn(async () => undefined),
        reset() {
            documents.clear();
            this.adminStorage.bucket.mockClear();
            fileApi.exists.mockClear();
            fileApi.download.mockClear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.recordServerDiagnostic.mockReset();
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

vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    MEDIA_PROXY: { maxRequests: 15, windowMs: 60_000 },
}));

import { GET } from "@/app/api/admin/user/[userId]/creator-onboarding/id-document/route";

describe("GET /api/admin/user/[userId]/creator-onboarding/id-document", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            role: "admin",
        });
        mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
            error: error.message,
        }, { status: 500 }));

        mockState.documents.set("creator_onboarding/creator_1", {
            userId: "creator_1",
            email: "creator@example.com",
            role: "user",
            sourceVersion: 1,
            signupType: "creator",
            submissionStatus: "awaiting_manual_review",
            approvalStatus: "creator_pending",
            queuePosition: 99,
            onboardingStartedAt: 1_710_000_000_000,
            submittedAt: 1_710_000_000_000,
            onboardingSubmittedAt: 1_710_000_000_000,
            awaitingManualReviewAt: 1_710_000_000_000,
            updatedAt: 1_710_000_000_000,
            creatorDisplayName: "Creator One",
            bypassFanOnboarding: true,
            legalStatus: "legal_pending",
            idVerificationStatus: "id_submitted",
            segmentationStatus: "segment_unassigned",
            idDocuments: {
                front: {
                    fileName: "front.png",
                    storagePath: "creator-onboarding/creator_1/id/front/front.png",
                    contentType: "image/png",
                    sizeBytes: 1000,
                    uploadedAt: 1_710_000_000_100,
                    uploadedByUid: "creator_1",
                },
                back: {
                    fileName: "back.pdf",
                    storagePath: "creator-onboarding/creator_1/id/back/back.pdf",
                    contentType: "application/pdf",
                    sizeBytes: 2000,
                    uploadedAt: 1_710_000_000_200,
                    uploadedByUid: "creator_1",
                },
            },
        });
    });

    it("streams the requested ID side through the admin-only route", async () => {
        const request = new NextRequest("http://localhost/api/admin/user/creator_1/creator-onboarding/id-document?side=back");
        const response = await GET(request, {
            params: Promise.resolve({ userId: "creator_1" }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("application/pdf");
        expect(response.headers.get("Location")).toBeNull();
        expect(mockState.guardApiRequest).toHaveBeenCalledWith(request, expect.objectContaining({
            auth: "admin",
            requireTrustedOrigin: true,
            preAuthRateLimit: { maxRequests: 15, windowMs: 60_000 },
            rateLimit: { maxRequests: 15, windowMs: 60_000 },
        }));
        expect(mockState.fileApi.download).toHaveBeenCalledTimes(1);
    });

    it("returns a 404 when the requested ID side is missing", async () => {
        const request = new NextRequest("http://localhost/api/admin/user/creator_1/creator-onboarding/id-document?side=back");
        mockState.documents.set("creator_onboarding/creator_1", {
            ...mockState.documents.get("creator_onboarding/creator_1"),
            idDocuments: {
                front: (mockState.documents.get("creator_onboarding/creator_1")?.idDocuments as Record<string, unknown>).front,
            },
        });

        const response = await GET(request, {
            params: Promise.resolve({ userId: "creator_1" }),
        });
        const payload = await response.json();

        expect(response.status).toBe(404);
        expect(payload).toMatchObject({
            error: "No submitted back ID document found",
        });
    });

    it("rejects ID document metadata that points outside the scoped creator prefix", async () => {
        const current = mockState.documents.get("creator_onboarding/creator_1") as Record<string, unknown>;
        mockState.documents.set("creator_onboarding/creator_1", {
            ...current,
            idDocuments: {
                ...(current.idDocuments as Record<string, unknown>),
                front: {
                    ...(current.idDocuments as Record<string, Record<string, unknown>>).front,
                    storagePath: "creator-onboarding/another_user/id/front/front.png",
                },
            },
        });

        const request = new NextRequest("http://localhost/api/admin/user/creator_1/creator-onboarding/id-document?side=front");
        const response = await GET(request, {
            params: Promise.resolve({ userId: "creator_1" }),
        });
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            error: "Invalid ID document reference",
            adminIdDocumentRoute: true,
            adminOnly: true,
            sensitiveDocumentAccess: true,
            storageEgressGuarded: true,
            mediaProxyGuarded: true,
            mediaProxyPolicy: "MEDIA_PROXY",
            rawStorageUrlExposed: false,
        });
        expect(mockState.fileApi.download).not.toHaveBeenCalled();
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            detail: expect.objectContaining({
                storagePathRedacted: true,
                rawUrlValuesLogged: false,
                rawStorageUrlExposed: false,
            }),
        }));
        expect(JSON.stringify(mockState.recordServerDiagnostic.mock.calls)).not.toContain("another_user");
    });
});
