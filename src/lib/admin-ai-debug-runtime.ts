import type { AdminAiDebugSummary } from "@/lib/ai-debug-assistant";
import { AI_DEBUG_ASSISTANT_MODEL } from "@/lib/ai-debug-assistant";
import { normalizeAdminAiModelAlias } from "@/lib/admin-ai-models";
import {
    getRouteRuntimeHealthStatus,
    type RouteRuntimeHealthItem,
} from "@/lib/route-runtime-health";

export const ADMIN_AI_DEBUG_ASSISTANT_SETTINGS_DOC = "debugAssistant";
export const ADMIN_AI_DEBUG_SERVER_DIAGNOSTICS_COLLECTION = "server_diagnostics";
export const ADMIN_AI_DEBUG_ROUTE_RUNTIME_HEALTH_COLLECTION = "route_runtime_health";
export const ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS = {
    read: "admin/debug/assistant:GET",
    write: "admin/debug/assistant:PUT",
    fix: "admin/debug/assistant/fix:POST",
} as const;

export type AdminAiDebugRealtimeFeedStatus =
    | "realtime"
    | "partial"
    | "polled"
    | "failed";

export type AdminAiDebugPreflightStatus = "pass" | "warn" | "fail";

export interface AdminAiDebugAssistantSettingsSnapshot {
    enabled: boolean;
    model: string;
    updatedAtMs: number;
}

export interface AdminAiDebugRealtimeDiagnostic {
    id: string;
    severity: "info" | "warn" | "error";
    message: string;
    createdAtMs: number;
    detailPreview?: string;
}

export interface AdminAiDebugPreflightCheck {
    key: string;
    label: string;
    status: AdminAiDebugPreflightStatus;
    detail: string;
    updatedAtMs: number | null;
    sourceLabel: "realtime" | "polled";
}

export interface AdminAiDebugRealtimeSignals {
    feedStatus: AdminAiDebugRealtimeFeedStatus;
    feedDetail: string;
    latestSignalAtMs: number | null;
    settings: AdminAiDebugAssistantSettingsSnapshot;
    diagnostics: AdminAiDebugRealtimeDiagnostic[];
    routeHealth: {
        read: RouteRuntimeHealthItem | null;
        write: RouteRuntimeHealthItem | null;
        fix: RouteRuntimeHealthItem | null;
    };
    preflightChecks: AdminAiDebugPreflightCheck[];
}

type ListenerState = {
    settingsLoaded: boolean;
    diagnosticsLoaded: boolean;
    routesLoaded: boolean;
    settingsFailed: boolean;
    diagnosticsFailed: boolean;
    routesFailed: boolean;
};

function mapRouteStatusToPreflight(status: ReturnType<typeof getRouteRuntimeHealthStatus>) {
    if (status === "fail") {
        return "fail" as const;
    }
    if (status === "warn" || status === "stale") {
        return "warn" as const;
    }
    return "pass" as const;
}

export function normalizeAdminAiDebugAssistantSettingsSnapshot(
    value: unknown,
    fallback?: Partial<AdminAiDebugAssistantSettingsSnapshot>,
): AdminAiDebugAssistantSettingsSnapshot {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

    return {
        enabled: source.enabled !== false && fallback?.enabled !== false,
        model: normalizeAdminAiModelAlias(
            typeof source.model === "string" ? source.model : fallback?.model,
            "debug_assistant",
        ) || AI_DEBUG_ASSISTANT_MODEL,
        updatedAtMs: typeof source.updatedAtMs === "number" && Number.isFinite(source.updatedAtMs)
            ? Math.max(0, Math.trunc(source.updatedAtMs))
            : Math.max(0, Math.trunc(fallback?.updatedAtMs || 0)),
    };
}

export function normalizeAdminAiDebugRealtimeDiagnostic(
    id: string,
    value: unknown,
): AdminAiDebugRealtimeDiagnostic | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    const source = value as Record<string, unknown>;
    const severity = source.severity === "error" || source.severity === "warn" || source.severity === "info"
        ? source.severity
        : "warn";
    const message = typeof source.message === "string" && source.message.trim().length > 0
        ? source.message.trim()
        : "AI diagnostic recorded";
    const createdAtMs = typeof source.createdAtMs === "number" && Number.isFinite(source.createdAtMs)
        ? Math.max(0, Math.trunc(source.createdAtMs))
        : 0;
    const detailPreview = typeof source.detailPreview === "string" && source.detailPreview.trim().length > 0
        ? source.detailPreview.trim()
        : undefined;

    return {
        id,
        severity,
        message,
        createdAtMs,
        detailPreview,
    };
}

