import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

export interface AdminNotificationFunnelItemInput {
    label: string;
    count: number;
}

export interface AdminNotificationActionItemInput {
    label: string;
    value: number;
}

export interface AdminNotificationReminderReasonInput {
    label: string;
    count: number;
}

export type AdminNotificationFunnelMetricKey =
    | "prompted"
    | "enabled"
    | "sent"
    | "opened"
    | "read"
    | "cleared"
    | "duplicatePrevented"
    | "failedSkipped";

export type NotificationFunnelStepSourceTruth =
    | "first_party_telemetry"
    | "permission_telemetry"
    | "notification_records"
    | "debug_delivery"
    | "mutation_telemetry"
    | "not_observed"
    | "missing"
    | "unknown";

export type NotificationFunnelStepFreshnessState = "live" | "recent" | "stale" | "not_observed" | "unknown";
export type NotificationFunnelStepStatus = "loaded" | "partial" | "waiting" | "unavailable" | "error";

export interface NotificationFunnelStep {
    key: AdminNotificationFunnelMetricKey;
    label: string;
    count: number | null;
    sourceTruth: NotificationFunnelStepSourceTruth;
    freshnessState: NotificationFunnelStepFreshnessState;
    status: NotificationFunnelStepStatus;
    denominator?: string;
    explanation: string;
    displayValue: string;
    sourceLabel: string;
    truthState: AdminSurfaceState;
    fakeZeroPrevented: boolean;
}

export interface NotificationReminderReasonSummary {
    reason: "tasks_and_checkin" | "tasks_only" | "checkin_only" | "unknown";
    count: number;
    sourceTruth: string;
}

export interface AdminNotificationFunnelModel {
    hasData: boolean;
    generatedAtUtc: string | null;
    range: string;
    state: "complete" | "partial" | "stale" | "unavailable";
    sourceMode: "event_counts_partial" | "notification_id_linked" | "waiting";
    truthLabel: "PARTIAL" | "STALE" | "WAIT" | "UNAVAILABLE";
    denominatorMode: "event_counts" | "notification_id_linked" | "user_linked" | "partial";
    visibleCopy: string;
    warnings: string[];
    missingSourceCount: number;
    prompt: NotificationFunnelStep;
    permissionEnabled: NotificationFunnelStep;
    sent: NotificationFunnelStep;
    opened: NotificationFunnelStep;
    read: NotificationFunnelStep;
    cleared: NotificationFunnelStep;
    duplicatePrevented: NotificationFunnelStep;
    failedSkipped: NotificationFunnelStep;
    metrics: NotificationFunnelStep[];
    reminderReasons: NotificationReminderReasonSummary[];
    reminderReasonSummary: string;
    reminderReasonTotal: number;
    reminderReasonsSourceLabel: string;
    reminderReasonsFreshness: NotificationFunnelStepFreshnessState;
    debug: {
        generatedAtUtc: string | null;
        selectedRange: string;
        state: AdminNotificationFunnelModel["state"];
        denominatorMode: AdminNotificationFunnelModel["denominatorMode"];
        missingSourceCount: number;
        funnelSourceMode: string;
        promptCount: NotificationFunnelStep;
        enabledCount: NotificationFunnelStep;
        sentCount: NotificationFunnelStep;
        openCount: NotificationFunnelStep;
        readCount: NotificationFunnelStep;
        clearAllCount: NotificationFunnelStep;
        duplicatePreventedCount: NotificationFunnelStep;
        failedSkippedCount: NotificationFunnelStep;
        reminderReasons: NotificationReminderReasonSummary[];
        duplicateCreatedPreventedCount: number | null;
        duplicatePushPreventedCount: number | null;
        duplicateBrowserDisplayPreventedCount: number | null;
        skippedPermissionDeniedCount: number | null;
        skippedMissingTokenCount: number | null;
        skippedPreferencesDisabledCount: number | null;
        queuedDropReturnLiveNotificationCount: number | null;
        queuedDropReturnLiveSkippedCount: number | null;
        foregroundMessageCount: number | null;
        backgroundMessageCount: number | null;
        serviceWorkerDisplayCount: number | null;
        autoDisplayedByFcmCount: number | null;
        manualShowNotificationCount: number | null;
        notificationClickCount: NotificationFunnelStep;
        notificationReadPersistenceLagMs: number | null;
        unreadCountLocal: number | null;
        unreadCountServer: number | null;
        unreadCountReconciled: boolean | null;
        stale: boolean;
        cache: boolean;
        server: boolean;
        fallback: boolean;
        lastValidatedAt: number | null;
        refreshStatus: string;
        duplicateRefreshPrevented: boolean;
        notificationRows: Array<Record<string, unknown>>;
        browserSupportFlags: Record<string, boolean | null>;
    };
}

