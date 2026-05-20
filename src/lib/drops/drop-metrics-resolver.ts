export type CreatorDropMetricSource = "event_facts" | "materialized_summary" | "admin_snapshot" | "unavailable";

export type CreatorDropMetricValue = {
    label: "Views" | "Clicks" | "Unwraps" | "Unique viewers";
    value: number | null;
    displayValue: string;
    provenZero: boolean;
};

export type CreatorDropMetricsInput = {
    totalViews?: unknown;
    views?: unknown;
    totalClicks?: unknown;
    clicks?: unknown;
    totalUnlocks?: unknown;
    unwraps?: unknown;
    uniqueViewers?: unknown;
    metricsSource?: unknown;
    metricsFreshness?: unknown;
};

export type CreatorDropMetricsResolution = {
    views: CreatorDropMetricValue;
    clicks: CreatorDropMetricValue;
    unwraps: CreatorDropMetricValue;
    uniqueViewers: CreatorDropMetricValue;
    source: CreatorDropMetricSource;
    freshness: string;
    sourceTruth: "creator_drop_metrics_available" | "creator_drop_metrics_unavailable";
    serialized: {
        views: CreatorDropMetricValue;
        clicks: CreatorDropMetricValue;
        unwraps: CreatorDropMetricValue;
        uniqueViewers: CreatorDropMetricValue;
        source: CreatorDropMetricSource;
        freshness: string;
        sourceTruth: "creator_drop_metrics_available" | "creator_drop_metrics_unavailable";
    };
};

function readFiniteNumber(...values: unknown[]) {
    for (const value of values) {
        const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
        if (Number.isFinite(numeric) && numeric >= 0) {
            return Math.floor(numeric);
        }
    }
    return null;
}

function normalizeSource(source: unknown, hasMetrics: boolean): CreatorDropMetricSource {
    if (source === "event_facts" || source === "materialized_summary" || source === "admin_snapshot") {
        return source;
    }
    return hasMetrics ? "admin_snapshot" : "unavailable";
}

function metric(label: CreatorDropMetricValue["label"], value: number | null, source: CreatorDropMetricSource): CreatorDropMetricValue {
    if (value === null || source === "unavailable") {
        return {
            label,
            value: null,
            displayValue: "Collecting",
            provenZero: false,
        };
    }

    return {
        label,
        value,
        displayValue: value.toLocaleString(),
        provenZero: value === 0,
    };
}

export function resolveCreatorDropMetrics(input: CreatorDropMetricsInput): CreatorDropMetricsResolution {
    const viewValue = readFiniteNumber(input.totalViews, input.views);
    const clickValue = readFiniteNumber(input.totalClicks, input.clicks);
    const unwrapValue = readFiniteNumber(input.totalUnlocks, input.unwraps);
    const uniqueViewerValue = readFiniteNumber(input.uniqueViewers);
    const hasMetrics = [viewValue, clickValue, unwrapValue, uniqueViewerValue].some((value) => value !== null);
    const source = normalizeSource(input.metricsSource, hasMetrics);
    const freshness = typeof input.metricsFreshness === "string" && input.metricsFreshness.trim()
        ? input.metricsFreshness.trim()
        : source === "unavailable"
            ? "unavailable"
            : "snapshot";
    const sourceTruth = source === "unavailable" ? "creator_drop_metrics_unavailable" : "creator_drop_metrics_available";
    const resolution = {
        views: metric("Views", viewValue, source),
        clicks: metric("Clicks", clickValue, source),
        unwraps: metric("Unwraps", unwrapValue, source),
        uniqueViewers: metric("Unique viewers", uniqueViewerValue, source),
        source,
        freshness,
        sourceTruth,
    } satisfies Omit<CreatorDropMetricsResolution, "serialized">;

    return {
        ...resolution,
        serialized: resolution,
    };
}
