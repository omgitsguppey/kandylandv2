"use client";

import { Pill, StatCard, Section, ScrollWrap } from "./DebugPrimitives";

/* ─── Props ─── */
export interface DebugAdvancedTruthProps {
    data: any;
}

/* ─── Helpers (local) ─── */
function compactNumber(value?: number) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

/* ─── Component ─── */
export function DebugAdvancedTruth({ data }: DebugAdvancedTruthProps) {
    return (
        <>
            {/* ── Behavior normalization internals ── */}
            <Section
                title="Behavior normalization internals"
                subtitle="Derived coordination state covering events, open findings, and domain coverage."
                defaultOpen={false}
                summary={<><Pill label="Health" value={`${data?.orchestration?.summary?.score ?? 0}%`} tone={(data?.orchestration?.summary?.score ?? 0) >= 90 ? "good" : (data?.orchestration?.summary?.score ?? 0) >= 70 ? "warn" : "bad"} /><Pill label="Open findings" value={data?.orchestration?.summary?.openFindings ?? 0} tone={(data?.orchestration?.summary?.openFindings ?? 0) ? "warn" : "good"} /><Pill label="Actionable repairs" value={data?.orchestration?.summary?.actionableProposals ?? 0} tone={(data?.orchestration?.summary?.actionableProposals ?? 0) ? "warn" : "good"} /><Pill label="Low confidence" value={data?.orchestration?.summary?.lowConfidenceEvents ?? 0} tone={(data?.orchestration?.summary?.lowConfidenceEvents ?? 0) ? "warn" : "good"} /></>}
            >
                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard label="Normalized events" value={data?.orchestration?.summary?.eventCount ?? 0} meta="Recent derived event sample" />
                            <StatCard label="Eval eligible" value={data?.orchestration?.summary?.trainingEligible ?? 0} meta={`${data?.orchestration?.summary?.lowConfidenceEvents ?? 0} low-confidence events`} />
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Dependency gaps</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Missing actor" value={data?.orchestration?.dependencyReadiness?.actorMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.actorMissingCount ?? 0) ? "warn" : "good"} />
                                <Pill label="Missing session" value={data?.orchestration?.dependencyReadiness?.sessionMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.sessionMissingCount ?? 0) ? "warn" : "good"} />
                                <Pill label="Missing route" value={data?.orchestration?.dependencyReadiness?.routeMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.routeMissingCount ?? 0) ? "warn" : "good"} />
                                <Pill label="Missing creator" value={data?.orchestration?.dependencyReadiness?.creatorContextMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.creatorContextMissingCount ?? 0) ? "warn" : "good"} />
                            </div>
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Coverage by domain</p>
                            <div className="mt-3 space-y-2">
                                {(data?.orchestration?.domainSummary || []).slice(0, 6).map((entry: any) => (
                                    <div key={entry.key} className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-300">
                                        <span className="font-semibold text-white">{entry.key}</span>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Events" value={entry.eventCount} />
                                            <Pill label="Open" value={entry.openFindingCount} tone={entry.openFindingCount ? "warn" : "good"} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {(data?.orchestration?.findings || []).slice(0, 4).map((finding: any) => (
                            <div key={finding.id} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-white">{finding.title}</p>
                                        <p className="mt-1 text-xs text-gray-400">{finding.domain} | {finding.systemKey}</p>
                                    </div>
                                    <Pill label="Severity" value={finding.severity} tone={finding.severity === "error" ? "bad" : finding.severity === "warn" ? "warn" : "neutral"} />
                                </div>
                                <p className="mt-3 text-sm text-gray-200">{finding.humanSummary}</p>
                                <p className="mt-2 text-xs text-gray-400">{finding.fixSummary}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ── Actor ownership and bleed risk ── */}
            <Section
                title="Actor ownership and bleed risk"
                subtitle="Per-actor summaries from the normalization layer."
                defaultOpen={false}
                summary={<><Pill label="Actors" value={(data?.orchestration?.actorSummaries || []).length} /><Pill label="Contamination risks" value={data?.orchestration?.summary?.contaminationRisks ?? 0} tone={(data?.orchestration?.summary?.contaminationRisks ?? 0) ? "bad" : "good"} /></>}
            >
                <ScrollWrap>
                    <div className="divide-y divide-white/10">
                        {(data?.orchestration?.actorSummaries || []).map((actor: any) => (
                            <div key={actor.id} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-white">{actor.actorLabel || actor.actorId || actor.actorType}</p>
                                        <p className="text-xs text-gray-400">{actor.actorType} | {actor.actorId || "anonymous"}</p>
                                    </div>
                                    <Pill label="Events" value={actor.eventCount} />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Warnings" value={actor.warningCount} tone={actor.warningCount ? "warn" : "good"} />
                                    <Pill label="Critical" value={actor.criticalCount} tone={actor.criticalCount ? "bad" : "good"} />
                                    <Pill label="Bleed risk" value={actor.contaminationCount} tone={actor.contaminationCount ? "bad" : "good"} />
                                </div>
                                {actor.topDomains?.length ? <p className="text-xs text-gray-400">Domains: {actor.topDomains.join(", ")}</p> : null}
                            </div>
                        ))}
                    </div>
                </ScrollWrap>
            </Section>

            {/* ── Task catalog coverage ── */}
            <Section
                title="Task catalog coverage"
                subtitle="Built-in task definitions, trigger source, and action path."
                defaultOpen={false}
                summary={<><Pill label="Built-in" value={data?.stats?.builtInTasks ?? 0} /><Pill label="Canonical" value={data?.stats?.canonicalTasks ?? 0} tone="good" /><Pill label="Telemetry" value={data?.stats?.telemetryValidatedTasks ?? 0} tone="good" /><Pill label="Unsupported" value={data?.stats?.unsupportedTasks ?? 0} tone={data?.stats?.unsupportedTasks ? "warn" : "good"} /></>}
            >
                <ScrollWrap>
                    <div className="divide-y divide-white/10">
                        {(data?.coverage || []).map((task: any) => (
                            <div key={task.taskId} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-white">{task.title}</p>
                                        <p className="text-xs text-gray-400">{task.taskId} | {task.eventLabel}</p>
                                    </div>
                                    <Pill label="Source" value={task.trackingSource} tone={task.trackingSource === "unsupported" ? "bad" : "good"} />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Reward" value={task.reward} />
                                    <Pill label="Max" value={task.maxProgress} />
                                    <Pill label="Group" value={task.group} />
                                    <Pill label="Action" value={task.actionMode === "runtime" ? `${task.actionType} (runtime)` : `${task.actionType} (route)`} />
                                    {task.oneTime ? <Pill label="Mode" value="one-time" /> : null}
                                    {task.hasUniqueKey ? <Pill label="Keying" value="unique" /> : null}
                                    {task.hasCriteria ? <Pill label="Criteria" value="filtered" /> : null}
                                </div>
                                <p className="text-xs leading-6 text-gray-400">
                                    {task.actionLabel} {"->"} {task.destinationHref}
                                </p>
                            </div>
                        ))}
                    </div>
                </ScrollWrap>
            </Section>


        </>
    );
}
