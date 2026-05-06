export type PrivacyConsoleRange = "1h" | "24h" | "7d" | "30d";

export type PrivacyConsoleOverallState = "live" | "review" | "error" | "quiet" | "unknown";

export type PrivacyPreflightCheckId =
    | "event_pipeline"
    | "deduplication"
    | "consent_gating"
    | "guest_tracking"
    | "cloud_run_ingest"
    | "bigquery_export";

export type PrivacyPreflightCheckState = "pass" | "review" | "error" | "quiet" | "not_configured" | "unknown";
export type PrivacyPreflightCheckSeverity = "info" | "warn" | "error" | "critical";
export type PrivacyPreflightEvidenceState = "observed" | "not_observed" | "stale" | "failed" | "missing";

export type PrivacyPreflightCheck = {
    id: PrivacyPreflightCheckId;
    label: string;
    state: PrivacyPreflightCheckState;
    severity: PrivacyPreflightCheckSeverity;
    evidenceState: PrivacyPreflightEvidenceState;
    source: string;
    sampleCount: number | null;
    lastSeenAtUtc: string | null;
    reasonCode: string;
    explanation: string;
    nextAction: string;
};

export type PrivacyConsoleState = {
    generatedAtUtc: string;
    range: PrivacyConsoleRange;
    overallState: PrivacyConsoleOverallState;
    checks: PrivacyPreflightCheck[];
};

export const PRIVACY_CONSOLE_RANGE_MS: Record<PrivacyConsoleRange, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
};

type RouteRuntimeSignal = {
    status: "healthy" | "healthy_with_history" | "latency_review" | "client_error_review" | "server_error" | "unseen" | "quiet" | "stale";
    hasSample: boolean;
    lastSeenAtUtc: string | null;
};

type PrivacyConsoleEvidenceInput = {
    generatedAtUtc: string;
    range: PrivacyConsoleRange;
    eventPipeline: {
        sampleCount: number;
        lastSeenAtUtc: string | null;
        latestSource: string | null;
        guestBatchCount: number;
        identifiedEventCount: number;
        ingestRoute: RouteRuntimeSignal | null;
        identifiedIngestRoute: RouteRuntimeSignal | null;
    };
    deduplication: {
        checkedEvents: number;
        withKeyCount: number;
        missingKeyCount: number;
        duplicateSuppressionCount: number | null;
        lastSeenAtUtc: string | null;
    };
    consentGating: {
        allowedCount: number;
        deniedCount: number;
        unknownConsentCount: number;
        blockedDueToConsentCount: number;
        trackedDeniedConsentViolationCount: number;
        lastSeenAtUtc: string | null;
        consentRoute: RouteRuntimeSignal | null;
    };
    guestTracking: {
        guestEventCount: number;
        anonymousIdPresentCount: number;
        missingAnonymousIdCount: number;
        lastGuestEventAtUtc: string | null;
    };
    cloudRunIngest: {
        serverOriginSampleCount: number;
        clientOriginSampleCount: number;
        lastIngestAtUtc: string | null;
        ingestRoute: RouteRuntimeSignal | null;
        identifiedIngestRoute: RouteRuntimeSignal | null;
    };
    bigqueryExport: {
        configured: boolean;
        listenerFailed: boolean;
        lastHeartbeatAtUtc: string | null;
        lastSuccessfulExportAtUtc: string | null;
        failureCount: number;
        failureReason: string | null;
        affectedRange: string | null;
    };
};

function buildCheck(input: PrivacyPreflightCheck): PrivacyPreflightCheck {
    return input;
}

function hasActiveRouteFailure(signal: RouteRuntimeSignal | null) {
    return signal?.status === "server_error";
}

function hasObservedRoute(signal: RouteRuntimeSignal | null) {
    return signal?.hasSample === true && signal.status !== "unseen";
}

function newestTimestamp(...values: Array<string | null>) {
    const timestamps = values
        .filter((value): value is string => Boolean(value))
        .map((value) => Date.parse(value))
        .filter((value) => Number.isFinite(value));
    if (timestamps.length === 0) {
        return null;
    }
    return new Date(Math.max(...timestamps)).toISOString();
}

