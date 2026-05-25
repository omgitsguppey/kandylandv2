import {
  buildRefreshDiagnosticsFailureClusters,
  type RefreshDiagnosticsFailureClusterInput,
} from "@/lib/analytics/refresh-diagnostics-failure-clusters";

export type IngestIdentifiedParityBlockerClassification =
  | "repaired_current"
  | "obsolete_route_still_reporting"
  | "active_route_failing"
  | "missing_route_context"
  | "diagnostics_stale"
  | "unknown";

export type IngestIdentifiedParityBlocker = {
  classification: IngestIdentifiedParityBlockerClassification;
  parityBlocked: boolean;
  routeOwner: string;
  nextAction: string;
  doubleCountRisk: "aliasing_must_remain_deduped" | "none";
};

export function classifyIngestIdentifiedParityBlocker(input: {
  batch18Status?: string;
  routeStatus?: "active" | "obsolete" | "missing" | "unknown";
  clusters: RefreshDiagnosticsFailureClusterInput[];
}): IngestIdentifiedParityBlocker {
  const clusters = buildRefreshDiagnosticsFailureClusters({ clusters: input.clusters });
  const ingestClusters = clusters.filter((cluster) => (
    cluster.route === "analytics/ingest-identified"
    || /Analytics\.IngestIdentified/iu.test(`${cluster.errorName} ${cluster.affectedRoute ?? ""}`)
  ));
  const currentIngestFailure = ingestClusters.find((cluster) => cluster.current && /UnknownError|error/iu.test(cluster.errorName));

  if (currentIngestFailure) {
    return {
      classification: "active_route_failing",
      parityBlocked: true,
      routeOwner: "analytics ingest identified",
      nextAction: "Keep telemetry parity blocked while current Analytics.IngestIdentified UnknownError diagnostics remain; inspect the identified ingest route and verify typed non-retryable handling for expected failures.",
      doubleCountRisk: "aliasing_must_remain_deduped",
    };
  }

  if (ingestClusters.some((cluster) => !cluster.route)) {
    return {
      classification: "missing_route_context",
      parityBlocked: true,
      routeOwner: "analytics diagnostics attribution",
      nextAction: "Repair route context for Analytics.IngestIdentified diagnostics before promoting telemetry parity.",
      doubleCountRisk: "aliasing_must_remain_deduped",
    };
  }

  if (input.routeStatus === "obsolete" && ingestClusters.length > 0) {
    return {
      classification: "obsolete_route_still_reporting",
      parityBlocked: true,
      routeOwner: "analytics ingest identified",
      nextAction: "Retire or compatibility-handle the obsolete identified ingest route so it stops reporting retryable failures.",
      doubleCountRisk: "aliasing_must_remain_deduped",
    };
  }

  if (ingestClusters.length > 0) {
    return {
      classification: "diagnostics_stale",
      parityBlocked: true,
      routeOwner: "analytics ingest identified",
      nextAction: "Refresh bounded diagnostics evidence before clearing the identified ingest parity blocker.",
      doubleCountRisk: "aliasing_must_remain_deduped",
    };
  }

  if (input.batch18Status === "fixed_current") {
    return {
      classification: "repaired_current",
      parityBlocked: false,
      routeOwner: "analytics ingest identified",
      nextAction: "No current Analytics.IngestIdentified UnknownError cluster is present; keep alias/dedupe handling in place.",
      doubleCountRisk: "aliasing_must_remain_deduped",
    };
  }

  return {
    classification: "unknown",
    parityBlocked: true,
    routeOwner: "analytics ingest identified",
    nextAction: "Classify identified ingest diagnostics before promoting telemetry parity.",
    doubleCountRisk: "aliasing_must_remain_deduped",
  };
}
