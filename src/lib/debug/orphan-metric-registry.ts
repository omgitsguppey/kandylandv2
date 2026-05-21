import {
  TELEMETRY_DEPENDENCY_GRAPH,
  type TelemetryDependencyLane,
  type TelemetryLaneId,
} from "@/lib/analytics/telemetry-dependency-graph";

export type OrphanMetricStatus =
  | "linked"
  | "ui_without_source"
  | "producer_without_consumer"
  | "archived"
  | "source_ready_evidence_gap";

export type MetricFreshnessState = "current" | "stale" | "runtime_unverified" | "evidence_only";

export type DebugPanelHealthClaim = "healthy" | "degraded" | "unavailable" | "not_claimed";

export interface OrphanMetricRegistryItem {
  metricId: string;
  displayLabel: string;
  producer: string;
  persistenceSource: string;
  materializer: string;
  apiRoute: string;
  uiConsumer: string;
  scoreEvidenceConsumer: string;
  freshness: MetricFreshnessState;
  owner: string;
  orphanStatus: OrphanMetricStatus;
  debugPanelHealthClaim: DebugPanelHealthClaim;
  nextAction: string;
  archiveClassification?: string;
  sourceLaneId?: TelemetryLaneId;
}

const METRIC_IDS: Record<TelemetryLaneId, string> = {
  page_view: "page_views",
  session: "sessions",
  guest_event: "guest_events",
  auth_transition: "auth_transitions",
  identity_link: "identity_links",
  purchase: "purchase_events",
  gumdrop_balance: "gumdrop_balance_events",
  creator_experience: "creator_interactions",
  creator_subscription: "fan_pass_subscribers",
  creator_drop_submission: "creator_drop_submissions",
  runtime_watch: "runtime_watch_time",
  behavior_signal: "behavior_signals",
  admin_evidence: "admin_debug_evidence",
  external_ga4_evidence: "external_ga4_evidence",
};

const DISPLAY_LABELS: Record<TelemetryLaneId, string> = {
  page_view: "Page views",
  session: "Sessions",
  guest_event: "Guest events",
  auth_transition: "Auth transitions",
  identity_link: "Identity links",
  purchase: "Purchase events",
  gumdrop_balance: "GumDrop balance events",
  creator_experience: "Creator interactions",
  creator_subscription: "Fan Pass subscribers",
  creator_drop_submission: "Creator drop submissions",
  runtime_watch: "Runtime watch time",
  behavior_signal: "Behavior signals",
  admin_evidence: "Admin debug evidence",
  external_ga4_evidence: "External analytics evidence",
};

const OWNERS: Record<TelemetryLaneId, string> = {
  page_view: "analytics",
  session: "analytics",
  guest_event: "analytics",
  auth_transition: "auth",
  identity_link: "analytics",
  purchase: "commerce",
  gumdrop_balance: "economy",
  creator_experience: "creator",
  creator_subscription: "creator",
  creator_drop_submission: "creator",
  runtime_watch: "viewer-runtime",
  behavior_signal: "behavioral-intelligence",
  admin_evidence: "admin-debug",
  external_ga4_evidence: "analytics-evidence",
};

function freshnessForLane(lane: TelemetryDependencyLane): MetricFreshnessState {
  if (lane.id === "runtime_watch" && lane.sourceReadyButNotTracked) return "runtime_unverified";
  if (lane.evidenceOnly || lane.destinationState === "external_evidence_only") return "evidence_only";
  return "current";
}

function orphanStatusForLane(lane: TelemetryDependencyLane): OrphanMetricStatus {
  if (lane.id === "runtime_watch" && lane.sourceReadyButNotTracked) return "source_ready_evidence_gap";
  if (lane.evidenceOnly || lane.destinationState === "external_evidence_only") return "archived";
  if (!lane.producer || !lane.persistenceDestination) return "ui_without_source";
  if (!lane.adminEvidenceConsumer && !lane.materializerExportDestination) return "producer_without_consumer";
  return "linked";
}

