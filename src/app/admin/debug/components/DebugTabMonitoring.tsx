"use client";

import Link from "next/link";
import { Pill, Section, ScrollWrap } from "./DebugPrimitives";
import { DebugMonitoringRoutes, type DebugMonitoringRoutesProps } from "./DebugMonitoringRoutes";
import { buildRouteRuntimeSummaryTruth } from "@/lib/route-runtime-health";

/* ─── Helpers ─── */
function formatTimestamp(timestamp?: number) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString();
}
function formatUtc(timestamp?: number) {
    if (!timestamp) return "unknown";
    return new Date(timestamp).toISOString();
}
function formatRelative(timestamp?: number) {
    if (!timestamp) return "No recent activity";
    const deltaMs = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(deltaMs / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
function formatWindowHours(windowMs?: number) {
    if (!windowMs) return "current";
    return `${Math.max(1, Math.round(windowMs / 3_600_000))}h`;
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
        routeRuntimeHealthSummary, nativeChatRouteRuntimeSummary, compatibilityChatRouteRuntimeSummary,
        recentTransactions, queueRuntimeSummary, queueJobHeartbeats,
        runtimeWarnings, notificationDispatchOutcomes,
        /* route props forwarded to sub-component */
        routeRuntimeFilter, routeRuntimeHealth, filteredRouteRuntimeHealth,
        nativeChatRouteRuntimeHealth, nativeChatRouteRuntimeRates,
        compatibilityChatRouteRuntimeHealth, compatibilityChatRouteRuntimeRates,
        onRouteRuntimeFilterChange,
    } = props;
    const routeRuntimeSummaryTruth = buildRouteRuntimeSummaryTruth(routeRuntimeHealth);
    const routeRuntimeLoaded = routeRuntimeSummaryTruth.trackedCount > 0;
    const queueLoaded = queueJobHeartbeats.length > 0 || notificationDispatchOutcomes.length > 0 || queueRuntimeSummary.warnings.total > 0;
    const queueNeedsReview = queueRuntimeSummary.jobHeartbeats.stale > 0
        || queueRuntimeSummary.jobHeartbeats.failed > 0
        || queueRuntimeSummary.missingNotificationOutcomes > 0
        || queueRuntimeSummary.warnings.degraded > 0
        || queueRuntimeSummary.heartbeatState === "missing_heartbeat";
    const queueStatus = !queueLoaded ? "empty" : queueNeedsReview ? "review" : "live";
    const adminDisplayName = userProfile?.username || userProfile?.displayName || user?.displayName || "Current admin";
    const gaConfigState = data?.opsHealth?.runtime?.gaPropertyConfigured ? "configPresent" : "configMissing";
    const vapidConfigState = data?.opsHealth?.runtime?.vapidConfigured ? "configPresent" : "configMissing";
    const databaseConfigState = data?.opsHealth?.runtime?.databaseUrlConfigured ? "configPresent" : "configMissing";
    const navigationSigningConfigState = data?.opsHealth?.runtime?.navigationSessionSigningReady ? "configPresent" : "configMissing";
    const recentEventFlowRows = buildRecentEventFlowRows(data?.orchestration?.events || []);
    const lowConfidenceCauses = buildLowConfidenceCauseBreakdown(recentEventFlowRows);
    const latestEventRow = recentEventFlowRows[0];

    return (
        <div className="space-y-4">
            <Section
                title="Tracked route runtime"
                subtitle="Canonical route rollups for debug, overview, support, chat, creator relationships, and AI flows."
                defaultOpen={routeRuntimeHealthSummary.fail > 0 || routeRuntimeHealthSummary.warn > 0 || routeRuntimeHealthSummary.stale > 0}
                summary={<><Pill label="Status" value={routeRuntimeSummaryTruth.healthState} tone={routeRuntimeSummaryTruth.healthState === "error" ? "bad" : routeRuntimeSummaryTruth.healthState === "review" ? "warn" : "good"} truthState={routeRuntimeSummaryTruth.healthState === "error" ? "failed" : routeRuntimeSummaryTruth.healthState === "review" ? "degraded" : "live"} /><Pill label="Tracked" value={routeRuntimeSummaryTruth.trackedCount} truthState={routeRuntimeLoaded ? "live" : "unavailable"} badgeLabel={routeRuntimeLoaded ? "LOADED" : "UNKNOWN"} /><Pill label="Filter" value={routeRuntimeFilter.replace("_", " ")} truthState="live" badgeLabel="INFO" /><Pill label="Unseen" value={routeRuntimeSummaryTruth.unseenCount} tone={routeRuntimeSummaryTruth.unseenCount > 0 ? "warn" : "good"} /><Pill label="Stale" value={routeRuntimeSummaryTruth.staleCount} tone={routeRuntimeSummaryTruth.staleCount > 0 ? "warn" : "good"} /><Pill label="Warn" value={routeRuntimeSummaryTruth.warnCount} tone={routeRuntimeSummaryTruth.warnCount > 0 ? "warn" : "good"} /><Pill label="Fail" value={routeRuntimeSummaryTruth.failCount} tone={routeRuntimeSummaryTruth.failCount > 0 ? "bad" : "good"} /><Pill label="Slow samples" value={routeRuntimeSummaryTruth.slowSampleCount} tone={routeRuntimeSummaryTruth.slowSampleCount > 0 ? "warn" : "good"} /><Pill label="Native chat fail" value={nativeChatRouteRuntimeSummary.fail} tone={nativeChatRouteRuntimeSummary.fail > 0 ? "bad" : "good"} /><Pill label="Native chat stale" value={nativeChatRouteRuntimeSummary.stale} tone={nativeChatRouteRuntimeSummary.stale > 0 ? "warn" : "good"} /><Pill label="Native chat unseen" value={nativeChatRouteRuntimeSummary.unobserved} tone={nativeChatRouteRuntimeSummary.unobserved > 0 ? "warn" : "good"} /><Pill label="Compat chat fail" value={compatibilityChatRouteRuntimeSummary.fail} tone={compatibilityChatRouteRuntimeSummary.fail > 0 ? "bad" : "good"} /><Pill label="Compat chat stale" value={compatibilityChatRouteRuntimeSummary.stale} tone={compatibilityChatRouteRuntimeSummary.stale > 0 ? "warn" : "good"} /><Pill label="Compat chat unseen" value={compatibilityChatRouteRuntimeSummary.unobserved} tone={compatibilityChatRouteRuntimeSummary.unobserved > 0 ? "warn" : "good"} /></>}
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

            <Section title="Recent transactions" subtitle="Latest loaded commerce entries from the current bounded feed." defaultOpen summary={<><Pill label="Status" value={recentTransactions.length > 0 ? "loaded" : "empty"} truthState={recentTransactions.length > 0 ? "live" : "unavailable"} badgeLabel={recentTransactions.length > 0 ? "LOADED" : "EMPTY"} /><Pill label="Loaded" value={recentTransactions.length} truthState="live" badgeLabel="INFO" /><Pill label="Feed window" value="Latest loaded entries" truthState="live" badgeLabel="INFO" /></>}>
                <ScrollWrap>
                    <div className="space-y-3 p-3 md:hidden" data-recent-transactions-loaded-count={recentTransactions.length}>
                        {recentTransactions.map((entry: any) => (
                            <article
                                key={entry.id}
                                className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                                data-transaction-created-at-utc={entry.createdAtUtc || formatUtc(entry.timestamp)}
                                data-transaction-user-identity-state={entry.userIdentityState || "fallback_uid"}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <Link href={entry.adminUserHref || `/admin/user/${entry.userId}`} className="font-semibold text-white underline-offset-4 hover:underline">
                                            {entry.userDisplayName || entry.username || entry.shortUserId}
                                        </Link>
                                        <p className="mt-0.5 font-mono text-[11px] text-gray-500" title={entry.userId}>{entry.shortUserId || entry.userId}</p>
                                    </div>
                                    <Pill label="Amount" value={entry.amountDisplay || `${entry.amount} GD`} tone={toneForTransactionDirection(entry.direction)} truthState="live" badgeLabel={entry.unit || "GD"} />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Type" value={entry.typeLabel || entry.type} truthState="live" badgeLabel="INFO" />
                                    <Pill label="Source" value={entry.sourceOfFunds || "unknown"} tone={entry.sourceOfFunds === "unknown" ? "warn" : "neutral"} truthState={entry.sourceOfFunds === "unknown" ? "degraded" : "live"} />
                                    <Pill label="Identity" value={entry.userIdentityState || "fallback_uid"} tone={toneForIdentityState(entry.userIdentityState)} />
                                </div>
                                <p className="text-sm text-gray-300">{entry.description}</p>
                                {entry.continuityLabel ? <p className="text-xs text-gray-400">{entry.continuityLabel}</p> : null}
                                <details className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-gray-300">
                                    <summary className="min-h-9 cursor-pointer pt-2 text-gray-100">Transaction details</summary>
                                    <p className="mt-2">Local time: {entry.timestampLabel}</p>
                                    <p>UTC: {entry.createdAtUtc || formatUtc(entry.timestamp)}</p>
                                    <p>Full UID: {entry.userId}</p>
                                    {entry.userIdentityState !== "resolved" ? <p>User profile could not be resolved from loaded admin sample.</p> : null}
                                </details>
                            </article>
                        ))}
                    </div>
                    <table className="hidden w-full text-left text-sm md:table" data-recent-transactions-loaded-count={recentTransactions.length}>
                        <thead className="sticky top-0 bg-black/80 text-[11px] uppercase tracking-[0.16em] text-gray-400">
                            <tr><th className="px-3 py-3">Time</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">User</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Description</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {recentTransactions.map((entry: any) => (
                                <tr key={entry.id} data-transaction-created-at-utc={entry.createdAtUtc || formatUtc(entry.timestamp)} data-transaction-user-identity-state={entry.userIdentityState || "fallback_uid"}>
                                    <td className="px-3 py-3 text-gray-400" title={entry.createdAtUtc || formatUtc(entry.timestamp)}>{entry.timestampLabel}</td>
                                    <td className="px-3 py-3 text-brand-purple">{entry.typeLabel || entry.type}</td>
                                    <td className="px-3 py-3 text-white">{entry.amountDisplay || `${entry.amount} GD`}</td>
                                    <td className="px-3 py-3 text-gray-300">
                                        <Link href={entry.adminUserHref || `/admin/user/${entry.userId}`} className="font-semibold text-white underline-offset-4 hover:underline">
                                            {entry.userDisplayName || entry.username || entry.shortUserId}
                                        </Link>
                                        <p className="font-mono text-[11px] text-gray-500" title={entry.userId}>{entry.shortUserId || entry.userId}</p>
                                        {entry.userIdentityState !== "resolved" ? <p className="text-[11px] text-amber-200">identity_missing</p> : null}
                                    </td>
                                    <td className="px-3 py-3 text-gray-300">{entry.sourceOfFunds || "unknown"}</td>
                                    <td className="px-3 py-3 text-gray-400">
                                        <p>{entry.description}</p>
                                        {entry.continuityLabel ? <p className="mt-1 text-xs text-gray-500">{entry.continuityLabel}</p> : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {recentTransactions.length === 0 ? <div className="px-4 py-4 text-sm text-amber-100">No recent transactions are loaded in the bounded feed.</div> : null}
                </ScrollWrap>
            </Section>

            <Section
                title="Queue runtime continuity"
                subtitle="Canonical scheduler heartbeats, runtime warnings, and notification outcomes for queue lifecycle health."
                defaultOpen={queueNeedsReview || notificationDispatchOutcomes.length > 0}
                summary={<><Pill label="Status" value={queueStatus} tone={queueStatus === "review" ? "warn" : queueStatus === "live" ? "good" : "neutral"} truthState={queueStatus === "review" ? "degraded" : queueStatus === "live" ? "live" : "unavailable"} badgeLabel={queueLoaded ? "LOADED" : "EMPTY"} /><Pill label="Jobs" value={queueRuntimeSummary.jobHeartbeats.total} truthState="live" badgeLabel="INFO" /><Pill label="Outcomes" value={notificationDispatchOutcomes.length} truthState="live" badgeLabel="LOADED" /><Pill label="Warnings" value={queueRuntimeSummary.warnings.total} tone={queueRuntimeSummary.warnings.total > 0 ? "warn" : "good"} /><Pill label="Needs review" value={queueRuntimeSummary.warnings.degraded} tone={queueRuntimeSummary.warnings.degraded > 0 ? "warn" : "good"} /></>}
            >
                <div
                    className="grid gap-4 lg:grid-cols-1"
                    data-queue-runtime-loaded={queueLoaded ? "true" : "false"}
                    data-queue-runtime-heartbeat-count={queueJobHeartbeats.length}
                    data-queue-runtime-outcome-count={notificationDispatchOutcomes.length}
                    data-queue-runtime-warning-count={queueRuntimeSummary.warnings.total}
                >
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap gap-2">
                            <Pill label="Heartbeat lane" value={queueRuntimeSummary.heartbeatState || "unknown"} tone={queueRuntimeSummary.heartbeatState === "missing_heartbeat" || queueRuntimeSummary.heartbeatState === "stale" ? "warn" : queueRuntimeSummary.heartbeatState === "failed" ? "bad" : "good"} />
                            <Pill label="Outcome lane" value={queueRuntimeSummary.outcomesState || "unknown"} tone={queueRuntimeSummary.outcomesState === "failed" ? "bad" : notificationDispatchOutcomes.length > 0 ? "good" : "neutral"} />
                            {(queueRuntimeSummary.warningReasons || []).map((reason: string) => <Pill key={reason} label="Reason" value={reason} tone="warn" />)}
                        </div>
                        {queueJobHeartbeats.length === 0 && notificationDispatchOutcomes.length > 0 ? (
                            <p className="mt-3 text-sm text-amber-100">No heartbeat records, but dispatch outcome records exist. Treat heartbeat evidence as missing while outcome rows remain readable.</p>
                        ) : null}
                    </div>
                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="space-y-4">
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {queueJobHeartbeats.map((entry: any) => (
                                    <div key={entry.jobId} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div><p className="font-semibold text-white">{entry.jobId}</p><p className="text-xs text-gray-400">Last touch {formatRelative(entry.completedAt || entry.startedAt || entry.updatedAt)}</p></div>
                                            <div className="flex flex-wrap gap-2"><Pill label="Status" value={entry.status} tone={entry.status === "failed" ? "bad" : entry.status === "warn" || entry.status === "running" ? "warn" : "good"} /><Pill label="Scanned" value={entry.itemsScanned ?? 0} /><Pill label="Changed" value={entry.itemsChanged ?? 0} /></div>
                                        </div>
                                        <div className="flex flex-wrap gap-2"><Pill label="Duration" value={`${entry.durationMs ?? 0}ms`} /><Pill label="Stale after" value={formatWindowHours(entry.staleAfterMs)} /><Pill label="Warnings" value={(entry.warnings || []).length} tone={(entry.warnings || []).length > 0 ? "warn" : "good"} /></div>
                                        {entry.lastErrorCode ? <p className="text-sm text-amber-100">{entry.lastErrorCode}</p> : null}
                                    </div>
                                ))}
                                {queueJobHeartbeats.length === 0 ? <div className="px-4 py-4 text-sm text-amber-100">{notificationDispatchOutcomes.length > 0 ? "No heartbeat records, but dispatch outcome records exist." : "No queue scheduler heartbeats have been recorded yet."}</div> : null}
                            </div>
                        </ScrollWrap>
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex flex-wrap gap-2"><Pill label="Warnings" value={queueRuntimeSummary.warnings.total} tone={queueRuntimeSummary.warnings.total > 0 ? "warn" : "good"} /><Pill label="Failed" value={queueRuntimeSummary.warnings.failed} tone={queueRuntimeSummary.warnings.failed > 0 ? "bad" : "good"} /><Pill label="Needs review" value={queueRuntimeSummary.warnings.degraded} tone={queueRuntimeSummary.warnings.degraded > 0 ? "warn" : "good"} /><Pill label="Saved data" value={queueRuntimeSummary.warnings.fallback} tone={queueRuntimeSummary.warnings.fallback > 0 ? "warn" : "good"} /><Pill label="Queue drift" value={queueRuntimeSummary.warnings.queueDriftWarnings} tone={queueRuntimeSummary.warnings.queueDriftWarnings > 0 ? "warn" : "good"} /></div>
                            <p className="mt-3 text-sm text-gray-300">Legacy queue adapters are compatibility-only. Any adapter usage or missing dispatch outcome should be treated as blocking runtime continuity drift.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {runtimeWarnings.slice(0, 20).map((entry: any) => (
                                    <div key={entry.stable_id} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div><p className="font-semibold text-white">{entry.code}</p><p className="text-xs text-gray-400">{entry.surface} | {entry.executionLayer} | {formatRelative(entry.lastSeenAt)}</p></div>
                                            <div className="flex flex-wrap gap-2"><Pill label="Status" value={formatRuntimeStatus(entry.status)} tone={entry.status === "failed" ? "bad" : entry.status === "fallback" || entry.status === "degraded" ? "warn" : "good"} /><Pill label="Count" value={entry.occurrenceCount ?? 0} /></div>
                                        </div>
                                        {entry.detail?.message ? <p className="text-sm text-gray-300">{String(entry.detail.message)}</p> : null}
                                    </div>
                                ))}
                                {runtimeWarnings.length === 0 ? <div className="px-4 py-4 text-sm text-emerald-100">No persisted runtime warning records are active.</div> : null}
                            </div>
                        </ScrollWrap>
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {notificationDispatchOutcomes.slice(0, 20).map((entry: any) => (
                                    <div
                                        key={entry.stable_id}
                                        className="space-y-2 px-4 py-3"
                                        data-queue-runtime-drop-identity-state={entry.dropIdentityState || "unknown"}
                                        data-queue-runtime-drop-id={entry.dropId || ""}
                                        data-queue-runtime-scheduler-key={entry.schedulerKey || entry.activationKey || ""}
                                        data-queue-runtime-outcome={entry.outcome || entry.status || "unknown"}
                                        data-queue-runtime-scheduled-for-utc={entry.scheduledForUtc || ""}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-white">{entry.dropTitle || "Unknown drop"}</p>
                                                <p className="text-xs text-gray-400">
                                                    {entry.creatorName ? `Creator: ${entry.creatorName} | ` : ""}
                                                    {entry.queueKind === "drop_activation" ? "Drop activation" : "Notification dispatch"}
                                                    {entry.scheduledForUtc ? ` | Scheduled ${entry.scheduledForUtc}` : ""}
                                                    {entry.lastOutcomeAtUtc ? ` | Last outcome ${entry.lastOutcomeAtUtc}` : ""}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2"><Pill label="Outcome" value={entry.outcome || entry.status || "unknown"} tone={entry.outcome === "failed" ? "bad" : entry.outcome === "skipped" ? "warn" : "good"} /><Pill label="Error" value={entry.error || entry.errorCode || "none"} tone={entry.error || entry.errorCode ? "warn" : "good"} /></div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Drop metadata" value={entry.dropIdentityState || "unknown"} tone={entry.dropIdentityState === "resolved" ? "good" : "warn"} />
                                            <Pill label="Status" value={entry.status || "unknown"} />
                                            {entry.recipientCount !== undefined ? <Pill label="Recipients" value={entry.recipientCount} /> : null}
                                            {entry.notificationCount !== undefined ? <Pill label="Notifications" value={entry.notificationCount} /> : null}
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {entry.adminDropHref ? <Link href={entry.adminDropHref} className="min-h-9 rounded-full border border-white/10 px-3 py-2 text-white hover:bg-white/10">View drop</Link> : null}
                                            {entry.adminCreatorHref ? <Link href={entry.adminCreatorHref} className="min-h-9 rounded-full border border-white/10 px-3 py-2 text-white hover:bg-white/10">View creator</Link> : null}
                                        </div>
                                        <details className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-gray-300">
                                            <summary className="min-h-9 cursor-pointer pt-2 text-gray-100">Raw queue details</summary>
                                            <p className="mt-2">Drop ID: {entry.dropId || entry.shortDropId || "unknown"}</p>
                                            <p>Scheduler key: {entry.schedulerKey || entry.activationKey || "unknown"}</p>
                                            <p>Scheduled UTC: {entry.scheduledForUtc || "unknown"}</p>
                                            <p>Last outcome UTC: {entry.lastOutcomeAtUtc || formatUtc(entry.updatedAt)}</p>
                                            <p>Raw timestamp: {entry.updatedAt || 0}</p>
                                            {entry.dropIdentityState !== "resolved" ? <p>drop_metadata_missing</p> : null}
                                        </details>
                                    </div>
                                ))}
                                {notificationDispatchOutcomes.length === 0 ? <div className="px-4 py-4 text-sm text-amber-100">No recent notification dispatch outcomes are loaded yet.</div> : null}
                            </div>
                        </ScrollWrap>
                    </div>
                </div>
                </div>
            </Section>

            <Section title="Admin session + config readiness" subtitle="Current admin identity and required config presence for debug/admin tools. This does not prove external services are healthy." defaultOpen={false} summary={<><Pill label="Session" value="Admin session verified" tone={userProfile?.role === "admin" ? "good" : "warn"} truthState={userProfile?.role === "admin" ? "live" : "degraded"} badgeLabel="SESSION" /><Pill label="GA property" value={gaConfigState === "configPresent" ? "Config present" : "Config missing"} tone={gaConfigState === "configPresent" ? "neutral" : "warn"} badgeLabel={gaConfigState === "configPresent" ? "CONFIG" : "MISSING"} /><Pill label="Runtime" value="Runtime not verified here" truthState="unavailable" badgeLabel="UNVERIFIED" /></>}>
                <div
                    className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4"
                    data-admin-session-state={userProfile?.role === "admin" ? "sessionVerified" : "warning"}
                    data-admin-config-ga-state={gaConfigState}
                    data-admin-config-vapid-state={vapidConfigState}
                    data-admin-config-database-state={databaseConfigState}
                    data-admin-config-navigation-signing-state={navigationSigningConfigState}
                    data-admin-prereq-runtime-verified="false"
                    data-admin-session-sensitive-collapsed="true"
                >
                    <p className="mb-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">These checks confirm the current admin session and config presence only. They do not prove GA, push, database, or all runtime dependencies are healthy. See runtime route health and writer health for live dependency behavior.</p>
                    <div className="grid gap-4 lg:grid-cols-1">
                        <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
                            <div className="flex justify-between gap-3 border-b border-white/10 py-2"><span className="text-gray-400">Admin</span><span className="truncate text-white">{adminDisplayName}</span></div>
                            <div className="flex justify-between gap-3 border-b border-white/10 py-2"><span className="text-gray-400">Role</span><span className="text-white">{userProfile?.role || "user"}</span></div>
                            <div className="flex justify-between gap-3 border-b border-white/10 py-2"><span className="text-gray-400">Project</span><span className="truncate text-white">{data?.opsHealth?.runtime?.projectId || "--"}</span></div>
                            <div className="flex justify-between gap-3 py-2"><span className="text-gray-400">Warnings</span><span className="text-white">{data?.opsHealth?.runtime?.warnings?.length || 0} config warning{(data?.opsHealth?.runtime?.warnings?.length || 0) === 1 ? "" : "s"}</span></div>
                            <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-gray-300">
                                <summary className="min-h-9 cursor-pointer pt-2 text-gray-100">Session details</summary>
                                <p className="mt-2">User ID: {user?.uid || "--"}</p>
                                <p>Email: {user?.email || "--"}</p>
                            </details>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Pill label="GA property" value={gaConfigState === "configPresent" ? "Config present" : "Config missing"} tone={gaConfigState === "configPresent" ? "neutral" : "warn"} badgeLabel={gaConfigState === "configPresent" ? "CONFIG" : "MISSING"} />
                            <Pill label="GA runtime" value="Runtime GA delivery not verified here" truthState="unavailable" badgeLabel="UNVERIFIED" />
                            <Pill label="VAPID" value={vapidConfigState === "configPresent" ? "Config present" : "Config missing"} tone={vapidConfigState === "configPresent" ? "neutral" : "warn"} badgeLabel={vapidConfigState === "configPresent" ? "CONFIG" : "MISSING"} />
                            <Pill label="Push delivery" value="Push delivery not verified here" truthState="unavailable" badgeLabel="UNVERIFIED" />
                            <Pill label="Database URL" value={databaseConfigState === "configPresent" ? "Config present" : "Config missing"} tone={databaseConfigState === "configPresent" ? "neutral" : "warn"} badgeLabel={databaseConfigState === "configPresent" ? "CONFIG" : "MISSING"} />
                            <Pill label="Database runtime" value="Runtime database connectivity not verified here" truthState="unavailable" badgeLabel="UNVERIFIED" />
                            <Pill label="Navigation signing" value={navigationSigningConfigState === "configPresent" ? "Config present" : "Config missing"} tone={navigationSigningConfigState === "configPresent" ? "neutral" : "warn"} badgeLabel={navigationSigningConfigState === "configPresent" ? "CONFIG" : "MISSING"} />
                            <Pill label="Signing runtime" value="Config present, signing runtime not exercised" truthState="unavailable" badgeLabel="UNVERIFIED" />
                            {(data?.opsHealth?.runtime?.warnings || []).map((warning: string) => <Pill key={warning} label="Warning" value={warning} tone="warn" />)}
                        </div>
                    </div>
                </div>
            </Section>

            <Section title="Recent event flow" subtitle="Derived recent events normalized from telemetry and backend signals." defaultOpen={!isCompactViewport} summary={<><Pill label="Events" value={data?.stats?.orchestrationEvents ?? 0} truthState="live" badgeLabel="LOADED" /><Pill label="Low confidence" value={data?.stats?.orchestrationLowConfidence ?? 0} tone={(data?.stats?.orchestrationLowConfidence ?? 0) ? "warn" : "good"} badgeLabel={(data?.stats?.orchestrationLowConfidence ?? 0) ? "REVIEW" : "INFO"} /><Pill label="Unique rows" value={recentEventFlowRows.length} truthState="live" badgeLabel="GROUPED" /><Pill label="Last event age" value={latestEventRow?.ageLabel || "unknown"} truthState={latestEventRow ? "live" : "unavailable"} badgeLabel={latestEventRow?.freshnessState?.toUpperCase() || "UNKNOWN"} /></>}>
                <ScrollWrap>
                    <div className="divide-y divide-white/10" data-event-flow-loaded-count={data?.stats?.orchestrationEvents ?? 0} data-event-flow-low-confidence-count={data?.stats?.orchestrationLowConfidence ?? 0} data-event-flow-grouped-count={recentEventFlowRows.length}>
                        {lowConfidenceCauses.length > 0 ? (
                            <div className="space-y-2 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Top low-confidence causes</p>
                                <div className="flex flex-wrap gap-2">
                                    {lowConfidenceCauses.map(([cause, count]) => <Pill key={cause} label={cause} value={count} tone="warn" badgeLabel="CAUSE" />)}
                                </div>
                            </div>
                        ) : null}
                        {recentEventFlowRows.map((event) => (
                            <div
                                key={event.eventId}
                                className="space-y-2 px-4 py-3"
                                data-event-flow-context={event.eventContext}
                                data-event-flow-freshness={event.freshnessState}
                                data-event-flow-eval-eligible={event.evalEligible ? "true" : "false"}
                                data-event-flow-eval-reason={event.evalEligibilityReason}
                                data-event-flow-duplicate-count={event.duplicateCount}
                                data-event-flow-missing-inputs-required={event.requiredMissingInputs.join(",")}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div><p className="font-semibold text-white">{event.displayName}{event.duplicateCount > 1 ? ` x${event.duplicateCount}` : ""}</p><p className="text-xs text-gray-400">{event.eventName} | {event.source} | {event.createdAtUtc} | {event.ageLabel}</p></div>
                                    <Pill label="Status" value={event.state} tone={event.state === "critical" ? "bad" : event.state === "review" ? "warn" : event.state === "healthy" ? "good" : "neutral"} truthState={event.state === "critical" ? "failed" : event.state === "review" ? "degraded" : "live"} />
                                </div>
                                <p className="text-sm text-gray-200">{event.eventContext === "server_system" && event.eventName === "server_drop_clicked" ? "Server/system click lacks user ownership; excluded from user scoring." : event.evalEligibilityReason}</p>
                                <div className="flex flex-wrap gap-2"><Pill label="Actor" value={event.actorLabel} truthState="live" badgeLabel="LOADED" /><Pill label="Surface" value={event.surface} truthState="live" badgeLabel="LOADED" /><Pill label="Context" value={event.eventContext} truthState="live" badgeLabel="INFO" /><Pill label="Freshness" value={event.freshnessState} truthState={event.freshnessState === "stale" ? "stale" : event.freshnessState === "unknown" ? "unavailable" : "live"} /><Pill label="Findings" value={event.findingsCount} tone={event.findingsCount ? "warn" : "good"} truthState={event.findingsCount ? "degraded" : "live"} /><Pill label="Eval eligible" value={event.evalEligible ? "yes" : "no"} tone={event.evalEligible ? "good" : "neutral"} truthState="live" badgeLabel={event.evalEligible ? "YES" : "INFO"} /></div>
                                {event.requiredMissingInputs.length ? (<p className="text-xs text-gray-400">Missing required inputs: {event.requiredMissingInputs.join(", ")}</p>) : null}
                                {event.missingInputs.length > 0 && event.requiredMissingInputs.length === 0 ? (<p className="text-xs text-gray-500">Context-only missing inputs ignored for this event type: {event.missingInputs.join(", ")}</p>) : null}
                                <details className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-gray-300">
                                    <summary className="min-h-9 cursor-pointer pt-2 text-gray-100">Event details</summary>
                                    <p className="mt-2">createdAtUtc: {event.createdAtUtc}</p>
                                    <p>ageLabel: {event.ageLabel}</p>
                                    <p>evalEligibilityReason: {event.evalEligibilityReason}</p>
                                    <p>duplicateEventIds: {event.duplicateEventIds.join(", ")}</p>
                                </details>
                            </div>
                        ))}
                    </div>
                </ScrollWrap>
            </Section>

            <Section title="Recent task activity sample" subtitle="Recent task events and longer-tail rollups from the activity sample." defaultOpen={false} summary={<><Pill label="Recent events" value={(data?.recentTaskEvents || []).length} truthState="live" badgeLabel="LOADED" /><Pill label="Rollups" value={(data?.taskRollups || []).length} truthState="live" badgeLabel="LOADED" /><Pill label="Daily points" value={(data?.dailyTaskSeries || []).length} truthState="live" badgeLabel="LOADED" /></>}>
                <div className="grid gap-4 lg:grid-cols-1">
                    <ScrollWrap>
                        <div className="divide-y divide-white/10" data-daily-task-activity-loaded-count={(data?.recentTaskEvents || []).length}>
                            {(data?.recentTaskEvents || []).map((event: any) => (
                                <div key={event.id} className="space-y-2 px-4 py-3" data-daily-task-window-id={event.dailyTaskWindowId || "unknown"} data-daily-task-reason-code={event.reasonCode || event.reason || "unknown"} data-daily-task-source={event.source || "unknown"}>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div><p className="font-semibold text-white">{event.title || event.taskId}</p><p className="text-xs text-gray-400">{event.triggerEvent} | {event.updatedAtUtc || formatUtc(event.timestamp)}</p></div>
                                        <Pill label="Status" value={event.type || "unknown"} tone={event.type === "failed" ? "warn" : event.type === "completed" ? "good" : "neutral"} truthState={event.type === "failed" ? "degraded" : "live"} badgeLabel={(event.type || "loaded").toUpperCase()} />
                                    </div>
                                    <div className="flex flex-wrap gap-2"><Pill label="User" value={event.username || event.userId || "unknown"} truthState="live" badgeLabel="LOADED" /><Pill label="Reward" value={`${event.reward} GD`} truthState="live" badgeLabel="LOADED" /><Pill label="Progress" value={`${event.progress}/${event.maxProgress}`} truthState="live" badgeLabel="LOADED" /><Pill label="Window" value={event.dailyTaskWindowId || "unknown"} truthState={event.dailyTaskWindowId ? "live" : "unavailable"} badgeLabel={event.dailyTaskWindowId ? "WINDOW" : "MISSING"} /><Pill label="Reason" value={event.reasonCode || event.reason || "unknown"} tone={(event.reasonCode || event.reason) === "daily_window_expired" ? "warn" : "neutral"} /><Pill label="Source" value={event.source || "unknown"} truthState={event.source ? "live" : "unavailable"} badgeLabel="SOURCE" /></div>
                                    <details className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-gray-300">
                                        <summary className="min-h-9 cursor-pointer pt-2 text-gray-100">Task event timing</summary>
                                        <p className="mt-2">assignedAtUtc: {event.assignedAtUtc || formatUtc(event.assignedAt)}</p>
                                        <p>updatedAtUtc: {event.updatedAtUtc || formatUtc(event.timestamp)}</p>
                                        <p>expiresAtUtc: {event.expiresAtUtc || "unknown"}</p>
                                    </details>
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {(data?.taskRollups || []).map((rollup: any) => (
                                <div key={rollup.taskId} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div><p className="font-semibold text-white">{rollup.title}</p><p className="text-xs text-gray-400">Last event {formatRelative(rollup.lastEventAt)}</p></div>
                                        <Pill label="Completed" value={rollup.completed} />
                                    </div>
                                    <div className="flex flex-wrap gap-2"><Pill label="Started" value={rollup.started} /><Pill label="Failed" value={rollup.failed} tone={rollup.failed ? "warn" : "good"} /><Pill label="Reminders" value={rollup.reminders} /><Pill label="Reward total" value={rollup.rewardTotal} /></div>
                                </div>
                            ))}
                            {(data?.dailyTaskSeries || []).map((day: any) => (
                                <div key={day.dayKey} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm text-gray-300">
                                    <span className="font-semibold text-white">{day.dayKey}</span>
                                    <Pill label="Events" value={day.eventCount} /><Pill label="Completed" value={day.completed} /><Pill label="Failed" value={day.failed} tone={day.failed ? "warn" : "good"} /><Pill label="Rewards" value={day.rewardTotal} />
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                </div>
            </Section>

            <Section title="Recent receipts and dedupe sample" subtitle="Recent receipts plus dedupe counters from the current sample." defaultOpen={false} summary={<><Pill label="Receipts 7d" value={data?.stats?.receiptsLast7d ?? 0} /><Pill label="Recent" value={(data?.recentReceipts || []).length} /></>}>
                <div className="grid gap-4 lg:grid-cols-1">
                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {(data?.receiptSummary || []).map((receipt: any) => (
                                <div key={receipt.eventName} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                    <div><p className="font-semibold text-white">{receipt.eventName}</p><p className="text-xs text-gray-400">{formatTimestamp(receipt.lastSeenAt)}</p></div>
                                    <Pill label="Count" value={receipt.count} />
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {(data?.recentReceipts || []).map((receipt: any) => (
                                <div key={receipt.id} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div><p className="font-semibold text-white">{receipt.eventName}</p><p className="text-xs text-gray-400">{receipt.uid || "guest"} | {receipt.receiptKey}</p></div>
                                        <Pill label="Source" value={receipt.source} />
                                    </div>
                                    <p className="text-xs text-gray-400">{formatTimestamp(receipt.timestamp)}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                </div>
            </Section>
        </div>
    );
}
