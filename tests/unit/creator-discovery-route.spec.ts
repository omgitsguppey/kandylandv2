import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SeedDoc = {
    id: string;
    data: Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, SeedDoc[]>();

    return {
        collections,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        recordRouteRuntimeSample: vi.fn(),
        getErrorMessage: vi.fn(),
        adminDb: {
            collection(name: string) {
                return {
                    async get() {
                        const docs = (collections.get(name) ?? []).map((entry) => ({
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
            },
        },
        reset() {
            collections.clear();
            this.guardApiRequest.mockReset();
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
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    RELAXED: {},
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    getErrorMessage: mockState.getErrorMessage,
}));

import { GET } from "@/app/api/creator/discovery/route";

describe("GET /api/creator/discovery", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("surfaces approved creator applicants in discovery even before role activation catches up", async () => {
        const now = Date.now();
        mockState.collections.set("users", [
            {
                id: "creator_pending_role",
                data: {
                    role: "user",
                    status: "active",
                    displayName: "Jessi Ray",
                    username: "jessiray",
                    creatorApplication: {
                        creatorDisplayName: "Jessi Ray",
                        approvalStatus: "creator_approved",
                    },
                },
            },
            {
                id: "plain_user",
                data: {
                    role: "user",
                    status: "active",
                    displayName: "Plain User",
                    username: "plainuser",
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
        mockState.collections.set("creator_relationships", []);

        const response = await GET(new NextRequest("http://localhost/api/creator/discovery?surface=dashboard"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.creators).toHaveLength(1);
        expect(body.creators[0]).toMatchObject({
            uid: "creator_pending_role",
            displayName: "Jessi Ray",
            username: "jessiray",
            activeDropCount: 1,
        });
    });
});
