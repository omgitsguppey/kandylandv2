import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDoc = Record<string, unknown>;

const mockState = vi.hoisted(() => {
    const documents = new Map<string, StoredDoc>();
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

    return {
        adminDb,
        documents,
        trackServerEvent: vi.fn().mockResolvedValue(undefined),
        recordRouteWarning: vi.fn(),
        recordServerDiagnostic: vi.fn().mockResolvedValue(undefined),
        reset() {
            documents.clear();
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

    it("allows text sends for legacy purchased-only balances", async () => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 10,
        });

        const result = await sendChatMessageForViewer({
            callerUid: userId,
            callerEmail: "fan@example.com",
            callerRole: "user",
            threadId,
            text: "hello there",
            messageKind: "text",
        });

        const participant = mockState.documents.get(`users/${userId}`);

        expect(result.costGd).toBe(1);
        expect(result.message).toMatchObject({
            text: "hello there",
            costGd: 1,
            messageKind: "text",
        });
        expect(result.pricing).toMatchObject({
            purchasedBalanceGd: 9,
            textPriceGd: 1,
        });
        expect(participant).toMatchObject({
            gumDropsBalance: 9,
            gumDropsPurchasedBalance: 9,
            gumDropsRewardBalance: 0,
        });
        expect(mockState.documents.get(`creator_message_threads/${threadId}`)).toMatchObject({
            lastMessagePreview: "hello there",
            unreadCountForCreator: 1,
            unreadCountForUser: 0,
        });
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

    it("preserves existing read-state fields in the immediate returned thread", async () => {
        mockState.documents.set(`users/${userId}`, {
            uid: userId,
            role: "user",
            displayName: "Fan One",
            username: "fanone",
            gumDropsBalance: 10,
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
