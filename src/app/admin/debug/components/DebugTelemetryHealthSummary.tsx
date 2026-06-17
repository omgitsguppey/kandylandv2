"use client";

import { Pill, Section } from "./DebugPrimitives";

const DEBUG_TELEMETRY_NOT_LOADED = "Not loaded";

type AdminTelemetryHealthStatus =
    | "live"
    | "degraded"
    | "unavailable"
    | "disabled"
    | "config_missing"
    | "source_ready"
    | "runtime_unproven";

type TelemetryHealthLane = {
    id: string;
    label: string;
    status: AdminTelemetryHealthStatus;
    lastKnownEvidence: string;
    freshness: string;
    nextAction: string;
    costRisk: "low" | "medium" | "high";
    sourceTruth: string;
};

export function toneForTelemetryHealthStatus(status?: string) {
    if (status === "live" || status === "source_ready") return "good" as const;
    if (status === "degraded" || status === "runtime_unproven") return "warn" as const;
    if (status === "unavailable" || status === "config_missing") return "bad" as const;
    return "neutral" as const;
}

export function truthStateForTelemetryHealthStatus(status?: string) {
    if (status === "live") return "live" as const;
    if (status === "source_ready") return "cached" as const;
    if (status === "runtime_unproven") return "degraded" as const;
    if (status === "degraded") return "degraded" as const;
    if (status === "config_missing" || status === "unavailable" || status === "disabled") return "unavailable" as const;
    return "unavailable" as const;
}

function labelForTelemetryHealthStatus(status?: string) {
    switch (status) {
        case "live":
            return "Live";
        case "degraded":
            return "Needs review";
        case "unavailable":
            return "Unavailable";
        case "disabled":
            return "Disabled";
        case "config_missing":
            return "Config missing";
        case "source_ready":
            return "Source ready";
        case "runtime_unproven":
            return "Runtime unproven";
        default:
            return "Unknown";
    }
}

function valueWhenTelemetryLoaded(isLoaded: boolean, value: unknown): string | number {
    if (!isLoaded) return DEBUG_TELEMETRY_NOT_LOADED;
    if (typeof value === "number" || typeof value === "string") return value;
    return 0;
}

export function DebugTelemetryHealthSummary({ telemetryHealth }: { telemetryHealth: any }) {
    const lanes = Array.isArray(telemetryHealth?.lanes) ? telemetryHealth.lanes as TelemetryHealthLane[] : [];
    const telemetryLoaded = lanes.length > 0;
    const summary = telemetryHealth?.summary || {};
    const degradedCount = Number(summary.degraded || 0) + Number(summary.runtimeUnproven || 0);
    const unavailableCount = Number(summary.unavailable || 0) + Number(summary.configMissing || 0);
    const summaryTone = !telemetryLoaded ? "neutral" : unavailableCount > 0 ? "bad" : degradedCount > 0 ? "warn" : "good";
    const summaryTruthState = !telemetryLoaded ? "unavailable" : unavailableCount > 0 ? "degraded" : degradedCount > 0 ? "degraded" : "live";

    return (
        <Section
            title="Telemetry pipeline health"
            subtitle="Compact lane status for client tracking, ingest, sessions, facts, exports, and external evidence."
            defaultOpen={false}
            summary={(
                <>
                    <Pill label="Lanes" value={lanes.length} tone={lanes.length ? "good" : "bad"} truthState={lanes.length ? "live" : "unavailable"} />
                    <Pill label="Live" value={valueWhenTelemetryLoaded(telemetryLoaded, summary.live ?? 0)} tone={telemetryLoaded ? "good" : "neutral"} truthState={telemetryLoaded ? "live" : "unavailable"} />
                    <Pill label="Needs review" value={valueWhenTelemetryLoaded(telemetryLoaded, degradedCount)} tone={degradedCount > 0 ? "warn" : telemetryLoaded ? "good" : "neutral"} truthState={summaryTruthState} />
                    <Pill label="Unavailable" value={valueWhenTelemetryLoaded(telemetryLoaded, unavailableCount)} tone={unavailableCount > 0 ? "bad" : telemetryLoaded ? "good" : "neutral"} truthState={telemetryLoaded ? unavailableCount > 0 ? "unavailable" : "live" : "unavailable"} />
                    <Pill label="Raw details" value="Drilldown only" tone="neutral" truthState="cached" />
                </>
            )}
        >
            {lanes.length ? (
                <div
                    className="grid gap-2 md:grid-cols-2"
                    data-telemetry-admin-health="compact"
                    data-telemetry-admin-raw-default={String(telemetryHealth?.rawDetailsDefault === true)}
                    data-telemetry-admin-load-policy={telemetryHealth?.defaultAdminLoadPolicy || "unknown"}
                >
                    {lanes.map((lane) => (
                        <div key={lane.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-white">{lane.label}</p>
                                    <p className="mt-1 text-xs text-gray-400">{lane.lastKnownEvidence}</p>
                                </div>
                                <Pill
                                    label="Status"
                                    value={labelForTelemetryHealthStatus(lane.status)}
                                    tone={toneForTelemetryHealthStatus(lane.status)}
                                    truthState={truthStateForTelemetryHealthStatus(lane.status)}
                                />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Freshness" value={lane.freshness} tone="neutral" truthState={truthStateForTelemetryHealthStatus(lane.status)} />
                                <Pill label="Cost" value={lane.costRisk} tone={lane.costRisk === "high" ? "warn" : "neutral"} truthState="cached" />
                            </div>
                            <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-gray-300">
                                <summary className="cursor-pointer font-semibold text-gray-100">Next action and source</summary>
                                <p className="mt-2">{lane.nextAction}</p>
                                <p className="mt-1 text-gray-500">{lane.sourceTruth}</p>
                            </details>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-300">Telemetry health is unavailable in this debug payload. Refresh the compact debug summary before using it for operator decisions.</p>
            )}
        </Section>
    );
}
