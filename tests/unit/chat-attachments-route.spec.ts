import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StorageEntry = {
    exists: boolean;
    metadata: {
        contentType?: string;
        size?: string;
        metadata?: Record<string, string>;
    };
};

const mockState = vi.hoisted(() => {
    const userDocs = new Map<string, Record<string, unknown>>();
    const operationDocs = new Map<string, Record<string, unknown>>();
    const storageEntries = new Map<string, StorageEntry>();
    const setMetadata = vi.fn();
    const deleteObject = vi.fn();

    function buildDocRef(collectionName: string, id: string) {
        return {
            collectionName,
            id,
            async get() {
                const source = collectionName === "users" ? userDocs : operationDocs;
                return {
                    exists: source.has(id),
                    data: () => source.get(id),
                };
            },
            async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
                const source = collectionName === "users" ? userDocs : operationDocs;
                const current = source.get(id) ?? {};
                source.set(id, options?.merge ? { ...current, ...data } : data);
            },
            async update(data: Record<string, unknown>) {
                const source = collectionName === "users" ? userDocs : operationDocs;
                source.set(id, { ...(source.get(id) ?? {}), ...data });
            },
        };
    }

    return {
        guardApiRequest: vi.fn(),
        safeGetChatThreadDetailForViewer: vi.fn(),
        toChatClientError: vi.fn(),
        handleApiError: vi.fn(),
        recordRouteRuntimeSample: vi.fn(),
        getErrorMessage: vi.fn(),
        setMetadata,
        adminDb: {
            collection(name: string) {
                return {
                    doc(id: string) {
                        return buildDocRef(name, id);
                    },
                };
            },
            async runTransaction<T>(callback: (transaction: {
                get: (ref: ReturnType<typeof buildDocRef>) => ReturnType<ReturnType<typeof buildDocRef>["get"]>;
                set: (ref: ReturnType<typeof buildDocRef>, data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
                update: (ref: ReturnType<typeof buildDocRef>, data: Record<string, unknown>) => Promise<void>;
            }) => Promise<T>) {
                return callback({
                    get: (ref) => ref.get(),
                    set: (ref, data, options) => ref.set(data, options),
                    update: (ref, data) => ref.update(data),
                });
            },
        },
        adminStorage: {
            bucket() {
                return {
                    name: "kandydrops-test.appspot.com",
                    file(path: string) {
                        return {
                            async exists() {
                                return [storageEntries.get(path)?.exists === true];
                            },
                            async getMetadata() {
                                return [storageEntries.get(path)?.metadata ?? {}];
                            },
                            async setMetadata(payload: Record<string, unknown>) {
                                setMetadata(payload);
                                const current = storageEntries.get(path);
                                if (current) {
                                    current.metadata = {
                                        ...current.metadata,
                                        ...(payload as StorageEntry["metadata"]),
                                    };
                                }
                            },
                            async delete() {
                                deleteObject(path);
                                storageEntries.delete(path);
                            },
                        };
                    },
                };
            },
        },
        userDocs,
        operationDocs,
        storageEntries,
        deleteObject,
        reset() {
            userDocs.clear();
            operationDocs.clear();
            storageEntries.clear();
            setMetadata.mockReset();
            deleteObject.mockReset();
            this.guardApiRequest.mockReset();
            this.safeGetChatThreadDetailForViewer.mockReset();
            this.toChatClientError.mockReset();
            this.handleApiError.mockReset();
            this.recordRouteRuntimeSample.mockReset();
            this.getErrorMessage.mockReset();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/chat", () => ({
    safeGetChatThreadDetailForViewer: mockState.safeGetChatThreadDetailForViewer,
    toChatClientError: mockState.toChatClientError,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
    adminStorage: mockState.adminStorage,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    MEDIA_PROXY: {},
    STANDARD: {},
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    getErrorMessage: mockState.getErrorMessage,
}));

import { POST as preparePost } from "@/app/api/chat/attachments/prepare/route";
import { POST as cancelPost } from "@/app/api/chat/attachments/cancel/route";
import { POST as completePost } from "@/app/api/chat/attachments/complete/route";

describe("chat attachment routes", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.toChatClientError.mockReturnValue(null);
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.safeGetChatThreadDetailForViewer.mockResolvedValue({
            threadId: "thread_1",
        });
        mockState.userDocs.set("fan_1", { role: "user" });
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
    });

    it("prepares an attachment path for a valid participant", async () => {
        const response = await preparePost(new NextRequest("http://localhost/api/chat/attachments/prepare", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                fileName: "my photo?.png",
                mimeType: "image/png",
                sizeBytes: 12345,
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.storagePath).toMatch(/^creator\/messages\/fan_1\/thread_1\//);
        expect(body.fileName).toBe("my photo-.png");
    });

    it("rejects unsupported attachment types during prepare", async () => {
        const response = await preparePost(new NextRequest("http://localhost/api/chat/attachments/prepare", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                fileName: "archive.zip",
                mimeType: "application/zip",
                sizeBytes: 12345,
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errorCode).toBe("unsupported_attachment_type");
    });

    it("rejects attachment completion when the storage path does not match the caller thread scope", async () => {
        const response = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: "creator/messages/fan_1/thread_2/file.png",
                fileName: "file.png",
                mimeType: "image/png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errorCode).toBe("invalid_attachment_path");
    });

    it("returns a canonical download URL for completed uploads", async () => {
        mockState.storageEntries.set("creator/messages/fan_1/thread_1/file.png", {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
                metadata: {
                    firebaseStorageDownloadTokens: "token-123",
                },
            },
        });

        const response = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: "creator/messages/fan_1/thread_1/file.png",
                fileName: "file.png",
                mimeType: "image/png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.assetUrl).toContain("creator%2Fmessages%2Ffan_1%2Fthread_1%2Ffile.png");
        expect(body.assetUrl).toContain("token=token-123");
        expect(body.assetMimeType).toBe("image/png");
        expect(body.sizeBytes).toBe(4096);
        expect(mockState.setMetadata).toHaveBeenCalled();
    });

    it("removes an uploaded attachment during cancel cleanup", async () => {
        mockState.storageEntries.set("creator/messages/fan_1/thread_1/file.png", {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
            },
        });

        const response = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: "creator/messages/fan_1/thread_1/file.png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.status).toBe("canceled");
        expect(body.idempotencyKey).toMatch(/^chat_attachment_cancel:fan_1:thread_1:/u);
        expect(body.idempotentReplay).toBe(false);
        expect(body).toMatchObject({
            firestoreReadScope: "single_document",
            attachmentCancelGuarded: true,
            ownershipChecked: true,
            storagePathValidated: true,
            rawStorageUrlExposed: false,
            idempotencyGuarded: true,
            idempotencyScope: "caller_attachment_action",
            transactionBound: true,
        });
        expect(body).not.toHaveProperty("storagePath");
        expect(mockState.deleteObject).toHaveBeenCalledWith("creator/messages/fan_1/thread_1/file.png");
        expect(mockState.storageEntries.has("creator/messages/fan_1/thread_1/file.png")).toBe(false);
    });

    it("treats repeated attachment cancellation as an idempotent replay", async () => {
        mockState.storageEntries.set("creator/messages/fan_1/thread_1/retry.png", {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
            },
        });

        const body = JSON.stringify({
            threadId: "thread_1",
            storagePath: "creator/messages/fan_1/thread_1/retry.png",
        });
        const firstResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body,
        }));
        const firstBody = await firstResponse.json();

        const secondResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body,
        }));
        const secondBody = await secondResponse.json();

        expect(firstResponse.status).toBe(200);
        expect(firstBody.idempotentReplay).toBe(false);
        expect(secondResponse.status).toBe(200);
        expect(secondBody).toMatchObject({
            success: true,
            status: "canceled",
            idempotencyKey: firstBody.idempotencyKey,
            idempotentReplay: true,
        });
        expect(mockState.deleteObject).toHaveBeenCalledTimes(1);
        expect(secondBody).not.toHaveProperty("storagePath");
    });

    it("accepts a valid caller-scoped client idempotency key for repeat cancellation", async () => {
        mockState.storageEntries.set("creator/messages/fan_1/thread_1/client-key.png", {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
            },
        });

        const requestInit = {
            method: "POST",
            headers: {
                "idempotency-key": "cancel-key-123",
            },
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: "creator/messages/fan_1/thread_1/client-key.png",
            }),
        };
        const firstResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", requestInit));
        const firstBody = await firstResponse.json();
        const secondResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", requestInit));
        const secondBody = await secondResponse.json();

        expect(firstResponse.status).toBe(200);
        expect(firstBody.idempotencyKey).toContain("cancel-key-123");
        expect(firstBody.idempotentReplay).toBe(false);
        expect(secondResponse.status).toBe(200);
        expect(secondBody.idempotentReplay).toBe(true);
        expect(secondBody.idempotencyKey).toBe(firstBody.idempotencyKey);
    });

    it("rejects malformed client idempotency keys", async () => {
        const response = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: "creator/messages/fan_1/thread_1/file.png",
                idempotencyKey: "bad key with spaces",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errorCode).toBe("invalid_idempotency_key");
        expect(mockState.deleteObject).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated attachment cancellation with a typed error", async () => {
        mockState.guardApiRequest.mockResolvedValueOnce(null);

        const response = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: "creator/messages/fan_1/thread_1/file.png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.errorCode).toBe("unauthorized");
        expect(mockState.deleteObject).not.toHaveBeenCalled();
    });

    it("rejects another user's attachment path during cancel cleanup", async () => {
        mockState.storageEntries.set("creator/messages/other_user/thread_1/file.png", {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
            },
        });

        const response = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: "creator/messages/other_user/thread_1/file.png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.errorCode).toBe("attachment_cancel_forbidden");
        expect(body.rawStorageUrlExposed).toBe(false);
        expect(mockState.deleteObject).not.toHaveBeenCalled();
    });

    it("rejects unsafe storage path traversal during cancel cleanup", async () => {
        const response = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: "creator/messages/fan_1/thread_1/../file.png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errorCode).toBe("invalid_attachment_path");
        expect(body.storagePathValidated).toBe(true);
        expect(mockState.deleteObject).not.toHaveBeenCalled();
    });

    it("does not delete a finalized chat attachment during cancel cleanup", async () => {
        mockState.storageEntries.set("creator/messages/fan_1/thread_1/final.png", {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
                metadata: {
                    firebaseStorageDownloadTokens: "final-token",
                },
            },
        });

        const response = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: "creator/messages/fan_1/thread_1/final.png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.errorCode).toBe("attachment_already_finalized");
        expect(body.rawStorageUrlExposed).toBe(false);
        expect(mockState.deleteObject).not.toHaveBeenCalled();
    });
});
