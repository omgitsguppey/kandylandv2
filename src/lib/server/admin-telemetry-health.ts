import type { BigQueryExportEvidenceState } from "@/lib/analytics/bigquery-export-contract";
import type { ExternalAnalyticsTruthState } from "@/lib/analytics/external-analytics-truth";

export const TELEMETRY_ADMIN_HEALTH_MODEL_VERSION = "telemetry_admin_debug_truth_v1";

export const TELEMETRY_ADMIN_HEALTH_LANE_IDS = [
  "client_tracking",
  "ingest",
  "guest_sessions",
  "identity_links",
  "user_events",
  "behavior_signals",
  "watch_time",
  "materializers",
  "bigquery_export",
  "ga4_external_evidence",
  "admin_snapshots",
] as const;

export type AdminTelemetryHealthLaneId = (typeof TELEMETRY_ADMIN_HEALTH_LANE_IDS)[number];

export type AdminTelemetryHealthStatus =
  | "live"
  | "degraded"
  | "unavailable"
  | "disabled"
  | "config_missing"
  | "source_ready"
  | "runtime_unproven";

export type AdminTelemetryCostRisk = "low" | "medium" | "high";

export type AdminTelemetryHealthLane = {
  id: AdminTelemetryHealthLaneId;
  label: string;
  status: AdminTelemetryHealthStatus;
  lastKnownEvidence: string;
  freshness: string;
  nextAction: string;
  costRisk: AdminTelemetryCostRisk;
  sourceTruth: string;
  rawDetailsDrilldownOnly: true;
};

export type AdminTelemetryHealthModel = {
  generatedAtUtc: string;
  modelVersion: typeof TELEMETRY_ADMIN_HEALTH_MODEL_VERSION;
  summary: {
    live: number;
    degraded: number;
    unavailable: number;
    configMissing: number;
    runtimeUnproven: number;
    sourceReady: number;
    highestCostRisk: AdminTelemetryCostRisk;
  };
  lanes: AdminTelemetryHealthLane[];
  rawDetailsDefault: false;
  rawDetailsDrilldown: string;
  defaultAdminLoadPolicy: "compact_summary_only";
  noZeroFromUnavailable: true;
};

export type AdminTelemetryHealthInput = {
  nowMs?: number;
  routeRuntimeHealth?: Array<Record<string, unknown>>;
  runtimeWarnings?: Array<Record<string, unknown>>;
  adminMetricSnapshots?: Array<Record<string, unknown>>;
  behavioralSnapshotStatus?: Record<string, unknown> | null;
  externalAnalyticsState?: Partial<ExternalAnalyticsTruthState>;
  bigQueryEvidenceState?: Partial<BigQueryExportEvidenceState>;
};

export type AdminTelemetryHealthValidation = {
  ok: boolean;
  findings: string[];
};

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toTimestampMs(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return toNumber(value.toMillis());
  }
  return 0;
}

function freshnessLabel(nowMs: number, timestampMs: number) {
  if (!timestampMs) return "no runtime sample";
  const ageMinutes = Math.max(0, Math.round((nowMs - timestampMs) / 60_000));
  if (ageMinutes < 1) return "just now";
  if (ageMinutes < 60) return `${ageMinutes}m old`;
  const ageHours = Math.round(ageMinutes / 60);
  if (ageHours < 48) return `${ageHours}h old`;
  return `${Math.round(ageHours / 24)}d old`;
}

function latestTimestamp(rows: Array<Record<string, unknown>>, keys: string[]) {
  return rows.reduce((latest, row) => {
    const rowLatest = keys.reduce((max, key) => Math.max(max, toTimestampMs(row[key])), 0);
    return Math.max(latest, rowLatest);
  }, 0);
}

function statusRank(status: AdminTelemetryHealthStatus) {
  const rank: Record<AdminTelemetryHealthStatus, number> = {
    live: 0,
    source_ready: 1,
    disabled: 1,
    runtime_unproven: 2,
    degraded: 3,
    config_missing: 4,
    unavailable: 5,
  };
  return rank[status];
}

function countStatus(lanes: AdminTelemetryHealthLane[], status: AdminTelemetryHealthStatus) {
  return lanes.filter((lane) => lane.status === status).length;
}

function highestCostRisk(lanes: AdminTelemetryHealthLane[]): AdminTelemetryCostRisk {
  if (lanes.some((lane) => lane.costRisk === "high")) return "high";
  if (lanes.some((lane) => lane.costRisk === "medium")) return "medium";
  return "low";
}