export function buildAdminAiDebugRealtimeSignals(input: {
    summary: AdminAiDebugSummary | null | undefined;
    settings?: AdminAiDebugAssistantSettingsSnapshot | null;
    diagnostics?: AdminAiDebugRealtimeDiagnostic[] | null;
    routeHealth?: Partial<Record<(typeof ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS)[keyof typeof ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS], RouteRuntimeHealthItem | null>>;
    listenerState?: Partial<ListenerState>;
    nowMs?: number;
}): AdminAiDebugRealtimeSignals {
    const nowMs = input.nowMs ?? Date.now();
    const summary = input.summary ?? null;
    const settings = normalizeAdminAiDebugAssistantSettingsSnapshot(input.settings, {
        enabled: summary?.enabled,
        model: summary?.configured_model,
    });
    const diagnostics = (input.diagnostics ?? [])
        .slice()
        .sort((left, right) => right.createdAtMs - left.createdAtMs)
        .slice(0, 12);
    const readRoute = input.routeHealth?.[ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.read] ?? null;
    const writeRoute = input.routeHealth?.[ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.write] ?? null;
    const fixRoute = input.routeHealth?.[ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.fix] ?? null;
    const listenerState: ListenerState = {
        settingsLoaded: input.listenerState?.settingsLoaded === true,
        diagnosticsLoaded: input.listenerState?.diagnosticsLoaded === true,
        routesLoaded: input.listenerState?.routesLoaded === true,
        settingsFailed: input.listenerState?.settingsFailed === true,
        diagnosticsFailed: input.listenerState?.diagnosticsFailed === true,
        routesFailed: input.listenerState?.routesFailed === true,
    };
    const loadedCount = [listenerState.settingsLoaded, listenerState.diagnosticsLoaded, listenerState.routesLoaded]
        .filter(Boolean)
        .length;
    const failedCount = [listenerState.settingsFailed, listenerState.diagnosticsFailed, listenerState.routesFailed]
        .filter(Boolean)
        .length;
    const latestSignalAtMs = [
        settings.updatedAtMs,
        ...diagnostics.map((entry) => entry.createdAtMs),
        typeof readRoute?.updatedAtMs === "number" ? readRoute.updatedAtMs : 0,
        typeof writeRoute?.updatedAtMs === "number" ? writeRoute.updatedAtMs : 0,
        typeof fixRoute?.updatedAtMs === "number" ? fixRoute.updatedAtMs : 0,
        summary?.generated_at ? Date.parse(summary.generated_at) : 0,
    ]
        .filter((value) => Number.isFinite(value) && value > 0)
        .reduce<number | null>((latest, value) => latest === null ? value : Math.max(latest, value), null);

    let feedStatus: AdminAiDebugRealtimeFeedStatus = "polled";
    let feedDetail = "Polled";

    if (loadedCount === 3 && failedCount === 0) {
        feedStatus = "realtime";
        feedDetail = "Realtime active";
    } else if (loadedCount > 0 && failedCount > 0) {
        feedStatus = "partial";
        feedDetail = "Partially connected";
    } else if (loadedCount > 0) {
        feedStatus = "partial";
        feedDetail = "Connecting...";
    } else if (failedCount > 0) {
        feedStatus = "failed";
        feedDetail = "Observers failed";
    }

    const readRouteStatus = readRoute ? getRouteRuntimeHealthStatus(readRoute, nowMs) : "stale";
    const writeRouteStatus = writeRoute ? getRouteRuntimeHealthStatus(writeRoute, nowMs) : "stale";
    const fixRouteStatus = fixRoute ? getRouteRuntimeHealthStatus(fixRoute, nowMs) : "stale";
    const diagnosticErrorCount = diagnostics.filter((entry) => entry.severity === "error").length;
    const diagnosticWarnCount = diagnostics.filter((entry) => entry.severity === "warn").length;
    const latestDiagnostic = diagnostics[0] ?? null;
    const runtimeReady = summary?.runtime_ready === true;
    const configuredModel = summary?.configured_model || settings.model || AI_DEBUG_ASSISTANT_MODEL;
    const resolvedModel = summary?.model || configuredModel;

    const preflightChecks: AdminAiDebugPreflightCheck[] = [
        {
            key: "feature_toggle",
            label: "Feature toggle",
            status: settings.enabled ? "pass" : "warn",
            detail: settings.enabled
                ? "AI debug assistant is enabled in admin settings."
                : "AI debug assistant is disabled in admin settings. Deterministic fallback remains available.",
            updatedAtMs: settings.updatedAtMs || null,
            sourceLabel: listenerState.settingsLoaded ? "realtime" : "polled",
        },
        {
            key: "configured_model",
            label: "Configured model",
            status: configuredModel === AI_DEBUG_ASSISTANT_MODEL ? "pass" : "warn",
            detail: configuredModel === AI_DEBUG_ASSISTANT_MODEL
                ? `Configured model is pinned to the canonical ${AI_DEBUG_ASSISTANT_MODEL} alias.`
                : `Configured model is ${configuredModel}, while the canonical debug alias is ${AI_DEBUG_ASSISTANT_MODEL}. Resolved runtime model is ${resolvedModel}.`,
            updatedAtMs: settings.updatedAtMs || null,
            sourceLabel: listenerState.settingsLoaded ? "realtime" : "polled",
        },
        {
            key: "runtime_gate",
            label: "Runtime gate",
            status: runtimeReady ? "pass" : "fail",
            detail: runtimeReady
                ? `Vertex runtime is ready for ${resolvedModel} in ${summary?.runtime_location || "the configured location"}.`
                : summary?.availability_note || "Vertex runtime is not ready yet. Canonical diagnostics remain authoritative until runtime access is proven.",
            updatedAtMs: summary?.generated_at ? Date.parse(summary.generated_at) : null,
            sourceLabel: "polled",
        },
        {
            key: "assistant_read_route",
            label: "Assistant read route",
            status: mapRouteStatusToPreflight(readRouteStatus),
            detail: readRoute
                ? `Route health is ${readRouteStatus}. Last result: ${readRoute.lastResult.replace("_", " ")} at ${new Date(readRoute.updatedAtMs).toLocaleString()}.`
                : "No canonical route runtime sample has been observed yet for the assistant read route.",
            updatedAtMs: typeof readRoute?.updatedAtMs === "number" ? readRoute.updatedAtMs : null,
            sourceLabel: listenerState.routesLoaded ? "realtime" : "polled",
        },
        {
            key: "assistant_settings_write",
            label: "Assistant settings writes",
            status: mapRouteStatusToPreflight(writeRouteStatus),
            detail: writeRoute
                ? `Settings write route health is ${writeRouteStatus}. Last result: ${writeRoute.lastResult.replace("_", " ")} at ${new Date(writeRoute.updatedAtMs).toLocaleString()}.`
                : "No canonical route runtime sample has been observed yet for assistant settings writes.",
            updatedAtMs: typeof writeRoute?.updatedAtMs === "number" ? writeRoute.updatedAtMs : null,
            sourceLabel: listenerState.routesLoaded ? "realtime" : "polled",
        },
        {
            key: "assistant_fix_route",
            label: "Assistant fix route",
            status: mapRouteStatusToPreflight(fixRouteStatus),
            detail: fixRoute
                ? `Fix route health is ${fixRouteStatus}. Last result: ${fixRoute.lastResult.replace("_", " ")} at ${new Date(fixRoute.updatedAtMs).toLocaleString()}.`
                : "No canonical route runtime sample has been observed yet for the assistant fix route.",
            updatedAtMs: typeof fixRoute?.updatedAtMs === "number" ? fixRoute.updatedAtMs : null,
            sourceLabel: listenerState.routesLoaded ? "realtime" : "polled",
        },
        {
            key: "recent_ai_diagnostics",
            label: "Recent AI diagnostics",
            status: diagnosticErrorCount > 0 ? "fail" : diagnosticWarnCount > 0 ? "warn" : "pass",
            detail: diagnosticErrorCount > 0
                ? `${diagnosticErrorCount} recent AI error diagnostic${diagnosticErrorCount === 1 ? "" : "s"} detected. Latest: ${latestDiagnostic?.message || "AI diagnostic error"}.`
                : diagnosticWarnCount > 0
                    ? `${diagnosticWarnCount} recent AI warning diagnostic${diagnosticWarnCount === 1 ? "" : "s"} detected. Latest: ${latestDiagnostic?.message || "AI diagnostic warning"}.`
                    : "No recent AI warning or error diagnostics are present in the live Firestore sample.",
            updatedAtMs: latestDiagnostic?.createdAtMs || null,
            sourceLabel: listenerState.diagnosticsLoaded ? "realtime" : "polled",
        },
    ];

    return {
        feedStatus,
        feedDetail,
        latestSignalAtMs,
        settings,
        diagnostics,
        routeHealth: {
            read: readRoute,
            write: writeRoute,
            fix: fixRoute,
        },
        preflightChecks,
    };
}