function buildEventPipelineCheck(input: PrivacyConsoleEvidenceInput): PrivacyPreflightCheck {
    const { eventPipeline } = input;
    const ingestFailure = hasActiveRouteFailure(eventPipeline.ingestRoute) || hasActiveRouteFailure(eventPipeline.identifiedIngestRoute);
    const observedRoutes = hasObservedRoute(eventPipeline.ingestRoute) || hasObservedRoute(eventPipeline.identifiedIngestRoute);
    if (ingestFailure) {
        return buildCheck({
            id: "event_pipeline",
            label: "Event pipeline",
            state: "error",
            severity: "error",
            evidenceState: "failed",
            source: "analytics_guest_batches + analytics_event_facts + route_runtime_health",
            sampleCount: eventPipeline.sampleCount,
            lastSeenAtUtc: newestTimestamp(eventPipeline.lastSeenAtUtc, eventPipeline.ingestRoute?.lastSeenAtUtc ?? null, eventPipeline.identifiedIngestRoute?.lastSeenAtUtc ?? null),
            reasonCode: "ingest_route_failed",
            explanation: "Analytics ingest route runtime is failing. Event arrivals cannot be treated as trustworthy until the failing ingest route is repaired.",
            nextAction: "Inspect analytics/ingest and analytics/ingest-identified route runtime failures.",
        });
    }
    if (eventPipeline.sampleCount === 0 && !observedRoutes) {
        return buildCheck({
            id: "event_pipeline",
            label: "Event pipeline",
            state: "quiet",
            severity: "info",
            evidenceState: "not_observed",
            source: "analytics_guest_batches + analytics_event_facts + route_runtime_health",
            sampleCount: 0,
            lastSeenAtUtc: null,
            reasonCode: "no_live_traffic_observed",
            explanation: "No event arrivals were observed in this window, and no ingest route sample indicates live traffic for the selected range.",
            nextAction: "Drive a guest or signed-in telemetry surface if this window is expected to contain traffic.",
        });
    }
    if (eventPipeline.sampleCount === 0) {
        return buildCheck({
            id: "event_pipeline",
            label: "Event pipeline",
            state: "review",
            severity: "warn",
            evidenceState: "stale",
            source: "analytics_guest_batches + analytics_event_facts + route_runtime_health",
            sampleCount: 0,
            lastSeenAtUtc: newestTimestamp(eventPipeline.ingestRoute?.lastSeenAtUtc ?? null, eventPipeline.identifiedIngestRoute?.lastSeenAtUtc ?? null),
            reasonCode: "no_recent_event_arrivals",
            explanation: "No event arrivals were observed in this window even though ingest routes have prior runtime evidence. This may be quiet traffic or stale analytics evidence.",
            nextAction: "Compare the selected range against current traffic expectations before treating the pipeline as broken.",
        });
    }
    return buildCheck({
        id: "event_pipeline",
        label: "Event pipeline",
        state: "pass",
        severity: "info",
        evidenceState: "observed",
        source: "analytics_guest_batches + analytics_event_facts",
        sampleCount: eventPipeline.sampleCount,
        lastSeenAtUtc: eventPipeline.lastSeenAtUtc,
        reasonCode: "recent_event_arrivals_observed",
        explanation: `Observed ${eventPipeline.sampleCount} sampled event arrivals in this window. Latest source: ${eventPipeline.latestSource ?? "unknown"}.`,
        nextAction: "No action required.",
    });
}

function buildDeduplicationCheck(input: PrivacyConsoleEvidenceInput): PrivacyPreflightCheck {
    const { deduplication } = input;
    if (deduplication.checkedEvents === 0) {
        return buildCheck({
            id: "deduplication",
            label: "Deduplication",
            state: "unknown",
            severity: "warn",
            evidenceState: "not_observed",
            source: "analytics_guest_batches + analytics_event_facts",
            sampleCount: 0,
            lastSeenAtUtc: null,
            reasonCode: "no_event_samples",
            explanation: "No sampled event arrived in this window, so canonical dedupe keys could not be proven from live evidence.",
            nextAction: "Drive telemetry traffic before treating dedupe coverage as a failure.",
        });
    }
    if (deduplication.withKeyCount === 0) {
        return buildCheck({
            id: "deduplication",
            label: "Deduplication",
            state: "error",
            severity: "error",
            evidenceState: "observed",
            source: "analytics_guest_batches + analytics_event_facts",
            sampleCount: deduplication.checkedEvents,
            lastSeenAtUtc: deduplication.lastSeenAtUtc,
            reasonCode: "canonical_key_missing",
            explanation: `Checked ${deduplication.checkedEvents} sampled events and none exposed a canonical dedupe key such as eventId, idempotencyKey, or batchId.`,
            nextAction: "Add canonical dedupe keys to the affected telemetry payloads before trusting uniqueness guarantees.",
        });
    }
    if (deduplication.missingKeyCount > 0) {
        return buildCheck({
            id: "deduplication",
            label: "Deduplication",
            state: "review",
            severity: "warn",
            evidenceState: "observed",
            source: "analytics_guest_batches + analytics_event_facts",
            sampleCount: deduplication.checkedEvents,
            lastSeenAtUtc: deduplication.lastSeenAtUtc,
            reasonCode: "partial_key_coverage",
            explanation: `${deduplication.withKeyCount} of ${deduplication.checkedEvents} sampled events carried a canonical dedupe key. ${deduplication.missingKeyCount} samples still lack one.`,
            nextAction: "Close the missing dedupe-key gap before treating the lane as fully canonical.",
        });
    }
    return buildCheck({
        id: "deduplication",
        label: "Deduplication",
        state: "pass",
        severity: "info",
        evidenceState: "observed",
        source: "analytics_guest_batches + analytics_event_facts",
        sampleCount: deduplication.checkedEvents,
        lastSeenAtUtc: deduplication.lastSeenAtUtc,
        reasonCode: "canonical_key_present",
        explanation: `Canonical dedupe keys were present on all ${deduplication.checkedEvents} sampled events.`,
        nextAction: "No action required.",
    });
}

