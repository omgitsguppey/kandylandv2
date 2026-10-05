"use client";

import { Pill, Section, badgeForSourceStatus, toneForSourceStatus, truthStateForSourceStatus } from "./DebugPrimitives";

export interface DebugAdvancedExperimentsProps {
    data: any;
}

function formatRelativeUtc(timestamp?: string | null) {
    if (!timestamp) return "unknown";
    const parsed = Date.parse(timestamp);
    if (!Number.isFinite(parsed)) return timestamp;
    const deltaMs = Math.max(0, Date.now() - parsed);
    const minutes = Math.floor(deltaMs / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export function DebugAdvancedExperiments({ data }: DebugAdvancedExperimentsProps) {
    const panel = data?.rolloutRegistryPanel;
    const actorPanel = panel?.actorEvaluation;
    const registryStatus = panel?.registryStatus?.status;

    return (
        <Section
            title="Experiment and rollout registry"
            subtitle="Human-readable rollout state, current beta relation, and sample actor resolution."
            defaultOpen={false}
            summary={
                <>
                    <Pill label="Source state" value={registryStatus?.status || "unknown"} tone={toneForSourceStatus(registryStatus?.status)} truthState={truthStateForSourceStatus(registryStatus?.status)} badgeLabel={badgeForSourceStatus(registryStatus?.status)} />
                    <Pill label="Configured" value={panel?.summary?.configuredRollouts ?? (data?.rollouts || []).length} truthState={truthStateForSourceStatus(registryStatus?.status)} badgeLabel={badgeForSourceStatus(registryStatus?.status)} />
                    <Pill label="Active experiments" value={panel?.summary?.activeExperiments ?? 0} tone={(panel?.summary?.activeExperiments ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                    <Pill label="Fully rolled out" value={panel?.summary?.fullyRolledOutFeatures ?? 0} truthState="live" badgeLabel="LOADED" />
                    <Pill label="Sample actors" value={panel?.summary?.sampleActors ?? data?.stats?.rolloutSamples ?? 0} truthState="live" badgeLabel="LOADED" />
                </>
            }
        >
            <div className="space-y-4">
                {panel?.currentTrain ? (
                    <div
                        className="rounded-[1rem] border border-border bg-secondary p-4"
                        data-rollout-configured-count={panel?.summary?.configuredRollouts ?? 0}
                        data-rollout-active-experiment-count={panel?.summary?.activeExperiments ?? 0}
                        data-rollout-fully-rolled-out-count={panel?.summary?.fullyRolledOutFeatures ?? 0}
                        data-rollout-train-freshness={panel.currentTrain.freshnessState || "unknown"}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="font-semibold text-foreground">{panel.currentTrain.label}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{panel.currentTrain.id}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Pill label="Train freshness" value={panel.currentTrain.freshnessState} tone={panel.currentTrain.freshnessState === "current" ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Channel" value={panel.currentTrain.channel} tone={panel.currentTrain.channel === "alpha" ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Declared" value={panel.currentTrain.declaredAtUtc} truthState="live" badgeLabel="LOADED" />
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{panel.currentTrain.relationToCurrentBeta}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Pill label="Notes" value={panel.currentTrain.notesCount ?? 0} truthState="live" badgeLabel="LOADED" />
                            <Pill label="Alpha changelog" value={panel.currentTrain.changelogEntryCount ?? 0} truthState="live" badgeLabel="LOADED" />
                            <Pill label="Current Beta" value={panel.currentBetaNotes?.currentVersion || "unknown"} truthState="live" badgeLabel="LOADED" />
                            <Pill label="Beta notes updated" value={formatRelativeUtc(panel.currentBetaNotes?.latestEntryAtUtc)} truthState="live" badgeLabel="LOADED" />
                            <Pill label="Kill switches configured" value={`${panel.summary?.killSwitchReady ?? 0}/${panel.summary?.configuredRollouts ?? 0}`} truthState="live" badgeLabel="LOADED" />
                            <Pill label="Internal features" value={panel.summary?.internalFeatures ?? 0} truthState="live" badgeLabel="LOADED" />
                        </div>
                        {Array.isArray(data?.release?.releaseNotes) && data.release.releaseNotes.length ? (
                            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                                {(data.release.releaseNotes || []).map((note: string) => (
                                    <li key={note} className="rounded-xl border border-border bg-background/20 px-3 py-2">{note}</li>
                                ))}
                            </ul>
                        ) : null}
                        <p className="mt-3 text-xs text-warning">{registryStatus?.nextAction || "Rollout registry source status not attached."}</p>
                    </div>
                ) : null}

                {(panel?.alphaBaselineChangelog || []).length ? (
                    <div className="rounded-[1rem] border border-border bg-secondary p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold text-foreground">Historical alpha changelog</p>
                                <p className="mt-1 text-xs text-muted-foreground">March alpha entries are preserved for registry history. Current Beta notes are tracked separately.</p>
                            </div>
                            <Pill label="Entries" value={(panel?.alphaBaselineChangelog || []).length} truthState="live" badgeLabel="LOADED" />
                        </div>
                        <div className="mt-4 space-y-3">
                            {(panel?.alphaBaselineChangelog || []).map((entry: any) => (
                                <div key={entry.id} className="rounded-xl border border-border bg-background/20 p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-foreground">{entry.title}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{entry.date}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(entry.areas || []).slice(0, 4).map((area: string) => (
                                                <Pill key={area} label="Area" value={area} truthState="live" badgeLabel="LOADED" />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">{entry.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-2">
                    {(panel?.rollouts || []).map((rollout: any) => (
                        <div
                            key={rollout.id}
                            className="rounded-[1rem] border border-border bg-secondary p-4"
                            data-rollout-effective-state={rollout.effectiveState || "unknown"}
                            data-rollout-kill-switch-configured={rollout.killSwitchReady ? "true" : "false"}
                            data-rollout-stage={rollout.stage || "unknown"}
                            data-rollout-audience={rollout.audience || "unknown"}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-foreground">{rollout.name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{rollout.id}</p>
                                </div>
                                <Pill label="State" value={rollout.effectiveState} tone={rollout.effectiveState === "active_experiment" || rollout.effectiveState === "stale_alpha" ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">{rollout.humanSummary}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Kind" value={rollout.kind} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Stage" value={rollout.stage} tone={rollout.stage === "alpha" ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Owner" value={rollout.owner} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Audience" value={rollout.audience} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Rollout" value={`${rollout.rolloutPct}%`} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Default" value={rollout.defaultVariant} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Kill switch configured" value={rollout.killSwitchReady ? "yes" : "no"} tone={rollout.killSwitchReady ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">{rollout.explanation}</p>
                            {(rollout.requirements || []).length ? <p className="mt-2 text-xs text-muted-foreground">Requires: {(rollout.requirements || []).join(", ")}</p> : null}
                            {(rollout.exclusions || []).length ? <p className="mt-1 text-xs text-muted-foreground">Excludes: {(rollout.exclusions || []).join(", ")}</p> : null}
                            {(rollout.activeVariants || []).length ? <p className="mt-1 text-xs text-muted-foreground">Active variants: {(rollout.activeVariants || []).join(", ")}</p> : null}
                            <p className="mt-1 text-xs text-muted-foreground">Rollback tested: not proven here.</p>
                        </div>
                    ))}
                </div>

                {actorPanel?.actorRows?.length ? (
                    <div className="rounded-[1rem] border border-border bg-secondary p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold text-foreground">Representative rollout dry run</p>
                                <p className="mt-1 text-xs text-muted-foreground">{actorPanel?.explanation || "These are fixture contexts used to verify registry rules. They are not live user assignments."}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Pill label="Mode" value={actorPanel?.mode || "unknown"} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Actors" value={actorPanel?.actorCount || 0} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Generated" value={formatRelativeUtc(actorPanel?.generatedAtUtc)} truthState="live" badgeLabel="LOADED" />
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {(actorPanel?.actorRows || []).map((sample: any) => (
                                <div
                                    key={`${sample.label}:${sample.route}`}
                                    className="rounded-xl border border-border bg-background/20 p-3"
                                    data-rollout-eval-mode={actorPanel?.mode || "unknown"}
                                    data-rollout-actor-source={sample.actorSource || "unknown"}
                                    data-rollout-actor-simulated={sample.isSimulated ? "true" : "false"}
                                    data-rollout-eval-role={sample.role || "unknown"}
                                    data-rollout-eval-route={sample.route || "unknown"}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-foreground">{sample.label}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{sample.route}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Role" value={sample.role} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Source" value={sample.actorSource} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Mode" value={sample.isSimulated ? "SIMULATED" : "LIVE"} tone={sample.isSimulated ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {sample.isSimulated ? `Dry-run ${sample.role} context on ${sample.route}.` : `Live ${sample.role} actor on ${sample.route}.`}
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {(sample.evaluations || []).map((assignment: any) => (
                                            <div
                                                key={`${sample.label}:${assignment.rolloutId}`}
                                                className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs"
                                                data-rollout-eval-reason={assignment.reason || "unknown"}
                                                data-rollout-eval-variant={assignment.variant || "unknown"}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="font-medium text-foreground">{assignment.rolloutName}</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Pill label="Variant" value={assignment.variant} truthState="live" badgeLabel="LOADED" />
                                                        <Pill label="Reason" value={assignment.reason} tone={assignment.state === "assigned" ? "good" : assignment.state === "review" ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                                    </div>
                                                </div>
                                                <p className="mt-2 text-muted-foreground">{assignment.reasonDetail}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </Section>
    );
}
