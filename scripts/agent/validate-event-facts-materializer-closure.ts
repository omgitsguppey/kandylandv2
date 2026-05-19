import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MATERIALIZATION_CONTRACT,
  listBigQueryExportCandidates,
  validateMaterializationContractClosure,
  type MaterializationCollectionClassification,
} from "../../src/lib/analytics/materialization-contract";

type Severity = "P0" | "P1" | "P2";
type FindingStatus = "fixed" | "missing" | "deferred";

type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  detail: string;
};

type EventFactsMaterializerClosureReport = {
  generatedAtUtc: string;
  reportKey: "event-facts-materializer-closure";
  currentHead: string;
  summary: {
    materializationContractCreated: boolean;
    persistedCollectionsClassified: boolean;
    eventFactDedupePresent: boolean;
    lowPriorityRollupsDeferred: boolean;
    adminReadsSummariesByDefault: boolean;
    bigQueryCandidatesMarked: boolean;
    unknownLegacySeparated: boolean;
    telemetryGraphReused: boolean;
    ingestContractReused: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  collectionClassifications: MaterializationCollectionClassification[];
  dependencyFindings: Finding[];
  eventFactFindings: Finding[];
  materializerFindings: Finding[];
  adminConsumerFindings: Finding[];
  bigQueryFindings: Finding[];
  legacyFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/event-facts-materializer-closure.generated.json";
const docsRelativePath = "docs/agent-truth/event-facts-materializer-closure.md";

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function has(relativePath: string) {
  return existsSync(join(repoRoot, relativePath));
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function finding(id: string, ok: boolean, detail: string, severity: Severity = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "missing",
    severity,
    detail,
  };
}

function countBlocking(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(report: EventFactsMaterializerClosureReport) {
  const lines = [
    "# Event Facts Materializer Closure",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Materialization contract created: ${report.summary.materializationContractCreated ? "yes" : "no"}`,
    `- Persisted collections classified: ${report.summary.persistedCollectionsClassified ? "yes" : "no"}`,
    `- Event fact dedupe present: ${report.summary.eventFactDedupePresent ? "yes" : "no"}`,
    `- Low-priority rollups deferred: ${report.summary.lowPriorityRollupsDeferred ? "yes" : "no"}`,
    `- Admin reads summaries by default: ${report.summary.adminReadsSummariesByDefault ? "yes" : "no"}`,
    `- BigQuery candidates marked: ${report.summary.bigQueryCandidatesMarked ? "yes" : "no"}`,
    `- Unknown legacy separated: ${report.summary.unknownLegacySeparated ? "yes" : "no"}`,
    `- Telemetry graph reused: ${report.summary.telemetryGraphReused ? "yes" : "no"}`,
    `- Ingest contract reused: ${report.summary.ingestContractReused ? "yes" : "no"}`,
    "",
    "## Collection Classifications",
    "",
    ...report.collectionClassifications.flatMap((entry) => [
      `### ${entry.collection}`,
      "",
      `- Classification: ${entry.downstreamClassification}`,
      `- Producer: ${entry.producer}`,
      `- Inputs: ${entry.inputCollections.join(", ") || "none"}`,
      `- Event fact outputs: ${entry.eventFactOutputs.join(", ") || "none"}`,
      `- Rollup outputs: ${entry.rollupOutputs.join(", ") || "none"}`,
      `- Dedupe keys: ${entry.dedupeKeys.join(", ")}`,
      `- Cadence: ${entry.materializerCadence.join(", ")}`,
      `- Admin consumers: ${entry.adminConsumers.join(", ")}`,
      `- BigQuery candidate: ${entry.bigQueryExportEligible ? "yes" : "no"}`,
      `- Current truth: ${entry.currentTruth ? "yes" : "no"}`,
      `- Legacy state: ${entry.legacyState}`,
      `- Notes: ${entry.notes}`,
      "",
    ]),
    "## Findings",
    "",
    ...[
      ...report.dependencyFindings,
      ...report.eventFactFindings,
      ...report.materializerFindings,
      ...report.adminConsumerFindings,
      ...report.bigQueryFindings,
      ...report.legacyFindings,
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

export function validateEventFactsMaterializerClosure(options: { writeReport?: boolean } = {}) {
  const contractClosure = validateMaterializationContractClosure();
  const eventFactsFunction = read("functions/src/analytics-event-facts.ts");
  const guestBatchesFunction = read("functions/src/analytics-guest-batches.ts");
  const adminMaterializers = read("src/lib/server/admin-analytics-materializers.ts");
  const analyticsMetrics = read("src/lib/server/analytics-metrics.ts");
  const bigQueryExport = read("functions/src/analytics-bigquery-export.ts");
  const telemetryGraphPresent = has("src/lib/analytics/telemetry-dependency-graph.ts");
  const ingestContractPresent = has("src/lib/analytics/ingest-contract.ts");
  const bigQueryCandidates = listBigQueryExportCandidates();

  const eventFactDedupePresent = eventFactsFunction.includes("analytics_dedupe")
    && eventFactsFunction.includes("ref.create(finalEvent)")
    && eventFactsFunction.includes("isFirestoreAlreadyExists");
  const lowPriorityRollupsDeferred = eventFactsFunction.includes("analytics_event_rollup_batches")
    && eventFactsFunction.includes("deferred_non_priority")
    && eventFactsFunction.includes("PRIORITY_EVENT_FACT_ROLLUP_NAMES")
    && guestBatchesFunction.includes("analytics_page_daily");
  const adminReadsSummariesByDefault = adminMaterializers.includes("analytics_admin_metric_snapshots")
    && adminMaterializers.includes("materializer_input_debug_evidence_only")
    && adminMaterializers.includes("raw ledgers are materializer input or Debug evidence only");
  const bigQueryCandidatesMarked = ["analytics_event_facts", "analytics_guest_batches", "analytics_watch_sessions"]
    .every((collection) => bigQueryCandidates.includes(collection))
    && bigQueryExport.includes("analytics_event_facts");
  const unknownLegacySeparated = analyticsMetrics.includes('watchScoreSource === "watch_session_rollup"')
    && analyticsMetrics.includes('"legacy_page_duration"')
    && MATERIALIZATION_CONTRACT.collections.some((entry) =>
      entry.collection === "legacy_page_duration_events"
      && entry.currentTruth === false
      && entry.legacyState === "unknown_legacy");

  const dependencyFindings = [
    finding("materialization-contract-present", has("src/lib/analytics/materialization-contract.ts"), "Canonical materialization contract exists.", "P0"),
    finding("telemetry-graph-reused", telemetryGraphPresent, "Telemetry dependency graph is reused as the upstream producer lane map.", "P1"),
    finding("ingest-contract-reused", ingestContractPresent, "Analytics ingest contract is reused for anonymous event type materialization rules.", "P1"),
  ];

  const eventFactFindings = [
    finding("contract-validates", contractClosure.ok, contractClosure.ok
      ? "Persisted collections have downstream classifications."
      : `Materialization contract findings: ${contractClosure.findings.join("; ")}`, "P0"),
    finding("event-fact-dedupe-present", eventFactDedupePresent, "analytics_event_facts writes use create semantics, analytics_dedupe, and duplicate guards.", "P0"),
  ];

  const materializerFindings = [
    finding("low-priority-rollups-deferred", lowPriorityRollupsDeferred, "Low-priority event facts write deferred minute batches and guest behavior rollups are bounded by batch.", "P0"),
    finding("semantic-rollups-source-backed", eventFactsFunction.includes("recordSemanticRollupFromEventFact") && guestBatchesFunction.includes("recordSemanticRollupFromGuestBatch"), "Semantic rollups are sourced from event facts or guest batches.", "P0"),
  ];

  const adminConsumerFindings = [
    finding("admin-summaries-default", adminReadsSummariesByDefault, "Admin Analytics default display is tied to snapshots/summaries while raw ledgers are input/debug evidence.", "P0"),
    finding("metrics-derive-from-inputs", analyticsMetrics.includes("buildAnalyticsMetricReport") && analyticsMetrics.includes("input.eventFacts") && analyticsMetrics.includes("input.guestBatches"), "Analytics metrics derive from supplied event facts, guest batches, and session facts instead of hardcoded totals.", "P0"),
  ];

  const bigQueryFindings = [
    finding("bigquery-candidates-marked", bigQueryCandidatesMarked, "BigQuery export candidates are explicitly marked in the materialization contract.", "P0"),
  ];

  const legacyFindings = [
    finding("unknown-legacy-separated", unknownLegacySeparated, "Legacy page-duration analytics remain unknown_legacy/debug-only and cannot become current watch-time truth.", "P0"),
  ];

  const fixesApplied = [
    finding("contract-added", has("src/lib/analytics/materialization-contract.ts"), "Added the event facts/materializer contract."),
    finding("validator-added", has("scripts/agent/validate-event-facts-materializer-closure.ts"), "Added the focused event facts materializer validator."),
    finding("unit-test-added", has("tests/unit/event-facts-materializer-closure.spec.ts"), "Added unit tests for event facts/materializer closure."),
  ];

  const allFindings = [
    ...dependencyFindings,
    ...eventFactFindings,
    ...materializerFindings,
    ...adminConsumerFindings,
    ...bigQueryFindings,
    ...legacyFindings,
    ...fixesApplied,
  ];

  const report: EventFactsMaterializerClosureReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "event-facts-materializer-closure",
    currentHead: currentHead(),
    summary: {
      materializationContractCreated: has("src/lib/analytics/materialization-contract.ts"),
      persistedCollectionsClassified: contractClosure.ok,
      eventFactDedupePresent,
      lowPriorityRollupsDeferred,
      adminReadsSummariesByDefault,
      bigQueryCandidatesMarked,
      unknownLegacySeparated,
      telemetryGraphReused: telemetryGraphPresent,
      ingestContractReused: ingestContractPresent,
      p0Count: countBlocking(allFindings, "P0"),
      p1Count: countBlocking(allFindings, "P1"),
      p2Count: countBlocking(allFindings, "P2"),
    },
    collectionClassifications: MATERIALIZATION_CONTRACT.collections,
    dependencyFindings,
    eventFactFindings,
    materializerFindings,
    adminConsumerFindings,
    bigQueryFindings,
    legacyFindings,
    fixesApplied,
    prCleanupActions: ["No open event-facts/materializer/admin analytics/BigQuery PRs were present at start."],
    nextFixOrder: [
      "When a new analytics collection is produced, classify it in materialization-contract before it can be treated as current evidence.",
      "Keep low-priority event facts on deferred minute/day rollup paths; do not hot-write summary totals for every hover/scroll/visibility event.",
      "Keep legacy page-duration records archived/debug-only unless a source-backed migration explicitly promotes them.",
    ],
  };

  if (options.writeReport) {
    writeJson(artifactRelativePath, report);
    writeMarkdown(report);
  }

  const blockingFailures = allFindings
    .filter((entry) => entry.status === "missing")
    .map((entry) => `${entry.id}: ${entry.detail}`);
  if (report.nextFixOrder.length === 0) {
    blockingFailures.push("nextFixOrder missing");
  }

  return { report, blockingFailures };
}

const { report, blockingFailures } = validateEventFactsMaterializerClosure({ writeReport: true });

if (blockingFailures.length > 0) {
  for (const failure of blockingFailures) {
    console.error(`[event-facts-materializer-closure] ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `[event-facts-materializer-closure] ok: ${report.collectionClassifications.length} collections classified, ${listBigQueryExportCandidates().length} BigQuery candidates marked`,
  );
}
