import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fromCSTInput } from "@/lib/timezone";

const mockState = vi.hoisted(() => {
    const updates = new Map<string, Record<string, unknown>>();

    const batch = {
        update: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
            updates.set(ref.path, {
                ...(updates.get(ref.path) ?? {}),
                ...data,
            });
        }),
        commit: vi.fn(async () => undefined),
    };

    const adminDb = {
        collection: vi.fn((name: string) => ({
            doc: (id: string) => ({
                id,
                path: `${name}/${id}`,
            }),
        })),
        batch: vi.fn(() => batch),
        getAll: vi.fn(),
    };

    return {
        updates,
        batch,
        adminDb,
        guardApiRequest: vi.fn(),
        getResolvedQueueConfig: vi.fn(),
        buildQueuedDropsMap: vi.fn(),
        markDropsRuntimeChanged: vi.fn(),
        handleApiError: vi.fn(),
        reset() {
            updates.clear();
            batch.update.mockClear();
            batch.commit.mockClear();
            adminDb.collection.mockClear();
            adminDb.batch.mockClear();
            adminDb.getAll.mockClear();
            this.guardApiRequest.mockReset();
            this.getResolvedQueueConfig.mockReset();
            this.buildQueuedDropsMap.mockReset();
            this.markDropsRuntimeChanged.mockReset();
            this.handleApiError.mockReset();
        },
    };
});

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/drop-queue", () => ({
    getResolvedQueueConfig: mockState.getResolvedQueueConfig,
}));

vi.mock("@/lib/server/process-queue-drops", () => ({
    buildQueuedDropsMap: mockState.buildQueuedDropsMap,
}));

vi.mock("@/lib/server/drop-runtime", () => ({
    markDropsRuntimeChanged: mockState.markDropsRuntimeChanged,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
    CRON: {},
}));

import { GET } from "@/app/api/cron/process-queue/route";

describe("GET /api/cron/process-queue", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockState.reset();
        mockState.guardApiRequest.mockResolvedValue({
            uid: "cron_runner",
        });
        mockState.handleApiError.mockImplementation(() => NextResponse.json({ error: "Internal server error" }, { status: 500 }));
        process.env.CRON_SECRET = "test-secret";
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("schedules ready return drops after already-scheduled queue entries", async () => {
        const now = fromCSTInput("2026-04-02T09:00");
        const scheduledSlot = fromCSTInput("2026-04-03T12:00");
        const cooledDropEnd = fromCSTInput("2026-03-20T12:00");
        vi.setSystemTime(new Date(now));

        mockState.getResolvedQueueConfig.mockResolvedValue({
            queue: ["scheduled_first", "ready_second"],
            dropsPerDay: 1,
            cooldownDays: 7,
            timesPerDay: ["12:00"],
        });
        mockState.buildQueuedDropsMap.mockResolvedValue({
            scheduled_first: {
                id: "scheduled_first",
                validFrom: scheduledSlot,
                validUntil: scheduledSlot + (24 * 60 * 60 * 1000),
                activationCount: 0,
                status: "scheduled",
            },
            ready_second: {
                id: "ready_second",
                validFrom: cooledDropEnd - (24 * 60 * 60 * 1000),
                validUntil: cooledDropEnd,
                activationCount: 2,
                status: "expired",
            },
        });

        const request = new NextRequest("http://localhost/api/cron/process-queue", {
            headers: {
                authorization: "Bearer test-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.updates).toHaveLength(1);
        expect(payload.updates[0]).toMatchObject({
            dropId: "ready_second",
            activationCount: 3,
        });
        expect(payload.updates[0].validFrom).toBeGreaterThan(scheduledSlot);
        expect(mockState.updates.get("drops/ready_second")).toMatchObject({
            validFrom: payload.updates[0].validFrom,
            validUntil: payload.updates[0].validFrom + (24 * 60 * 60 * 1000),
            status: "scheduled",
            activationCount: 3,
        });
        expect(mockState.markDropsRuntimeChanged).toHaveBeenCalled();
        expect(mockState.batch.commit).toHaveBeenCalled();
    });

    it("reconciles stale queued lifecycle status even when no new slot is assigned", async () => {
        const now = fromCSTInput("2026-04-02T09:00");
        vi.setSystemTime(new Date(now));

        mockState.getResolvedQueueConfig.mockResolvedValue({
            queue: ["stale_live_drop"],
            dropsPerDay: 1,
            cooldownDays: 7,
            timesPerDay: ["12:00"],
        });
        mockState.buildQueuedDropsMap.mockResolvedValue({
            stale_live_drop: {
                id: "stale_live_drop",
                validFrom: fromCSTInput("2026-04-02T08:00"),
                validUntil: fromCSTInput("2026-04-03T08:00"),
                activationCount: 0,
                status: "scheduled",
            },
        });

        const request = new NextRequest("http://localhost/api/cron/process-queue", {
            headers: {
                authorization: "Bearer test-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.updates).toEqual([]);
        expect(payload.lifecycleReconciled).toEqual([
            {
                dropId: "stale_live_drop",
                status: "active",
            },
        ]);
        expect(mockState.updates.get("drops/stale_live_drop")).toMatchObject({
            status: "active",
        });
        expect(mockState.batch.commit).toHaveBeenCalled();
    });

    it("does not leak internal errors when queue processing fails", async () => {
        mockState.getResolvedQueueConfig.mockRejectedValue(new Error("firestore batch pipeline exploded"));

        const request = new NextRequest("http://localhost/api/cron/process-queue", {
            headers: {
                authorization: "Bearer test-secret",
            },
        });
        const response = await GET(request);
        const payload = await response.json();

        expect(response.status).toBe(500);
        expect(payload).toEqual({ error: "Internal server error" });
        expect(mockState.handleApiError).toHaveBeenCalledWith(expect.any(Error), "Cron.ProcessQueue.GET");
    });
});
