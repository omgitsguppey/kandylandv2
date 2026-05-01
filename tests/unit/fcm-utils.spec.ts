import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const userDocs: Array<Record<string, unknown>> = [];
    const sendEachForMulticast = vi.fn();
    const selectedFields: string[][] = [];

    const stream = async function* () {
        for (const doc of userDocs) {
            yield {
                id: typeof doc.uid === "string" ? doc.uid : `user_${userDocs.indexOf(doc)}`,
                data: () => doc,
            };
        }
    };

    return {
        userDocs,
        sendEachForMulticast,
        selectedFields,
        adminDb: {
            collection(name: string) {
                if (name !== "users") {
                    throw new Error(`Unexpected collection: ${name}`);
                }

                return {
                    select(...fields: string[]) {
                        selectedFields.push(fields);
                        return {
                            stream,
                        };
                    },
                };
            },
        },
        reset() {
            userDocs.length = 0;
            selectedFields.length = 0;
            sendEachForMulticast.mockReset();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("firebase-admin", () => ({
    messaging: () => ({
        sendEachForMulticast: mockState.sendEachForMulticast,
    }),
}));

import { broadcastFCM, broadcastFCMWithReport } from "@/lib/server/fcm-utils";

describe("broadcastFCM", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.sendEachForMulticast.mockResolvedValue({
            successCount: 2,
            failureCount: 0,
        });
    });

    it("sends new-drop push only to users who have browser push and new-drop alerts enabled", async () => {
        mockState.userDocs.push(
            {
                fcmTokens: ["token-enabled-1", "token-enabled-2"],
                notificationSettings: {
                    browserPushEnabled: true,
                    newDropAlerts: true,
                },
            },
            {
                fcmTokens: ["token-browser-off"],
                notificationSettings: {
                    browserPushEnabled: false,
                    newDropAlerts: true,
                },
            },
            {
                fcmTokens: ["token-drops-off"],
                notificationSettings: {
                    browserPushEnabled: true,
                    newDropAlerts: false,
                },
            },
            {
                fcmTokens: ["token-no-settings"],
            },
        );

        const result = await broadcastFCM("Kandy Drops", "A new drop is live.", "/drops", "new_drop");

        expect(result).toBe(true);
        expect(mockState.selectedFields).toEqual([["fcmTokens", "notificationSettings"]]);
        expect(mockState.sendEachForMulticast).toHaveBeenCalledTimes(1);
        expect(mockState.sendEachForMulticast).toHaveBeenCalledWith(expect.objectContaining({
            tokens: ["token-enabled-1", "token-enabled-2"],
        }));
    });

    it("sends general push to any browser-push-enabled user regardless of drop-alert toggle", async () => {
        mockState.userDocs.push(
            {
                fcmTokens: ["token-general-1"],
                notificationSettings: {
                    browserPushEnabled: true,
                    newDropAlerts: false,
                },
            },
            {
                fcmTokens: ["token-general-2"],
                notificationSettings: {
                    browserPushEnabled: true,
                    expiringSoonAlerts: false,
                },
            },
            {
                fcmTokens: ["token-browser-off"],
                notificationSettings: {
                    browserPushEnabled: false,
                    newDropAlerts: true,
                },
            },
        );

        const result = await broadcastFCM("Kandy Drops", "General update", "/drops", "general");

        expect(result).toBe(true);
        expect(mockState.sendEachForMulticast).toHaveBeenCalledTimes(1);
        expect(mockState.sendEachForMulticast).toHaveBeenCalledWith(expect.objectContaining({
            tokens: ["token-general-1", "token-general-2"],
        }));
    });

    it("sends ending-soon push only to users who left ending-soon reminders enabled", async () => {
        mockState.userDocs.push(
            {
                fcmTokens: ["token-expiring-enabled"],
                notificationSettings: {
                    browserPushEnabled: true,
                    expiringSoonAlerts: true,
                },
            },
            {
                fcmTokens: ["token-expiring-disabled"],
                notificationSettings: {
                    browserPushEnabled: true,
                    expiringSoonAlerts: false,
                },
            },
        );

        const result = await broadcastFCM("Kandy Drops", "Ending soon", "/drops", "expiring_soon");

        expect(result).toBe(true);
        expect(mockState.sendEachForMulticast).toHaveBeenCalledTimes(1);
        expect(mockState.sendEachForMulticast).toHaveBeenCalledWith(expect.objectContaining({
            tokens: ["token-expiring-enabled"],
        }));
    });

    it("reports skipped recipients and duplicate tokens without adding an auto-display notification payload", async () => {
        mockState.userDocs.push(
            {
                uid: "enabled",
                fcmTokens: ["shared-token", "shared-token"],
                notificationSettings: {
                    browserPushEnabled: true,
                    newDropAlerts: true,
                },
            },
            {
                uid: "permission-off",
                fcmTokens: ["token-browser-off"],
                notificationSettings: {
                    browserPushEnabled: false,
                    newDropAlerts: true,
                },
            },
            {
                uid: "preference-off",
                fcmTokens: ["token-drops-off"],
                notificationSettings: {
                    browserPushEnabled: true,
                    newDropAlerts: false,
                },
            },
            {
                uid: "missing-token",
                fcmTokens: [],
                notificationSettings: {
                    browserPushEnabled: true,
                    newDropAlerts: true,
                },
            },
        );

        const report = await broadcastFCMWithReport("Kandy Drops", "A new drop is live.", "/drops", "new_drop", {
            idempotencyKey: "drop_live:drop_live:drop_1:global",
            browserTag: "kandydrops:drop_live:drop_live:drop_1:global",
        });

        expect(report).toEqual(expect.objectContaining({
            ok: true,
            tokensSent: true,
            recipientCheckedCount: 4,
            permissionSkippedCount: 1,
            preferenceSkippedCount: 1,
            missingTokenSkippedCount: 1,
            duplicatePushPreventedCount: 1,
            tokensQueuedCount: 1,
            dataOnlyPayload: true,
            pwaDisplayMode: "manual-service-worker",
        }));
        expect(mockState.sendEachForMulticast).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                pwaDisplayMode: "manual-service-worker",
                autoDisplayedByFcm: "false",
                tag: "kandydrops:drop_live:drop_live:drop_1:global",
            }),
            tokens: ["shared-token"],
        }));
        expect(mockState.sendEachForMulticast.mock.calls[0]?.[0]).not.toHaveProperty("notification");
    });
});
