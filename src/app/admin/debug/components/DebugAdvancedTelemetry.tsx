"use client";

import { Pill, Section, ScrollWrap } from "./DebugPrimitives";

export interface DebugAdvancedTelemetryProps {
    data: any;
}

function compactNumber(value?: number) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
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

function toneForSeverity(severity?: string) {
    if (severity === "error") return "bad" as const;
    if (severity === "review" || severity === "warn") return "warn" as const;
    if (severity === "info" || severity === "live") return "good" as const;
    return "neutral" as const;
}

export function DebugAdvancedTelemetry({ data }: DebugAdvancedTelemetryProps) {
    const mappingSummary = data?.taskTelemetryMappingSummary;
    const sharedEventGroups = mappingSummary?.sharedEventGroups || [];
    const unsupportedRuntimeGroups = mappingSummary?.unsupportedRuntimeGroups || [];
    const alignmentWarnings = mappingSummary?.alignmentWarnings || [];
    const unsafeSharedEventGroups = sharedEventGroups.filter((entry: any) => entry.ambiguityState !== "safe_with_criteria");
    const safeSharedEventGroups = sharedEventGroups.filter((entry: any) => entry.ambiguityState === "safe_with_criteria");

    return (
        <>
            <Section
                title="Task telemetry mapping"
                subtitle="Canonical task facts, telemetry event stats, and shared-event ambiguity."
                defaultOpen={false}
                summary={
                    <>
                        <Pill label="Alignment warnings" value={mappingSummary?.alignmentWarningCount ?? data?.stats?.telemetryAlignmentWarnings ?? 0} tone={(mappingSummary?.alignmentWarningCount ?? data?.stats?.telemetryAlignmentWarnings ?? 0) === 0 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Shared event groups" value={mappingSummary?.sharedEventCount ?? data?.stats?.runtimeSharedEventMappings ?? 0} tone={(mappingSummary?.sharedEventCount ?? data?.stats?.runtimeSharedEventMappings ?? 0) === 0 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Unsupported runtime" value={mappingSummary?.unsupportedRuntimeCount ?? data?.stats?.runtimeUnsupportedTaskRecords ?? 0} tone={(mappingSummary?.unsupportedRuntimeCount ?? data?.stats?.runtimeUnsupportedTaskRecords ?? 0) === 0 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Unsafe shared events" value={mappingSummary?.unsafeSharedEventCount ?? data?.stats?.telemetryUnsafeSharedEventGroups ?? 0} tone={(mappingSummary?.unsafeSharedEventCount ?? data?.stats?.telemetryUnsafeSharedEventGroups ?? 0) === 0 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Unsupported active assignments" value={mappingSummary?.unsupportedActiveAssignments ?? data?.stats?.telemetryUnsupportedActiveAssignments ?? 0} tone={(mappingSummary?.unsupportedActiveAssignments ?? data?.stats?.telemetryUnsupportedActiveAssignments ?? 0) === 0 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                        {(data?.stats?.taskEventsSamplePartial ?? 0) > 0 || (data?.stats?.taskReceiptsSamplePartial ?? 0) > 0 ? (
                            <Pill label="Sample" value="partial" tone="warn" truthState="degraded" badgeLabel="PARTIAL" />
                        ) : null}
                    </>
                }
            >
                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap gap-2">
                            <Pill label="Generated" value={mappingSummary?.generatedAtUtc || "unknown"} tone="neutral" truthState="live" badgeLabel="LOADED" />
                            <Pill label="Unsafe shared events" value={unsafeSharedEventGroups.length} tone={unsafeSharedEventGroups.length > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                            <Pill label="Safe shared events" value={safeSharedEventGroups.length} tone="good" truthState="live" badgeLabel="LOADED" />
                        </div>
                        <p className="mt-3 text-xs leading-6 text-gray-400">
                            Shared events are only safe when criteria, distinct keying, and count thresholds keep task attribution scoped. event stats are trigger evidence only and must not be treated as task completions without task-scoped proof.
                        </p>
                    </div>

                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {unsafeSharedEventGroups.length ? unsafeSharedEventGroups.map((entry: any) => (
                                <div key={entry.eventName} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{entry.eventName}</p>
                                            <p className="text-xs text-gray-400">{entry.normalizedAction}</p>
                                        </div>
                                        <Pill label="Ambiguity" value={entry.ambiguityState} tone={toneForSeverity(entry.severity)} truthState="live" badgeLabel={entry.severity === "error" ? "ERROR" : "REVIEW"} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Tasks" value={entry.taskTitles.length} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Required" value={(entry.requiredDisambiguators || []).join(", ") || "none"} tone="neutral" truthState="live" badgeLabel="INFO" />
                                        <Pill label="Present" value={(entry.presentDisambiguators || []).join(", ") || "none"} tone="neutral" truthState="live" badgeLabel="INFO" />
                                        <Pill label="Missing" value={(entry.missingDisambiguators || []).join(", ") || "none"} tone={entry.missingDisambiguators?.length ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                    </div>
                                    <p className="text-xs leading-6 text-gray-400">{(entry.taskTitles || []).join(", ")}</p>
                                    <p className="text-sm text-amber-100">{entry.explanation}</p>
                                </div>
                            )) : (
                                <div className="px-4 py-4 text-sm text-emerald-100">No unsafe shared event groups are distorting task attribution in the sampled data.</div>
                            )}
                        </div>
                    </ScrollWrap>

                    <div className="space-y-4">
                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {safeSharedEventGroups.length ? safeSharedEventGroups.map((entry: any) => (
                                    <div key={entry.eventName} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.eventName}</p>
                                                <p className="text-xs text-gray-400">{entry.normalizedAction}</p>
                                            </div>
                                            <Pill label="Ambiguity" value={entry.ambiguityState} tone="good" truthState="live" badgeLabel="LIVE" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Tasks" value={entry.taskTitles.length} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Present" value={(entry.presentDisambiguators || []).join(", ") || "none"} tone="neutral" truthState="live" badgeLabel="INFO" />
                                        </div>
                                        <p className="text-xs leading-6 text-gray-400">{(entry.taskTitles || []).join(", ")}</p>
                                        <p className="text-sm text-emerald-100">{entry.explanation}</p>
                                    </div>
                                )) : (
                                    <div className="px-4 py-4 text-sm text-emerald-100">No shared event groups currently qualify as safe-with-criteria in the sampled data.</div>
                                )}
                            </div>
                        </ScrollWrap>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {unsupportedRuntimeGroups.length ? unsupportedRuntimeGroups.map((entry: any) => (
                                    <div key={entry.groupKey} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.taskTitle || entry.taskId || entry.triggerEvent || entry.reason}</p>
                                                <p className="text-xs text-gray-400">{entry.reason} | {entry.source} | {entry.activityScope}</p>
                                            </div>
                                            <Pill label="Severity" value={entry.severity} tone={toneForSeverity(entry.severity)} truthState="live" badgeLabel={entry.severity === "error" ? "ERROR" : entry.severity === "review" ? "REVIEW" : "INFO"} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Count" value={entry.count} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            {entry.taskId ? <Pill label="Task" value={entry.taskId} tone="neutral" truthState="live" badgeLabel="INFO" /> : null}
                                            {entry.triggerEvent ? <Pill label="Trigger" value={entry.triggerEvent} tone="neutral" truthState="live" badgeLabel="INFO" /> : null}
                                            {entry.runtimeAction ? <Pill label="Action" value={entry.runtimeAction} tone="neutral" truthState="live" badgeLabel="INFO" /> : null}
                                        </div>
                                        {entry.affectedUsersSample?.length ? (
                                            <div className="flex flex-wrap gap-2">
                                                {entry.affectedUsersSample.map((user: any) => (
                                                    <Pill key={`${entry.groupKey}-${user.userId}`} label="User" value={user.displayName || user.shortUserId} tone="neutral" truthState="live" badgeLabel={user.displayName ? "INFO" : "UID"} />
                                                ))}
                                            </div>
                                        ) : null}
                                        <p className="text-sm text-amber-100">{entry.suggestedAction}</p>
                                    </div>
                                )) : (
                                    <div className="px-4 py-4 text-sm text-emerald-100">No unsupported runtime task records were detected in the sampled data.</div>
                                )}
                            </div>
                        </ScrollWrap>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {alignmentWarnings.length ? alignmentWarnings.map((entry: any) => (
                                    <div key={`${entry.taskId}-${entry.warningType}`} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.taskTitle}</p>
                                                <p className="text-xs text-gray-400">{entry.taskId} | {entry.triggerEvent}</p>
                                            </div>
                                            <Pill label="Warning" value={entry.warningType} tone={toneForSeverity(entry.severity)} truthState="live" badgeLabel={entry.severity === "error" ? "ERROR" : entry.severity === "review" ? "REVIEW" : "INFO"} />
                                        </div>
                                        <p className="text-sm text-amber-100">{entry.suggestedAction}</p>
                                    </div>
                                )) : (
                                    <div className="px-4 py-4 text-sm text-emerald-100">No task telemetry alignment warnings were detected in the sampled data.</div>
                                )}
                            </div>
                        </ScrollWrap>
                    </div>
                </div>
            </Section>

            <Section
                title="Telemetry coverage sample"
                subtitle="Tracked events, task mappings, and last-seen visibility in one bounded sample."
                defaultOpen={false}
                summary={<><Pill label="Tracked events" value={data?.stats?.trackedTelemetryEvents ?? 0} truthState="live" badgeLabel="LOADED" /><Pill label="Orphaned" value={data?.stats?.orphanedTelemetryEvents ?? 0} tone={data?.stats?.orphanedTelemetryEvents ? "warn" : "good"} truthState="live" badgeLabel="LOADED" /></>}
            >
                <ScrollWrap>
                    <div className="divide-y divide-white/10">
                        {(data?.eventStats || []).map((event: any) => (
                            <div key={event.eventName} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-white">{event.label}</p>
                                        <p className="text-xs text-gray-400">{event.eventName}</p>
                                    </div>
                                    <Pill label="Total" value={compactNumber(event.totalCount)} truthState="live" badgeLabel="LOADED" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Tasks" value={event.mappedTaskCount} tone={event.mappedTaskCount ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                                    <Pill label="Last seen" value={formatRelative(event.lastSeenAt)} truthState="live" badgeLabel="LOADED" />
                                    <Pill label="Source" value={event.trackingSource} truthState="live" badgeLabel="LOADED" />
                                </div>
                                {event.mappedTaskTitles?.length ? <p className="text-xs text-gray-400">{event.mappedTaskTitles.join(", ")}</p> : null}
                            </div>
                        ))}
                    </div>
                </ScrollWrap>
            </Section>

            <Section
                title="Tracked events with no task mapping"
                subtitle="Tracked task-related events that do not currently map to a task."
                defaultOpen={false}
                summary={<><Pill label="Orphaned" value={(data?.orphanedEventStats || []).length} tone={(data?.orphanedEventStats || []).length ? "warn" : "good"} truthState="live" badgeLabel="LOADED" /></>}
            >
                {(data?.orphanedEventStats || []).length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        {(data?.orphanedEventStats || []).map((event: any) => (
                            <div key={event.eventName} className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-white">{event.label}</p>
                                        <p className="text-xs text-gray-400">{event.eventName}</p>
                                    </div>
                                    <Pill label="Count" value={compactNumber(event.totalCount)} tone="warn" truthState="live" badgeLabel="LOADED" />
                                </div>
                                <p className="mt-3 text-sm text-amber-100">Last seen {formatRelative(event.lastSeenAt)}. This event is tracked, but it does not currently power any task mapping.</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[1rem] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">Every tracked telemetry event in this slice is mapped to at least one task.</div>
                )}
            </Section>
        </>
    );
}
