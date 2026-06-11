import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type JsonRecord = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");

export const FINAL_BETA_EXIT_GATE_READINESS_STATE_PATH = "agent/state/final-beta-exit-gate-readiness.generated.json";
export const FINAL_BETA_EXIT_GATE_READINESS_DOC_PATH = "docs/agent-truth/final-beta-exit-gate-readiness.md";

type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "final_gate_validator"
  | "final_gate_test"
  | "package_script_wiring"
  | "release_artifact_expected"
  | "score_evidence_artifact"
  | "unrelated_agent_context_file_to_ignore"
  | "unsafe_unknown";

type OpenPrClassification =
  | "dependency_update_external_review_required"
  | "security_patch_external_review_required"
  | "performance_patch_external_review_required"
  | "accessibility_patch_external_review_required"
  | "unknown_unclassified";

type StaleArtifactClassification =
  | "refreshed"
  | "retired_superseded"
  | "formal_evidence_required"
  | "in_flight"
  | "refresh_required"
  | "unknown_unclassified";

type OpenPrSummary = {
  number: number;
  title: string;
  url?: string;
  mergeStateStatus?: string;
  author?: { login?: string; is_bot?: boolean };
};

type ClassifiedOpenPr = OpenPrSummary & {
  classification: OpenPrClassification;
  nextAction: string;
};

type StaleArtifactSummary = {
  artifactPath: string;
  status?: string;
  classification: StaleArtifactClassification;
  refreshCommand?: string;
  nextAction: string;
};

type DimensionRow = {
  before: number;
  after: number;
  target: number;
  status: "above_target" | "below_target";
  nextExactAction: string;
};

export type FinalBetaExitGateReadinessReport = {
  generatedAtUtc: string;
  reportKey: "final-beta-exit-gate-readiness";
  currentHead: string;
  status: "pass" | "fail";
  scoreBefore: number;
  scoreAfter: number;
  dimensions: Record<string, DimensionRow>;
  dimensionsAbove80: string[];
  dimensionsBelow80: string[];
  launchGateStatus: string;
  launchBlockers: string[];
  blockerClassifications: Array<{
    blocker: string;
    classification: string;
    nextAction: string;
  }>;
  staleArtifactsRemaining: StaleArtifactSummary[];
  openPrsRemaining: ClassifiedOpenPr[];
  costReviewRemaining: Array<{
    lane: string;
    classification: "source_guarded_external_review_remaining";
    nextAction: string;
  }>;
  formalEvidenceRemaining: string[];
  operatorFinalChecklist: string[];
  betaExitReady: boolean;
  nextExactSteps: string[];
  dirtyFiles: Array<{ path: string; classification: DirtyFileClassification }>;
  evidence: string[];
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  deployPerformed: false;
  productRuntimeChanged: false;
  paymentRuntimeChanged: false;
  gumdropMathChanged: false;
  validationFailures: string[];
};

type BuildInput = {
  generatedAtUtc?: string;
  currentHead?: string;
  publicBetaScore?: JsonRecord;
  launchBlockerClosure?: JsonRecord;
  freshnessWindowRepair?: JsonRecord;
  costRiskExitPass?: JsonRecord;
  openPrs?: OpenPrSummary[];
  dirtyFiles?: string[];
};

function shell(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, [...args], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(relativePath: string): JsonRecord | null {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function currentDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of shell("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function readOpenPrsFromGh(): OpenPrSummary[] {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const output = shell("gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,url,mergeStateStatus",
  ]);
  if (!output) return [];
  try {
    const parsed = JSON.parse(output) as unknown;
    return Array.isArray(parsed) ? parsed as OpenPrSummary[] : [];
  } catch {
    return [];
  }
}

export function classifyFinalGateDirtyFile(filePath: string): DirtyFileClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === FINAL_BETA_EXIT_GATE_READINESS_STATE_PATH || normalized === FINAL_BETA_EXIT_GATE_READINESS_DOC_PATH) {
    return "current_generated_artifact_to_commit";
  }
  if (normalized === "scripts/agent/validate-final-beta-exit-gate-readiness.ts") return "final_gate_validator";
  if (normalized === "tests/unit/final-beta-exit-gate-readiness.spec.ts") return "final_gate_test";
  if (normalized === "package.json") return "package_script_wiring";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized.startsWith("src/lib/release-notes/")
  ) return "release_artifact_expected";
  if (/payment|paypal|wallet|gumdrop-ledger|source-of-funds|top-nav|bottom-nav|src\/app\/api\/chat|src\/components\/Chat/iu.test(normalized)) {
    return "unsafe_unknown";
  }
  if (/^agent\/state\/.+\.generated\.json$/u.test(normalized) || /^docs\/agent-truth\/.+\.md$/u.test(normalized)) {
    return "score_evidence_artifact";
  }
  return "unsafe_unknown";
}

