import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDocRef = {
    path: string;
    get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
    collection: (name: string) => MockCollectionRef;
};

type MockCollectionRef = {
    path: string;
    doc: (id: string) => MockDocRef;
};

const mockState = vi.hoisted(() => {
    const documents = new Map<string, Record<string, unknown>>();
    const savedFiles = new Map<string, { contentType: string; size: number }>();

    const buildCollectionRef = (path: string): MockCollectionRef => ({
        path,
        doc(id: string) {
            return buildDocRef(`${path}/${id}`);
        },
    });

    const buildDocRef = (path: string): MockDocRef => ({
        path,
        async get() {
            return {
                exists: documents.has(path),
                data: () => documents.get(path),
            };
        },
        collection(name: string) {
            return buildCollectionRef(`${path}/${name}`);
        },
    });

    const adminDb = {
        collection(name: string) {
            return buildCollectionRef(name);
        },
        runTransaction: vi.fn(async (callback: (transaction: {
            getAll: (...refs: Array<MockDocRef>) => Promise<Array<{ exists: boolean; data: () => Record<string, unknown> | undefined }>>;
            set: (ref: MockDocRef, data: unknown, options?: { merge?: boolean }) => void;
        }) => Promise<unknown>) => {
            const transaction = {
                async getAll(...refs: Array<MockDocRef>) {
                    return refs.map((ref) => ({
                        exists: documents.has(ref.path),
                        data: () => documents.get(ref.path),
                    }));
                },
                set(ref: MockDocRef, data: unknown, options?: { merge?: boolean }) {
                    const current = options?.merge ? (documents.get(ref.path) ?? {}) : {};
                    documents.set(ref.path, {
                        ...current,
                        ...(data as Record<string, unknown>),
                    });
                },
            };

            return callback(transaction);
        }),
    };

    const fileApi = {
        save: vi.fn(async (_buffer: Buffer, options?: { metadata?: { contentType?: string } }) => {
            const path = fileApi.currentPath;
            if (fileApi.shouldFailSave) {
                throw new Error("storage save failed");
            }
            savedFiles.set(path, {
                contentType: options?.metadata?.contentType || "application/octet-stream",
                size: _buffer.length,
            });
        }),
        delete: vi.fn(async () => undefined),
        exists: vi.fn(async () => [savedFiles.has(fileApi.currentPath)] as const),
        download: vi.fn(async () => [Buffer.from("id-file")] as const),
        currentPath: "",
        shouldFailSave: false,
    };

    const adminStorage = {
        bucket: vi.fn(() => ({
            file(path: string) {
                fileApi.currentPath = path;
                return fileApi;
            },
        })),
    };

    return {
        documents,
        savedFiles,
        adminDb,
        adminStorage,
        fileApi,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        trackServerEvent: vi.fn(async () => undefined),
        recordServerDiagnostic: vi.fn(async () => undefined),
        sendCreatorOnboardingAdminNotification: vi.fn(async () => ({
            delivered: true,
            duplicate: false,
            adminCount: 1,
        })),
        reset() {
            documents.clear();
            savedFiles.clear();
            adminDb.runTransaction.mockClear();
            adminStorage.bucket.mockClear();
            fileApi.save.mockClear();
            fileApi.delete.mockClear();
            fileApi.exists.mockClear();
            fileApi.download.mockClear();
            fileApi.currentPath = "";
            fileApi.shouldFailSave = false;
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.trackServerEvent.mockReset();
            this.recordServerDiagnostic.mockReset();
            this.sendCreatorOnboardingAdminNotification.mockReset();
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
    STRICT: {},
}));

vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

vi.mock("@/lib/server/creator-onboarding-alerts", () => ({
    sendCreatorOnboardingAdminNotification: mockState.sendCreatorOnboardingAdminNotification,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
    withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { POST } from "@/app/api/creator/onboarding/id-submission/route";

describe("POST /api/creator/onboarding/id-submission", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "creator_1",
            email: "creator@example.com",
        });
        mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
            error: error.message,
        }, { status: 500 }));

        mockState.documents.set("users/creator_1", {
            uid: "creator_1",
            email: "creator@example.com",
            displayName: "Creator One",
            username: "creator-one",
            role: "user",
            creatorApplication: {
                signupType: "creator",
                submissionStatus: "awaiting_manual_review",
                approvalStatus: "creator_pending",
                queuePosition: 101,
                onboardingStartedAt: 1_710_000_000_000,
                submittedAt: 1_710_000_000_000,
                onboardingSubmittedAt: 1_710_000_000_000,
                awaitingManualReviewAt: 1_710_000_000_000,
                updatedAt: 1_710_000_000_000,
                creatorDisplayName: "Creator One",
                bypassFanOnboarding: true,
                legalStatus: "legal_pending",
                contractDocumentStatus: "contract_not_sent",
                creatorSignatureStatus: "signature_pending",
                adminSignatureStatus: "signature_pending",
                introAcknowledgedAt: 1_710_000_000_090,
                idVerificationStatus: "id_requested",
                idVerificationRequestedAt: 1_710_000_000_100,
                segmentationStatus: "segment_unassigned",
                blockingReasons: ["awaiting_legal", "awaiting_id_submission"],
                readyForApproval: false,
                creatorReviewQueueVisible: true,
            },
        });
        mockState.documents.set("creator_onboarding/creator_1", {
            userId: "creator_1",
            email: "creator@example.com",
            username: "creator-one",
            role: "user",
            sourceVersion: 1,
            signupType: "creator",
            submissionStatus: "awaiting_manual_review",
            approvalStatus: "creator_pending",
            queuePosition: 101,
            onboardingStartedAt: 1_710_000_000_000,
            submittedAt: 1_710_000_000_000,
            onboardingSubmittedAt: 1_710_000_000_000,
            awaitingManualReviewAt: 1_710_000_000_000,
            updatedAt: 1_710_000_000_000,
            creatorDisplayName: "Creator One",
            bypassFanOnboarding: true,
            legalStatus: "legal_pending",
            contractDocumentStatus: "contract_not_sent",
            creatorSignatureStatus: "signature_pending",
            adminSignatureStatus: "signature_pending",
            introAcknowledgedAt: 1_710_000_000_090,
            idVerificationStatus: "id_requested",
            idVerificationRequestedAt: 1_710_000_000_100,
            segmentationStatus: "segment_unassigned",
            blockingReasons: ["awaiting_legal", "awaiting_id_submission"],
            readyForApproval: false,
            creatorReviewQueueVisible: true,
        });
    });

    it("stores a partial ID upload without marking review complete until the full verification package exists", async () => {
        const formData = new FormData();
        formData.set("slot", "front");
        formData.set("file", new File([new Uint8Array([1, 2, 3])], "government-id.png", { type: "image/png" }));
        const request = new NextRequest("http://localhost/api/creator/onboarding/id-submission", {
            method: "POST",
            body: formData,
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            uploadedSlot: "front",
            documentsComplete: false,
        });
        expect(mockState.fileApi.save).toHaveBeenCalledTimes(1);
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_id_document_uploaded", expect.objectContaining({
            id_slot: "front",
            documents_complete: false,
        }), "creator_1");
        expect(mockState.sendCreatorOnboardingAdminNotification).not.toHaveBeenCalled();
        expect(mockState.documents.get("creator_onboarding/creator_1")).toMatchObject({
            idVerificationStatus: "id_requested",
            idDocuments: expect.objectContaining({
                front: expect.objectContaining({
                    fileName: "government-id.png",
                }),
            }),
        });
        expect(mockState.documents.get("users/creator_1")).toMatchObject({
            creatorApplication: expect.objectContaining({
                idVerificationStatus: "id_requested",
                idDocuments: expect.objectContaining({
                    front: expect.objectContaining({
                        fileName: "government-id.png",
                    }),
                }),
            }),
        });
    });

    it("marks ID review ready when the fourth verification file is uploaded", async () => {
        const uploadSlot = async (
            slot: "front" | "back" | "face_with_id" | "video_with_id",
            fileName: string,
            type: string,
            bytes: number[],
        ) => {
            const formData = new FormData();
            formData.set("slot", slot);
            formData.set("file", new File([new Uint8Array(bytes)], fileName, { type }));
            const request = new NextRequest("http://localhost/api/creator/onboarding/id-submission", {
                method: "POST",
                body: formData,
            });

            return POST(request);
        };

        await uploadSlot("front", "government-id-front.png", "image/png", [1, 2, 3]);
        await uploadSlot("back", "government-id-back.png", "image/png", [4, 5, 6]);
        await uploadSlot("face_with_id", "government-id-selfie.png", "image/png", [7, 8, 9]);

        const response = await uploadSlot("video_with_id", "government-id-video.mp4", "video/mp4", [10, 11, 12]);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            uploadedSlot: "video_with_id",
            documentsComplete: true,
        });
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_id_submitted", expect.any(Object), "creator_1");
        expect(mockState.sendCreatorOnboardingAdminNotification).toHaveBeenCalledWith(expect.objectContaining({
            eventKey: "creator_id_submitted:creator_1",
            link: "/admin/roster?focus=creator_1",
        }));
        expect(mockState.documents.get("creator_onboarding/creator_1")).toMatchObject({
            idVerificationStatus: "id_submitted",
            idDocuments: expect.objectContaining({
                front: expect.objectContaining({
                    fileName: "government-id-front.png",
                }),
                back: expect.objectContaining({
                    fileName: "government-id-back.png",
                }),
                face_with_id: expect.objectContaining({
                    fileName: "government-id-selfie.png",
                }),
                video_with_id: expect.objectContaining({
                    fileName: "government-id-video.mp4",
                }),
            }),
        });
        expect(mockState.documents.get("users/creator_1")).toMatchObject({
            creatorApplication: expect.objectContaining({
                idVerificationStatus: "id_submitted",
                idDocuments: expect.objectContaining({
                    front: expect.objectContaining({
                        fileName: "government-id-front.png",
                    }),
                    back: expect.objectContaining({
                        fileName: "government-id-back.png",
                    }),
                    face_with_id: expect.objectContaining({
                        fileName: "government-id-selfie.png",
                    }),
                    video_with_id: expect.objectContaining({
                        fileName: "government-id-video.mp4",
                    }),
                }),
            }),
        });
        const historyPath = Array.from(mockState.documents.keys()).find((path) => path.startsWith("creator_onboarding/creator_1/history/id_submitted_"));
        expect(historyPath).toBeTruthy();
    });

    it("records telemetry and diagnostics when the storage upload fails", async () => {
        mockState.fileApi.shouldFailSave = true;
        const formData = new FormData();
        formData.set("file", new File([new Uint8Array([1, 2, 3])], "government-id.png", { type: "image/png" }));
        const request = new NextRequest("http://localhost/api/creator/onboarding/id-submission", {
            method: "POST",
            body: formData,
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(500);
        expect(payload).toMatchObject({
            error: "storage save failed",
        });
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("creator_id_submission_failed", expect.any(Object));
        expect(mockState.recordServerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
            channel: "creator_onboarding",
            message: "Creator ID submission failed",
        }));
    });

    it("returns a typed 413 before multipart parsing, storage, or failure telemetry", async () => {
        mockState.guardApiRequest.mockRejectedValueOnce(Object.assign(new Error("Payload too large"), { status: 413 }));
        const formData = new FormData();
        formData.set("file", new File([new Uint8Array([1, 2, 3])], "government-id.png", { type: "image/png" }));
        const request = new NextRequest("http://localhost/api/creator/onboarding/id-submission", {
            method: "POST",
            body: formData,
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(413);
        expect(payload).toMatchObject({
            success: false,
            errorCode: "payload_too_large",
            retryable: false,
        });
        expect(mockState.fileApi.save).not.toHaveBeenCalled();
        expect(mockState.adminDb.runTransaction).not.toHaveBeenCalled();
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.recordServerDiagnostic).not.toHaveBeenCalled();
    });

    it("returns a typed 400 for malformed multipart data without storage mutation", async () => {
        const request = new NextRequest("http://localhost/api/creator/onboarding/id-submission", {
            method: "POST",
            headers: { "content-type": "multipart/form-data; boundary=broken" },
            body: "not-a-valid-multipart-body",
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            success: false,
            errorCode: "invalid_multipart_body",
            code: "invalid_creator_request",
            retryable: false,
        });
        expect(mockState.fileApi.save).not.toHaveBeenCalled();
        expect(mockState.adminDb.runTransaction).not.toHaveBeenCalled();
    });

    it("returns invalid_creator_request when the multipart payload has no ID file", async () => {
        const formData = new FormData();
        formData.set("slot", "front");

        const response = await POST(new NextRequest("http://localhost/api/creator/onboarding/id-submission", {
            method: "POST",
            body: formData,
        }));
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            errorCode: "missing_upload_file",
            code: "invalid_creator_request",
            retryable: false,
        });
        expect(mockState.fileApi.save).not.toHaveBeenCalled();
        expect(mockState.adminDb.runTransaction).not.toHaveBeenCalled();
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.recordServerDiagnostic).not.toHaveBeenCalled();
    });
});
