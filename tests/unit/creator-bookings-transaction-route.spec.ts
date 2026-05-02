import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SeedDoc = {
    id: string;
    data: Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, SeedDoc[]>();
    const documents = new Map<string, Record<string, unknown>>();

    function getCollectionDocs(name: string) {
        return collections.get(name) ?? [];
    }

    function setDocument(name: string, id: string, value: Record<string, unknown>, merge = false) {
        const existing = documents.get(`${name}/${id}`) ?? {};
        const next = merge ? { ...existing, ...value } : value;
        documents.set(`${name}/${id}`, next);
        collections.set(name, [...getCollectionDocs(name).filter((entry) => entry.id !== id), { id, data: next }]);
    }

    function buildDocRef(name: string, id: string) {
        return {
            id,
            path: `${name}/${id}`,
            async get() {
                return {
                    id,
                    exists: documents.has(`${name}/${id}`),
                    data: () => documents.get(`${name}/${id}`),
                };
            },
            set(value: Record<string, unknown>, options?: { merge?: boolean }) {
                setDocument(name, id, value, options?.merge === true);
            },
            update(value: Record<string, unknown>) {
                setDocument(name, id, value, true);
            },
        };
    }

    function buildQuery(name: string, filters: Array<{ field: string; value: unknown }> = [], max?: number) {
        return {
            where(field: string, _operator: string, value: unknown) {
                return buildQuery(name, [...filters, { field, value }], max);
            },
            limit(nextMax: number) {
                return buildQuery(name, filters, nextMax);
            },
            doc(id: string) {
                return buildDocRef(name, id);
            },
            async get() {
                const allDocs = getCollectionDocs(name)
                    .filter((entry) => filters.every((filter) => entry.data[filter.field] === filter.value))
                    .map((entry) => ({ id: entry.id, data: () => entry.data }));
                const docs = typeof max === "number" ? allDocs.slice(0, max) : allDocs;
                return { docs, empty: docs.length === 0, size: docs.length };
            },
        };
    }

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        buildBookingSlotKey: vi.fn((input: { creatorId: string; serviceType: string; startAt: number; durationMinutes: number }) => `${input.creatorId}:${input.serviceType}:${input.startAt}:${input.durationMinutes}`),
        buildCreatorAccrual: vi.fn((input: { sourceType: string; sourceId: string }) => ({
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            creatorShareGd: 500,
            cashoutValueUsd: 5,
        })),
        buildCreatorExperienceIdempotencyKey: vi.fn((input: { clientKey?: string; action: string; userId: string; creatorId: string }) => input.clientKey || `${input.action}:${input.userId}:${input.creatorId}`),
        buildCreatorExperienceRecordIds: vi.fn((input: { idempotencyKey: string }) => ({
            userTransactionId: `txn_${input.idempotencyKey.replace(/[^a-z0-9_-]/gi, "_")}`,
            creatorAccrualId: `accrual_${input.idempotencyKey.replace(/[^a-z0-9_-]/gi, "_")}`,
            creatorExperienceRecordId: `booking_${input.idempotencyKey.replace(/[^a-z0-9_-]/gi, "_")}`,
        })),
        buildCreatorExperienceTelemetryPayload: vi.fn((input: any) => ({
            actorType: input.marker.actorType,
            creator_id: input.creatorId,
            price_gd: input.priceGd,
            idempotency_key: input.idempotencyKey,
            duplicate_prevented: input.duplicatePrevented,
        })),
        buildCreatorExperienceTransactionDebug: vi.fn((input: any) => ({
            userTransactionId: input.userTransactionId,
            creatorAccrualId: input.creatorAccrualId,
            creatorExperienceRecordId: input.creatorExperienceRecordId,
            priceGd: input.priceGd,
            platformShareGd: Math.max(0, input.priceGd - 500),
            creatorShareGd: 500,
            idempotencyKey: input.idempotencyKey,
            duplicatePrevented: input.duplicatePrevented,
            sourceAwareBalanceBefore: input.sourceAwareBalanceBefore ?? null,
            sourceAwareBalanceAfter: input.sourceAwareBalanceAfter ?? null,
        })),
        buildSourceAwareBalancePatch: vi.fn((next: { total: number }) => ({ gumDropsBalance: next.total })),
        calculateBookingPriceGd: vi.fn(() => 1000),
        readSourceAwareBalance: vi.fn(() => ({ total: 2000, purchased: 2000, reward: 0 })),
        spendCreatorExperienceGumdrops: vi.fn(() => ({ ok: true, next: { total: 1000, purchased: 1000, reward: 0 }, purchasedSpent: 1000, rewardSpent: 0, ledgerSource: "purchased" })),
        buildCompletedGumdropTransaction: vi.fn(() => ({ verifiedServerSide: true })),
        trackServerEvent: vi.fn(),
        adminDb: {
            collection(name: string) {
                return {
                    ...buildQuery(name),
                    doc(id: string) {
                        return buildDocRef(name, id);
                    },
                };
            },
            async runTransaction<T>(handler: (transaction: { get: (ref: { get: () => Promise<any> }) => Promise<any>; update: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>) => void; set: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>, options?: { merge?: boolean }) => void; }) => Promise<T>) {
                return handler({
                    get: async (ref: { get: () => Promise<any> }) => ref.get(),
                    update: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>) => ref.update(value),
                    set: (ref: ReturnType<typeof buildDocRef>, value: Record<string, unknown>, options?: { merge?: boolean }) => ref.set(value, options),
                });
            },
        },
        documents,
        setDocument,
        reset() {
            collections.clear();
            documents.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
            this.buildBookingSlotKey.mockClear();
            this.buildCreatorAccrual.mockClear();
            this.buildCreatorExperienceIdempotencyKey.mockClear();
            this.buildCreatorExperienceRecordIds.mockClear();
            this.buildCreatorExperienceTelemetryPayload.mockClear();
            this.buildCreatorExperienceTransactionDebug.mockClear();
            this.buildSourceAwareBalancePatch.mockClear();
            this.calculateBookingPriceGd.mockClear();
            this.readSourceAwareBalance.mockClear();
            this.spendCreatorExperienceGumdrops.mockClear();
            this.buildCompletedGumdropTransaction.mockClear();
            this.trackServerEvent.mockClear();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({ guardApiRequest: mockState.guardApiRequest }));
