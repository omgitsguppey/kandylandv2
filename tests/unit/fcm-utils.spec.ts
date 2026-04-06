import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const userDocs: Array<Record<string, unknown>> = [];
    const sendEachForMulticast = vi.fn();
    const selectedFields: string[][] = [];

    const stream = async function* () {
        for (const doc of userDocs) {
            yield {
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

import { broadcastFCM } from "@/lib/server/fcm-utils";

describe("broadcastFCM", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.sendEachForMulticast.mockResolvedValue({
            successCount: 2,
            failureCount: 0,
        });
    });

    it("sends browser push only to users who have creator/drop alerts enabled", async () => {
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

        const result = await broadcastFCM("Kandy Drops", "A new drop is live.");

        expect(result).toBe(true);
        expect(mockState.selectedFields).toEqual([["fcmTokens", "notificationSettings"]]);
        expect(mockState.sendEachForMulticast).toHaveBeenCalledTimes(1);
        expect(mockState.sendEachForMulticast).toHaveBeenCalledWith(expect.objectContaining({
            tokens: ["token-enabled-1", "token-enabled-2"],
        }));
    });
});
