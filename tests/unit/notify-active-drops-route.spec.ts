import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
    const batch = {
        update: vi.fn(),
        set: vi.fn(),
        commit: vi.fn(async () => undefined),
    };

    const state = {
        scheduledDocs: [] as Array<{
            id: string;
            ref: { path: string };
            data: () => Record<string, unknown>;
        }>,
        activeDocs: [] as Array<{
            id: string;
            ref: { path: string };
            data: () => Record<string, unknown>;
        }>,
        ownersByDropId: new Map<string, string[]>(),
    };

    const adminDb = {
        batch: vi.fn(() => batch),
        collection: vi.fn((name: string) => {
            if (name === "drops") {
                return {
                    where(field: string, op: string, value: unknown) {
                        const clauses = [{ field, op, value }];

                        return {
                            where(nextField: string, nextOp: string, nextValue: unknown) {
                                clauses.push({ field: nextField, op: nextOp, value: nextValue });

                                return {
                                    get: vi.fn(async () => {
                                        const statusClause = clauses.find((clause) => clause.field === "status");
                                        const docs = statusClause?.value === "scheduled"
                                            ? state.scheduledDocs
                                            : statusClause?.value === "active"
                                                ? state.activeDocs
                                                : [];

                                        return {
                                            empty: docs.length === 0,
                                            docs,
                                        };
                                    }),
                                };
                            },
                        };
                    },
                };
            }

            if (name === "users") {
                return {
                    where(_field: string, _op: string, dropId: string) {
                        return {
                            get: vi.fn(async () => ({
                                forEach(callback: (doc: { id: string }) => void) {
                                    for (const userId of state.ownersByDropId.get(dropId) ?? []) {
                                        callback({ id: userId });
                                    }
                                },
                            })),
                        };
                    },
                };
            }

            if (name === "adminSettings") {
                return {
                    doc(id: string) {
                        return {
                            id,
                            path: `${name}/${id}`,
                        };
                    },
                };
            }

            throw new Error(`Unexpected collection: ${name}`);
        }),
    };

    return {
        adminDb,
        batch,
        state,
        guardApiRequest: vi.fn(),
        markDropsRuntimeChanged: vi.fn(),
        sendTargetedDropNotification: vi.fn(async () => undefined),
        arrayUnion: vi.fn((...values: string[]) => ({
            __op: "arrayUnion",
            values,
        })),
        reset() {
            state.scheduledDocs = [];
            state.activeDocs = [];
            state.ownersByDropId.clear();
            batch.update.mockReset();
            batch.set.mockReset();
            batch.commit.mockReset();
            adminDb.batch.mockClear();
            adminDb.collection.mockClear();
            this.guardApiRequest.mockReset();
            this.markDropsRuntimeChanged.mockReset();
            this.sendTargetedDropNotification.mockReset();
            this.sendTargetedDropNotification.mockResolvedValue(undefined);
            this.arrayUnion.mockClear();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/push-notifications", () => ({
    sendTargetedDropNotification: mockState.sendTargetedDropNotification,
}));

vi.mock("@/lib/server/drop-runtime", () => ({
    markDropsRuntimeChanged: mockState.markDropsRuntimeChanged,
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("firebase-admin/firestore", () => ({
    FieldValue: {
        arrayUnion: mockState.arrayUnion,
    },
}));

vi.mock("@/lib/server/rate-limit", () => ({
    CRON: {},
}));

import { GET } from "@/app/api/cron/notify-active-drops/route";

function makeDropDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        ref: { path: `drops/${id}` },
        data: () => data,
    };
}

describe("GET /api/cron/notify-active-drops", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "cron_runner",
        });
        process.env.CRON_SECRET = "test-secret";
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("activates due scheduled drops, expires finished active drops, and requeues configured returns", async () => {
        const now = Date.UTC(2026, 3, 2, 22, 0, 0);
        vi.setSystemTime(new Date(now));

        mockState.state.scheduledDocs = [
            makeDropDoc("scheduled_1", {
                title: "Scheduled Drop",
                validFrom: now - 5_000,
                validUntil: now + 60_000,
                activationCount: 0,
                imageUrl: "https://example.com/drop.jpg",
            }),
        ];
        mockState.state.activeDocs = [
            makeDropDoc("active_1", {
                title: "Finished Drop",
                validFrom: now - 120_000,
                validUntil: now - 1_000,
                status: "active",
                autoQueueOnExpire: true,
            }),
        ];
        mockState.state.ownersByDropId.set("scheduled_1", ["fan_1", "fan_2"]);

        const request = new NextRequest("http://localhost/api/cron/notify-active-drops", {
            headers: {
                authorization: "Bearer test-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            activatedDrops: ["Scheduled Drop"],
            expiredDrops: ["Finished Drop"],
            autoQueuedDrops: ["active_1"],
        });
        expect(mockState.batch.update).toHaveBeenCalledWith(
            { path: "drops/scheduled_1" },
            { status: "active" },
        );
        expect(mockState.batch.update).toHaveBeenCalledWith(
            { path: "drops/active_1" },
            { status: "expired" },
        );
        expect(mockState.batch.set).toHaveBeenCalledWith(
            { path: "adminSettings/dropQueue", id: "dropQueue" },
            {
                queue: {
                    __op: "arrayUnion",
                    values: ["active_1"],
                },
            },
            { merge: true },
        );
        expect(mockState.markDropsRuntimeChanged).toHaveBeenCalledWith(mockState.batch, now);
        expect(mockState.batch.commit).toHaveBeenCalled();
        expect(mockState.sendTargetedDropNotification).toHaveBeenCalledWith(
            "Scheduled Drop",
            "scheduled_1",
            "https://example.com/drop.jpg",
            false,
            ["fan_1", "fan_2"],
            `drop-activation:scheduled_1:${now - 5_000}`,
        );
    });

    it("returns a no-op response when nothing is due for activation or expiry", async () => {
        const now = Date.UTC(2026, 3, 2, 22, 0, 0);
        vi.setSystemTime(new Date(now));

        const request = new NextRequest("http://localhost/api/cron/notify-active-drops", {
            headers: {
                authorization: "Bearer test-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual({
            message: "No drop lifecycle changes to process.",
        });
        expect(mockState.batch.commit).not.toHaveBeenCalled();
        expect(mockState.sendTargetedDropNotification).not.toHaveBeenCalled();
    });
});
