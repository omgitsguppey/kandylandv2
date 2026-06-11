import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TELEMETRY_EVENT_OPTIONS } from "../../src/lib/telemetry-catalog";
import {
  TELEMETRY_DEPENDENCY_GRAPH,
  findUnmappedTelemetryEvents,
  validateTelemetryDependencyGraphClosure,
  type TelemetryDependencyLane,
} from "../../src/lib/analytics/telemetry-dependency-graph";
import { buildSignalTelemetryGraphReportFromRepo } from "./collect-signal-telemetry-graph";

type Severity = "P0" | "P1" | "P2";

type Finding = {
  id: string;
  status: "fixed" | "missing" | "deferred";
  severity: Severity;
  detail: string;
};

type TelemetryDependencyGraphReport = {
  generatedAtUtc: string;
  reportKey: "telemetry-dependency-graph";
  currentHead: string;
  summary: {
    lanesMapped: number;
    priorityLanesClosed: boolean;
    catalogEventsMapped: boolean;
    signalDependencyPathsMapped: boolean;
    signalGapTaxonomyPresent: boolean;
    signalDuplicateOrDisconnectedPathsCaught: boolean;
    fakeTrackedClaimsBlocked: boolean;
    adminConsumersHaveProducers: boolean;
    bigQueryExportHasEventFacts: boolean;
    externalEvidenceSeparated: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  telemetryLanes: TelemetryDependencyLane[];
  unmappedEvents: string[];
  routeClosureFindings: Finding[];
  staleTrackingFindings: Finding[];
  adminConsumerFindings: Finding[];
  exportFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/telemetry-dependency-graph.generated.json";
const docsRelativePath = "docs/agent-truth/telemetry-dependency-graph.md";

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch (error) {
    try {
      const head = read(".git/HEAD").trim();
      if (head.startsWith("ref: ")) {
        const refPath = head.replace(/^ref:\s*/u, "");
        return read(`.git/${refPath}`).trim();
      }
      return head;
    } catch {
      return `git_unavailable:${(error as Error).message}`;
    }
  }
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function has(relativePath: string) {
  return existsSync(join(repoRoot, relativePath));
}

function finding(id: string, ok: boolean, detail: string, severity: Severity = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "missing",
    severity,
    detail,
  };
}

function count(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(report: TelemetryDependencyGraphReport) {
  const lines = [
    "# Telemetry Dependency Graph",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Lanes mapped: ${report.summary.lanesMapped}`,
    `- Priority lanes closed: ${report.summary.priorityLanesClosed ? "yes" : "no"}`,
    `- Catalog events mapped: ${report.summary.catalogEventsMapped ? "yes" : "no"}`,
    `- Fake tracked claims blocked: ${report.summary.fakeTrackedClaimsBlocked ? "yes" : "no"}`,
    `- Admin consumers have producers: ${report.summary.adminConsumersHaveProducers ? "yes" : "no"}`,
    `- BigQuery export has event facts: ${report.summary.bigQueryExportHasEventFacts ? "yes" : "no"}`,
    `- External evidence separated: ${report.summary.externalEvidenceSeparated ? "yes" : "no"}`,
    "",
    "## Lanes",
    "",
    ...report.telemetryLanes.flatMap((lane) => [
      `### ${lane.label}`,
      "",
      `- Lane: ${lane.id}`,
      `- Producer: ${lane.producer}`,
      `- Route/API: ${lane.routeApi}`,
      `- Persistence: ${lane.persistenceDestination}`,
      `- Materializer/export: ${lane.materializerExportDestination}`,
      `- Admin/evidence consumer: ${lane.adminEvidenceConsumer}`,
      `- Identity requirements: ${lane.requiredIdentityFields.join(", ")}`,
      `- Enabled behavior: ${lane.enabledBehavior}`,
      `- Disabled behavior: ${lane.disabledBehavior}`,
      `- Failure behavior: ${lane.failureBehavior}`,
      `- Product truth: ${lane.productTruth ? "yes" : "no"}`,
      `- Evidence-only: ${lane.evidenceOnly ? "yes" : "no"}`,
      lane.sourceReadyButNotTracked ? `- Source-ready note: ${lane.sourceReadyButNotTracked}` : "",
      "",
    ].filter(Boolean)),
    "## Findings",
    "",
    ...[
      ...report.routeClosureFindings,
      ...report.staleTrackingFindings,
      ...report.adminConsumerFindings,
      ...report.exportFindings,
    ].map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ];
  const fullPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, lines.join("\n"));
}

