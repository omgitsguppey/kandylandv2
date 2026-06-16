"use client";

import { useEffect, useMemo, useState } from "react";
import {
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    where,
} from "firebase/firestore";

import type { AdminAiDebugSummary } from "@/lib/ai-debug-assistant";
import {
    ADMIN_AI_DEBUG_ASSISTANT_SETTINGS_DOC,
    ADMIN_AI_DEBUG_ROUTE_RUNTIME_HEALTH_COLLECTION,
    ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS,
    ADMIN_AI_DEBUG_SERVER_DIAGNOSTICS_COLLECTION,
    buildAdminAiDebugRealtimeSignals,
    normalizeAdminAiDebugAssistantSettingsSnapshot,
    normalizeAdminAiDebugRealtimeDiagnostic,
    type AdminAiDebugRealtimeSignals,
} from "@/lib/admin-ai-debug-runtime";
import { db } from "@/lib/firebase-data";
import { buildFirestoreClientFallbackMessage, buildFirestoreClientIssueDetail } from "@/lib/firestore-client-errors";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { createAutoHealingObserver } from "@/lib/self-healing";
import { toRouteRuntimeHealthDocId, type RouteRuntimeHealthItem } from "@/lib/route-runtime-health";

type ListenerErrors = {
    settingsFailed: boolean;
    diagnosticsFailed: boolean;
    routesFailed: boolean;
};

