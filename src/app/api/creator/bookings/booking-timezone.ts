const WEEKDAY_INDEX: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
};

export function getTimeZoneParts(timestamp: number, timeZone: string) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    const parts = formatter.formatToParts(new Date(timestamp));
    const weekdayToken = parts.find((part) => part.type === "weekday")?.value.toLowerCase().slice(0, 3) ?? "sun";
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

    return {
        dayOfWeek: WEEKDAY_INDEX[weekdayToken] ?? 0,
        minutesSinceMidnight: (hour * 60) + minute,
    };
}

export function isWithinAnyWindow(
    startAt: number,
    durationMinutes: number,
    serviceType: "phone" | "video",
    windows: Array<Record<string, unknown>>,
    timeZone: string,
) {
    const startParts = getTimeZoneParts(startAt, timeZone);
    const endParts = getTimeZoneParts(startAt + (durationMinutes * 60 * 1000), timeZone);
    const dayOfWeek = startParts.dayOfWeek;
    const startMinutes = startParts.minutesSinceMidnight;
    const endMinutes = startMinutes + durationMinutes;

    if (endParts.dayOfWeek !== dayOfWeek) {
        return false;
    }

    return windows.some((window) => {
        const services = Array.isArray(window.serviceTypes)
            ? window.serviceTypes.filter((entry): entry is "phone" | "video" => entry === "phone" || entry === "video")
            : [];
        if (!services.includes(serviceType)) {
            return false;
        }
        const windowDay = typeof window.dayOfWeek === "number" ? Math.round(window.dayOfWeek) : -1;
        const windowStart = ((typeof window.startHour === "number" ? Math.round(window.startHour) : 0) * 60)
            + (typeof window.startMinute === "number" ? Math.round(window.startMinute) : 0);
        const windowEnd = ((typeof window.endHour === "number" ? Math.round(window.endHour) : 0) * 60)
            + (typeof window.endMinute === "number" ? Math.round(window.endMinute) : 0);

        return windowDay === dayOfWeek && startMinutes >= windowStart && endMinutes <= windowEnd;
    });
}