function healthClaimForStatus(status: OrphanMetricStatus): DebugPanelHealthClaim {
  if (status === "linked") return "healthy";
  if (status === "archived") return "not_claimed";
  if (status === "source_ready_evidence_gap") return "degraded";
  return "unavailable";
}

function nextActionForLane(lane: TelemetryDependencyLane, status: OrphanMetricStatus): string {
  if (status === "source_ready_evidence_gap") {
    return "Keep runtime watch-time degraded until persisted watch-session evidence proves the metric in admin/debug output.";
  }
  if (status === "archived") {
    return "Keep external evidence archive-only unless an explicit guarded refresh artifact is produced.";
  }
  if (status === "ui_without_source") {
    return "Add a producer and persistence source marker before rendering this metric in debug/admin UI.";
  }
  if (status === "producer_without_consumer") {
    return "Add a UI/evidence consumer or archive the producer lane with a reason.";
  }
  return `Keep ${lane.label} mapped through producer, persistence, materializer, and admin evidence consumers.`;
}

export function buildOrphanMetricRegistry(lanes: readonly TelemetryDependencyLane[] = TELEMETRY_DEPENDENCY_GRAPH): OrphanMetricRegistryItem[] {
  return lanes.map((lane) => {
    const orphanStatus = orphanStatusForLane(lane);
    return {
      metricId: METRIC_IDS[lane.id],
      displayLabel: DISPLAY_LABELS[lane.id],
      producer: lane.producer,
      persistenceSource: lane.persistenceDestination,
      materializer: lane.materializerExportDestination,
      apiRoute: lane.routeApi,
      uiConsumer: lane.adminEvidenceConsumer,
      scoreEvidenceConsumer: "telemetry dependency graph, public beta score, debug backlog evidence",
      freshness: freshnessForLane(lane),
      owner: OWNERS[lane.id],
      orphanStatus,
      debugPanelHealthClaim: healthClaimForStatus(orphanStatus),
      nextAction: nextActionForLane(lane, orphanStatus),
      archiveClassification: orphanStatus === "archived" ? "external/supporting evidence only; never product truth" : undefined,
      sourceLaneId: lane.id,
    };
  });
}

export function validateOrphanMetricRegistry(items: readonly OrphanMetricRegistryItem[]): string[] {
  const failures: string[] = [];
  const ids = new Set<string>();

  for (const item of items) {
    if (!item.metricId) failures.push("metric item lacks metricId.");
    if (item.metricId && ids.has(item.metricId)) failures.push(`${item.metricId} is duplicated.`);
    ids.add(item.metricId);

    if (!item.displayLabel) failures.push(`${item.metricId} lacks display label.`);
    if (!item.owner) failures.push(`${item.metricId} lacks owner.`);
    if (!item.freshness) failures.push(`${item.metricId} lacks freshness.`);
    if (!item.orphanStatus) failures.push(`${item.metricId} lacks orphan status.`);
    if (!item.nextAction) failures.push(`${item.metricId} lacks next action.`);
    if (!item.scoreEvidenceConsumer) failures.push(`${item.metricId} lacks score/evidence consumer.`);

    if (item.uiConsumer && (!item.producer || !item.persistenceSource)) {
      failures.push(`${item.metricId} lacks producer/source while a UI consumer exists.`);
    }

    const hasConsumer = Boolean(item.uiConsumer || item.scoreEvidenceConsumer);
    const isArchived = item.orphanStatus === "archived" && Boolean(item.archiveClassification);
    if (item.producer && !hasConsumer && !isArchived) {
      failures.push(`${item.metricId} has producer without consumer or archive classification.`);
    }

    if (item.orphanStatus !== "linked" && item.debugPanelHealthClaim === "healthy") {
      failures.push(`${item.metricId} appears healthy in debug output despite orphan status ${item.orphanStatus}.`);
    }

    if (item.orphanStatus === "archived" && !item.archiveClassification) {
      failures.push(`${item.metricId} is archived without archive classification.`);
    }
  }

  return failures;
}