function buildConsentGatingCheck(input: PrivacyConsoleEvidenceInput): PrivacyPreflightCheck {
    const { consentGating } = input;
    if (consentGating.trackedDeniedConsentViolationCount > 0) {
        return buildCheck({
            id: "consent_gating",
            label: "Consent gating",
            state: "error",
            severity: "critical",
            evidenceState: "observed",
            source: "analytics_guest_batches + analytics_event_facts + privacy/consent",
            sampleCount: consentGating.allowedCount + consentGating.deniedCount + consentGating.unknownConsentCount,
            lastSeenAtUtc: consentGating.lastSeenAtUtc,
            reasonCode: "denied_consent_tracked",
            explanation: `${consentGating.trackedDeniedConsentViolationCount} sampled analytics records show denied-consent traffic that still reached behavioral/event storage.`,
            nextAction: "Stop denied-consent analytics writes and inspect the consent gate before trusting privacy enforcement.",
        });
    }
    if (consentGating.unknownConsentCount > 0) {
        return buildCheck({
            id: "consent_gating",
            label: "Consent gating",
            state: "review",
            severity: "warn",
            evidenceState: "observed",
            source: "analytics_guest_batches + analytics_event_facts + privacy/consent",
            sampleCount: consentGating.allowedCount + consentGating.deniedCount + consentGating.unknownConsentCount,
            lastSeenAtUtc: consentGating.lastSeenAtUtc,
            reasonCode: "consent_state_missing",
            explanation: `${consentGating.unknownConsentCount} sampled analytics records are missing consent-state evidence, so enforcement cannot be fully proven.`,
            nextAction: "Ensure analytics payloads continue to stamp consent mode or route-level consent state.",
        });
    }
    if (consentGating.deniedCount === 0) {
        return buildCheck({
            id: "consent_gating",
            label: "Consent gating",
            state: "pass",
            severity: "info",
            evidenceState: consentGating.allowedCount > 0 ? "observed" : "not_observed",
            source: "analytics_guest_batches + analytics_event_facts + privacy/consent",
            sampleCount: consentGating.allowedCount + consentGating.deniedCount + consentGating.unknownConsentCount,
            lastSeenAtUtc: consentGating.lastSeenAtUtc ?? consentGating.consentRoute?.lastSeenAtUtc ?? null,
            reasonCode: "no_denied_samples_in_window",
            explanation: "No denied-consent samples were observed in this window. Enforcement is not failing; it simply was not exercised by a denied live sample.",
            nextAction: "Use synthetic consent tests if you need explicit denied-path evidence.",
        });
    }
    return buildCheck({
        id: "consent_gating",
        label: "Consent gating",
        state: "pass",
        severity: "info",
        evidenceState: "observed",
        source: "analytics_guest_batches + analytics_event_facts + privacy/consent",
        sampleCount: consentGating.allowedCount + consentGating.deniedCount + consentGating.unknownConsentCount,
        lastSeenAtUtc: consentGating.lastSeenAtUtc,
        reasonCode: "consent_enforcement_observed",
        explanation: `Allowed ${consentGating.allowedCount}, denied ${consentGating.deniedCount}, blocked due to consent ${consentGating.blockedDueToConsentCount}. No denied-consent analytics violation was observed.`,
        nextAction: "No action required.",
    });
}