function classifyOpenPr(pr: OpenPrSummary): ClassifiedOpenPr {
  const title = pr.title;
  const bot = pr.author?.is_bot === true || /dependabot/iu.test(pr.author?.login ?? "");
  if (bot || /chore\(deps\)|bump /iu.test(title)) {
    return {
      ...pr,
      classification: "dependency_update_external_review_required",
      nextAction: `Review dependency PR #${pr.number}, then merge or close it outside this final gate lock.`,
    };
  }
  if (/sentinel|security|insecure|random|redirect|xss|csrf|high/iu.test(title)) {
    return {
      ...pr,
      classification: "security_patch_external_review_required",
      nextAction: `Review security PR #${pr.number}, port current-source-safe changes if needed, then close or merge intentionally.`,
    };
  }
  if (/bolt|performance|map lookup|duplicate|optimi[sz]e|hotspot/iu.test(title)) {
    return {
      ...pr,
      classification: "performance_patch_external_review_required",
      nextAction: `Review performance PR #${pr.number} against current source before merge or close.`,
    };
  }
  if (/palette|aria|accessible|loading state|a11y/iu.test(title)) {
    return {
      ...pr,
      classification: "accessibility_patch_external_review_required",
      nextAction: `Review accessibility PR #${pr.number} against current source before merge or close.`,
    };
  }
  return {
    ...pr,
    classification: "unknown_unclassified",
    nextAction: `Classify PR #${pr.number} before closing final gate PR integrity.`,
  };
}

function buildDimensions(publicBetaScore: JsonRecord) {
  const explanations = record(publicBetaScore.scoreDimensionExplanations);
  const rows: Record<string, DimensionRow> = {
    sourceHealth: buildDimension("sourceHealth", numberValue(publicBetaScore.sourceHealthScore), explanations),
    runtimeHealth: buildDimension("runtimeHealth", numberValue(publicBetaScore.runtimeHealthScore), explanations),
    evidenceCompleteness: buildDimension("evidenceCompleteness", numberValue(publicBetaScore.evidenceCompletenessScore), explanations),
    freshness: buildDimension("freshness", numberValue(publicBetaScore.freshnessScore), explanations),
    costRisk: buildDimension("costRisk", numberValue(publicBetaScore.costRiskScore), explanations),
    regressionRisk: buildDimension("regressionRisk", numberValue(publicBetaScore.regressionRiskScore), explanations),
    overallHealthScore: buildDimension("overallHealthScore", numberValue(publicBetaScore.healthScore, numberValue(publicBetaScore.overallScore)), explanations),
  };
  return rows;
}

function buildDimension(id: string, after: number, explanations: JsonRecord): DimensionRow {
  const explanation = record(explanations[id]);
  const target = numberValue(explanation.target, 80);
  return {
    before: numberValue(explanation.before, after),
    after,
    target,
    status: after >= target ? "above_target" : "below_target",
    nextExactAction: stringValue(explanation.nextExactAction, after >= target ? "No score action needed for this dimension." : ""),
  };
}

function classifyStaleArtifacts(publicBetaScore: JsonRecord, freshnessWindowRepair: JsonRecord): StaleArtifactSummary[] {
  const freshnessRows = new Map<string, JsonRecord>();
  for (const row of arrayValue(freshnessWindowRepair.staleReports)) {
    const entry = record(row);
    const artifactPath = stringValue(entry.artifactPath);
    if (artifactPath) freshnessRows.set(artifactPath, entry);
  }
  return arrayValue(publicBetaScore.staleArtifacts).map((raw) => {
    const artifact = record(raw);
    const artifactPath = stringValue(artifact.artifactPath);
    const freshness = freshnessRows.get(artifactPath);
    const classification = stringValue(freshness?.classification) as StaleArtifactClassification;
    const nextAction = stringValue(freshness?.nextAction, stringValue(artifact.nextAction, stringValue(artifact.refreshCommand, "")));
    return {
      artifactPath,
      status: stringValue(artifact.status, undefined as unknown as string),
      classification: classification || (nextAction ? "refresh_required" : "unknown_unclassified"),
      refreshCommand: stringValue(artifact.refreshCommand, undefined as unknown as string),
      nextAction,
    };
  });
}

