"use client";

import { Pill, Section } from "./DebugPrimitives";

/* ─── Props ─── */
export interface DebugAdvancedExperimentsProps {
    data: any;
}

/* ─── Component ─── */
export function DebugAdvancedExperiments({ data }: DebugAdvancedExperimentsProps) {
    return (
        <Section
            title="Experiment and rollout registry"
            subtitle="Current experimentation footprint and sample actor resolution."
            defaultOpen={false}
            summary={<><Pill label="Configured rollouts" value={(data?.rollouts || []).length} /><Pill label="Sample actors" value={data?.stats?.rolloutSamples ?? 0} /></>}
        >
            <div className="space-y-4">
                {data?.release ? (
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="font-semibold text-white">{data.release.label}</p>
                                <p className="mt-1 text-xs text-gray-400">{data.release.id}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Pill label="Channel" value={data.release.channel} tone={data.release.channel === "alpha" ? "warn" : "good"} />
                                <Pill label="Status" value={data.release.status} tone={data.release.status === "active" ? "good" : "neutral"} />
                                <Pill label="Declared" value={data.release.declaredAt} />
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-gray-300">{data.release.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Pill label="Train" value={data.release.train} />
                            <Pill label="Notes" value={(data.release.releaseNotes || []).length} />
                            <Pill label="Changelog" value={(data.changeLog || []).length} />
                        </div>
                        {(data.release.releaseNotes || []).length ? (
                            <ul className="mt-4 space-y-2 text-sm text-gray-300">
                                {(data.release.releaseNotes || []).map((note: string) => (
                                    <li key={note} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">{note}</li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                ) : null}

                {(data?.changeLog || []).length ? (
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold text-white">Recent changelog</p>
                                <p className="mt-1 text-xs text-gray-400">Codebase-native release notes for the current train.</p>
                            </div>
                            <Pill label="Entries" value={(data?.changeLog || []).length} />
                        </div>
                        <div className="mt-4 space-y-3">
                            {(data?.changeLog || []).map((entry: any) => (
                                <div key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{entry.title}</p>
                                            <p className="mt-1 text-xs text-gray-400">{entry.date}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(entry.areas || []).slice(0, 4).map((area: string) => (
                                                <Pill key={area} label="Area" value={area} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-300">{entry.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-2">
                    {(data?.rollouts || []).map((rollout: any) => (
                        <div key={rollout.id} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-white">{rollout.label}</p>
                                    <p className="mt-1 text-xs text-gray-400">{rollout.id}</p>
                                </div>
                                <Pill label="Enabled" value={rollout.enabled ? "Yes" : "No"} tone={rollout.enabled ? "good" : "warn"} />
                            </div>
                            <p className="mt-3 text-sm text-gray-300">{rollout.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Kind" value={rollout.kind} />
                                <Pill label="Stage" value={rollout.stage} tone={rollout.stage === "alpha" ? "warn" : "good"} />
                                <Pill label="Owner" value={rollout.owner} />
                                <Pill label="Audience" value={rollout.audience} />
                                <Pill label="Rollout" value={`${rollout.rolloutPercent}%`} />
                                <Pill label="Default" value={rollout.defaultVariant} />
                                <Pill label="Kill switch" value={rollout.killSwitchable ? "Ready" : "Locked"} tone={rollout.killSwitchable ? "good" : "warn"} />
                            </div>
                            {(rollout.requiredSegments || []).length ? <p className="mt-3 text-xs text-gray-400">Requires: {(rollout.requiredSegments || []).join(", ")}</p> : null}
                            {(rollout.excludedSegments || []).length ? <p className="mt-1 text-xs text-gray-500">Excludes: {(rollout.excludedSegments || []).join(", ")}</p> : null}
                        </div>
                    ))}
                </div>

                {(data?.rolloutSamples || []).length ? (
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold text-white">Sample actor evaluation</p>
                                <p className="mt-1 text-xs text-gray-400">Shows how the current registry resolves for representative guest, member, creator, and admin contexts.</p>
                            </div>
                            <Pill label="Actors" value={(data?.rolloutSamples || []).length} />
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {(data?.rolloutSamples || []).map((sample: any) => (
                                <div key={sample.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{sample.label}</p>
                                            <p className="mt-1 text-xs text-gray-400">{sample.path}</p>
                                        </div>
                                        <Pill label="Role" value={sample.role} />
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {(sample.assignments || []).map((assignment: any) => (
                                            <div key={`${sample.key}:${assignment.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                                                <span className="font-medium text-gray-200">{assignment.id}</span>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Variant" value={assignment.variant} />
                                                    <Pill label="Reason" value={assignment.reason} tone={assignment.active ? "good" : assignment.reason === "ineligible" ? "warn" : "neutral"} />
                                                </div>
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
