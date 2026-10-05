"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { badgeForSourceStatus, Pill, Section, ScrollWrap, toneForSourceStatus, truthStateForSourceStatus } from "./DebugPrimitives";
import { DebugMonitoringRoutes, type DebugMonitoringRoutesProps } from "./DebugMonitoringRoutes";
import { AdminDebugWorkstream } from "@/components/creative-tim/kandydrops/admin-debug/AdminDebugWorkstream";
import { buildRouteRuntimeSummaryTruth } from "@/lib/route-runtime-health";
import { buildRouteRuntimeDisplayStatus, type RouteRuntimeDisplayBadgeState } from "@/lib/debug/route-runtime-display-status";
import { buildRouteRuntimeRollup } from "@/lib/debug/route-runtime-rollup-engine";
import { formatRecentActivity as formatRelative, formatUtcTimestamp as formatUtc, formatWindowHours } from "./DebugTime";

const DEBUG_MONITORING_NOT_LOADED = "Not loaded";

type DebugMonitoringSourceStatus =
    | "loaded_with_data"
    | "loaded_empty_with_source_window"
    | "source_ready_no_sample_loaded"
    | "source_missing_actionable";

function sourceStatusForOptionalNumber(value: unknown, sourceLoaded: boolean): DebugMonitoringSourceStatus {
    if (!sourceLoaded || typeof value !== "number" || !Number.isFinite(value)) return "source_missing_actionable";
    return value > 0 ? "loaded_with_data" : "loaded_empty_with_source_window";
}

function sourceStatusForSampleArray(value: unknown, sourceLoaded: boolean): DebugMonitoringSourceStatus {
    if (!sourceLoaded || !Array.isArray(value)) return "source_missing_actionable";
    return value.length > 0 ? "loaded_with_data" : "source_ready_no_sample_loaded";
}

function countValueForOptionalNumber(value: unknown, sourceLoaded: boolean): string | number {
    const status = sourceStatusForOptionalNumber(value, sourceLoaded);
    return status === "source_missing_actionable" ? DEBUG_MONITORING_NOT_LOADED : Number(value);
}

function countValueForSampleArray(value: unknown, sourceLoaded: boolean): string | number {
    const status = sourceStatusForSampleArray(value, sourceLoaded);
    return status === "source_missing_actionable" || !Array.isArray(value) ? DEBUG_MONITORING_NOT_LOADED : value.length;
}

function sourceConfigStateForOptionalFlag(value: unknown) {
    return typeof value === "boolean" ? value ? "configPresent" : "configMissing" : "source_missing";
}

function valueForConfigState(state: ReturnType<typeof sourceConfigStateForOptionalFlag>) {
    return state === "source_missing" ? DEBUG_MONITORING_NOT_LOADED : state === "configPresent" ? "Config present" : "Config missing";
}

function badgeForConfigState(state: ReturnType<typeof sourceConfigStateForOptionalFlag>) {
    return state === "source_missing" ? "MISSING" : state === "configPresent" ? "CONFIG" : "MISSING";
}

