import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildAdvancedTelemetryParityUiState } from "../../src/lib/analytics/advanced-telemetry-parity-ui";
import { classifyIngestIdentifiedParityBlocker } from "../../src/lib/analytics/ingest-identified-parity-blocker";
import { buildRefreshDiagnosticsFailureClusters } from "../../src/lib/analytics/refresh-diagnostics-failure-clusters";
import { buildTelemetryParityPassGate } from "../../src/lib/analytics/telemetry-parity-pass-gate";
import { buildDebugCockpitBatch30TelemetryParityReport } from "../../src/lib/debug/debug-cockpit-batch30-telemetry-parity";

type Report = Record<string, unknown>;

const fixtureClusters = [
  {
    source: "server_diagnostics",
    reasonCode: "error",
    count: 107,
    firstSeenAtUtc: "2026-05-24T15:46:35.000Z",
    lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
    suggestedAction: "Repair route attribution.",
  },
  {
    source: "server_diagnostics",
    reasonCode: "UnknownError",
    count: 46,
    firstSeenAtUtc: "2026-05-24T15:49:14.000Z",
    lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
    affectedRoute: "Analytics.IngestIdentified",
    suggestedAction: "Inspect identified ingest failures.",
    current: true,
  },
];

function read(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function command(args: string[], fallback = "") {
  try {
    return execFileSync(args[0], args.slice(1), { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function expectPass(condition: boolean, failures: string[], message: string) {
  if (!condition) failures.push(message);
}

function runValidation(reportKey: string, report: Report, failures: string[], summary: string[]) {
  const generatedAtUtc = new Date().toISOString();
  const result = {
    reportKey,
    generatedAtUtc,
    currentHead: command(["git", "rev-parse", "HEAD"], "unknown"),
    ...report,
    validationFailures: failures,
  };
  writeJson(`agent/state/${reportKey}.generated.json`, result);
  writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
    `# ${reportKey}`,
    "",
    `Generated: ${generatedAtUtc}`,
    "",
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    ...summary.map((line) => `- ${line}`),
    "",
    "## Validation Failures",
    ...(failures.length === 0 ? ["- none"] : failures.map((failure) => `- ${failure}`)),
  ]);
  if (failures.length > 0) {
    console.error(`${reportKey} failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${reportKey}: pass`);
}

function dirtyClassifications() {
  return command(["git", "status", "--short"], "")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const filePath = line.replace(/^[ MADRCU?!]{1,2}\s+/u, "").trim();
      const classification =
        filePath.includes("telemetry-parity-pass-gate") ? "telemetry_parity_pass_gate_fix_required"
          : filePath.includes("refresh-diagnostics-failure-clusters") ? "refresh_diagnostics_blocker_required"
            : filePath.includes("ingest-identified-parity-blocker") ? "analytics_ingest_identified_followup_required"
              : filePath.includes("advanced-telemetry-parity-ui") || filePath.includes("DebugAdvancedDataValidation") ? "advanced_debug_display_fix_required"
                : filePath.includes("debug-cockpit-batch30") ? "validator_artifact_expected"
                    : filePath.includes("admin-analytics-historical-validation") || filePath.includes("admin/analytics/historical") || filePath.includes("admin-analytics.ts") || filePath.includes("event-translation-bridge") || filePath.includes("person-metrics-hydration") ? "real_source_change_needs_review"
                    : filePath.startsWith("tests/unit/") ? "test_artifact_expected"
                      : filePath.startsWith("scripts/agent/") || filePath === "package.json" ? "validator_artifact_expected"
                        : filePath.startsWith("docs/agent-truth/") ? "documentation_artifact_expected"
                          : filePath.startsWith("agent/state/") ? "current_generated_artifact_to_commit"
                            : filePath.startsWith("agent/context/") ? "unrelated_agent_context_file_to_ignore"
                              : filePath.includes("release-notes") || filePath === "CHANGELOG.md" || filePath.includes("kandydrops-release-notes") ? "release_artifact_expected"
                                : filePath.includes("public-beta-score") || filePath.includes("current-beta-exit-status") ? "current_generated_artifact_to_commit"
                                  : "unsafe_unknown";
      return { filePath, classification };
    });
}

function openPrClassifications() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const raw = command([
    "gh",
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,author,mergeStateStatus,isDraft,updatedAt,url",
  ], "[]");
  try {
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map((pr) => ({
      ...pr,
      classification: "needs_manual_review_before_batch30",
    }));
  } catch {
    return [{ classification: "unsafe_unknown", raw }];
  }
}

export function validateTelemetryParityPassGate() {
  const failures: string[] = [];
  const gate = buildTelemetryParityPassGate({
    eventSampleCount: 500,
    canonicalSampleCount: 500,
    confidence: 2,
    eventSource: "analytics_rollups_daily.authenticatedEvents",
    sampleSource: "analytics_event_facts",
    refreshDiagnosticsStatus: "fail",
    refreshFailureCount: 153,
    blockedReason: "analytics_refresh_failures_present",
    range: "30d",
    generatedAtUtc: "2026-05-24T15:57:48.000Z",
    failureClusters: fixtureClusters,
  });
  expectPass(gate.status !== "pass", failures, "confidence 2 can pass.");
  expectPass(!gate.passAllowed, failures, "refresh diagnostics fail still allows passAllowed yes.");
  expectPass(gate.blockers.includes("refresh_failures_present"), failures, "analytics_refresh_failures_present does not block pass.");
  expectPass(gate.displaySummary.includes("Sample presence confirmed") && gate.blockers.includes("low_confidence"), failures, "sample count alone creates pass.");
  expectPass(!/which event source is missing/iu.test(gate.nextAction), failures, "next action mentions missing event source when eventSource/sampleSource exist.");
  expectPass(gate.blockers.length > 0, failures, "blockers missing.");
  runValidation("telemetry-parity-pass-gate", { gate }, failures, [
    "Low confidence and current refresh diagnostics now block telemetry parity promotion.",
    "Sample presence is separated from parity readiness.",
  ]);
}

export function validateRefreshDiagnosticsFailureClusters() {
  const failures: string[] = [];
  const clusters = buildRefreshDiagnosticsFailureClusters({
    generatedAtUtc: "2026-05-24T15:58:00.000Z",
    clusters: fixtureClusters,
  });
  const routeUnknown = clusters.find((cluster) => !cluster.route);
  const ingest = clusters.find((cluster) => cluster.route === "analytics/ingest-identified");
  expectPass(routeUnknown?.likelyOwner === "analytics diagnostics attribution" && /route attribution/iu.test(routeUnknown.nextAction), failures, "route unknown failures lack owner/next action.");
  expectPass(ingest?.likelyOwner === "analytics ingest identified", failures, "Analytics.IngestIdentified UnknownError lacks route owner.");
  expectPass(clusters.every((cluster) => !cluster.current || cluster.blocksTelemetryParity), failures, "current refresh failure clusters do not block parity.");
  expectPass(clusters.every((cluster) => cluster.severity !== "info"), failures, "failure clusters are hidden behind LIVE.");
  expectPass(clusters.every((cluster) => cluster.firstSeenAtUtc && cluster.lastSeenAtUtc), failures, "first/last seen missing.");
  runValidation("refresh-diagnostics-failure-clusters", { clusters }, failures, [
    "Unknown route diagnostics are actionable attribution blockers.",
    "Analytics.IngestIdentified UnknownError maps to the identified ingest owner.",
  ]);
}

export function validateIngestIdentifiedParityBlocker() {
  const failures: string[] = [];
  const blocker = classifyIngestIdentifiedParityBlocker({
    batch18Status: "fixed_current",
    clusters: fixtureClusters,
  });
  const routeSource = read("src/app/api/analytics/ingest-identified/route.ts");
  expectPass(blocker.classification === "active_route_failing" && blocker.parityBlocked, failures, "current Analytics.IngestIdentified UnknownError remains unresolved/unclassified.");
  expectPass(routeSource.includes("retryable: false") || routeSource.includes("retryable:false"), failures, "invalid payloads can return retryable 500/503.");
  expectPass(routeSource.includes("identified_ingest_current"), failures, "obsolete route can keep retrying without compatibility context.");
  expectPass(blocker.routeOwner === "analytics ingest identified", failures, "route context missing remains.");
  expectPass(blocker.doubleCountRisk === "aliasing_must_remain_deduped", failures, "analytics events can double count.");
  runValidation("ingest-identified-parity-blocker", { blocker }, failures, [
    "Current Analytics.IngestIdentified UnknownError diagnostics remain blocking until bounded evidence is clean.",
    "Batch 18 route repair is recognized, but current diagnostics still control parity promotion.",
  ]);
}

export function validateAdvancedTelemetryParityUiCleanup() {
  const failures: string[] = [];
  const ui = buildAdvancedTelemetryParityUiState({
    row: {
      checkKey: "telemetry_depth",
      status: "fail",
      confidence: 2,
      sampleCount: 500,
      passAllowed: false,
      passBlockedReason: "analytics_refresh_failures_present",
      eventSource: "analytics_rollups_daily.authenticatedEvents",
      sampleSource: "analytics_event_facts",
      action: "Fix analytics refresh failures before promoting event sample parity.",
    },
    failureClusters: fixtureClusters,
  });
  const component = read("src/app/admin/debug/components/DebugAdvancedDataValidation.tsx");
  expectPass(ui.statusBadgeLabel === "BLOCKING", failures, "Event samples row passes with confidence 2.");
  expectPass(ui.refreshDiagnosticsBadgeLabel === "FAILED CURRENT" && component.includes("refreshDiagnosticsBadgeLabel"), failures, "Refresh diagnostics fail row shows LIVE.");
  expectPass(ui.passAllowedBadgeLabel === "BLOCKED", failures, "blocked pass row shows LIVE.");
  expectPass(!/which event source is missing/iu.test(ui.nextAction), failures, "next action references missing source when source exists.");
  expectPass(ui.failureClusters.every((cluster) => cluster.likelyOwner && cluster.currentLabel), failures, "failure clusters lack owner/currentness.");
  expectPass(component.includes('data-raw-validation-rows-default-open="false"'), failures, "raw diagnostics open by default.");
  runValidation("advanced-telemetry-parity-ui-cleanup", { ui }, failures, [
    "Advanced Debug rows show blocking/failed-current badges for failed telemetry diagnostics.",
    "Raw validation rows remain collapsed by default.",
  ]);
}

export function validateDebugCockpitBatch30TelemetryParity() {
  const failures: string[] = [];
  const report = buildDebugCockpitBatch30TelemetryParityReport({
    eventSamplesStatusBefore: "pass",
    eventSamplesConfidenceBefore: 2,
    eventSamplesPassAllowedBefore: true,
    refreshDiagnosticsStatusBefore: "fail",
    refreshFailureCount: 153,
    failureClusters: fixtureClusters,
  });
  const dirty = dirtyClassifications();
  const openPrs = openPrClassifications();
  expectPass(report.eventSamplesStatusAfter !== "pass", failures, "confidence 2 still passes.");
  expectPass(report.uiContradictionsAfter === 0, failures, "refresh diagnostics fail still shows LIVE.");
  expectPass(!report.eventSamplesPassAllowedAfter && report.parityBlockers.includes("refresh_failures_present"), failures, "passAllowed yes remains while analytics_refresh_failures_present exists.");
  expectPass(report.routeUnknownClusterStatus === "route_unknown_actionable", failures, "route unknown cluster lacks repair path.");
  expectPass(["active_route_failing", "repaired_current", "diagnostics_stale"].includes(report.ingestIdentifiedClusterStatus), failures, "Analytics.IngestIdentified UnknownError remains unresolved/unclassified.");
  expectPass(!report.nextExactSteps.some((step) => /which event source is missing/iu.test(step)), failures, "event sample next action references missing source when source exists.");
  expectPass(report.telemetryParityScoreAfter < 80 && report.parityBlockers.includes("refresh_failures_present"), failures, "telemetry parity score claims clean while refresh diagnostics fail.");
  expectPass(report.scoreDimensions.length >= 5, failures, "score dimensions missing.");
  expectPass(!dirty.some((entry) => entry.classification === "unsafe_unknown"), failures, "dirty files unclassified.");
  expectPass(openPrs.length === 0, failures, "open PRs unclassified.");
  runValidation("debug-cockpit-batch30-telemetry-parity", {
    ...report,
    dirtyClassifications: dirty,
    openPrClassifications: openPrs,
  }, failures, [
    "Batch 30 blocks telemetry parity while confidence is low or current refresh failures exist.",
    "Route unknown and Analytics.IngestIdentified diagnostics are actionable parity evidence.",
  ]);
}
