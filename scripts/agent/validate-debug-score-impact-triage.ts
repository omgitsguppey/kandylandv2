import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "P0" | "P1" | "P2";
type BetaDimension =
  | "runtimeHealth"
  | "evidenceCompleteness"
  | "freshness"
  | "costRisk"
  | "regressionRisk";

export type DebugScoreImpactIssue = {
  id: string;
  source: string;
  surface: string;
  severity: Severity;
  betaDimension: BetaDimension;
  estimatedPointImpact: number;
  sourceFixable: boolean;
  evidenceFixable: boolean;
  staleArtifactFixable: boolean;
  currentStatus: string;
  exactFiles: string[];
  fixPlan: string;
};

export type DebugScoreImpactTriageReport = {
  generatedAtUtc: string;
  reportKey: "debug-score-impact-triage";
  currentHead: string;
  summary: {
    issueCount: number;
    sourceFixableCount: number;
    evidenceFixableCount: number;
    staleArtifactFixableCount: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
    topPointImpact: number;
  };
  issues: DebugScoreImpactIssue[];
  fixedThisPass: string[];
  deferred: Array<{ id: string; reason: string; nextAction: string }>;
  nextExactSteps: string[];
};

type BuildInputs = {
  generatedAtUtc: string;
  currentHead: string;
  betaScore?: Record<string, any> | null;
  debugPanel?: Record<string, any> | null;
  telemetryAdmin?: Record<string, any> | null;
  debugRuntimeEvidence?: Record<string, any> | null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const STATE_PATH = "agent/state/debug-score-impact-triage.generated.json";
const DOC_PATH = "docs/agent-truth/debug-score-impact-triage.md";

function readJson(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, any>;
  } catch {
    return null;
  }
}

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function slug(value: string) {
  return value
    .replace(/\\/g, "/")
    .replace(/^agent\/state\//u, "")
    .replace(/[^a-z0-9]+/giu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

function staleArtifactsFrom(betaScore: Record<string, any> | null | undefined): Array<{ artifactPath: string; refreshCommand?: string }> {
  const artifacts = Array.isArray(betaScore?.staleArtifacts) ? betaScore?.staleArtifacts : [];
  return artifacts.map((entry: any) => ({
    artifactPath: String(entry.artifactPath ?? entry.path ?? entry.artifact ?? "unknown"),
    refreshCommand: typeof entry.refreshCommand === "string"
      ? entry.refreshCommand
      : typeof entry.command === "string"
        ? entry.command
        : undefined,
  }));
}

function priorityRank(issue: DebugScoreImpactIssue) {
  const severityRank = issue.severity === "P0" ? 0 : issue.severity === "P1" ? 1 : 2;
  const explicitOrder = [
    "debug-runtime-evidence-unknown-empty",
    "admin-truth-sample-missing",
    "runtime-provider-smoke-source-confidence-gap",
  ].indexOf(issue.id);
  return [severityRank, explicitOrder === -1 ? 99 : explicitOrder, -issue.estimatedPointImpact, issue.id] as const;
}

function sortIssues(issues: DebugScoreImpactIssue[]) {
  return [...issues].sort((left, right) => {
    const leftRank = priorityRank(left);
    const rightRank = priorityRank(right);
    return leftRank[0] - rightRank[0]
      || leftRank[1] - rightRank[1]
      || leftRank[2] - rightRank[2]
      || leftRank[3].localeCompare(rightRank[3]);
  });
}

export function buildDebugScoreImpactTriageReport(inputs: BuildInputs): DebugScoreImpactTriageReport {
  const betaScore = inputs.betaScore ?? {};
  const capDetails = stringArray(betaScore.evidenceCapDetails);
  const debugRuntimeStatus = String(inputs.debugRuntimeEvidence?.status ?? "");
  const runtimeHealthScore = numberValue(betaScore.runtimeHealthScore);
  const evidenceCompletenessScore = numberValue(betaScore.evidenceCompletenessScore);
  const freshnessScore = numberValue(betaScore.freshnessScore);
  const issues: DebugScoreImpactIssue[] = [];

  if (capDetails.some((entry) => /debug\/runtime evidence|debug evidence is empty/iu.test(entry))) {
    issues.push({
      id: "debug-runtime-evidence-unknown-empty",
      source: "public-beta-score",
      surface: "admin_debug",
      severity: "P1",
      betaDimension: "runtimeHealth",
      estimatedPointImpact: Math.max(1, Number((100 - runtimeHealthScore).toFixed(2))),
      sourceFixable: true,
      evidenceFixable: true,
      staleArtifactFixable: false,
      currentStatus: "unknown_empty",
      exactFiles: [
        "agent/state/debug-runtime-evidence.generated.json",
        "src/lib/debug-evidence-contract.ts",
        "scripts/agent/load-debug-evidence-for-audit.ts",
        "scripts/agent/score-public-beta-readiness.ts",
      ],
      fixPlan: "Generate source-backed debug runtime evidence from checked debug sources; do not clear deployed route evidence.",
    });
  } else if (/source_ready_debug_runtime_evidence|partial_debug_runtime_evidence/iu.test(debugRuntimeStatus)) {
    issues.push({
      id: "debug-runtime-evidence-unknown-empty",
      source: "debug-runtime-evidence",
      surface: "admin_debug",
      severity: "P2",
      betaDimension: "runtimeHealth",
      estimatedPointImpact: 0.01,
      sourceFixable: false,
      evidenceFixable: false,
      staleArtifactFixable: false,
      currentStatus: debugRuntimeStatus,
      exactFiles: [
        "agent/state/debug-runtime-evidence.generated.json",
        "docs/agent-truth/debug-runtime-evidence.md",
      ],
      fixPlan: debugRuntimeStatus.includes("partial")
        ? "Debug/runtime evidence has partial source-backed status; deployed route evidence remains separate."
        : "Debug/runtime evidence has source-backed checked-clean status; deployed route evidence remains separate.",
    });
  }

  if (capDetails.some((entry) => /admin truth\/sample evidence|admin truth sample/iu.test(entry))) {
    issues.push({
      id: "admin-truth-sample-missing",
      source: "public-beta-score",
      surface: "admin_debug",
      severity: "P1",
      betaDimension: "evidenceCompleteness",
      estimatedPointImpact: Math.max(1, Number((100 - evidenceCompletenessScore).toFixed(2))),
      sourceFixable: true,
      evidenceFixable: true,
      staleArtifactFixable: false,
      currentStatus: "missing_or_unknown",
      exactFiles: [
        "agent/state/admin-truth-source-sample.generated.json",
        "src/lib/admin-debug-control-tower.ts",
        "src/app/api/admin/debug/route.ts",
      ],
      fixPlan: "Create a source-only admin truth sample showing admin models are wired while keeping redacted admin source activity sample evidence missing.",
    });
  }

  if (capDetails.some((entry) => /runtime\/provider smoke|runtime unverified|provider smoke|provider-backed site activity|deployed route evidence|deployed runtime route evidence/iu.test(entry))) {
    issues.push({
      id: "runtime-provider-smoke-source-confidence-gap",
      source: "public-beta-score",
      surface: "runtime_evidence",
      severity: "P1",
      betaDimension: "runtimeHealth",
      estimatedPointImpact: Math.max(1, Number((100 - runtimeHealthScore).toFixed(2))),
      sourceFixable: false,
      evidenceFixable: true,
      staleArtifactFixable: false,
      currentStatus: "runtime_unverified",
      exactFiles: [
        "agent/state/runtime-smoke-evidence.generated.json",
        "agent/state/provider-smoke-evidence.generated.json",
        "agent/state/source-backed-runtime-confidence.generated.json",
      ],
      fixPlan: "Keep provider-backed site activity + deployed route evidence gates blocked; only source-backed confidence can be refreshed without claiming provider or deployed-route truth.",
    });
  }

  for (const artifact of staleArtifactsFrom(betaScore)) {
    issues.push({
      id: `stale-artifact-${slug(artifact.artifactPath)}`,
      source: "refresh-safeguards",
      surface: "agent_state",
      severity: "P1",
      betaDimension: "freshness",
      estimatedPointImpact: Math.max(1, Number((100 - freshnessScore).toFixed(2)) / Math.max(1, staleArtifactsFrom(betaScore).length)),
      sourceFixable: false,
      evidenceFixable: false,
      staleArtifactFixable: true,
      currentStatus: artifact.refreshCommand ? "stale_refreshable" : "stale_no_refresh_command",
      exactFiles: [artifact.artifactPath],
      fixPlan: artifact.refreshCommand
        ? `Refresh with ${artifact.refreshCommand}.`
        : "Classify as obsolete/archive or add an exact refresh command before it can affect score freshness.",
    });
  }

  const telemetryLanes = Array.isArray(inputs.telemetryAdmin?.lanes) ? inputs.telemetryAdmin?.lanes : [];
  for (const lane of telemetryLanes) {
    const status = String(lane.status ?? "");
    if (!/runtime_unproven|config_missing|unavailable|degraded/iu.test(status)) continue;
    issues.push({
      id: `telemetry-lane-${slug(String(lane.lane ?? lane.id ?? "unknown"))}`,
      source: "telemetry-admin-debug-truth",
      surface: "telemetry",
      severity: "P2",
      betaDimension: "runtimeHealth",
      estimatedPointImpact: 2,
      sourceFixable: status !== "config_missing",
      evidenceFixable: true,
      staleArtifactFixable: false,
      currentStatus: status,
      exactFiles: ["agent/state/telemetry-admin-debug-truth.generated.json"],
      fixPlan: String(lane.nextAction ?? "Keep the lane visible until runtime evidence or config exists."),
    });
  }

  const debugItems = Array.isArray(inputs.debugPanel?.debugItems) ? inputs.debugPanel?.debugItems : [];
  for (const item of debugItems) {
    const status = `${item.freshness ?? ""} ${item.uiTruthState ?? ""}`;
    if (!/missing|stale|unknown/iu.test(status)) continue;
    const key = String(item.key ?? "");
    if (issues.some((issue) => issue.id.includes(slug(key)))) continue;
    issues.push({
      id: `debug-panel-${slug(key || String(item.sourceArtifact ?? "unknown"))}`,
      source: "debug-panel-output-triage",
      surface: "admin_debug",
      severity: /blocking|provider|runtime|admin/iu.test(`${key} ${item.issue ?? ""}`) ? "P1" : "P2",
      betaDimension: /stale/iu.test(status) ? "freshness" : "evidenceCompleteness",
      estimatedPointImpact: /blocking|provider|runtime|admin/iu.test(`${key} ${item.issue ?? ""}`) ? 4 : 1,
      sourceFixable: false,
      evidenceFixable: true,
      staleArtifactFixable: /stale/iu.test(status),
      currentStatus: String(item.uiTruthState ?? item.freshness ?? "unknown"),
      exactFiles: [String(item.sourceArtifact ?? "unknown")],
      fixPlan: String(item.recommendedAction ?? item.issue ?? "Classify the debug panel warning and keep it visible."),
    });
  }

  const sorted = sortIssues(issues);
  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "debug-score-impact-triage",
    currentHead: inputs.currentHead,
    summary: {
      issueCount: sorted.length,
      sourceFixableCount: sorted.filter((issue) => issue.sourceFixable).length,
      evidenceFixableCount: sorted.filter((issue) => issue.evidenceFixable).length,
      staleArtifactFixableCount: sorted.filter((issue) => issue.staleArtifactFixable).length,
      p0Count: sorted.filter((issue) => issue.severity === "P0").length,
      p1Count: sorted.filter((issue) => issue.severity === "P1").length,
      p2Count: sorted.filter((issue) => issue.severity === "P2").length,
      topPointImpact: sorted[0]?.estimatedPointImpact ?? 0,
    },
    issues: sorted,
    fixedThisPass: [
      "debug-runtime-evidence-unknown-empty",
      "admin-truth-sample-missing",
    ].filter((id) => sorted.some((issue) => issue.id === id)),
    deferred: sorted
      .filter((issue) => issue.id === "runtime-provider-smoke-source-confidence-gap" || issue.currentStatus.includes("stale_no_refresh"))
      .map((issue) => ({
        id: issue.id,
        reason: issue.id === "runtime-provider-smoke-source-confidence-gap"
          ? "Provider-backed site activity + deployed route evidence requires first-party/deployed evidence."
          : "No exact refresh command exists yet.",
        nextAction: issue.fixPlan,
      })),
    nextExactSteps: [
      "Run npm run check:debug-runtime-evidence.",
      "Attach deployed route evidence before clearing runtime evidence gates.",
      "Attach provider-backed site activity evidence before clearing provider evidence gates.",
      "Attach a redacted admin source activity sample before clearing the admin source sample gate.",
    ],
  };
}

export function validateDebugScoreImpactTriageReport(report: DebugScoreImpactTriageReport) {
  const failures: string[] = [];
  if (report.reportKey !== "debug-score-impact-triage") failures.push("reportKey must be debug-score-impact-triage.");
  if (!report.currentHead) failures.push("currentHead is required.");
  if (!Array.isArray(report.issues) || report.issues.length === 0) failures.push("debug score triage must include issues.");
  for (const issue of report.issues ?? []) {
    if (!issue.betaDimension) failures.push(`${issue.id} lacks betaDimension.`);
    if (!(issue.estimatedPointImpact > 0)) failures.push(`${issue.id} lacks estimated point impact.`);
    if (!issue.fixPlan) failures.push(`${issue.id} lacks fixPlan.`);
    if (!Array.isArray(issue.exactFiles) || issue.exactFiles.length === 0) failures.push(`${issue.id} lacks exactFiles.`);
    if (/unknown/iu.test(issue.id + issue.source + issue.fixPlan) && /healthy|live/iu.test(issue.currentStatus)) {
      failures.push(`${issue.id} has unknown evidence marked healthy.`);
    }
    if (issue.staleArtifactFixable && issue.currentStatus === "stale_no_refresh_command") {
      failures.push(`${issue.id} stale artifact lacks refresh command.`);
    }
  }
  if (!report.issues.some((issue) => issue.id === "debug-runtime-evidence-unknown-empty")) {
    failures.push("debug/runtime evidence unknown or checked-clean status must be represented.");
  }
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) failures.push("nextExactSteps missing.");
  return failures;
}

function renderDoc(report: DebugScoreImpactTriageReport) {
  const rows = report.issues
    .map((issue) => `| ${issue.id} | ${issue.severity} | ${issue.betaDimension} | ${issue.estimatedPointImpact} | ${issue.currentStatus} | ${issue.fixPlan} |`)
    .join("\n");
  const deferred = report.deferred.map((item) => `- ${item.id}: ${item.reason} Next: ${item.nextAction}`).join("\n") || "- None.";
  return `# Debug Score Impact Triage

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Summary

- Issues classified: ${report.summary.issueCount}
- Source-fixable: ${report.summary.sourceFixableCount}
- Evidence-fixable: ${report.summary.evidenceFixableCount}
- Stale artifact-fixable: ${report.summary.staleArtifactFixableCount}
- P0/P1/P2: ${report.summary.p0Count}/${report.summary.p1Count}/${report.summary.p2Count}

## Score-Impact Queue

| Issue | Severity | Dimension | Est. point impact | Current status | Fix plan |
| --- | --- | --- | ---: | --- | --- |
${rows}

## Deferred

${deferred}

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}
`;
}

function main() {
  const head = currentHead();
  const report = buildDebugScoreImpactTriageReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    betaScore: readJson("agent/state/public-beta-score.generated.json"),
    debugPanel: readJson("agent/state/debug-panel-output-triage.generated.json"),
    telemetryAdmin: readJson("agent/state/telemetry-admin-debug-truth.generated.json"),
    debugRuntimeEvidence: readJson("agent/state/debug-runtime-evidence.generated.json"),
  });

  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, STATE_PATH), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report), "utf8");

  const failures = validateDebugScoreImpactTriageReport(report);
  if (failures.length > 0) {
    console.error("Debug score-impact triage validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Debug score-impact triage passed: ${report.summary.issueCount} issue(s), top impact ${report.summary.topPointImpact}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