/* ─── Helpers ─── */
function formatTimestamp(timestamp?: number) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString();
}
function formatRuntimeStatus(status?: string) {
    if (status === "failed") return "Failed";
    if (status === "fallback") return "Showing saved data";
    if (status === "degraded") return "Needs review";
    if (status === "running") return "Running";
    if (status === "warn") return "Needs review";
    return status || "Unknown";
}
function toneForTransactionDirection(direction?: string) {
    if (direction === "debit") return "warn" as const;
    if (direction === "credit") return "good" as const;
    return "neutral" as const;
}
function toneForIdentityState(state?: string) {
    if (state === "resolved") return "good" as const;
    if (state === "fallback_uid") return "warn" as const;
    return "neutral" as const;
}
function toneForReceiptSourceState(state?: string) {
    if (state === "live") return "good" as const;
    if (state === "review") return "warn" as const;
    return "neutral" as const;
}
function truthStateForReceiptSourceState(state?: string) {
    if (state === "live") return "live" as const;
    if (state === "review") return "degraded" as const;
    return "cached" as const;
}
function toneForRouteRuntimeDisplayState(state: RouteRuntimeDisplayBadgeState) {
    if (state === "fail") return "bad" as const;
    if (state === "warning" || state === "stale" || state === "no_sample") return "warn" as const;
    return "neutral" as const;
}
function truthForRouteRuntimeDisplayState(state: RouteRuntimeDisplayBadgeState) {
    if (state === "fail") return "failed" as const;
    if (state === "warning") return "degraded" as const;
    if (state === "stale") return "stale" as const;
    if (state === "no_sample") return "unavailable" as const;
    return "live" as const;
}
function labelForRouteRuntimeBadge(label: string) {
    return label.toLowerCase().includes("slow samples") ? "Slow samples" : label;
}
function formatChatTriple(label: "Native chat" | "Compat chat", summary: {
    currentFailCount: number;
    staleRoutes: number;
    unseenRoutes: number;
}) {
    const failLabel = label === "Native chat" ? "Native chat fail" : "Compat chat fail";
    const staleLabel = label === "Native chat" ? "Native chat stale" : "Compat chat stale";
    const unseenLabel = label === "Native chat" ? "Native chat unseen" : "Compat chat unseen";
    return `${failLabel}: ${summary.currentFailCount} / ${staleLabel}: ${summary.staleRoutes} / ${unseenLabel}: ${summary.unseenRoutes}`;
}
function toneForQueueContinuityStatus(status?: string) {
    if (status === "healthy_current") return "good" as const;
    if (status === "broken_drift") return "bad" as const;
    if (status === "degraded_missing_heartbeat" || status === "degraded_missing_outcomes") return "warn" as const;
    return "neutral" as const;
}
function truthForQueueContinuityStatus(status?: string) {
    if (status === "healthy_current") return "live" as const;
    if (status === "broken_drift") return "failed" as const;
    if (status === "degraded_missing_heartbeat" || status === "degraded_missing_outcomes") return "degraded" as const;
    return "unavailable" as const;
}
function toneForQueueLaneStatus(status?: string) {
    if (status === "observed_current" || status === "healthy_current") return "good" as const;
    if (status === "failed" || status === "broken_drift") return "bad" as const;
    if (status === "missing" || status === "stale" || status === "observed_stale" || status === "degraded_missing_heartbeat" || status === "degraded_missing_outcomes") return "warn" as const;
    return "neutral" as const;
}
function truthForQueueLaneStatus(status?: string) {
    if (status === "observed_current" || status === "healthy_current") return "live" as const;
    if (status === "failed" || status === "broken_drift") return "failed" as const;
    if (status === "stale" || status === "observed_stale") return "stale" as const;
    if (status === "missing" || status === "degraded_missing_heartbeat" || status === "degraded_missing_outcomes") return "degraded" as const;
    return "unavailable" as const;
}
type RecentEventFlowRow = {
    eventId: string;
    eventName: string;
    displayName: string;
    actorLabel: string;
    actorType: "user" | "admin" | "creator" | "system" | "unknown";
    actorId?: string;
    surface: string;
    source: "identified_telemetry" | "creator_relationships" | "task_engine" | "gumdrop_ledger" | "notification_inbox" | "server" | "system" | "unknown";
    eventContext: "foreground_user" | "identity_linkage" | "background_task_engine" | "background_ledger" | "notification_system" | "server_system" | "admin" | "materialized_relationship";
    createdAtUtc: string;
    ageLabel: string;
    freshnessState: "live" | "recent" | "stale" | "unknown";
    findingsCount: number;
    evalEligible: boolean;
    evalEligibilityReason: string;
    missingInputs: string[];
    requiredMissingInputs: string[];
    state: "healthy" | "review" | "critical" | "info";
    duplicateCount: number;
    duplicateEventIds: string[];
};
const EVENT_FLOW_GROUP_WINDOW_MS = 15 * 60 * 1000;
function normalizeEventFlowActorType(value?: string): RecentEventFlowRow["actorType"] {
    if (value === "user" || value === "admin" || value === "creator" || value === "system") return value;
    return "unknown";
}
function getEventFlowSource(event: any): RecentEventFlowRow["source"] {
    if (event.sourceCollection === "creator_relationships") return "creator_relationships";
    if (event.sourceCollection === "task_engine" || event.domain === "task_engine" || String(event.systemKey || "").includes("task")) return "task_engine";
    if (event.sourceCollection === "gumdrop_ledger" || event.domain === "gumdrop_ledger" || String(event.systemKey || "").includes("reward")) return "gumdrop_ledger";
    if (event.sourceCollection === "notification_inbox" || event.domain === "notifications" || String(event.systemKey || "").includes("notification")) return "notification_inbox";
    if (event.normalizedEventName === "identity_linked") return "server";
    if (event.actor?.actorType === "system") return "system";
    if (event.sourceCollection === "analytics_event_facts") return "identified_telemetry";
    return "unknown";
}
function getEventFlowContext(event: any, source: RecentEventFlowRow["source"]): RecentEventFlowRow["eventContext"] {
    if (event.normalizedEventName === "identity_linked") return "identity_linkage";
    if (source === "task_engine") return "background_task_engine";
    if (source === "gumdrop_ledger") return "background_ledger";
    if (source === "notification_inbox" && event.actor?.actorType === "system") return "notification_system";
    if (source === "creator_relationships") return "materialized_relationship";
    if (event.actor?.actorType === "system") return "server_system";
    if (event.actor?.actorType === "admin") return "admin";
    if (source === "server") return "server_system";
    return "foreground_user";
}
function getEventFreshnessState(timestamp: number): RecentEventFlowRow["freshnessState"] {
    if (!timestamp) return "unknown";
    const ageMs = Math.max(0, Date.now() - timestamp);
    if (ageMs <= 5 * 60 * 1000) return "live";
    if (ageMs <= 60 * 60 * 1000) return "recent";
    return "stale";
}
function filterRequiredMissingInputs(event: any, context: RecentEventFlowRow["eventContext"]) {
    const missing = Array.isArray(event.dependencyReadiness?.missing) ? event.dependencyReadiness.missing.filter((entry: unknown): entry is string => typeof entry === "string") : [];
    if (context === "identity_linkage" || context === "background_task_engine" || context === "background_ledger" || context === "notification_system" || context === "server_system" || context === "materialized_relationship") {
        return missing.filter((entry: string) => entry !== "route" && entry !== "session");
    }
    return missing;
}
function buildEvalEligibilityReason(event: any, context: RecentEventFlowRow["eventContext"], requiredMissingInputs: string[]) {
    if (context === "identity_linkage") return "Identity linkage event; not scored as behavior.";
    if (context === "background_task_engine") return requiredMissingInputs.length ? "Task engine event needs user/task ownership before task behavior scoring." : "Task engine event; route not required.";
    if (context === "background_ledger") return requiredMissingInputs.length ? "Ledger event needs user/ledger ownership before reward rollup scoring." : "Ledger reward event; route not required.";
    if (context === "notification_system") return "Notification system event; behavioral scoring uses notification_read/open actions.";
    if (context === "materialized_relationship") return "Relationship materializer event; route not required.";
    if (context === "server_system" && event.normalizedEventName === "server_drop_clicked") return "Server/system click lacks user ownership; excluded from user scoring.";
    if (context === "server_system") return "System process event; excluded from user scoring until ownership is resolved.";
    if (requiredMissingInputs.length > 0) return `Missing required ${requiredMissingInputs.join(", ")}.`;
    if (event.readiness?.trainingEligible) return "Foreground event has required ownership context.";
    const blockedReasons = Array.isArray(event.readiness?.trainingBlockedReasons) ? event.readiness.trainingBlockedReasons.filter((entry: unknown): entry is string => typeof entry === "string") : [];
    return blockedReasons[0] || "Not eligible for evaluation in this context.";
}
function buildRecentEventFlowRows(events: any[]): RecentEventFlowRow[] {
    const rows = events.map((event): RecentEventFlowRow => {
        const timestamp = Number(event.occurredAtMs || event.observedAtMs || 0);
        const source = getEventFlowSource(event);
        const eventContext = getEventFlowContext(event, source);
        const requiredMissingInputs = filterRequiredMissingInputs(event, eventContext);
        const systemDropClick = event.normalizedEventName === "server_drop_clicked" && eventContext === "server_system";
        const identityLink = eventContext === "identity_linkage";
        const notificationSystemReview = eventContext === "notification_system" && event.findingCount > 0;
        const state: RecentEventFlowRow["state"] = systemDropClick || notificationSystemReview
            ? "review"
            : event.status === "critical" && eventContext === "foreground_user"
                ? "critical"
                : requiredMissingInputs.length > 0 || event.findingCount > 0
                    ? "review"
                    : identityLink || eventContext === "background_task_engine" || eventContext === "background_ledger" || eventContext === "notification_system" || eventContext === "materialized_relationship" || eventContext === "server_system"
                        ? "info"
                        : "healthy";
        return {
            eventId: event.id,
            eventName: event.normalizedEventName || event.systemKey || "unknown_event",
            displayName: event.normalizedLabel || event.normalizedEventName || "Unknown event",
            actorLabel: event.actor?.actorLabel || event.actor?.actorType || "Unknown actor",
            actorType: normalizeEventFlowActorType(event.actor?.actorType),
            actorId: event.actor?.actorId || undefined,
            surface: event.session?.sourceSurface || "background",
            source,
            eventContext,
            createdAtUtc: timestamp > 0 ? new Date(timestamp).toISOString() : "unknown",
            ageLabel: timestamp > 0 ? formatRelative(timestamp) : "unknown age",
            freshnessState: getEventFreshnessState(timestamp),
            findingsCount: Number(event.findingCount || 0),
            evalEligible: event.readiness?.trainingEligible === true && !identityLink && !systemDropClick && eventContext !== "notification_system" && eventContext !== "server_system",
            evalEligibilityReason: buildEvalEligibilityReason(event, eventContext, requiredMissingInputs),
            missingInputs: Array.isArray(event.dependencyReadiness?.missing) ? event.dependencyReadiness.missing : [],
            requiredMissingInputs,
            state,
            duplicateCount: 1,
            duplicateEventIds: [event.id],
        };
    });
    const grouped = new Map<string, RecentEventFlowRow>();
    rows.forEach((row) => {
        const bucket = row.createdAtUtc === "unknown" ? "unknown" : Math.floor(Date.parse(row.createdAtUtc) / EVENT_FLOW_GROUP_WINDOW_MS);
        const findingKey = row.findingsCount > 0 ? `${row.state}:${row.requiredMissingInputs.join(",")}` : "no-findings";
        const groupSurface = row.eventContext === "identity_linkage" ? "identity" : row.surface;
        const key = [row.eventName, row.actorId || row.actorLabel, groupSurface, row.source, row.eventContext, bucket, findingKey].join("|");
        const existing = grouped.get(key);
        if (!existing) {
            grouped.set(key, row);
            return;
        }
        existing.duplicateCount += 1;
        existing.duplicateEventIds.push(row.eventId);
        if (row.createdAtUtc !== "unknown" && (existing.createdAtUtc === "unknown" || row.createdAtUtc > existing.createdAtUtc)) {
            existing.createdAtUtc = row.createdAtUtc;
            existing.ageLabel = row.ageLabel;
            existing.freshnessState = row.freshnessState;
        }
    });
    return Array.from(grouped.values()).sort((left, right) => Date.parse(right.createdAtUtc) - Date.parse(left.createdAtUtc));
}
function buildLowConfidenceCauseBreakdown(rows: RecentEventFlowRow[]) {
    const causes = new Map<string, number>();
    rows.forEach((row) => {
        if (row.requiredMissingInputs.includes("actor") || row.actorType === "unknown") causes.set("system event missing ownership", (causes.get("system event missing ownership") || 0) + row.duplicateCount);
        if (row.eventContext === "background_task_engine" || row.eventContext === "background_ledger" || row.eventContext === "notification_system" || row.eventContext === "server_system") causes.set("background event excluded from scoring", (causes.get("background event excluded from scoring") || 0) + row.duplicateCount);
        if (row.requiredMissingInputs.includes("route")) causes.set("missing route for foreground telemetry", (causes.get("missing route for foreground telemetry") || 0) + row.duplicateCount);
        if (row.eventContext === "notification_system" && row.state === "review") causes.set("orphaned notification context", (causes.get("orphaned notification context") || 0) + row.duplicateCount);
        if (row.surface === "background" || row.surface === "unknown") causes.set("unknown source surface", (causes.get("unknown source surface") || 0) + row.duplicateCount);
        if (row.source === "unknown") causes.set("orphaned event mapping", (causes.get("orphaned event mapping") || 0) + row.duplicateCount);
    });
    return Array.from(causes.entries()).sort((left, right) => right[1] - left[1]).slice(0, 3);
}

/* ─── Props ─── */
export interface DebugTabMonitoringProps extends DebugMonitoringRoutesProps {
    data: any;
    user: any;
    userProfile: any;
    isCompactViewport: boolean;
    routeRuntimeHealthSummary: any;
    nativeChatRouteRuntimeSummary: any;
    compatibilityChatRouteRuntimeSummary: any;
    recentTransactions: any[];
    queueRuntimeSummary: any;
    queueJobHeartbeats: any[];
    runtimeWarnings: any[];
    notificationDispatchOutcomes: any[];
}