function buildGuestTrackingCheck(input: PrivacyConsoleEvidenceInput): PrivacyPreflightCheck {
    const { guestTracking } = input;
    if (guestTracking.guestEventCount === 0) {
        return buildCheck({
            id: "guest_tracking",
            label: "Guest tracking",
            state: "quiet",
            severity: "info",
            evidenceState: "not_observed",
            source: "analytics_guest_batches",
            sampleCount: 0,
            lastSeenAtUtc: null,
            reasonCode: "no_guest_events_observed",
            explanation: "No guest telemetry events were observed in this window, so anonymous identity requirements were not exercised.",
            nextAction: "Drive a guest-only telemetry surface if this lane needs fresh evidence.",
        });
    }
    if (guestTracking.missingAnonymousIdCount > 0) {
        return buildCheck({
            id: "guest_tracking",
            label: "Guest tracking",
            state: "error",
            severity: "error",
            evidenceState: "observed",
            source: "analytics_guest_batches",
            sampleCount: guestTracking.guestEventCount,
            lastSeenAtUtc: guestTracking.lastGuestEventAtUtc,
            reasonCode: "guest_identifier_missing",
            explanation: `${guestTracking.missingAnonymousIdCount} guest telemetry samples are missing anonymous visitor or session identity.`,
            nextAction: "Restore anonymous visitor/session identifiers on guest telemetry writes.",
        });
    }
    return buildCheck({
        id: "guest_tracking",
        label: "Guest tracking",
        state: "pass",
        severity: "info",
        evidenceState: "observed",
        source: "analytics_guest_batches",
        sampleCount: guestTracking.guestEventCount,
        lastSeenAtUtc: guestTracking.lastGuestEventAtUtc,
        reasonCode: "guest_identifier_present",
        explanation: `Anonymous visitor identity is present on all ${guestTracking.guestEventCount} sampled guest telemetry records.`,
        nextAction: "No action required.",
    });
}

function buildCloudRunIngestCheck(input: PrivacyConsoleEvidenceInput): PrivacyPreflightCheck {
    const { cloudRunIngest } = input;
    const ingestFailure = hasActiveRouteFailure(cloudRunIngest.ingestRoute) || hasActiveRouteFailure(cloudRunIngest.identifiedIngestRoute);
    if (ingestFailure) {
        return buildCheck({
            id: "cloud_run_ingest",
            label: "Cloud Run ingest",
            state: "error",
            severity: "error",
            evidenceState: "failed",
            source: "route_runtime_health + analytics_event_facts + analytics_guest_batches",
            sampleCount: cloudRunIngest.serverOriginSampleCount + cloudRunIngest.clientOriginSampleCount,
            lastSeenAtUtc: newestTimestamp(cloudRunIngest.lastIngestAtUtc, cloudRunIngest.ingestRoute?.lastSeenAtUtc ?? null, cloudRunIngest.identifiedIngestRoute?.lastSeenAtUtc ?? null),
            reasonCode: "ingest_runtime_failed",
            explanation: "The analytics ingest runtime is failing. Missing backend-origin samples may be caused by the route failure, not by quiet traffic alone.",
            nextAction: "Inspect analytics ingest runtime health before treating origin evidence as canonical.",
        });
    }
    if (cloudRunIngest.serverOriginSampleCount === 0 && cloudRunIngest.clientOriginSampleCount === 0) {
        return buildCheck({
            id: "cloud_run_ingest",
            label: "Cloud Run ingest",
            state: "unknown",
            severity: "warn",
            evidenceState: "not_observed",
            source: "route_runtime_health + analytics_event_facts + analytics_guest_batches",
            sampleCount: 0,
            lastSeenAtUtc: newestTimestamp(cloudRunIngest.ingestRoute?.lastSeenAtUtc ?? null, cloudRunIngest.identifiedIngestRoute?.lastSeenAtUtc ?? null),
            reasonCode: "no_ingest_samples_observed",
            explanation: "No client-origin or backend-origin ingest samples were observed in this window.",
            nextAction: "Drive guest or identified telemetry traffic before treating Cloud Run ingest as broken.",
        });
    }
    if (cloudRunIngest.serverOriginSampleCount === 0) {
        return buildCheck({
            id: "cloud_run_ingest",
            label: "Cloud Run ingest",
            state: "review",
            severity: "warn",
            evidenceState: "observed",
            source: "route_runtime_health + analytics_event_facts + analytics_guest_batches",
            sampleCount: cloudRunIngest.clientOriginSampleCount,
            lastSeenAtUtc: cloudRunIngest.lastIngestAtUtc,
            reasonCode: "no_server_origin_samples",
            explanation: "Client-origin ingest samples were observed, but no sampled backend-origin signature was present in this window.",
            nextAction: "Confirm identified/server-ingested telemetry paths are still flowing if backend-origin evidence is expected.",
        });
    }
    return buildCheck({
        id: "cloud_run_ingest",
        label: "Cloud Run ingest",
        state: "pass",
        severity: "info",
        evidenceState: "observed",
        source: "route_runtime_health + analytics_event_facts + analytics_guest_batches",
        sampleCount: cloudRunIngest.serverOriginSampleCount + cloudRunIngest.clientOriginSampleCount,
        lastSeenAtUtc: cloudRunIngest.lastIngestAtUtc,
        reasonCode: "server_origin_observed",
        explanation: `Observed ${cloudRunIngest.serverOriginSampleCount} backend-origin and ${cloudRunIngest.clientOriginSampleCount} client-origin ingest samples in this window.`,
        nextAction: "No action required.",
    });
}

