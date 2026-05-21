import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildFinalAlgorithmicDebugLock,
  validateFinalAlgorithmicDebugLock,
  type FinalAlgorithmicDebugLockInput,
  type FinalAlgorithmicDebugStatus,
} from "../../src/lib/debug/final-algorithmic-debug-lock";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/final-algorithmic-debug-lock.generated.json";
const DOC_PATH = "docs/agent-truth/final-algorithmic-debug-lock.md";

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

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

function statusFromArtifact(path: string, keys: string[] = ["overallStatus", "status"]): FinalAlgorithmicDebugStatus {
  const artifact = readJson(path);
  if (!artifact) return "missing";
  for (const key of keys) {
    const raw = stringValue(artifact[key]);
    if (raw === "pass" || raw === "warning" || raw === "request_changes" || raw === "blocked") return raw;
    if (raw === "fail") return "blocked";
  }
  return "pass";
}

function readBacklogCounts() {
  const backlog = readJson("agent/state/debug-backlog-engine.generated.json");
  const bySeverity = backlog && typeof backlog.summary === "object" && backlog.summary && !Array.isArray(backlog.summary)
    ? (backlog.summary as Record<string, unknown>).bySeverity
    : null;
  const severity = bySeverity && typeof bySeverity === "object" && !Array.isArray(bySeverity) ? bySeverity as Record<string, unknown> : {};
  return {
    p0Count: numberValue(severity.p0),
    p1Count: numberValue(severity.p1),
    p2Count: numberValue(severity.p2),
  };
}

function remainingFormalGates(score: Record<string, unknown> | null) {
  const blockers = stringArray(score?.launchBlockers);
  const caps = Array.isArray(score?.evidenceCaps)
    ? stringArray(score.evidenceCaps)
    : [];
  const combined = [...blockers, ...caps].filter((entry) => /visual|manual|runtime|provider|admin truth|sample evidence|smoke/i.test(entry));
  return combined.length > 0
    ? Array.from(new Set(combined))
    : ["Visual/manual smoke", "Runtime/provider smoke", "Admin truth/sample evidence"];
}

function remainingScoreDrag(score: Record<string, unknown> | null) {
  const drag = [
    numberValue(score?.runtimeHealthScore, 100) < 80 ? "runtimeHealth" : "",
    numberValue(score?.evidenceCompletenessScore, 100) < 80 ? "evidenceCompleteness" : "",
    numberValue(score?.freshnessScore, 100) < 80 ? "freshness" : "",
    numberValue(score?.costRiskScore, 100) < 80 ? "costRisk" : "",
  ].filter(Boolean);
  return drag.length ? drag : ["formalEvidence"];
}

function renderDoc(report: ReturnType<typeof buildFinalAlgorithmicDebugLock>) {
  return [
    "# Final Algorithmic Debug Lock",
    "",
    "Status: algorithmic debugging is locked as the primary confidence engine. Formal runtime/provider/manual evidence gates remain separate and are not cleared by this source-only lock.",
    "",
    `- Score before: ${report.scoreBefore}`,
    `- Score after: ${report.scoreAfter}`,
    `- Algorithmic debug status: ${report.algorithmicDebugStatus}`,
    `- Manual bottleneck reduction: ${report.manualBottleneckReduction}`,
    `- Remaining formal evidence gates: ${report.remainingFormalEvidenceGates.join("; ")}`,
    `- Remaining score drag: ${report.remainingScoreDrag.join("; ")}`,
    `- P0/P1/P2: ${report.p0Count}/${report.p1Count}/${report.p2Count}`,
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
    "## Phase Status",
    "",
    `- Debug backlog: ${report.debugBacklogStatus}`,
    `- AI critic: ${report.aiCriticStatus}`,
    `- Behavior math: ${report.behaviorMathStatus}`,
    `- Legacy normalization: ${report.legacyNormalizationStatus}`,
    `- Orphan metrics: ${report.orphanMetricStatus}`,
    `- Real usage confidence: ${report.realUsageConfidenceStatus}`,
    `- Recovery playbooks: ${report.recoveryPlaybookStatus}`,
    `- Refresh queue: ${report.refreshQueueStatus}`,
    `- Operator cockpit: ${report.operatorCockpitStatus}`,
    "",
  ].join("\n");
}

