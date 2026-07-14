import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDoc = Record<string, unknown>;

const mockState = vi.hoisted(() => {
    const documents = new Map<string, StoredDoc>();
    const storageMetadata = new Map<string, {
        contentType?: string;
        size?: string | number;
        metadata?: Record<string, string>;
    }>();
    let autoId = 0;

    const hasUndefinedValue = (value: unknown): boolean => {
        if (typeof value === "undefined") {
            return true;
        }
        if (!value || typeof value !== "object") {
            return false;
        }
        if (Array.isArray(value)) {
            return value.some((entry) => hasUndefinedValue(entry));
        }

        return Object.values(value as Record<string, unknown>).some((entry) => hasUndefinedValue(entry));
    };

    const readDoc = (path: string) => documents.get(path);
    const setDoc = (path: string, value: StoredDoc, merge = false) => {
        if (hasUndefinedValue(value)) {
            throw new Error(`Firestore does not allow undefined values: ${path}`);
        }

        if (merge) {
            documents.set(path, {
                ...(documents.get(path) || {}),
                ...value,
            });
            return;
        }

        documents.set(path, value);
    };

    const buildSnapshot = (path: string, id: string) => ({
        id,
        exists: documents.has(path),
        data: () => readDoc(path),
    });

    const adminDb = {
        collection(name: string) {
            return {
                doc(id?: string) {
                    const resolvedId = id || `${name}_auto_${++autoId}`;
                    const path = `${name}/${resolvedId}`;
                    return {
                        id: resolvedId,
                        path,
                        async get() {
                            return buildSnapshot(path, resolvedId);
                        },
                    };
                },
            };
        },
        async runTransaction<T>(callback: (transaction: {
            get: (ref: { path: string; id: string }) => Promise<ReturnType<typeof buildSnapshot>>;
            set: (ref: { path: string }, data: StoredDoc, options?: { merge?: boolean }) => void;
            update: (ref: { path: string }, patch: StoredDoc) => void;
        }) => Promise<T>) {
            const stagedWrites: Array<() => void> = [];
            const transaction = {
                async get(ref: { path: string; id: string }) {
                    return buildSnapshot(ref.path, ref.id);
                },
                set(ref: { path: string }, data: StoredDoc, options?: { merge?: boolean }) {
                    stagedWrites.push(() => setDoc(ref.path, data, options?.merge === true));
                },
                update(ref: { path: string }, patch: StoredDoc) {
                    stagedWrites.push(() => setDoc(ref.path, patch, true));
                },
            };

            const result = await callback(transaction);
            stagedWrites.forEach((commit) => commit());
            return result;
        },
    };
    const adminStorage = {
        bucket() {
            return {
                name: "test-bucket.appspot.com",
                file(path: string) {
                    return {
                        async getMetadata() {
                            const metadata = storageMetadata.get(path);
                            if (!metadata) {
                                throw Object.assign(new Error("Storage object not found"), { code: 404 });
                            }
                            return [metadata];
                        },
                    };
                },
            };
        },
    };

    return {
        adminDb,
        adminStorage,
        documents,
        storageMetadata,
        trackServerEvent: vi.fn().mockResolvedValue(undefined),
        recordRouteWarning: vi.fn(),
        recordServerDiagnostic: vi.fn().mockResolvedValue(undefined),
        reset() {
            documents.clear();
            storageMetadata.clear();
            autoId = 0;
            this.trackServerEvent.mockReset();
            this.trackServerEvent.mockResolvedValue(undefined);
            this.recordRouteWarning.mockReset();
            this.recordServerDiagnostic.mockReset();
            this.recordServerDiagnostic.mockResolvedValue(undefined);
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
    adminStorage: mockState.adminStorage,
}));
vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    getErrorMessage: (error: unknown) => error instanceof Error ? error.message : String(error),
    recordRouteWarning: mockState.recordRouteWarning,
}));
vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: mockState.recordServerDiagnostic,
}));

import { buildChatThreadId, type ChatInsufficientFundsPayload } from "@/lib/chat";
import { ChatClientError, sendChatMessageForViewer } from "@/lib/server/chat";
import { buildChatAttachmentOperationIdentity } from "@/lib/server/creator-experiences";

