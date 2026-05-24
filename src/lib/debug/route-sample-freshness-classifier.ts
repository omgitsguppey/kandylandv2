export type RouteSampleFreshnessStatus =
    | "current_healthy"
    | "current_warning"
    | "current_client_error"
    | "current_server_error"
    | "stale_success"
    | "stale_client_error"
    | "stale_server_error"
    | "stale_critical_evidence_required"
    | "unseen_required_smoke_needed"
    | "unseen_optional_quiet"
    | "unseen_manual_operator_action"
    | "unseen_legacy_or_deprecated"
    | "source_missing"
    | "unknown";

export type RouteSampleFreshnessInput = {
    routeKey: string;
    method: string;
    risk: "low" | "medium" | "high" | "critical" | string;
    optionality: "required" | "optional" | "manual" | "legacy" | string;
    cluster: string;
    hasSample: boolean;
    lastResult: "success" | "client_error" | "server_error" | "no_sample" | string;
    lastSampleAgeMs: number | null;
    freshnessWindowMs: number;
    sampleRequiredForBeta?: boolean;
    manualSmokeAllowed?: boolean;
};

export type RouteSampleFreshnessRecord = RouteSampleFreshnessInput & {
    status: RouteSampleFreshnessStatus;
    currentResultTrusted: boolean;
    staleReason: string | null;
    nextAction: string;
};

function isStale(input: RouteSampleFreshnessInput) {
    return input.hasSample
        && (input.lastSampleAgeMs === null || input.lastSampleAgeMs >= Math.max(1, input.freshnessWindowMs));
}

function classifyUnseen(input: RouteSampleFreshnessInput): RouteSampleFreshnessStatus {
    if (input.optionality === "manual") return "unseen_manual_operator_action";
    if (input.optionality === "legacy") return "unseen_legacy_or_deprecated";
    if (input.optionality === "optional") return "unseen_optional_quiet";
    return "unseen_required_smoke_needed";
}

function nextActionFor(status: RouteSampleFreshnessStatus, input: RouteSampleFreshnessInput) {
    switch (status) {
        case "stale_critical_evidence_required":
            return `${input.routeKey} needs fresh formal/operator smoke evidence before it can be treated as current.`;
        case "stale_server_error":
            return `${input.routeKey} has stale server-error history; repair or run a fresh safe smoke path before current readiness.`;
        case "stale_client_error":
            return `${input.routeKey} has stale client-error history; map expected errors and refresh evidence.`;
        case "stale_success":
            return `${input.routeKey} needs a fresh runtime sample; stale success is not live health.`;
        case "unseen_required_smoke_needed":
            return `${input.routeKey} has no runtime sample; run an approved smoke path or attach evidence.`;
        case "unseen_optional_quiet":
            return `${input.routeKey} is optional and quiet; keep out of live health until sampled.`;
        case "unseen_manual_operator_action":
            return `${input.routeKey} is manual/operator action only; do not score as live health.`;
        case "unseen_legacy_or_deprecated":
            return `${input.routeKey} is legacy/deprecated visible; keep separate from current health.`;
        default:
            return `${input.routeKey} has current route evidence loaded.`;
    }
}

export function classifyRouteSampleFreshness(
    input: RouteSampleFreshnessInput,
    _options: { nowMs?: number } = {},
): RouteSampleFreshnessRecord {
    const sampleIsStale = isStale(input);
    let status: RouteSampleFreshnessStatus;

    if (!input.hasSample) {
        status = classifyUnseen(input);
    } else if (sampleIsStale && (input.risk === "critical" || input.sampleRequiredForBeta === true)) {
        status = "stale_critical_evidence_required";
    } else if (sampleIsStale && input.lastResult === "server_error") {
        status = "stale_server_error";
    } else if (sampleIsStale && input.lastResult === "client_error") {
        status = "stale_client_error";
    } else if (sampleIsStale) {
        status = "stale_success";
    } else if (input.lastResult === "server_error") {
        status = "current_server_error";
    } else if (input.lastResult === "client_error") {
        status = "current_client_error";
    } else if (input.lastResult === "success") {
        status = "current_healthy";
    } else {
        status = "unknown";
    }

    return {
        ...input,
        status,
        currentResultTrusted: input.hasSample && !sampleIsStale && status !== "unknown",
        staleReason: sampleIsStale ? "sample_outside_freshness_window" : null,
        nextAction: nextActionFor(status, input),
    };
}