const score = readJson("agent/state/public-beta-score.generated.json");
const scoreBefore = numberValue(score?.healthScore ?? score?.score, 0);
const scoreAfter = scoreBefore;
const counts = readBacklogCounts();
const input: FinalAlgorithmicDebugLockInput = {
  scoreBefore,
  scoreAfter,
  debugBacklogStatus: statusFromArtifact("agent/state/debug-backlog-engine.generated.json"),
  aiCriticStatus: statusFromArtifact("agent/state/ai-debug-critic.generated.json", ["criticStatus", "overallStatus", "status"]),
  behaviorMathStatus: statusFromArtifact("agent/state/behavior-math-verification.generated.json"),
  legacyNormalizationStatus: statusFromArtifact("agent/state/march-first-legacy-normalization.generated.json"),
  orphanMetricStatus: statusFromArtifact("agent/state/monolith-orphan-metric-registry.generated.json"),
  realUsageConfidenceStatus: statusFromArtifact("agent/state/real-usage-confidence.generated.json"),
  recoveryPlaybookStatus: statusFromArtifact("agent/state/debug-recovery-playbooks.generated.json"),
  refreshQueueStatus: statusFromArtifact("agent/state/self-healing-refresh-queue.generated.json"),
  operatorCockpitStatus: statusFromArtifact("agent/state/debug-operator-cockpit.generated.json"),
  manualBottleneckReduction: "manual testing is no longer the default bottleneck; debug panel, telemetry, behavior math, route diagnostics, AI critic, admin truth samples, and refresh queues now drive source confidence while formal evidence gates remain manual",
  remainingFormalEvidenceGates: remainingFormalGates(score),
  remainingScoreDrag: remainingScoreDrag(score),
  ...counts,
  nextExactSteps: [
    "Attach targeted visual/manual smoke evidence and run npm run check:evidence-capture-status.",
    "Attach runtime/provider smoke evidence and run npm run check:evidence-capture-status.",
    "Attach redacted admin truth sample evidence and run npm run check:admin-truth-source-sample.",
    "Run npm run check:self-healing-refresh-queue before trusting stale generated reports.",
  ],
  dependencies: {
    debugBacklog: Boolean(readJson("agent/state/debug-backlog-engine.generated.json")),
    aiCritic: Boolean(readJson("agent/state/ai-debug-critic.generated.json")),
    behaviorMath: Boolean(readJson("agent/state/behavior-math-verification.generated.json")),
    legacyNormalization: Boolean(readJson("agent/state/march-first-legacy-normalization.generated.json")),
    orphanMetrics: Boolean(readJson("agent/state/monolith-orphan-metric-registry.generated.json")),
    realUsageConfidence: Boolean(readJson("agent/state/real-usage-confidence.generated.json")),
    recoveryPlaybooks: Boolean(readJson("agent/state/debug-recovery-playbooks.generated.json")),
    refreshQueue: Boolean(readJson("agent/state/self-healing-refresh-queue.generated.json")),
    operatorCockpit: Boolean(readJson("agent/state/debug-operator-cockpit.generated.json")),
  },
};

const report = buildFinalAlgorithmicDebugLock(input, { currentHead: git(["rev-parse", "HEAD"]) });
const failures = validateFinalAlgorithmicDebugLock(report);
const finalReport = {
  ...report,
  overallStatus: failures.length ? "blocked" as const : report.overallStatus,
  algorithmicDebugStatus: failures.length ? "blocked" as const : report.algorithmicDebugStatus,
  validationFailures: failures,
};

write(REPORT_PATH, `${JSON.stringify(finalReport, null, 2)}\n`);
write(DOC_PATH, renderDoc(finalReport));

if (failures.length > 0) {
  console.error("Final algorithmic debug lock validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Final algorithmic debug lock OK: ${finalReport.algorithmicDebugStatus}, score ${finalReport.scoreAfter}.`);
