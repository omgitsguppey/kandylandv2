import { describe, expect, it } from "vitest";

import { buildCreatorBookingSlots } from "@/lib/creator-booking-slots";

describe("creator booking slots", () => {
    it("generates slots from a Friday evening availability window", () => {
        const result = buildCreatorBookingSlots({
            availabilityTimezone: "UTC",
            availabilityWindows: [{
                id: "fri-live",
                dayOfWeek: 5,
                startHour: 18,
                startMinute: 0,
                endHour: 21,
                endMinute: 0,
                serviceTypes: ["phone", "video"],
            }],
            serviceType: "video",
            durationMinutes: 30,
            existingBookings: [],
            nowMs: Date.UTC(2026, 4, 15, 10, 0, 0),
            daysAhead: 1,
            slotIntervalMinutes: 30,
        });

        expect(result.reason).toBe("available");
        expect(result.slots.map((slot) => slot.startAt)).toEqual([
            Date.UTC(2026, 4, 15, 18, 0, 0),
            Date.UTC(2026, 4, 15, 18, 30, 0),
            Date.UTC(2026, 4, 15, 19, 0, 0),
            Date.UTC(2026, 4, 15, 19, 30, 0),
            Date.UTC(2026, 4, 15, 20, 0, 0),
            Date.UTC(2026, 4, 15, 20, 30, 0),
        ]);
        expect(result.slots[0]).toMatchObject({
            endAt: Date.UTC(2026, 4, 15, 18, 30, 0),
            serviceType: "video",
            durationMinutes: 30,
            slotKey: `video:${Date.UTC(2026, 4, 15, 18, 0, 0)}:30`,
        });
    });

    it("respects phone and video service filters", () => {
        const result = buildCreatorBookingSlots({
            availabilityTimezone: "UTC",
            availabilityWindows: [{
                id: "fri-phone",
                dayOfWeek: 5,
                startHour: 18,
                startMinute: 0,
                endHour: 19,
                endMinute: 0,
                serviceTypes: ["phone"],
            }],
            serviceType: "video",
            durationMinutes: 30,
            existingBookings: [],
            nowMs: Date.UTC(2026, 4, 15, 10, 0, 0),
            daysAhead: 1,
            slotIntervalMinutes: 30,
        });

        expect(result).toMatchObject({
            slots: [],
            reason: "service_not_available",
        });
    });

    it("excludes overlapping booked and past slots, including upcoming and in-progress bookings", () => {
        const result = buildCreatorBookingSlots({
            availabilityTimezone: "UTC",
            availabilityWindows: [{
                id: "fri-live",
                dayOfWeek: 5,
                startHour: 12,
                startMinute: 0,
                endHour: 13,
                endMinute: 0,
                serviceTypes: ["phone"],
            }],
            serviceType: "phone",
            durationMinutes: 30,
            existingBookings: [{
                startAt: Date.UTC(2026, 4, 15, 12, 30, 0),
                endAt: Date.UTC(2026, 4, 15, 13, 0, 0),
                status: "upcoming",
            }],
            nowMs: Date.UTC(2026, 4, 15, 12, 15, 0),
            daysAhead: 1,
            slotIntervalMinutes: 15,
        });

        expect(result.slots).toEqual([]);
        expect(result.reason).toBe("no_available_slots");
    });

    it("does not block slots for canceled or completed bookings", () => {
        const result = buildCreatorBookingSlots({
            availabilityTimezone: "UTC",
            availabilityWindows: [{
                id: "fri-live",
                dayOfWeek: 5,
                startHour: 12,
                startMinute: 0,
                endHour: 13,
                endMinute: 0,
                serviceTypes: ["phone"],
            }],
            serviceType: "phone",
            durationMinutes: 30,
            existingBookings: [{
                startAt: Date.UTC(2026, 4, 15, 12, 0, 0),
                endAt: Date.UTC(2026, 4, 15, 12, 30, 0),
                status: "canceled",
            }, {
                startAt: Date.UTC(2026, 4, 15, 12, 30, 0),
                endAt: Date.UTC(2026, 4, 15, 13, 0, 0),
                status: "completed",
            }],
            nowMs: Date.UTC(2026, 4, 15, 10, 0, 0),
            daysAhead: 1,
            slotIntervalMinutes: 30,
        });

        expect(result.reason).toBe("available");
        expect(result.slots).toHaveLength(2);
    });

    it("returns creator_availability_not_configured when availability is not configured", () => {
        expect(buildCreatorBookingSlots({
            availabilityTimezone: "UTC",
            availabilityWindows: [],
            serviceType: "phone",
            durationMinutes: 30,
            existingBookings: [],
            nowMs: Date.UTC(2026, 4, 15, 12, 0, 0),
        })).toMatchObject({
            slots: [],
            reason: "creator_availability_not_configured",
        });
    });

    it("returns invalid_duration when duration is below the booking minimum", () => {
        expect(buildCreatorBookingSlots({
            availabilityTimezone: "UTC",
            availabilityWindows: [{
                id: "fri-live",
                dayOfWeek: 5,
                startHour: 12,
                startMinute: 0,
                endHour: 13,
                endMinute: 0,
                serviceTypes: ["phone"],
            }],
            serviceType: "phone",
            durationMinutes: 10,
            bookingMinimumMinutes: 15,
            existingBookings: [],
            nowMs: Date.UTC(2026, 4, 15, 10, 0, 0),
        })).toMatchObject({
            slots: [],
            reason: "invalid_duration",
        });
    });
});
