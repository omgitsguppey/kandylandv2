import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const userDocData: Record<string, unknown> = {};
    const transactionUpdate = vi.fn();
    const transactionSet = vi.fn();
    const touchUserRuntime = vi.fn();
    const guardApiRequest = vi.fn();
    const handleApiError = vi.fn();
    const userRef = { path: "users/fan_1" };
    const transactionRef = { id: "tx_admin_1", path: "transactions/tx_admin_1" };

    return {
        userDocData,
        transactionUpdate,
        transactionSet,
        touchUserRuntime,
        guardApiRequest,
        handleApiError,
        userRef,
        transactionRef,
        adminDb: {
            collection(name: string) {
                if (name === "users") {
                    return {
                        doc(id: string) {
                            if (id !== "fan_1") {
                                throw new Error(`Unexpected user id: ${id}`);
                            }
                            return userRef;
                        },
                    };
                }

                if (name === "transactions") {
                    return {
                        doc() {
                            return transactionRef;
                        },
                    };
                }

                throw new Error(`Unexpected collection: ${name}`);
            },
            async runTransaction<T>(callback: (transaction: {
                get: (ref: unknown) => Promise<{ exists: boolean; data: () => Record<string, unknown> }>;
                update: (ref: unknown, patch: Record<string, unknown>) => void;
                set: (ref: unknown, data: Record<string, unknown>) => void;
            }) => Promise<T>) {
                return callback({
                    get: async (ref: unknown) => {
                        if (ref !== userRef) {
                            throw new Error("Unexpected ref in transaction.get");
                        }

                        return {
                            exists: true,
                            data: () => ({ ...userDocData }),
                        };
                    },
                    update: (ref: unknown, patch: Record<string, unknown>) => {
                        transactionUpdate(ref, patch);
                    },
                    set: (ref: unknown, data: Record<string, unknown>) => {
                        transactionSet(ref, data);
                    },
                });
            },
        },
        reset() {
            Object.keys(userDocData).forEach((key) => {
                delete userDocData[key];
            });
            transactionUpdate.mockReset();
            transactionSet.mockReset();
            touchUserRuntime.mockReset();
            guardApiRequest.mockReset();
            handleApiError.mockReset();
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
    ADMIN: {},
}));

vi.mock("@/lib/server/user-runtime", () => ({
    touchUserRuntime: mockState.touchUserRuntime,
}));

import { POST } from "@/app/api/admin/balance/route";

describe("POST /api/admin/balance", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "admin_1",
            email: "owner@example.com",
            role: "admin",
        });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));

        Object.assign(mockState.userDocData, {
            gumDropsBalance: 50,
            gumDropsPurchasedBalance: 50,
            gumDropsRewardBalance: 0,
        });
    });

    it("credits positive admin adjustments into reward balance instead of purchased balance", async () => {
        const request = new NextRequest("http://localhost/api/admin/balance", {
            method: "POST",
            body: JSON.stringify({
                userId: "fan_1",
                amount: 25,
                reason: "goodwill",
            }),
            headers: {
                "content-type": "application/json",
            },
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual({
            success: true,
            balanceAfter: 75,
        });
        expect(mockState.transactionUpdate).toHaveBeenCalledWith(
            mockState.userRef,
            expect.objectContaining({
                gumDropsBalance: 75,
                gumDropsPurchasedBalance: 50,
                gumDropsRewardBalance: 25,
            }),
        );
        expect(mockState.touchUserRuntime).toHaveBeenCalledWith("fan_1", {
            activity: true,
            profile: true,
        });
    });
});