vi.mock("@/lib/server/auth", () => ({ handleApiError: mockState.handleApiError }));
vi.mock("@/lib/server/firebase-admin", () => ({ adminDb: mockState.adminDb }));
vi.mock("@/lib/server/rate-limit", () => ({ STANDARD: {} }));
vi.mock("@/lib/server/not-found", () => ({
    buildNotFoundResponse: (_kind: string, message: string) => NextResponse.json({ error: message }, { status: 404 }),
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
    withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));
vi.mock("@/app/api/creator/bookings/booking-timezone", () => ({
    isWithinAnyWindow: () => true,
}));
vi.mock("@/lib/creator-experiences", () => ({
    CREATOR_BOOKING_MIN_MINUTES: 5,
    CREATOR_COLLECTIONS: {
        bookings: "creator_call_bookings",
        subscriptions: "creator_subscriptions",
        ledgerAccruals: "creator_ledger_accruals",
    },
    isCreatorRole: (role: unknown) => role === "creator",
}));
vi.mock("@/lib/server/creator-experiences", () => ({
    CREATOR_EXPERIENCE_PAID_EVENTS: {
        live_time: "creator_live_time_booked",
    },
    buildBookingSlotKey: mockState.buildBookingSlotKey,
    buildCreatorAccrual: mockState.buildCreatorAccrual,
    buildCreatorExperienceIdempotencyKey: mockState.buildCreatorExperienceIdempotencyKey,
    buildCreatorExperienceRecordIds: mockState.buildCreatorExperienceRecordIds,
    buildCreatorExperienceTelemetryPayload: mockState.buildCreatorExperienceTelemetryPayload,
    buildCreatorExperienceTransactionDebug: mockState.buildCreatorExperienceTransactionDebug,
    buildSourceAwareBalancePatch: mockState.buildSourceAwareBalancePatch,
    calculateBookingPriceGd: mockState.calculateBookingPriceGd,
    readSourceAwareBalance: mockState.readSourceAwareBalance,
    spendCreatorExperienceGumdrops: mockState.spendCreatorExperienceGumdrops,
}));
vi.mock("@/lib/server/gumdrop-ledger", () => ({
    buildCompletedGumdropTransaction: mockState.buildCompletedGumdropTransaction,
}));
vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: mockState.trackServerEvent,
}));