function lane(input: Omit<AdminTelemetryHealthLane, "rawDetailsDrilldownOnly">): AdminTelemetryHealthLane {
  return {
    ...input,
    rawDetailsDrilldownOnly: true,
  };
}

function statusFromSnapshots(snapshots: Array<Record<string, unknown>>) {
  if (snapshots.length === 0) return "unavailable" as const;
  if (snapshots.some((snapshot) => ["failed", "unavailable"].includes(toString(snapshot.truthState)))) return "degraded" as const;
  if (snapshots.some((snapshot) => ["stale", "partial", "refreshing"].includes(toString(snapshot.truthState)))) return "degraded" as const;
  return "live" as const;
}

export function buildAdminTelemetryHealth(input: AdminTelemetryHealthInput = {}): AdminTelemetryHealthModel {
  const nowMs = input.nowMs ?? Date.now();
  const routeRuntimeHealth = input.routeRuntimeHealth ?? [];
  const runtimeWarnings = input.runtimeWarnings ?? [];
  const adminMetricSnapshots = input.adminMetricSnapshots ?? [];
  const externalAnalyticsState = input.externalAnalyticsState ?? {};
  const bigQueryEvidenceState = input.bigQueryEvidenceState ?? {};
  const latestRouteAt = latestTimestamp(routeRuntimeHealth, ["updatedAtMs", "lastSeenAtMs", "lastCheckedAtMs"]);
  const latestWarningAt = latestTimestamp(runtimeWarnings, ["updatedAt", "updatedAtMs", "createdAtMs"]);
  const latestSnapshotAt = latestTimestamp(adminMetricSnapshots, ["generatedAt", "lastVerifiedAt", "updatedAt"]);
  const runtimeFailures = routeRuntimeHealth.filter((entry) => ["failed", "fail"].includes(toString(entry.status))).length;
  const runtimeDegraded = runtimeWarnings.filter((entry) => ["failed", "degraded", "fallback"].includes(toString(entry.status))).length;
  const snapshotStatus = statusFromSnapshots(adminMetricSnapshots);
  const ga4Statuses = Array.isArray(externalAnalyticsState.ga4Statuses) ? externalAnalyticsState.ga4Statuses : [];
  const posthogStatuses = Array.isArray(externalAnalyticsState.posthogStatuses) ? externalAnalyticsState.posthogStatuses : [];
  const ga4ConfigMissing = ga4Statuses.includes("ga4_config_missing") || ga4Statuses.includes("ga4_code_missing");
  const ga4Unavailable = ga4ConfigMissing || ga4Statuses.includes("ga4_intentionally_disabled") || ga4Statuses.includes("external_disabled");
  const bigQueryStatus = toString(bigQueryEvidenceState.status);
  const bigQueryConfigMissing = bigQueryStatus === "config_missing" || bigQueryStatus === "";
  const watchSnapshot = adminMetricSnapshots.find((snapshot) => toString(snapshot.moduleKey).includes("watch"));

  const lanes: AdminTelemetryHealthLane[] = [
    lane({
      id: "client_tracking",
      label: "Client tracking",
      status: "source_ready",
      lastKnownEvidence: "DeepTracker and tracking policy are source-ready; runtime writes are verified through ingest lanes.",
      freshness: freshnessLabel(nowMs, latestRouteAt),
      nextAction: "Use ingest, session, and event-fact lanes to confirm persisted runtime evidence.",
      costRisk: "low",
      sourceTruth: "client tracking policy, DeepTracker, telemetry dependency graph",
    }),
    lane({
      id: "ingest",
      label: "Ingest",
      status: runtimeFailures > 0 ? "degraded" : routeRuntimeHealth.length > 0 ? "live" : "runtime_unproven",
      lastKnownEvidence: routeRuntimeHealth.length > 0 ? `${routeRuntimeHealth.length} route runtime sample(s)` : "No route runtime sample loaded in compact summary.",
      freshness: freshnessLabel(nowMs, latestRouteAt),
      nextAction: routeRuntimeHealth.length > 0 ? "Review failed route samples only if this lane degrades." : "Open the route runtime drilldown or wait for runtime samples before treating ingest as proven.",
      costRisk: "medium",
      sourceTruth: "/api/analytics/ingest and /api/analytics/ingest-identified route runtime health",
    }),
    lane({
      id: "guest_sessions",
      label: "Guest sessions",
      status: "source_ready",
      lastKnownEvidence: "Guest batches and analytics sessions are mapped as persisted telemetry lanes.",
      freshness: freshnessLabel(nowMs, latestSnapshotAt),
      nextAction: "Confirm guest batch freshness through admin snapshots or the explicit analytics drilldown.",
      costRisk: "medium",
      sourceTruth: "analytics_guest_batches, analytics_sessions, telemetry dependency graph",
    }),
    lane({
      id: "identity_links",
      label: "Identity links",
      status: "source_ready",
      lastKnownEvidence: "Identity link route and closure artifact define bounded link-first transfer.",
      freshness: freshnessLabel(nowMs, latestSnapshotAt),
      nextAction: "Use identity transfer evidence when validating guest-to-user continuity.",
      costRisk: "low",
      sourceTruth: "analytics_identity_links, identity transfer closure",
    }),
    lane({
      id: "user_events",
      label: "User events",
      status: snapshotStatus === "live" ? "live" : adminMetricSnapshots.length > 0 ? "degraded" : "runtime_unproven",
      lastKnownEvidence: adminMetricSnapshots.length > 0 ? `${adminMetricSnapshots.length} admin metric snapshot(s)` : "No verified admin metric snapshot loaded.",
      freshness: freshnessLabel(nowMs, latestSnapshotAt),
      nextAction: adminMetricSnapshots.length > 0 ? "Keep compact admin analytics on verified snapshots." : "Refresh admin analytics snapshots before reading user-event health.",
      costRisk: "medium",
      sourceTruth: "analytics_event_facts and analytics_admin_metric_snapshots",
    }),
    lane({
      id: "behavior_signals",
      label: "Behavior signals",
      status: input.behavioralSnapshotStatus ? "live" : "source_ready",
      lastKnownEvidence: input.behavioralSnapshotStatus ? "Behavioral snapshot metadata loaded." : "Behavior map is source-ready; runtime signal evidence stays in drilldown.",
      freshness: freshnessLabel(nowMs, latestSnapshotAt),
      nextAction: "Keep behavior scoring tied to event facts and avoid synthesizing scores from UI state.",
      costRisk: "medium",
      sourceTruth: "behavioral_timeline_facts, behavioral tracking semantics, materialization contract",
    }),
    lane({
      id: "watch_time",
      label: "Watch time",
      status: watchSnapshot ? "source_ready" : "runtime_unproven",
      lastKnownEvidence: watchSnapshot ? "Watch-time snapshot metadata exists; deployed proof still needs session evidence." : "Watch-time route is source-ready but deployed session proof is not loaded in compact summary.",
      freshness: freshnessLabel(nowMs, watchSnapshot ? latestSnapshotAt : 0),
      nextAction: "Attach or verify deployed runtime watch-session evidence before treating watch time as proven.",
      costRisk: "medium",
      sourceTruth: "analytics watch sessions and runtime watch-session rollups; page duration is not watch time",
    }),
    lane({
      id: "materializers",
      label: "Materializers",
      status: runtimeDegraded > 0 ? "degraded" : adminMetricSnapshots.length > 0 ? "live" : "runtime_unproven",
      lastKnownEvidence: runtimeDegraded > 0 ? `${runtimeDegraded} runtime warning(s) need review` : adminMetricSnapshots.length > 0 ? `${adminMetricSnapshots.length} snapshot metadata item(s)` : "No materializer runtime sample loaded.",
      freshness: freshnessLabel(nowMs, Math.max(latestWarningAt, latestSnapshotAt)),
      nextAction: runtimeDegraded > 0 ? "Open materializer/runtime warning drilldown for failing writers." : "Use snapshot metadata before raw collections.",
      costRisk: "medium",
      sourceTruth: "admin analytics materializers and analytics_admin_metric_snapshots",
    }),
    lane({
      id: "bigquery_export",
      label: "BigQuery export",
      status: bigQueryConfigMissing ? "config_missing" : bigQueryStatus === "disabled" ? "disabled" : "source_ready",
      lastKnownEvidence: bigQueryConfigMissing ? "BigQuery export config missing; unavailable, not zero traffic." : `BigQuery export ${bigQueryStatus || "source-ready"} evidence only.`,
      freshness: "external evidence lane",
      nextAction: bigQueryConfigMissing ? "Configure export only in an owner-approved cloud pipeline pass." : "Keep exports batched and evidence-only; do not query BigQuery from default admin load.",
      costRisk: "high",
      sourceTruth: "BigQuery export contract and analytics_export_status watermark",
    }),
    lane({
      id: "ga4_external_evidence",
      label: "GA4 / external evidence",
      status: ga4ConfigMissing ? "config_missing" : ga4Unavailable ? "unavailable" : "source_ready",
      lastKnownEvidence: ga4ConfigMissing ? "GA4 evidence unavailable/config missing; not zero traffic." : `GA4 statuses: ${ga4Statuses.join(", ") || "evidence source-ready"}; PostHog: ${posthogStatuses.join(", ") || "unavailable"}.`,
      freshness: "external evidence lane",
      nextAction: "Keep external analytics separate from first-party event facts and require explicit refresh for vendor evidence.",
      costRisk: "high",
      sourceTruth: "external analytics truth closure and GA4 recovery truth",
    }),
    lane({
      id: "admin_snapshots",
      label: "Admin snapshots",
      status: snapshotStatus,
      lastKnownEvidence: adminMetricSnapshots.length > 0 ? `${adminMetricSnapshots.length} compact admin snapshot metadata item(s)` : "No verified admin snapshot metadata loaded.",
      freshness: freshnessLabel(nowMs, latestSnapshotAt),
      nextAction: adminMetricSnapshots.length > 0 ? "Use compact snapshot summaries by default; raw collections stay drilldown-only." : "Run the admin analytics refresh lane before treating this as current.",
      costRisk: "low",
      sourceTruth: "analytics_admin_metric_snapshots and Admin Debug compact summary",
    }),
  ];

  return {
    generatedAtUtc: new Date(nowMs).toISOString(),
    modelVersion: TELEMETRY_ADMIN_HEALTH_MODEL_VERSION,
    summary: {
      live: countStatus(lanes, "live"),
      degraded: countStatus(lanes, "degraded"),
      unavailable: countStatus(lanes, "unavailable"),
      configMissing: countStatus(lanes, "config_missing"),
      runtimeUnproven: countStatus(lanes, "runtime_unproven"),
      sourceReady: countStatus(lanes, "source_ready"),
      highestCostRisk: highestCostRisk(lanes),
    },
    lanes: lanes.sort((left, right) => TELEMETRY_ADMIN_HEALTH_LANE_IDS.indexOf(left.id) - TELEMETRY_ADMIN_HEALTH_LANE_IDS.indexOf(right.id)),
    rawDetailsDefault: false,
    rawDetailsDrilldown: "Admin Debug Advanced telemetry and analytics drilldowns",
    defaultAdminLoadPolicy: "compact_summary_only",
    noZeroFromUnavailable: true,
  };
}

