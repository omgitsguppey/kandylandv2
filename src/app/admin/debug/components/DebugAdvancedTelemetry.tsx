"use client";

import { Pill, Section, ScrollWrap, badgeForDebugSeverity, badgeForSourceStatus, toneForSourceStatus, truthStateForSourceStatus } from "./DebugPrimitives";

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

function titleForPurpose(purpose?: string) {
    switch (purpose) {
        case "task_trigger":
            return "Task triggers";
        case "task_lifecycle":
            return "Task lifecycle internals";
        case "supporting_telemetry":
            return "Supporting telemetry";
        case "onboarding_telemetry":
            return "Onboarding telemetry";
        case "task_guidance":
            return "Task guidance";
        case "viewer_event":
            return "Viewer events";
        case "notification_event":
            return "Notification events";
        case "commerce_event":
            return "Commerce events";
        default:
            return "Other telemetry";
    }
}

function titleForCoveragePurpose(purpose?: string) {
    switch (purpose) {
        case "task_trigger":
            return "Task triggers";
        case "task_lifecycle":
            return "Task lifecycle";
        case "onboarding":
            return "Onboarding";
        case "identity":
            return "Identity";
        case "viewer_support":
            return "Viewer support";
        case "viewer_task_trigger":
            return "Viewer task triggers";
        case "notification":
            return "Notifications";
        case "semantic_ux":
            return "Semantic UX";
        case "commerce":
            return "Commerce";
        case "security":
            return "Security";
        case "supporting_telemetry":
            return "Supporting telemetry";
        default:
            return "Unsupported or unknown";
    }
}

function labelForMappingState(mappingState?: string) {
    switch (mappingState) {
        case "lifecycle_not_task":
            return "Lifecycle event, not a task trigger";
        case "supporting_not_task":
            return "Supporting telemetry, not a task trigger";
        case "needs_task_mapping":
            return "Missing task mapping: expected by task catalog";
        case "needs_criteria":
            return "Shared event needs criteria";
        case "shared_receipts":
            return "Receipt pool shared across tasks";
        case "unsupported":
            return "Unsupported telemetry mapping";
        default:
            return "Ready";
    }
}

function labelForCoverageState(coverageState?: string) {
    switch (coverageState) {
        case "ready":
            return "Ready";
        case "supporting":
            return "Supporting event, not a task gap";
        case "alias_needed":
            return "Alias needs canonical mapping";
        case "task_mapping_missing":
            return "Missing task mapping";
        case "unsupported":
            return "Unsupported or unknown";
        case "review":
            return "Review";
        default:
            return "Unknown";
    }
}

function toneForCoverageState(coverageState?: string) {
    switch (coverageState) {
        case "ready":
            return "good" as const;
        case "supporting":
            return "neutral" as const;
        case "alias_needed":
        case "review":
        case "task_mapping_missing":
            return "warn" as const;
        case "unsupported":
            return "bad" as const;
        default:
            return "neutral" as const;
    }
}

const PURCHASE_RECEIPT_MEANING = "Receipts here are purchase receipts, not task reward receipts.";
const UNLOCK_RECEIPT_MEANING = "Receipts here are shared unlock receipts and do not prove task-specific reward credit.";