function buildBlockerClassifications(publicBetaScore: JsonRecord, launchBlockerClosure: JsonRecord) {
  const blockers = record(launchBlockerClosure.blockers);
  const blockerEntries = Object.values(blockers)
    .map((value) => record(value))
    .filter((value) => Object.keys(value).length > 0);
  const fallbackBlockers = arrayValue(publicBetaScore.launchBlockers).map((blocker) => ({
    blocker: String(blocker),
    classification: "cannot_close_without_manual_or_runtime_artifact",
    nextAction: "Classify blocker through launch-blocker-evidence-closure.",
  }));
  if (blockerEntries.length === 0) return fallbackBlockers;
  return blockerEntries.map((blocker) => ({
    blocker: stringValue(blocker.label, stringValue(blocker.id, "unknown_blocker")),
    classification: stringValue(blocker.classification, "unknown_unclassified"),
    nextAction: stringValue(blocker.nextAction),
  }));
}

function formalEvidenceRemaining(launchBlockerClosure: JsonRecord) {
  const remaining = arrayValue(launchBlockerClosure.remainingLaunchBlockers)
    .map((entry) => String(entry))
    .filter(Boolean);
  const formal = remaining.filter((entry) => /formal|runtime|provider|admin.*sample|production_admin_truth_sample/iu.test(entry));
  return formal.length > 0 ? formal : ["formal_provider_smoke", "deployed_runtime_smoke", "production_admin_truth_sample"];
}

function costReviewRemaining(costRiskExitPass: JsonRecord) {
  const steps = arrayValue(costRiskExitPass.nextExactSteps).map((entry) => String(entry));
  return arrayValue(costRiskExitPass.externalBillingRemaining)
    .map((entry) => String(entry))
    .filter(Boolean)
    .map((lane) => ({
      lane,
      classification: "source_guarded_external_review_remaining" as const,
      nextAction: steps.find((step) => step.toLowerCase().startsWith(`${lane.toLowerCase()}:`)) ?? `Complete external billing review for ${lane}.`,
    }));
}

export function buildFinalBetaExitGateReadinessReport(input: BuildInput = {}): FinalBetaExitGateReadinessReport {
  const currentHead = input.currentHead ?? shell("git", ["rev-parse", "HEAD"]);
  const publicBetaScore = input.publicBetaScore ?? readJson("agent/state/public-beta-score.generated.json") ?? {};
  const launchBlockerClosure = input.launchBlockerClosure ?? readJson("agent/state/launch-blocker-evidence-closure.generated.json") ?? {};
  const freshnessWindowRepair = input.freshnessWindowRepair ?? readJson("agent/state/freshness-window-repair.generated.json") ?? {};
  const costRiskExitPass = input.costRiskExitPass ?? readJson("agent/state/cost-risk-exit-pass.generated.json") ?? {};
  const dimensions = buildDimensions(publicBetaScore);
  const dimensionsAbove80 = Object.entries(dimensions).filter(([, row]) => row.status === "above_target").map(([id]) => id);
  const dimensionsBelow80 = Object.entries(dimensions).filter(([, row]) => row.status === "below_target").map(([id]) => id);
  const staleArtifactsRemaining = classifyStaleArtifacts(publicBetaScore, freshnessWindowRepair);
  const openPrsRemaining = (input.openPrs ?? readOpenPrsFromGh()).map(classifyOpenPr);
  const formalRemaining = formalEvidenceRemaining(launchBlockerClosure);
  const costRemaining = costReviewRemaining(costRiskExitPass);
  const blockerClassifications = buildBlockerClassifications(publicBetaScore, launchBlockerClosure);
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((path) => ({
    path,
    classification: classifyFinalGateDirtyFile(path),
  }));
  const nextExactSteps = [
    ...dimensionsBelow80.map((dimension) => `${dimension}: ${dimensions[dimension]?.nextExactAction ?? ""}`),
    ...blockerClassifications.filter((blocker) => blocker.classification !== "can_close_now").map((blocker) => `${blocker.blocker}: ${blocker.nextAction}`),
    ...openPrsRemaining.map((pr) => `PR #${pr.number}: ${pr.nextAction}`),
    ...staleArtifactsRemaining.map((artifact) => `${artifact.artifactPath}: ${artifact.nextAction}`),
    ...costRemaining.map((lane) => `${lane.lane}: ${lane.nextAction}`),
    "operator_final_visual_review: Complete manual visual review outside Codex score blocking.",
  ].filter((step) => step.trim().length > 0);
  const betaExitReady = stringValue(publicBetaScore.launchGateStatus) === "ready"
    && formalRemaining.length === 0
    && openPrsRemaining.length === 0
    && staleArtifactsRemaining.length === 0
    && dimensionsBelow80.length === 0;
  const report: FinalBetaExitGateReadinessReport = {
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    reportKey: "final-beta-exit-gate-readiness",
    currentHead,
    status: "pass",
    scoreBefore: numberValue(publicBetaScore.healthScore, numberValue(publicBetaScore.overallScore)),
    scoreAfter: numberValue(publicBetaScore.healthScore, numberValue(publicBetaScore.overallScore)),
    dimensions,
    dimensionsAbove80,
    dimensionsBelow80,
    launchGateStatus: stringValue(publicBetaScore.launchGateStatus, "owner_review"),
    launchBlockers: arrayValue(publicBetaScore.launchBlockers).map((entry) => String(entry)),
    blockerClassifications,
    staleArtifactsRemaining,
    openPrsRemaining,
    costReviewRemaining: costRemaining,
    formalEvidenceRemaining: formalRemaining,
    operatorFinalChecklist: [
      "operator_final_visual_review",
      "manual_screenshot_qa",
      "provider_smoke_artifact_attachment",
      "deployed_runtime_smoke_artifact_attachment",
      "redacted_admin_truth_sample_attachment",
    ],
    betaExitReady,
    nextExactSteps,
    dirtyFiles,
    evidence: [
      `currentHead=${currentHead}`,
      `scoreArtifactHead=${stringValue(publicBetaScore.currentHead)}`,
      `healthScore=${numberValue(publicBetaScore.healthScore, numberValue(publicBetaScore.overallScore))}`,
      `launchGateStatus=${stringValue(publicBetaScore.launchGateStatus, "owner_review")}`,
      `openPrCount=${openPrsRemaining.length}`,
      `staleArtifactCount=${staleArtifactsRemaining.length}`,
      `formalEvidenceRemaining=${formalRemaining.length}`,
      "productionReadsPerformed=false",
      "providerCallsPerformed=false",
      "deployPerformed=false",
    ],
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    deployPerformed: false,
    productRuntimeChanged: false,
    paymentRuntimeChanged: false,
    gumdropMathChanged: false,
    validationFailures: [],
  };
  report.validationFailures = validateFinalBetaExitGateReadinessReport(report, publicBetaScore);
  report.status = report.validationFailures.length === 0 ? "pass" : "fail";
  return report;
}

