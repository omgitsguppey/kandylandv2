import type { AdminModerationSecurityAlert, AdminModerationThreadSummary } from "@/lib/admin-moderation";

export type AdminModerationTruthState = "live" | "partial" | "stale" | "failed" | "unavailable" | "simulated" | "not_implemented";

export type AdminModerationControlTowerModel = {
    truthState: AdminModerationTruthState;
    unresolvedAlerts: number;
    highOrCriticalRiskCount: number;
    confirmedEvidenceCount: number;
    heuristicOnlyCount: number;
    failedDataSources: number;
    queueHealth: AdminModerationTruthState;
    lastRefreshedLabel: string;
    selectedAlert: AdminModerationSecurityAlert | null;
    sortedAlerts: AdminModerationSecurityAlert[];
    sortedThreads: AdminModerationThreadSummary[];
};

function formatRelativeTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) return "Not recorded";
    const deltaMinutes = Math.round((timestamp - Date.now()) / 60_000);
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (Math.abs(deltaMinutes) < 60) return formatter.format(deltaMinutes, "minute");
    const deltaHours = Math.round(deltaMinutes / 60);
    if (Math.abs(deltaHours) < 48) return formatter.format(deltaHours, "hour");
    return formatter.format(Math.round(deltaHours / 24), "day");
}

function alertRank(alert: AdminModerationSecurityAlert) {
    const tierRank = { critical: 5, high: 4, review: 3, watch: 2, low: 1 }[alert.riskTier] ?? 0;
    const confidenceRank = { confirmed: 3, strong: 2, heuristic: 1, unknown: 0 }[alert.riskConfidence] ?? 0;
    return tierRank * 1000 + confidenceRank * 100 + alert.riskScore;
}

function threadRank(thread: AdminModerationThreadSummary) {
    const unread = Math.max(thread.unreadCountForCreator, thread.unreadCountForUser) > 0 ? 1_000_000 : 0;
    return unread + (thread.lastMessageAt || 0);
}

export function buildAdminModerationControlTowerModel(input: {
    threads: AdminModerationThreadSummary[];
    alerts: AdminModerationSecurityAlert[];
    threadsError?: Error | null;
    messagesError?: Error | null;
    alertsError?: Error | null;
    selectedAlertId?: string | null;
}): AdminModerationControlTowerModel {
    const failedDataSources = [input.threadsError, input.messagesError, input.alertsError].filter(Boolean).length;
    const sortedAlerts = [...input.alerts].sort((left, right) => {
        const rankDelta = alertRank(right) - alertRank(left);
        return rankDelta || right.timestamp - left.timestamp;
    });
    const sortedThreads = [...input.threads].sort((left, right) => threadRank(right) - threadRank(left));
    const selectedAlert = sortedAlerts.find((alert) => alert.id === input.selectedAlertId) ?? sortedAlerts[0] ?? null;
    const highOrCriticalRiskCount = sortedAlerts.filter((alert) => alert.riskTier === "high" || alert.riskTier === "critical").length;
    const confirmedEvidenceCount = sortedAlerts.filter((alert) => alert.riskConfidence === "confirmed").length;
    const heuristicOnlyCount = sortedAlerts.filter((alert) => alert.riskConfidence === "heuristic").length;
    const newestTimestamp = Math.max(0, ...sortedAlerts.map((alert) => alert.timestamp), ...sortedThreads.map((thread) => thread.lastMessageAt));

    return {
        truthState: failedDataSources > 0
            ? sortedAlerts.length > 0 || sortedThreads.length > 0
                ? "partial"
                : "failed"
            : "live",
        unresolvedAlerts: sortedAlerts.length,
        highOrCriticalRiskCount,
        confirmedEvidenceCount,
        heuristicOnlyCount,
        failedDataSources,
        queueHealth: input.threadsError ? sortedThreads.length > 0 ? "partial" : "failed" : "live",
        lastRefreshedLabel: formatRelativeTime(newestTimestamp),
        selectedAlert,
        sortedAlerts,
        sortedThreads,
    };
}
