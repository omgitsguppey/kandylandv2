import { beforeEach, describe, expect, it, vi } from "vitest";

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

    const emptyQuery = {
        async get() {
            return { docs: [] };
        },
    };

    const adminDb = {
        collection(name: string) {
            return {
                doc(id?: string) {
                    const resolvedId = id ?? `auto_${++autoId}`;
                    return buildDocRef(`${name}/${resolvedId}`);
                },
                where() {
                    return emptyQuery;
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
        markNotificationsRuntimeChanged: vi.fn(async () => undefined),
        touchUserRuntime: vi.fn(async () => undefined),
        reset() {
            documents.clear();
            transactionWrites.length = 0;
            autoId = 0;
            this.markNotificationsRuntimeChanged.mockReset();
            this.touchUserRuntime.mockReset();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/notification-runtime", () => ({
    markNotificationsRuntimeChanged: mockState.markNotificationsRuntimeChanged,
}));

vi.mock("@/lib/server/user-runtime", () => ({
    touchUserRuntime: mockState.touchUserRuntime,
}));

vi.mock("firebase-admin/firestore", () => ({
    FieldValue: {
        serverTimestamp: () => "__server_timestamp__",
        increment: (value: number) => ({ __op: "increment", value }),
    },
}));

import { recordDailyTaskProgressFromEvent } from "@/lib/server/daily-tasks";

describe("recordDailyTaskProgressFromEvent", () => {
    beforeEach(() => {
        mockState.reset();
    });

    it("suppresses duplicate task completion rewards when the receipt exists", async () => {
        mockState.documents.set("users/fan_1", {
            uid: "fan_1",
            username: "fan_1",
            gumDropsBalance: 100,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 100,
        });
        mockState.documents.set("daily_task_event_receipts/fan_1:unlock_drop_success:drop_1", {
            uid: "fan_1",
            eventName: "unlock_drop_success",
            receiptKey: "drop_1",
        });

        await recordDailyTaskProgressFromEvent(
            "fan_1",
            "fan_1",
            "unlock_drop_success",
            { drop_id: "drop_1" },
            { source: "canonical", receiptKey: "drop_1" },
        );

        expect(mockState.transactionWrites).toHaveLength(1);
        expect(mockState.transactionWrites[0]).toMatchObject({
            path: "analytics_event_stats/daily_task_claim_duplicate_prevented",
        });
        expect(mockState.documents.get("users/fan_1")).toMatchObject({
            gumDropsBalance: 100,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 100,
        });
        expect(mockState.touchUserRuntime).not.toHaveBeenCalled();
        expect(mockState.markNotificationsRuntimeChanged).not.toHaveBeenCalled();
    });
});
