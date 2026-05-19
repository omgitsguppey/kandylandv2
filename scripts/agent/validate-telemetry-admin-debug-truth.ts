import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildBigQueryExportEvidenceState } from "../../src/lib/analytics/bigquery-export-contract";
import { buildExternalAnalyticsTruthState } from "../../src/lib/analytics/external-analytics-truth";
import {
  TELEMETRY_ADMIN_HEALTH_LANE_IDS,
  buildAdminTelemetryHealth,
  validateAdminTelemetryHealth,
  type AdminTelemetryHealthLaneId,
} from "../../src/lib/server/admin-telemetry-health";

type Severity = "P0" | "P1" | "P2";
type FindingStatus = "fixed" | "missing" | "deferred";

type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  detail: string;
};

type TelemetryAdminDebugTruthReport = {
  generatedAtUtc: string;
  reportKey: "telemetry-admin-debug-truth";
  currentHead: string;
  summary: {
    compactHealthModelCreated: boolean;
    laneCount: number;
    liveCount: number;
    degradedCount: number;
    unavailableCount: number;
    configMissingCount: number;
    runtimeUnprovenCount: number;
    rawDetailsBehindDrilldown: boolean;
    defaultBroadReadsBlocked: boolean;
    missingExternalNotZero: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  lanes: Array<{
    id: AdminTelemetryHealthLaneId;
    status: string;
    sourceTruth: string;
    nextAction: string;
    costRisk: string;
  }>;
  dependencyFindings: Finding[];
  routeFindings: Finding[];
  uiFindings: Finding[];
  truthFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/telemetry-admin-debug-truth.generated.json";
const docsRelativePath = "docs/agent-truth/telemetry-admin-debug-truth.md";

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
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

function writeMarkdown(report: TelemetryAdminDebugTruthReport) {
  const lines = [
    "# Telemetry Admin Debug Truth",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Compact health model created: ${report.summary.compactHealthModelCreated ? "yes" : "no"}`,
    `- Lanes: ${report.summary.laneCount}`,
    `- Live: ${report.summary.liveCount}`,
    `- Degraded: ${report.summary.degradedCount}`,
    `- Unavailable/config missing: ${report.summary.unavailableCount + report.summary.configMissingCount}`,
    `- Runtime unproven: ${report.summary.runtimeUnprovenCount}`,
    `- Raw details behind drilldown: ${report.summary.rawDetailsBehindDrilldown ? "yes" : "no"}`,
    `- Default broad reads blocked: ${report.summary.defaultBroadReadsBlocked ? "yes" : "no"}`,
    `- Missing external analytics shown as zero: ${report.summary.missingExternalNotZero ? "no" : "risk"}`,
    "",
    "## Lanes",
    "",
    ...report.lanes.map((lane) => `- ${lane.id}: ${lane.status} | ${lane.sourceTruth} | next: ${lane.nextAction}`),
    "",
    "## Dependencies",
    "",
    ...report.dependencyFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Route",
    "",
    ...report.routeFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## UI",
    "",
    ...report.uiFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Truth",
    "",
    ...report.truthFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
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

export function validateTelemetryAdminDebugTruth(options: { writeReport?: boolean } = {}) {
  const adminTelemetryHealth = read("src/lib/server/admin-telemetry-health.ts");
  const adminDebugSummary = read("src/lib/server/admin-debug/summary.ts");
  const adminDebugRoute = read("src/app/api/admin/debug/route.ts");
  const debugNow = read("src/app/admin/debug/components/DebugTabNow.tsx");
  const telemetrySummaryComponent = read("src/app/admin/debug/components/DebugTelemetryHealthSummary.tsx");
  const telemetryGraphDoc = read("docs/agent-truth/telemetry-dependency-graph.md");
  const externalTruthDoc = read("docs/agent-truth/external-analytics-truth-closure.md");
  const bigQueryDoc = read("docs/agent-truth/bigquery-cloud-pipeline-closure.md");
  const materializerDoc = read("docs/agent-truth/event-facts-materializer-closure.md");

  const model = buildAdminTelemetryHealth({
    nowMs: Date.parse("2026-05-19T23:30:00.000Z"),
    routeRuntimeHealth: [],
    runtimeWarnings: [],
    adminMetricSnapshots: [],
    externalAnalyticsState: buildExternalAnalyticsTruthState({
      ga4ClientCodePresent: true,
      ga4ClientMeasurementIdPresent: false,
      ga4ServerPropertyIdPresent: true,
      ga4ServerDataApiDependencyPresent: true,
      posthogClientCodePresent: true,
      posthogKeyPresent: false,
      explicitRefreshRequired: true,
    }),
    bigQueryEvidenceState: buildBigQueryExportEvidenceState({
      env: {},
      firstPartySummariesActive: true,
    }),
  });
  const modelValidation = validateAdminTelemetryHealth(model);

  const rawBroadReadStart = adminDebugRoute.indexOf('adminDb.collection("users").limit(DEBUG_USER_SAMPLE_LIMIT).get()');
  const summaryReturnIndex = adminDebugRoute.indexOf("return finalize(NextResponse.json(await buildAdminDebugSummaryPayload");
  const broadReadsBehindAll = summaryReturnIndex > -1 && rawBroadReadStart > summaryReturnIndex && adminDebugRoute.includes('section === "all"');

  const dependencyFindings = [
    finding("telemetry-graph-present", telemetryGraphDoc.includes("External GA4/PostHog/BigQuery evidence"), "Telemetry dependency graph is present and separates external evidence.", "P0"),
    finding("external-truth-present", externalTruthDoc.includes("External analytics product truth: no"), "External analytics truth closure is present.", "P0"),
    finding("bigquery-truth-present", bigQueryDoc.includes("Missing BigQuery treated as zero traffic: no"), "BigQuery closure prevents missing export evidence from becoming zero traffic.", "P0"),
    finding("materializer-truth-present", materializerDoc.includes("Persisted collections classified: yes"), "Materializer closure classifies persisted telemetry records.", "P0"),
  ];

  const routeFindings = [
    finding("compact-health-model-used-in-summary", adminDebugSummary.includes("buildAdminTelemetryHealth") && adminDebugSummary.includes("telemetryHealth"), "Default Admin Debug summary includes compact telemetry health.", "P0"),
    finding("full-route-health-model-available", adminDebugRoute.includes("buildAdminTelemetryHealth") && adminDebugRoute.includes("telemetryHealth"), "Full Admin Debug drilldown also carries telemetry health metadata.", "P1"),
    finding("raw-broad-reads-behind-all", broadReadsBehindAll, "Broad raw debug collection reads remain behind section=all or forced refresh.", "P0"),
  ];

  const uiFindings = [
    finding("compact-ui-component-present", telemetrySummaryComponent.includes("Telemetry pipeline health") && telemetrySummaryComponent.includes("DebugTelemetryHealthSummary"), "Admin Debug renders a compact telemetry pipeline health section.", "P0"),
    finding("raw-details-drilldown", telemetrySummaryComponent.includes("<details") && telemetrySummaryComponent.includes("Raw details"), "Raw telemetry source/next-action details stay behind disclosure controls.", "P0"),
    finding("debug-now-mounts-summary", debugNow.includes("DebugTelemetryHealthSummary") && debugNow.includes("data?.telemetryHealth"), "Right-now debug tab mounts the compact telemetry health summary.", "P0"),
  ];

  const truthFindings = [
    finding("model-validates", modelValidation.ok, modelValidation.ok ? "Telemetry health model validates." : `Model findings: ${modelValidation.findings.join("; ")}`, "P0"),
    finding("all-lanes-present", model.lanes.length === TELEMETRY_ADMIN_HEALTH_LANE_IDS.length, "Every required telemetry pipeline lane is present.", "P0"),
    finding("ga4-missing-not-zero", adminTelemetryHealth.includes("GA4 evidence unavailable/config missing; not zero traffic."), "GA4 unavailable/config missing is not displayed as zero traffic.", "P0"),
    finding("bigquery-missing-not-exported", adminTelemetryHealth.includes("BigQuery export config missing; unavailable, not zero traffic."), "BigQuery config missing is not displayed as exported.", "P0"),
    finding("next-action-per-lane", model.lanes.every((lane) => lane.nextAction.trim().length > 0), "Every degraded/unavailable/source-ready lane has an operator next action.", "P0"),
  ];

  const fixesApplied = [
    finding("health-model-added", adminTelemetryHealth.includes("TELEMETRY_ADMIN_HEALTH_MODEL_VERSION"), "Added compact admin telemetry health model."),
    finding("debug-ui-simplified", telemetrySummaryComponent.includes("data-telemetry-admin-health"), "Added readable admin/debug telemetry health UI."),
    finding("validator-added", read("package.json").includes("check:telemetry-admin-debug-truth"), "Added telemetry admin debug truth validator."),
  ];

  const allFindings = [
    ...dependencyFindings,
    ...routeFindings,
    ...uiFindings,
    ...truthFindings,
    ...fixesApplied,
  ];

  const report: TelemetryAdminDebugTruthReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "telemetry-admin-debug-truth",
    currentHead: currentHead(),
    summary: {
      compactHealthModelCreated: fixesApplied[0].status === "fixed",
      laneCount: model.lanes.length,
      liveCount: model.summary.live,
      degradedCount: model.summary.degraded,
      unavailableCount: model.summary.unavailable,
      configMissingCount: model.summary.configMissing,
      runtimeUnprovenCount: model.summary.runtimeUnproven,
      rawDetailsBehindDrilldown: uiFindings[1].status === "fixed",
      defaultBroadReadsBlocked: routeFindings[2].status === "fixed",
      missingExternalNotZero: truthFindings[2].status === "fixed" && truthFindings[3].status === "fixed",
      p0Count: countBlocking(allFindings, "P0"),
      p1Count: countBlocking(allFindings, "P1"),
      p2Count: countBlocking(allFindings, "P2"),
    },
    lanes: model.lanes.map((lane) => ({
      id: lane.id,
      status: lane.status,
      sourceTruth: lane.sourceTruth,
      nextAction: lane.nextAction,
      costRisk: lane.costRisk,
    })),
    dependencyFindings,
    routeFindings,
    uiFindings,
    truthFindings,
    fixesApplied,
    prCleanupActions: ["No open telemetry-admin/debug truth PRs were present at start."],
    nextFixOrder: [
      "Keep raw telemetry collections behind explicit Admin Debug drilldowns.",
      "Use telemetryHealth lanes as the first admin/debug operator view before opening raw event lists.",
      "Refresh beta exit status separately; current beta status artifact is stale evidence from an earlier code version.",
    ],
  };

  if (options.writeReport) {
    writeJson(artifactRelativePath, report);
    writeMarkdown(report);
  }

  const failed = allFindings.filter((entry) => entry.status === "missing");
  if (failed.length > 0) {
    throw new Error(`Telemetry admin debug truth failed: ${failed.map((entry) => entry.id).join(", ")}`);
  }

  return report;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/agent/validate-telemetry-admin-debug-truth.ts")) {
  validateTelemetryAdminDebugTruth({ writeReport: true });
  console.log("Telemetry admin debug truth validation passed.");
}