export function DebugAdvancedTelemetry({ data }: DebugAdvancedTelemetryProps) {
    const mappingSummary = data?.taskTelemetryMappingSummary;
    const mappingSourceStatus = mappingSummary?.sourceStatus;
    const mappingRows = mappingSummary?.mappingRows || [];
    const sharedEventGroups = mappingSummary?.sharedEventGroups || [];
    const receiptMappingGroups = mappingSummary?.receiptMappingGroups || [];
    const unsupportedRuntimeGroups = mappingSummary?.unsupportedRuntimeGroups || [];
    const alignmentWarnings = mappingSummary?.alignmentWarnings || [];
    const telemetryCoverageRows = data?.telemetryCoverageRows || data?.eventStats || [];

    const purposeOrder = [
        "task_trigger",
        "task_lifecycle",
        "supporting_telemetry",
        "onboarding_telemetry",
        "task_guidance",
        "viewer_event",
        "notification_event",
        "commerce_event",
        "unmapped_unknown",
    ];

    const rowsByPurpose = purposeOrder
        .map((purpose) => ({
            purpose,
            rows: mappingRows.filter((row: any) => row.eventPurpose === purpose),
        }))
        .filter((group) => group.rows.length > 0);

    const unsafeSharedEventGroups = sharedEventGroups.filter((entry: any) => entry.ambiguityState !== "safe_with_criteria");
    const safeSharedEventGroups = sharedEventGroups.filter((entry: any) => entry.ambiguityState === "safe_with_criteria");
    const coveragePurposeOrder = [
        "task_trigger",
        "task_lifecycle",
        "onboarding",
        "identity",
        "viewer_task_trigger",
        "viewer_support",
        "notification",
        "semantic_ux",
        "commerce",
        "supporting_telemetry",
        "security",
        "unknown",
    ];
    const coverageRowsByPurpose = coveragePurposeOrder
        .map((purpose) => ({
            purpose,
            rows: telemetryCoverageRows.filter((row: any) => row.eventPurpose === purpose),
        }))
        .filter((group) => group.rows.length > 0);
    const telemetryCoverageSummary = {
        trackedEvents: telemetryCoverageRows.length,
        taskTriggers: telemetryCoverageRows.filter((row: any) => row.eventPurpose === "task_trigger" || row.eventPurpose === "viewer_task_trigger").length,
        supporting: telemetryCoverageRows.filter((row: any) => row.coverageState === "supporting").length,
        aliasNeeded: telemetryCoverageRows.filter((row: any) => row.coverageState === "alias_needed").length,
        unsupported: telemetryCoverageRows.filter((row: any) => row.coverageState === "unsupported").length,
    };

    return (
        <>
            <Section
                title="Task telemetry mapping"
                subtitle="Human-readable event coverage for task triggers, lifecycle internals, and supporting telemetry."
                defaultOpen={false}
                summary={
                    <>
                        <Pill label="Source state" value={mappingSourceStatus?.status?.status || "unknown"} tone={toneForSourceStatus(mappingSourceStatus?.status?.status)} truthState={truthStateForSourceStatus(mappingSourceStatus?.status?.status)} badgeLabel={badgeForSourceStatus(mappingSourceStatus?.status?.status)} />
                        <Pill label="Task trigger events" value={`${mappingSummary?.taskTriggerReadyCount ?? 0} ready / ${mappingSummary?.taskTriggerPartialCount ?? 0} partial / ${mappingSummary?.taskTriggerMissingCount ?? 0} missing`} tone={(mappingSummary?.taskTriggerMissingCount ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Lifecycle events" value={mappingSummary?.lifecycleExpectedCount ?? 0} tone="good" truthState="live" badgeLabel="LOADED" />
                        <Pill label="Supporting telemetry" value={mappingSummary?.supportingTelemetryCount ?? 0} tone="neutral" truthState="live" badgeLabel="LOADED" />
                        <Pill label="Shared events needing criteria" value={mappingSummary?.unsafeSharedEventCount ?? 0} tone={(mappingSummary?.unsafeSharedEventCount ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Unsupported runtime" value={mappingSummary?.unsupportedRuntimeCount ?? 0} tone={(mappingSummary?.unsupportedRuntimeCount ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                    </>
                }
            >
                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap gap-2">
                            <Pill label="Generated" value={mappingSummary?.generatedAtUtc || "unknown"} tone={toneForSourceStatus(mappingSourceStatus?.status?.status)} truthState={truthStateForSourceStatus(mappingSourceStatus?.status?.status)} badgeLabel={badgeForSourceStatus(mappingSourceStatus?.status?.status)} />
                            <Pill label="Alignment warnings" value={mappingSummary?.alignmentWarningCount ?? 0} tone={(mappingSummary?.alignmentWarningCount ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                            <Pill label="Shared event groups" value={mappingSummary?.sharedEventCount ?? 0} tone={(mappingSummary?.sharedEventCount ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                            <Pill label="Unsupported active assignments" value={mappingSummary?.unsupportedActiveAssignments ?? 0} tone={(mappingSummary?.unsupportedActiveAssignments ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                        </div>
                         <p className="mt-3 text-xs leading-6 text-gray-400">
                             Shared events are only safe when criteria, distinct keying, and count thresholds keep task attribution scoped. Event stats are raw trigger evidence. They are not task completion proof. Lifecycle events and onboarding telemetry can be healthy even when they do not map to a daily task.
                             {mappingSourceStatus?.nextAction ? ` ${mappingSourceStatus.nextAction}` : ""}
                         </p>
                         <details className="mt-3 rounded-[0.75rem] border border-white/10 bg-black/20 p-3">
                             <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-gray-300">Raw trigger details</summary>
                             <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-300">
                                 {JSON.stringify({ mappingSourceStatus, alignmentWarnings, telemetryCoverageSummary }, null, 2)}
                             </pre>
                         </details>
                     </div>

                    <ScrollWrap>
                        <div className="space-y-4">
                            {rowsByPurpose.map((group: any) => (
                                <div key={group.purpose} className="rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                    <div className="border-b border-white/10 px-4 py-3">
                                        <p className="font-semibold text-white">{titleForPurpose(group.purpose)}</p>
                                    </div>
                                    <div className="divide-y divide-white/10">
                                        {group.rows.map((row: any) => (
                                            <div key={`${row.eventName}-${row.mappingState}`} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{row.displayLabel}</p>
                                                        <p className="text-xs text-gray-400">{row.eventName}</p>
                                                    </div>
                                                    <Pill label="Mapping" value={labelForMappingState(row.mappingState)} tone={toneForSeverity(row.mappingState === "ready" ? "info" : row.mappingState === "needs_task_mapping" || row.mappingState === "unsupported" ? "error" : "review")} truthState="live" badgeLabel="LOADED" />
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Purpose" value={row.eventPurpose} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                    <Pill label="Mapped tasks" value={row.mappedTaskCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                    <Pill label="Built-in" value={row.mappedBuiltInCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                    <Pill label="Custom" value={row.mappedCustomCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                    <Pill label="Assigned" value={row.assignedCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                    <Pill label="Event stats" value={compactNumber(row.eventStatsCount)} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                    <Pill label="Receipts" value={row.receiptCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                    <Pill label="Tracking source" value={row.trackingSource} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                </div>
                                                {row.affectedTasks?.length ? (
                                                    <div className="space-y-1 text-xs text-gray-400">
                                                        {row.affectedTasks.map((task: any) => (
                                                            <div key={task.taskId}>
                                                                {task.title} ({task.taskId})
                                                                {task.criteria?.length ? ` | criteria: ${task.criteria.join(", ")}` : ""}
                                                                {task.keying ? ` | keying: ${task.keying}` : ""}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : null}
                                                <p className="text-sm text-amber-100">{row.explanation}</p>
                                                {row.missingMappingReason ? (
                                                    <p className="text-xs text-gray-400">Missing mapping reason: {row.missingMappingReason}</p>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollWrap>

                    <div className="space-y-4">
                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {receiptMappingGroups.length ? receiptMappingGroups.map((entry: any) => (
                                    <div key={`${entry.eventName}-${entry.normalizedAction}-${entry.mappingState}`} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.normalizedAction === entry.eventName ? entry.eventName : `${entry.eventName} -> ${entry.normalizedAction}`}</p>
                                                <p className="text-xs text-gray-400">Kind: receipt</p>
                                            </div>
                                            <Pill label="Mapping" value={entry.mappingState} tone={toneForSeverity(entry.severity)} truthState="live" badgeLabel={badgeForDebugSeverity(entry.severity)} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Count" value={entry.count} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Lane" value={entry.receiptLane} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="First seen" value={entry.firstSeenAtUtc || "unknown"} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Last seen" value={entry.lastSeenAtUtc || "unknown"} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        </div>
                                        {entry.mappedTaskTitles?.length ? (
                                            <p className="text-xs text-gray-400">{entry.mappedTaskTitles.join(", ")}</p>
                                        ) : null}
                                        <p className="text-sm text-amber-100">{entry.explanation}</p>
                                        <p className="text-xs text-gray-400">Sample receipts: {(entry.sampleReceiptIds || []).join(", ") || "none"}</p>
                                    </div>
                                )) : (
                                    <div className="px-4 py-4 text-sm text-emerald-100">No grouped receipt mapping issues were detected in the sampled data.</div>
                                )}
                            </div>
                        </ScrollWrap>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {unsafeSharedEventGroups.length ? unsafeSharedEventGroups.map((entry: any) => (
                                    <div key={entry.eventName} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.displayLabel}</p>
                                                <p className="text-xs text-gray-400">{entry.eventName}</p>
                                            </div>
                                            <Pill label="Ambiguity" value="Shared event needs criteria" tone={toneForSeverity(entry.severity)} truthState="live" badgeLabel={badgeForDebugSeverity(entry.severity === "error" ? "error" : "review")} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Shared by" value={entry.sharedByCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Assigned" value={entry.assignedCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Receipts" value={entry.receiptCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Event stats" value={compactNumber(entry.eventStatsCount)} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Required" value={(entry.requiredDisambiguators || []).join(", ") || "none"} tone="neutral" truthState="live" badgeLabel="INFO" />
                                            <Pill label="Missing" value={(entry.missingDisambiguators || []).join(", ") || "none"} tone="warn" truthState="live" badgeLabel="LOADED" />
                                        </div>
                                        <div className="space-y-1 text-xs text-gray-400">
                                            {(entry.sharedTasks || []).map((task: any) => (
                                                <div key={task.taskId}>
                                                    {task.title} ({task.taskId}) | count {task.requiredCount} | keying {task.keying} | entity {task.requiredEntity || "none"} | criteria {task.criteria?.length ? task.criteria.join(", ") : "none"} | criteria state {task.criteriaState}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            {entry.receiptMeaning === PURCHASE_RECEIPT_MEANING
                                                ? PURCHASE_RECEIPT_MEANING
                                                : entry.receiptMeaning === UNLOCK_RECEIPT_MEANING
                                                    ? UNLOCK_RECEIPT_MEANING
                                                    : entry.receiptMeaning}
                                        </p>
                                        <p className="text-sm text-amber-100">{entry.explanation}</p>
                                    </div>
                                )) : (
                                    <div className="px-4 py-4 text-sm text-emerald-100">No unsafe shared event groups are distorting task attribution in the sampled data.</div>
                                )}
                            </div>
                        </ScrollWrap>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {safeSharedEventGroups.length ? safeSharedEventGroups.map((entry: any) => (
                                    <div key={entry.eventName} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.displayLabel}</p>
                                                <p className="text-xs text-gray-400">{entry.eventName}</p>
                                            </div>
                                            <Pill label="Ambiguity" value="Ready" tone="good" truthState="live" badgeLabel="LIVE" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Shared by" value={entry.sharedByCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Assigned" value={entry.assignedCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Receipts" value={entry.receiptCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Event stats" value={compactNumber(entry.eventStatsCount)} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                        </div>
                                        <div className="space-y-1 text-xs text-gray-400">
                                            {(entry.sharedTasks || []).map((task: any) => (
                                                <div key={task.taskId}>
                                                    {task.title} ({task.taskId}) | count {task.requiredCount} | keying {task.keying} | entity {task.requiredEntity || "none"} | criteria {task.criteria?.length ? task.criteria.join(", ") : "none"} | criteria state {task.criteriaState}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            {entry.receiptMeaning === PURCHASE_RECEIPT_MEANING
                                                ? PURCHASE_RECEIPT_MEANING
                                                : entry.receiptMeaning === UNLOCK_RECEIPT_MEANING
                                                    ? UNLOCK_RECEIPT_MEANING
                                                    : entry.receiptMeaning}
                                        </p>
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
                                            <Pill label="Severity" value={entry.severity} tone={toneForSeverity(entry.severity)} truthState="live" badgeLabel={badgeForDebugSeverity(entry.severity)} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Count" value={entry.count} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            {entry.taskId ? <Pill label="Task" value={entry.taskId} tone="neutral" truthState="live" badgeLabel="INFO" /> : null}
                                            {entry.triggerEvent ? <Pill label="Trigger" value={entry.triggerEvent} tone="neutral" truthState="live" badgeLabel="INFO" /> : null}
                                        </div>
                                        <p className="text-sm text-amber-100">{entry.suggestedAction}</p>
                                    </div>
                                )) : (
                                    <div className="px-4 py-4 text-sm text-emerald-100">No unsupported runtime task records were detected in the sampled data.</div>
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
                summary={
                    <>
                        <Pill label="Tracked events" value={telemetryCoverageSummary.trackedEvents} tone="neutral" truthState="live" badgeLabel="LOADED" />
                        <Pill label="Task triggers" value={telemetryCoverageSummary.taskTriggers} tone="neutral" truthState="live" badgeLabel="LOADED" />
                        <Pill label="Supporting/lifecycle" value={telemetryCoverageSummary.supporting} tone="neutral" truthState="live" badgeLabel="LOADED" />
                        <Pill label="Alias needed" value={telemetryCoverageSummary.aliasNeeded} tone={telemetryCoverageSummary.aliasNeeded ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                        <Pill label="True unsupported/orphaned" value={telemetryCoverageSummary.unsupported} tone={telemetryCoverageSummary.unsupported ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                    </>
                }
            >
                <ScrollWrap>
                    <div className="space-y-4">
                        {coverageRowsByPurpose.map((group: any) => (
                            <div key={group.purpose} className="rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                <div className="border-b border-white/10 px-4 py-3">
                                    <p className="font-semibold text-white">{titleForCoveragePurpose(group.purpose)}</p>
                                </div>
                                <div className="divide-y divide-white/10">
                                    {group.rows.map((event: any) => (
                                        <div key={`${event.normalizedAction}-${event.eventName}`} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{event.displayLabel}</p>
                                                    <p className="text-xs text-gray-400">{event.eventName}</p>
                                                </div>
                                                <Pill label="Coverage" value={labelForCoverageState(event.coverageState)} tone={toneForCoverageState(event.coverageState)} truthState="live" badgeLabel="LOADED" />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Purpose" value={event.eventPurpose} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Total" value={compactNumber(event.totalCount)} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Tasks" value={event.mappedTaskCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Last seen" value={event.lastSeenAtUtc ? formatRelative(Date.parse(event.lastSeenAtUtc)) : "No recent activity"} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Source" value={event.sourceState} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                            </div>
                                            {event.mappedTaskTitles?.length ? <p className="text-xs text-gray-400">{event.mappedTaskTitles.join(", ")}</p> : null}
                                            {event.rawEventNames?.length > 1 ? <p className="text-xs text-gray-400">Aliases seen: {event.rawEventNames.join(", ")}</p> : null}
                                            <p className="text-sm text-amber-100">{event.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollWrap>
            </Section>
        </>
    );
}