const ACTION_LABELS: Record<string, AdminNotificationFunnelMetricKey> = {
    dropdown: "prompted",
    open: "opened",
    opens: "opened",
    "notification opened": "opened",
    read: "read",
    reads: "read",
    "notification marked read": "read",
    "notifications marked read": "cleared",
    "clear all": "cleared",
    "clear all notifications": "cleared",
    "notification cleared": "cleared",
    enable: "enabled",
    enabled: "enabled",
    "notifications enabled": "enabled",
};

const NO_PERMISSION_SAMPLE_LABEL = "No permission sample";
const DEBUG_NOTIFICATION_RECORDS_LABEL = "Debug notification records";
const TASK_REMINDER_TELEMETRY_LABEL = "task reminder telemetry";
const DUPLICATE_PREVENTION_NOT_INSTRUMENTED_COPY = "Duplicate-prevention telemetry not instrumented.";
const DELIVERY_DEBUG_UNAVAILABLE_COPY = "Delivery counts unavailable from Debug source.";

function findFunnelCount(items: AdminNotificationFunnelItemInput[], needles: string[]) {
    const lowerNeedles = needles.map((needle) => needle.toLowerCase());
    const match = items.find((item) => lowerNeedles.some((needle) => item.label.toLowerCase().includes(needle)));
    return match ? Math.max(0, Number(match.count) || 0) : null;
}

function findActionValue(items: AdminNotificationActionItemInput[], key: AdminNotificationFunnelMetricKey) {
    const match = items.find((item) => ACTION_LABELS[item.label.toLowerCase()] === key);
    return match ? Math.max(0, Number(match.value) || 0) : null;
}

function formatMetricValue(value: number | null, labelWhenMissing = "Unavailable") {
    return value === null ? labelWhenMissing : value.toLocaleString();
}

function freshnessStateFromResponse(response?: HistoricalAnalyticsResponse): NotificationFunnelStepFreshnessState {
    if (!response) return "unknown";
    if (response.cacheState === "stale" || response.staleButVerified) return "stale";
    return "recent";
}

function truthStateForStep(status: NotificationFunnelStepStatus, freshnessState: NotificationFunnelStepFreshnessState): AdminSurfaceState {
    if (status === "waiting") return "loading";
    if (status === "unavailable") return "unavailable";
    if (status === "error") return "failed";
    if (freshnessState === "stale") return "stale";
    if (status === "partial") return "degraded";
    return "live";
}

function buildStep(input: {
    key: AdminNotificationFunnelMetricKey;
    label: string;
    count: number | null;
    hasVerifiedSample: boolean;
    sourceTruth: NotificationFunnelStepSourceTruth;
    sourceLabel: string;
    explanation: string;
    denominator?: string;
    freshnessState: NotificationFunnelStepFreshnessState;
    missingDisplayValue?: string;
}): NotificationFunnelStep {
    const status: NotificationFunnelStepStatus = input.count !== null
        ? "loaded"
        : input.hasVerifiedSample
            ? "loaded"
            : "unavailable";
    const displayValue = input.count !== null
        ? formatMetricValue(input.count)
        : input.missingDisplayValue ?? "Unavailable";

    return {
        key: input.key,
        label: input.label,
        count: input.count,
        sourceTruth: input.sourceTruth,
        freshnessState: input.count === null && !input.hasVerifiedSample ? "not_observed" : input.freshnessState,
        status,
        denominator: input.denominator,
        explanation: input.explanation,
        displayValue,
        sourceLabel: input.sourceLabel,
        truthState: truthStateForStep(status, input.freshnessState),
        fakeZeroPrevented: input.count === null,
    };
}

function normalizeReminderReason(label: string): NotificationReminderReasonSummary["reason"] {
    const lower = label.toLowerCase();
    if (lower.includes("tasks + check-in")) return "tasks_and_checkin";
    if (lower.includes("tasks only")) return "tasks_only";
    if (lower.includes("check-in only")) return "checkin_only";
    return "unknown";
}

