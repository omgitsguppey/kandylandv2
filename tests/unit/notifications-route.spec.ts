import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockNotificationDoc = {
    id: string;
    data: Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const documents = new Map<string, MockNotificationDoc>();
    const collection = vi.fn((name: string) => ({
        doc: vi.fn((id: string) => {
            const ref = { id, path: `${name}/${id}` };
            return {
                ...ref,
                get: vi.fn(async () => {
                    const found = documents.get(id);
                    return {
                        exists: Boolean(found),
                        id,
                        ref,
                        data: () => found?.data,
                    };
                }),
            };
        }),
    }));
    const batchUpdate = vi.fn();
    const batchCommit = vi.fn(async () => undefined);

    return {
        documents,
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        touchUserRuntime: vi.fn(),
        recordRouteRuntimeSample: vi.fn(),
        getErrorMessage: vi.fn(),
        adminDb: {
            collection,
            getAll: vi.fn(async (...refs: Array<{ id: string; path: string }>) => refs.map((ref) => {
                const found = documents.get(ref.id);
                return {
                    exists: Boolean(found),
                    id: ref.id,
                    ref,
                    data: () => found?.data,
                };
            })),
            batch: vi.fn(() => ({
                update: batchUpdate,
                commit: batchCommit,
            })),
        },
        batchUpdate,
        batchCommit,
        fieldValueArrayUnion: vi.fn((value: string) => ({ op: "arrayUnion", value })),
        reset() {
            documents.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.touchUserRuntime.mockReset();
            this.recordRouteRuntimeSample.mockReset();
            this.getErrorMessage.mockReset();
            this.adminDb.collection.mockClear();
            this.adminDb.getAll.mockClear();
            this.adminDb.batch.mockClear();
            this.batchUpdate.mockClear();
            this.batchCommit.mockClear();
            this.fieldValueArrayUnion.mockClear();
        },
    };
});

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/fcm-utils", () => ({
    broadcastFCM: vi.fn(),
}));

vi.mock("@/lib/server/notification-runtime", () => ({
    markNotificationsRuntimeChanged: vi.fn(),
    touchNotificationsRuntime: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
    HEAVY_READ: {},
    STANDARD: {},
}));

vi.mock("@/lib/server/user-runtime", () => ({
    touchUserRuntime: mockState.touchUserRuntime,
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
    recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
    getErrorMessage: mockState.getErrorMessage,
    recordRouteWarning: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
    FieldValue: {
        serverTimestamp: vi.fn(() => ({ op: "serverTimestamp" })),
        arrayUnion: mockState.fieldValueArrayUnion,
    },
}));

import { PUT } from "@/app/api/notifications/route";

describe("PUT /api/notifications", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({ uid: "user_1" });
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("marks multiple visible notifications as read in one batch", async () => {
        const createdAtMs = Date.now();
        mockState.documents.set("note_1", {
            id: "note_1",
            data: {
                title: "One",
                message: "First",
                type: "info",
                createdAtMs,
                readBy: [],
                target: { global: false, userIds: ["user_1"] },
            },
        });
        mockState.documents.set("note_2", {
            id: "note_2",
            data: {
                title: "Two",
                message: "Second",
                type: "success",
                createdAtMs,
                readBy: ["user_2"],
                target: { global: true, userIds: [] },
            },
        });

        const response = await PUT(new NextRequest("http://localhost/api/notifications", {
            method: "PUT",
            body: JSON.stringify({ notificationIds: ["note_1", "note_2"] }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.successCount).toBe(2);
        expect(body.failedCount).toBe(0);
        expect(body.notificationIds).toEqual(["note_1", "note_2"]);
        expect(mockState.batchUpdate).toHaveBeenCalledTimes(2);
        expect(mockState.batchUpdate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            readBy: { op: "arrayUnion", value: "user_1" },
            lastReadBy: "user_1",
            readAtMs: expect.any(Number),
        }));
        expect(mockState.touchUserRuntime).toHaveBeenCalledWith("user_1", { notifications: true });
        expect(mockState.recordRouteRuntimeSample).toHaveBeenCalledWith(expect.objectContaining({
            key: "notifications:PUT",
            statusCode: 200,
        }));
    });

    it("returns 404 for a single unavailable notification", async () => {
        const response = await PUT(new NextRequest("http://localhost/api/notifications", {
            method: "PUT",
            body: JSON.stringify({ notificationId: "missing_note" }),
        }));
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.error).toBe("Notification not available");
        expect(mockState.batchUpdate).not.toHaveBeenCalled();
    });
});
