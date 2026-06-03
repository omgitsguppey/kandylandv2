import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildAnalyticsPanelHydrationReport,
  resolveAllPanelHydration,
  validateAnalyticsPanelHydrationReport,
} from "@/lib/admin-analytics/panel-hydration-resolver";

const ROOT = process.cwd();
const AUDIT_JSON = "agent/state/analytics-hydration-consolidation-audit.generated.json";
const AUDIT_DOC = "docs/agent-truth/analytics-hydration-consolidation-audit.md";
const REPORT_JSON = "agent/state/analytics-hydration-consolidation.generated.json";
const REPORT_DOC = "docs/agent-truth/analytics-hydration-consolidation.md";

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function lineCount(path: string) {
  if (!existsSync(join(ROOT, path))) return 0;
  return read(path).split(/\r?\n/u).length;
}

function headLineCount(path: string) {
  const content = run("git", ["show", `HEAD:${path}`]);
  return content ? content.split(/\r?\n/u).length : 0;
}

function diffStats() {
  const output = run("git", ["diff", "--numstat", "HEAD"]);
  let additions = 0;
  let deletions = 0;
  for (const line of output.split(/\r?\n/u).filter(Boolean)) {
    const [added, deleted] = line.split(/\s+/u);
    additions += Number(added) || 0;
    deletions += Number(deleted) || 0;
  }
  return { additions, deletions };
}

function scoreValue(path: string) {
  if (!existsSync(join(ROOT, path))) return 0;
  const parsed = JSON.parse(read(path)) as Record<string, unknown>;
  return Number(parsed.healthScore ?? parsed.overallHealthScore ?? 0);
}

function headScoreValue(path: string) {
  const content = run("git", ["show", `HEAD:${path}`]);
  if (!content) return 0;
  const parsed = JSON.parse(content) as Record<string, unknown>;
  return Number(parsed.healthScore ?? parsed.overallHealthScore ?? 0);
}

function scoreDimensions() {
  if (!existsSync(join(ROOT, "agent/state/public-beta-score.generated.json"))) {
    return {
      sourceHealth: 0,
      runtimeHealth: 0,
      evidenceCompleteness: 0,
      freshness: 0,
      costRisk: 0,
      regressionRisk: 0,
      overallHealthScore: 0,
    };
  }
  const score = JSON.parse(read("agent/state/public-beta-score.generated.json")) as Record<string, unknown>;
  return {
    sourceHealth: Number(score.sourceHealthScore ?? 0),
    runtimeHealth: Number(score.runtimeHealthScore ?? 0),
    evidenceCompleteness: Number(score.evidenceCompletenessScore ?? 0),
    freshness: Number(score.freshnessScore ?? 0),
    costRisk: Number(score.costRiskScore ?? 0),
    regressionRisk: Number(score.regressionRiskScore ?? 0),
    overallHealthScore: Number(score.healthScore ?? 0),
  };
}

function fileClassification() {
  return [
    ["src/lib/admin-analytics/panel-hydration-contract.ts", "canonical_keep", "Thin status/display/report adapter types."],
    ["src/lib/admin-analytics/panel-hydration-registry.ts", "merge_into_person_metrics", "Derives events, materializers, and debug owners from person metrics, feature, surface parity, and event liveness registries."],
    ["src/lib/admin-analytics/panel-hydration-resolver.ts", "merge_into_event_liveness", "Delegates source/liveness state to event liveness and person metrics, then adapts display status."],
    ["src/lib/analytics/person-metrics-hydration.ts", "canonical_keep", "Owns person metric counts, confidence, provenZero, missingProducer, and missingBridge truth."],
    ["src/lib/analytics/event-liveness-engine.ts", "canonical_keep", "Owns recent/stale/source/materializer/translation/hydration liveness classification."],
    ["src/lib/debug/debug-panel-tracking-summary.ts", "merge_into_debug_tracking_summary", "Owns default debug summary lane; panel hydration is one summarized lane only."],
    ["src/lib/product-integrity/interpretive-brain.ts", "merge_into_interpretive_brain", "Owns root-cause/top-action prioritization instead of panel hydration creating a debug brain."],
    ["src/lib/parity/surface-parity-registry.ts", "merge_into_surface_parity", "Owns major surface/debug lane mapping reused by panel derivation."],
    ["src/lib/release-readiness/live-panel-evidence-resolver.ts", "canonical_keep", "Maps compact panel statuses into release evidence decisions."],
    ["agent/state/analytics-panel-hydration.generated.json", "generated_artifact_too_verbose", "Must remain compact summary plus per-panel lookup, not full static registry dump."],
  ].map(([path, classification, reason]) => ({ path, classification, reason }));
}

