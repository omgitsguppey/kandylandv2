import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildRefreshPlan,
  type RefreshArtifactInput,
} from "../../src/lib/agent-score/refresh-safeguards";
import { REFRESH_ARTIFACT_REGISTRY } from "../../src/lib/agent-score/refresh-registry";
import {
  buildSelfHealingRefreshQueue,
  validateSelfHealingRefreshQueue,
  type ScoreImpactArtifactInput,
  type SelfHealingRefreshQueueReport,
} from "../../src/lib/agent-score/self-healing-refresh-queue";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/self-healing-refresh-queue.generated.json";
const DOC_PATH = "docs/agent-truth/self-healing-refresh-queue.md";

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

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function artifactInput(entry: typeof REFRESH_ARTIFACT_REGISTRY[number], currentHead: string): RefreshArtifactInput {
  const artifact = readJson(entry.artifactPath);
  return {
    artifactPath: entry.artifactPath,
    generatedAtUtc: readString(artifact?.generatedAtUtc) ?? readString(artifact?.generatedAt),
    sourceCommit: readString(artifact?.sourceCommit) ?? readString(artifact?.currentHead),
    currentHead: readString(artifact?.currentHead),
    currentCodeVersion: currentHead,
    exists: Boolean(artifact),
  };
}

function scoreImpactArtifacts(): ScoreImpactArtifactInput[] {
  const score80 = readJson("agent/state/score-80-path-lock.generated.json");
  const artifacts = Array.isArray(score80?.artifactsBlocking80) ? score80.artifactsBlocking80 : [];
  return artifacts
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map((item) => ({
      id: readString(item.id) ?? "unknown",
      status: readString(item.status),
      pointImpact: readNumber(item.pointImpact),
      refreshCommand: readString(item.refreshCommand),
      nextAction: readString(item.nextAction),
    }))
    .filter((item) => item.id !== "unknown");
}

function debugBacklogArtifacts(): ScoreImpactArtifactInput[] {
  const backlog = readJson("agent/state/debug-backlog-engine.generated.json");
  const items = Array.isArray(backlog?.backlog) ? backlog.backlog : [];
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .filter((item) => readString(item.fixClass) === "evidence_refresh" || readString(item.fixClass) === "stale_retire")
    .filter((item) => (readNumber(item.scoreImpact) ?? 0) > 0)
    .map((item) => ({
      id: readString(item.sourceFiles && Array.isArray(item.sourceFiles) ? item.sourceFiles[0] : item.id) ?? readString(item.id) ?? "unknown",
      status: readString(item.evidenceStatus) ?? readString(item.status),
      pointImpact: readNumber(item.scoreImpact),
      refreshCommand: readString(item.sourceValidator),
      nextAction: readString(item.exactNextAction),
    }))
    .filter((item) => item.id.startsWith("agent/state/"));
}

function renderDoc(report: SelfHealingRefreshQueueReport) {
  return [
    "# Self-Healing Refresh Queue",
    "",
    "Status: source-only stale artifact refresh queue. It orders registered refresh commands and blocks formal evidence/manual/provider/runtime proof until artifacts are attached.",
    "",
    "## Summary",
    "",
    `- Queue entries: ${report.summary.total}`,
    `- Automatic entries: ${report.summary.automatic}`,
    `- Blocked entries: ${report.summary.blocked}`,
    `- Estimated score impact: ${report.summary.totalScoreImpactEstimate}`,
    "",
    "## Queue",
    "",
    ...report.queue.map((entry) => [
      `### ${entry.dependencyOrder}. ${entry.artifact}`,
      "",
      `- Owner: ${entry.owner}`,
      `- Stale reason: ${entry.staleReason}`,
      `- Refresh command: \`${entry.refreshCommand}\``,
      `- Score impact estimate: ${entry.scoreImpactEstimate}`,
      `- Can run automatically: ${entry.canRunAutomatically}`,
      `- Blocked reason: ${entry.blockedReason || "none"}`,
      `- Expected outcome: ${entry.expectedOutcome}`,
      "",
    ].join("\n")),
  ].join("\n");
}

const currentHead = git(["rev-parse", "HEAD"]);
const refreshPlan = buildRefreshPlan(
  REFRESH_ARTIFACT_REGISTRY.map((entry) => artifactInput(entry, currentHead)),
  { currentCodeVersion: currentHead },
);
const report = buildSelfHealingRefreshQueue({
  refreshPlan,
  scoreImpactArtifacts: scoreImpactArtifacts(),
  debugBacklogArtifacts: debugBacklogArtifacts(),
}, {
  currentHead,
});
const validationFailures = validateSelfHealingRefreshQueue(report);
const adminDebugSource = readFileSync(join(ROOT, "src/lib/admin-debug-control-tower.ts"), "utf8");
if (!adminDebugSource.includes("self-healing-refresh-queue.generated.json")
  || !adminDebugSource.includes("npm run check:self-healing-refresh-queue")) {
  validationFailures.push("admin debug control tower does not expose self-healing refresh queue source.");
}
const finalReport: SelfHealingRefreshQueueReport = {
  ...report,
  overallStatus: validationFailures.length === 0 ? "pass" : "fail",
  validationFailures,
};

write(REPORT_PATH, `${JSON.stringify(finalReport, null, 2)}\n`);
write(DOC_PATH, renderDoc(finalReport));

if (validationFailures.length > 0) {
  console.error("Self-healing refresh queue validation failed:");
  for (const failure of validationFailures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Self-healing refresh queue OK: ${finalReport.summary.total} entries, ${finalReport.summary.automatic} automatic, ${finalReport.summary.blocked} blocked.`);
