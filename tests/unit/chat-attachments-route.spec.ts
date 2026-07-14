import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StorageEntry = {
    exists: boolean;
    metadata: {
        contentType?: string;
        size?: string;
        generation?: string | number;
        metageneration?: string | number;
        metadata?: Record<string, string>;
    };
};

type StorageFileOptions = {
    generation?: string | number;
    preconditionOpts?: { ifGenerationMatch?: string | number };
};

const mockState = vi.hoisted(() => {
    const userDocs = new Map<string, Record<string, unknown>>();
    const operationDocs = new Map<string, Record<string, unknown>>();
    const messageDocs = new Map<string, Record<string, unknown>>();
    const storageEntries = new Map<string, StorageEntry>();
    const setMetadata = vi.fn();
    const deleteObject = vi.fn();

    function buildDocRef(collectionName: string, id: string) {
        return {
            collectionName,
            id,
            async get() {
                const source = collectionName === "users"
                    ? userDocs
                    : collectionName === "operation_idempotency"
                        ? operationDocs
                        : messageDocs;
                return {
                    exists: source.has(id),
                    data: () => source.get(id),
                };
            },
            async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
                const source = collectionName === "users"
                    ? userDocs
                    : collectionName === "operation_idempotency"
                        ? operationDocs
                        : messageDocs;
                const current = source.get(id) ?? {};
                source.set(id, options?.merge ? { ...current, ...data } : data);
            },
            async update(data: Record<string, unknown>) {
                const source = collectionName === "users"
                    ? userDocs
                    : collectionName === "operation_idempotency"
                        ? operationDocs
                        : messageDocs;
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
                    file(path: string, fileOptions?: StorageFileOptions) {
                        return {
                            async exists() {
                                return [storageEntries.get(path)?.exists === true];
                            },
                            async getMetadata() {
                                const entry = storageEntries.get(path);
                                if (!entry?.exists) {
                                    throw Object.assign(new Error("storage object not found"), { code: 404 });
                                }
                                return [{
                                    generation: "101",
                                    metageneration: "7",
                                    ...entry.metadata,
                                }];
                            },
                            async setMetadata(
                                payload: Record<string, unknown>,
                                options?: { ifGenerationMatch?: string | number; ifMetagenerationMatch?: string | number },
                            ) {
                                await setMetadata(payload, options);
                                const current = storageEntries.get(path);
                                if (current) {
                                    const currentGeneration = current.metadata.generation ?? "101";
                                    const currentMetageneration = current.metadata.metageneration ?? "7";
                                    if (
                                        String(options?.ifGenerationMatch) !== String(currentGeneration)
                                        || String(options?.ifMetagenerationMatch) !== String(currentMetageneration)
                                    ) {
                                        throw Object.assign(new Error("storage precondition failed"), { code: 412 });
                                    }
                                    current.metadata = {
                                        ...current.metadata,
                                        ...(payload as StorageEntry["metadata"]),
                                        generation: currentGeneration,
                                        metageneration: String(Number(currentMetageneration) + 1),
                                    };
                                }
                            },
                            async delete(deleteOptions?: { ignoreNotFound?: boolean }) {
                                await deleteObject(path, fileOptions, deleteOptions);
                                const current = storageEntries.get(path);
                                if (!current?.exists) {
                                    if (deleteOptions?.ignoreNotFound) return;
                                    throw Object.assign(new Error("storage object not found"), { code: 404 });
                                }
                                const currentGeneration = current.metadata.generation ?? "101";
                                if (
                                    fileOptions?.generation !== undefined
                                    && String(fileOptions.generation) !== String(currentGeneration)
                                ) {
                                    throw Object.assign(new Error("storage precondition failed"), { code: 412 });
                                }
                                storageEntries.delete(path);
                            },
                        };
                    },
                };
            },
        },
        userDocs,
        operationDocs,
        messageDocs,
        storageEntries,
        deleteObject,
        reset() {
            userDocs.clear();
            operationDocs.clear();
            messageDocs.clear();
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
            thread: {
                id: "thread_1",
                userId: "fan_1",
                creatorId: "creator_1",
            },
        });
        mockState.userDocs.set("fan_1", { role: "user" });
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
    });

    it.each([
        ["prepare", preparePost],
        ["complete", completePost],
        ["cancel", cancelPost],
    ])("rejects oversized %s JSON before storage or thread work", async (routeName, handler) => {
        const response = await handler(new NextRequest(`http://localhost/api/chat/attachments/${routeName}`, {
            method: "POST",
            body: JSON.stringify({ padding: "x".repeat(64_001) }),
        }));
        const body = await response.json();

        expect(response.status).toBe(413);
        expect(body).toMatchObject({
            errorCode: "payload_too_large",
            retryable: false,
        });
        expect(mockState.safeGetChatThreadDetailForViewer).not.toHaveBeenCalled();
        expect(mockState.setMetadata).not.toHaveBeenCalled();
        expect(mockState.deleteObject).not.toHaveBeenCalled();
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

    it.each([
        ["C0 control", "proof\u0001.png", "proof.png"],
        ["bidi override", "proof\u202Egnp.exe", "proofgnp.exe"],
        ["accented international name", "cafe\u0301 \u00E9t\u00E9.png", "caf\u00E9 \u00E9t\u00E9.png"],
    ])("sanitizes %s without stripping ordinary international filename text", async (_label, fileName, expectedName) => {
        const response = await preparePost(new NextRequest("http://localhost/api/chat/attachments/prepare", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                fileName,
                mimeType: "image/png",
                sizeBytes: 12345,
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.fileName).toBe(expectedName);
        expect(body.storagePath).toMatch(new RegExp(`_${expectedName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`, "u"));
    });

    it("collapses consecutive filename dots so prepare output remains valid for completion and cancellation", async () => {
        const response = await preparePost(new NextRequest("http://localhost/api/chat/attachments/prepare", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                fileName: "trip..preview...png",
                mimeType: "image/png",
                sizeBytes: 12345,
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.fileName).toBe("trip.preview.png");
        expect(body.storagePath).not.toContain("..");

        mockState.storageEntries.set(body.storagePath, {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "12345",
                metadata: {},
            },
        });
        const completeResponse = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: body.storagePath,
                fileName: body.fileName,
                mimeType: body.mimeType,
                idempotencyKey: "sanitized-filename-complete",
            }),
        }));

        expect(completeResponse.status).toBe(200);

        const cancelResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: body.storagePath,
                idempotencyKey: "sanitized-filename-complete",
            }),
        }));
        expect(cancelResponse.status).toBe(200);
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
                idempotencyKey: "message-key-1",
                storagePath: "creator/messages/fan_1/thread_2/file.png",
                fileName: "file.png",
                mimeType: "image/png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.errorCode).toBe("attachment_complete_forbidden");
        expect(body).toMatchObject({
            firestoreReadScope: "bounded_documents",
            attachmentCompleteGuarded: true,
            ownershipChecked: true,
            threadMembershipChecked: true,
            storagePathValidated: true,
            rawStorageUrlExposed: false,
        });
    });

    it("rejects another user's attachment path during completion", async () => {
        mockState.storageEntries.set("creator/messages/other_user/thread_1/file.png", {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
            },
        });

        const response = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                idempotencyKey: "message-key-1",
                storagePath: "creator/messages/other_user/thread_1/file.png",
                fileName: "file.png",
                mimeType: "image/png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.errorCode).toBe("attachment_complete_forbidden");
        expect(mockState.setMetadata).not.toHaveBeenCalled();
    });

    it("rejects unsafe storage path traversal during attachment completion", async () => {
        const response = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                idempotencyKey: "message-key-1",
                storagePath: "creator/messages/fan_1/thread_1/../file.png",
                fileName: "file.png",
                mimeType: "image/png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errorCode).toBe("invalid_attachment_path");
        expect(body.storagePathValidated).toBe(true);
        expect(mockState.setMetadata).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated attachment completion with a typed error", async () => {
        mockState.guardApiRequest.mockResolvedValueOnce(null);

        const response = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                idempotencyKey: "message-key-1",
                storagePath: "creator/messages/fan_1/thread_1/file.png",
                fileName: "file.png",
                mimeType: "image/png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.errorCode).toBe("unauthorized");
        expect(mockState.setMetadata).not.toHaveBeenCalled();
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
                idempotencyKey: "message-key-1",
                storagePath: "creator/messages/fan_1/thread_1/file.png",
                fileName: "file.png",
                mimeType: "image/png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            firestoreReadScope: "bounded_documents",
            attachmentCompleteGuarded: true,
            ownershipChecked: true,
            threadMembershipChecked: true,
            storagePathValidated: true,
            rawStorageUrlExposed: false,
            status: "finalized",
        });
        expect(body.assetUrl).toContain("creator%2Fmessages%2Ffan_1%2Fthread_1%2Ffile.png");
        expect(body.assetUrl).toContain("token=token-123");
        expect(body.assetUrl).not.toMatch(/^gs:\/\//u);
        expect(body.assetMimeType).toBe("image/png");
        expect(body.sizeBytes).toBe(4096);
        expect(mockState.setMetadata).toHaveBeenCalledWith(expect.objectContaining({
            metadata: expect.objectContaining({
                chatAttachmentFinalized: "true",
                chatAttachmentOperationId: expect.any(String),
            }),
        }), {
            ifGenerationMatch: "101",
            ifMetagenerationMatch: "7",
        });
        expect(Array.from(mockState.operationDocs.values())).toContainEqual(expect.objectContaining({
            status: "finalized",
            threadId: "thread_1",
            callerUid: "fan_1",
        }));
    });

    it.each([
        ["generation", { generation: undefined, metageneration: "7" }],
        ["metageneration", { generation: "101", metageneration: undefined }],
    ])("fails closed when storage object %s evidence is missing", async (versionField, versionMetadata) => {
        const storagePath = `creator/messages/fan_1/thread_1/missing-${versionField}.png`;
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
                ...versionMetadata,
            },
        });

        const response = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                idempotencyKey: `message-key-missing-${versionField}`,
                storagePath,
                fileName: `missing-${versionField}.png`,
                mimeType: "image/png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body).toMatchObject({
            errorCode: "attachment_object_version_missing",
            retryable: true,
        });
        expect(mockState.setMetadata).not.toHaveBeenCalled();
        expect(mockState.operationDocs.size).toBe(0);
    });

    it("preserves the message key when the object changes during finalization and succeeds on retry", async () => {
        const storagePath = "creator/messages/fan_1/thread_1/generation-race.png";
        const idempotencyKey = "message-key-generation-race";
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
                generation: "101",
                metageneration: "7",
                metadata: {},
            },
        });
        mockState.setMetadata.mockImplementationOnce(() => {
            const entry = mockState.storageEntries.get(storagePath)!;
            entry.metadata.generation = "102";
            entry.metadata.metageneration = "1";
        });

        const requestBody = JSON.stringify({
            threadId: "thread_1",
            idempotencyKey,
            storagePath,
            fileName: "generation-race.png",
            mimeType: "image/png",
        });
        const conflictResponse = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: requestBody,
        }));
        const conflictBody = await conflictResponse.json();

        expect(conflictResponse.status).toBe(409);
        expect(conflictBody).toMatchObject({
            errorCode: "attachment_complete_conflict",
            retryable: true,
            preserveIdempotencyKey: true,
        });
        expect(conflictBody).not.toHaveProperty("assetUrl");
        expect(Array.from(mockState.operationDocs.values())).toContainEqual(expect.objectContaining({
            status: "failed",
            errorCode: "attachment_generation_conflict",
        }));

        const retryResponse = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: requestBody,
        }));
        const retryBody = await retryResponse.json();

        expect(retryResponse.status).toBe(200);
        expect(retryBody).toMatchObject({
            success: true,
            idempotencyKey,
            status: "finalized",
        });
        expect(mockState.setMetadata).toHaveBeenLastCalledWith(
            expect.anything(),
            { ifGenerationMatch: "102", ifMetagenerationMatch: "1" },
        );
    });

    it("lets cancellation win a storage precondition conflict without claiming completion", async () => {
        const storagePath = "creator/messages/fan_1/thread_1/cancel-wins.png";
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
                generation: "101",
                metageneration: "7",
                metadata: {},
            },
        });
        mockState.setMetadata.mockImplementationOnce(() => {
            const [operationId] = Array.from(mockState.operationDocs.keys());
            mockState.operationDocs.set(operationId, {
                ...mockState.operationDocs.get(operationId),
                status: "canceled",
                storageCleanupRequested: true,
            });
            const entry = mockState.storageEntries.get(storagePath)!;
            entry.metadata.generation = "102";
            entry.metadata.metageneration = "1";
        });

        const response = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                idempotencyKey: "message-key-cancel-wins",
                storagePath,
                fileName: "cancel-wins.png",
                mimeType: "image/png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.errorCode).toBe("attachment_canceled");
        expect(body).not.toHaveProperty("assetUrl");
        expect(Array.from(mockState.operationDocs.values())).toContainEqual(expect.objectContaining({
            status: "canceled",
            storageCleanupRequested: true,
        }));
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
                idempotencyKey: "message-key-1",
                storagePath: "creator/messages/fan_1/thread_1/file.png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.status).toBe("canceled");
        expect(body.idempotencyKey).toBe("message-key-1");
        expect(body.idempotentReplay).toBe(false);
        expect(body).toMatchObject({
            firestoreReadScope: "bounded_documents",
            attachmentCancelGuarded: true,
            ownershipChecked: true,
            storagePathValidated: true,
            rawStorageUrlExposed: false,
            idempotencyGuarded: true,
            idempotencyScope: "creator_experience_message_operation",
            transactionBound: true,
        });
        expect(body).not.toHaveProperty("storagePath");
        expect(mockState.deleteObject).toHaveBeenCalledWith(
            "creator/messages/fan_1/thread_1/file.png",
            {
                generation: "101",
                preconditionOpts: { ifGenerationMatch: "101" },
            },
            undefined,
        );
        expect(mockState.storageEntries.has("creator/messages/fan_1/thread_1/file.png")).toBe(false);
    });

    it("does not delete a replacement generation during cancellation", async () => {
        const storagePath = "creator/messages/fan_1/thread_1/cancel-generation-race.png";
        const idempotencyKey = "message-key-cancel-generation-race";
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
                generation: "101",
                metageneration: "7",
                metadata: {},
            },
        });
        mockState.deleteObject.mockImplementationOnce(() => {
            const entry = mockState.storageEntries.get(storagePath)!;
            entry.metadata.generation = "102";
            entry.metadata.metageneration = "1";
        });

        const requestBody = JSON.stringify({ threadId: "thread_1", storagePath, idempotencyKey });
        const conflictResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: requestBody,
        }));
        const conflictBody = await conflictResponse.json();

        expect(conflictResponse.status).toBe(409);
        expect(conflictBody).toMatchObject({
            errorCode: "attachment_cancel_conflict",
            retryable: true,
            preserveIdempotencyKey: true,
        });
        expect(mockState.storageEntries.get(storagePath)?.metadata.generation).toBe("102");
        expect(Array.from(mockState.operationDocs.values())).toContainEqual(expect.objectContaining({
            status: "failed",
            storageCleanupCompleted: false,
            errorCode: "attachment_cancel_conflict",
        }));

        const retryResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: requestBody,
        }));
        expect(retryResponse.status).toBe(200);
        expect(mockState.storageEntries.has(storagePath)).toBe(false);
        expect(mockState.deleteObject).toHaveBeenLastCalledWith(
            storagePath,
            expect.objectContaining({ generation: "102" }),
            undefined,
        );
    });

    it("keeps a pre-canceled operation terminal while a replacement generation awaits cleanup", async () => {
        const storagePath = "creator/messages/fan_1/thread_1/pre-canceled-replacement.png";
        const idempotencyKey = "message-key-pre-canceled-replacement";
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
                generation: "101",
                metageneration: "7",
                metadata: {},
            },
        });
        const completeResponse = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath,
                fileName: "pre-canceled-replacement.png",
                mimeType: "image/png",
                idempotencyKey,
            }),
        }));
        expect(completeResponse.status).toBe(200);
        const [operationId] = Array.from(mockState.operationDocs.keys());
        mockState.operationDocs.set(operationId, {
            ...mockState.operationDocs.get(operationId),
            status: "canceled",
            storageCleanupRequested: true,
            storageCleanupCompleted: false,
        });
        mockState.deleteObject.mockImplementationOnce(() => {
            const entry = mockState.storageEntries.get(storagePath)!;
            entry.metadata.generation = "102";
            entry.metadata.metageneration = "1";
        });

        const requestBody = JSON.stringify({ threadId: "thread_1", storagePath, idempotencyKey });
        const conflictResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: requestBody,
        }));
        const conflictBody = await conflictResponse.json();

        expect(conflictResponse.status).toBe(409);
        expect(conflictBody).toMatchObject({
            errorCode: "attachment_cancel_conflict",
            retryable: true,
            preserveIdempotencyKey: true,
        });
        expect(mockState.storageEntries.get(storagePath)?.metadata.generation).toBe("102");
        expect(mockState.operationDocs.get(operationId)).toMatchObject({
            status: "canceled",
            storageCleanupCompleted: false,
        });

        const retryResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: requestBody,
        }));
        expect(retryResponse.status).toBe(200);
        expect(mockState.storageEntries.has(storagePath)).toBe(false);
        expect(mockState.operationDocs.get(operationId)).toMatchObject({
            status: "canceled",
            storageCleanupCompleted: true,
            errorCode: null,
        });
    });

    it("does not delete during cancellation when object version evidence is missing", async () => {
        const storagePath = "creator/messages/fan_1/thread_1/cancel-missing-version.png";
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
                generation: "101",
                metageneration: undefined,
                metadata: {},
            },
        });

        const response = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath,
                idempotencyKey: "message-key-cancel-missing-version",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body).toMatchObject({
            errorCode: "attachment_object_version_missing",
            retryable: true,
        });
        expect(mockState.deleteObject).not.toHaveBeenCalled();
        expect(mockState.operationDocs.size).toBe(0);
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
            idempotencyKey: "message-key-retry",
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

        mockState.storageEntries.set("creator/messages/fan_1/thread_1/retry.png", {
            exists: true,
            metadata: { contentType: "image/png", size: "4096", metadata: {} },
        });
        const lateReplayResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body,
        }));
        expect(lateReplayResponse.status).toBe(200);
        expect(mockState.deleteObject).toHaveBeenCalledTimes(2);
        expect(mockState.storageEntries.has("creator/messages/fan_1/thread_1/retry.png")).toBe(false);
    });

    it("keeps the terminal canceled state when duplicate cleanup requests race", async () => {
        const storagePath = "creator/messages/fan_1/thread_1/concurrent-cancel.png";
        const idempotencyKey = "message-key-concurrent-cancel";
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
                generation: "101",
                metageneration: "7",
                metadata: {},
            },
        });
        let deleteArrivals = 0;
        let releaseDeletes!: () => void;
        const deleteBarrier = new Promise<void>((resolve) => {
            releaseDeletes = resolve;
        });
        mockState.deleteObject.mockImplementation(async () => {
            deleteArrivals += 1;
            if (deleteArrivals === 2) releaseDeletes();
            await deleteBarrier;
        });

        const requestBody = JSON.stringify({ threadId: "thread_1", storagePath, idempotencyKey });
        const [firstResponse, secondResponse] = await Promise.all([
            cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
                method: "POST",
                body: requestBody,
            })),
            cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
                method: "POST",
                body: requestBody,
            })),
        ]);
        const [firstBody, secondBody] = await Promise.all([firstResponse.json(), secondResponse.json()]);

        expect([firstResponse.status, secondResponse.status]).toEqual([200, 200]);
        expect([firstBody.idempotentReplay, secondBody.idempotentReplay].sort()).toEqual([false, true]);
        expect(mockState.deleteObject).toHaveBeenCalledTimes(2);
        expect(mockState.storageEntries.has(storagePath)).toBe(false);
        expect(Array.from(mockState.operationDocs.values())).toContainEqual(expect.objectContaining({
            status: "canceled",
            storageCleanupCompleted: true,
            errorCode: null,
        }));
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
                idempotencyKey: "message-key-1",
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
                idempotencyKey: "message-key-1",
                storagePath: "creator/messages/fan_1/thread_1/../file.png",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.errorCode).toBe("invalid_attachment_path");
        expect(body.storagePathValidated).toBe(true);
        expect(mockState.deleteObject).not.toHaveBeenCalled();
    });

    it("cancels a finalized upload when no message has claimed it", async () => {
        const storagePath = "creator/messages/fan_1/thread_1/final.png";
        const idempotencyKey = "message-key-final";
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: {
                contentType: "image/png",
                size: "4096",
                metadata: {},
            },
        });

        const completeResponse = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath,
                fileName: "final.png",
                mimeType: "image/png",
                idempotencyKey,
            }),
        }));
        expect(completeResponse.status).toBe(200);

        const cancelResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({ threadId: "thread_1", storagePath, idempotencyKey }),
        }));
        const body = await cancelResponse.json();

        expect(cancelResponse.status).toBe(200);
        expect(body).toMatchObject({ success: true, status: "canceled" });
        expect(mockState.deleteObject).toHaveBeenCalledWith(
            storagePath,
            expect.objectContaining({ generation: "101" }),
            undefined,
        );
        expect(mockState.storageEntries.has(storagePath)).toBe(false);
    });

    it("returns 409 without deleting after a message has claimed the upload", async () => {
        const storagePath = "creator/messages/fan_1/thread_1/attached.png";
        const idempotencyKey = "message-key-attached";
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: { contentType: "image/png", size: "4096", metadata: {} },
        });
        const completeResponse = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath,
                fileName: "attached.png",
                mimeType: "image/png",
                idempotencyKey,
            }),
        }));
        expect(completeResponse.status).toBe(200);
        const [operationId] = Array.from(mockState.operationDocs.keys());
        mockState.operationDocs.set(operationId, {
            ...mockState.operationDocs.get(operationId),
            status: "attached",
            attachedMessageId: operationId,
        });
        mockState.messageDocs.set(operationId, { idempotencyKey: "persisted" });

        const response = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({ threadId: "thread_1", storagePath, idempotencyKey }),
        }));
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.errorCode).toBe("attachment_already_attached");
        expect(body.rawStorageUrlExposed).toBe(false);
        expect(mockState.deleteObject).not.toHaveBeenCalled();
    });

    it("does not finalize a different path after the message operation is already attached", async () => {
        const firstPath = "creator/messages/fan_1/thread_1/first.png";
        const secondPath = "creator/messages/fan_1/thread_1/second.png";
        const idempotencyKey = "message-key-reused";
        mockState.storageEntries.set(firstPath, {
            exists: true,
            metadata: { contentType: "image/png", size: "4096", metadata: {} },
        });
        const firstResponse = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: firstPath,
                fileName: "first.png",
                mimeType: "image/png",
                idempotencyKey,
            }),
        }));
        expect(firstResponse.status).toBe(200);
        const [operationId] = Array.from(mockState.operationDocs.keys());
        mockState.operationDocs.set(operationId, {
            ...mockState.operationDocs.get(operationId),
            status: "attached",
            attachedMessageId: operationId,
        });
        mockState.messageDocs.set(operationId, { idempotencyKey: "persisted" });
        mockState.storageEntries.set(secondPath, {
            exists: true,
            metadata: { contentType: "image/png", size: "4096", metadata: {} },
        });
        mockState.setMetadata.mockClear();

        const secondResponse = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath: secondPath,
                fileName: "second.png",
                mimeType: "image/png",
                idempotencyKey,
            }),
        }));

        expect(secondResponse.status).toBe(403);
        expect(mockState.setMetadata).not.toHaveBeenCalled();
        expect(mockState.storageEntries.get(secondPath)?.metadata.metadata).toEqual({});
    });

    it("does not resurrect a canceled operation and removes a late upload", async () => {
        const storagePath = "creator/messages/fan_1/thread_1/late.png";
        const idempotencyKey = "message-key-late";
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: { contentType: "image/png", size: "4096", metadata: {} },
        });
        const initialComplete = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath,
                fileName: "late.png",
                mimeType: "image/png",
                idempotencyKey,
            }),
        }));
        expect(initialComplete.status).toBe(200);
        const cancelResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({ threadId: "thread_1", storagePath, idempotencyKey }),
        }));
        expect(cancelResponse.status).toBe(200);

        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: { contentType: "image/png", size: "4096", metadata: {} },
        });
        mockState.setMetadata.mockClear();
        mockState.deleteObject.mockClear();
        const lateComplete = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath,
                fileName: "late.png",
                mimeType: "image/png",
                idempotencyKey,
            }),
        }));
        const body = await lateComplete.json();

        expect(lateComplete.status).toBe(409);
        expect(body.errorCode).toBe("attachment_canceled");
        expect(mockState.setMetadata).not.toHaveBeenCalled();
        expect(mockState.deleteObject).toHaveBeenCalledWith(
            storagePath,
            expect.objectContaining({ generation: "101" }),
            undefined,
        );
        expect(mockState.operationDocs.get(Array.from(mockState.operationDocs.keys())[0])).toMatchObject({ status: "canceled" });
    });

    it("does not resurrect an upload after cancellation cleanup fails", async () => {
        const storagePath = "creator/messages/fan_1/thread_1/cancel-failed.png";
        const idempotencyKey = "message-key-cancel-failed";
        mockState.storageEntries.set(storagePath, {
            exists: true,
            metadata: { contentType: "image/png", size: "4096", metadata: {} },
        });
        const completeResponse = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath,
                fileName: "cancel-failed.png",
                mimeType: "image/png",
                idempotencyKey,
            }),
        }));
        expect(completeResponse.status).toBe(200);

        mockState.deleteObject.mockImplementationOnce(() => {
            throw new Error("storage delete unavailable");
        });
        const cancelResponse = await cancelPost(new NextRequest("http://localhost/api/chat/attachments/cancel", {
            method: "POST",
            body: JSON.stringify({ threadId: "thread_1", storagePath, idempotencyKey }),
        }));
        expect(cancelResponse.status).toBe(500);
        const [operationId] = Array.from(mockState.operationDocs.keys());
        expect(mockState.operationDocs.get(operationId)).toMatchObject({
            status: "failed",
            storageCleanupRequested: true,
            storageCleanupCompleted: false,
        });

        mockState.setMetadata.mockClear();
        const retryCompleteResponse = await completePost(new NextRequest("http://localhost/api/chat/attachments/complete", {
            method: "POST",
            body: JSON.stringify({
                threadId: "thread_1",
                storagePath,
                fileName: "cancel-failed.png",
                mimeType: "image/png",
                idempotencyKey,
            }),
        }));
        const body = await retryCompleteResponse.json();

        expect(retryCompleteResponse.status).toBe(409);
        expect(body.errorCode).toBe("attachment_cancel_requested");
        expect(mockState.setMetadata).not.toHaveBeenCalled();
        expect(mockState.operationDocs.get(operationId)).toMatchObject({
            status: "failed",
            storageCleanupRequested: true,
        });
    });
});
