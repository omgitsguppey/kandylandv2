import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SeedDoc = {
    id: string;
    data: Record<string, unknown>;
};

const mockState = vi.hoisted(() => {
    const collections = new Map<string, SeedDoc[]>();
    const documents = new Map<string, Record<string, unknown>>();

    function buildQuery(name: string, filters: Array<{ field: string; value: unknown }> = []) {
        return {
            where(field: string, _operator: string, value: unknown) {
                return buildQuery(name, [...filters, { field, value }]);
            },
            doc(id: string) {
                return {
                    async get() {
                        return {
                            exists: documents.has(`${name}/${id}`),
                            data: () => documents.get(`${name}/${id}`),
                        };
                    },
                };
            },
            async get() {
                const docs = (collections.get(name) ?? [])
                    .filter((entry) => filters.every((filter) => entry.data[filter.field] === filter.value))
                    .map((entry) => ({
                        id: entry.id,
                        data: () => entry.data,
                    }));

                return {
                    docs,
                    empty: docs.length === 0,
                    size: docs.length,
                };
            },
        };
    }

    return {
        guardApiRequest: vi.fn(),
        handleApiError: vi.fn(),
        adminDb: {
            collection(name: string) {
                return buildQuery(name);
            },
        },
        collections,
        documents,
        reset() {
            collections.clear();
            documents.clear();
            this.guardApiRequest.mockReset();
            this.handleApiError.mockReset();
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/auth", () => ({
    handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: mockState.adminDb,
}));
vi.mock("@/lib/server/rate-limit", () => ({
    STANDARD: {},
}));
vi.mock("@/lib/creator-experiences", () => ({
    CREATOR_BOOKING_MIN_MINUTES: 5,
    CREATOR_COLLECTIONS: {
        bookings: "creator_call_bookings",
        subscriptions: "creator_subscriptions",
    },
    isCreatorRole: (role: unknown) => role === "creator" || role === "admin",
}));
vi.mock("@/lib/server/creator-experiences", () => ({
    buildBookingSlotKey: vi.fn(),
    buildCreatorAccrual: vi.fn(),
    buildSourceAwareBalancePatch: vi.fn(),
    calculateBookingPriceGd: vi.fn(),
    readSourceAwareBalance: vi.fn(),
    spendCreatorExperienceGumdrops: vi.fn(),
}));
vi.mock("@/lib/server/gumdrop-ledger", () => ({
    buildCompletedGumdropTransaction: vi.fn(),
}));
vi.mock("@/lib/server/analytics", () => ({
    trackServerEvent: vi.fn(),
}));

import { GET } from "@/app/api/creator/bookings/route";
import { getTimeZoneParts, isWithinAnyWindow } from "@/app/api/creator/bookings/booking-timezone";

describe("GET /api/creator/bookings", () => {
    beforeEach(() => {
        mockState.reset();
        mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
        }, { status: 500 }));
    });

    it("scopes creatorId reads to the caller's own booking when the caller is a fan", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1" });
        mockState.documents.set("users/fan_1", { role: "user" });
        mockState.documents.set("users/creator_1", { role: "creator" });
        mockState.documents.set("creator_subscriptions/fan_1__creator_1", { status: "active" });
        mockState.collections.set("creator_call_bookings", [
            { id: "booking_1", data: { creatorId: "creator_1", userId: "fan_1", status: "booked" } },
            { id: "booking_2", data: { creatorId: "creator_1", userId: "fan_2", status: "booked" } },
        ]);

        const response = await GET(new NextRequest("http://localhost/api/creator/bookings?creatorId=creator_1"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.subscriptionActive).toBe(true);
        expect(body.bookings).toHaveLength(1);
        expect(body.bookings[0]).toMatchObject({ id: "booking_1", userId: "fan_1" });
    });

    it("returns the full creator queue when the creator is reading their own bookings", async () => {
        mockState.guardApiRequest.mockResolvedValue({ uid: "creator_1" });
        mockState.documents.set("users/creator_1", { role: "creator" });
        mockState.collections.set("creator_call_bookings", [
            { id: "booking_1", data: { creatorId: "creator_1", userId: "fan_1", status: "booked" } },
            { id: "booking_2", data: { creatorId: "creator_1", userId: "fan_2", status: "booked" } },
        ]);

        const response = await GET(new NextRequest("http://localhost/api/creator/bookings?creatorId=creator_1"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.bookings).toHaveLength(2);
    });
});

describe("creator booking timezone availability helpers", () => {
    it("maps timestamps into the creator timezone instead of UTC", () => {
        const utcNoon = Date.UTC(2026, 3, 17, 12, 0, 0);
        const chicagoParts = getTimeZoneParts(utcNoon, "America/Chicago");

        expect(chicagoParts.dayOfWeek).toBe(5);
        expect(chicagoParts.minutesSinceMidnight).toBe(7 * 60);
    });

    it("accepts a creator-local booking window for non-UTC creators", () => {
        const bookingStartAt = Date.UTC(2026, 3, 17, 16, 0, 0);
        const windows = [
            {
                dayOfWeek: 5,
                startHour: 9,
                startMinute: 0,
                endHour: 12,
                endMinute: 0,
                serviceTypes: ["phone", "video"],
            },
        ];

        expect(isWithinAnyWindow(bookingStartAt, 30, "video", windows, "America/Los_Angeles")).toBe(true);
        expect(isWithinAnyWindow(bookingStartAt, 30, "video", windows, "UTC")).toBe(false);
    });

    it("rejects creator-local windows when the booking crosses into the next local day", () => {
        const bookingStartAt = Date.UTC(2026, 3, 18, 4, 45, 0);
        const windows = [
            {
                dayOfWeek: 5,
                startHour: 23,
                startMinute: 30,
                endHour: 23,
                endMinute: 59,
                serviceTypes: ["phone"],
            },
        ];

        expect(isWithinAnyWindow(bookingStartAt, 30, "phone", windows, "America/Chicago")).toBe(false);
    });
});
