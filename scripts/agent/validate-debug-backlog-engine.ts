import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import {
  buildDebugBacklog,
  summarizeDebugBacklog,
  validateDebugBacklog,
} from "../../src/lib/debug/debug-backlog-builder";
import type { DebugBacklogItem } from "../../src/lib/debug/debug-backlog-contract";

const root = process.cwd();
const reportPath = join(root, "agent", "state", "debug-backlog-engine.generated.json");
const docPath = join(root, "docs", "agent-truth", "debug-backlog-engine.md");

type JsonRecord = Record<string, any>;

function readJson(relativePath: string): JsonRecord | null {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as JsonRecord;
  } catch {
    return null;
  }
}

function runGit(args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function changedFiles() {
  return runGit(["diff", "--name-only"])
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function routeDiagnosticsFromDebugPanel(debugPanel: JsonRecord | null) {
  const items = Array.isArray(debugPanel?.debugItems) ? debugPanel.debugItems : [];
  return items
    .filter((item: JsonRecord) => /route|debug/i.test(`${item.key ?? ""} ${item.label ?? ""} ${item.issue ?? ""}`))
    .slice(0, 20)
    .map((item: JsonRecord) => ({
      context: item.key,
      severity: item.blocksPhaseOne ? "p1" : "p2",
      message: item.issue,
      route: "/admin/debug",
      sourceFile: item.sourceArtifact || "agent/state/debug-panel-output-triage.generated.json",
      owner: "admin_debug",
    }));
}

function telemetryLanesFromDebugScore(debugScore: JsonRecord | null) {
  const issues = Array.isArray(debugScore?.issues) ? debugScore.issues : [];
  return issues
    .filter((issue: JsonRecord) => issue.source === "telemetry-admin-debug-truth" || issue.surface === "telemetry")
    .map((issue: JsonRecord) => ({
      lane: issue.id,
      status: issue.currentStatus,
      nextAction: issue.fixPlan,
    }));
}

function costReadinessFromPublicBeta(publicBeta: JsonRecord | null) {
  const reasons = Array.isArray(publicBeta?.healthScoreBreakdown?.costRisk?.reasons)
    ? publicBeta.healthScoreBreakdown.costRisk.reasons
    : [];
  return reasons.map((reason: string, index: number) => ({
    id: `cost-risk-${index}`,
    status: /owner-review|required/i.test(reason) ? "owner_review" : "review",
    message: reason,
    sourceFile: "agent/state/public-beta-score.generated.json",
    nextAction: "Keep this cost lane in owner review until external billing/provider evidence is attached.",
  }));
}

function buildReport() {
  const publicBeta = readJson("agent/state/public-beta-score.generated.json");
  const score80 = readJson("agent/state/score-80-path-lock.generated.json");
  const debugRuntime = readJson("agent/state/debug-runtime-evidence.generated.json");
  const debugPanel = readJson("agent/state/debug-panel-output-triage.generated.json");
  const debugScore = readJson("agent/state/debug-score-impact-triage.generated.json");
  const adminTruthSample = readJson("agent/state/admin-truth-source-sample.generated.json")
    ?? readJson("agent/state/admin-truth-sample-evidence.generated.json");

  const backlog = buildDebugBacklog({
    publicBetaScore: publicBeta,
    score80PathLock: score80,
    debugRuntimeEvidence: debugRuntime,
    adminTruthSample,
    debugPanelItems: Array.isArray(debugPanel?.debugItems) ? debugPanel.debugItems : [],
    routeDiagnostics: routeDiagnosticsFromDebugPanel(debugPanel),
    telemetryLanes: telemetryLanesFromDebugScore(debugScore),
    costReadiness: costReadinessFromPublicBeta(publicBeta),
    staleArtifacts: Array.isArray(publicBeta?.staleArtifacts) ? publicBeta.staleArtifacts : [],
  });

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "debug-backlog-engine",
    currentHead: runGit(["rev-parse", "HEAD"]),
    oldScore: typeof score80?.oldScore === "number" ? score80.oldScore : null,
    newScore: typeof publicBeta?.overallScore === "number" ? publicBeta.overallScore : null,
    publicBetaStatus: publicBeta?.overallStatus ?? publicBeta?.status ?? "unknown",
    readinessStatus: publicBeta?.readinessStatus ?? "unknown",
    summary: summarizeDebugBacklog(backlog),
    backlog,
    fixedThisPass: Array.isArray(debugScore?.fixedThisPass) ? debugScore.fixedThisPass : [],
    deferred: Array.isArray(debugScore?.deferred) ? debugScore.deferred : [],
    formalGatesStillBlocked: [
      "manual_screenshot",
      "provider_smoke",
      "deployed_runtime_smoke",
      "formal_admin_truth_sample",
    ],
  };
}

function validateCoverage(report: ReturnType<typeof buildReport>) {
  const failures = validateDebugBacklog(report.backlog);
  const debugPanel = readJson("agent/state/debug-panel-output-triage.generated.json");
  const debugItems = Array.isArray(debugPanel?.debugItems) ? debugPanel.debugItems : [];
  const activeDebugItems = debugItems.filter((item: JsonRecord) => !["live", "archive"].includes(String(item.uiTruthState ?? "").toLowerCase()));
  const mappedFiles = new Set(report.backlog.flatMap((item: DebugBacklogItem) => item.sourceFiles));

  for (const item of activeDebugItems) {
    if (item.sourceArtifact && !mappedFiles.has(item.sourceArtifact)) {
      failures.push(`debug panel warning is not mapped to backlog item: ${item.key} -> ${item.sourceArtifact}`);
    }
  }

  for (const item of report.backlog) {
    if (item.evidenceStatus === "unknown" && !/unknown|classif|source-backed|not deployed/i.test(item.evidenceReason)) {
      failures.push(`${item.id} unknown evidence lacks reason.`);
    }
    if (item.evidenceStatus === "stale" && item.fixClass !== "evidence_refresh" && item.fixClass !== "stale_retire") {
      failures.push(`${item.id} stale issue lacks refresh/retire action.`);
    }
    if (["p0", "p1", "critical"].includes(item.severity) && !item.exactNextAction) {
      failures.push(`${item.id} p0/p1 issue lacks exact next action.`);
    }
  }

  const touched = changedFiles();
  const forbiddenTouched = touched.filter((filePath) => (
    /(^|\/)(chat|Chat)(\/|\.|$)/u.test(filePath)
    || /src\/components\/Navbar\.tsx|src\/components\/Navigation\/|src\/components\/layout\/(TopNav|BottomNav)\.tsx/u.test(filePath.replace(/\\/g, "/"))
  ));
  if (forbiddenTouched.length > 0) {
    failures.push(`chat/nav touched: ${forbiddenTouched.join(", ")}`);
  }

  if (report.newScore !== null && report.newScore >= 80 && String(report.readinessStatus).toLowerCase().includes("ready")) {
    failures.push("debug backlog engine must not mark beta exit ready.");
  }

  return failures;
}

function writeDoc(report: ReturnType<typeof buildReport>) {
  const p0p1 = report.backlog.filter((item: DebugBacklogItem) => ["critical", "p0", "p1"].includes(item.severity));
  const staleRetired = report.backlog.filter((item: DebugBacklogItem) => item.status === "stale_retired");
  const lines = [
    "# Debug Backlog Engine",
    "",
    "Authority: structured source-backed backlog generated from debug panel, beta score, route diagnostics, telemetry/admin truth, cost, and evidence freshness lanes.",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current HEAD: ${report.currentHead}`,
    `Score: ${report.oldScore ?? "unknown"} -> ${report.newScore ?? "unknown"}`,
    `Readiness: ${report.readinessStatus}`,
    "",
    "## Summary",
    "",
    `- Total backlog items: ${report.summary.total}`,
    `- Open P0/P1 items: ${report.summary.p0P1Open}`,
    `- Evidence refreshable: ${report.summary.evidenceRefreshable}`,
    `- Source-fixable: ${report.summary.sourceFixable}`,
    `- Manual required: ${report.summary.manualRequired}`,
    `- Stale retired: ${report.summary.staleRetired}`,
    "",
    "## P0/P1 Queue",
    "",
    ...(p0p1.length
      ? p0p1.map((item: DebugBacklogItem) => `- ${item.severity.toUpperCase()} ${item.id}: ${item.exactNextAction}`)
      : ["- No P0/P1 source-fixable backlog items are open. Formal evidence gates remain blocked separately."]),
    "",
    "## Stale Retired",
    "",
    ...(staleRetired.length
      ? staleRetired.map((item: DebugBacklogItem) => `- ${item.id}: ${item.staleRetireReason || item.exactNextAction}`)
      : ["- No stale artifacts were retired from the active backlog."]),
    "",
    "## Strict Gates",
    "",
    "- The engine does not clear beta exit readiness.",
    "- Formal provider smoke remains blocked without formal artifact.",
    "- Deployed runtime smoke remains blocked without deployed runtime proof.",
    "- Admin truth sample remains blocked until a redacted first-party sample is attached.",
  ];
  writeFileSync(docPath, `${lines.join("\n")}\n`, "utf8");
}

const report = buildReport();
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeDoc(report);

const failures = validateCoverage(report);
if (failures.length > 0) {
  console.error("Debug backlog engine validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Debug backlog engine passed: ${report.summary.total} item(s), ${report.summary.p0P1Open} open P0/P1, ${report.summary.staleRetired} stale retired.`,
);
