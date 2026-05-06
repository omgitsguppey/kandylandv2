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

function toneForHealth(score?: number) {
    if ((score ?? 0) >= 90) return "good" as const;
    if ((score ?? 0) >= 70) return "warn" as const;
    return "bad" as const;
}

function toneForDomainState(state?: string) {
    if (state === "error") return "bad" as const;
    if (state === "review") return "warn" as const;
    if (state === "live") return "good" as const;
    return "neutral" as const;
}

function shortId(value?: string) {
    if (!value) return "anonymous";
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function toneForActorRiskSeverity(severity?: string) {
    if (severity === "error") return "bad" as const;
    if (severity === "warn") return "warn" as const;
    return "neutral" as const;
}

const DUPLICATE_INSPECT_EXPLANATION = "Most findings are duplicate inspect-only source-context items.";

/* ─── Component ─── */
export function DebugAdvancedTruth({ data }: DebugAdvancedTruthProps) {
    const behaviorSummary = data?.orchestration?.summary;
    const dependencyReadiness = data?.orchestration?.dependencyReadiness;
    return (
        <>
            {/* ── Behavior normalization internals ── */}
            <Section
                title="Behavior normalization internals"
                subtitle="Derived coordination state covering events, open findings, and domain coverage."
                defaultOpen={false}
                summary={<>
                    <Pill label="Health" value={`${behaviorSummary?.score ?? 0}%`} tone={toneForHealth(behaviorSummary?.score)} truthState="live" badgeLabel="LOADED" />
                    <Pill label="Unique open findings" value={behaviorSummary?.uniqueOpenFindings ?? 0} tone={(behaviorSummary?.uniqueOpenFindings ?? 0) ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                    <Pill label="Duplicate findings" value={behaviorSummary?.duplicateFindings ?? 0} tone={(behaviorSummary?.duplicateFindings ?? 0) ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                    <Pill label="Inspect-only findings" value={behaviorSummary?.inspectOnlyFindings ?? 0} tone={(behaviorSummary?.inspectOnlyFindings ?? 0) ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                    <Pill label="Actionable repairs" value={behaviorSummary?.actionableProposals ?? 0} tone={(behaviorSummary?.actionableProposals ?? 0) ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                    <Pill label="Low confidence required events" value={behaviorSummary?.lowConfidenceRequiredEvents ?? 0} tone={(behaviorSummary?.lowConfidenceRequiredEvents ?? 0) ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                </>}
            >
                <div
                    className="grid gap-4 lg:grid-cols-1"
                    data-behavior-health-score={behaviorSummary?.score ?? 0}
                    data-behavior-unique-open-findings={behaviorSummary?.uniqueOpenFindings ?? 0}
                    data-behavior-duplicate-findings={behaviorSummary?.duplicateFindings ?? 0}
                    data-behavior-inspect-only-findings={behaviorSummary?.inspectOnlyFindings ?? 0}
                    data-behavior-required-missing-route={dependencyReadiness?.routeMissing?.requiredMissing ?? 0}
                    data-behavior-optional-missing-route={dependencyReadiness?.routeMissing?.optionalMissing ?? 0}
                    data-behavior-background-exempt-route={dependencyReadiness?.routeMissing?.backgroundExempt ?? 0}
                >
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard label="Normalized events" value={data?.orchestration?.summary?.eventCount ?? 0} meta="Recent derived event sample" truthState={data?.orchestration ? "live" : "unavailable"} />
                            <StatCard label="Eval eligible" value={data?.orchestration?.summary?.trainingEligible ?? 0} meta={`${data?.orchestration?.summary?.trainingEligible ?? 0} / ${data?.orchestration?.summary?.evalEligibleDenominator ?? 0} recent sample · ${(data?.orchestration?.summary?.lowConfidenceRequiredEvents ?? 0)} low-confidence required events`} truthState={(data?.orchestration?.summary?.lowConfidenceRequiredEvents ?? 0) > 0 ? "degraded" : data?.orchestration ? "live" : "unavailable"} />
                        </div>
                        <p className="text-xs text-gray-400">{data?.orchestration?.summary?.evalEligibleExplanation || "Eval eligibility excludes background, system, and identity-linkage events."}</p>
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Dependency gaps</p>
                            <div className="mt-3 grid gap-2">
                                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                    <p className="text-sm font-semibold text-white">Missing actor</p>
                                    <p className="text-xs text-gray-400">Required {dependencyReadiness?.actorMissing?.requiredMissing ?? 0} · Optional {dependencyReadiness?.actorMissing?.optionalMissing ?? 0} · Background exempt {dependencyReadiness?.actorMissing?.backgroundExempt ?? 0}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                    <p className="text-sm font-semibold text-white">Missing session</p>
                                    <p className="text-xs text-gray-400">Required {dependencyReadiness?.sessionMissing?.requiredMissing ?? 0} · Optional {dependencyReadiness?.sessionMissing?.optionalMissing ?? 0} · Background exempt {dependencyReadiness?.sessionMissing?.backgroundExempt ?? 0}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                    <p className="text-sm font-semibold text-white">Missing route</p>
                                    <p className="text-xs text-gray-400">Required {dependencyReadiness?.routeMissing?.requiredMissing ?? 0} · Optional {dependencyReadiness?.routeMissing?.optionalMissing ?? 0} · Background exempt {dependencyReadiness?.routeMissing?.backgroundExempt ?? 0}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                    <p className="text-sm font-semibold text-white">Missing creator</p>
                                    <p className="text-xs text-gray-400">Required {dependencyReadiness?.creatorContextMissing?.requiredMissing ?? 0} · Optional {dependencyReadiness?.creatorContextMissing?.optionalMissing ?? 0} · Background exempt {dependencyReadiness?.creatorContextMissing?.backgroundExempt ?? 0}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Coverage by domain</p>
                            <div className="mt-3 space-y-2">
                                {(data?.orchestration?.domainSummary || []).slice(0, 6).map((entry: any) => (
                                    <div
                                        key={entry.key}
                                        className="space-y-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-300"
                                        data-behavior-domain={entry.domain || entry.key}
                                        data-behavior-domain-event-count={entry.eventCount ?? 0}
                                        data-behavior-domain-open-unique={entry.uniqueOpenFindings ?? entry.openFindingCount ?? 0}
                                        data-behavior-domain-duplicates={entry.duplicateFindings ?? 0}
                                        data-behavior-domain-state={entry.state || "info"}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-semibold text-white">{entry.key}</span>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Events" value={entry.eventCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Open" value={entry.uniqueOpenFindings ?? entry.openFindingCount ?? 0} tone={entry.openFindingCount ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Duplicates" value={entry.duplicateFindings ?? 0} tone={(entry.duplicateFindings ?? 0) > 0 ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Inspect only" value={entry.inspectOnlyFindings ?? 0} tone={(entry.inspectOnlyFindings ?? 0) > 0 ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="State" value={entry.state || "info"} tone={toneForDomainState(entry.state)} truthState="live" badgeLabel={entry.state === "error" ? "ERROR" : entry.state === "review" ? "REVIEW" : entry.state === "live" ? "LIVE" : "INFO"} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400">{entry.explanation || DUPLICATE_INSPECT_EXPLANATION}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Health math</p>
                            <div className="mt-3 space-y-2">
                                {(behaviorSummary?.penalties || []).map((penalty: any) => (
                                    <div key={penalty.reasonCode} className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
                                        <span className="font-semibold text-white">{penalty.reasonCode}</span>
                                        <span>{penalty.count} × {penalty.weight} = {penalty.appliedPenalty}</span>
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
                summary={<><Pill label="Actors" value={(data?.orchestration?.actorSummaries || []).length} truthState="live" badgeLabel="LOADED" /><Pill label="Contamination risks" value={data?.orchestration?.summary?.contaminationRisks ?? 0} tone={(data?.orchestration?.summary?.contaminationRisks ?? 0) ? "bad" : "good"} truthState="live" badgeLabel="LOADED" /></>}
            >
                <ScrollWrap>
                    <div className="divide-y divide-white/10">
                        {(data?.orchestration?.actorSummaries || []).map((actor: any) => (
                            <div
                                key={actor.id}
                                className="space-y-2 px-4 py-3"
                                data-actor-event-count-state={typeof actor.eventCount === "number" ? "loaded" : "loading"}
                                data-actor-event-count={actor.eventCount ?? 0}
                                data-actor-bleed-risk-count={actor.contaminationCount ?? 0}
                                data-actor-critical-count={actor.criticalCount ?? 0}
                                data-actor-domains={(actor.topDomains || []).join(",")}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-white">{actor.actorLabel || actor.actorId || actor.actorType}</p>
                                        <p className="text-xs text-gray-400">{actor.actorType} | {shortId(actor.actorId || actor.actorKey || "")}</p>
                                    </div>
                                    <Pill label="Events" value={actor.eventCount} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Warnings" value={actor.warningCount} tone={actor.warningCount ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                    <Pill label="Critical" value={actor.criticalCount} tone={actor.criticalCount ? "bad" : "good"} truthState="live" badgeLabel="LOADED" />
                                    <Pill label="Bleed risk" value={actor.contaminationCount} tone={actor.contaminationCount ? "bad" : "good"} truthState="live" badgeLabel="LOADED" />
                                </div>
                                {actor.topDomains?.length ? <p className="text-xs text-gray-400">Domains: {actor.topDomains.join(", ")}</p> : null}
                                {actor.riskDomains?.length ? <p className="text-xs text-gray-400">Risk domains: {actor.riskDomains.join(", ")}</p> : null}
                                {(actor.riskReasons || []).length ? (
                                    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Risk reasons</p>
                                        <div className="space-y-2">
                                            {(actor.riskReasons || []).map((reason: any, index: number) => (
                                                <div
                                                    key={`${actor.id}-reason-${reason.reasonCode}-${index}`}
                                                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                                                    data-actor-risk-reason-code={reason.reasonCode || "unknown"}
                                                    data-actor-risk-reason-count={reason.count ?? 0}
                                                    data-actor-risk-applies-to-bleed={reason.appliesToBleedRisk ? "true" : "false"}
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex flex-wrap gap-2">
                                                            <Pill label="Reason" value={reason.reasonCode || "unknown"} tone={toneForActorRiskSeverity(reason.severity)} truthState="live" badgeLabel={reason.severity === "error" ? "ERROR" : reason.severity === "warn" ? "REVIEW" : "INFO"} />
                                                            <Pill label="Count" value={reason.count ?? 0} tone="neutral" truthState="live" badgeLabel="LOADED" />
                                                            <Pill label="Domain" value={reason.domain || "telemetry"} tone="neutral" truthState="live" badgeLabel="INFO" />
                                                            {reason.appliesToBleedRisk ? <Pill label="Bleed" value="yes" tone="bad" truthState="live" badgeLabel="RISK" /> : null}
                                                        </div>
                                                        {reason.sampleEventId ? <span className="text-[11px] text-gray-400">Sample {shortId(reason.sampleEventId)}</span> : null}
                                                    </div>
                                                    <p className="mt-2 text-xs text-gray-300">{reason.explanation || "Risk count exists but no source reason was attached; inspect normalization evidence."}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
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