export function validateFinalBetaExitGateReadinessReport(report: FinalBetaExitGateReadinessReport, publicBetaScore?: JsonRecord) {
  const failures: string[] = [];
  if (report.reportKey !== "final-beta-exit-gate-readiness") failures.push("reportKey must be final-beta-exit-gate-readiness.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable UTC.");
  if (!report.currentHead) failures.push("currentHead missing.");
  const scoreHead = stringValue(publicBetaScore?.currentHead, report.evidence.find((entry) => entry.startsWith("scoreArtifactHead="))?.replace("scoreArtifactHead=", ""));
  if (scoreHead !== report.currentHead) failures.push("score artifact is not current head.");
  if (report.openPrsRemaining.some((pr) => pr.classification === "unknown_unclassified")) failures.push("open PRs unclassified.");
  if (report.staleArtifactsRemaining.some((artifact) => artifact.classification === "unknown_unclassified" || !artifact.nextAction)) {
    failures.push("stale required reports unclassified.");
  }
  if (report.dimensionsBelow80.some((dimension) => !report.dimensions[dimension]?.nextExactAction)) {
    failures.push("below80 dimension lacks exact next action.");
  }
  if (report.launchBlockers.length > 0 && report.blockerClassifications.some((blocker) => !blocker.classification || !blocker.nextAction)) {
    failures.push("launch blocker lacks classification.");
  }
  if (report.betaExitReady && report.formalEvidenceRemaining.length > 0) failures.push("betaExitReady true while formal blockers remain.");
  if (report.betaExitReady && report.launchGateStatus !== "ready") failures.push("betaExitReady true while formal blockers remain.");
  if (report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");
  if (report.productionReadsPerformed || report.providerCallsPerformed || report.deployPerformed) {
    failures.push("production/provider/deploy actions are not allowed.");
  }
  if (report.productRuntimeChanged || report.paymentRuntimeChanged || report.gumdropMathChanged) {
    failures.push("product runtime/payment/GumDrop math changed.");
  }
  if (Object.keys(report.dimensions).length === 0) failures.push("score dimensions missing.");
  if (report.operatorFinalChecklist.length === 0) failures.push("operator final checklist missing.");
  return Array.from(new Set(failures));
}

function renderDoc(report: FinalBetaExitGateReadinessReport) {
  const dimensionRows = Object.entries(report.dimensions)
    .map(([dimension, row]) => `| ${dimension} | ${row.before} | ${row.after} | ${row.target} | ${row.status} | ${row.nextExactAction.replace(/\|/gu, "/")} |`)
    .join("\n");
  const blockerRows = report.blockerClassifications
    .map((blocker) => `| ${blocker.blocker.replace(/\|/gu, "/")} | ${blocker.classification} | ${blocker.nextAction.replace(/\|/gu, "/")} |`)
    .join("\n");
  const prRows = report.openPrsRemaining
    .map((pr) => `| #${pr.number} | ${pr.title.replace(/\|/gu, "/")} | ${pr.mergeStateStatus ?? "unknown"} | ${pr.classification} | ${pr.nextAction.replace(/\|/gu, "/")} |`)
    .join("\n");
  const staleRows = report.staleArtifactsRemaining
    .map((artifact) => `| ${artifact.artifactPath} | ${artifact.status ?? "unknown"} | ${artifact.classification} | ${artifact.nextAction.replace(/\|/gu, "/")} |`)
    .join("\n");
  const dirtyRows = report.dirtyFiles
    .map((entry) => `| ${entry.path} | ${entry.classification} |`)
    .join("\n");
  return `# Final Beta Exit Gate Readiness

Status: \`${report.status}\`
Artifact: \`${FINAL_BETA_EXIT_GATE_READINESS_STATE_PATH}\`
Validator: \`npm run check:final-beta-exit-gate-readiness\`

## Summary

- Current head: \`${report.currentHead}\`
- Score: ${report.scoreBefore} -> ${report.scoreAfter}
- Launch gate status: \`${report.launchGateStatus}\`
- Beta exit ready: ${report.betaExitReady}
- Dimensions above 80: ${report.dimensionsAbove80.join(", ") || "none"}
- Dimensions below 80: ${report.dimensionsBelow80.join(", ") || "none"}
- Open PRs remaining: ${report.openPrsRemaining.length}
- Stale artifacts remaining: ${report.staleArtifactsRemaining.length}
- Formal evidence remaining: ${report.formalEvidenceRemaining.join(", ") || "none"}
- Production reads/provider calls/deploys performed: false

## Score Dimensions

| Dimension | Before | After | Target | Status | Next action |
| --- | ---: | ---: | ---: | --- | --- |
${dimensionRows}

## Launch Blockers

| Blocker | Classification | Next action |
| --- | --- | --- |
${blockerRows || "| None | can_close_now | No blocker action remains. |"}

## Open PRs

| PR | Title | Merge state | Classification | Next action |
| --- | --- | --- | --- | --- |
${prRows || "| None | - | - | can_close_now | No open PRs remain. |"}

## Stale Artifacts

| Artifact | Status | Classification | Next action |
| --- | --- | --- | --- |
${staleRows || "| None | - | - | No stale artifacts remain. |"}

## Cost Review

${report.costReviewRemaining.map((lane) => `- ${lane.lane}: ${lane.nextAction}`).join("\n") || "- No cost owner review remains."}

## Operator Final Checklist

${report.operatorFinalChecklist.map((item) => `- ${item}`).join("\n")}

## Dirty File Classification

| File | Classification |
| --- | --- |
${dirtyRows || "| None | - |"}

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n") || "- No source-evidence action remains."}

## Boundary

This lock does not clear formal provider smoke, deployed runtime smoke, production admin truth samples, external billing review, or operator visual review. It records the current source and artifact state only.

## Validation

${report.validationFailures.length > 0 ? report.validationFailures.map((failure) => `- FAIL: ${failure}`).join("\n") : "- Pass."}
`;
}

function main() {
  const report = buildFinalBetaExitGateReadinessReport();
  mkdirSync(join(ROOT, dirname(FINAL_BETA_EXIT_GATE_READINESS_STATE_PATH)), { recursive: true });
  mkdirSync(join(ROOT, dirname(FINAL_BETA_EXIT_GATE_READINESS_DOC_PATH)), { recursive: true });
  writeFileSync(join(ROOT, FINAL_BETA_EXIT_GATE_READINESS_STATE_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, FINAL_BETA_EXIT_GATE_READINESS_DOC_PATH), renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Final beta exit gate readiness validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `Final beta exit gate readiness passed. score=${report.scoreAfter} ` +
    `gate=${report.launchGateStatus} betaExitReady=${report.betaExitReady}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
