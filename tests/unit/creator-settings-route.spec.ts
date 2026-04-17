import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const userDocs = new Map<string, Record<string, unknown>>();
    const relationshipsOpsDocs = new Map<string, Record<string, unknown>>();
    const aggregateValues = new Map<string, Record<string, number>>();
    const countValues = new Map<string, number>();

    function buildQuery(name: string) {
        return {
            where() {
                return buildQuery(name);
            },
            aggregate() {
                return {
                    async get() {
                        return {
                            data: () => aggregateValues.get(name) ?? {},
                        };
                    },
                };
            },
            count() {
                return {
                    async get() {
                        return {
                            data: () => ({
                                count: countValues.get(name) ?? 0,
                            }),
                        };
                    },
                };
            },
        };
    }

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        sanitizeCreatorSettingsUpdate: vi.fn((value: Record<string, unknown>) => value),
        sanitizeCreatorRestrictionsUpdate: vi.fn((value: Record<string, unknown>) => value),
        buildCreatorUpdateMerge: vi.fn((value: Record<string, unknown>) => value),
        userDocs,
        relationshipsOpsDocs,
        aggregateValues,
        countValues,
        adminDb: {
            collection(name: string) {
                return {
                    doc(id: string) {
                        return {
                            async get() {
                                if (name === "users") {
                                    return {
                                        exists: userDocs.has(id),
                                        data: () => userDocs.get(id),
                                    };
                                }

                                if (name === "creator_relationships_ops") {
                                    return {
                                        exists: relationshipsOpsDocs.has(id),
                                        data: () => relationshipsOpsDocs.get(id),
                                    };
                                }

                                return {
                                    exists: false,
                                    data: () => undefined,
                                };
                            },
                            async update() {
                                return undefined;
                            },
                        };
                    },
                    where() {
                        return buildQuery(name);
                    },
                };
            },
        },
        reset() {
            userDocs.clear();
            relationshipsOpsDocs.clear();
            aggregateValues.clear();
            countValues.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.sanitizeCreatorSettingsUpdate.mockClear();
            this.sanitizeCreatorRestrictionsUpdate.mockClear();
            this.buildCreatorUpdateMerge.mockClear();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/firestore", () => ({
    AggregateField: {
        sum: vi.fn((field: string) => field),
    },
}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));
vi.mock("@/lib/server/auth", async () => {
    const actual = await vi.importActual<typeof import("@/lib/server/auth")>("@/lib/server/auth");
    return {
        ...actual,
        handleApiError: mockState.handleApiError,
    };
});
vi.mock("@/lib/server/rate-limit", () => ({
    STANDARD: {},
}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/creator-experiences", () => ({
    sanitizeCreatorSettingsUpdate: mockState.sanitizeCreatorSettingsUpdate,
    sanitizeCreatorRestrictionsUpdate: mockState.sanitizeCreatorRestrictionsUpdate,
    buildCreatorUpdateMerge: mockState.buildCreatorUpdateMerge,
}));

import { GET } from "@/app/api/creator/settings/route";

describe("GET /api/creator/settings", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "user_1",
            email: "creator@example.com",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, {
            status: error instanceof Error && typeof (error as { status?: unknown }).status === "number"
                ? (error as unknown as { status: number }).status
                : 500,
        }));
    });

    it("allows admin callers that the profile page treats as creator accounts", async () => {
        mockState.userDocs.set("user_1", {
            role: "admin",
            creatorSettings: {
                messagingEnabled: true,
            },
            profileViewsCount: 14,
        });
        mockState.relationshipsOpsDocs.set("user_1", {
            followerCount: 32,
        });
        mockState.aggregateValues.set("creator_ledger_accruals", {
            totalEarnings: 4500,
        });
        mockState.aggregateValues.set("creator_payout_requests", {
            totalPending: 900,
        });
        mockState.countValues.set("creator_subscriptions", 7);
        mockState.countValues.set("creator_custom_requests", 3);
        mockState.countValues.set("creator_call_bookings", 2);
        mockState.countValues.set("drops", 4);

        const response = await GET(new NextRequest("http://localhost/api/creator/settings"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.creatorSettings).toEqual({
            messagingEnabled: true,
        });
        expect(body.stats).toEqual({
            earningsGd: 4500,
            pendingCashoutGd: 900,
            followerCount: 32,
            profileViewsCount: 14,
            liveDropsCount: 4,
            activeSubscribers: 7,
            openRequests: 3,
            bookedCalls: 2,
        });
    });

    it("returns a 403 instead of a 500 for non-creator callers", async () => {
        mockState.userDocs.set("user_1", {
            role: "collector",
        });

        const response = await GET(new NextRequest("http://localhost/api/creator/settings"));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Creator access required");
        expect(mockState.handleApiError).toHaveBeenCalledTimes(1);
    });

    it("returns a 404 instead of a 500 when the creator profile is missing", async () => {
        const response = await GET(new NextRequest("http://localhost/api/creator/settings"));
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.error).toBe("Creator profile not found");
        expect(mockState.handleApiError).toHaveBeenCalledTimes(1);
    });
});
