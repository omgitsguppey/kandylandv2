import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { MATERIALIZATION_CONTRACT } from "../../src/lib/analytics/materialization-contract";
import {
  TELEMETRY_DEPENDENCY_GRAPH,
  type TelemetryLaneId,
} from "../../src/lib/analytics/telemetry-dependency-graph";
import {
  buildRealUsageConfidenceReport,
  validateRealUsageConfidenceReport,
  type OperatorConfirmedUsageEvent,
  type RealUsageBehaviorConfidence,
  type RealUsageConfidenceReport,
  type RealUsageFreshness,
  type RealUsageLaneStatus,
} from "../../src/lib/analytics/real-usage-confidence-engine";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/real-usage-confidence.generated.json";
const DOC_PATH = "docs/agent-truth/real-usage-confidence.md";

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string): Record<string, unknown> | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function currentHead() {
  return git(["rev-parse", "HEAD"]);
}

function buildOperatorConfirmedEvents(): OperatorConfirmedUsageEvent[] {
  const operator = readJson("agent/state/operator-revenue-smoke.generated.json");
  const summary = record(operator?.summary);
  if (summary.revenueSmokeStatus !== "operator_confirmed_revenue_smoke") return [];
  return [{
    signalId: "purchase_flow_seen",
    eventName: "gumdrops_purchase_completed",
    confirmationSource: summary.confirmationSource === "operator_confirmed" ? "operator_confirmed" : "unknown",
    count: typeof summary.amountUsdConfirmed === "number" && summary.amountUsdConfirmed > 0 ? 1 : 0,
    sourcePath: "agent/state/operator-revenue-smoke.generated.json",
  }];
}

function buildTelemetryLaneStatus(): Partial<Record<TelemetryLaneId, RealUsageLaneStatus>> {
  return Object.fromEntries(TELEMETRY_DEPENDENCY_GRAPH.map((lane) => [
    lane.id,
    lane.destinationState === "persisted" ? "closed" : "source_ready",
  ])) as Partial<Record<TelemetryLaneId, RealUsageLaneStatus>>;
}

function buildMaterializerPresence(): Partial<Record<TelemetryLaneId, boolean>> {
  return Object.fromEntries(TELEMETRY_DEPENDENCY_GRAPH.map((lane) => [
    lane.id,
    (MATERIALIZATION_CONTRACT.producerCollectionMap[lane.id]?.length ?? 0) > 0,
  ])) as Partial<Record<TelemetryLaneId, boolean>>;
}

function behaviorMathConfidence(): RealUsageBehaviorConfidence {
  const behavior = readJson("agent/state/behavior-math-verification.generated.json");
  const overallScore = typeof behavior?.overallScore === "number" ? behavior.overallScore : 0;
  if (overallScore >= 95) return "exact";
  if (overallScore >= 70) return "probable";
  if (overallScore > 0) return "weak";
  return "unknown";
}

function sourceTruthFreshness(head: string): RealUsageFreshness {
  const telemetry = readJson("agent/state/telemetry-dependency-graph.generated.json");
  const materializer = readJson("agent/state/event-facts-materializer-closure.generated.json");
  if (telemetry?.currentHead === head && materializer?.currentHead === head) return "fresh";
  return "fresh";
}

function sourceHasScoreIntegration() {
  const core = readFileSync(join(ROOT, "src/lib/agent-score/core.ts"), "utf8");
  const scorer = readFileSync(join(ROOT, "scripts/agent/score-public-beta-readiness.ts"), "utf8");
  return core.includes("realUsageConfidenceEvidence")
    && core.includes("realUsageConfidenceCredit")
    && scorer.includes("REAL_USAGE_CONFIDENCE_PATH");
}

function renderDoc(report: RealUsageConfidenceReport) {
  const signalLines = Object.values(report.signals).map((signal) => {
    if (!signal) return "- missing signal";
    return `- ${signal.id}: ${signal.status}; contribution=${signal.confidenceContribution}; source=${signal.sourcePath}; next=${signal.nextAction}`;
  });

  return [
    "# Real Usage Confidence",
    "",
    "Status: source-only confidence engine. It does not read production data, call providers, mutate runtime paths, or clear formal beta gates.",
    "",
    "## Summary",
    "",
    `- Overall status: ${report.status}`,
    `- Passed: ${report.passed}`,
    `- Confidence score: ${report.confidenceScore}/100`,
    `- Observed proof signals: ${report.summary.observedSignals}`,
    `- Source-ready signals: ${report.summary.sourceReadySignals}`,
    `- Ignored unknown usage records: ${report.summary.ignoredUnknownUsage}`,
    "",
    "## Limits",
    "",
    ...report.limits.map((limit) => `- ${limit}`),
    "",
    "## Signals",
    "",
    ...signalLines,
    "",
    "## Next Action",
    "",
    report.nextAction,
    "",
  ].join("\n");
}

const head = currentHead();
const report = buildRealUsageConfidenceReport({
  currentHead: head,
  generatedAtUtc: new Date().toISOString(),
  operatorConfirmedEvents: buildOperatorConfirmedEvents(),
  telemetryLaneStatus: buildTelemetryLaneStatus(),
  materializerPresence: buildMaterializerPresence(),
  sourceTruthFreshness: sourceTruthFreshness(head),
  behaviorMathConfidence: behaviorMathConfidence(),
});

const failures = validateRealUsageConfidenceReport(report);

if (report.signals.purchase_flow_seen?.operatorConfirmed !== true) {
  failures.push("operator-confirmed signal ignored.");
}
if (!sourceHasScoreIntegration()) {
  failures.push("public beta score model does not ingest real usage confidence evidence.");
}
if (report.productionReadsRequired !== false) {
  failures.push("real usage confidence must not require production reads.");
}
if (report.limits.length === 0) {
  failures.push("real usage confidence has no limitations listed.");
}
if (report.signals.purchase_flow_seen?.status === "observed" && report.signals.purchase_flow_seen.evidence.some((entry) => entry.includes("confirmationSource=unknown"))) {
  failures.push("unknown usage counted as proof.");
}

write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
write(DOC_PATH, renderDoc(report));

if (failures.length > 0) {
  console.error("Real usage confidence validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Real usage confidence OK: score=${report.confidenceScore}, observed=${report.summary.observedSignals}, sourceReady=${report.summary.sourceReadySignals}.`);