function buildBigQueryExportCheck(input: PrivacyConsoleEvidenceInput): PrivacyPreflightCheck {
    const { bigqueryExport } = input;
    if (!bigqueryExport.configured && !bigqueryExport.lastHeartbeatAtUtc && !bigqueryExport.lastSuccessfulExportAtUtc) {
        return buildCheck({
            id: "bigquery_export",
            label: "BigQuery export",
            state: "not_configured",
            severity: "warn",
            evidenceState: "missing",
            source: "analytics_export_status",
            sampleCount: null,
            lastSeenAtUtc: null,
            reasonCode: "export_status_missing",
            explanation: "No BigQuery export heartbeat or status document is available in this environment.",
            nextAction: "Add or restore analytics export status heartbeats before treating the cold export stream as observable.",
        });
    }
    if (bigqueryExport.listenerFailed) {
        return buildCheck({
            id: "bigquery_export",
            label: "BigQuery export",
            state: "error",
            severity: "error",
            evidenceState: "failed",
            source: "analytics_export_status",
            sampleCount: bigqueryExport.failureCount,
            lastSeenAtUtc: newestTimestamp(bigqueryExport.lastHeartbeatAtUtc, bigqueryExport.lastSuccessfulExportAtUtc),
            reasonCode: "export_listener_failed",
            explanation: `BigQuery export status shows a listener or pipeline failure${bigqueryExport.failureReason ? `: ${bigqueryExport.failureReason}` : ""}.`,
            nextAction: bigqueryExport.affectedRange
                ? `Inspect the export listener and replay the affected range: ${bigqueryExport.affectedRange}.`
                : "Inspect the export listener and restore a successful export heartbeat.",
        });
    }
    if (!bigqueryExport.lastHeartbeatAtUtc) {
        return buildCheck({
            id: "bigquery_export",
            label: "BigQuery export",
            state: "review",
            severity: "warn",
            evidenceState: "stale",
            source: "analytics_export_status",
            sampleCount: bigqueryExport.failureCount,
            lastSeenAtUtc: bigqueryExport.lastSuccessfulExportAtUtc,
            reasonCode: "export_heartbeat_missing",
            explanation: "BigQuery export has no recent heartbeat in the current environment, so freshness cannot be proven.",
            nextAction: "Check the export scheduler or materializer and restore heartbeat writes.",
        });
    }
    return buildCheck({
        id: "bigquery_export",
        label: "BigQuery export",
        state: "pass",
        severity: "info",
        evidenceState: "observed",
        source: "analytics_export_status",
        sampleCount: bigqueryExport.failureCount,
        lastSeenAtUtc: bigqueryExport.lastHeartbeatAtUtc,
        reasonCode: "export_heartbeat_observed",
        explanation: "BigQuery export status heartbeat is present and no active failure reason is recorded.",
        nextAction: "No action required.",
    });
}

export function buildPrivacyConsoleState(input: PrivacyConsoleEvidenceInput): PrivacyConsoleState {
    const checks = [
        buildEventPipelineCheck(input),
        buildDeduplicationCheck(input),
        buildConsentGatingCheck(input),
        buildGuestTrackingCheck(input),
        buildCloudRunIngestCheck(input),
        buildBigQueryExportCheck(input),
    ];

    const errorCount = checks.filter((check) => check.state === "error").length;
    const reviewCount = checks.filter((check) => check.state === "review" || check.state === "not_configured" || check.state === "unknown").length;
    const passCount = checks.filter((check) => check.state === "pass").length;
    const quietCount = checks.filter((check) => check.state === "quiet").length;

    const overallState: PrivacyConsoleOverallState = errorCount > 0
        ? "error"
        : reviewCount > 0
            ? "review"
            : passCount > 0 && quietCount === checks.length - passCount
                ? "live"
                : quietCount === checks.length
                    ? "quiet"
                    : "unknown";

    return {
        generatedAtUtc: input.generatedAtUtc,
        range: input.range,
        overallState,
        checks,
    };
}
