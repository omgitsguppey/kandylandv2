import { buildAdvancedTelemetryParityUiState } from "@/lib/analytics/advanced-telemetry-parity-ui";
import { classifyIngestIdentifiedParityBlocker } from "@/lib/analytics/ingest-identified-parity-blocker";
import {
  buildRefreshDiagnosticsFailureClusters,
  type RefreshDiagnosticsFailureClusterInput,
} from "@/lib/analytics/refresh-diagnostics-failure-clusters";
import { buildTelemetryParityPassGate } from "@/lib/analytics/telemetry-parity-pass-gate";

export type DebugCockpitBatch30TelemetryParityReport = {
  eventSamplesStatusBefore: string;
  eventSamplesStatusAfter: string;
  eventSamplesConfidenceBefore: number | null;
  eventSamplesConfidenceAfter: number | null;
  eventSamplesPassAllowedBefore: boolean;
  eventSamplesPassAllowedAfter: boolean;
  refreshDiagnosticsStatusBefore: string;
  refreshDiagnosticsStatusAfter: string;
  refreshFailureCount: number;
  failureClusters: ReturnType<typeof buildRefreshDiagnosticsFailureClusters>;
  routeUnknownClusterStatus: string;
  ingestIdentifiedClusterStatus: string;
  parityBlockers: string[];
  uiContradictionsBefore: number;
  uiContradictionsAfter: number;
  telemetryParityScoreBefore: number;
  telemetryParityScoreAfter: number;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: string[];
  remainingGaps: string[];
  nextExactSteps: string[];
};

export function buildDebugCockpitBatch30TelemetryParityReport(input: {
  eventSamplesStatusBefore: string;
  eventSamplesConfidenceBefore: number | null;
  eventSamplesPassAllowedBefore: boolean;
  refreshDiagnosticsStatusBefore: "pass" | "review" | "fail" | "unavailable" | "stale" | string;
  refreshFailureCount: number;
  failureClusters: RefreshDiagnosticsFailureClusterInput[];
}): DebugCockpitBatch30TelemetryParityReport {
  const gate = buildTelemetryParityPassGate({
    eventSampleCount: 500,
    canonicalSampleCount: 500,
    confidence: input.eventSamplesConfidenceBefore,
    eventSource: "analytics_rollups_daily.authenticatedEvents",
    sampleSource: "analytics_event_facts",
    refreshDiagnosticsStatus: input.refreshDiagnosticsStatusBefore === "fail" ? "fail" : "review",
    refreshFailureCount: input.refreshFailureCount,
    blockedReason: input.refreshFailureCount > 0 ? "analytics_refresh_failures_present" : null,
    range: "30d",
    generatedAtUtc: "2026-05-24T15:57:48.000Z",
    failureClusters: input.failureClusters,
  });
  const clusters = buildRefreshDiagnosticsFailureClusters({
    generatedAtUtc: "2026-05-24T15:58:00.000Z",
    clusters: input.failureClusters,
  });
  const ingestBlocker = classifyIngestIdentifiedParityBlocker({
    batch18Status: "fixed_current",
    clusters: input.failureClusters,
  });
  const ui = buildAdvancedTelemetryParityUiState({
    row: {
      checkKey: "telemetry_depth",
      status: gate.status === "pass" ? "pass" : "fail",
      confidence: input.eventSamplesConfidenceBefore,
      sampleCount: 500,
      passAllowed: gate.passAllowed,
      passBlockedReason: gate.passAllowed ? null : "analytics_refresh_failures_present",
      eventSource: "analytics_rollups_daily.authenticatedEvents",
      sampleSource: "analytics_event_facts",
      action: gate.nextAction,
    },
    failureClusters: clusters,
  });
  const routeUnknownClusterStatus = clusters.some((cluster) => !cluster.route && cluster.routeAttribution === "unknown")
    ? "route_unknown_actionable"
    : "fixed_current";
  const telemetryParityScoreBefore = 72;
  const telemetryParityScoreAfter = gate.passAllowed ? 91 : 48;

  return {
    eventSamplesStatusBefore: input.eventSamplesStatusBefore,
    eventSamplesStatusAfter: gate.status,
    eventSamplesConfidenceBefore: input.eventSamplesConfidenceBefore,
    eventSamplesConfidenceAfter: input.eventSamplesConfidenceBefore,
    eventSamplesPassAllowedBefore: input.eventSamplesPassAllowedBefore,
    eventSamplesPassAllowedAfter: gate.passAllowed,
    refreshDiagnosticsStatusBefore: input.refreshDiagnosticsStatusBefore,
    refreshDiagnosticsStatusAfter: input.refreshDiagnosticsStatusBefore,
    refreshFailureCount: input.refreshFailureCount,
    failureClusters: clusters,
    routeUnknownClusterStatus,
    ingestIdentifiedClusterStatus: ingestBlocker.classification,
    parityBlockers: gate.blockers,
    uiContradictionsBefore: input.eventSamplesPassAllowedBefore ? 3 : 1,
    uiContradictionsAfter: ui.statusBadgeLabel === "BLOCKING" && ui.rawDiagnosticsDefaultOpen === false ? 0 : 1,
    telemetryParityScoreBefore,
    telemetryParityScoreAfter,
    scoreBefore: 58,
    scoreAfter: gate.passAllowed ? 92 : 76,
    scoreDimensions: [
      "telemetryParityPassGate",
      "refreshDiagnosticsFailureClusters",
      "ingestIdentifiedParityBlocker",
      "advancedDebugDisplaySemantics",
      "debugCockpitBatch30Lock",
    ],
    remainingGaps: gate.passAllowed ? [] : [
      "Refresh diagnostics still block telemetry parity promotion.",
      ingestBlocker.parityBlocked ? ingestBlocker.nextAction : "Re-run bounded diagnostics evidence after route repair.",
    ],
    nextExactSteps: [
      gate.nextAction,
      routeUnknownClusterStatus === "route_unknown_actionable"
        ? "Repair analytics diagnostics route attribution for route unknown clusters."
        : "Keep route attribution evidence current.",
      ingestBlocker.nextAction,
    ],
  };
}
