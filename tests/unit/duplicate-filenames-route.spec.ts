import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDropDoc = {
    id: string;
    data: Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const drops: MockDropDoc[] = [];
    const whereCalls: Array<{ field: string; operator: string; value: unknown }> = [];

    const buildSnapshot = (docs: MockDropDoc[]) => ({
        docs: docs.map((doc) => ({
            id: doc.id,
            data: () => doc.data,
        })),
    });

    return {
        drops,
        whereCalls,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        adminDb: {
            collection(name: string) {
                if (name !== "drops") {
                    throw new Error(`Unexpected collection: ${name}`);
                }

                return {
                    where(field: string, operator: string, value: unknown) {
                        whereCalls.push({ field, operator, value });
                        return {
                            limit() {
                                return this;
                            },
                            async get() {
                                return buildSnapshot(drops.filter((doc) => doc.data.creatorId === value));
                            },
                        };
                    },
                    limit() {
                        return this;
                    },
                    async get() {
                        return buildSnapshot(drops);
                    },
                };
            },
        },
        reset() {
            drops.length = 0;
            whereCalls.length = 0;
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    STANDARD: {},
}));

import { POST } from "@/app/api/drops/duplicate-filenames/route";

describe("POST /api/drops/duplicate-filenames", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
            error: error.message,
        }, { status: 500 }));
    });

    it("scopes duplicate checks to the caller's own creator drops", async () => {
        mockState.drops.push(
            {
                id: "drop_owned",
                data: {
                    creatorId: "creator_1",
                    title: "Owned Drop",
                    coverFileName: "teaser.mp4",
                },
            },
            {
                id: "drop_other",
                data: {
                    creatorId: "creator_2",
                    title: "Other Drop",
                    coverFileName: "teaser.mp4",
                },
            },
        );
        mockState.guardApiRequest.mockResolvedValue({
            uid: "creator_1",
            email: "creator@example.com",
            isAdmin: false,
        });

        const request = new NextRequest("http://localhost/api/drops/duplicate-filenames", {
            method: "POST",
            body: JSON.stringify({
                fileNames: ["teaser.mp4"],
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.whereCalls).toEqual([
            {
                field: "creatorId",
                operator: "==",
                value: "creator_1",
            },
        ]);
        expect(payload.duplicates).toEqual([
            expect.objectContaining({
                dropId: "drop_owned",
            }),
        ]);
    });

    it("allows admins to query without creator scoping", async () => {
        mockState.drops.push(
            {
                id: "drop_owned",
                data: {
                    creatorId: "creator_1",
                    title: "Owned Drop",
                    coverFileName: "teaser.mp4",
                },
            },
            {
                id: "drop_other",
                data: {
                    creatorId: "creator_2",
                    title: "Other Drop",
                    coverFileName: "teaser.mp4",
                },
            },
        );
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            email: "admin@example.com",
            isAdmin: true,
        });

        const request = new NextRequest("http://localhost/api/drops/duplicate-filenames", {
            method: "POST",
            body: JSON.stringify({
                fileNames: ["teaser.mp4"],
            }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mockState.whereCalls).toEqual([]);
        expect(payload.duplicates).toHaveLength(2);
    });

    it("rejects oversized JSON before querying Drops", async () => {
        mockState.guardApiRequest.mockResolvedValue({
            uid: "creator_1",
            email: "creator@example.com",
            isAdmin: false,
        });
        const request = new NextRequest("http://localhost/api/drops/duplicate-filenames", {
            method: "POST",
            headers: { "content-length": "64001" },
            body: "{}",
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(413);
        expect(payload).toMatchObject({
            success: false,
            errorCode: "payload_too_large",
            retryable: false,
        });
        expect(mockState.whereCalls).toEqual([]);
    });

    it("classifies malformed JSON before querying Drops", async () => {
        mockState.guardApiRequest.mockResolvedValue({
            uid: "creator_1",
            email: "creator@example.com",
            isAdmin: false,
        });
        const request = new NextRequest("http://localhost/api/drops/duplicate-filenames", {
            method: "POST",
            body: "{not-json",
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            success: false,
            errorCode: "invalid_json",
            retryable: false,
        });
        expect(mockState.whereCalls).toEqual([]);
    });
});
