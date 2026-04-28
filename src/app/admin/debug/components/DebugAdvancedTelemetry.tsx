"use client";

import { Pill, Section, ScrollWrap } from "./DebugPrimitives";

/* ─── Props ─── */
export interface DebugAdvancedTelemetryProps {
    data: any;
}

/* ─── Helpers (local) ─── */
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
function formatTimestamp(timestamp?: number) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString();
}

/* ─── Component ─── */
export function DebugAdvancedTelemetry({ data }: DebugAdvancedTelemetryProps) {
    return (
        <>
            {/* ── Task telemetry mapping ── */}
            <Section
                title="Task telemetry mapping"
                subtitle="Canonical task facts, telemetry event stats, and shared-event ambiguity."
                defaultOpen={false}
                summary={<><Pill label="Alignment warnings" value={data?.stats?.telemetryAlignmentWarnings ?? 0} tone={(data?.stats?.telemetryAlignmentWarnings ?? 0) === 0 ? "good" : "warn"} /><Pill label="Shared events" value={data?.stats?.runtimeSharedEventMappings ?? 0} tone={(data?.stats?.runtimeSharedEventMappings ?? 0) === 0 ? "good" : "warn"} /><Pill label="Unsupported runtime" value={data?.stats?.runtimeUnsupportedTaskRecords ?? 0} tone={(data?.stats?.runtimeUnsupportedTaskRecords ?? 0) === 0 ? "good" : "warn"} />{(data?.stats?.taskEventsSamplePartial ?? 0) > 0 || (data?.stats?.taskReceiptsSamplePartial ?? 0) > 0 ? <Pill label="Sample" value="partial" tone="warn" /> : null}</>}
            >
                <div className="grid gap-4 lg:grid-cols-1">
                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {(data?.runtimeTaskAudit?.telemetryAlignment || []).slice(0, 24).map((entry: any) => (
                                <div key={entry.eventName} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{entry.eventLabel}</p>
                                            <p className="text-xs text-gray-400">{entry.eventName}</p>
                                        </div>
                                        <Pill label="Mapped tasks" value={entry.mappedTaskCount} tone={entry.mappedTaskCount ? "good" : "warn"} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Built-in" value={entry.builtInTaskCount} />
                                        <Pill label="Custom" value={entry.customTaskCount} />
                                        <Pill label="Assigned" value={entry.runtimeAssignedCount} />
                                        <Pill label="Event stats" value={compactNumber(entry.eventStatTotalCount)} />
                                        <Pill label="Receipts" value={entry.recentReceiptCount} />
                                        <Pill label="Tracking" value={entry.trackingSource} tone={entry.trackingSource === "unsupported" ? "bad" : "good"} />
                                    </div>
                                    {entry.driftReasons?.length ? (
                                        <div className="space-y-1 text-sm text-amber-100">
                                            {entry.driftReasons.map((reason: string) => (
                                                <div key={reason}>- {reason.replaceAll("_", " ")}</div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>
                    <div className="space-y-4">
                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(data?.runtimeTaskAudit?.ambiguousEventMappings || []).length ? (data?.runtimeTaskAudit?.ambiguousEventMappings || []).map((entry: any) => (
                                    <div key={entry.eventName} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.eventLabel}</p>
                                                <p className="text-xs text-gray-400">{entry.eventName}</p>
                                            </div>
                                            <Pill label="Shared by" value={entry.mappedTaskCount} tone="warn" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Assigned" value={entry.runtimeAssignedCount} />
                                            <Pill label="Receipts" value={entry.recentReceiptCount} />
                                            <Pill label="Event stats" value={compactNumber(entry.eventStatTotalCount)} />
                                        </div>
                                        <p className="text-xs leading-6 text-gray-400">{(entry.taskTitles || []).join(", ")}</p>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-emerald-100">No shared event-name mappings are distorting task attribution in the sampled data.</div>}
                            </div>
                        </ScrollWrap>
                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(data?.runtimeTaskAudit?.unsupportedRuntimeRecords || []).length ? (data?.runtimeTaskAudit?.unsupportedRuntimeRecords || []).slice(0, 24).map((entry: any, index: number) => (
                                    <div key={`${entry.kind}-${entry.taskId || entry.eventName || index}`} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.title || entry.taskId || entry.eventName || "Runtime drift"}</p>
                                                <p className="text-xs text-gray-400">{entry.kind} {entry.taskId ? `| ${entry.taskId}` : entry.eventName ? `| ${entry.eventName}` : ""}</p>
                                            </div>
                                            <Pill label="Kind" value={entry.kind} tone="warn" />
                                        </div>
                                        <p className="text-sm text-amber-100">{entry.detail}</p>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-emerald-100">No unsupported runtime task records were detected in the sampled data.</div>}
                            </div>
                        </ScrollWrap>
                    </div>
                </div>
            </Section>

            {/* ── Telemetry coverage sample ── */}
            <Section
                title="Telemetry coverage sample"
                subtitle="Tracked events, task mappings, and last-seen visibility in one bounded sample."
                defaultOpen={false}
                summary={<><Pill label="Tracked events" value={data?.stats?.trackedTelemetryEvents ?? 0} /><Pill label="Orphaned" value={data?.stats?.orphanedTelemetryEvents ?? 0} tone={data?.stats?.orphanedTelemetryEvents ? "warn" : "good"} /></>}
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
                                    <Pill label="Total" value={compactNumber(event.totalCount)} />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Tasks" value={event.mappedTaskCount} tone={event.mappedTaskCount ? "good" : "warn"} />
                                    <Pill label="Last seen" value={formatRelative(event.lastSeenAt)} />
                                    <Pill label="Source" value={event.trackingSource} />
                                </div>
                                {event.mappedTaskTitles?.length ? <p className="text-xs text-gray-400">{event.mappedTaskTitles.join(", ")}</p> : null}
                            </div>
                        ))}
                    </div>
                </ScrollWrap>
            </Section>

            {/* ── Tracked events with no task mapping ── */}
            <Section
                title="Tracked events with no task mapping"
                subtitle="Tracked task-related events that do not currently map to a task."
                defaultOpen={false}
                summary={<><Pill label="Orphaned" value={(data?.orphanedEventStats || []).length} tone={(data?.orphanedEventStats || []).length ? "warn" : "good"} /></>}
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
                                    <Pill label="Count" value={compactNumber(event.totalCount)} tone="warn" />
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
