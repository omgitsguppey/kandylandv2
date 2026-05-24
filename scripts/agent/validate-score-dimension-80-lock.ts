import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildScoreDimension80LockReport,
  validateScoreDimension80LockReport,
  type ScoreDimension80LockReport,
  type ScoreDimensionDirtyFile,
  type ScoreDimensionName,
  type ScoreDimensionOpenPrClassification,
  type ScoreDimensionStaleArtifact,
  type ScoreDimensionValues,
} from "../../src/lib/agent-score/score-dimension-80-lock";

type JsonRecord = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const STATE_PATH = "agent/state/score-dimension-80-lock.generated.json";
const DOC_PATH = "docs/agent-truth/score-dimension-80-lock.md";

const DIMENSIONS: ScoreDimensionName[] = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
];

function shell(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function currentHead() {
  return shell("git", ["rev-parse", "HEAD"]);
}

function readJson(path: string): JsonRecord | null {
  const absolute = join(ROOT, path);
  if (!existsSync(absolute)) return null;
  try {
    const parsed = JSON.parse(readFileSync(absolute, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function readCommittedJson(path: string): JsonRecord | null {
  const raw = shell("git", ["show", `HEAD:${path}`]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreFromBeta(beta: JsonRecord | null): ScoreDimensionValues {
  const dimensions = record(beta?.scoreDimensions);
  return {
    sourceHealth: numberValue(dimensions.sourceHealth, numberValue(beta?.sourceHealthScore)),
    runtimeHealth: numberValue(dimensions.runtimeHealth, numberValue(beta?.runtimeHealthScore)),
    evidenceCompleteness: numberValue(dimensions.evidenceCompleteness, numberValue(beta?.evidenceCompletenessScore)),
    freshness: numberValue(dimensions.freshness, numberValue(beta?.freshnessScore)),
    costRisk: numberValue(dimensions.costRisk, numberValue(beta?.costRiskScore)),
    regressionRisk: numberValue(dimensions.regressionRisk, numberValue(beta?.regressionRiskScore)),
    overallHealthScore: numberValue(dimensions.overallHealthScore, numberValue(beta?.healthScore)),
  };
}

function dirtyFiles() {
  return shell("git", ["status", "--short"]).split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.{1,2})\s+(.+)$/u);
      return match?.[2]?.trim() ?? line.slice(3).trim();
    })
    .filter(Boolean)
    .map((path) => path.replace(/\\/gu, "/"));
}

function classifyDirtyFile(path: string): ScoreDimensionDirtyFile {
  if (/event-liveness-audit|event-liveness-(contract|engine)|debug-panel-tracking-summary|admin-debug\/summary|api\/admin\/debug\/route/u.test(path)) {
    return { path, classification: "in_flight" };
  }
  if (path === "agent/context/optimized-task-context.generated.json") {
    return { path, classification: "unrelated_agent_context_file_to_ignore" };
  }
  if (/^agent\/state\/.*\.generated\.json$/u.test(path)) {
    return { path, classification: "current_generated_artifact_to_commit" };
  }
  if (/^docs\/agent-truth\/.*\.md$/u.test(path)) {
    return { path, classification: "release_artifact_expected" };
  }
  if (/^scripts\/agent\/validate-score-dimension-80-lock\.ts$/u.test(path)) {
    return { path, classification: "validator_artifact_expected" };
  }
  if (/^tests\/unit\/score-dimension-80-lock\.spec\.ts$/u.test(path)) {
    return { path, classification: "test_artifact_expected" };
  }
  if (/^(CHANGELOG\.md|public\/kandydrops-release-notes\.json|src\/lib\/release-notes\/public-release-notes\.ts|src\/lib\/release-notes\/release-version-contract\.ts)$/u.test(path)) {
    return { path, classification: "release_artifact_expected" };
  }
  if (/^(package\.json|src\/lib\/agent-score\/score-dimension-80-lock\.ts)$/u.test(path)) {
    return { path, classification: "real_source_change_needs_review" };
  }
  if (/^(src|scripts|tests)\//u.test(path)) {
    return { path, classification: "real_source_change_needs_review" };
  }
  return { path, classification: "unsafe_unknown" };
}

function formalGatesRemaining() {
  const bridge = readJson("agent/state/formal-evidence-bridge.generated.json");
  const gaps = bridge?.formalGapsRemaining;
  if (Array.isArray(gaps) && gaps.every((gap) => typeof gap === "string")) return gaps as string[];
  return ["formal_provider_smoke", "deployed_runtime_smoke", "production_admin_truth_sample"];
}

function staleArtifacts(): ScoreDimensionStaleArtifact[] {
  const beta = readJson("agent/state/public-beta-score.generated.json");
  const stale = Array.isArray(beta?.staleArtifacts) ? beta.staleArtifacts : [];
  return stale.map((entry) => {
    const item = record(entry);
    return {
      artifactPath: String(item.artifactPath ?? "unknown"),
      status: String(item.status ?? "stale"),
      refreshCommand: typeof item.refreshCommand === "string" ? item.refreshCommand : null,
      nextAction: typeof item.nextAction === "string" ? item.nextAction : String(item.message ?? "Refresh or classify stale artifact."),
      classification: "current_warning" as const,
    };
  });
}

function costOwnerReviewRemaining() {
  const cost = readJson("agent/state/cost-risk-owner-review-closure.generated.json");
  const lanes = record(cost?.lanes);
  return Object.values(lanes).map(record)
    .filter((lane) => lane.externalReviewRequired === true)
    .map((lane) => ({
      laneId: String(lane.id ?? "unknown"),
      status: String(lane.status ?? "external_review_required"),
      nextAction: String(lane.nextAction ?? "Attach owner-reviewed external billing evidence."),
    }));
}

function regressionEvidence() {
  const regression = readJson("agent/state/regression-risk-high-blast-refresh.generated.json");
  const toLane = (entry: unknown) => {
    const lane = record(entry);
    return {
      laneId: String(lane.laneId ?? "unknown"),
      status: String(lane.status ?? "unknown"),
      nextAction: String(lane.nextAction ?? lane.blocker ?? "Refresh or classify regression evidence."),
    };
  };
  const failed = Array.isArray(regression?.failedLanes) ? regression.failedLanes.map(toLane) : [];
  const missing = Array.isArray(regression?.missingLanes) ? regression.missingLanes.map(toLane) : [];
  const stale = Array.isArray(regression?.staleLanes) ? regression.staleLanes.map(toLane) : [];
  const inFlight = Array.isArray(regression?.inFlightLanes) ? regression.inFlightLanes.map(toLane) : [];
  return { remaining: [...failed, ...missing, ...stale], inFlight };
}

function openPrClassifications(): ScoreDimensionOpenPrClassification[] {
  const raw = shell("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus"]);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [{ number: 0, title: "Unable to parse gh PR list", url: "", classification: "unsafe_unknown" }];
    return parsed.map((entry) => {
      const pr = record(entry);
      return {
        number: numberValue(pr.number),
        title: String(pr.title ?? ""),
        url: String(pr.url ?? ""),
        classification: "external_open_pr_not_touched_score_lock" as const,
      };
    });
  } catch {
    return [{ number: 0, title: "Unable to parse gh PR list", url: "", classification: "unsafe_unknown" }];
  }
}

function renderDoc(report: ScoreDimension80LockReport) {
  const rows = DIMENSIONS.map((dimension) => {
    const detail = report.dimensions[dimension];
    return `| ${dimension} | ${detail.before} | ${detail.after} | ${detail.status} | ${detail.rootCause} | ${detail.nextAction} |`;
  }).join("\n");
  return `# Score Dimension 80 Lock

Generated: ${report.generatedAtUtc}

Current head: ${report.currentHead}

## Dimension Status

| Dimension | Before | After | Status | Root cause | Next action |
| --- | ---: | ---: | --- | --- | --- |
${rows}

## Remaining Formal Gates

${report.formalGatesRemaining.map((gate) => `- ${gate}`).join("\n") || "- None"}

## Stale Artifacts Remaining

${report.staleArtifactsRemaining.map((artifact) => `- ${artifact.artifactPath}: ${artifact.status}; ${artifact.nextAction}; command=${artifact.refreshCommand ?? "none"}`).join("\n") || "- None"}

## Cost Owner Review Remaining

${report.costOwnerReviewRemaining.map((lane) => `- ${lane.laneId}: ${lane.status}; ${lane.nextAction}`).join("\n") || "- None"}

## In-Flight Lanes

${report.inFlightLanes.map((lane) => `- ${lane.laneId}: ${lane.nextAction}`).join("\n") || "- None"}
`;
}

function main() {
  const head = currentHead();
  const betaAfter = readJson("agent/state/public-beta-score.generated.json");
  const betaBefore = readCommittedJson("agent/state/public-beta-score.generated.json") ?? betaAfter;
  const regression = regressionEvidence();
  const report = buildScoreDimension80LockReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    scoreBefore: scoreFromBeta(betaBefore),
    scoreAfter: scoreFromBeta(betaAfter),
    formalGatesRemaining: formalGatesRemaining(),
    staleArtifacts: staleArtifacts(),
    costOwnerReviewRemaining: costOwnerReviewRemaining(),
    regressionEvidenceRemaining: regression.remaining,
    inFlightLanes: regression.inFlight,
    nonEventScorePenaltyCount: numberValue(betaAfter?.nonEventScorePenaltyCount),
    futureActivityPenaltyCount: 0,
    dirtyFilesClassified: dirtyFiles().map(classifyDirtyFile),
    openPrClassifications: openPrClassifications(),
  });

  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, STATE_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));

  const failures = validateScoreDimension80LockReport(report);
  if (betaAfter?.currentHead !== head) failures.push("score artifact is not current head.");
  if (failures.length > 0) {
    console.error("Score dimension 80 lock validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Score dimension 80 lock passed. below80=${report.dimensionsBelow80.join(",") || "none"}`);
}

main();
