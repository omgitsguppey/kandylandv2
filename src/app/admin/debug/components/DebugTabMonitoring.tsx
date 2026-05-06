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

            <Section title="Recent event flow" subtitle="Derived recent events normalized from telemetry and backend signals." defaultOpen={!isCompactViewport} summary={<><Pill label="Events" value={data?.stats?.orchestrationEvents ?? 0} /><Pill label="Low confidence" value={data?.stats?.orchestrationLowConfidence ?? 0} tone={(data?.stats?.orchestrationLowConfidence ?? 0) ? "warn" : "good"} /></>}>
                <ScrollWrap>
                    <div className="divide-y divide-white/10">
                        {(data?.orchestration?.events || []).map((event: any) => (
                            <div key={event.id} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div><p className="font-semibold text-white">{event.normalizedLabel}</p><p className="text-xs text-gray-400">{event.domain} | {event.systemKey}</p></div>
                                    <Pill label="Status" value={event.status} tone={event.status === "critical" ? "bad" : event.status === "attention" ? "warn" : "good"} />
                                </div>
                                <p className="text-sm text-gray-200">{event.humanSummary}</p>
                                <div className="flex flex-wrap gap-2"><Pill label="Actor" value={event.actor.actorLabel || event.actor.actorType} /><Pill label="Surface" value={event.session.sourceSurface || "background"} /><Pill label="Findings" value={event.findingCount} tone={event.findingCount ? "warn" : "good"} /><Pill label="Eval eligible" value={event.readiness.trainingEligible ? "yes" : "no"} tone={event.readiness.trainingEligible ? "good" : "warn"} /></div>
                                {event.dependencyReadiness.missing?.length ? (<p className="text-xs text-gray-400">Missing inputs: {event.dependencyReadiness.missing.join(", ")}</p>) : null}
                            </div>
                        ))}
                    </div>
                </ScrollWrap>
            </Section>

            <Section title="Recent task activity sample" subtitle="Recent task events and longer-tail rollups from the activity sample." defaultOpen={false} summary={<><Pill label="Recent events" value={(data?.recentTaskEvents || []).length} /><Pill label="Rollups" value={(data?.taskRollups || []).length} /><Pill label="Daily points" value={(data?.dailyTaskSeries || []).length} /></>}>
                <div className="grid gap-4 lg:grid-cols-1">
                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {(data?.recentTaskEvents || []).map((event: any) => (
                                <div key={event.id} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div><p className="font-semibold text-white">{event.title}</p><p className="text-xs text-gray-400">{event.triggerEvent}</p></div>
                                        <Pill label={event.type} value={formatRelative(event.timestamp)} />
                                    </div>
                                    <div className="flex flex-wrap gap-2"><Pill label="User" value={event.username} /><Pill label="Reward" value={event.reward} /><Pill label="Progress" value={`${event.progress}/${event.maxProgress}`} /></div>
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
