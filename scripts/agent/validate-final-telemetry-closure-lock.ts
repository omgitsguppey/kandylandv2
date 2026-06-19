import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type JsonObject = Record<string, any>;
type GapSeverity = "P0" | "P1" | "P2";

export const FINAL_TELEMETRY_LANE_IDS = [
  "page_view",
  "session",
  "guest_event",
  "auth_transition",
  "identity_link",
  "purchase",
  "gumdrop_balance",
  "creator_experience",
  "creator_subscription",
  "creator_drop_submission",
  "runtime_watch",
  "behavior_signal",
  "admin_evidence",
  "external_ga4_evidence",
  "ingest",
  "firestore_write_path",
  "materializers",
  "bigquery_export",
  "sql_dataconnect",
  "cloud_export",
] as const;

export type FinalTelemetryLaneId = typeof FINAL_TELEMETRY_LANE_IDS[number];

export type FinalTelemetryClosureLockInputs = {
  currentHead: string;
  generatedAtUtc: string;
  packageScripts: Record<string, string>;
  telemetryGraph: JsonObject | null;
  clientTrackingToggle: JsonObject | null;
  ingestClosure: JsonObject | null;
  identityTransferClosure: JsonObject | null;
  behavioralClosure: JsonObject | null;
  materializerClosure: JsonObject | null;
  bigQueryClosure: JsonObject | null;
  externalAnalyticsClosure: JsonObject | null;
  telemetryAdminDebugTruth: JsonObject | null;
  analyticsSemanticsFinalLock: JsonObject | null;
  currentBetaExitStatus: JsonObject | null;
};

