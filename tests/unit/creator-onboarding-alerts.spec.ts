import { beforeEach, describe, expect, it, vi } from "vitest";

type MockDocRef = {
    id: string;
    path: string;
};

const mockState = vi.hoisted(() => {
    const documents = new Map<string, Record<string, unknown>>();
    let notificationIdCounter = 0;

    const makeDocRef = (path: string): MockDocRef => ({
        id: path.split("/").pop() || "",
        path,
    });

    const makeCollection = (name: string) => ({
        doc(id?: string) {
            const resolvedId = id || `generated_${++notificationIdCounter}`;
            return makeDocRef(`${name}/${resolvedId}`);
        },
        where(field: string, _op: string, value: string) {
            return {
                async get() {
                    if (name !== "users" || field !== "role" || value !== "admin") {
                        return { docs: [] };
                    }

                    return {
                        docs: Array.from(documents.entries())
                            .filter(([path, data]) => path.startsWith("users/") && data.role === "admin")
                            .map(([path]) => ({ id: path.replace("users/", "") })),
                    };
                },
            };
        },
    });

    const adminDb = {
        collection(name: string) {
            return makeCollection(name);
        },
        runTransaction: vi.fn(async (callback: (transaction: {
            get: (ref: MockDocRef) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
            set: (ref: MockDocRef, data: Record<string, unknown>, options?: { merge?: boolean }) => void;
        }) => Promise<unknown>) => {
            const transaction = {
                async get(ref: MockDocRef) {
                    return {
                        exists: documents.has(ref.path),
                        data: () => documents.get(ref.path),
                    };
                },
                set(ref: MockDocRef, data: Record<string, unknown>, options?: { merge?: boolean }) {
                    const current = options?.merge ? (documents.get(ref.path) ?? {}) : {};
                    documents.set(ref.path, {
                        ...current,
                        ...data,
                    });
                },
            };

            return callback(transaction);
        }),
    };

    return {
        documents,
        adminDb,
        markNotificationsRuntimeChanged: vi.fn(),
        reset() {
            documents.clear();
            notificationIdCounter = 0;
            adminDb.runTransaction.mockClear();
            this.markNotificationsRuntimeChanged.mockReset();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/notification-runtime", () => ({
    markNotificationsRuntimeChanged: mockState.markNotificationsRuntimeChanged,
}));

import { sendCreatorOnboardingAdminNotification } from "@/lib/server/creator-onboarding-alerts";

describe("creator onboarding admin alerts", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.documents.set("users/admin_1", {
            role: "admin",
        });
        mockState.documents.set("users/admin_2", {
            role: "admin",
        });
    });

    it("creates a targeted admin notification and touches the notification runtime", async () => {
        const result = await sendCreatorOnboardingAdminNotification({
            eventKey: "creator_onboarding_submitted:user_1",
            title: "New creator onboarding submission",
            message: "Creator One is waiting for creator review.",
            link: "/admin/user/user_1",
            nowMs: 1_710_000_000_000,
        });

        const notificationEntry = Array.from(mockState.documents.entries()).find(([path]) => path.startsWith("notifications/"));
        expect(result).toMatchObject({
            delivered: true,
            duplicate: false,
            adminCount: 2,
        });
        expect(notificationEntry?.[1]).toMatchObject({
            title: "New creator onboarding submission",
            target: {
                global: false,
                userIds: ["admin_1", "admin_2"],
            },
            link: "/admin/user/user_1",
        });
        expect(mockState.markNotificationsRuntimeChanged).toHaveBeenCalledTimes(1);
    });

    it("deduplicates repeated creator onboarding alerts within the dispatch window", async () => {
        await sendCreatorOnboardingAdminNotification({
            eventKey: "creator_onboarding_submitted:user_1",
            title: "New creator onboarding submission",
            message: "Creator One is waiting for creator review.",
            link: "/admin/user/user_1",
            nowMs: 1_710_000_000_000,
        });

        const duplicateResult = await sendCreatorOnboardingAdminNotification({
            eventKey: "creator_onboarding_submitted:user_1",
            title: "New creator onboarding submission",
            message: "Creator One is waiting for creator review.",
            link: "/admin/user/user_1",
            nowMs: 1_710_000_060_000,
        });

        expect(duplicateResult).toMatchObject({
            delivered: false,
            duplicate: true,
            adminCount: 2,
        });
        expect(Array.from(mockState.documents.keys()).filter((path) => path.startsWith("notifications/"))).toHaveLength(1);
    });
});
