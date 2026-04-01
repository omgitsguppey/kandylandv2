import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDocRef = {
    path: string;
    collection: (name: string) => MockCollectionRef;
};

type MockCollectionRef = {
    path: string;
    doc: (id?: string) => MockDocRef;
};

const mockState = vi.hoisted(() => {
    let autoId = 0;
    const documents = new Map<string, { exists?: boolean; data?: Record<string, unknown> }>();
    const operations: Array<{ type: "set" | "create"; path: string }> = [];

    const makeSnapshot = (path: string) => {
        const entry = documents.get(path);
        return {
            exists: entry?.exists === true,
            data: () => entry?.data,
        };
    };

    const buildCollectionRef = (path: string): MockCollectionRef => ({
        path,
        doc(id?: string) {
            const resolvedId = id ?? `auto_${++autoId}`;
            return buildDocRef(`${path}/${resolvedId}`);
        },
    });

    const buildDocRef = (path: string): MockDocRef => ({
        path,
        collection(name: string) {
            return buildCollectionRef(`${path}/${name}`);
        },
    });

    const adminDb = {
        collection(name: string) {
            return buildCollectionRef(name);
        },
        runTransaction: vi.fn(async (callback: (transaction: {
            getAll: (...refs: Array<{ path: string }>) => Promise<Array<{ exists: boolean; data: () => Record<string, unknown> | undefined }>>;
            set: (ref: { path: string }, data: unknown, options?: unknown) => void;
            create: (ref: { path: string }, data: unknown) => void;
        }) => Promise<unknown>) => {
            let hasWritten = false;

            const transaction = {
                async getAll(...refs: Array<{ path: string }>) {
                    if (hasWritten) {
                        throw new Error("Firestore transactions require all reads before writes.");
                    }

                    return refs.map((ref) => makeSnapshot(ref.path));
                },
                set(ref: { path: string }) {
                    hasWritten = true;
                    operations.push({ type: "set", path: ref.path });
                },
                create(ref: { path: string }) {
                    hasWritten = true;
                    operations.push({ type: "create", path: ref.path });
                },
            };

            return callback(transaction);
        }),
    };

    return {
        adminDb,
        documents,
        operations,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        touchUserRuntime: vi.fn(),
        buildCompletedGumdropTransaction: vi.fn((input: unknown) => input),
        buildOnboardingAnalyticsStorageKey: vi.fn((input: {
            eventName: string;
            stepId?: string;
            flowStartedAtMs?: number;
            timestamp?: number;
        }) => `${input.eventName}:${input.stepId ?? "flow"}:${input.flowStartedAtMs || input.timestamp || 0}`),
        buildOnboardingAnalyticsEventFact: vi.fn((input: unknown) => input),
        sanitizeOnboardingStepMetrics: vi.fn((value: unknown) => Array.isArray(value) ? value : []),
        toOnboardingNumber(value: unknown) {
            return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
        },
        reset() {
            autoId = 0;
            documents.clear();
            operations.length = 0;
            adminDb.runTransaction.mockClear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.touchUserRuntime.mockReset();
            this.buildCompletedGumdropTransaction.mockClear();
            this.buildOnboardingAnalyticsStorageKey.mockClear();
            this.buildOnboardingAnalyticsEventFact.mockClear();
            this.sanitizeOnboardingStepMetrics.mockClear();
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
    STRICT: {},
}));

vi.mock("@/lib/server/user-runtime", () => ({
    touchUserRuntime: mockState.touchUserRuntime,
}));

vi.mock("@/lib/server/onboarding-analytics", () => ({
    buildOnboardingAnalyticsEventFact: mockState.buildOnboardingAnalyticsEventFact,
    buildOnboardingAnalyticsStorageKey: mockState.buildOnboardingAnalyticsStorageKey,
    sanitizeOnboardingStepMetrics: mockState.sanitizeOnboardingStepMetrics,
    toOnboardingNumber: mockState.toOnboardingNumber,
}));

vi.mock("@/lib/server/gumdrop-ledger", () => ({
    buildCompletedGumdropTransaction: mockState.buildCompletedGumdropTransaction,
}));

import { POST } from "@/app/api/user/complete-onboarding/route";

describe("POST /api/user/complete-onboarding", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "user_123",
            email: "fan@example.com",
        });
        mockState.touchUserRuntime.mockResolvedValue(undefined);
        mockState.handleApiError.mockImplementation((error: unknown) => {
            throw error;
        });

        mockState.documents.set("users/user_123", {
            exists: true,
            data: {
                username: "fan123",
                gumDropsBalance: 50,
                gumDropsPurchasedBalance: 0,
                gumDropsRewardBalance: 50,
                onboardingCompleted: false,
            },
        });
        mockState.documents.set("users/user_123/profile/default", {
            exists: false,
        });
        mockState.documents.set("users/user_123/economy/balance", {
            exists: false,
        });
    });

    it("completes onboarding without triggering a Firestore read-after-write transaction error", async () => {
        const request = new NextRequest("http://localhost/api/user/complete-onboarding", {
            method: "POST",
            body: JSON.stringify({
                startedAtMs: 1_000,
                durationMs: 4_000,
                selectedFlavor: "Sweet",
                pagePath: "/dashboard",
                viewportWidth: 390,
                viewportHeight: 844,
                isMobileViewport: true,
                stepMetrics: [
                    {
                        stepId: "complete",
                        stepIndex: 6,
                        stepTitle: "You're ready",
                        stepPath: "/dashboard",
                        startedAtMs: 4_500,
                        completedAtMs: 5_000,
                        durationMs: 500,
                        completionReason: "finished",
                    },
                ],
            }),
            headers: {
                "content-type": "application/json",
            },
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            rewardAmount: 50,
            newBalance: 100,
        });
        expect(mockState.handleApiError).not.toHaveBeenCalled();
        expect(mockState.touchUserRuntime).toHaveBeenCalledWith("user_123", {
            activity: true,
            profile: true,
        }, expect.any(Number));
        expect(mockState.operations.some((operation) => operation.path === "users/user_123")).toBe(true);
        expect(
            mockState.operations.some((operation) => operation.type === "create" && operation.path.startsWith("analytics_event_facts/")),
        ).toBe(true);
    });

    it("still returns success when user runtime syncing fails after onboarding is committed", async () => {
        mockState.touchUserRuntime.mockRejectedValueOnce(new Error("runtime sync failed"));

        const request = new NextRequest("http://localhost/api/user/complete-onboarding", {
            method: "POST",
            body: JSON.stringify({
                startedAtMs: 1_000,
                durationMs: 4_000,
                selectedFlavor: "Sweet",
                pagePath: "/dashboard",
                stepMetrics: [
                    {
                        stepId: "complete",
                        stepIndex: 6,
                        stepTitle: "You're ready",
                        stepPath: "/dashboard",
                        startedAtMs: 4_500,
                        completedAtMs: 5_000,
                        durationMs: 500,
                        completionReason: "finished",
                    },
                ],
            }),
            headers: {
                "content-type": "application/json",
            },
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            rewardAmount: 50,
            newBalance: 100,
        });
        expect(mockState.handleApiError).not.toHaveBeenCalled();
        expect(mockState.touchUserRuntime).toHaveBeenCalledTimes(1);
    });
});