describe("sendChatMessageForViewer", () => {
    const creatorId = "creator_1";
    const userId = "fan_1";
    const threadId = buildChatThreadId(creatorId, userId);

    beforeEach(() => {
        mockState.reset();
        mockState.documents.set(`users/${creatorId}`, {
            uid: creatorId,
            role: "creator",
            status: "active",
            displayName: "Creator One",
            username: "creatorone",
            creatorSettings: {
                messagingEnabled: true,
                chatFreeForSubscribers: false,
            },
        });
    });

    it("blocks text sends when only a legacy total balance exists", async () => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 10,
        });

        await expect(sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            text: "hello there",
            messageKind: "text",
        })).rejects.toMatchObject({
            status: 409,
            body: expect.objectContaining({
                errorCode: "insufficient_paid_gumdrops",
                purchasedBalanceGd: 0,
                paidGdShortfall: 1,
            }),
        });
    });

    it("prevents duplicate private chat charges for the same idempotency key", async () => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 10,
            gumDropsPurchasedBalance: 10,
            gumDropsRewardBalance: 0,
        });

        const input = {
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            text: "one paid message",
            messageKind: "text",
            idempotencyKey: "private-chat-key-1",
        } as const;

        const first = await sendChatMessageForViewer(input);
        const second = await sendChatMessageForViewer(input);

        expect(first.duplicatePrevented).toBe(false);
        expect(second.duplicatePrevented).toBe(true);
        expect(second.message.id).toBe(first.message.id);
        expect(mockState.documents.get(`users/${userId}`)).toMatchObject({
            gumDropsBalance: 9,
            gumDropsPurchasedBalance: 9,
            gumDropsRewardBalance: 0,
        });
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(1);
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("creator_ledger_accruals/"))).toHaveLength(1);
    });

    it("allows text sends from admin accounts acting as the paid participant", async () => {
        const adminUserId = "admin_1";
        const adminThreadId = buildChatThreadId(creatorId, adminUserId);

        mockState.documents.set(`users/${adminUserId}`, {
            uid: adminUserId,
            role: "admin",
            displayName: "Admin Operator",
            username: "admin-operator",
            gumDropsBalance: 14,
            gumDropsPurchasedBalance: 14,
            gumDropsRewardBalance: 0,
        });

        const result = await sendChatMessageForViewer({
            callerUid: adminUserId,
            callerEmail: "admin@example.com",
            callerRole: "admin",
            threadId: adminThreadId,
            text: "admin check-in",
            messageKind: "text",
        });

        expect(result.costGd).toBe(1);
        expect(result.message).toMatchObject({
            text: "admin check-in",
            userId: adminUserId,
            costGd: 1,
        });
        expect(mockState.documents.get(`users/${adminUserId}`)).toMatchObject({
            gumDropsBalance: 13,
            gumDropsPurchasedBalance: 13,
            gumDropsRewardBalance: 0,
        });
        expect(result.pricing).toMatchObject({
            purchasedBalanceGd: 13,
        });
    });

    it("spends only purchased balance when split balances exist", async () => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 20,
            gumDropsPurchasedBalance: 2,
            gumDropsRewardBalance: 18,
        });

        const result = await sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            text: "paid ping",
            messageKind: "text",
        });

        const participant = mockState.documents.get(`users/${userId}`);

        expect(result.costGd).toBe(1);
        expect(participant).toMatchObject({
            gumDropsBalance: 19,
            gumDropsPurchasedBalance: 1,
            gumDropsRewardBalance: 18,
        });
        expect(result.pricing).toMatchObject({
            purchasedBalanceGd: 1,
        });
    });

    it("persists only caller-owned attachments from the configured Firebase Storage bucket", async () => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 10,
            gumDropsPurchasedBalance: 10,
            gumDropsRewardBalance: 0,
        });
        const objectPath = `creator/messages/${userId}/${threadId}/upload_image.png`;
        const assetUrl = `https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com/o/${encodeURIComponent(objectPath)}?alt=media&token=test`;
        const attachmentOperation = buildChatAttachmentOperationIdentity({
            userId,
            creatorId,
            callerUid: userId,
            threadId,
            clientKey: "owned-attachment-1",
            storagePath: objectPath,
        });
        mockState.storageMetadata.set(objectPath, {
            contentType: "image/png",
            size: "4096",
            metadata: {
                chatAttachmentFinalized: "true",
                chatAttachmentOperationId: attachmentOperation.operationId,
            },
        });
        mockState.documents.set(`operation_idempotency/${attachmentOperation.operationId}`, {
            ...attachmentOperation,
            status: "finalized",
        });

        const result = await sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            messageKind: "image",
            assetUrl,
            assetName: "image.png",
            assetMimeType: "image/png",
            idempotencyKey: "owned-attachment-1",
        });

        expect(result.message).toMatchObject({
            messageKind: "image",
            assetUrl,
            assetName: "image.png",
            assetMimeType: "image/png",
        });
        expect(mockState.documents.get(`operation_idempotency/${attachmentOperation.operationId}`)).toMatchObject({
            status: "attached",
            attachedMessageId: result.message.id,
        });
        expect(mockState.documents.has(`creator_messages/${result.message.id}`)).toBe(true);

        const attachedLifecycle = { ...mockState.documents.get(`operation_idempotency/${attachmentOperation.operationId}`) };
        mockState.storageMetadata.delete(objectPath);
        mockState.documents.set(`users/${creatorId}`, {
            uid: creatorId,
            role: "creator",
            status: "suspended",
            creatorSettings: { messagingEnabled: false },
            creatorRestrictions: { messagingRestricted: true },
        });
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
        });
        const replay = await sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            messageKind: "image",
            assetUrl,
            assetName: "image.png",
            assetMimeType: "image/png",
            idempotencyKey: "owned-attachment-1",
        });
        expect(replay.duplicatePrevented).toBe(true);
        expect(mockState.documents.get(`operation_idempotency/${attachmentOperation.operationId}`)).toEqual(attachedLifecycle);

        const conflictingObjectPath = `creator/messages/${userId}/${threadId}/different_image.png`;
        const conflictingAssetUrl = `https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com/o/${encodeURIComponent(conflictingObjectPath)}?alt=media&token=test`;
        mockState.storageMetadata.set(conflictingObjectPath, {
            contentType: "image/png",
            size: "4096",
            metadata: {
                chatAttachmentFinalized: "true",
                chatAttachmentOperationId: attachmentOperation.operationId,
            },
        });
        await expect(sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            messageKind: "image",
            assetUrl: conflictingAssetUrl,
            assetName: "different.png",
            assetMimeType: "image/png",
            idempotencyKey: "owned-attachment-1",
        })).rejects.toMatchObject({
            status: 409,
            body: expect.objectContaining({ errorCode: "idempotency_conflict" }),
        });
        expect(mockState.documents.get(`operation_idempotency/${attachmentOperation.operationId}`)).toEqual(attachedLifecycle);
    });

    it("does not persist an attachment after cancellation wins the lifecycle transaction", async () => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 10,
            gumDropsPurchasedBalance: 10,
            gumDropsRewardBalance: 0,
        });
        const objectPath = `creator/messages/${userId}/${threadId}/canceled_image.png`;
        const assetUrl = `https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com/o/${encodeURIComponent(objectPath)}?alt=media&token=test`;
        const attachmentOperation = buildChatAttachmentOperationIdentity({
            userId,
            creatorId,
            callerUid: userId,
            threadId,
            clientKey: "canceled-attachment-1",
            storagePath: objectPath,
        });
        mockState.storageMetadata.set(objectPath, {
            contentType: "image/png",
            size: "4096",
            metadata: {
                chatAttachmentFinalized: "true",
                chatAttachmentOperationId: attachmentOperation.operationId,
            },
        });
        mockState.documents.set(`operation_idempotency/${attachmentOperation.operationId}`, {
            ...attachmentOperation,
            status: "canceled",
        });

        await expect(sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            messageKind: "image",
            assetUrl,
            assetName: "image.png",
            assetMimeType: "image/png",
            idempotencyKey: "canceled-attachment-1",
        })).rejects.toMatchObject({
            status: 409,
            body: expect.objectContaining({ errorCode: "attachment_canceled" }),
        });
        expect(mockState.documents.has(`creator_messages/${attachmentOperation.messageId}`)).toBe(false);
    });

    it.each([
        {
            label: "a missing object",
            metadata: null,
        },
        {
            label: "unfinalized metadata",
            metadata: { contentType: "image/png", size: "4096", metadata: {} as Record<string, string> },
        },
        {
            label: "a mismatched stored content type",
            metadata: { contentType: "video/mp4", size: "4096", metadata: { chatAttachmentFinalized: "true" } },
        },
        {
            label: "an oversized object",
            metadata: { contentType: "image/png", size: String((25 * 1024 * 1024) + 1), metadata: { chatAttachmentFinalized: "true" } },
        },
    ])("rejects $label before attachment persistence", async ({ metadata }) => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 10,
            gumDropsPurchasedBalance: 10,
            gumDropsRewardBalance: 0,
        });
        const objectPath = `creator/messages/${userId}/${threadId}/forged_image.png`;
        const assetUrl = `https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com/o/${encodeURIComponent(objectPath)}?alt=media&token=test`;
        if (metadata) {
            mockState.storageMetadata.set(objectPath, metadata);
        }

        await expect(sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            messageKind: "image",
            assetUrl,
            assetName: "image.png",
            assetMimeType: "image/png",
            idempotencyKey: "forged-attachment-1",
        })).rejects.toMatchObject({
            status: 400,
            body: expect.objectContaining({
                errorCode: "invalid_attachment",
            }),
        });

        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("creator_messages/"))).toHaveLength(0);
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(0);
    });

    it.each([
        {
            label: "a script URL",
            assetUrl: "javascript:alert(1)",
            messageKind: "image" as const,
            assetMimeType: "image/png",
        },
        {
            label: "an arbitrary HTTPS host",
            assetUrl: `https://example.com/creator/messages/${userId}/${threadId}/image.png`,
            messageKind: "image" as const,
            assetMimeType: "image/png",
        },
        {
            label: "a different Firebase bucket",
            assetUrl: `https://firebasestorage.googleapis.com/v0/b/other-bucket.appspot.com/o/${encodeURIComponent(`creator/messages/${userId}/${threadId}/image.png`)}?alt=media`,
            messageKind: "image" as const,
            assetMimeType: "image/png",
        },
        {
            label: "another user's storage path",
            assetUrl: `https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com/o/${encodeURIComponent(`creator/messages/other_user/${threadId}/image.png`)}?alt=media`,
            messageKind: "image" as const,
            assetMimeType: "image/png",
        },
        {
            label: "a mismatched attachment type",
            assetUrl: `https://firebasestorage.googleapis.com/v0/b/test-bucket.appspot.com/o/${encodeURIComponent(`creator/messages/${userId}/${threadId}/image.png`)}?alt=media`,
            messageKind: "image" as const,
            assetMimeType: "text/html",
        },
    ])("rejects $label before persistence", async ({ assetUrl, messageKind, assetMimeType }) => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 10,
            gumDropsPurchasedBalance: 10,
            gumDropsRewardBalance: 0,
        });

        await expect(sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            messageKind,
            assetUrl,
            assetName: "image.png",
            assetMimeType,
            idempotencyKey: "invalid-attachment-1",
        })).rejects.toMatchObject({
            status: 400,
            body: expect.objectContaining({
                errorCode: "invalid_attachment",
            }),
        });

        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("creator_messages/"))).toHaveLength(0);
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(0);
    });

    it("preserves existing read-state fields in the immediate returned thread", async () => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 10,
            gumDropsPurchasedBalance: 10,
            gumDropsRewardBalance: 0,
        });
        mockState.documents.set(`creator_message_threads/${threadId}`, {
            id: threadId,
            creatorId,
            userId,
            creatorDisplayName: "Creator One",
            creatorUsername: "creatorone",
            creatorPhotoURL: null,
            userDisplayName: "Fan One",
            userUsername: "fanone",
            userPhotoURL: null,
            lastMessageAt: 20,
            lastMessagePreview: "older",
            messageCount: 2,
            lastMessageSenderRole: "creator",
            lastReadByUserAt: 20,
            lastReadByCreatorAt: 18,
            unreadCountForUser: 0,
            unreadCountForCreator: 0,
            subscriberChatFree: false,
        });

        const result = await sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            text: "fresh ping",
            messageKind: "text",
        });

        expect(result.thread.readAt).toBeGreaterThanOrEqual(20);
        expect(result.thread.counterpartReadAt).toBe(18);
        expect(result.thread.lastMessagePreview).toBe("fresh ping");
    });

    it("returns structured insufficient-funds errors for purchased-only sends", async () => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 6,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 6,
        });

        await expect(sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            text: "can I message you?",
            messageKind: "text",
        })).rejects.toMatchObject({
            status: 409,
        });

        try {
            await sendChatMessageForViewer({
                callerUid: userId,
                callerEmail: "fan@example.com",
                callerRole: "user",
                threadId,
                text: "can I message you?",
                messageKind: "text",
            });
        } catch (error) {
            const chatError = error as ChatClientError;
            const body = chatError.body as ChatInsufficientFundsPayload;
            expect(body.errorCode).toBe("insufficient_paid_gumdrops");
            expect(body.requiredPriceGd).toBe(1);
            expect(body.purchasedBalanceGd).toBe(0);
            expect(body.paidGdShortfall).toBe(1);
        }
    });

    it("keeps successful sends successful when post-write tracking fails", async () => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 10,
            gumDropsPurchasedBalance: 10,
            gumDropsRewardBalance: 0,
        });
        mockState.trackServerEvent
            .mockRejectedValueOnce(new Error("analytics unavailable"))
            .mockResolvedValueOnce(undefined);

        const result = await sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            text: "still send it",
            messageKind: "text",
        });

        expect(result.message.text).toBe("still send it");
        expect(result.warnings).toEqual([{
            code: "post_send_tracking_failure",
            detail: "analytics unavailable",
        }]);
        expect(mockState.recordRouteWarning).toHaveBeenCalledWith(
            "chat/messages",
            "Chat send post-write tracking degraded",
            expect.any(Error),
            expect.any(Object),
        );
    });
});
