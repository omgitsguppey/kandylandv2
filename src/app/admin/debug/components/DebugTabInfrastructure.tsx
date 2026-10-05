"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import { Section, Pill } from "./DebugPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { AdminDebugWorkstream } from "@/components/creative-tim/kandydrops/admin-debug/AdminDebugWorkstream";
import type { CompleteDependencyInventory, DependencyInventoryEntry } from "@/lib/debug/dependency-inventory-contract";

export interface DebugTabInfrastructureProps {
    data: any;
}

function truthStateForConnectivity(state?: string) {
    if (state === "live") return "live" as const;
    if (state === "failed") return "failed" as const;
    return "unavailable" as const;
}

function installedVersionLabel(entry: DependencyInventoryEntry) {
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

export function DebugTabInfrastructure({ data }: DebugTabInfrastructureProps) {
    const inventory: (Partial<CompleteDependencyInventory> & { error?: string }) | undefined = data?.infrastructure;
    const inventoryCounts = [
        { label: "Runtime deps", value: inventory?.totals?.runtimeDependencies },
        { label: "Dev deps", value: inventory?.totals?.devDependencies },
        { label: "Optional deps", value: inventory?.totals?.optionalDependencies },
        { label: "Peer deps", value: inventory?.totals?.peerDependencies },
        { label: "Functions deps", value: inventory?.totals?.functionsDependencies },
        { label: "External services", value: inventory?.totals?.externalServices },
        { label: "Expected absent", value: inventory?.totals?.expectedAbsentDependencies },
        { label: "Unknown direct deps", value: inventory?.totals?.unknownDisplayed },
    ];

    return (
        <AdminDebugWorkstream
            eyebrow="Infrastructure"
            title="Runtime and dependency evidence"
            subtitle="Declared inventory and observed connectivity remain separate so package presence is never treated as runtime proof."
        >
            {!inventory ? (
                <div className="min-w-0 space-y-2 text-sm leading-6 text-muted-foreground" data-debug-infrastructure-source="source_missing">
                    <Pill label="Inventory" value="Not loaded" truthState="unavailable" badgeLabel="MISSING" />
                    <p>Inventory is not loaded. Check the Debug source status above before treating package counts or runtime checks as current.</p>
                </div>
            ) : inventory.error ? (
                <div role="alert" className="min-w-0 space-y-2 text-sm leading-6 wrap-anywhere" data-debug-infrastructure-source="failed">
                    <Pill label="Inventory" value="Failed" truthState="failed" badgeLabel="FAILED" />
                    <p className="text-destructive">{inventory.error}</p>
                    <p className="text-muted-foreground">The inventory read failed. Its package counts and connectivity are unavailable.</p>
                </div>
            ) : (
                <div className="min-w-0 space-y-6" data-debug-infrastructure-source="loaded">
                    <Section
                        title="Environment & runtime checks"
                        subtitle="Package inventory plus selected runtime connectivity checks. Package presence does not prove runtime use."
                        defaultOpen={true}
                    >
                        <dl className="min-w-0 space-y-3 text-sm" data-debug-dependency-generated-at-utc={inventory.generatedAtUtc}>
                            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <dt className="text-muted-foreground">Node Version</dt>
                                <dd className="min-w-0 max-w-full wrap-anywhere font-mono">{inventory.nodeVersion || "Not loaded"}</dd>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <dt className="text-muted-foreground">Firestore Connectivity</dt>
                                <dd className="min-w-0 max-w-full"><AdminStatusBadge state={truthStateForConnectivity(inventory.runtimeConnectivityChecks?.firestoreConnectivity?.status)} /></dd>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <dt className="text-muted-foreground">Last Telemetry Ping</dt>
                                <dd className="min-w-0 max-w-full wrap-anywhere font-mono">{inventory.runtimeConnectivityChecks?.lastTelemetryPing?.timestampUtc || "unavailable"}</dd>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <dt className="text-muted-foreground">Generated</dt>
                                <dd className="min-w-0 max-w-full wrap-anywhere font-mono">{inventory.generatedAtUtc || "Not loaded"}</dd>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <dt className="text-muted-foreground">Freshness</dt>
                                <dd className="min-w-0 max-w-full"><AdminStatusBadge state={inventory.freshnessState === "fresh" ? "live" : inventory.freshnessState === "stale" ? "stale" : "unavailable"} /></dd>
                            </div>
                        </dl>
                        <p className="text-sm leading-6 text-muted-foreground">Declared package versions are inventory truth. Runtime connectivity is shown separately and does not imply every dependency is active in-process.</p>
                    </Section>

                    <Section title="Inventory counts" subtitle="Declared package counts; these do not establish provider health." defaultOpen={true}>
                        <dl className="flex min-w-0 flex-wrap gap-x-8 gap-y-4 text-sm" data-debug-dependency-counts="declared">
                            {inventoryCounts.map(({ label, value }) => (
                                <div key={label} className="min-w-0 flex-1 basis-40" data-debug-dependency-count-state={typeof value === "number" && Number.isFinite(value) ? "loaded" : "source_missing"}>
                                    <dt className="wrap-anywhere text-muted-foreground">{label}</dt>
                                    <dd className="mt-1 wrap-anywhere text-xl font-semibold tabular-nums">{typeof value === "number" && Number.isFinite(value) ? value : "Not loaded"}</dd>
                                </div>
                            ))}
                        </dl>
                        <dl className="min-w-0 space-y-3 text-sm leading-6 text-muted-foreground">
                            <div><dt>Root package updated</dt><dd className="wrap-anywhere font-mono">{inventory.rootPackageTimestampLabel || inventory.rootPackageUpdatedAtUtc || "timestamp unavailable"}</dd></div>
                            <div><dt>Functions package updated</dt><dd className="wrap-anywhere font-mono">{inventory.functionsPackageTimestampLabel || inventory.functionsPackageUpdatedAtUtc || "timestamp unavailable"}</dd></div>
                        </dl>
                    </Section>

                    <Section title="Dependency groups" subtitle="Open a group for every declared package and its lockfile result." defaultOpen={true}>
                        <div className="min-w-0 divide-y divide-border" data-debug-dependency-group-count={Array.isArray(inventory.groups) ? inventory.groups.length : undefined}>
                            {Array.isArray(inventory.groups) ? inventory.groups.length > 0 ? inventory.groups.map((group: any) => (
                                <Disclosure key={group.key} className="min-w-0">
                                    <DisclosureSummary className="min-h-11 cursor-pointer py-3 text-sm outline-none marker:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
                                        <span className="inline-block max-w-full min-w-0 align-top">
                                            <span className="block wrap-anywhere font-semibold">{group.label}</span>
                                            <span className="block wrap-anywhere leading-6 text-muted-foreground">{typeof group.count === "number" && Number.isFinite(group.count) ? `${group.count} declared packages` : "Count not loaded"}</span>
                                            <span className="block wrap-anywhere leading-6 text-muted-foreground">{group.topEntries?.join(", ") || "No direct dependencies loaded"}</span>
                                        </span>
                                    </DisclosureSummary>
                                    <div className="min-w-0 divide-y divide-border pb-3">
                                        {(group.entries || []).map((entry: any) => (
                                            <article key={`${entry.sourcePackage}:${entry.dependencyType}:${entry.name}`} className="min-w-0 space-y-2 py-3 text-sm leading-6">
                                                <h3 className="wrap-anywhere font-semibold">{entry.name}</h3>
                                                <div className="flex min-w-0 max-w-full flex-wrap gap-x-4 gap-y-2">
                                                    <Pill label={entry.dependencyType === "runtime" ? "Declared" : entry.dependencyType === "dev" ? "Dev" : entry.dependencyType === "peer" ? "Peer" : "Optional"} value={entry.declaredVersion} truthState="live" badgeLabel={entry.sourcePackage.toUpperCase()} />
                                                </div>
                                                <p className="wrap-anywhere text-muted-foreground">Lockfile verified: <span className="font-mono text-foreground">{installedVersionLabel(entry)}</span></p>
                                                <dl className="flex min-w-0 flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
                                                    <div className="min-w-0"><dt>Source package</dt><dd className="wrap-anywhere text-foreground">{entry.sourcePackage}</dd></div>
                                                    <div className="min-w-0"><dt>Category</dt><dd className="wrap-anywhere text-foreground">{entry.category}</dd></div>
                                                </dl>
                                            </article>
                                        ))}
                                    </div>
                                </Disclosure>
                            )) : <p className="py-3 text-sm leading-6 text-muted-foreground">No direct dependency groups are loaded.</p> : <Pill label="Dependency groups" value="Not loaded" truthState="unavailable" badgeLabel="MISSING" />}
                        </div>
                    </Section>

                    <Section title="External services and config dependencies" subtitle="Runtime verification stays separate from config and package inventory." defaultOpen={false}>
                        <div className="min-w-0 divide-y divide-border">
                            {Array.isArray(inventory.externalServiceDependencies) ? inventory.externalServiceDependencies.map((service: any) => (
                                <article key={service.serviceName} className="min-w-0 space-y-3 py-3 text-sm leading-6">
                                    <h3 className="wrap-anywhere font-semibold">{service.serviceName}</h3>
                                    <div className="flex min-w-0 max-w-full flex-wrap gap-x-4 gap-y-2">
                                        <Pill label="Config" value={service.configPresenceStatus} truthState={service.configPresenceStatus === "declared" ? "live" : "unavailable"} />
                                        <Pill label="Runtime" value={service.runtimeVerificationStatus} truthState="unavailable" badgeLabel="SEPARATE" />
                                    </div>
                                    <dl className="min-w-0 space-y-2 text-muted-foreground">
                                        <div><dt>Owner</dt><dd className="wrap-anywhere text-foreground">{service.owner}</dd></div>
                                        <div><dt>Env keys</dt><dd className="wrap-anywhere font-mono text-foreground">{[...(service.envKeysRequired || []), ...(service.envKeysOptional || [])].join(", ") || "none required"}</dd></div>
                                    </dl>
                                    <p className="wrap-anywhere text-muted-foreground">{service.nextAction}</p>
                                </article>
                            )) : <Pill label="External services" value="Not loaded" truthState="unavailable" badgeLabel="MISSING" />}
                        </div>
                    </Section>

                    <Section title="Package sources" subtitle="File presence and declared slots; no runtime verification is implied." defaultOpen={false}>
                        <div className="min-w-0 divide-y divide-border">
                            {Array.isArray(inventory.packageSources) ? inventory.packageSources.map((source: any) => (
                                <article key={source.path} className="min-w-0 space-y-3 py-3 text-sm leading-6">
                                    <h3 className="wrap-anywhere font-semibold">{source.name}</h3>
                                    <p className="wrap-anywhere font-mono text-muted-foreground">{source.path}</p>
                                    <Pill label="Source file" value={source.present === true ? "Present" : source.present === false ? "Absent" : "Not loaded"} truthState={source.present === true ? "cached" : "unavailable"} badgeLabel="SOURCE" />
                                    <dl className="flex min-w-0 flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
                                        {[
                                            { label: "Runtime", entries: source.dependencies },
                                            { label: "Dev", entries: source.devDependencies },
                                            { label: "Optional", entries: source.optionalDependencies },
                                            { label: "Peer", entries: source.peerDependencies },
                                        ].map(({ label, entries }) => (
                                            <div key={label} className="min-w-0"><dt>{label}</dt><dd className="wrap-anywhere text-foreground tabular-nums">{source.present === true && Array.isArray(entries) ? entries.length : "Not loaded"}</dd></div>
                                        ))}
                                    </dl>
                                </article>
                            )) : <Pill label="Package sources" value="Not loaded" truthState="unavailable" badgeLabel="MISSING" />}
                        </div>
                    </Section>

                    <Section title="Overrides and not-direct packages" subtitle="Security pins and expected-absent classifications remain inventory evidence." defaultOpen={false}>
                        <div className="min-w-0 divide-y divide-border">
                            {Array.isArray(inventory.overrides) ? inventory.overrides.map((overrideGroup: any) => (
                                <Disclosure key={overrideGroup.sourcePackage} className="min-w-0">
                                    <DisclosureSummary className="min-h-11 cursor-pointer py-3 text-sm outline-none marker:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
                                        <span className="inline-block max-w-full min-w-0 align-top">
                                            <span className="block wrap-anywhere font-semibold">{overrideGroup.sourcePackage} overrides</span>
                                            <span className="block wrap-anywhere leading-6 text-muted-foreground">{typeof overrideGroup.count === "number" && Number.isFinite(overrideGroup.count) ? `${overrideGroup.count} security and transitive pins` : "Count not loaded"}</span>
                                        </span>
                                    </DisclosureSummary>
                                    <ul className="min-w-0 space-y-2 pb-3 text-sm leading-6 text-muted-foreground">
                                        {(overrideGroup.names || []).map((name: string) => <li key={name} className="wrap-anywhere font-mono">{name}</li>)}
                                    </ul>
                                </Disclosure>
                            )) : <Pill label="Overrides" value="Not loaded" truthState="unavailable" badgeLabel="MISSING" />}
                            <Disclosure className="min-w-0">
                                <DisclosureSummary className="min-h-11 cursor-pointer py-3 text-sm outline-none marker:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring">
                                    <span className="inline-block max-w-full min-w-0 align-top">
                                        <span className="block wrap-anywhere font-semibold">Not directly installed / transitive or expected but absent</span>
                                        <span className="block wrap-anywhere leading-6 text-muted-foreground">These are not shown as core direct dependencies.</span>
                                    </span>
                                </DisclosureSummary>
                                <div className="min-w-0 divide-y divide-border pb-3">
                                    {(inventory.expectedButAbsentDependencies || inventory.notDirectDependencies || []).map((entry: any) => (
                                        <article key={entry.name} className="min-w-0 space-y-2 py-3 text-sm leading-6">
                                            <h3 className="wrap-anywhere font-semibold">{entry.name}</h3>
                                            <p className="wrap-anywhere text-muted-foreground">{entry.status || entry.state}</p>
                                            {entry.reason ? <p className="wrap-anywhere text-muted-foreground">{entry.reason}</p> : null}
                                            <Pill label="Classification" value={entry.status || entry.expectedStatus || entry.state || "unknown"} tone={entry.installedVersion || entry.status === "transitive_only" ? "warn" : "neutral"} truthState={entry.installedVersion || entry.status === "transitive_only" ? "cached" : "unavailable"} badgeLabel={entry.installedVersion || entry.status === "transitive_only" ? "TRANSITIVE" : "ABSENT"} />
                                        </article>
                                    ))}
                                </div>
                            </Disclosure>
                        </div>
                    </Section>
                </div>
            )}
        </AdminDebugWorkstream>
    );
}