export function validateAdminTelemetryHealth(model: AdminTelemetryHealthModel): AdminTelemetryHealthValidation {
  const findings: string[] = [];
  const laneIds = model.lanes.map((lane) => lane.id);

  for (const requiredId of TELEMETRY_ADMIN_HEALTH_LANE_IDS) {
    if (!laneIds.includes(requiredId)) {
      findings.push(`Missing telemetry health lane: ${requiredId}`);
    }
  }

  for (const laneEntry of model.lanes) {
    if (!laneEntry.nextAction.trim()) {
      findings.push(`${laneEntry.id} lacks a next action.`);
    }
    if (!laneEntry.sourceTruth.trim()) {
      findings.push(`${laneEntry.id} lacks source truth.`);
    }
    if (laneEntry.status === "live" && /unknown|unavailable|config missing/iu.test(laneEntry.lastKnownEvidence)) {
      findings.push(`${laneEntry.id} marks unknown or unavailable evidence as live.`);
    }
    if ((laneEntry.id === "ga4_external_evidence" || laneEntry.id === "bigquery_export")
      && /(?<!not )zero traffic|0 traffic|0 visitors|exported/iu.test(laneEntry.lastKnownEvidence)
      && laneEntry.status !== "live") {
      findings.push(`${laneEntry.id} can misread missing external evidence as zero/exported.`);
    }
  }

  if (model.rawDetailsDefault !== false || model.defaultAdminLoadPolicy !== "compact_summary_only") {
    findings.push("Default admin telemetry load is not compact-summary only.");
  }
  if (!model.noZeroFromUnavailable) {
    findings.push("Unavailable telemetry can be shown as zero.");
  }

  return {
    ok: findings.length === 0,
    findings,
  };
}
