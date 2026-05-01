"use client";

import { Pill, StatCard, Section, ScrollWrap } from "./DebugPrimitives";

/* ─── Props ─── */
export interface DebugAdvancedBehaviorProps {
    data: any;
}

/* ─── Helpers (local) ─── */
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
export function DebugAdvancedBehavior({ data }: DebugAdvancedBehaviorProps) {
    return (
        <>
            {/* ── Behavioral Intelligence ── */}
            <Section
                title="Behavioral Intelligence"
                subtitle="Profile snapshot coverage plus drop-level ranking inputs used before any ML dependence."
                defaultOpen={false}
                summary={<><Pill label="User profiles" value={data?.stats?.behavioralUserProfiles ?? 0} /><Pill label="Drop profiles" value={data?.stats?.behavioralDropProfiles ?? 0} /><Pill label="Freshness" value={data?.behavioralSnapshotStatus?.freshnessLabel || "unknown"} tone={data?.behavioralSnapshotStatus?.freshnessLabel === "live" ? "good" : "warn"} /></>}
            >
                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="space-y-3">
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Snapshot status</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Users" value={data?.stats?.behavioralUserProfiles ?? 0} />
                                <Pill label="Guests" value={data?.stats?.behavioralGuestProfiles ?? 0} />
                                <Pill label="Drops" value={data?.stats?.behavioralDropProfiles ?? 0} />
                            </div>
                            <p className="mt-3 text-sm text-gray-300">Latest rebuild {formatRelative(data?.behavioralSnapshotStatus?.updatedAtMs)}. Source window starts {formatTimestamp(data?.behavioralSnapshotStatus?.sourceWindowStartMs)}.</p>
                        </div>
                    </div>
                    <ScrollWrap>
                        <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                            {(data?.behavioralDrops || []).length ? (data?.behavioralDrops || []).map((entry: any) => (
                                <div key={entry.dropId} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{entry.dropTitle || entry.dropId}</p>
                                            <p className="text-xs text-gray-400">{entry.dropId} · {entry.dropCategory || "unknown"}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="State" value={entry.freshnessLabel || "unknown"} tone={entry.freshnessLabel === "live" ? "good" : "warn"} />
                                            <Pill label="Confidence" value={`${Math.round((entry.confidenceScore || 0) * 100)}%`} />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Previews" value={entry.previewOpens ?? 0} />
                                        <Pill label="Viewer opens" value={entry.viewerOpens ?? 0} />
                                        <Pill label="Unlocks" value={entry.unlocks ?? 0} />
                                        <Pill label="Completion" value={`${Math.round((entry.completionRate || 0) * 100)}%`} />
                                        <Pill label="Negative" value={`${Math.round((entry.negativeSignalRate || 0) * 100)}%`} tone={(entry.negativeSignalRate || 0) > 0.25 ? "warn" : "good"} />
                                    </div>
                                </div>
                            )) : <div className="px-4 py-4 text-sm text-amber-100">No behavioral drop-intelligence rows are available yet. Rebuild the snapshots or wait for the scheduled pass.</div>}
                        </div>
                    </ScrollWrap>
                </div>
            </Section>

            {/* ── Telemetry Truth Recovery ── */}
            <Section
                title="Telemetry Truth Recovery"
                subtitle="Observed, checked, final, and estimated analytics layers with repair visibility."
                defaultOpen={false}
                summary={<><Pill label="Drop metrics" value={data?.stats?.analyticsTruthDropMetrics ?? 0} /><Pill label="User metrics" value={data?.stats?.analyticsTruthUserMetrics ?? 0} /><Pill label="Repairs" value={data?.stats?.analyticsTruthRepairs ?? 0} tone={(data?.stats?.analyticsTruthRepairs ?? 0) > 0 ? "warn" : "good"} /><Pill label="Quality" value={data?.analyticsTruthRecovery?.global?.qualityLabel || "unknown"} tone={data?.analyticsTruthRecovery?.global?.qualityLabel === "exact" ? "good" : data?.analyticsTruthRecovery?.global?.qualityLabel === "estimated" ? "warn" : "neutral"} /></>}
            >
                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="space-y-3">
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Global truth summary</p>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <StatCard label="Observed views" value={data?.analyticsTruthRecovery?.global?.truthLayers?.raw?.raw_view_count ?? 0} meta="Observed viewer-open and session-start activity" truthState={data?.analyticsTruthRecovery ? "live" : "unavailable"} />
                                <StatCard label="Checked views" value={data?.analyticsTruthRecovery?.global?.truthLayers?.validated?.deduped_view_count ?? 0} meta="Duplicate page loads collapsed" truthState={data?.analyticsTruthRecovery ? "live" : "unavailable"} />
                                <StatCard label="Final views" value={data?.analyticsTruthRecovery?.global?.truthLayers?.finalized?.finalized_view_count ?? 0} meta="Reporting value after review" truthState={data?.analyticsTruthRecovery ? "live" : "unavailable"} />
                                <StatCard label="Estimated ratio" value={`${Math.round(((data?.analyticsTruthRecovery?.global?.truthLayers?.estimated?.estimated_data_ratio ?? 0) as number) * 100)}%`} meta="Recovered or inferred share of final metrics" truthState={data?.analyticsTruthRecovery?.global?.qualityLabel === "estimated" ? "fallback" : data?.analyticsTruthRecovery ? "live" : "unavailable"} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Confidence" value={`${Math.round(((data?.analyticsTruthRecovery?.global?.confidenceScore ?? 0) as number) * 100)}%`} />
                                <Pill label="Duplicate rate" value={`${Math.round(((data?.analyticsTruthRecovery?.global?.truthLayers?.validated?.duplicate_event_rate ?? 0) as number) * 100)}%`} tone={((data?.analyticsTruthRecovery?.global?.truthLayers?.validated?.duplicate_event_rate ?? 0) as number) > 0.1 ? "warn" : "good"} />
                                <Pill label="Recovered sessions" value={data?.analyticsTruthRecovery?.global?.truthLayers?.estimated?.recovered_sessions_count ?? 0} tone={(data?.analyticsTruthRecovery?.global?.truthLayers?.estimated?.recovered_sessions_count ?? 0) > 0 ? "warn" : "good"} />
                                <Pill label="Freshness" value={data?.analyticsTruthRecovery?.status?.freshnessLabel || "unknown"} tone={data?.analyticsTruthRecovery?.status?.freshnessLabel === "live" ? "good" : "warn"} />
                            </div>
                            <p className="mt-3 text-sm text-gray-300">Last rebuild {formatRelative(data?.analyticsTruthRecovery?.status?.lastComputedAtMs)}. Observed, checked, final, and estimated layers stay separate and explicitly labeled.</p>
                        </div>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(data?.analyticsTruthRepairs || []).length ? (data?.analyticsTruthRepairs || []).map((entry: any) => (
                                    <div key={entry.repairId} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.repairType}</p>
                                                <p className="text-xs text-gray-400">{entry.scopeType || "scope"} · {entry.scopeKey || entry.repairId}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Layer" value={entry.truthLabel || "unknown"} tone={entry.truthLabel === "estimated" ? "warn" : "neutral"} />
                                                <Pill label="Confidence" value={`${Math.round(((entry.confidenceScore || 0) as number) * 100)}%`} />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Recovered watch" value={`${Math.round(((entry.recoveredWatchTimeMs || 0) as number) / 1000)}s`} />
                                            <Pill label="Completion repairs" value={entry.repairedCompletionCount || 0} />
                                            <Pill label="Provenance" value={entry.provenance || "unknown"} />
                                        </div>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-emerald-100">No telemetry repair rows are present in the current truth window.</div>}
                            </div>
                        </ScrollWrap>
                    </div>

                    <div className="space-y-4">
                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(data?.analyticsTruthDrops || []).length ? (data?.analyticsTruthDrops || []).map((entry: any) => (
                                    <div key={entry.dropId} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.dropId}</p>
                                                <p className="text-xs text-gray-400">Finalized views {entry.truthLayers?.finalized?.finalized_view_count ?? 0} · watch {Math.round(((entry.truthLayers?.finalized?.finalized_watch_time_ms ?? 0) as number) / 1000)}s</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Quality" value={entry.qualityLabel || "unknown"} tone={entry.qualityLabel === "exact" ? "good" : entry.qualityLabel === "estimated" ? "warn" : "neutral"} />
                                                <Pill label="Repaired" value={`${Math.round(((entry.repairedDataRatio || 0) as number) * 100)}%`} tone={((entry.repairedDataRatio || 0) as number) > 0.15 ? "warn" : "good"} />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Raw views" value={entry.truthLayers?.raw?.raw_view_count ?? 0} />
                                            <Pill label="Validated" value={entry.truthLayers?.validated?.deduped_view_count ?? 0} />
                                            <Pill label="Estimated views" value={entry.truthLayers?.estimated?.estimated_recovered_view_count ?? 0} />
                                            <Pill label="Dupes" value={`${Math.round(((entry.truthLayers?.validated?.duplicate_event_rate ?? 0) as number) * 100)}%`} />
                                        </div>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-amber-100">No per-drop analytics truth rows are available yet. Run the reconciliation job or wait for the scheduled pass.</div>}
                            </div>
                        </ScrollWrap>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(data?.analyticsTruthUsers || []).length ? (data?.analyticsTruthUsers || []).map((entry: any) => (
                                    <div key={entry.userId} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.userId}</p>
                                                <p className="text-xs text-gray-400">Watch {Math.round(((entry.truthLayers?.finalized?.finalized_watch_time_ms ?? 0) as number) / 1000)}s · unique viewers {entry.truthLayers?.finalized?.finalized_unique_viewers ?? 0}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Quality" value={entry.qualityLabel || "unknown"} tone={entry.qualityLabel === "exact" ? "good" : entry.qualityLabel === "estimated" ? "warn" : "neutral"} />
                                                <Pill label="Confidence" value={`${Math.round(((entry.confidenceScore || 0) as number) * 100)}%`} />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Sessions" value={entry.truthLayers?.validated?.total_drop_view_sessions ?? 0} />
                                            <Pill label="Unlocks" value={entry.truthLayers?.finalized?.unlock_count ?? 0} />
                                            <Pill label="Estimated watch" value={`${Math.round(((entry.truthLayers?.estimated?.estimated_watch_time_ms ?? 0) as number) / 1000)}s`} />
                                            <Pill label="Raw gaps" value={entry.truthLayers?.estimated?.raw_coverage_gap_count ?? 0} tone={(entry.truthLayers?.estimated?.raw_coverage_gap_count ?? 0) > 0 ? "warn" : "good"} />
                                        </div>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-amber-100">No per-user analytics truth rows are available yet.</div>}
                            </div>
                        </ScrollWrap>
                    </div>
                </div>
            </Section>
        </>
    );
}
