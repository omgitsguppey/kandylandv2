import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDoc = Record<string, unknown>;

const mockState = vi.hoisted(() => {
    const documents = new Map<string, StoredDoc>();

    const readDoc = (path: string) => documents.get(path);
    const queryCollection = (collectionName: string, field: string, value: string) => {
        return Array.from(documents.entries())
            .filter(([path, data]) => path.startsWith(`${collectionName}/`) && data[field] === value)
            .map(([path, data]) => ({
                id: path.slice(`${collectionName}/`.length),
                data: () => data,
            }));
    };

    const buildDocRef = (collectionName: string, id: string) => ({
        id,
        path: `${collectionName}/${id}`,
        async get() {
            const path = `${collectionName}/${id}`;
            return {
                id,
                exists: documents.has(path),
                data: () => readDoc(path),
            };
        },
    });

    const adminDb = {
        collection(name: string) {
            return {
                doc(id: string) {
                    return buildDocRef(name, id);
                },
                where(field: string, _operator: string, value: string) {
                    return {
                        async get() {
                            return {
                                docs: queryCollection(name, field, value),
                            };
                        },
                    };
                },
            };
        },
        async getAll(...refs: Array<{ path: string; id: string }>) {
            return refs.map((ref) => ({
                id: ref.id,
                exists: documents.has(ref.path),
                data: () => readDoc(ref.path),
            }));
        },
    };

    return {
        adminDb,
        documents,
        reset() {
            documents.clear();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

import { buildChatThreadId } from "@/lib/chat";
import { getChatThreadDetailForViewer, listChatThreadsForViewer } from "@/lib/server/chat";

describe("server chat helper", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.documents.set("users/fan_1", {
            uid: "fan_1",
            role: "user",
            displayName: "Fan One",
            username: "fan-one",
        });
    });

    it("does not seed a new chat thread for a non-creator target", async () => {
        mockState.documents.set("users/not_creator", {
            uid: "not_creator",
            role: "user",
            displayName: "Not Creator",
            username: "not-creator",
        });

        const result = await listChatThreadsForViewer({
            viewerUid: "fan_1",
            viewerRole: "user",
            creatorId: "not_creator",
        });

        expect(result.selectedThreadId).toBeNull();
        expect(result.threads).toHaveLength(0);
    });

    it("does not expose seeded thread detail when the creator target is unavailable", async () => {
        mockState.documents.set("users/creator_blocked", {
            uid: "creator_blocked",
            role: "creator",
            status: "active",
            displayName: "Blocked Creator",
            username: "blocked-creator",
            creatorSettings: {
                messagingEnabled: false,
            },
        });

        const detail = await getChatThreadDetailForViewer({
            viewerUid: "fan_1",
            callerRole: "user",
            threadId: buildChatThreadId("creator_blocked", "fan_1"),
        });

        expect(detail).toBeNull();
    });

    it("seeds a chat thread for an eligible creator target", async () => {
        mockState.documents.set("users/creator_live", {
            uid: "creator_live",
            role: "creator",
            status: "active",
            displayName: "Live Creator",
            username: "live-creator",
        });

        const result = await listChatThreadsForViewer({
            viewerUid: "fan_1",
            viewerRole: "user",
            creatorId: "creator_live",
        });

        expect(result.selectedThreadId).toBe(buildChatThreadId("creator_live", "fan_1"));
        expect(result.threads).toHaveLength(1);
        expect(result.threads[0]).toMatchObject({
            id: buildChatThreadId("creator_live", "fan_1"),
            creatorId: "creator_live",
            userId: "fan_1",
        });
    });

    it("seeds a chat thread for an approved legacy creator whose role has not been upgraded yet", async () => {
        mockState.documents.set("users/creator_approved", {
            uid: "creator_approved",
            role: "user",
            status: "active",
            displayName: "Legacy Creator",
            username: "legacy-creator",
            creatorApplication: {
                approvalStatus: "creator_approved",
            },
        });

        const result = await listChatThreadsForViewer({
            viewerUid: "fan_1",
            viewerRole: "user",
            creatorId: "creator_approved",
        });

        expect(result.selectedThreadId).toBe(buildChatThreadId("creator_approved", "fan_1"));
        expect(result.threads).toHaveLength(1);
    });
});