export function useAdminAiAssistantRealtime(
    summary: AdminAiDebugSummary | null | undefined,
    options: { enabled?: boolean } = {},
): AdminAiDebugRealtimeSignals {
    const enabled = options.enabled ?? true;
    const [settings, setSettings] = useState(() => normalizeAdminAiDebugAssistantSettingsSnapshot(null, {
        enabled: summary?.enabled,
        model: summary?.configured_model,
    }));
    const [diagnostics, setDiagnostics] = useState<ReturnType<typeof normalizeAdminAiDebugRealtimeDiagnostic>[]>([]);
    const [routeHealthByKey, setRouteHealthByKey] = useState<Partial<Record<(typeof ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS)[keyof typeof ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS], RouteRuntimeHealthItem | null>>>({});
    const [listenerState, setListenerState] = useState({
        settingsLoaded: false,
        diagnosticsLoaded: false,
        routesLoaded: false,
    });
    const [listenerErrors, setListenerErrors] = useState<ListenerErrors>({
        settingsFailed: false,
        diagnosticsFailed: false,
        routesFailed: false,
    });

    useEffect(() => {
        if (!enabled) {
            setSettings(normalizeAdminAiDebugAssistantSettingsSnapshot(null, {
                enabled: summary?.enabled,
                model: summary?.configured_model,
            }));
            setDiagnostics([]);
            setRouteHealthByKey({});
            setListenerState({
                settingsLoaded: false,
                diagnosticsLoaded: false,
                routesLoaded: false,
            });
            setListenerErrors({
                settingsFailed: false,
                diagnosticsFailed: false,
                routesFailed: false,
            });
            return;
        }

        let cancelled = false;

        const settingsControl = createAutoHealingObserver(() => onSnapshot(
            doc(collection(db, "adminSettings"), ADMIN_AI_DEBUG_ASSISTANT_SETTINGS_DOC),
            (snapshot) => {
                if (cancelled) return;
                setSettings(normalizeAdminAiDebugAssistantSettingsSnapshot(snapshot.exists() ? snapshot.data() : null, {
                    enabled: summary?.enabled,
                    model: summary?.configured_model,
                }));
                setListenerState((current) => ({ ...current, settingsLoaded: true }));
                setListenerErrors((current) => ({ ...current, settingsFailed: false }));
            },
            (error) => {
                if (cancelled) return;
                setListenerErrors((current) => ({ ...current, settingsFailed: true }));
                reportClientIssue({
                    channel: "firebase",
                    severity: "warn",
                    message: "Admin AI debug settings realtime listener failed",
                    error,
                    detail: buildFirestoreClientIssueDetail(error, {
                        listener: "admin_ai_debug_settings",
                        scope: "admin debug assistant",
                    }),
                    consoleLabel: "[Admin AI Debug] settings listener failed",
                });
                settingsControl.triggerReconnect(error);
            },
        ));

        const diagnosticsQuery = query(
            collection(db, ADMIN_AI_DEBUG_SERVER_DIAGNOSTICS_COLLECTION),
            where("channel", "==", "ai"),
            orderBy("createdAtMs", "desc"),
            limit(12),
        );
        const diagnosticsControl = createAutoHealingObserver(() => onSnapshot(
            diagnosticsQuery,
            (snapshot) => {
                if (cancelled) return;
                const nextDiagnostics = snapshot.docs
                    .filter((entry) => entry.data()?.channel === "ai")
                    .map((entry) => normalizeAdminAiDebugRealtimeDiagnostic(entry.id, entry.data()))
                    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
                setDiagnostics(nextDiagnostics);
                setListenerState((current) => ({ ...current, diagnosticsLoaded: true }));
                setListenerErrors((current) => ({ ...current, diagnosticsFailed: false }));
            },
            (error) => {
                if (cancelled) return;
                setListenerErrors((current) => ({ ...current, diagnosticsFailed: true }));
                reportClientIssue({
                    channel: "firebase",
                    severity: "warn",
                    message: "Admin AI diagnostics realtime listener failed",
                    error,
                    detail: buildFirestoreClientIssueDetail(error, {
                        listener: "admin_ai_debug_diagnostics",
                        scope: "admin debug assistant",
                        fallbackMessage: buildFirestoreClientFallbackMessage("Admin AI diagnostics", error),
                    }),
                    consoleLabel: "[Admin AI Debug] diagnostics listener failed",
                });
                diagnosticsControl.triggerReconnect(error);
            },
        ));

        const readRouteControl = createAutoHealingObserver(() => onSnapshot(
            doc(collection(db, ADMIN_AI_DEBUG_ROUTE_RUNTIME_HEALTH_COLLECTION), toRouteRuntimeHealthDocId(ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.read)),
            (snapshot) => {
                if (cancelled) return;
                setRouteHealthByKey((current) => ({
                    ...current,
                    [ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.read]: snapshot.exists()
                        ? snapshot.data() as RouteRuntimeHealthItem
                        : null,
                }));
                setListenerState((current) => ({
                    ...current,
                    routesLoaded: true,
                }));
                setListenerErrors((current) => ({ ...current, routesFailed: false }));
            },
            (error) => {
                if (cancelled) return;
                setListenerErrors((current) => ({ ...current, routesFailed: true }));
                reportClientIssue({
                    channel: "firebase",
                    severity: "warn",
                    message: "Admin AI assistant read-route realtime listener failed",
                    error,
                    detail: buildFirestoreClientIssueDetail(error, {
                        listener: "admin_ai_debug_route_read",
                        scope: "admin debug assistant",
                    }),
                    consoleLabel: "[Admin AI Debug] read-route listener failed",
                });
                readRouteControl.triggerReconnect(error);
            },
        ));

        const writeRouteControl = createAutoHealingObserver(() => onSnapshot(
            doc(collection(db, ADMIN_AI_DEBUG_ROUTE_RUNTIME_HEALTH_COLLECTION), toRouteRuntimeHealthDocId(ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.write)),
            (snapshot) => {
                if (cancelled) return;
                setRouteHealthByKey((current) => ({
                    ...current,
                    [ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.write]: snapshot.exists()
                        ? snapshot.data() as RouteRuntimeHealthItem
                        : null,
                }));
                setListenerState((current) => ({
                    ...current,
                    routesLoaded: true,
                }));
                setListenerErrors((current) => ({ ...current, routesFailed: false }));
            },
            (error) => {
                if (cancelled) return;
                setListenerErrors((current) => ({ ...current, routesFailed: true }));
                reportClientIssue({
                    channel: "firebase",
                    severity: "warn",
                    message: "Admin AI assistant write-route realtime listener failed",
                    error,
                    detail: buildFirestoreClientIssueDetail(error, {
                        listener: "admin_ai_debug_route_write",
                        scope: "admin debug assistant",
                    }),
                    consoleLabel: "[Admin AI Debug] write-route listener failed",
                });
                writeRouteControl.triggerReconnect(error);
            },
        ));

        const generateRouteControl = createAutoHealingObserver(() => onSnapshot(
            doc(collection(db, ADMIN_AI_DEBUG_ROUTE_RUNTIME_HEALTH_COLLECTION), toRouteRuntimeHealthDocId(ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.generate)),
            (snapshot) => {
                if (cancelled) return;
                setRouteHealthByKey((current) => ({
                    ...current,
                    [ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.generate]: snapshot.exists()
                        ? snapshot.data() as RouteRuntimeHealthItem
                        : null,
                }));
                setListenerState((current) => ({
                    ...current,
                    routesLoaded: true,
                }));
                setListenerErrors((current) => ({ ...current, routesFailed: false }));
            },
            (error) => {
                if (cancelled) return;
                setListenerErrors((current) => ({ ...current, routesFailed: true }));
                reportClientIssue({
                    channel: "firebase",
                    severity: "warn",
                    message: "Admin AI assistant live-generation route realtime listener failed",
                    error,
                    detail: buildFirestoreClientIssueDetail(error, {
                        listener: "admin_ai_debug_route_generate",
                        scope: "admin debug assistant",
                    }),
                    consoleLabel: "[Admin AI Debug] generate-route listener failed",
                });
                generateRouteControl.triggerReconnect(error);
            },
        ));

        const fixRouteControl = createAutoHealingObserver(() => onSnapshot(
            doc(collection(db, ADMIN_AI_DEBUG_ROUTE_RUNTIME_HEALTH_COLLECTION), toRouteRuntimeHealthDocId(ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.fix)),
            (snapshot) => {
                if (cancelled) return;
                setRouteHealthByKey((current) => ({
                    ...current,
                    [ADMIN_AI_DEBUG_ROUTE_RUNTIME_KEYS.fix]: snapshot.exists()
                        ? snapshot.data() as RouteRuntimeHealthItem
                        : null,
                }));
                setListenerState((current) => ({
                    ...current,
                    routesLoaded: true,
                }));
                setListenerErrors((current) => ({ ...current, routesFailed: false }));
            },
            (error) => {
                if (cancelled) return;
                setListenerErrors((current) => ({ ...current, routesFailed: true }));
                reportClientIssue({
                    channel: "firebase",
                    severity: "warn",
                    message: "Admin AI assistant fix-route realtime listener failed",
                    error,
                    detail: buildFirestoreClientIssueDetail(error, {
                        listener: "admin_ai_debug_route_fix",
                        scope: "admin debug assistant",
                    }),
                    consoleLabel: "[Admin AI Debug] fix-route listener failed",
                });
                fixRouteControl.triggerReconnect(error);
            },
        ));

        return () => {
            cancelled = true;
            settingsControl.cleanup();
            diagnosticsControl.cleanup();
            readRouteControl.cleanup();
            generateRouteControl.cleanup();
            writeRouteControl.cleanup();
            fixRouteControl.cleanup();
        };
    }, [enabled, summary?.configured_model, summary?.enabled]);

    const effectiveSettings = useMemo(
        () => normalizeAdminAiDebugAssistantSettingsSnapshot(settings, {
            enabled: summary?.enabled,
            model: summary?.configured_model,
        }),
        [settings, summary?.configured_model, summary?.enabled],
    );

    return useMemo(() => buildAdminAiDebugRealtimeSignals({
        summary,
        settings: effectiveSettings,
        diagnostics: diagnostics.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
        routeHealth: routeHealthByKey,
        listenerState: {
            ...listenerState,
            ...listenerErrors,
        },
    }), [diagnostics, effectiveSettings, listenerErrors, listenerState, routeHealthByKey, summary]);
}
