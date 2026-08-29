export function formatRelative(value?: number | null, fallback = "Not generated") {
    if (!value) return fallback;
    const deltaMs = Math.max(0, Date.now() - value);
    const minutes = Math.floor(deltaMs / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export function formatRecentActivity(timestamp?: number) {
    return formatRelative(timestamp, "No recent activity");
}

export function formatUtcTimestamp(timestamp?: number | null, fallback = "unavailable") {
    return timestamp ? new Date(timestamp).toISOString() : fallback;
}

export function formatWindowHours(windowMs?: number) {
    if (!windowMs) return "current";
    return `${Math.max(1, Math.round(windowMs / 3_600_000))}h`;
}
