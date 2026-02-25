/**
 * Timezone utility — all timing normalized to Central Standard Time (America/Chicago).
 *
 * Used by:
 * - Admin create form (date pickers display/parse CST)
 * - Checkin route (day boundary in CST)
 * - Drop auto-rotation (scheduled times in CST)
 */

export const APP_TIMEZONE = "America/Chicago";

/**
 * Format a UTC timestamp as a `datetime-local` input string in CST.
 * Returns format: "YYYY-MM-DDTHH:MM"
 */
export function toCSTString(timestamp: number): string {
    const date = new Date(timestamp);
    const cstString = date.toLocaleString("en-US", {
        timeZone: APP_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    // "MM/DD/YYYY, HH:MM" → "YYYY-MM-DDTHH:MM"
    const [datePart, timePart] = cstString.split(", ");
    const [month, day, year] = datePart.split("/");
    return `${year}-${month}-${day}T${timePart}`;
}

/**
 * Parse a `datetime-local` input string as CST and return UTC milliseconds.
 * Input format: "YYYY-MM-DDTHH:MM"
 */
export function fromCSTInput(datetimeLocal: string): number {
    // Build an ISO-like string and use Intl to resolve the CST offset
    const [datePart, timePart] = datetimeLocal.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);

    // Create a date in the CST timezone by finding the UTC offset
    // Use a reference date to determine the current CST/CDT offset
    const refDate = new Date(Date.UTC(year, month - 1, day, hour, minute));

    // Get the offset by comparing formatted CST time with UTC
    const cstParts = new Intl.DateTimeFormat("en-US", {
        timeZone: APP_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(refDate);

    const cstHour = Number(cstParts.find(p => p.type === "hour")?.value ?? 0);
    const cstDay = Number(cstParts.find(p => p.type === "day")?.value ?? 1);

    // Calculate offset: UTC hour - CST hour (adjusting for day boundary)
    let offsetHours = hour - cstHour;
    if (cstDay !== day) {
        offsetHours += (day - cstDay) * 24;
    }

    // The actual UTC time = local CST time + offset
    return Date.UTC(year, month - 1, day, hour + offsetHours, minute);
}

/**
 * Get CST day boundaries (midnight-to-midnight) for a given UTC timestamp.
 * Returns { startOfDay, endOfDay } as UTC milliseconds.
 */
export function getCSTDayBoundaries(utcTimestamp: number): { startOfDay: number; endOfDay: number } {
    const date = new Date(utcTimestamp);

    // Get the CST date components
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: APP_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = Number(parts.find(p => p.type === "year")?.value ?? 2026);
    const month = Number(parts.find(p => p.type === "month")?.value ?? 1);
    const day = Number(parts.find(p => p.type === "day")?.value ?? 1);

    // Midnight CST for this day → UTC
    const startOfDay = fromCSTInput(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00`);
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    return { startOfDay, endOfDay };
}

/**
 * Get default CST date strings for create form (now → 7 days from now).
 */
export function getDefaultCSTDates(): { validFrom: string; validUntil: string } {
    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
    return {
        validFrom: toCSTString(now),
        validUntil: toCSTString(weekFromNow),
    };
}