/* ─── Component ─── */
export function DebugTabMonitoring(props: DebugTabMonitoringProps) {
    const {
        data, user, userProfile, isCompactViewport,
        routeRuntimeHealthSummary,
        recentTransactions, queueRuntimeSummary, queueJobHeartbeats,
        runtimeWarnings, notificationDispatchOutcomes,
        /* route props forwarded to sub-component */
        routeRuntimeFilter, routeRuntimeHealth, filteredRouteRuntimeHealth,
        nativeChatRouteRuntimeHealth, nativeChatRouteRuntimeRates,
        compatibilityChatRouteRuntimeHealth, compatibilityChatRouteRuntimeRates,
        onRouteRuntimeFilterChange,
    } = props;
    const routeRuntimeSummaryTruth = buildRouteRuntimeSummaryTruth(routeRuntimeHealth);
    const routeRuntimeRollup = buildRouteRuntimeRollup(routeRuntimeHealth);
    const routeRuntimeDisplay = buildRouteRuntimeDisplayStatus(routeRuntimeRollup);
    const routeRuntimeLoaded = routeRuntimeSummaryTruth.trackedCount > 0;
    const queueContinuityStatus = queueRuntimeSummary.continuityStatus || (queueRuntimeSummary.heartbeatState === "missing_heartbeat" ? "degraded_missing_heartbeat" : undefined);
    const queueLoaded = queueJobHeartbeats.length > 0 || notificationDispatchOutcomes.length > 0 || queueRuntimeSummary.warnings.total > 0;
    const queueHeartbeatStatus = queueRuntimeSummary.schedulerHeartbeat?.status || queueRuntimeSummary.heartbeatState || "unknown";
    const queueOutcomeStatus = queueRuntimeSummary.dispatchOutcomes?.status || queueRuntimeSummary.outcomesState || "unknown";
    const queueDriftSourceLoaded = queueRuntimeSummary.queueDrift?.sourceLoaded === true;
    const queueNeedsReview = queueRuntimeSummary.jobHeartbeats.stale > 0
        || queueRuntimeSummary.jobHeartbeats.failed > 0
        || queueRuntimeSummary.missingNotificationOutcomes > 0
        || queueRuntimeSummary.warnings.degraded > 0
        || queueHeartbeatStatus === "missing"
        || queueHeartbeatStatus === "missing_heartbeat"
        || queueContinuityStatus === "degraded_missing_heartbeat"
        || queueContinuityStatus === "broken_drift";
    const queueStatus = queueContinuityStatus || (!queueLoaded ? "source_ready_no_sample_loaded" : queueNeedsReview ? "degraded_missing_heartbeat" : "healthy_current");
    const adminDisplayName = userProfile?.username || userProfile?.displayName || user?.displayName || "Current admin";
    const gaConfigState = sourceConfigStateForOptionalFlag(data?.opsHealth?.runtime?.gaPropertyConfigured);
    const vapidConfigState = sourceConfigStateForOptionalFlag(data?.opsHealth?.runtime?.vapidConfigured);
    const databaseConfigState = sourceConfigStateForOptionalFlag(data?.opsHealth?.runtime?.databaseUrlConfigured);
    const navigationSigningConfigState = sourceConfigStateForOptionalFlag(data?.opsHealth?.runtime?.navigationSessionSigningReady);
    const recentEventFlowRows = buildRecentEventFlowRows(data?.orchestration?.events || []);
    const lowConfidenceCauses = buildLowConfidenceCauseBreakdown(recentEventFlowRows);
    const latestEventRow = recentEventFlowRows[0];
    const monitoringDataLoaded = Boolean(data);
    const orchestrationEventsStatus = sourceStatusForOptionalNumber(data?.stats?.orchestrationEvents, monitoringDataLoaded);
    const orchestrationLowConfidenceStatus = sourceStatusForOptionalNumber(data?.stats?.orchestrationLowConfidence, monitoringDataLoaded);
    const recentEventDetailLoaded = Array.isArray(data?.orchestration?.events);
    const recentEventRowsStatus = sourceStatusForSampleArray(recentEventFlowRows, recentEventDetailLoaded);
    const recentTaskEventsStatus = sourceStatusForSampleArray(data?.recentTaskEvents, monitoringDataLoaded);
    const taskRollupsStatus = sourceStatusForSampleArray(data?.taskRollups, monitoringDataLoaded);
    const dailyTaskSeriesStatus = sourceStatusForSampleArray(data?.dailyTaskSeries, monitoringDataLoaded);
    const receiptsLast7dStatus = sourceStatusForOptionalNumber(data?.stats?.receiptsLast7d, monitoringDataLoaded);
    const recentReceiptsStatus = sourceStatusForSampleArray(data?.recentReceipts, monitoringDataLoaded);
    const routeRuntimeChatFailCount = routeRuntimeRollup.cohorts.chat_native.currentFailCount + routeRuntimeRollup.cohorts.chat_compat.currentFailCount;
    const routeRuntimeChatStaleCount = routeRuntimeRollup.cohorts.chat_native.staleRoutes + routeRuntimeRollup.cohorts.chat_compat.staleRoutes;
    const routeRuntimeChatUnseenCount = routeRuntimeRollup.cohorts.chat_native.unseenRoutes + routeRuntimeRollup.cohorts.chat_compat.unseenRoutes;
    const nativeChatTriple = formatChatTriple("Native chat", routeRuntimeRollup.cohorts.chat_native);
    const compatChatTriple = formatChatTriple("Compat chat", routeRuntimeRollup.cohorts.chat_compat);
    const routeRuntimeChatTruthState = routeRuntimeChatFailCount > 0
        ? "failed"
        : routeRuntimeChatStaleCount > 0
            ? "stale"
            : routeRuntimeChatUnseenCount > 0
                ? "unavailable"
                : routeRuntimeLoaded ? "live" : "unavailable";
    const routeRuntimeSummary = (
        <>
            <Pill label="Status" value={routeRuntimeDisplay.displayState} tone={routeRuntimeDisplay.displayState === "failed" ? "bad" : routeRuntimeDisplay.displayState === "degraded" ? "warn" : "good"} truthState={routeRuntimeDisplay.displayState === "failed" ? "failed" : routeRuntimeDisplay.displayState === "degraded" ? "degraded" : routeRuntimeLoaded ? "live" : "unavailable"} />
            <Pill label="Tracked" value={routeRuntimeRollup.trackedCount} truthState={routeRuntimeLoaded ? "live" : "unavailable"} badgeLabel={routeRuntimeLoaded ? "LOADED" : "UNKNOWN"} />
            <Pill label="Observed" value={routeRuntimeRollup.observedCount} truthState={routeRuntimeRollup.observedCount > 0 ? "live" : "unavailable"} badgeLabel={routeRuntimeRollup.observedCount > 0 ? "LOADED" : "NO SAMPLE"} />
            <Pill label="Filter" value={routeRuntimeFilter.replace("_", " ")} truthState={routeRuntimeLoaded ? "live" : "unavailable"} badgeLabel="INFO" />
            {routeRuntimeDisplay.badges.map((badge) => (
                <Pill key={badge.label} label={labelForRouteRuntimeBadge(badge.label)} value={badge.value} tone={toneForRouteRuntimeDisplayState(badge.state)} truthState={truthForRouteRuntimeDisplayState(badge.state)} badgeLabel={badge.state.toUpperCase()} />
            ))}
            <Pill
                label="Chat routes"
                value={`${nativeChatTriple} | ${compatChatTriple}`}
                tone={routeRuntimeChatFailCount > 0 ? "bad" : routeRuntimeChatStaleCount > 0 || routeRuntimeChatUnseenCount > 0 ? "warn" : "good"}
                truthState={routeRuntimeChatTruthState}
                badgeLabel="DRILLDOWN"
            />
            <span className="sr-only min-w-0 wrap-anywhere">
                Native chat observed {routeRuntimeRollup.cohorts.chat_native.observedRoutes}. Native chat samples {routeRuntimeRollup.cohorts.chat_native.samples}.
                Compat observed {routeRuntimeRollup.cohorts.chat_compat.observedRoutes}. Compat samples {routeRuntimeRollup.cohorts.chat_compat.samples}.
            </span>
        </>
    );

    return (
        <AdminDebugWorkstream
            eyebrow="Monitoring"
            title="Runtime evidence ledger"
            subtitle="Read current route and queue evidence first. Activity samples and session details remain available below."
        >
            <Section
                title="Tracked route runtime"
                subtitle="Canonical route rollups for debug, overview, support, chat, creator relationships, and AI flows."
                defaultOpen={routeRuntimeHealthSummary.fail > 0 || routeRuntimeHealthSummary.warn > 0 || routeRuntimeHealthSummary.stale > 0}
                summary={routeRuntimeSummary}
            >
                <DebugMonitoringRoutes
                    routeRuntimeSummaryTruth={routeRuntimeSummaryTruth}
                    routeRuntimeFilter={routeRuntimeFilter}
                    routeRuntimeHealth={routeRuntimeHealth}
                    filteredRouteRuntimeHealth={filteredRouteRuntimeHealth}
                    nativeChatRouteRuntimeHealth={nativeChatRouteRuntimeHealth}
                    nativeChatRouteRuntimeRates={nativeChatRouteRuntimeRates}
                    compatibilityChatRouteRuntimeHealth={compatibilityChatRouteRuntimeHealth}
                    compatibilityChatRouteRuntimeRates={compatibilityChatRouteRuntimeRates}
                    onRouteRuntimeFilterChange={onRouteRuntimeFilterChange}
                />
            </Section>

            <Section
                title="Queue runtime continuity"
                subtitle="Canonical scheduler heartbeats, runtime warnings, and notification outcomes for queue lifecycle health."
                defaultOpen={queueNeedsReview || notificationDispatchOutcomes.length > 0}
                summary={<><Pill label="Status" value={queueStatus} tone={toneForQueueContinuityStatus(queueStatus)} truthState={truthForQueueContinuityStatus(queueStatus)} badgeLabel={queueRuntimeSummary.liveStatusAllowed === true ? "LIVE" : queueLoaded ? "REVIEW" : "NO SAMPLE"} /><Pill label="Jobs" value={queueRuntimeSummary.jobHeartbeats.total} tone={toneForQueueLaneStatus(queueHeartbeatStatus)} truthState={truthForQueueLaneStatus(queueHeartbeatStatus)} badgeLabel={queueHeartbeatStatus === "observed_current" ? "CURRENT" : queueHeartbeatStatus === "missing" ? "MISSING" : "UNKNOWN"} /><Pill label="Outcomes" value={notificationDispatchOutcomes.length} tone={toneForQueueLaneStatus(queueOutcomeStatus)} truthState={truthForQueueLaneStatus(queueOutcomeStatus)} badgeLabel={queueOutcomeStatus === "observed_current" ? "READABLE" : queueOutcomeStatus === "observed_stale" ? "STALE" : "UNKNOWN"} /><Pill label="Warnings" value={queueRuntimeSummary.warnings.total} tone={queueRuntimeSummary.warnings.total > 0 ? "warn" : queueLoaded ? "good" : "neutral"} truthState={queueLoaded ? "live" : "unavailable"} badgeLabel={queueLoaded ? "SOURCE" : "UNKNOWN"} /><Pill label="Needs review" value={queueRuntimeSummary.warnings.degraded} tone={queueRuntimeSummary.warnings.degraded > 0 ? "warn" : "neutral"} truthState={queueLoaded ? "live" : "unavailable"} badgeLabel={queueLoaded ? "SOURCE" : "UNKNOWN"} /></>}
            >
                <div
                    className="grid gap-4 min-w-0 wrap-anywhere"
                    data-queue-runtime-loaded={queueLoaded ? "true" : "false"}
                    data-queue-runtime-heartbeat-count={queueJobHeartbeats.length}
                    data-queue-runtime-outcome-count={notificationDispatchOutcomes.length}
                    data-queue-runtime-warning-count={queueRuntimeSummary.warnings.total}
                    data-queue-continuity-status={queueStatus}
                    data-queue-heartbeat-status={queueHeartbeatStatus}
                    data-queue-outcome-status={queueOutcomeStatus}
                    data-queue-drift-source-loaded={queueDriftSourceLoaded ? "true" : "false"}
                >
                    <div className="p-4 min-w-0 wrap-anywhere">
                        <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere">
                            <Pill label="Heartbeat lane" value={queueHeartbeatStatus} tone={toneForQueueLaneStatus(queueHeartbeatStatus)} truthState={truthForQueueLaneStatus(queueHeartbeatStatus)} badgeLabel={queueHeartbeatStatus === "missing" ? "MISSING" : queueHeartbeatStatus === "observed_current" ? "CURRENT" : "UNKNOWN"} />
                            <Pill label="Outcome lane" value={queueOutcomeStatus} tone={toneForQueueLaneStatus(queueOutcomeStatus)} truthState={truthForQueueLaneStatus(queueOutcomeStatus)} badgeLabel={queueOutcomeStatus === "observed_current" ? "READABLE" : queueOutcomeStatus === "observed_stale" ? "STALE" : "UNKNOWN"} />
                            <Pill label="Continuity" value={queueStatus} tone={toneForQueueContinuityStatus(queueStatus)} truthState={truthForQueueContinuityStatus(queueStatus)} badgeLabel={queueRuntimeSummary.liveStatusAllowed === true ? "LIVE" : "NOT LIVE"} />
                            {(queueRuntimeSummary.warningReasons || []).map((reason: string) => <Pill key={reason} label="Reason" value={reason} tone="warn" />)}
                        </div>
                        {queueJobHeartbeats.length === 0 && notificationDispatchOutcomes.length > 0 ? (
                            <p className="mt-3 text-sm text-warning min-w-0 wrap-anywhere">No heartbeat records, but dispatch outcome records exist. Treat heartbeat evidence as missing while outcome rows remain readable.</p>
                        ) : null}
                        {queueRuntimeSummary.nextAction ? <p className="mt-2 text-sm text-foreground min-w-0 wrap-anywhere">{queueRuntimeSummary.nextAction}</p> : null}
                    </div>
                <div className="grid gap-4 min-w-0 wrap-anywhere">
                    <div className="space-y-4 min-w-0 wrap-anywhere">
                        <ScrollWrap>
                            <div className="divide-y divide-border min-w-0 wrap-anywhere">
                                <h3 className="min-w-0 wrap-anywhere py-3 text-sm font-semibold text-foreground">Scheduler heartbeats</h3>
                            {queueJobHeartbeats.map((entry: any) => (
                                    <div key={entry.jobId} className="space-y-2 px-4 py-3 min-w-0 wrap-anywhere">
                                        <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 wrap-anywhere">
                                            <div><p className="font-semibold text-foreground min-w-0 wrap-anywhere">{entry.jobId}</p><p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">Last touch {formatRelative(entry.completedAt || entry.startedAt || entry.updatedAt)}</p></div>
                                            <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere"><Pill label="Status" value={entry.status} tone={entry.status === "failed" ? "bad" : entry.status === "warn" || entry.status === "running" ? "warn" : "good"} /><Pill label="Scanned" value={entry.itemsScanned ?? 0} /><Pill label="Changed" value={entry.itemsChanged ?? 0} /></div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere"><Pill label="Duration" value={`${entry.durationMs ?? 0}ms`} /><Pill label="Stale after" value={formatWindowHours(entry.staleAfterMs)} /><Pill label="Warnings" value={(entry.warnings || []).length} tone={(entry.warnings || []).length > 0 ? "warn" : "good"} /></div>
                                        {entry.lastErrorCode ? <p className="text-sm text-warning min-w-0 wrap-anywhere">{entry.lastErrorCode}</p> : null}
                                    </div>
                                ))}
                                {queueJobHeartbeats.length === 0 ? <div className="px-4 py-4 text-sm text-warning min-w-0 wrap-anywhere">{notificationDispatchOutcomes.length > 0 ? "No heartbeat records, but dispatch outcome records exist." : "No queue scheduler heartbeats have been recorded yet."}</div> : null}
                            </div>
                        </ScrollWrap>
                        <div className="p-4 min-w-0 wrap-anywhere">
                            <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere"><Pill label="Warnings" value={queueRuntimeSummary.warnings.total} tone={queueRuntimeSummary.warnings.total > 0 ? "warn" : queueLoaded ? "good" : "neutral"} truthState={queueLoaded ? "live" : "unavailable"} /><Pill label="Failed" value={queueRuntimeSummary.warnings.failed} tone={queueRuntimeSummary.warnings.failed > 0 ? "bad" : queueLoaded ? "good" : "neutral"} truthState={queueLoaded ? "live" : "unavailable"} /><Pill label="Needs review" value={queueRuntimeSummary.warnings.degraded} tone={queueRuntimeSummary.warnings.degraded > 0 ? "warn" : queueLoaded ? "good" : "neutral"} truthState={queueLoaded ? "live" : "unavailable"} /><Pill label="Saved data" value={`${queueRuntimeSummary.warnings.fallback} / ${queueRuntimeSummary.savedDataStatus || "unknown"}`} tone={queueRuntimeSummary.warnings.fallback > 0 ? "warn" : queueOutcomeStatus === "observed_current" ? "good" : "neutral"} truthState={queueOutcomeStatus === "observed_current" ? "live" : "unavailable"} /><Pill label="Queue drift" value={`${queueRuntimeSummary.warnings.queueDriftWarnings} / ${queueRuntimeSummary.queueDrift?.status || "unknown"}`} tone={queueRuntimeSummary.warnings.queueDriftWarnings > 0 || queueRuntimeSummary.legacyAdapterStatus?.blocksContinuity ? "warn" : queueDriftSourceLoaded ? "good" : "neutral"} truthState={queueDriftSourceLoaded ? "live" : "unavailable"} /></div>
                            <p className="mt-3 text-sm text-foreground min-w-0 wrap-anywhere">Legacy queue adapters are compatibility-only. Any adapter usage or missing dispatch outcome should be treated as blocking runtime continuity drift.</p>
                        </div>
                    </div>
                    <div className="space-y-4 min-w-0 wrap-anywhere">
                        <ScrollWrap>
                            <div className="divide-y divide-border min-w-0 wrap-anywhere">
                                <h3 className="min-w-0 wrap-anywhere py-3 text-sm font-semibold text-foreground">Runtime warnings</h3>
                            {runtimeWarnings.slice(0, 20).map((entry: any) => (
                                    <div key={entry.stable_id} className="space-y-2 px-4 py-3 min-w-0 wrap-anywhere">
                                        <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 wrap-anywhere">
                                            <div><p className="font-semibold text-foreground min-w-0 wrap-anywhere">{entry.code}</p><p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{entry.surface} | {entry.executionLayer} | {formatRelative(entry.lastSeenAt)}</p></div>
                                            <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere"><Pill label="Status" value={formatRuntimeStatus(entry.status)} tone={entry.status === "failed" ? "bad" : entry.status === "fallback" || entry.status === "degraded" ? "warn" : "good"} /><Pill label="Count" value={entry.occurrenceCount ?? 0} /></div>
                                        </div>
                                        {entry.detail?.message ? <p className="text-sm text-foreground min-w-0 wrap-anywhere">{String(entry.detail.message)}</p> : null}
                                    </div>
                                ))}
                                {runtimeWarnings.length === 0 ? <div className="px-4 py-4 text-sm text-success min-w-0 wrap-anywhere">No persisted runtime warning records are active.</div> : null}
                            </div>
                        </ScrollWrap>
                        <ScrollWrap>
                            <div className="divide-y divide-border min-w-0 wrap-anywhere">
                                <h3 className="min-w-0 wrap-anywhere py-3 text-sm font-semibold text-foreground">Dispatch outcomes</h3>
                            {notificationDispatchOutcomes.slice(0, 20).map((entry: any) => {
                                    const dropLabel = entry.dropTitle || (entry.shortDropId && entry.shortDropId !== "unknown" ? `Drop ${entry.shortDropId}` : "Unknown drop");
                                    const metadataState = entry.dropMetadataState || entry.dropIdentityState || "unknown";
                                    const metadataResolved = entry.dropMetadataConfidence === "exact" || entry.dropMetadataConfidence === "inferred" || entry.dropIdentityState === "resolved";
                                    return <div
                                        key={entry.stable_id}
                                        className="space-y-2 px-4 py-3 min-w-0 wrap-anywhere"
                                        data-queue-runtime-drop-identity-state={entry.dropIdentityState || "unknown"}
                                        data-queue-runtime-drop-metadata-state={metadataState}
                                        data-queue-runtime-drop-metadata-source={entry.dropMetadataSource || "unknown"}
                                        data-queue-runtime-scheduler-key-parsed={entry.schedulerKeyParsed === true ? "true" : "false"}
                                        data-queue-runtime-drop-id={entry.dropId || ""}
                                        data-queue-runtime-scheduler-key={entry.schedulerKey || entry.activationKey || ""}
                                        data-queue-runtime-outcome={entry.outcome || entry.status || "unknown"}
                                        data-queue-runtime-scheduled-for-utc={entry.scheduledForUtc || ""}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 wrap-anywhere">
                                            <div className="min-w-0 wrap-anywhere">
                                                <p className="font-semibold text-foreground min-w-0 wrap-anywhere">{dropLabel}</p>
                                                <p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">
                                                    {entry.creatorName ? `Creator: ${entry.creatorName} | ` : ""}
                                                    {entry.queueKind === "drop_activation" ? "Drop activation" : "Notification dispatch"}
                                                    {entry.scheduledForUtc ? ` | Scheduled ${entry.scheduledForUtc}` : ""}
                                                    {entry.lastOutcomeAtUtc ? ` | Last outcome ${entry.lastOutcomeAtUtc}` : ""}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere"><Pill label="Outcome" value={entry.outcome || entry.status || "unknown"} tone={entry.outcome === "failed" ? "bad" : entry.outcome === "skipped" ? "warn" : "good"} /><Pill label="Error" value={entry.error || entry.errorCode || "none"} tone={entry.error || entry.errorCode ? "warn" : "good"} /></div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere">
                                            <Pill label="Drop metadata" value={metadataState} tone={metadataResolved ? "good" : "warn"} truthState={metadataResolved ? "live" : "degraded"} />
                                            <Pill label="Status" value={entry.status || "unknown"} />
                                            {entry.recipientCount !== undefined ? <Pill label="Recipients" value={entry.recipientCount} /> : null}
                                            {entry.notificationCount !== undefined ? <Pill label="Notifications" value={entry.notificationCount} /> : null}
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs min-w-0 wrap-anywhere">
                                            {entry.adminDropHref ? <Link href={entry.adminDropHref} className={buttonVariants({ variant: "ghost", className: "max-w-full justify-start whitespace-normal wrap-anywhere text-left" })}>View drop</Link> : null}
                                            {entry.adminCreatorHref ? <Link href={entry.adminCreatorHref} className={buttonVariants({ variant: "ghost", className: "max-w-full justify-start whitespace-normal wrap-anywhere text-left" })}>View creator</Link> : null}
                                        </div>
                                        <Disclosure className="min-w-0 text-sm text-muted-foreground">
                                            <DisclosureSummary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">Raw queue details</DisclosureSummary>
                                            <p className="mt-2 min-w-0 wrap-anywhere">Drop ID: {entry.dropId || entry.shortDropId || "unknown"}</p>
                                            <p>Scheduler key: {entry.schedulerKey || entry.activationKey || "unknown"}</p>
                                            <p>Scheduled UTC: {entry.scheduledForUtc || "unknown"}</p>
                                            <p>Last outcome UTC: {entry.lastOutcomeAtUtc || formatUtc(entry.updatedAt, "unknown")}</p>
                                            <p>Raw timestamp: {entry.updatedAt || 0}</p>
                                            {entry.dropMetadataWarning ? <p>{entry.dropMetadataWarning || "drop_metadata_missing"}: {entry.dropMetadataMissingReason || "metadata_missing_with_drop_id"}</p> : null}
                                            {entry.schedulerKeyParseError ? <p>scheduler_key_parse_error: {entry.schedulerKeyParseError}</p> : null}
                                        </Disclosure>
                                    </div>
                                })}
                                {notificationDispatchOutcomes.length === 0 ? <div className="px-4 py-4 text-sm text-warning min-w-0 wrap-anywhere">No recent notification dispatch outcomes are loaded yet.</div> : null}
                            </div>
                        </ScrollWrap>
                    </div>
                </div>
                </div>
            </Section>

            <Section title="Recent transactions" subtitle="Latest loaded commerce entries from the current bounded feed." defaultOpen summary={<><Pill label="Status" value={recentTransactions.length > 0 ? "loaded" : "empty"} truthState={recentTransactions.length > 0 ? "live" : "unavailable"} badgeLabel={recentTransactions.length > 0 ? "LOADED" : "EMPTY"} /><Pill label="Loaded" value={recentTransactions.length} truthState={recentTransactions.length > 0 ? "live" : "unavailable"} badgeLabel="INFO" /><Pill label="Feed window" value="Latest loaded entries" truthState={recentTransactions.length > 0 ? "live" : "unavailable"} badgeLabel="INFO" /></>}>
                <ScrollWrap>
                    <div className="divide-y divide-border min-w-0 wrap-anywhere" data-recent-transactions-loaded-count={recentTransactions.length}>
                        {recentTransactions.map((entry: any) => (
                            <article
                                key={entry.id}
                                className="min-w-0 space-y-3 py-4 wrap-anywhere"
                                data-transaction-created-at-utc={entry.createdAtUtc || formatUtc(entry.timestamp, "unknown")}
                                data-transaction-user-identity-state={entry.userIdentityState || "fallback_uid"}
                            >
                                <div className="flex items-start justify-between gap-3 min-w-0 wrap-anywhere">
                                    <div className="min-w-0 wrap-anywhere">
                                        <Link href={entry.adminUserHref || `/admin/user/${entry.userId}`} className={buttonVariants({ variant: "ghost", className: "max-w-full justify-start whitespace-normal wrap-anywhere text-left" })}>
                                            {entry.userDisplayName || entry.username || entry.shortUserId}
                                        </Link>
                                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground min-w-0 wrap-anywhere" title={entry.userIdRedacted || entry.shortUserId}>{entry.userIdRedacted || entry.shortUserId || "redacted_uid"}</p>
                                    </div>
                                    <Pill label="Amount" value={entry.amountDisplay || `${entry.amount} GD`} tone={toneForTransactionDirection(entry.direction)} truthState={entry ? "live" : "unavailable"} badgeLabel={entry.unit || "GD"} />
                                </div>
                                <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere">
                                    <Pill label="Type" value={entry.typeLabel || entry.type} truthState={entry ? "live" : "unavailable"} badgeLabel="INFO" />
                                    <Pill label="Source" value={entry.sourceLabel || entry.sourceOfFunds || "unknown_missing_metadata"} tone={entry.sourceOfFunds === "unknown_missing_metadata" || entry.sourceOfFunds === "legacy_unknown" ? "warn" : "neutral"} truthState={entry.sourceOfFunds === "unknown_missing_metadata" || entry.sourceOfFunds === "legacy_unknown" ? "degraded" : "live"} />
                                    <Pill label="Identity" value={entry.userIdentityState || "fallback_uid"} tone={toneForIdentityState(entry.userIdentityState)} />
                                </div>
                                <p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{entry.timestampLabel}</p>
                                <p className="text-sm text-foreground min-w-0 wrap-anywhere">{entry.description}</p>
                                {entry.continuityLabel ? <p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{entry.continuityLabel}</p> : null}
                                <Disclosure className="min-w-0 text-sm text-muted-foreground">
                                    <DisclosureSummary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">Transaction details</DisclosureSummary>
                                    <p className="mt-2 min-w-0 wrap-anywhere">Local time: {entry.timestampLabel}</p>
                                    <p>UTC: {entry.createdAtUtc || formatUtc(entry.timestamp, "unknown")}</p>
                                    <p data-full-uid-default-visible="false">Admin drilldown UID: {entry.userId}</p>
                                    {entry.userIdentityState !== "resolved" ? <p>User profile could not be resolved from loaded admin sample.</p> : null}
                                </Disclosure>
                            </article>
                        ))}
                    </div>
                    {recentTransactions.length === 0 ? <div className="px-4 py-4 text-sm text-warning min-w-0 wrap-anywhere">No recent transactions are loaded in the bounded feed.</div> : null}
                </ScrollWrap>
            </Section>

            <Section title="Recent event flow" subtitle="Derived recent events normalized from telemetry and backend signals." defaultOpen={!isCompactViewport} summary={<><Pill label="Events" value={countValueForOptionalNumber(data?.stats?.orchestrationEvents, monitoringDataLoaded)} tone={toneForSourceStatus(orchestrationEventsStatus)} truthState={truthStateForSourceStatus(orchestrationEventsStatus)} badgeLabel={badgeForSourceStatus(orchestrationEventsStatus)} /><Pill label="Low confidence" value={countValueForOptionalNumber(data?.stats?.orchestrationLowConfidence, monitoringDataLoaded)} tone={orchestrationLowConfidenceStatus === "loaded_with_data" ? "warn" : toneForSourceStatus(orchestrationLowConfidenceStatus)} truthState={truthStateForSourceStatus(orchestrationLowConfidenceStatus)} badgeLabel={orchestrationLowConfidenceStatus === "loaded_with_data" ? "REVIEW" : badgeForSourceStatus(orchestrationLowConfidenceStatus)} /><Pill label="Unique rows" value={countValueForSampleArray(recentEventFlowRows, recentEventDetailLoaded)} tone={toneForSourceStatus(recentEventRowsStatus)} truthState={truthStateForSourceStatus(recentEventRowsStatus)} badgeLabel={recentEventRowsStatus === "loaded_with_data" ? "GROUPED" : badgeForSourceStatus(recentEventRowsStatus)} /><Pill label="Last event age" value={latestEventRow?.ageLabel || (recentEventDetailLoaded ? "No sample" : DEBUG_MONITORING_NOT_LOADED)} truthState={latestEventRow ? "live" : recentEventDetailLoaded ? "review" : "unavailable"} badgeLabel={latestEventRow?.freshnessState?.toUpperCase() || (recentEventDetailLoaded ? "NO SAMPLE" : "MISSING")} /></>}>
                <ScrollWrap>
                    <div className="divide-y divide-border min-w-0 wrap-anywhere" data-event-flow-loaded-count={countValueForOptionalNumber(data?.stats?.orchestrationEvents, monitoringDataLoaded)} data-event-flow-low-confidence-count={countValueForOptionalNumber(data?.stats?.orchestrationLowConfidence, monitoringDataLoaded)} data-event-flow-grouped-count={countValueForSampleArray(recentEventFlowRows, recentEventDetailLoaded)}>
                        {recentEventFlowRows.length === 0 ? <p className="py-3 text-sm text-muted-foreground">{recentEventDetailLoaded ? "No recent event rows are loaded." : "Event detail is not included in the loaded response."}</p> : null}
                        {lowConfidenceCauses.length > 0 ? (
                            <div className="space-y-2 px-4 py-3 min-w-0 wrap-anywhere">
                                <p className="text-xs font-semibold text-muted-foreground min-w-0 wrap-anywhere">Top low-confidence causes</p>
                                <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere">
                                    {lowConfidenceCauses.map(([cause, count]) => <Pill key={cause} label={cause} value={count} tone="warn" badgeLabel="CAUSE" />)}
                                </div>
                            </div>
                        ) : null}
                        {recentEventFlowRows.map((event) => (
                            <div
                                key={event.eventId}
                                className="space-y-2 px-4 py-3 min-w-0 wrap-anywhere"
                                data-event-flow-context={event.eventContext}
                                data-event-flow-freshness={event.freshnessState}
                                data-event-flow-eval-eligible={event.evalEligible ? "true" : "false"}
                                data-event-flow-eval-reason={event.evalEligibilityReason}
                                data-event-flow-duplicate-count={event.duplicateCount}
                                data-event-flow-missing-inputs-required={event.requiredMissingInputs.join(",")}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 wrap-anywhere">
                                    <div><p className="font-semibold text-foreground min-w-0 wrap-anywhere">{event.displayName}{event.duplicateCount > 1 ? ` x${event.duplicateCount}` : ""}</p><p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{event.eventName} | {event.source} | {event.createdAtUtc} | {event.ageLabel}</p></div>
                                    <Pill label="Status" value={event.state} tone={event.state === "critical" ? "bad" : event.state === "review" ? "warn" : event.state === "healthy" ? "good" : "neutral"} truthState={event.state === "critical" ? "failed" : event.state === "review" ? "degraded" : "live"} />
                                </div>
                                <p className="text-sm text-foreground min-w-0 wrap-anywhere">{event.eventContext === "server_system" && event.eventName === "server_drop_clicked" ? "Server/system click lacks user ownership; excluded from user scoring." : event.evalEligibilityReason}</p>
                                <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere"><Pill label="Actor" value={event.actorLabel} truthState={event ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Surface" value={event.surface} truthState={event ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Context" value={event.eventContext} truthState={event ? "live" : "unavailable"} badgeLabel="INFO" /><Pill label="Freshness" value={event.freshnessState} truthState={event.freshnessState === "stale" ? "stale" : event.freshnessState === "unknown" ? "unavailable" : "live"} /><Pill label="Findings" value={event.findingsCount} tone={event.findingsCount ? "warn" : "good"} truthState={event.findingsCount ? "degraded" : "live"} /><Pill label="Eval eligible" value={event.evalEligible ? "yes" : "no"} tone={event.evalEligible ? "good" : "neutral"} truthState={event ? "live" : "unavailable"} badgeLabel={event.evalEligible ? "YES" : "INFO"} /></div>
                                {event.requiredMissingInputs.length ? (<p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">Missing required inputs: {event.requiredMissingInputs.join(", ")}</p>) : null}
                                {event.missingInputs.length > 0 && event.requiredMissingInputs.length === 0 ? (<p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">Context-only missing inputs ignored for this event type: {event.missingInputs.join(", ")}</p>) : null}
                                <Disclosure className="min-w-0 text-sm text-muted-foreground">
                                    <DisclosureSummary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">Event details</DisclosureSummary>
                                    <p className="mt-2 min-w-0 wrap-anywhere">createdAtUtc: {event.createdAtUtc}</p>
                                    <p>ageLabel: {event.ageLabel}</p>
                                    <p>evalEligibilityReason: {event.evalEligibilityReason}</p>
                                    <p>duplicateEventIds: {event.duplicateEventIds.join(", ")}</p>
                                </Disclosure>
                            </div>
                        ))}
                    </div>
                </ScrollWrap>
            </Section>

            <Section title="Recent task activity sample" subtitle="Recent task events and longer-tail rollups from the activity sample." defaultOpen={false} summary={<><Pill label="Recent events" value={countValueForSampleArray(data?.recentTaskEvents, monitoringDataLoaded)} tone={toneForSourceStatus(recentTaskEventsStatus)} truthState={truthStateForSourceStatus(recentTaskEventsStatus)} badgeLabel={badgeForSourceStatus(recentTaskEventsStatus)} /><Pill label="Rollups" value={countValueForSampleArray(data?.taskRollups, monitoringDataLoaded)} tone={toneForSourceStatus(taskRollupsStatus)} truthState={truthStateForSourceStatus(taskRollupsStatus)} badgeLabel={badgeForSourceStatus(taskRollupsStatus)} /><Pill label="Daily points" value={countValueForSampleArray(data?.dailyTaskSeries, monitoringDataLoaded)} tone={toneForSourceStatus(dailyTaskSeriesStatus)} truthState={truthStateForSourceStatus(dailyTaskSeriesStatus)} badgeLabel={badgeForSourceStatus(dailyTaskSeriesStatus)} /></>}>
                <div className="grid gap-4 min-w-0 wrap-anywhere">
                    <ScrollWrap>
                        <div className="divide-y divide-border min-w-0 wrap-anywhere" data-daily-task-activity-loaded-count={countValueForSampleArray(data?.recentTaskEvents, monitoringDataLoaded)}>
                            <h3 className="min-w-0 wrap-anywhere py-3 text-sm font-semibold text-foreground">Task events</h3>
                            {!data?.recentTaskEvents?.length ? <p className="py-3 text-sm text-muted-foreground">No task event rows are loaded.</p> : null}
                            {(data?.recentTaskEvents || []).map((event: any) => (
                                <div key={event.id} className="space-y-2 px-4 py-3 min-w-0 wrap-anywhere" data-daily-task-window-id={event.dailyTaskWindowId || "unknown"} data-daily-task-reason-code={event.reasonCode || event.reason || "unknown"} data-daily-task-source={event.source || "unknown"}>
                                    <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 wrap-anywhere">
                                        <div><p className="font-semibold text-foreground min-w-0 wrap-anywhere">{event.title || event.taskId}</p><p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{event.triggerEvent} | {event.updatedAtUtc || formatUtc(event.timestamp, "unknown")}</p></div>
                                        <Pill label="Status" value={event.type || "unknown"} tone={event.type === "failed" ? "warn" : event.type === "completed" ? "good" : "neutral"} truthState={event.type === "failed" ? "degraded" : "live"} badgeLabel={(event.type || "loaded").toUpperCase()} />
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere"><Pill label="User" value={event.username || event.userId || "unknown"} truthState={event ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Paid reward" value={`${event.creditedRewardGd || 0} GD`} truthState={event ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Potential reward" value={`${event.potentialRewardGd || 0} GD`} truthState={event ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Forfeited potential" value={`${event.forfeitedPotentialRewardGd || 0} GD`} truthState={event ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Progress" value={`${event.progress}/${event.maxProgress}`} truthState={event ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Window" value={event.dailyTaskWindowId || "unknown"} truthState={event.dailyTaskWindowId ? "live" : "unavailable"} badgeLabel={event.dailyTaskWindowId ? "WINDOW" : "MISSING"} /><Pill label="Reason" value={event.reasonCode || event.reason || "unknown"} tone={(event.reasonCode || event.reason) === "daily_window_expired" ? "warn" : "neutral"} /><Pill label="Source" value={event.source || "unknown"} truthState={event.source ? "live" : "unavailable"} badgeLabel="SOURCE" /></div>
                                    <Disclosure className="min-w-0 text-sm text-muted-foreground">
                                        <DisclosureSummary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">Task event timing</DisclosureSummary>
                                        <p className="mt-2 min-w-0 wrap-anywhere">assignedAtUtc: {event.assignedAtUtc || formatUtc(event.assignedAt, "unknown")}</p>
                                        <p>updatedAtUtc: {event.updatedAtUtc || formatUtc(event.timestamp, "unknown")}</p>
                                        <p>expiresAtUtc: {event.expiresAtUtc || "unknown"}</p>
                                        <p>rewardEventState: {event.rewardEventState || "unknown"}</p>
                                        <p>rewardCreditIdempotencyKey: {event.rewardCreditIdempotencyKey || "n/a"}</p>
                                        {event.rewardAuditFlag ? <p>rewardAuditFlag: {event.rewardAuditFlag}</p> : null}
                                    </Disclosure>
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                    <ScrollWrap>
                        <div className="divide-y divide-border min-w-0 wrap-anywhere">
                            <h3 className="min-w-0 wrap-anywhere py-3 text-sm font-semibold text-foreground">Task rollups</h3>
                            {!data?.taskRollups?.length ? <p className="py-3 text-sm text-muted-foreground">No task rollups are loaded.</p> : null}
                            
                            {(data?.taskRollups || []).map((rollup: any) => (
                                <div key={rollup.taskId} className="space-y-2 px-4 py-3 min-w-0 wrap-anywhere">
                                    <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 wrap-anywhere">
                                        <div><p className="font-semibold text-foreground min-w-0 wrap-anywhere">{rollup.title}</p><p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">Last event {formatRelative(rollup.lastEventAt)}</p></div>
                                        <Pill label="Completed" value={rollup.completed} />
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere"><Pill label="Assigned" value={rollup.assigned || 0} truthState={rollup ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Started" value={rollup.started} truthState={rollup ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Failed" value={rollup.failed} tone={rollup.failed ? "warn" : "good"} truthState={rollup ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Reminders" value={rollup.reminders} truthState={rollup ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Paid rewards" value={`${rollup.paidRewardTotalGd || 0} GD`} truthState={rollup ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Potential assigned" value={`${rollup.potentialRewardTotalGd || 0} GD`} truthState={rollup ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Forfeited potential" value={`${rollup.forfeitedPotentialRewardGd || 0} GD`} truthState={rollup ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Out of bounds" value={rollup.outOfBoundsEventCount || 0} tone={(rollup.outOfBoundsEventCount || 0) > 0 ? "warn" : "good"} truthState={rollup ? "live" : "unavailable"} badgeLabel="AUDIT" /></div>
                                </div>
                            ))}
                            <h3 className="min-w-0 wrap-anywhere py-3 text-sm font-semibold text-foreground">Daily series</h3>
                            {!data?.dailyTaskSeries?.length ? <p className="py-3 text-sm text-muted-foreground">No daily points are loaded.</p> : null}
                            
                            {(data?.dailyTaskSeries || []).map((day: any) => (
                                <div key={day.dayKey} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm text-foreground min-w-0 wrap-anywhere">
                                    <span className="font-semibold text-foreground min-w-0 wrap-anywhere">{day.dayKey}</span>
                                    <Pill label="Events" value={day.eventCount} truthState={day ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Assigned" value={day.assigned || 0} truthState={day ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Completed" value={day.completed} truthState={day ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Failed" value={day.failed} tone={day.failed ? "warn" : "good"} truthState={day ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Paid rewards" value={`${day.paidRewardTotalGd || 0} GD`} truthState={day ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Potential assigned" value={`${day.potentialRewardTotalGd || 0} GD`} truthState={day ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Forfeited potential" value={`${day.forfeitedPotentialRewardGd || 0} GD`} truthState={day ? "live" : "unavailable"} badgeLabel="LOADED" /><Pill label="Out of bounds" value={day.outOfBoundsEventCount || 0} tone={(day.outOfBoundsEventCount || 0) > 0 ? "warn" : "good"} truthState={day ? "live" : "unavailable"} badgeLabel="AUDIT" />
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                </div>
            </Section>

            <Section title="Recent receipts and dedupe sample" subtitle="Recent receipts plus dedupe counters from the current sample." defaultOpen={false} summary={<><Pill label="Receipts 7d" value={countValueForOptionalNumber(data?.stats?.receiptsLast7d, monitoringDataLoaded)} tone={toneForSourceStatus(receiptsLast7dStatus)} truthState={truthStateForSourceStatus(receiptsLast7dStatus)} badgeLabel={badgeForSourceStatus(receiptsLast7dStatus)} /><Pill label="Recent" value={countValueForSampleArray(data?.recentReceipts, monitoringDataLoaded)} tone={toneForSourceStatus(recentReceiptsStatus)} truthState={truthStateForSourceStatus(recentReceiptsStatus)} badgeLabel={badgeForSourceStatus(recentReceiptsStatus)} /></>}>
                <div className="grid gap-4 min-w-0 wrap-anywhere">
                    <ScrollWrap>
                        <div className="divide-y divide-border min-w-0 wrap-anywhere">
                            <h3 className="min-w-0 wrap-anywhere py-3 text-sm font-semibold text-foreground">Dedupe counters</h3>
                            {!data?.receiptSummary?.length ? <p className="py-3 text-sm text-muted-foreground">No dedupe counters are loaded.</p> : null}
                            {(data?.receiptSummary || []).map((receipt: any) => (
                                <div key={receipt.groupKey} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 min-w-0 wrap-anywhere">
                                    <div>
                                        <p className="font-semibold text-foreground min-w-0 wrap-anywhere">{receipt.displayLabel}</p>
                                        <p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{receipt.dedupeKeyLabel}</p>
                                        <p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{receipt.lastSeenAtUtc || formatTimestamp(receipt.lastSeenAt)}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere">
                                        <Pill label="Count" value={receipt.count} truthState={receipt ? "live" : "unavailable"} badgeLabel="LOADED" />
                                        {receipt.aliasCount > 1 ? <Pill label="Aliases" value={`${receipt.aliasCount} normalized`} truthState="cached" badgeLabel="ALIASES" /> : null}
                                        <Pill label="Source" value={receipt.sourceTruth} tone={toneForReceiptSourceState(receipt.sourceState)} truthState={truthStateForReceiptSourceState(receipt.sourceState)} badgeLabel={receipt.sourceState === "review" ? "REVIEW" : "LIVE"} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                    <ScrollWrap>
                        <div className="divide-y divide-border min-w-0 wrap-anywhere">
                            <h3 className="min-w-0 wrap-anywhere py-3 text-sm font-semibold text-foreground">Receipt records</h3>
                            {!data?.recentReceipts?.length ? <p className="py-3 text-sm text-muted-foreground">No receipt rows are loaded.</p> : null}
                            {(data?.recentReceipts || []).map((receipt: any) => (
                                <div key={receipt.receiptId} className="space-y-2 px-4 py-3 min-w-0 wrap-anywhere" data-debug-receipt-source-state={receipt.sourceState} data-debug-receipt-created-at-utc={receipt.createdAtUtc}>
                                    <div className="flex flex-wrap items-start justify-between gap-2 min-w-0 wrap-anywhere">
                                        <div className="space-y-1 min-w-0 wrap-anywhere">
                                            <p className="font-semibold text-foreground min-w-0 wrap-anywhere">{receipt.displayLabel}</p>
                                            {receipt.adminUserHref ? (
                                                <p className="text-xs text-foreground min-w-0 wrap-anywhere">
                                                    <Link href={receipt.adminUserHref} className={buttonVariants({ variant: "ghost", className: "max-w-full justify-start whitespace-normal wrap-anywhere text-left" })}>
                                                        {receipt.actorDisplayName}
                                                    </Link>
                                                    <span className="text-muted-foreground min-w-0 wrap-anywhere"> | {receipt.shortUserId}</span>
                                                </p>
                                            ) : (
                                                <p className="text-xs text-foreground min-w-0 wrap-anywhere">{receipt.actorDisplayName}<span className="text-muted-foreground min-w-0 wrap-anywhere"> | {receipt.shortUserId}</span></p>
                                            )}
                                            <p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{receipt.dedupeKeyLabel}</p>
                                            {receipt.amountDisplay ? <p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{receipt.amountDisplay}</p> : null}
                                            {receipt.sourceDetail ? <p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{receipt.sourceDetail}</p> : null}
                                        </div>
                                        <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere">
                                            <Pill label="Source" value={receipt.sourceTruth} tone={toneForReceiptSourceState(receipt.sourceState)} truthState={truthStateForReceiptSourceState(receipt.sourceState)} badgeLabel={receipt.sourceState === "review" ? "REVIEW" : "LIVE"} />
                                            <Pill label="Identity" value={receipt.userIdentityState} tone={toneForIdentityState(receipt.userIdentityState)} truthState={receipt.userIdentityState === "resolved" ? "live" : "degraded"} badgeLabel={receipt.userIdentityState === "resolved" ? "RESOLVED" : "FALLBACK"} />
                                            {receipt.aliasCount > 1 ? <Pill label="Aliases" value={`${receipt.aliasCount} aliases normalized`} truthState="cached" badgeLabel="ALIASES" /> : null}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground min-w-0 wrap-anywhere">{receipt.ageLabel} | {receipt.createdAtUtc}</p>
                                    <Disclosure className="min-w-0 text-sm text-muted-foreground">
                                        <DisclosureSummary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">Raw details</DisclosureSummary>
                                        <div className="mt-2 space-y-1 min-w-0 wrap-anywhere">
                                            <p>rawEventName: {receipt.rawEventName}</p>
                                            <p>dedupeKey: {receipt.dedupeKey}</p>
                                            <p>actorUserId: {receipt.actorUserId || "unknown"}</p>
                                            {receipt.targetDropId ? <p>targetDropId: {receipt.targetDropId}</p> : null}
                                            {receipt.targetDropTitle ? <p>targetDropTitle: {receipt.targetDropTitle}</p> : null}
                                        </div>
                                    </Disclosure>
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                </div>
            </Section>

            <Section title="Admin session + config readiness" subtitle="Current admin identity and required config presence for debug/admin tools. This does not prove external services are healthy." defaultOpen={false} summary={<><Pill label="Session" value="Admin session verified" tone={userProfile?.role === "admin" ? "good" : "warn"} truthState={userProfile?.role === "admin" ? "live" : "degraded"} badgeLabel="SESSION" /><Pill label="GA property" value={valueForConfigState(gaConfigState)} truthState={gaConfigState === "source_missing" ? "unavailable" : undefined} tone={gaConfigState === "configMissing" ? "warn" : "neutral"} badgeLabel={badgeForConfigState(gaConfigState)} /><Pill label="Runtime" value="Runtime not verified here" truthState="unavailable" badgeLabel="UNVERIFIED" /></>}>
                <div
                    className="p-4 min-w-0 wrap-anywhere"
                    data-admin-session-state={userProfile?.role === "admin" ? "sessionVerified" : "warning"}
                    data-admin-config-ga-state={gaConfigState}
                    data-admin-config-vapid-state={vapidConfigState}
                    data-admin-config-database-state={databaseConfigState}
                    data-admin-config-navigation-signing-state={navigationSigningConfigState}
                    data-admin-prereq-runtime-verified="false"
                    data-admin-session-sensitive-collapsed="true"
                >
                    <p className="mb-4 p-3 text-sm text-warning min-w-0 wrap-anywhere">These checks confirm the current admin session and config presence only. They do not prove GA, push, database, or all runtime dependencies are healthy. See runtime route health and writer health for live dependency behavior.</p>
                    <div className="grid gap-4 min-w-0 wrap-anywhere">
                        <div className="p-4 text-sm text-foreground min-w-0 wrap-anywhere">
                            <div className="flex flex-wrap justify-between gap-3 border-b border-border py-2 min-w-0 wrap-anywhere"><span className="text-muted-foreground min-w-0 wrap-anywhere">Admin</span><span className="wrap-anywhere text-foreground min-w-0">{adminDisplayName}</span></div>
                            <div className="flex flex-wrap justify-between gap-3 border-b border-border py-2 min-w-0 wrap-anywhere"><span className="text-muted-foreground min-w-0 wrap-anywhere">Role</span><span className="text-foreground min-w-0 wrap-anywhere">{userProfile?.role || "user"}</span></div>
                            <div className="flex flex-wrap justify-between gap-3 border-b border-border py-2 min-w-0 wrap-anywhere"><span className="text-muted-foreground min-w-0 wrap-anywhere">Project</span><span className="wrap-anywhere text-foreground min-w-0">{data?.opsHealth?.runtime?.projectId || "--"}</span></div>
                            <div className="flex flex-wrap justify-between gap-3 py-2 min-w-0 wrap-anywhere"><span className="text-muted-foreground min-w-0 wrap-anywhere">Warnings</span><span className="text-foreground min-w-0 wrap-anywhere">{Array.isArray(data?.opsHealth?.runtime?.warnings) ? `${data.opsHealth.runtime.warnings.length} config warning${data.opsHealth.runtime.warnings.length === 1 ? "" : "s"}` : DEBUG_MONITORING_NOT_LOADED}</span></div>
                            <Disclosure className="min-w-0 text-sm text-muted-foreground">
                                <DisclosureSummary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">Session details</DisclosureSummary>
                                <p className="mt-2 min-w-0 wrap-anywhere">User ID: {user?.uid || "--"}</p>
                                <p>Email: {user?.email || "--"}</p>
                            </Disclosure>
                        </div>
                        <div className="flex flex-wrap gap-2 min-w-0 wrap-anywhere">
                            <Pill label="GA property" value={valueForConfigState(gaConfigState)} truthState={gaConfigState === "source_missing" ? "unavailable" : undefined} tone={gaConfigState === "configMissing" ? "warn" : "neutral"} badgeLabel={badgeForConfigState(gaConfigState)} />
                            <Pill label="GA runtime" value="Runtime GA delivery not verified here" truthState="unavailable" badgeLabel="UNVERIFIED" />
                            <Pill label="VAPID" value={valueForConfigState(vapidConfigState)} truthState={vapidConfigState === "source_missing" ? "unavailable" : undefined} tone={vapidConfigState === "configMissing" ? "warn" : "neutral"} badgeLabel={badgeForConfigState(vapidConfigState)} />
                            <Pill label="Push delivery" value="Push delivery not verified here" truthState="unavailable" badgeLabel="UNVERIFIED" />
                            <Pill label="Database URL" value={valueForConfigState(databaseConfigState)} truthState={databaseConfigState === "source_missing" ? "unavailable" : undefined} tone={databaseConfigState === "configMissing" ? "warn" : "neutral"} badgeLabel={badgeForConfigState(databaseConfigState)} />
                            <Pill label="Database runtime" value="Runtime database connectivity not verified here" truthState="unavailable" badgeLabel="UNVERIFIED" />
                            <Pill label="Navigation signing" value={valueForConfigState(navigationSigningConfigState)} truthState={navigationSigningConfigState === "source_missing" ? "unavailable" : undefined} tone={navigationSigningConfigState === "configMissing" ? "warn" : "neutral"} badgeLabel={badgeForConfigState(navigationSigningConfigState)} />
                            <Pill label="Signing runtime" value={navigationSigningConfigState === "configPresent" ? "Config present, signing runtime not exercised" : navigationSigningConfigState === "configMissing" ? "Config missing; signing runtime not exercised" : "Signing config not loaded; runtime not exercised"} truthState="unavailable" badgeLabel="UNVERIFIED" />
                            {(data?.opsHealth?.runtime?.warnings || []).map((warning: string) => <Pill key={warning} label="Warning" value={warning} tone="warn" />)}
                        </div>
                    </div>
                </div>
            </Section>
        </AdminDebugWorkstream>
    );
}