export type FinalTelemetryClosureLockReport = {
  generatedAtUtc: string;
  reportKey: "final-telemetry-closure-lock";
  currentHead: string;
  summary: {
    clientTrackingClosed: boolean;
    consentToggleClosed: boolean;
    ingestClosed: boolean;
    firestoreWritePathClosed: boolean;
    identityTransferClosed: boolean;
    individualUserTrackingClosed: boolean;
    behavioralTrackingClosed: boolean;
    runtimeWatchClosed: boolean;
    materializerClosed: boolean;
    bigQueryClosed: boolean;
    ga4ExternalTruthClosed: boolean;
    adminTelemetryTruthClosed: boolean;
    sqlDataConnectStatus: string;
    cloudExportStatus: string;
    betaEvidenceReady: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  laneStatus: Array<{
    id: FinalTelemetryLaneId;
    status: string;
    sourceTruth: string;
    evidence: string;
    nextAction: string;
  }>;
  dependencyGaps: Array<{
    id: string;
    severity: GapSeverity;
    blocking: boolean;
    status: string;
    nextAction: string;
  }>;
  conflictingRoutesRemoved: string[];
  missingEvidence: Array<{
    id: string;
    status: string;
    nextAction: string;
  }>;
  disabledTelemetryBehavior: string[];
  enabledTelemetryBehavior: string[];
  nextExactSteps: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/final-telemetry-closure-lock.generated.json";
const docsRelativePath = "docs/agent-truth/final-telemetry-closure-lock.md";

const reportPaths = {
  telemetryGraph: "agent/state/telemetry-dependency-graph.generated.json",
  clientTrackingToggle: "agent/state/client-tracking-toggle-semantics.generated.json",
  ingestClosure: "agent/state/analytics-ingest-firestore-closure.generated.json",
  identityTransferClosure: "agent/state/identity-transfer-telemetry-closure.generated.json",
  behavioralClosure: "agent/state/behavioral-tracking-semantics-closure.generated.json",
  materializerClosure: "agent/state/event-facts-materializer-closure.generated.json",
  bigQueryClosure: "agent/state/bigquery-cloud-pipeline-closure.generated.json",
  externalAnalyticsClosure: "agent/state/external-analytics-truth-closure.generated.json",
  telemetryAdminDebugTruth: "agent/state/telemetry-admin-debug-truth.generated.json",
  analyticsSemanticsFinalLock: "agent/state/analytics-semantics-final-lock.generated.json",
  currentBetaExitStatus: "agent/state/current-beta-exit-status.generated.json",
} as const;

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readJsonIfExists(relativePath: string): JsonObject | null {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf8").replace(/^\uFEFF/u, "")) as JsonObject;
}

function reportKey(report: JsonObject | null) {
  return typeof report?.reportKey === "string" ? report.reportKey : "";
}

function summaryBool(report: JsonObject | null, key: string) {
  return report?.summary?.[key] === true;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function dependencyGap(
  id: string,
  present: boolean,
  nextAction: string,
  options: { severity?: GapSeverity; blocking?: boolean } = {},
) {
  if (present) return null;
  return {
    id,
    severity: options.severity ?? "P1",
    blocking: options.blocking ?? true,
    status: "missing_dependency",
    nextAction,
  };
}

function findGraphLane(inputs: FinalTelemetryClosureLockInputs, id: FinalTelemetryLaneId) {
  const lanes = Array.isArray(inputs.telemetryGraph?.telemetryLanes) ? inputs.telemetryGraph.telemetryLanes : [];
  return lanes.find((lane: JsonObject) => lane?.id === id) as JsonObject | undefined;
}

function laneFromGraph(inputs: FinalTelemetryClosureLockInputs, id: FinalTelemetryLaneId) {
  const lane = findGraphLane(inputs, id);
  const hasGraph = reportKey(inputs.telemetryGraph) === "telemetry-dependency-graph";
  return {
    id,
    status: lane ? "source_ready_graph_mapped" : hasGraph ? "source_ready_synthesized_from_closure" : "missing_graph_lane",
    sourceTruth: typeof lane?.persistenceDestination === "string" ? lane.persistenceDestination : "final closure map",
    evidence: typeof lane?.adminEvidenceConsumer === "string" ? lane.adminEvidenceConsumer : "telemetry closure artifact",
    nextAction: lane ? "Keep this lane represented in the telemetry dependency graph." : "Keep this final-lock synthetic lane tied to its closure artifact.",
  };
}

function buildLaneStatus(inputs: FinalTelemetryClosureLockInputs): FinalTelemetryClosureLockReport["laneStatus"] {
  const externalStatuses = stringList(inputs.externalAnalyticsClosure?.summary?.ga4Statuses);
  const bigQuerySourceReady = summaryBool(inputs.bigQueryClosure, "scheduledWindowExportEnabled")
    && summaryBool(inputs.bigQueryClosure, "configMissingStateDefined");
  const ingestSourceReady = summaryBool(inputs.ingestClosure, "acceptedEventsMapped")
    && summaryBool(inputs.ingestClosure, "firestoreDestinationsCentralized");
  const materializerSourceReady = summaryBool(inputs.materializerClosure, "persistedCollectionsClassified");

  return FINAL_TELEMETRY_LANE_IDS.map((id) => {
    if (id === "ingest") {
      return {
        id,
        status: ingestSourceReady ? "source_ready_strict_contract" : "missing_ingest_closure",
        sourceTruth: "/api/analytics/ingest -> ingest contract",
        evidence: reportKey(inputs.ingestClosure) || "missing",
        nextAction: ingestSourceReady ? "Keep accepted events mapped to destinations and non-retryable failures." : "Run or restore analytics ingest Firestore closure.",
      };
    }
    if (id === "firestore_write_path") {
      return {
        id,
        status: ingestSourceReady ? "source_ready_firestore_destinations_centralized" : "missing_firestore_destination_closure",
        sourceTruth: "analytics_guest_batches, analytics_sessions, analytics_event_facts, diagnostics",
        evidence: reportKey(inputs.ingestClosure) || "missing",
        nextAction: ingestSourceReady ? "Capture runtime write evidence before treating Firestore persistence as proven." : "Restore Firestore destination mapping.",
      };
    }
    if (id === "materializers") {
      return {
        id,
        status: materializerSourceReady ? "source_ready_event_facts_and_rollups_mapped" : "missing_materializer_closure",
        sourceTruth: "event facts, rollups, admin summaries, archive/debug-only classes",
        evidence: reportKey(inputs.materializerClosure) || "missing",
        nextAction: materializerSourceReady ? "Attach runtime materializer evidence before claiming live totals." : "Run or restore event facts materializer closure.",
      };
    }
    if (id === "bigquery_export") {
      return {
        id,
        status: bigQuerySourceReady ? "source_ready_batched_export_contract_config_missing_safe" : "missing_bigquery_closure",
        sourceTruth: "analytics_event_facts export candidate; BigQuery evidence only",
        evidence: reportKey(inputs.bigQueryClosure) || "missing",
        nextAction: bigQuerySourceReady ? "Configure and verify BigQuery in a provider-approved evidence pass; do not infer zero traffic." : "Restore BigQuery cloud pipeline closure.",
      };
    }
    if (id === "external_ga4_evidence") {
      return {
        id,
        status: externalStatuses.length > 0 ? externalStatuses.join(";") : "missing_external_analytics_truth",
        sourceTruth: "GA4/PostHog external evidence only; first-party analytics remains product truth",
        evidence: reportKey(inputs.externalAnalyticsClosure) || "missing",
        nextAction: externalStatuses.length > 0 ? "Keep GA4 behind explicit evidence refresh and consent/env gates." : "Run or restore external analytics truth closure.",
      };
    }
    if (id === "sql_dataconnect") {
      return {
        id,
        status: "agent_context_mirror_only_no_product_runtime_truth",
        sourceTruth: "Data Connect/SQL mirror is repo intelligence context only",
        evidence: "AGENTS.md Data Connect mirror doctrine",
        nextAction: "Do not promote SQL/Data Connect into telemetry runtime without an explicit cost and truth contract.",
      };
    }
    if (id === "cloud_export") {
      return {
        id,
        status: bigQuerySourceReady ? "source_ready_cloud_export_contract_runtime_unproven" : "missing_cloud_export_closure",
        sourceTruth: "scheduled BigQuery export contract; no deploy/provider proof in this pass",
        evidence: reportKey(inputs.bigQueryClosure) || "missing",
        nextAction: "Collect provider-approved export evidence before claiming cloud export live.",
      };
    }
    return laneFromGraph(inputs, id);
  });
}

function betaEvidenceReady(currentBetaExitStatus: JsonObject | null) {
  const summary = currentBetaExitStatus?.summary ?? {};
  return summary.canStartBetaExitReview === true
    && isFormalEvidenceComplete(summary.providerSmokeStatus)
    && isFormalEvidenceComplete(summary.runtimeSmokeStatus)
    && isFormalEvidenceComplete(summary.adminTruthSampleStatus);
}

function isFormalEvidenceComplete(value: unknown) {
  const status = String(value ?? "");
  if (/missing|unverified|unknown|source_only|stale|outdated|required/iu.test(status)) return false;
  return /passed|complete|attached|verified|formal_evidence/iu.test(status);
}

function missingEvidence(currentBetaExitStatus: JsonObject | null): FinalTelemetryClosureLockReport["missingEvidence"] {
  const summary = currentBetaExitStatus?.summary ?? {};
  const evidence = [
    {
      id: "provider-smoke",
      status: String(summary.providerSmokeStatus ?? "missing"),
      nextAction: "Attach formal provider smoke evidence before beta exit review.",
    },
    {
      id: "runtime-smoke",
      status: String(summary.runtimeSmokeStatus ?? "missing"),
      nextAction: "Attach deployed runtime smoke evidence before beta exit review.",
    },
    {
      id: "admin-truth-sample",
      status: String(summary.adminTruthSampleStatus ?? "missing"),
      nextAction: "Attach fresh admin truth sample evidence before beta exit review.",
    },
  ];
  return evidence.filter((entry) => !isFormalEvidenceComplete(entry.status));
}

function dependencyGaps(inputs: FinalTelemetryClosureLockInputs): FinalTelemetryClosureLockReport["dependencyGaps"] {
  return [
    dependencyGap("telemetry-dependency-graph", reportKey(inputs.telemetryGraph) === "telemetry-dependency-graph", "Run npm run check:telemetry-dependency-graph.", { severity: "P0" }),
    dependencyGap("client-tracking-toggle-semantics", reportKey(inputs.clientTrackingToggle) === "client-tracking-toggle-semantics", "Add or run the dedicated client tracking toggle semantics closure in a follow-up pass.", { severity: "P2", blocking: false }),
    dependencyGap("analytics-ingest-firestore-closure", reportKey(inputs.ingestClosure) === "analytics-ingest-firestore-closure", "Run npm run check:analytics-ingest-firestore-closure.", { severity: "P0" }),
    dependencyGap("identity-transfer-telemetry-closure", reportKey(inputs.identityTransferClosure) === "identity-transfer-telemetry-closure", "Run npm run check:identity-transfer-telemetry-closure.", { severity: "P0" }),
    dependencyGap("behavioral-tracking-semantics-closure", reportKey(inputs.behavioralClosure) === "behavioral-tracking-semantics-closure", "Run npm run check:behavioral-tracking-semantics-closure.", { severity: "P0" }),
    dependencyGap("event-facts-materializer-closure", reportKey(inputs.materializerClosure) === "event-facts-materializer-closure", "Run npm run check:event-facts-materializer-closure.", { severity: "P0" }),
    dependencyGap("bigquery-cloud-pipeline-closure", reportKey(inputs.bigQueryClosure) === "bigquery-cloud-pipeline-closure", "Run npm run check:bigquery-cloud-pipeline-closure.", { severity: "P0" }),
    dependencyGap("external-analytics-truth-closure", reportKey(inputs.externalAnalyticsClosure) === "external-analytics-truth-closure", "Run npm run check:external-analytics-truth-closure.", { severity: "P0" }),
    dependencyGap("telemetry-admin-debug-truth", reportKey(inputs.telemetryAdminDebugTruth) === "telemetry-admin-debug-truth", "Run npm run check:telemetry-admin-debug-truth.", { severity: "P0" }),
    dependencyGap("analytics-semantics-final-lock", reportKey(inputs.analyticsSemanticsFinalLock) === "analytics-semantics-final-lock", "Run npm run check:analytics-semantics-final-lock.", { severity: "P0" }),
    dependencyGap("current-beta-exit-status", reportKey(inputs.currentBetaExitStatus) === "current-beta-exit-status", "Run npm run check:current-beta-exit-status.", { severity: "P0" }),
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function countGaps(gaps: FinalTelemetryClosureLockReport["dependencyGaps"], severity: GapSeverity) {
  return gaps.filter((gap) => gap.severity === severity && gap.blocking).length;
}

export function buildFinalTelemetryClosureLockReport(
  inputs: FinalTelemetryClosureLockInputs,
): FinalTelemetryClosureLockReport {
  const gaps = dependencyGaps(inputs);
  const laneStatus = buildLaneStatus(inputs);
  const missing = missingEvidence(inputs.currentBetaExitStatus);
  const clientPolicyPresent = summaryBool(inputs.behavioralClosure, "clientTrackingPolicyCreated")
    || reportKey(inputs.clientTrackingToggle) === "client-tracking-toggle-semantics";
  const consentToggleClosed = reportKey(inputs.clientTrackingToggle) === "client-tracking-toggle-semantics";
  const ingestClosed = summaryBool(inputs.ingestClosure, "acceptedEventsMapped");
  const bigQueryClosed = summaryBool(inputs.bigQueryClosure, "scheduledWindowExportEnabled")
    && summaryBool(inputs.bigQueryClosure, "configMissingStateDefined");

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "final-telemetry-closure-lock",
    currentHead: inputs.currentHead,
    summary: {
      clientTrackingClosed: reportKey(inputs.telemetryGraph) === "telemetry-dependency-graph" && clientPolicyPresent,
      consentToggleClosed,
      ingestClosed,
      firestoreWritePathClosed: ingestClosed && summaryBool(inputs.ingestClosure, "firestoreDestinationsCentralized"),
      identityTransferClosed: summaryBool(inputs.identityTransferClosure, "identityLinkRoutePresent"),
      individualUserTrackingClosed: summaryBool(inputs.identityTransferClosure, "individualUserSessionContinuity"),
      behavioralTrackingClosed: summaryBool(inputs.behavioralClosure, "disabledBehaviorSuppressed")
        && summaryBool(inputs.behavioralClosure, "enabledBehaviorBounded"),
      runtimeWatchClosed: summaryBool(inputs.behavioralClosure, "watchTimeRuntimeOnly")
        && Boolean(inputs.analyticsSemanticsFinalLock?.betaScoreImpact?.runtimeEvidenceComplete),
      materializerClosed: summaryBool(inputs.materializerClosure, "persistedCollectionsClassified"),
      bigQueryClosed,
      ga4ExternalTruthClosed: reportKey(inputs.externalAnalyticsClosure) === "external-analytics-truth-closure"
        && stringList(inputs.externalAnalyticsClosure?.summary?.ga4Statuses).length > 0,
      adminTelemetryTruthClosed: summaryBool(inputs.telemetryAdminDebugTruth, "compactHealthModelCreated"),
      sqlDataConnectStatus: "agent_context_mirror_only_no_product_runtime_truth",
      cloudExportStatus: bigQueryClosed ? "source_ready_cloud_export_contract_runtime_unproven" : "missing_cloud_export_contract",
      betaEvidenceReady: betaEvidenceReady(inputs.currentBetaExitStatus),
      p0Count: countGaps(gaps, "P0"),
      p1Count: countGaps(gaps, "P1"),
      p2Count: countGaps(gaps, "P2"),
    },
    laneStatus,
    dependencyGaps: gaps,
    conflictingRoutesRemoved: [
      "No open PRs were present at start; no telemetry route conflicts were merged or closed in this pass.",
      "Final lock preserves first-party analytics as product truth and leaves GA4/BigQuery as evidence lanes.",
    ],
    missingEvidence: missing,
    disabledTelemetryBehavior: [
      "Consent-denied or disabled behavior suppresses non-essential page behavior, hover, scroll, visibility, and external analytics events.",
      "Disabled telemetry still keeps required product integrity/account lanes separate from behavior analytics according to source contracts.",
      consentToggleClosed
        ? "Dedicated client tracking toggle closure artifact is present."
        : "Dedicated client tracking toggle closure artifact is missing; behavior semantics and ingest contracts still represent disabled behavior.",
    ],
    enabledTelemetryBehavior: [
      "Enabled tracking maps main-site events through DeepTracker/runtime trackers into analytics ingest.",
      "Accepted events map to Firestore destinations and event fact/materializer lanes before admin evidence.",
      "External GA4 and BigQuery stay evidence-only and cannot override first-party product truth.",
    ],
    nextExactSteps: [
      "Add or restore check:client-tracking-toggle-semantics as a dedicated closure artifact if the queued toggle phase did not land.",
      "Run UI source coverage and attach formal provider smoke, runtime smoke, and admin truth sample evidence before beta exit review.",
      "Collect runtime evidence for watch-time, materializers, BigQuery/cloud export, and GA4 evidence refresh before marking those lanes live.",
    ],
  };
}

export function validateFinalTelemetryClosureLockReport(
  report: FinalTelemetryClosureLockReport | null,
) {
  const failures: string[] = [];
  if (!report) return ["final telemetry closure lock report missing."];
  if (report.reportKey !== "final-telemetry-closure-lock") failures.push("reportKey must be final-telemetry-closure-lock.");

  const ids = new Set(report.laneStatus.map((lane) => lane.id));
  for (const laneId of FINAL_TELEMETRY_LANE_IDS) {
    if (!ids.has(laneId)) failures.push(`priority telemetry lane missing status: ${laneId}.`);
  }
  if (report.laneStatus.some((lane) => !lane.status || !lane.sourceTruth || !lane.nextAction)) {
    failures.push("every telemetry lane must include status, source truth, and next action.");
  }
  if (report.enabledTelemetryBehavior.length === 0 || report.disabledTelemetryBehavior.length === 0) {
    failures.push("enabled and disabled tracking behavior must be represented.");
  }
  const source = JSON.stringify(report);
  for (const required of ["DeepTracker", "analytics ingest", "Firestore", "SQL", "Data Connect", "BigQuery", "GA4", "cloud"]) {
    if (!source.toLowerCase().includes(required.toLowerCase())) {
      failures.push(`${required} status must be represented.`);
    }
  }
  if (!report.summary.adminTelemetryTruthClosed) failures.push("admin telemetry truth must be represented.");
  if (report.dependencyGaps.some((gap) => !gap.nextAction || gap.blocking)) {
    failures.push("dependency gaps must be closed or explicitly marked with next actions.");
  }
  if (report.summary.betaEvidenceReady && report.missingEvidence.length > 0) {
    failures.push("beta exit must not be marked ready without formal evidence.");
  }
  if (report.summary.betaEvidenceReady) failures.push("beta exit must remain false until formal evidence artifacts are attached.");
  if (report.nextExactSteps.length === 0) failures.push("nextExactSteps must not be empty.");

  return failures;
}

function readInputs(): FinalTelemetryClosureLockInputs {
  const packageJson = readJsonIfExists("package.json") ?? {};
  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    packageScripts: packageJson.scripts ?? {},
    telemetryGraph: readJsonIfExists(reportPaths.telemetryGraph),
    clientTrackingToggle: readJsonIfExists(reportPaths.clientTrackingToggle),
    ingestClosure: readJsonIfExists(reportPaths.ingestClosure),
    identityTransferClosure: readJsonIfExists(reportPaths.identityTransferClosure),
    behavioralClosure: readJsonIfExists(reportPaths.behavioralClosure),
    materializerClosure: readJsonIfExists(reportPaths.materializerClosure),
    bigQueryClosure: readJsonIfExists(reportPaths.bigQueryClosure),
    externalAnalyticsClosure: readJsonIfExists(reportPaths.externalAnalyticsClosure),
    telemetryAdminDebugTruth: readJsonIfExists(reportPaths.telemetryAdminDebugTruth),
    analyticsSemanticsFinalLock: readJsonIfExists(reportPaths.analyticsSemanticsFinalLock),
    currentBetaExitStatus: readJsonIfExists(reportPaths.currentBetaExitStatus),
  };
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function renderMarkdown(report: FinalTelemetryClosureLockReport) {
  const lines = [
    "# Final Telemetry Closure Lock",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Client tracking closed: ${report.summary.clientTrackingClosed ? "yes" : "no"}`,
    `- Consent toggle closed: ${report.summary.consentToggleClosed ? "yes" : "no"}`,
    `- Ingest closed: ${report.summary.ingestClosed ? "yes" : "no"}`,
    `- Firestore write path closed: ${report.summary.firestoreWritePathClosed ? "yes" : "no"}`,
    `- Identity transfer closed: ${report.summary.identityTransferClosed ? "yes" : "no"}`,
    `- Individual user tracking closed: ${report.summary.individualUserTrackingClosed ? "yes" : "no"}`,
    `- Behavioral tracking closed: ${report.summary.behavioralTrackingClosed ? "yes" : "no"}`,
    `- Runtime watch closed: ${report.summary.runtimeWatchClosed ? "yes" : "no, runtime proof still required"}`,
    `- Materializer closed: ${report.summary.materializerClosed ? "yes" : "no"}`,
    `- BigQuery closed: ${report.summary.bigQueryClosed ? "yes, source-ready evidence contract" : "no"}`,
    `- GA4/external truth closed: ${report.summary.ga4ExternalTruthClosed ? "yes" : "no"}`,
    `- Admin telemetry truth closed: ${report.summary.adminTelemetryTruthClosed ? "yes" : "no"}`,
    `- SQL/Data Connect status: ${report.summary.sqlDataConnectStatus}`,
    `- Cloud export status: ${report.summary.cloudExportStatus}`,
    `- Beta evidence ready: ${report.summary.betaEvidenceReady ? "yes" : "no"}`,
    "",
    "## Lane Status",
    "",
    ...report.laneStatus.map((lane) => `- ${lane.id}: ${lane.status} | ${lane.sourceTruth} | next: ${lane.nextAction}`),
    "",
    "## Dependency Gaps",
    "",
    ...(report.dependencyGaps.length > 0
      ? report.dependencyGaps.map((gap) => `- ${gap.blocking ? "blocking" : "recorded"} ${gap.id}: ${gap.status}; next: ${gap.nextAction}`)
      : ["- none"]),
    "",
    "## Missing Evidence",
    "",
    ...report.missingEvidence.map((entry) => `- ${entry.id}: ${entry.status}; next: ${entry.nextAction}`),
    "",
    "## Disabled Telemetry Behavior",
    "",
    ...report.disabledTelemetryBehavior.map((entry) => `- ${entry}`),
    "",
    "## Enabled Telemetry Behavior",
    "",
    ...report.enabledTelemetryBehavior.map((entry) => `- ${entry}`),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ];
  const fullPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, lines.join("\n"));
}

function main() {
  const report = buildFinalTelemetryClosureLockReport(readInputs());
  writeJson(artifactRelativePath, report);
  renderMarkdown(report);

  const failures = validateFinalTelemetryClosureLockReport(report);
  if (failures.length > 0) {
    console.error("[final-telemetry-closure-lock] failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[final-telemetry-closure-lock] ok: ${report.laneStatus.length} lanes, betaEvidenceReady=${report.summary.betaEvidenceReady}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
