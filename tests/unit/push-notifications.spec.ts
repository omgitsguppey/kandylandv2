import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const state = {
        forceExistingNotification: false,
        broadcastFCMWithReport: vi.fn(),
        touchNotificationsRuntime: vi.fn(),
        recordNotificationDispatchOutcome: vi.fn(),
        recordRouteWarning: vi.fn(),
        transactionGet: vi.fn(),
        transactionSet: vi.fn(),
        adminDb: {} as {
            collection: ReturnType<typeof vi.fn>;
            runTransaction: ReturnType<typeof vi.fn>;
        },
        reset() {
            this.forceExistingNotification = false;
            this.broadcastFCMWithReport.mockReset();
            this.touchNotificationsRuntime.mockReset();
            this.recordNotificationDispatchOutcome.mockReset();
            this.recordRouteWarning.mockReset();
            this.transactionGet.mockReset();
            this.transactionSet.mockReset();
            this.adminDb.collection.mockClear();
            this.adminDb.runTransaction.mockClear();
        },
    };

    state.adminDb = {
        collection: vi.fn((name: string) => ({
            doc: vi.fn((id: string) => ({
                id,
                path: `${name}/${id}`,
                collectionName: name,
            })),
        })),
        runTransaction: vi.fn(async (callback: (transaction: unknown) => Promise<void>) =>
            callback({
                get: state.transactionGet,
                set: state.transactionSet,
            }),
        ),
    };

    state.transactionGet.mockImplementation(async (ref: { collectionName?: string; id?: string }) => ({
        exists: ref.collectionName === "notifications" && state.forceExistingNotification,
        id: ref.id ?? "unknown",
        data: () => ({}),
    }));

    return state;
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/fcm-utils", () => ({
    broadcastFCMWithReport: mockState.broadcastFCMWithReport,
}));

vi.mock("@/lib/server/notification-runtime", () => ({
    touchNotificationsRuntime: mockState.touchNotificationsRuntime,
}));

vi.mock("@/lib/server/runtime-warning-store", () => ({
    recordNotificationDispatchOutcome: mockState.recordNotificationDispatchOutcome,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
    recordRouteWarning: mockState.recordRouteWarning,
}));

vi.mock("firebase-admin", () => ({
    firestore: {
        FieldValue: {
            serverTimestamp: vi.fn(() => ({ op: "serverTimestamp" })),
        },
    },
}));

import {
    sendGlobalDropNotification,
    sendTargetedDropNotification,
} from "@/lib/server/push-notifications";

describe("drop push notification dedupe", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.transactionGet.mockImplementation(async (ref: { collectionName?: string; id?: string }) => ({
            exists: ref.collectionName === "notifications" && mockState.forceExistingNotification,
            id: ref.id ?? "unknown",
            data: () => ({}),
        }));
        mockState.broadcastFCMWithReport.mockResolvedValue({
            ok: true,
            tokensSent: true,
            successCount: 2,
            failureCount: 0,
            recipientCheckedCount: 3,
            permissionSkippedCount: 0,
            preferenceSkippedCount: 0,
            missingTokenSkippedCount: 0,
            duplicatePushPreventedCount: 0,
            tokensQueuedCount: 2,
            invalidTokenRemovedCount: 0,
            idempotencyKey: "drop_live:drop_live:drop_1:global",
            browserTag: "kandydrops:drop_live:drop_live:drop_1:global",
            dataOnlyPayload: true,
            pwaDisplayMode: "manual-service-worker",
        });
    });

    it("does not send a global FCM push when the deterministic notification already exists", async () => {
        mockState.forceExistingNotification = true;

        const result = await sendGlobalDropNotification("Pink Bubble Bath", "drop_1");

        expect(result.status).toBe("duplicate");
        expect(result.detail).toEqual(expect.objectContaining({
            duplicateCreatedPrevented: true,
            duplicatePushPrevented: true,
            duplicateBrowserDisplayPrevented: true,
            fcmDelivered: false,
        }));
        expect(mockState.broadcastFCMWithReport).not.toHaveBeenCalled();
        expect(mockState.touchNotificationsRuntime).not.toHaveBeenCalled();
    });

    it("does not send a return-live FCM push when the deterministic notification already exists", async () => {
        mockState.forceExistingNotification = true;

        const result = await sendTargetedDropNotification(
            "Pink Bubble Bath",
            "drop_1",
            "/drop.jpg",
            true,
            ["owner_1"],
        );

        expect(result.status).toBe("duplicate");
        expect(result.detail).toEqual(expect.objectContaining({
            queuedDropReturnedLive: true,
            duplicateCreatedPrevented: true,
            duplicatePushPrevented: true,
            duplicateBrowserDisplayPrevented: true,
            fcmDelivered: false,
        }));
        expect(mockState.broadcastFCMWithReport).not.toHaveBeenCalled();
        expect(mockState.touchNotificationsRuntime).not.toHaveBeenCalled();
    });

    it("records return-live dispatch diagnostics without claiming duplicate prevention on first send", async () => {
        const result = await sendTargetedDropNotification(
            "Pink Bubble Bath",
            "drop_1",
            "/drop.jpg",
            true,
            ["owner_1"],
        );

        expect(result.status).toBe("sent");
        expect(result.detail).toEqual(expect.objectContaining({
            queuedDropReturnedLive: true,
            inAppQueued: true,
            fcmDelivered: true,
            duplicateCreatedPrevented: false,
            duplicatePushPrevented: false,
            duplicateBrowserDisplayPrevented: false,
            skippedPermissionDeniedCount: 0,
            skippedMissingTokenCount: 0,
            skippedPreferencesDisabledCount: 0,
            dataOnlyPayload: true,
            pwaDisplayMode: "manual-service-worker",
        }));
        expect(mockState.broadcastFCMWithReport).toHaveBeenCalledWith(
            "Kandy Drops",
            expect.stringContaining("Pink Bubble Bath"),
            "/drops",
            "new_drop",
            expect.objectContaining({
                dropId: "drop_1",
                lifecycleEvent: "drop_requeued_live",
                audience: "global_except_1",
            }),
        );
    });
});
