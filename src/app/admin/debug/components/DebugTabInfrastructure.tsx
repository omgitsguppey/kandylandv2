"use client";

import { Section, Pill } from "./DebugPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";

export interface DebugTabInfrastructureProps {
    data: any;
}

function toneForConnectivity(state?: string) {
    if (state === "live") return "good" as const;
    if (state === "failed") return "bad" as const;
    return "neutral" as const;
}

function truthStateForConnectivity(state?: string) {
    if (state === "live") return "live" as const;
    if (state === "failed") return "failed" as const;
    return "unavailable" as const;
}

function installedVersionLabel(entry: any) {
    if (entry.installedVersionState === "from_lockfile" && entry.installedVersion) {
        return entry.installedVersion;
    }
    if (entry.installedVersionState === "not_installed") {
        return "not installed";
    }
    if (entry.installedVersionState === "not_checked") {
        return "not checked";
    }
    return "unknown";
}

function categoryTone(category?: string) {
    if (category === "firebase_google" || category === "framework" || category === "payments" || category === "functions_cloud") return "good" as const;
    if (category === "testing_qa" || category === "agent_repo_tooling" || category === "unknown_other" || category === "security_overrides") return "warn" as const;
    return "neutral" as const;
}

export function DebugTabInfrastructure({ data }: DebugTabInfrastructureProps) {
    const inventory = data?.infrastructure;

    return (
        <div className="space-y-4">
            <Section
                title="Infrastructure Health & Dependencies"
                subtitle="Package inventory plus selected runtime connectivity checks. Package presence does not prove runtime use."
                defaultOpen={true}
                summary={inventory && !inventory.error ? (
                    <>
                        <Pill label="Runtime deps" value={inventory.totals?.runtimeDependencies ?? 0} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Dev deps" value={inventory.totals?.devDependencies ?? 0} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Functions deps" value={inventory.totals?.functionsDependencies ?? 0} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Overrides" value={inventory.totals?.overrideCount ?? 0} truthState="live" badgeLabel="LOADED" />
                        <Pill label="External services" value={inventory.totals?.externalServices ?? 0} truthState="live" badgeLabel="MAPPED" />
                        <Pill label="Expected absent" value={inventory.totals?.expectedAbsentDependencies ?? 0} truthState="live" badgeLabel="CLASSIFIED" />
                    </>
                ) : undefined}
            >
                {inventory ? (
                    inventory.error ? (
                        <div className="rounded border border-red-500/20 bg-red-900/10 p-4 font-mono text-xs text-red-400">
                            [FAILED] {inventory.error}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                <div className="rounded border border-white/5 bg-black/20 p-4" data-debug-dependency-generated-at-utc={inventory.generatedAtUtc}>
                                    <h3 className="mb-3 border-b border-white/5 pb-2 text-xs uppercase tracking-wider text-white/50">Environment & runtime checks</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs text-white/70">Node Version</span>
                                            <span className="text-xs font-mono text-cyan-400">{inventory.nodeVersion}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs text-white/70">Firestore Connectivity</span>
                                            <AdminStatusBadge state={truthStateForConnectivity(inventory.firestoreConnectivity)} />
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs text-white/70">Last Telemetry Ping</span>
                                            <span className="text-xs font-mono text-white/60">{inventory.lastTelemetryPingAtUtc || "unavailable"}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs text-white/70">Generated</span>
                                            <span className="text-xs font-mono text-white/60">{inventory.generatedAtUtc}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs text-white/70">Freshness</span>
                                            <AdminStatusBadge state={inventory.freshnessState === "fresh" ? "live" : "stale"} />
                                        </div>
                                    </div>
                                    <p className="mt-3 text-xs text-gray-400">Declared package versions are inventory truth. Runtime connectivity is shown separately and does not imply every dependency is active in-process.</p>
                                </div>

                                <div className="rounded border border-white/5 bg-black/20 p-4">
                                    <h3 className="mb-3 border-b border-white/5 pb-2 text-xs uppercase tracking-wider text-white/50">Inventory counts</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Runtime deps" value={inventory.totals?.runtimeDependencies ?? 0} truthState="live" badgeLabel="COUNT" />
                                        <Pill label="Dev deps" value={inventory.totals?.devDependencies ?? 0} truthState="live" badgeLabel="COUNT" />
                                        <Pill label="Optional deps" value={inventory.totals?.optionalDependencies ?? 0} truthState="live" badgeLabel="COUNT" />
                                        <Pill label="Peer deps" value={inventory.totals?.peerDependencies ?? 0} truthState="live" badgeLabel="COUNT" />
                                        <Pill label="Functions deps" value={inventory.totals?.functionsDependencies ?? 0} truthState="live" badgeLabel="COUNT" />
                                        <Pill label="External services" value={inventory.totals?.externalServices ?? 0} truthState="live" badgeLabel="MAPPED" />
                                        <Pill label="Expected absent" value={inventory.totals?.expectedAbsentDependencies ?? 0} truthState="live" badgeLabel="CLASSIFIED" />
                                        <Pill label="Unknown direct deps" value={inventory.totals?.unknownDisplayed ?? 0} truthState="live" badgeLabel="COUNT" />
                                    </div>
                                    <div className="mt-4 space-y-2 text-xs text-gray-300">
                                        <p>Root package updated: {inventory.rootPackageTimestampLabel || inventory.rootPackageUpdatedAtUtc || "timestamp unavailable"}</p>
                                        <p>Functions package updated: {inventory.functionsPackageTimestampLabel || inventory.functionsPackageUpdatedAtUtc || "timestamp unavailable"}</p>
                                        <p>Package presence does not prove runtime use.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded border border-white/5 bg-black/20 p-4">
                                <h3 className="mb-3 border-b border-white/5 pb-2 text-xs uppercase tracking-wider text-white/50">Dependency groups</h3>
                                <div className="space-y-3" data-debug-dependency-group-count={inventory.groups?.length ?? 0}>
                                    {(inventory.groups || []).map((group: any) => (
                                        <details key={group.key} className="rounded border border-white/10 bg-black/20 px-3 py-2">
                                            <summary className="cursor-pointer list-none">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{group.label}</p>
                                                        <p className="text-xs text-gray-400">{group.topEntries?.join(", ") || "No direct dependencies loaded"}</p>
                                                    </div>
                                                    <Pill label="Count" value={group.count} truthState="live" badgeLabel="COUNT" tone={categoryTone(group.key)} />
                                                </div>
                                            </summary>
                                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                                                {(group.entries || []).map((entry: any) => (
                                                    <div key={`${entry.sourcePackage}:${entry.dependencyType}:${entry.name}`} className="rounded border border-white/10 bg-black/25 p-2 text-xs text-gray-300">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-semibold text-white">{entry.name}</span>
                                                            <Pill label={entry.dependencyType === "runtime" ? "Declared" : entry.dependencyType === "dev" ? "Dev" : "Optional"} value={entry.declaredVersion} truthState="live" badgeLabel={entry.sourcePackage.toUpperCase()} />
                                                        </div>
                                                        <div className="mt-2 space-y-1">
                                                            <p>Lockfile verified: {installedVersionLabel(entry)}</p>
                                                            <p>Source package: {entry.sourcePackage}</p>
                                                            <p>Category: {entry.category}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                <div className="rounded border border-white/5 bg-black/20 p-4">
                                    <h3 className="mb-3 border-b border-white/5 pb-2 text-xs uppercase tracking-wider text-white/50">Package sources</h3>
                                    <div className="space-y-3">
                                        {(inventory.packageSources || []).map((source: any) => (
                                            <details key={source.path} className="rounded border border-white/10 bg-black/20 px-3 py-2">
                                                <summary className="cursor-pointer list-none">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="font-semibold text-white">{source.name}</p>
                                                            <p className="text-xs text-gray-400">{source.path}</p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Pill label="Runtime" value={(source.dependencies || []).length} truthState="live" badgeLabel="COUNT" />
                                                            <Pill label="Dev" value={(source.devDependencies || []).length} truthState="live" badgeLabel="COUNT" />
                                                            <Pill label="Optional" value={(source.optionalDependencies || []).length} truthState="live" badgeLabel="COUNT" />
                                                            <Pill label="Peer" value={(source.peerDependencies || []).length} truthState="live" badgeLabel="COUNT" />
                                                        </div>
                                                    </div>
                                                </summary>
                                            </details>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded border border-white/5 bg-black/20 p-4">
                                    <h3 className="mb-3 border-b border-white/5 pb-2 text-xs uppercase tracking-wider text-white/50">Overrides and not-direct packages</h3>
                                    <div className="space-y-3">
                                        {(inventory.overrides || []).map((overrideGroup: any) => (
                                            <details key={overrideGroup.sourcePackage} className="rounded border border-white/10 bg-black/20 px-3 py-2">
                                                <summary className="cursor-pointer list-none">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="font-semibold text-white">{overrideGroup.sourcePackage} overrides</p>
                                                            <p className="text-xs text-gray-400">Security and transitive pin summary</p>
                                                        </div>
                                                        <Pill label="Count" value={overrideGroup.count} truthState="live" badgeLabel="COUNT" />
                                                    </div>
                                                </summary>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {(overrideGroup.names || []).map((name: string) => (
                                                        <span key={name} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300">{name}</span>
                                                    ))}
                                                </div>
                                            </details>
                                        ))}

                                        <details className="rounded border border-white/10 bg-black/20 px-3 py-2">
                                            <summary className="cursor-pointer list-none">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">External services and config dependencies</p>
                                                        <p className="text-xs text-gray-400">Runtime verification stays separate from config and package inventory.</p>
                                                    </div>
                                                    <Pill label="Count" value={(inventory.externalServiceDependencies || []).length} truthState="live" badgeLabel="MAPPED" />
                                                </div>
                                            </summary>
                                            <div className="mt-3 space-y-2">
                                                {(inventory.externalServiceDependencies || []).map((service: any) => (
                                                    <div key={service.serviceName} className="rounded border border-white/10 bg-black/25 px-3 py-2 text-xs text-gray-300">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="font-semibold text-white">{service.serviceName}</p>
                                                                <p>Owner: {service.owner}</p>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <Pill label="Config" value={service.configPresenceStatus} truthState={service.configPresenceStatus === "declared" ? "live" : "unavailable"} badgeLabel="CONFIG" />
                                                                <Pill label="Runtime" value={service.runtimeVerificationStatus} truthState="unavailable" badgeLabel="SEPARATE" />
                                                            </div>
                                                        </div>
                                                        <p className="mt-2">Env keys: {[...(service.envKeysRequired || []), ...(service.envKeysOptional || [])].join(", ") || "none required"}</p>
                                                        <p className="mt-1 text-gray-400">{service.nextAction}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>

                                        <details className="rounded border border-white/10 bg-black/20 px-3 py-2">
                                            <summary className="cursor-pointer list-none">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">Not directly installed / transitive or expected but absent</p>
                                                        <p className="text-xs text-gray-400">These are not shown as core direct dependencies.</p>
                                                    </div>
                                                    <Pill label="Count" value={(inventory.notDirectDependencies || []).length} truthState="live" badgeLabel="COUNT" />
                                                </div>
                                            </summary>
                                            <div className="mt-3 space-y-2">
                                                {(inventory.expectedButAbsentDependencies || inventory.notDirectDependencies || []).map((entry: any) => (
                                                    <div key={entry.name} className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-black/25 px-3 py-2 text-xs text-gray-300">
                                                        <div>
                                                            <p className="font-semibold text-white">{entry.name}</p>
                                                            <p>{entry.status || entry.state}</p>
                                                            {entry.reason ? <p className="text-gray-400">{entry.reason}</p> : null}
                                                        </div>
                                                        <Pill label="Classification" value={entry.status || entry.expectedStatus || entry.state || "unknown"} tone={entry.installedVersion || entry.status === "transitive_only" ? "warn" : "neutral"} truthState={entry.installedVersion || entry.status === "transitive_only" ? "cached" : "unavailable"} badgeLabel={entry.installedVersion || entry.status === "transitive_only" ? "TRANSITIVE" : "ABSENT"} />
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="py-8 text-center text-sm italic text-white/40">
                        Loading dependency inventory...
                    </div>
                )}
            </Section>
        </div>
    );
}