import { POST } from "@/app/api/creator/bookings/route";

describe("creator bookings route transaction truth", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1", email: "fan@example.com" });
        mockState.setDocument("users", "fan_1", { role: "user", gumDropsBalance: 2000 });
        mockState.setDocument("users", "creator_1", {
            role: "creator",
            creatorSettings: {
                bookingsEnabled: true,
                availabilityWindows: [{ dayOfWeek: 5, startHour: 9, startMinute: 0, endHour: 17, endMinute: 0, serviceTypes: ["phone", "video"] }],
            },
        });
    });

    it("creates booking, user transaction, and creator accrual records", async () => {
        const response = await POST(new NextRequest("http://localhost/api/creator/bookings", {
            method: "POST",
            body: JSON.stringify({
                creatorId: "creator_1",
                serviceType: "video",
                startAt: 1780000000000,
                durationMinutes: 30,
                idempotencyKey: "booking-key-1",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.duplicatePrevented).toBe(false);
        expect(mockState.documents.get("creator_call_bookings/booking_booking-key-1")).toMatchObject({
            userTransactionId: "txn_booking-key-1",
            creatorAccrualId: "accrual_booking-key-1",
            priceGd: 1000,
        });
        expect(mockState.documents.get("creator_ledger_accruals/accrual_booking-key-1")).toMatchObject({
            sourceType: "booking_video",
            idempotencyKey: "booking-key-1",
        });
        expect(mockState.documents.get("transactions/txn_booking-key-1")).toMatchObject({
            verifiedServerSide: true,
        });
    });

    it("prevents duplicate live time charges for the same idempotency key", async () => {
        const payload = {
            creatorId: "creator_1",
            serviceType: "phone",
            startAt: 1780000000000,
            durationMinutes: 30,
            idempotencyKey: "booking-key-2",
        };

        await POST(new NextRequest("http://localhost/api/creator/bookings", {
            method: "POST",
            body: JSON.stringify(payload),
        }));
        const duplicateResponse = await POST(new NextRequest("http://localhost/api/creator/bookings", {
            method: "POST",
            body: JSON.stringify(payload),
        }));
        const duplicateBody = await duplicateResponse.json();

        expect(duplicateResponse.status).toBe(200);
        expect(duplicateBody.duplicatePrevented).toBe(true);
        expect(mockState.spendCreatorExperienceGumdrops).toHaveBeenCalledTimes(1);
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(1);
    });

    it("rejects insufficient balance without writing paid records", async () => {
        mockState.spendCreatorExperienceGumdrops.mockReturnValueOnce({ ok: false, error: "Insufficient purchased balance." } as any);

        const response = await POST(new NextRequest("http://localhost/api/creator/bookings", {
            method: "POST",
            body: JSON.stringify({
                creatorId: "creator_1",
                serviceType: "video",
                startAt: 1780000000000,
                durationMinutes: 30,
                idempotencyKey: "booking-key-3",
            }),
        }));
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toContain("Insufficient purchased balance");
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("transactions/"))).toHaveLength(0);
        expect(Array.from(mockState.documents.keys()).filter((key) => key.startsWith("creator_ledger_accruals/"))).toHaveLength(0);
    });
});