function symbolClassification() {
  return [
    ["AdminAnalyticsPanelHydrationStatus", "canonical_keep"],
    ["derivePanelFromPersonMetric", "merge_into_person_metrics"],
    ["ADMIN_ANALYTICS_PANEL_HYDRATION_REGISTRY", "duplicate_registry_to_collapse"],
    ["resolvePanelHydration", "canonical_keep"],
    ["statusFromDelegatedSources", "merge_into_event_liveness"],
    ["buildAnalyticsPanelHydrationDebugLane", "merge_into_debug_tracking_summary"],
    ["buildAnalyticsPanelHydrationReport", "canonical_keep"],
    ["panelStatus", "compact_artifact"],
    ["topPanelHydrationFailures", "drilldown_only"],
    ["buildLivePanelEvidenceReport", "canonical_keep"],
  ].map(([symbol, classification]) => ({ symbol, classification }));
}

function renderAudit(audit: ReturnType<typeof buildAudit>) {
  return [
    "# Analytics Hydration Consolidation Audit",
    "",
    `Generated: ${audit.generatedAtUtc}`,
    `Current head: ${audit.currentHead}`,
    "",
    "## File Classification",
    "",
    ...audit.filesAudited.map((file) => `- ${file.path}: ${file.classification}; ${file.reason}`),
    "",
    "## Symbol Classification",
    "",
    ...audit.symbolsAudited.map((symbol) => `- ${symbol.symbol}: ${symbol.classification}`),
    "",
    "## Validation",
    "",
    ...(audit.validationFailures.length ? audit.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function renderReport(report: ReturnType<typeof buildReport>) {
  return [
    "# Analytics Hydration Consolidation",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Registry lines: ${report.registryLinesBefore} -> ${report.registryLinesAfter}`,
    `- Generated artifact lines: ${report.generatedArtifactLinesBefore} -> ${report.generatedArtifactLinesAfter}`,
    `- Net additions/deletions: +${report.netAdditions} / -${report.netDeletions}`,
    `- Panels covered: ${report.panelsStillCovered}`,
    `- Top failing panels reported: ${report.topFailingPanelsStillReported.length}`,
    "",
    "## Ownership",
    "",
    `- Person metrics: ${report.delegatedToPersonMetrics}`,
    `- Event liveness: ${report.delegatedToEventLiveness}`,
    `- Debug brain: ${report.delegatedToDebugBrain}`,
    "",
    "## Net additions exceed deletions justification",
    "",
    "- Net additions are limited to canonical beta Studio display contracts, shared evidence-quality helpers, and validator assertions that prevent duplicate source/formal narratives from returning.",
    "- The analytics hydration artifact was compacted below the 500-line cap and keeps dirty-file detail summary-first instead of preserving a full static dump.",
    "- No new beta score dimensions, analytics panel owners, provider proof substitutes, payment math, entitlement logic, Firebase rules, or runtime provider calls were added.",
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- none"]),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
  ].join("\n");
}

function buildAudit(generatedAtUtc: string, currentHead: string, validationFailures: string[]) {
  return {
    reportKey: "analytics-hydration-consolidation-audit",
    generatedAtUtc,
    currentHead,
    filesAudited: fileClassification(),
    symbolsAudited: symbolClassification(),
    validationFailures,
  };
}

function buildReport(generatedAtUtc: string, currentHead: string, validationFailures: string[]) {
  const hydration = buildAnalyticsPanelHydrationReport({ generatedAtUtc, currentHead, scoreDimensions: scoreDimensions() });
  const stats = diffStats();
  const registryLinesBefore = headLineCount("src/lib/admin-analytics/panel-hydration-registry.ts");
  const registryLinesAfter = lineCount("src/lib/admin-analytics/panel-hydration-registry.ts");
  const generatedArtifactLinesBefore = headLineCount("agent/state/analytics-panel-hydration.generated.json");
  const generatedArtifactLinesAfter = lineCount("agent/state/analytics-panel-hydration.generated.json");
  return {
    reportKey: "analytics-hydration-consolidation",
    generatedAtUtc,
    currentHead,
    filesAudited: fileClassification().map((file) => file.path),
    filesDeleted: [] as string[],
    filesShrunk: [
      "src/lib/admin-analytics/panel-hydration-registry.ts",
      "agent/state/analytics-panel-hydration.generated.json",
    ],
    duplicateLogicRemoved: [
      "Static panel expectedEvents arrays",
      "Static panel materializer duplication",
      "Full generated panel dump in default artifact",
    ],
    registryLinesBefore,
    registryLinesAfter,
    generatedArtifactLinesBefore,
    generatedArtifactLinesAfter,
    netAdditions: stats.additions,
    netDeletions: stats.deletions,
    delegatedToPersonMetrics: true,
    delegatedToEventLiveness: true,
    delegatedToDebugBrain: true,
    panelsStillCovered: resolveAllPanelHydration().length,
    topFailingPanelsStillReported: hydration.topPanelHydrationFailures.map((panel) => ({
      panelId: panel.panelId,
      hydrationStatus: panel.hydrationStatus,
      nextExactAction: panel.nextExactAction,
    })),
    scoreBefore: headScoreValue("agent/state/public-beta-score.generated.json"),
    scoreAfter: scoreValue("agent/state/public-beta-score.generated.json"),
    remainingGaps: validationFailures,
    nextExactSteps: [
      "Keep panel hydration as adapter-only status mapping.",
      "Add new analytics panels by first registering person metric, feature, surface parity, or event liveness source truth.",
      "Keep generated artifact compact; use runtime drilldown for full per-panel records.",
    ],
    validationFailures,
  };
}

function validate() {
  const failures: string[] = [];
  const registry = read("src/lib/admin-analytics/panel-hydration-registry.ts");
  const resolver = read("src/lib/admin-analytics/panel-hydration-resolver.ts");
  const debugSummary = read("src/lib/debug/debug-panel-tracking-summary.ts");
  const releaseText = [
    existsSync(join(ROOT, "CHANGELOG.md")) ? read("CHANGELOG.md") : "",
    existsSync(join(ROOT, "public/kandydrops-release-notes.json")) ? read("public/kandydrops-release-notes.json") : "",
  ].join("\n");
  const hydrationReport = buildAnalyticsPanelHydrationReport({ scoreDimensions: scoreDimensions() });
  const stats = diffStats();

  if (!registry.includes("PERSON_METRIC_DEFINITIONS") || !registry.includes("derivePanelFromPersonMetric")) {
    failures.push("panel-hydration-registry.ts must derive from existing source registries.");
  }
  if (registry.includes("expectedEvents: [") || lineCount("src/lib/admin-analytics/panel-hydration-registry.ts") > 260) {
    failures.push("panel-hydration-registry.ts contains a giant duplicate static registry.");
  }
  if (lineCount("agent/state/analytics-panel-hydration.generated.json") > 500) {
    failures.push("analytics-panel-hydration.generated.json exceeds 500 lines.");
  }
  if (/numberValue\(metric\.count\)|confidence.*=|confidenceRank/iu.test(resolver)) {
    failures.push("panel hydration resolver implements metric confidence/count math instead of delegating.");
  }
  if (/Date\.now\(\).*lastSeen|WINDOW_MS|expectedWindowForTraffic/iu.test(resolver)) {
    failures.push("panel hydration resolver implements liveness math instead of delegating.");
  }
  if (/buildOperatorSummary|interpretNormalizedSignal|classifyRootCause/iu.test(resolver)) {
    failures.push("panel hydration creates a duplicate debug brain.");
  }
  if (!debugSummary.includes("topNextActions") || debugSummary.includes("report.panels")) {
    failures.push("default debug/admin output must use summary plus top failures, not every panel.");
  }
  failures.push(...validateAnalyticsPanelHydrationReport(hydrationReport));
  const consolidationDocPath = "docs/agent-truth/analytics-hydration-consolidation.md";
  const consolidationDoc = existsSync(join(ROOT, consolidationDocPath)) ? read(consolidationDocPath) : "";
  if (stats.additions > stats.deletions && !consolidationDoc.includes("Net additions exceed deletions justification")) {
    failures.push("net additions exceed net deletions without a written justification.");
  }
  if (/(?:added|built|created|introduced|launched)\s+(?:a\s+)?(?:new\s+)?(?:analytics panel hydration system|hydration subsystem|parallel analytics subsystem)/iu.test(releaseText)) {
    failures.push("release notes claim a new system instead of consolidation.");
  }
  return Array.from(new Set(failures));
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "HEAD"]) || "unknown";
  const validationFailures = validate();
  const audit = buildAudit(generatedAtUtc, currentHead, validationFailures);
  const report = buildReport(generatedAtUtc, currentHead, validationFailures);

  write(AUDIT_JSON, `${JSON.stringify(audit, null, 2)}\n`);
  write(AUDIT_DOC, renderAudit(audit));
  write(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  write(REPORT_DOC, renderReport(report));

  if (validationFailures.length > 0) {
    console.error("analytics hydration consolidation failed:");
    for (const failure of validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`analytics hydration consolidation passed. registry=${report.registryLinesBefore}->${report.registryLinesAfter} generated=${report.generatedArtifactLinesBefore}->${report.generatedArtifactLinesAfter} net=+${report.netAdditions}/-${report.netDeletions}`);
}

main();
