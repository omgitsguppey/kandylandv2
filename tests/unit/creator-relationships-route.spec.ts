import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SeedDoc = {
    id: string;
    data: Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, SeedDoc[]>();

    function buildQuery(name: string, filters: Array<{ field: string; value: unknown }> = []) {
        return {
            where(field: string, _operator: string, value: unknown) {
                return buildQuery(name, [...filters, { field, value }]);
            },
            select(..._fields: string[]) {
                return buildQuery(name, filters);
            },
            doc(id: string) {
                return {
                    id,
                    async get() {
                        const entry = (collections.get(name) ?? []).find((doc) => doc.id === id);
                        return {
                            id,
                            exists: Boolean(entry),
                            data: () => entry?.data,
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
        collections,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        adminDb: {
            collection(name: string) {
                return buildQuery(name);
            },
        },
        reset() {
            collections.clear();
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
vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: vi.fn(async () => undefined),
}));

import { GET } from "@/app/api/creator/relationships/route";

describe("GET /api/creator/relationships", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("returns approved creator applicants in recommended creators even when their role is still user", async () => {
        const now = Date.now();
        mockState.collections.set("creator_relationships", []);
        mockState.collections.set("creator_ops", [
            {
                id: "creator_pending_role",
                data: {
                    summary: {
                        followerCount: 42,
                    },
                },
            },
        ]);
        mockState.collections.set("users", [
            {
                id: "creator_pending_role",
                data: {
                    role: "user",
                    status: "active",
                    displayName: "Jessi Ray",
                    username: "jessiray",
                    bio: "Dessert creator",
                    isVerified: true,
                    creatorApplication: {
                        creatorDisplayName: "Jessi Ray",
                        approvalStatus: "creator_approved",
                    },
                },
            },
        ]);
        mockState.collections.set("drops", [
            {
                id: "drop_1",
                data: {
                    creatorId: "creator_pending_role",
                    title: "Apple Pie",
                    description: "Test drop",
                    imageUrl: "https://example.com/apple.png",
                    contentUrl: "https://example.com/content.zip",
                    unlockCost: 100,
                    validFrom: now - 10_000,
                    validUntil: now + 60_000,
                    status: "active",
                    approvalStatus: "approved",
                    totalUnlocks: 12,
                },
            },
        ]);

        const response = await GET(new NextRequest("http://localhost/api/creator/relationships"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.followedCreators).toEqual([]);
        expect(body.recommendedCreators).toHaveLength(1);
        expect(body.recommendedCreators[0]).toMatchObject({
            uid: "creator_pending_role",
            displayName: "Jessi Ray",
            username: "jessiray",
            followerCount: 0,
            isVerified: true,
        });
    });

    it("hydrates spotlight follower counts from live relationships instead of stale creator ops summary", async () => {
        const now = Date.now();
        mockState.collections.set("creator_relationships", [
            {
                id: "fan_1__creator_live_count",
                data: {
                    userId: "fan_1",
                    creatorId: "creator_live_count",
                    following: true,
                },
            },
            {
                id: "fan_2__creator_live_count",
                data: {
                    userId: "fan_2",
                    creatorId: "creator_live_count",
                    following: true,
                },
            },
        ]);
        mockState.collections.set("creator_ops", [
            {
                id: "creator_live_count",
                data: {
                    summary: {
                        followerCount: 0,
                    },
                },
            },
        ]);
        mockState.collections.set("users", [
            {
                id: "creator_live_count",
                data: {
                    role: "creator",
                    status: "active",
                    displayName: "Jessi Ray",
                    username: "jessiray",
                    isVerified: true,
                },
            },
        ]);
        mockState.collections.set("drops", [
            {
                id: "drop_1",
                data: {
                    creatorId: "creator_live_count",
                    title: "Apple Pie",
                    description: "Test drop",
                    imageUrl: "https://example.com/apple.png",
                    contentUrl: "https://example.com/content.zip",
                    unlockCost: 100,
                    validFrom: now - 10_000,
                    validUntil: now + 60_000,
                    status: "active",
                    approvalStatus: "approved",
                    totalUnlocks: 12,
                },
            },
        ]);

        const response = await GET(new NextRequest("http://localhost/api/creator/relationships"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.followedCreators).toHaveLength(1);
        expect(body.followedCreators[0]).toMatchObject({
            uid: "creator_live_count",
            followerCount: 2,
            following: true,
        });
    });
});
