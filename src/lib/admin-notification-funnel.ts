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

export interface AdminNotificationFunnelMetric {
    key: AdminNotificationFunnelMetricKey;
    label: string;
    value: number | null;
    source: string;
    truthState: "server" | "telemetry" | "partial" | "unavailable" | "stale";
    helper: string;
    fakeZeroPrevented: boolean;
}

export interface AdminNotificationFunnelModel {
    hasData: boolean;
    sourceMode: "partial_telemetry" | "waiting";
    truthLabel: "PARTIAL" | "WAIT";
    visibleCopy: string;
    metrics: AdminNotificationFunnelMetric[];
    reminderReasons: AdminNotificationReminderReasonInput[];
    reminderReasonSummary: string;
    debug: {
        selectedRange: string;
        funnelSourceMode: string;
        promptCount: AdminNotificationFunnelMetric;
        enabledCount: AdminNotificationFunnelMetric;
        sentCount: AdminNotificationFunnelMetric;
        openCount: AdminNotificationFunnelMetric;
        readCount: AdminNotificationFunnelMetric;
        clearAllCount: AdminNotificationFunnelMetric;
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
        notificationClickCount: AdminNotificationFunnelMetric;
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

function findFunnelCount(items: AdminNotificationFunnelItemInput[], needles: string[]) {
    const lowerNeedles = needles.map((needle) => needle.toLowerCase());
    const match = items.find((item) => lowerNeedles.some((needle) => item.label.toLowerCase().includes(needle)));
    return match ? Math.max(0, Number(match.count) || 0) : null;
}

function findActionValue(items: AdminNotificationActionItemInput[], key: AdminNotificationFunnelMetricKey) {
    const match = items.find((item) => ACTION_LABELS[item.label.toLowerCase()] === key);
    return match ? Math.max(0, Number(match.value) || 0) : null;
}

function metric(input: {
    key: AdminNotificationFunnelMetricKey;
    label: string;
    value: number | null;
    source: string;
    helper: string;
}): AdminNotificationFunnelMetric {
    return {
        key: input.key,
        label: input.label,
        value: input.value,
        source: input.source,
        truthState: input.value === null ? "unavailable" : "telemetry",
        helper: input.helper,
        fakeZeroPrevented: input.value === null,
    };
}

function formatMetricValue(value: number | null) {
    return value === null ? "Waiting" : value.toLocaleString();
}

export function buildAdminNotificationFunnelModel(input: {
    funnelItems: AdminNotificationFunnelItemInput[];
    actionItems: AdminNotificationActionItemInput[];
    reminderReasons: AdminNotificationReminderReasonInput[];
    selectedRange?: string;
}) : AdminNotificationFunnelModel {
    const prompted = metric({
        key: "prompted",
        label: "Prompted",
        value: findFunnelCount(input.funnelItems, ["prompt"]) ?? findActionValue(input.actionItems, "prompted"),
        source: "first-party notification prompt telemetry",
        helper: "Prompt banner or dropdown telemetry.",
    });
    const enabled = metric({
        key: "enabled",
        label: "Enabled",
        value: findFunnelCount(input.funnelItems, ["enabled"]) ?? findActionValue(input.actionItems, "enabled"),
        source: "notification permission telemetry",
        helper: "Only zero when the selected telemetry source reports zero.",
    });
    const sent = metric({
        key: "sent",
        label: "Sent",
        value: null,
        source: "backend push dispatch outcomes",
        helper: "Detailed send outcomes live in Debug until dispatch telemetry is joined.",
    });
    const opened = metric({
        key: "opened",
        label: "Opened",
        value: findFunnelCount(input.funnelItems, ["opened"]) ?? findActionValue(input.actionItems, "opened"),
        source: "notification click/open telemetry",
        helper: "Foreground, dropdown, and service-worker clicks when available.",
    });
    const read = metric({
        key: "read",
        label: "Read",
        value: findFunnelCount(input.funnelItems, ["marked read", "read"]) ?? findActionValue(input.actionItems, "read"),
        source: "notification read mutation telemetry",
        helper: "Read state is persisted through /api/notifications.",
    });
    const cleared = metric({
        key: "cleared",
        label: "Cleared",
        value: findActionValue(input.actionItems, "cleared"),
        source: "notification clear-all telemetry",
        helper: "Clear-all persists read state for visible unread notifications.",
    });
    const duplicatePrevented = metric({
        key: "duplicatePrevented",
        label: "Duplicate prevented",
        value: null,
        source: "notification idempotency and browser tag guards",
        helper: "Backend and browser dedupe fields are exposed in Debug.",
    });
    const failedSkipped = metric({
        key: "failedSkipped",
        label: "Failed/skipped",
        value: null,
        source: "push skip/failure diagnostics",
        helper: "Missing token, denied permission, and disabled preference counts are Debug-only until joined.",
    });

    const metrics = [prompted, enabled, sent, opened, read, cleared, duplicatePrevented, failedSkipped];
    const hasData = metrics.some((item) => item.value !== null) || input.reminderReasons.length > 0;
    const reminderReasonSummary = input.reminderReasons.length > 0
        ? input.reminderReasons.map((item) => `${item.label}: ${formatMetricValue(item.count)}`).join(" · ")
        : "No reminder traffic in this range.";

    return {
        hasData,
        sourceMode: hasData ? "partial_telemetry" : "waiting",
        truthLabel: hasData ? "PARTIAL" : "WAIT",
        visibleCopy: "Notification data is partial. Delivery details and failures live in Debug.",
        metrics,
        reminderReasons: input.reminderReasons,
        reminderReasonSummary,
        debug: {
            selectedRange: input.selectedRange ?? "default",
            funnelSourceMode: hasData ? "partial_telemetry" : "waiting",
            promptCount: prompted,
            enabledCount: enabled,
            sentCount: sent,
            openCount: opened,
            readCount: read,
            clearAllCount: cleared,
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
            stale: false,
            cache: false,
            server: false,
            fallback: false,
            lastValidatedAt: null,
            refreshStatus: "background refresh tracked by historical analytics",
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
