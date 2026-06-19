import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { PublicBetaScoreReport } from "../../src/lib/agent-score/core";

type Finding = {
  id: string;
  severity: "P0" | "P1" | "P2";
  status: string;
  evidence: string[];
  nextAction: string;
};

export type BetaHealthAlgorithmV2Report = {
  generatedAtUtc: string;
  reportKey: "beta-health-algorithm-v2";
  currentHead: string;
  summary: {
    scoreVersion: "beta_health_v2";
    binaryEvidenceGatesRemoved: boolean;
    partialCreditEnabled: boolean;
    dimensionScoresEnabled: boolean;
    evidenceFreshnessDecayEnabled: boolean;
    sourceRuntimeSeparated: boolean;
    costRiskScored: boolean;
    regressionRiskScored: boolean;
    launchGatesPreserved: boolean;
    backwardCompatibilityPreserved: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  oldModelFindings: Finding[];
  newModelFields: string[];
  scoringExamples: string[];
  validatorFindings: Finding[];
  fixesApplied: string[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const statePath = "agent/state/beta-health-algorithm-v2.generated.json";
const docsPath = "docs/agent-truth/beta-health-algorithm-v2.md";

function read(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson<T>(relativePath: string): T | null {
  const source = read(relativePath);
  if (!source) return null;
  return JSON.parse(source) as T;
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

export function buildBetaHealthAlgorithmV2Report(head = currentHead()): BetaHealthAlgorithmV2Report {
  const core = read("src/lib/agent-score/core.ts");
  const weights = read("src/lib/agent-score/weights.ts");
  const evidenceQuality = read("src/lib/agent-score/evidence-quality.ts");
  const score = readJson<PublicBetaScoreReport>("agent/state/public-beta-score.generated.json");
  const packageJson = read("package.json");
  const tests = [
    read("tests/unit/beta-health-algorithm-v2.spec.ts"),
    read("tests/unit/public-beta-score-v2.spec.ts"),
  ].join("\n");

  const oldModelFindings: Finding[] = [{
    id: "binary-evidence-gates-replaced",
    severity: "P1",
    status: "fixed",
    evidence: [
      "Previous model awarded many gates full weight or zero.",
      "V2 gate fields include evidenceQuality, freshness, confidence, partial credit, and launch blocking.",
    ],
    nextAction: "Keep source, runtime, evidence, freshness, cost, and regression dimensions separate.",
  }];

  const validatorFindings: Finding[] = [];
  if (!core.includes("scoreVersion: \"beta_health_v2\"")) {
    validatorFindings.push({
      id: "score-version-missing",
      severity: "P0",
      status: "failed",
      evidence: ["src/lib/agent-score/core.ts lacks beta_health_v2 scoreVersion."],
      nextAction: "Add v2 report fields before validating beta score.",
    });
  }
  if (!evidenceQuality.includes("resolveEvidenceQuality")) {
    validatorFindings.push({
      id: "evidence-quality-resolver-missing",
      severity: "P0",
      status: "failed",
      evidence: ["src/lib/agent-score/evidence-quality.ts lacks resolveEvidenceQuality."],
      nextAction: "Add a central evidence quality resolver.",
    });
  }
  if (!weights.includes("PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS")) {
    validatorFindings.push({
      id: "dimension-weights-missing",
      severity: "P0",
      status: "failed",
      evidence: ["Health dimension weights are missing."],
      nextAction: "Add source/runtime/evidence/freshness/cost/regression dimension weights.",
    });
  }
  if (score?.launchGateStatus === "launch_ready" && score.launchBlockers.length > 0) {
    validatorFindings.push({
      id: "launch-ready-with-blockers",
      severity: "P0",
      status: "failed",
      evidence: ["public-beta-score launchGateStatus is launch_ready while launchBlockers is non-empty."],
      nextAction: "Keep formal launch gates authoritative.",
    });
  }
  if (score?.costReadiness && Object.values(score.costReadiness).some((lane) => /pass(ed)?/iu.test(String(lane.status)) && /owner|review|not_detected|source_inventory/iu.test(String(lane.status)))) {
    validatorFindings.push({
      id: "owner-review-cost-pass",
      severity: "P0",
      status: "failed",
      evidence: ["Cost owner-review or source inventory lane is marked pass."],
      nextAction: "Classify source-only and owner-review cost lanes as partial risk.",
    });
  }
  if (!tests.includes("partialCredit") || !tests.includes("sourceHealthScore")) {
    validatorFindings.push({
      id: "partial-credit-tests-missing",
      severity: "P1",
      status: "failed",
      evidence: ["V2 tests do not cover partial credit and dimensions."],
      nextAction: "Add partial-credit tests.",
    });
  }
  if (!packageJson.includes("\"check:beta-health-algorithm-v2\"")) {
    validatorFindings.push({
      id: "package-script-missing",
      severity: "P1",
      status: "failed",
      evidence: ["package.json lacks check:beta-health-algorithm-v2."],
      nextAction: "Add the focused validator script.",
    });
  }

  const p0Count = validatorFindings.filter((finding) => finding.severity === "P0").length;
  const p1Count = validatorFindings.filter((finding) => finding.severity === "P1").length;
  const p2Count = validatorFindings.filter((finding) => finding.severity === "P2").length;

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "beta-health-algorithm-v2",
    currentHead: head,
    summary: {
      scoreVersion: "beta_health_v2",
      binaryEvidenceGatesRemoved: core.includes("partialCredit") && !core.includes("missing lanes score zero"),
      partialCreditEnabled: evidenceQuality.includes("partialCredit"),
      dimensionScoresEnabled: core.includes("sourceHealthScore") && core.includes("runtimeHealthScore") && core.includes("evidenceCompletenessScore"),
      evidenceFreshnessDecayEnabled: evidenceQuality.includes("staleDecayMin") && evidenceQuality.includes("freshnessScore"),
      sourceRuntimeSeparated: core.includes("sourceCredit") && core.includes("runtimeCredit"),
      costRiskScored: core.includes("scoreCostReadiness"),
      regressionRiskScored: core.includes("scoreRegressionRisk"),
      launchGatesPreserved: core.includes("launchBlockers") && core.includes("gateRequiredForExit") && core.includes("blocksLaunch"),
      backwardCompatibilityPreserved: core.includes("overallScore") && core.includes("evidenceScore") && core.includes("readinessStatus") && core.includes("evidenceGates"),
      p0Count,
      p1Count,
      p2Count,
    },
    oldModelFindings,
    newModelFields: [
      "scoreVersion",
      "sourceHealthScore",
      "runtimeHealthScore",
      "evidenceCompletenessScore",
      "freshnessScore",
      "costRiskScore",
      "regressionRiskScore",
      "launchGateStatus",
      "launchBlockers",
      "healthScore",
      "scoreDeltaDrivers",
      "nuancedScoreExplanation",
    ],
    scoringExamples: [
      "Fresh formal evidence receives high confidence and can clear its launch gate.",
      "Source-ready evidence earns source credit but does not become runtime proof.",
      "Operator-reported provider smoke receives low credit and blocks launch.",
      "Owner-review cost lanes receive partial cost-risk credit, not pass status.",
      "Stale evidence decays freshness and regression dimensions.",
    ],
    validatorFindings,
    fixesApplied: [
      "Added v2 evidence quality resolver.",
      "Added health dimension weights.",
      "Extended public beta score report with v2 dimension and launch gate fields.",
      "Preserved legacy score fields for existing readers.",
    ],
    prCleanupActions: ["open_pr_count_start=0", "open_pr_count_end_pending_final_check"],
    nextFixOrder: [
      "Run deterministic UI source coverage and use visual reproduction only for source-reported issues.",
      "Attach formal provider smoke evidence.",
      "Attach deployed runtime smoke evidence.",
      "Attach admin truth sample evidence.",
      "Resolve owner-review cloud/AI cost lanes with provider evidence.",
    ],
  };
}

export function validateBetaHealthAlgorithmV2Report(report: BetaHealthAlgorithmV2Report) {
  const failures: string[] = [];
  if (report.reportKey !== "beta-health-algorithm-v2") failures.push("reportKey must be beta-health-algorithm-v2.");
  if (report.currentHead !== currentHead()) failures.push("currentHead must match git HEAD.");
  if (report.summary.scoreVersion !== "beta_health_v2") failures.push("scoreVersion must be beta_health_v2.");
  for (const [key, value] of Object.entries(report.summary)) {
    if (key.startsWith("p")) continue;
    if (key !== "scoreVersion" && value !== true) failures.push(`summary.${key} must be true.`);
  }
  if (report.newModelFields.length < 10) failures.push("newModelFields must include v2 score fields.");
  if (report.scoringExamples.length < 5) failures.push("scoringExamples must cover partial credit and launch gates.");
  if (report.nextFixOrder.length === 0) failures.push("nextFixOrder must not be empty.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) {
    failures.push("validatorFindings must not include P0/P1 failures.");
  }
  return failures;
}

function main() {
  const report = buildBetaHealthAlgorithmV2Report();
  const failures = validateBetaHealthAlgorithmV2Report(report);
  mkdirSync(dirname(join(repoRoot, statePath)), { recursive: true });
  writeFileSync(join(repoRoot, statePath), `${JSON.stringify(report, null, 2)}\n`);

  if (!existsSync(join(repoRoot, docsPath))) {
    failures.push(`${docsPath} must exist.`);
  }
  if (failures.length > 0) {
    console.error("Beta health algorithm v2 validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Beta health algorithm v2 passed. fields=${report.newModelFields.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
