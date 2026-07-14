import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockRef = { id: string; path: string };

const mockState = vi.hoisted(() => {
    class MockAuthError extends Error {
        status: number;
        resource?: string;

        constructor(message: string, status: number, resource?: string) {
            super(message);
            this.status = status;
            this.resource = resource;
        }
    }

    const docs = new Map<string, Record<string, unknown>>();
    let generatedId = 0;
    const transactionGet = vi.fn(async (ref: MockRef) => ({
        exists: docs.has(ref.path),
        id: ref.id,
        data: () => docs.get(ref.path),
    }));
    const transactionSet = vi.fn((ref: MockRef, data: Record<string, unknown>) => {
        docs.set(ref.path, data);
    });
    const transactionUpdate = vi.fn((ref: MockRef, data: Record<string, unknown>) => {
        docs.set(ref.path, {
            ...(docs.get(ref.path) ?? {}),
            ...data,
        });
    });

    const adminDb = {
        collection: vi.fn((collectionName: string) => ({
            doc: vi.fn((id?: string) => {
                const docId = id ?? `generated_${++generatedId}`;
                return { id: docId, path: `${collectionName}/${docId}` };
            }),
        })),
        runTransaction: vi.fn(async (callback: (transaction: {
            get: typeof transactionGet;
            set: typeof transactionSet;
            update: typeof transactionUpdate;
        }) => Promise<unknown>) => callback({
            get: transactionGet,
            set: transactionSet,
            update: transactionUpdate,
        })),
    };

    return {
        docs,
        adminDb,
        transactionGet,
        transactionSet,
        transactionUpdate,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        trackServerEvent: vi.fn(),
        touchUserRuntime: vi.fn(),
        buildCompletedGumdropTransaction: vi.fn((input: Record<string, unknown>) => ({
            ledger: true,
            ...input,
        })),
        MockAuthError,
        reset() {
            docs.clear();
            generatedId = 0;
            adminDb.collection.mockClear();
            adminDb.runTransaction.mockClear();
            transactionGet.mockClear();
            transactionSet.mockClear();
            transactionUpdate.mockClear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.trackServerEvent.mockReset();
            this.touchUserRuntime.mockReset();
            this.buildCompletedGumdropTransaction.mockClear();
        },
    };
});

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    AuthError: mockState.MockAuthError,
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/gumdrop-ledger", () => ({
    buildCompletedGumdropTransaction: mockState.buildCompletedGumdropTransaction,
}));

vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/user-runtime", () => ({
    touchUserRuntime: mockState.touchUserRuntime,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
    withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("firebase-admin/firestore", () => ({
    FieldValue: {
        serverTimestamp: vi.fn(() => ({ op: "serverTimestamp" })),
    },
}));

import { POST } from "@/app/api/drops/feedback/route";

function feedbackRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost/api/drops/feedback", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

describe("POST /api/drops/feedback", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({ uid: "user_1", email: "fan@example.com" });
        mockState.handleApiError.mockImplementation((error: unknown) => {
            if (error instanceof mockState.MockAuthError) {
                return NextResponse.json({
                    error: error.message,
                    resource: error.resource ?? null,
                }, { status: error.status });
            }

            return NextResponse.json({
                error: error instanceof Error ? error.message : String(error),
            }, { status: 500 });
        });
        mockState.docs.set("users/user_1", {
            gumDropsBalance: 20,
            gumDropsPurchasedBalance: 20,
            gumDropsRewardBalance: 0,
            unlockedContent: ["drop_1"],
            unlockedContentTimestamps: { drop_1: 123 },
        });
        mockState.docs.set("drops/drop_1", {
            creatorId: "creator_1",
            title: "Drop One",
        });
    });

    it("credits one verified viewer feedback reward and mirrors telemetry", async () => {
        const response = await POST(feedbackRequest({ dropId: "drop_1", positive: true }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual(expect.objectContaining({
            success: true,
            alreadySubmitted: false,
            rewardCredited: true,
            reward: 10,
            newBalance: 30,
            purchasedBalance: 20,
            rewardBalance: 10,
        }));
        expect(mockState.transactionSet).toHaveBeenCalledWith(expect.objectContaining({
            path: "feedbacks/user_1_drop_1",
        }), expect.objectContaining({
            userId: "user_1",
            dropId: "drop_1",
            positive: true,
            rewarded: 10,
            feedbackSource: "viewer",
            verifiedUnlockedDrop: true,
        }));
        expect(mockState.transactionUpdate).toHaveBeenCalledWith(expect.objectContaining({
            path: "users/user_1",
        }), expect.objectContaining({
            gumDropsBalance: 30,
            gumDropsPurchasedBalance: 20,
            gumDropsRewardBalance: 10,
        }));
        expect(mockState.buildCompletedGumdropTransaction).toHaveBeenCalledWith(expect.objectContaining({
            userId: "user_1",
            type: "daily_reward",
            amount: 10,
            description: "Viewer Feedback Reward",
            relatedDropId: "drop_1",
            balanceBefore: 20,
            balanceAfter: 30,
            extra: expect.objectContaining({
                rewardContext: "viewer_feedback",
                feedbackPositive: true,
            }),
        }));
        expect(mockState.trackServerEvent).toHaveBeenCalledWith("feedback_submitted", expect.objectContaining({
            drop_id: "drop_1",
            positive: true,
            reward_amount: 10,
            reward_credited: true,
            feedback_source: "viewer",
        }), "user_1");
        expect(mockState.touchUserRuntime).toHaveBeenCalledWith("user_1", { activity: true, profile: true });
    });

    it("treats duplicate feedback as already saved without issuing a second reward", async () => {
        mockState.docs.set("feedbacks/user_1_drop_1", {
            userId: "user_1",
            dropId: "drop_1",
            positive: false,
            rewarded: 10,
        });

        const response = await POST(feedbackRequest({ dropId: "drop_1", positive: true }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual(expect.objectContaining({
            success: true,
            alreadySubmitted: true,
            rewardCredited: false,
            reward: 0,
            positive: false,
            newBalance: 20,
        }));
        expect(mockState.transactionUpdate).not.toHaveBeenCalled();
        expect(mockState.transactionSet).not.toHaveBeenCalled();
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
        expect(mockState.touchUserRuntime).not.toHaveBeenCalled();
    });

    it("rejects feedback for a Drop the caller has not unwrapped", async () => {
        mockState.docs.set("users/user_1", {
            gumDropsBalance: 20,
            gumDropsPurchasedBalance: 20,
            gumDropsRewardBalance: 0,
            unlockedContent: [],
            unlockedContentTimestamps: {},
        });

        const response = await POST(feedbackRequest({ dropId: "drop_1", positive: true }));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe("Feedback is available after this Drop is unwrapped");
        expect(mockState.transactionSet).not.toHaveBeenCalled();
        expect(mockState.transactionUpdate).not.toHaveBeenCalled();
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
    });

    it("rejects oversized JSON before feedback reward mutation", async () => {
        const request = new NextRequest("http://localhost/api/drops/feedback", {
            method: "POST",
            headers: { "content-length": "16385" },
            body: "{}",
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(413);
        expect(body).toMatchObject({
            success: false,
            errorCode: "payload_too_large",
            retryable: false,
        });
        expect(mockState.adminDb.runTransaction).not.toHaveBeenCalled();
        expect(mockState.transactionSet).not.toHaveBeenCalled();
        expect(mockState.transactionUpdate).not.toHaveBeenCalled();
        expect(mockState.trackServerEvent).not.toHaveBeenCalled();
    });
});
