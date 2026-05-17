import { CREATOR_BOOKING_MIN_MINUTES, type CreatorAvailabilityWindow } from "@/lib/creator-experiences";

export type CreatorBookingSlot = {
    startAt: number;
    endAt: number;
    label: string;
    serviceType: "phone" | "video";
    durationMinutes: number;
    slotKey: string;
};

export type CreatorBookingSlotReason =
    | "available"
    | "creator_availability_not_configured"
    | "no_available_slots"
    | "invalid_duration"
    | "service_not_available"
    | "source_limited";

export type CreatorBookingSlotResult = {
    slots: CreatorBookingSlot[];
    reason: CreatorBookingSlotReason;
};

export type CreatorBookingSlotsResult = CreatorBookingSlotResult;

type ZonedParts = {
    year: number;
    month: number;
    day: number;
    dayOfWeek: number;
    hour: number;
    minute: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
};

function normalizePositiveInteger(value: unknown, fallback: number) {
    return typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.round(value))
        : fallback;
}

function getZonedParts(timestamp: number, timeZone: string): ZonedParts {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    const parts = formatter.formatToParts(new Date(timestamp));
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const weekdayToken = parts.find((part) => part.type === "weekday")?.value.toLowerCase().slice(0, 3) ?? "sun";

    return {
        year: read("year"),
        month: read("month"),
        day: read("day"),
        dayOfWeek: WEEKDAY_INDEX[weekdayToken] ?? 0,
        hour: read("hour"),
        minute: read("minute"),
    };
}

function zonedComparableMs(parts: Pick<ZonedParts, "year" | "month" | "day" | "hour" | "minute">) {
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
}

function zonedLocalTimeToUtcMs(input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    timeZone: string;
}) {
    const desiredComparable = zonedComparableMs(input);
    let guess = desiredComparable;

    for (let attempt = 0; attempt < 4; attempt += 1) {
        const actual = getZonedParts(guess, input.timeZone);
        const actualComparable = zonedComparableMs(actual);
        const diffMs = actualComparable - desiredComparable;
        if (diffMs === 0) {
            return guess;
        }
        guess -= diffMs;
    }

    return guess;
}

function addLocalDays(parts: Pick<ZonedParts, "year" | "month" | "day">, days: number) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 0, 0, 0, 0));
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        dayOfWeek: date.getUTCDay(),
    };
}

function bookingOverlapsExisting(input: {
    startAt: number;
    endAt: number;
    existingBookings: Array<Record<string, unknown>>;
}) {
    return input.existingBookings.some((booking) => {
        const status = typeof booking.status === "string" ? booking.status : "";
        if (status !== "booked" && status !== "upcoming" && status !== "in_progress") {
            return false;
        }

        const existingStart = normalizePositiveInteger(booking.startAt, 0);
        const existingEnd = normalizePositiveInteger(booking.endAt, 0);
        if (existingStart <= 0 || existingEnd <= existingStart) {
            return false;
        }

        return input.startAt < existingEnd && input.endAt > existingStart;
    });
}

function formatSlotLabel(input: {
    startAt: number;
    endAt: number;
    timeZone: string;
}) {
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: input.timeZone,
        weekday: "short",
        month: "short",
        day: "numeric",
    });
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: input.timeZone,
        hour: "numeric",
        minute: "2-digit",
    });

    return `${dateFormatter.format(new Date(input.startAt))}, ${timeFormatter.format(new Date(input.startAt))}-${timeFormatter.format(new Date(input.endAt))}`;
}

export function buildCreatorBookingSlots(input: {
    availabilityWindows: CreatorAvailabilityWindow[] | Array<Record<string, unknown>>;
    availabilityTimezone: string;
    serviceType: "phone" | "video";
    durationMinutes: number;
    existingBookings: Array<Record<string, unknown>>;
    bookingMinimumMinutes?: number;
    nowMs?: number;
    daysAhead?: number;
    slotIntervalMinutes?: number;
}): CreatorBookingSlotsResult {
    const windows = Array.isArray(input.availabilityWindows)
        ? input.availabilityWindows.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
        : [];
    if (windows.length === 0) {
        return {
            slots: [],
            reason: "creator_availability_not_configured",
        };
    }

    const timeZone = input.availabilityTimezone?.trim() || "UTC";
    const nowMs = normalizePositiveInteger(input.nowMs, Date.now());
    const daysAhead = Math.max(1, normalizePositiveInteger(input.daysAhead, 14));
    const slotIntervalMinutes = Math.max(5, normalizePositiveInteger(input.slotIntervalMinutes, 15));
    const bookingMinimumMinutes = Math.max(CREATOR_BOOKING_MIN_MINUTES, normalizePositiveInteger(input.bookingMinimumMinutes, CREATOR_BOOKING_MIN_MINUTES));
    const durationMinutes = normalizePositiveInteger(input.durationMinutes, 0);
    if (durationMinutes < bookingMinimumMinutes) {
        return {
            slots: [],
            reason: "invalid_duration",
        };
    }
    const durationMs = durationMinutes * 60 * 1000;
    const today = getZonedParts(nowMs, timeZone);
    const slots: CreatorBookingSlot[] = [];
    let serviceAvailable = false;

    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset += 1) {
        const localDate = addLocalDays(today, dayOffset);
        const dayWindows = windows.filter((window) => {
            const windowDay = normalizePositiveInteger(window.dayOfWeek, -1);
            const services = Array.isArray(window.serviceTypes)
                ? window.serviceTypes.filter((entry): entry is "phone" | "video" => entry === "phone" || entry === "video")
                : [];
            if (services.includes(input.serviceType)) {
                serviceAvailable = true;
            }
            return windowDay === localDate.dayOfWeek && services.includes(input.serviceType);
        });

        for (const window of dayWindows) {
            const startMinute = (normalizePositiveInteger(window.startHour, 0) * 60)
                + normalizePositiveInteger(window.startMinute, 0);
            const endMinute = (normalizePositiveInteger(window.endHour, 0) * 60)
                + normalizePositiveInteger(window.endMinute, 0);
            const lastStartMinute = endMinute - durationMinutes;

            for (let minute = startMinute; minute <= lastStartMinute; minute += slotIntervalMinutes) {
                const startAt = zonedLocalTimeToUtcMs({
                    year: localDate.year,
                    month: localDate.month,
                    day: localDate.day,
                    hour: Math.floor(minute / 60),
                    minute: minute % 60,
                    timeZone,
                });
                const endAt = startAt + durationMs;
                if (startAt <= nowMs) {
                    continue;
                }
                if (bookingOverlapsExisting({ startAt, endAt, existingBookings: input.existingBookings ?? [] })) {
                    continue;
                }

                slots.push({
                    startAt,
                    endAt,
                    label: formatSlotLabel({ startAt, endAt, timeZone }),
                    serviceType: input.serviceType,
                    durationMinutes,
                    slotKey: `${input.serviceType}:${startAt}:${durationMinutes}`,
                });
            }
        }
    }

    return {
        slots,
        reason: slots.length > 0 ? "available" : serviceAvailable ? "no_available_slots" : "service_not_available",
    };
}