export function buildAdminNotificationFunnelModel(input: {
    funnelItems: AdminNotificationFunnelItemInput[];
    actionItems: AdminNotificationActionItemInput[];
    reminderReasons: AdminNotificationReminderReasonInput[];
    selectedRange?: string;
    response?: HistoricalAnalyticsResponse;
    loading?: boolean;
}) : AdminNotificationFunnelModel {
    const generatedAtUtc = input.response?.generatedAtMs ? new Date(input.response.generatedAtMs).toISOString() : null;
    const stale = Boolean(input.response && (input.response.cacheState === "stale" || input.response.staleButVerified));
    const freshnessState = freshnessStateFromResponse(input.response);
    const promptCount = findFunnelCount(input.funnelItems, ["prompt view", "prompted"]) ?? findActionValue(input.actionItems, "prompted");
    const enabledCount = findFunnelCount(input.funnelItems, ["notifications enabled", "enabled"]) ?? findActionValue(input.actionItems, "enabled");
    const openedCount = findFunnelCount(input.funnelItems, ["notifications opened", "opened"]) ?? findActionValue(input.actionItems, "opened");
    const readCount = findFunnelCount(input.funnelItems, ["marked read", "read"]) ?? findActionValue(input.actionItems, "read");
    const clearedCount = findActionValue(input.actionItems, "cleared");

    const prompt = buildStep({
        key: "prompted",
        label: "Prompted",
        count: promptCount,
        hasVerifiedSample: promptCount !== null,
        sourceTruth: promptCount !== null ? "first_party_telemetry" : "missing",
        sourceLabel: "first-party prompt telemetry",
        explanation: "Prompt events are telemetry counts, not linked notification deliveries.",
        denominator: "event counts",
        freshnessState,
    });
    const permissionEnabled = buildStep({
        key: "enabled",
        label: "Enabled",
        count: enabledCount,
        hasVerifiedSample: enabledCount !== null,
        sourceTruth: enabledCount !== null ? "permission_telemetry" : "missing",
        sourceLabel: "notification permission telemetry",
        explanation: enabledCount !== null
            ? "Permission-enabled count is a verified telemetry sample for this range."
            : `${NO_PERMISSION_SAMPLE_LABEL}. Permission telemetry may be missing or not observed in this range.`,
        denominator: enabledCount !== null ? "permission telemetry sample" : "no permission sample",
        freshnessState,
        missingDisplayValue: NO_PERMISSION_SAMPLE_LABEL,
    });
    const sent = buildStep({
        key: "sent",
        label: "Sent",
        count: null,
        hasVerifiedSample: false,
        sourceTruth: "missing",
        sourceLabel: DEBUG_NOTIFICATION_RECORDS_LABEL,
        explanation: `${DELIVERY_DEBUG_UNAVAILABLE_COPY} Use Admin Debug notification records for send status and dispatch health.`,
        denominator: "notification records",
        freshnessState,
        missingDisplayValue: "Unavailable",
    });
    const opened = buildStep({
        key: "opened",
        label: "Opened",
        count: openedCount,
        hasVerifiedSample: openedCount !== null,
        sourceTruth: openedCount !== null ? "first_party_telemetry" : "missing",
        sourceLabel: "notification click/open telemetry",
        explanation: "Opened counts click/open events only. They are not linked to read or clear mutations in this funnel view.",
        denominator: "event counts",
        freshnessState,
    });
    const read = buildStep({
        key: "read",
        label: "Read",
        count: readCount,
        hasVerifiedSample: readCount !== null,
        sourceTruth: readCount !== null ? "mutation_telemetry" : "missing",
        sourceLabel: "notification read mutation telemetry",
        explanation: "Read counts come from mutation telemetry and are not a derived open-to-read conversion rate without notification-id linkage.",
        denominator: "mutation event counts",
        freshnessState,
    });
    const cleared = buildStep({
        key: "cleared",
        label: "Cleared",
        count: clearedCount,
        hasVerifiedSample: clearedCount !== null,
        sourceTruth: clearedCount !== null ? "mutation_telemetry" : "missing",
        sourceLabel: "notification clear-all telemetry",
        explanation: "Clear counts measure clear-all actions, not deliveries or opens.",
        denominator: "mutation event counts",
        freshnessState,
    });
    const duplicatePrevented = buildStep({
        key: "duplicatePrevented",
        label: "Duplicate prevented",
        count: null,
        hasVerifiedSample: false,
        sourceTruth: "missing",
        sourceLabel: "Debug dedupe records",
        explanation: `${DUPLICATE_PREVENTION_NOT_INSTRUMENTED_COPY} Use Admin Debug for idempotency and browser-tag dedupe details.`,
        denominator: "dedupe records",
        freshnessState,
        missingDisplayValue: "Unavailable",
    });
    const failedSkipped = buildStep({
        key: "failedSkipped",
        label: "Failed/skipped",
        count: null,
        hasVerifiedSample: false,
        sourceTruth: "missing",
        sourceLabel: "Debug delivery records",
        explanation: "Delivery failure and skip counts are unavailable from Debug source in this snapshot. Use Admin Debug for permission-denied, missing-token, and dispatch-failure detail.",
        denominator: "delivery records",
        freshnessState,
        missingDisplayValue: "Unavailable",
    });

    const metrics = [prompt, permissionEnabled, sent, opened, read, cleared, duplicatePrevented, failedSkipped];
    const reminderReasons = input.reminderReasons.map((item) => ({
        reason: normalizeReminderReason(item.label),
        count: item.count,
        sourceTruth: TASK_REMINDER_TELEMETRY_LABEL,
    }));
    const reminderReasonTotal = reminderReasons.reduce((sum, item) => sum + Math.max(0, item.count), 0);
    const reminderReasonSummary = reminderReasonTotal > 0
        ? `Total reminders ${reminderReasonTotal.toLocaleString()} · ${input.reminderReasons.map((item) => `${item.label}: ${item.count.toLocaleString()}`).join(" · ")}`
        : "No reminder reason sample in this range.";

    const hasData = metrics.some((metric) => metric.count !== null) || reminderReasons.length > 0;
    const missingSourceCount = metrics.filter((metric) => metric.status !== "loaded").length;
    const warnings = [
        "Notification funnel is partial. Prompt/open/read are telemetry counts; delivery/failure counts depend on Debug notification records.",
        "Prompt, enabled, opened, read, and cleared are event counts. This panel does not prove a linked sequential conversion funnel.",
    ];
    const state: AdminNotificationFunnelModel["state"] = !hasData
        ? input.loading ? "unavailable" : "unavailable"
        : stale
            ? "stale"
            : missingSourceCount > 0
                ? "partial"
                : "complete";
    const truthLabel: AdminNotificationFunnelModel["truthLabel"] = !hasData
        ? input.loading ? "WAIT" : "UNAVAILABLE"
        : stale
            ? "STALE"
            : "PARTIAL";

    return {
        hasData,
        generatedAtUtc,
        range: input.selectedRange ?? "default",
        state,
        sourceMode: hasData ? "event_counts_partial" : "waiting",
        truthLabel,
        denominatorMode: "partial",
        visibleCopy: "Notification funnel is partial. Prompt/open/read are telemetry counts; delivery/failure counts depend on Debug notification records.",
        warnings,
        missingSourceCount,
        prompt,
        permissionEnabled,
        sent,
        opened,
        read,
        cleared,
        duplicatePrevented,
        failedSkipped,
        metrics,
        reminderReasons,
        reminderReasonSummary,
        reminderReasonTotal,
        reminderReasonsSourceLabel: TASK_REMINDER_TELEMETRY_LABEL,
        reminderReasonsFreshness: freshnessState,
        debug: {
            generatedAtUtc,
            selectedRange: input.selectedRange ?? "default",
            state,
            denominatorMode: "partial",
            missingSourceCount,
            funnelSourceMode: hasData ? "event_counts_partial" : "waiting",
            promptCount: prompt,
            enabledCount: permissionEnabled,
            sentCount: sent,
            openCount: opened,
            readCount: read,
            clearAllCount: cleared,
            duplicatePreventedCount: duplicatePrevented,
            failedSkippedCount: failedSkipped,
            reminderReasons,
            duplicateCreatedPreventedCount: null,
            duplicatePushPreventedCount: null,
            duplicateBrowserDisplayPreventedCount: null,
            skippedPermissionDeniedCount: null,
            skippedMissingTokenCount: null,
            skippedPreferencesDisabledCount: null,
            queuedDropReturnLiveNotificationCount: null,
            queuedDropReturnLiveSkippedCount: null,
            foregroundMessageCount: null,
            backgroundMessageCount: null,
            serviceWorkerDisplayCount: null,
            autoDisplayedByFcmCount: null,
            manualShowNotificationCount: null,
            notificationClickCount: opened,
            notificationReadPersistenceLagMs: null,
            unreadCountLocal: null,
            unreadCountServer: null,
            unreadCountReconciled: null,
            stale,
            cache: Boolean(input.response?.cacheState && input.response.cacheState !== "miss"),
            server: Boolean(input.response),
            fallback: Boolean(input.response?.cacheRevalidating),
            lastValidatedAt: input.response?.generatedAtMs ?? null,
            refreshStatus: input.loading ? "loading" : "historical snapshot loaded",
            duplicateRefreshPrevented: true,
            notificationRows: [],
            browserSupportFlags: {
                notificationPermission: null,
                serviceWorkerRegistered: null,
                fcmTokenPresent: null,
                foregroundHandlerRegistered: true,
                backgroundHandlerRegistered: true,
                notificationClickHandlerRegistered: true,
            },
        },
    };
}
