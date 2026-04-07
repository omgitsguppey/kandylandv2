import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SeedDoc = {
    id: string;
    data: Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, SeedDoc[]>();
    const documents = new Map<string, Record<string, unknown>>();

    function buildQuery(name: string, filters: Array<{ field: string; value: unknown }> = []) {
        return {
            where(field: string, _operator: string, value: unknown) {
                return buildQuery(name, [...filters, { field, value }]);
            },
            doc(id: string) {
                return {
                    id,
                    async get() {
                        return {
                            id,
                            exists: documents.has(`${name}/${id}`),
                            data: () => documents.get(`${name}/${id}`),
                        };
                    },
                };
            },
            async get() {
                const docs = (collections.get(name) ?? [])
                    .filter((entry) => filters.every((filter) => entry.data[filter.field] === filter.value))
                    .map((entry) => ({
                        id: entry.id,
                        data: () => entry.data,
                    }));

                return {
                    docs,
                    empty: docs.length === 0,
                    size: docs.length,
                };
            },
        };
    }

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        adminDb: {
            collection(name: string) {
                return buildQuery(name);
            },
        },
        collections,
        documents,
        reset() {
            collections.clear();
            documents.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    STANDARD: {},
}));
vi.mock("@/lib/creator-experiences", () => ({
    CREATOR_COLLECTIONS: {
        messages: "creator_messages",
        messageThreads: "creator_message_threads",
    },
    buildCreatorThreadId: (creatorId: string, userId: string) => `${creatorId}__${userId}`,
    isCreatorRole: (role: unknown) => role === "creator" || role === "admin",
    normalizeMessageKind: (kind: unknown) => kind,
}));
vi.mock("@/lib/server/creator-experiences", () => ({
    buildCreatorAccrual: vi.fn(),
    buildSourceAwareBalancePatch: vi.fn(),
    calculateMessagePriceGd: vi.fn(),
    readSourceAwareBalance: vi.fn(),
    spendCreatorExperienceGumdrops: vi.fn(),
}));
vi.mock("@/lib/server/gumdrop-ledger", () => ({
    buildCompletedGumdropTransaction: vi.fn(),
}));
vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: vi.fn(),
}));

import { GET } from "@/app/api/creator/messages/route";

describe("GET /api/creator/messages", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("blocks thread reads for callers who do not own the thread", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_2" });
        mockState.documents.set("users/fan_2", { role: "user" });
        mockState.documents.set("creator_message_threads/thread_1", {
            creatorId: "creator_1",
            userId: "fan_1",
        });
        mockState.collections.set("creator_messages", [
            { id: "message_1", data: { threadId: "thread_1", createdAt: 10, text: "hello" } },
        ]);

        const response = await GET(new NextRequest("http://localhost/api/creator/messages?threadId=thread_1"));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Forbidden");
    });

    it("returns messages for the thread participant", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.documents.set("users/fan_1", { role: "user" });
        mockState.documents.set("creator_message_threads/thread_1", {
            creatorId: "creator_1",
            userId: "fan_1",
        });
        mockState.collections.set("creator_messages", [
            { id: "message_1", data: { threadId: "thread_1", createdAt: 10, text: "hello" } },
        ]);

        const response = await GET(new NextRequest("http://localhost/api/creator/messages?threadId=thread_1"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.thread).toMatchObject({ id: "thread_1", userId: "fan_1" });
        expect(body.messages).toHaveLength(1);
    });
});
