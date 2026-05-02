import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type StoredDoc = Record<string, unknown>;

const mockState = vi.hoisted(() => {
    const documents = new Map<string, StoredDoc>();
    const transactionWrites: Array<{ path: string; data: StoredDoc }> = [];
    let autoId = 0;

    const buildDocSnapshot = (path: string) => ({
        exists: documents.has(path),
        data: () => documents.get(path),
    });

    const buildDocRef = (path: string) => ({
        path,
        async get() {
            return buildDocSnapshot(path);
        },
    });

    const adminDb = {
        collection(name: string) {
            return {
                doc(id?: string) {
                    const resolvedId = id ?? `auto_${++autoId}`;
                    return buildDocRef(`${name}/${resolvedId}`);
                },
            };
        },
        async runTransaction(callback: (transaction: {
            get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => StoredDoc | undefined }>;
            update: (ref: { path: string }, data: StoredDoc) => void;
            set: (ref: { path: string }, data: StoredDoc) => void;
        }) => Promise<unknown>) {
            return callback({
                async get(ref) {
                    return buildDocSnapshot(ref.path);
                },
                update(ref, data) {
                    transactionWrites.push({ path: ref.path, data });
                    documents.set(ref.path, {
                        ...(documents.get(ref.path) ?? {}),
                        ...data,
                    });
                },
                set(ref, data) {
                    transactionWrites.push({ path: ref.path, data });
                    documents.set(ref.path, {
                        ...(documents.get(ref.path) ?? {}),
                        ...data,
                    });
                },
            });
        },
    };

    return {
        documents,
        transactionWrites,
        adminDb,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        recordCanonicalTaskEvent: vi.fn(async () => undefined),
        recordRouteWarning: vi.fn(),
        recordRouteRuntimeSample: vi.fn(),
        touchUserRuntime: vi.fn(async () => undefined),
        reset() {
            documents.clear();
            transactionWrites.length = 0;
            autoId = 0;
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.recordCanonicalTaskEvent.mockReset();
            this.recordRouteWarning.mockReset();
            this.recordRouteRuntimeSample.mockReset();
            this.touchUserRuntime.mockReset();
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
    SENSITIVE_WRITE: {},
}));

vi.mock("@/lib/server/daily-tasks", () => ({
    recordCanonicalTaskEvent: mockState.recordCanonicalTaskEvent,
}));

vi.mock("@/lib/server/route-diagnostics", async () => {
    const actual = await vi.importActual<typeof import("@/lib/server/route-diagnostics")>("@/lib/server/route-diagnostics");
    return {
        ...actual,
        recordRouteWarning: mockState.recordRouteWarning,
    };
});

vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));

vi.mock("@/lib/server/user-runtime", () => ({
    touchUserRuntime: mockState.touchUserRuntime,
}));

vi.mock("firebase-admin/firestore", () => ({
    FieldValue: {
        serverTimestamp: () => "__server_timestamp__",
    },
}));

import { POST } from "@/app/api/checkin/route";

describe("POST /api/checkin", () => {
    beforeEach(() => {
        mockState.reset();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-05-01T18:00:00.000Z"));
        mockState.guardApiRequest.mockResolvedValue({
            uid: "fan_1",
            email: "fan@example.com",
        });
        mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
            error: error.message,
        }, { status: 500 }));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("suppresses duplicate daily reward claims for the same CST day", async () => {
        mockState.documents.set("users/fan_1", {
            uid: "fan_1",
            email: "fan@example.com",
            username: "fan_1",
            gumDropsBalance: 25,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 25,
            lastCheckIn: Date.now() - 60_000,
            streakCount: 3,
        });

        const response = await POST(new NextRequest("http://localhost/api/checkin", { method: "POST" }));
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload).toMatchObject({
            error: "Already claimed today",
            alreadyClaimed: true,
            streak: 3,
        });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 25,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 25,
        });
        expect(mockState.transactionWrites).toEqual([]);
        expect(mockState.recordCanonicalTaskEvent).not.toHaveBeenCalled();
        expect(mockState.touchUserRuntime).not.toHaveBeenCalled();
    });
});
