import { APP_TIMEZONE } from "@/lib/timezone";

const COMPACT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    month: "numeric",
    day: "numeric",
    year: "2-digit",
});

const DETAIL_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
});

const TIME_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
});

function formatTimestampTime(timestamp: number) {
    const parts = TIME_PARTS_FORMATTER.formatToParts(new Date(timestamp));
    const hour = parts.find((part) => part.type === "hour")?.value ?? "";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
    const dayPeriod = (parts.find((part) => part.type === "dayPeriod")?.value ?? "").toUpperCase();

    return minute === "00" ? `${hour}${dayPeriod}` : `${hour}:${minute}${dayPeriod}`;
}

function formatParsedTime(hour24: number, minute: number) {
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return minute === 0 ? `${hour12}${suffix}` : `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
}

export function formatAdminCompactDateTime(timestamp: number) {
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return "TBD";
    }

    return `${COMPACT_DATE_FORMATTER.format(new Date(timestamp))} @ ${formatTimestampTime(timestamp)}`;
}

export function formatAdminDetailDateTime(timestamp: number) {
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return "TBD";
    }

    return `${DETAIL_DATE_FORMATTER.format(new Date(timestamp))} @ ${formatTimestampTime(timestamp)}`;
}

export function formatAdminTimeLabel(value: string) {
    const match = value.match(/^(\d{2}):(\d{2})$/u);
    if (!match) {
        return value;
    }

    const hour24 = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
        return value;
    }

    return formatParsedTime(hour24, minute);
}