export function validateTelemetryDependencyGraph(options: { writeReport?: boolean } = {}) {
  const graphClosure = validateTelemetryDependencyGraphClosure(TELEMETRY_EVENT_OPTIONS);
  const unmappedEvents = findUnmappedTelemetryEvents(TELEMETRY_EVENT_OPTIONS);
  const signalGraph = buildSignalTelemetryGraphReportFromRepo();
  const requiredSignalGaps = [
    "event_missing",
    "actor_missing",
    "consent_blocked",
    "identity_link_missing",
    "materializer_missing",
    "debug_lane_missing",
    "runtime_unproven",
    "external_provider_unproven",
  ];
  const signalGapTaxonomyPresent = requiredSignalGaps.every((gap) => gap in signalGraph.summary.byGapClassification);
  const signalDuplicateOrDisconnectedPathsCaught = signalGraph.findings.some((finding) =>
    /duplicate|missing|disconnected|unproven/u.test(finding.classification),
  );
  const deepTracker = read("src/components/Analytics/DeepTracker.tsx");
  const telemetryClient = read("src/lib/telemetry.ts");
  const ingestRoute = read("src/app/api/analytics/ingest/route.ts");
  const identifiedIngestRoute = read("src/app/api/analytics/ingest-identified/route.ts");
  const identityLinkRoute = read("src/app/api/analytics/identity-link/route.ts");
  const serverAnalytics = read("src/lib/server/analytics.ts");
  const adminAnalyticsData = read("src/lib/server/admin-analytics-data.ts");
  const bigQueryExport = read("functions/src/analytics-bigquery-export.ts");
  const runtimeWatchTracker = read("src/components/Analytics/RuntimeWatchTracker.tsx");
  const watchSessionRoute = read("src/app/api/viewer/watch-session/route.ts");
  const ga4Truth = read("src/lib/analytics/ga4-truth.ts");

  const priorityLanesClosed = TELEMETRY_DEPENDENCY_GRAPH
    .filter((lane) => lane.costPriority !== "evidence_only")
    .every((lane) => lane.destinationState === "persisted" || lane.destinationState === "queued");
  const externalEvidenceSeparated = TELEMETRY_DEPENDENCY_GRAPH
    .filter((lane) => lane.evidenceOnly)
    .every((lane) => lane.productTruth === false && lane.destinationState === "external_evidence_only");

  const routeClosureFindings = [
    finding(
      "deeptracker-ingest-route",
      deepTracker.includes("trackEvent(")
        && !deepTracker.includes("/api/analytics/ingest")
        && telemetryClient.includes("/api/analytics/ingest")
        && ingestRoute.includes("analytics_guest_batches")
        && ingestRoute.includes("writeBehavioralTimelineFacts("),
      "DeepTracker anonymous telemetry routes through the canonical telemetry client, which reaches /api/analytics/ingest, persists accepted guest batches, and writes bounded timeline facts.",
      "P0",
    ),
    finding(
      "guest-consent-denied-no-write",
      ingestRoute.includes("ignored: true") && ingestRoute.includes("analytics_consent_denied"),
      "Anonymous consent denial returns ignored without writing priority guest telemetry.",
      "P0",
    ),
    finding(
      "identified-ingest-event-facts",
      identifiedIngestRoute.includes("ANALYTICS_CANONICAL_COLLECTIONS.runtimeFacts") && identifiedIngestRoute.includes("writeBehavioralTimelineFacts"),
      "Identified ingest persists canonical event facts and writes behavioral timeline facts.",
      "P0",
    ),
    finding(
      "identity-link-persists",
      identityLinkRoute.includes("upsertAnalyticsIdentityLink")
        && identifiedIngestRoute.includes('canonicalEventName === "identity_linked"')
        && identifiedIngestRoute.includes("identityLinksCreated"),
      "Identity-link route persists guest-to-user links and emits canonical identity events.",
      "P0",
    ),
    finding(
      "server-event-facts",
      serverAnalytics.includes("trackServerEvent") && serverAnalytics.includes("analytics_event_facts"),
      "Server trackServerEvent writes analytics_event_facts before optional vendor evidence.",
      "P0",
    ),
    finding(
      "runtime-watch-canonical-route",
      runtimeWatchTracker.includes("ingestEndpoint = null")
        && watchSessionRoute.includes("ANALYTICS_CANONICAL_COLLECTIONS.watchSessions")
        && watchSessionRoute.includes("totalVisibleSeconds"),
      "RuntimeWatchTracker is source-ready, while runtime proof is persisted through the watch-session route.",
      "P1",
    ),
  ];

  const staleTrackingFindings = [
    finding(
      "catalog-events-mapped",
      unmappedEvents.length === 0,
      "Telemetry catalog events resolve to one canonical dependency lane.",
      "P0",
    ),
    finding(
      "tracked-requires-destination",
      graphClosure.ok && priorityLanesClosed,
      "Priority tracking lanes require persisted or explicitly queued destinations before they can be called tracked.",
      "P0",
    ),
    finding(
      "runtime-watch-not-fake-tracked",
      TELEMETRY_DEPENDENCY_GRAPH.some((lane) => lane.id === "runtime_watch" && lane.sourceReadyButNotTracked?.includes("RuntimeWatchTracker")),
      "Standalone RuntimeWatchTracker is documented as source-ready and not the product-truth persistence path.",
      "P1",
    ),
  ];

  const adminConsumerFindings = [
    finding(
      "admin-consumes-real-sources",
      adminAnalyticsData.includes("analytics_event_facts")
        && adminAnalyticsData.includes("analytics_guest_batches")
        && adminAnalyticsData.includes("analytics_watch_sessions"),
      "Admin analytics consumers read event facts, guest batches, and watch sessions instead of detached fake counters.",
      "P0",
    ),
    finding(
      "external-ga4-not-product-truth",
      ga4Truth.includes('productTruthSource: "first_party_analytics"') && externalEvidenceSeparated,
      "GA4/PostHog/vendor analytics remain external evidence and do not replace first-party product truth.",
      "P0",
    ),
  ];

  const exportFindings = [
    finding(
      "bigquery-export-event-facts",
      bigQueryExport.includes("analytics_event_facts") && bigQueryExport.includes("CANONICAL_IMPORT_TARGETS"),
      "BigQuery export consumes analytics_event_facts instead of missing or client-only events.",
      "P0",
    ),
    finding(
      "graph-module-present",
      has("src/lib/analytics/telemetry-dependency-graph.ts"),
      "Canonical telemetry dependency graph module exists.",
      "P0",
    ),
  ];

  const signalGraphFindings = [
    finding(
      "signal-dependency-paths-mapped",
      signalGraph.summary.dependencyPathCount === signalGraph.summary.catalogedEventCount && signalGraph.summary.dependencyPathCount > 0,
      "SIGNAL telemetry graph emits one compact dependency path per catalog event.",
      "P0",
    ),
    finding(
      "signal-gap-taxonomy-present",
      signalGapTaxonomyPresent,
      `SIGNAL graph includes required gap classifications: ${requiredSignalGaps.join(", ")}.`,
      "P0",
    ),
    finding(
      "signal-disconnects-caught",
      signalDuplicateOrDisconnectedPathsCaught,
      "SIGNAL graph catches disconnected, duplicate, or evidence-unproven telemetry paths instead of relying on broad terminal output.",
      "P1",
    ),
    finding(
      "signal-source-only-boundary",
      signalGraph.nodes.dependencyPaths.examples.every((entry) => entry.evidenceStatus.sourceOnly && !entry.evidenceStatus.runtimeProven),
      "SIGNAL dependency paths remain source-only and do not claim runtime/provider proof.",
      "P0",
    ),
  ];

  const fixesApplied = [
    finding("canonical-graph-created", has("src/lib/analytics/telemetry-dependency-graph.ts"), "Created the canonical telemetry dependency graph."),
    finding("validator-created", has("scripts/agent/validate-telemetry-dependency-graph.ts"), "Added a focused validator for telemetry route closure."),
    finding("unit-test-created", has("tests/unit/telemetry-dependency-graph.spec.ts"), "Added unit coverage for lane closure and evidence-only GA4 separation."),
  ];

  const allFindings = [
    ...routeClosureFindings,
    ...staleTrackingFindings,
    ...adminConsumerFindings,
    ...exportFindings,
    ...signalGraphFindings,
    ...fixesApplied,
  ];

  const report: TelemetryDependencyGraphReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "telemetry-dependency-graph",
    currentHead: currentHead(),
    summary: {
      lanesMapped: TELEMETRY_DEPENDENCY_GRAPH.length,
      priorityLanesClosed,
      catalogEventsMapped: unmappedEvents.length === 0,
      signalDependencyPathsMapped: signalGraph.summary.dependencyPathCount === signalGraph.summary.catalogedEventCount && signalGraph.summary.dependencyPathCount > 0,
      signalGapTaxonomyPresent,
      signalDuplicateOrDisconnectedPathsCaught,
      fakeTrackedClaimsBlocked: graphClosure.ok && priorityLanesClosed,
      adminConsumersHaveProducers: adminConsumerFindings.every((entry) => entry.status === "fixed"),
      bigQueryExportHasEventFacts: exportFindings.some((entry) => entry.id === "bigquery-export-event-facts" && entry.status === "fixed"),
      externalEvidenceSeparated,
      p0Count: count(allFindings, "P0"),
      p1Count: count(allFindings, "P1"),
      p2Count: count(allFindings, "P2"),
    },
    telemetryLanes: TELEMETRY_DEPENDENCY_GRAPH,
    unmappedEvents,
    routeClosureFindings,
    staleTrackingFindings,
    adminConsumerFindings,
    exportFindings: [...exportFindings, ...signalGraphFindings],
    fixesApplied,
    prCleanupActions: ["No open telemetry/analytics/GA4/BigQuery/Firebase/Data Connect/admin analytics PRs were present at start."],
    nextFixOrder: [
      "Keep RuntimeWatchTracker source-ready until a product route intentionally mounts it or replaces the existing watch-session route.",
      "When adding telemetry catalog events, map them to a dependency lane before claiming the event is tracked.",
      "Keep GA4/PostHog/vendor data external evidence unless first-party persistence is added.",
    ],
  };

  if (options.writeReport) {
    writeJson(artifactRelativePath, report);
    writeMarkdown(report);
  }

  const blockingFailures = [
    ...graphClosure.findings,
    ...allFindings
      .filter((entry) => entry.status === "missing")
      .map((entry) => `${entry.id}: ${entry.detail}`),
  ];

  if (report.nextFixOrder.length === 0) {
    blockingFailures.push("nextFixOrder missing");
  }

  return { report, blockingFailures };
}

const { report, blockingFailures } = validateTelemetryDependencyGraph({ writeReport: true });

if (blockingFailures.length > 0) {
  for (const failure of blockingFailures) {
    console.error(`[telemetry-dependency-graph] ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `[telemetry-dependency-graph] ok: ${report.summary.lanesMapped} lanes, ${TELEMETRY_EVENT_OPTIONS.length} catalog events mapped`,
  );
}
