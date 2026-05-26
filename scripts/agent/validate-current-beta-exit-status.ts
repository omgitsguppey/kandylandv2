import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { ArtifactRefreshStatus } from "../../src/lib/agent-score/refresh-safeguards";

export type CurrentBetaExitCheck = {
  command: string;
  status: "passed" | "failed" | "not_run";
  evidence: string;
};

export type CurrentBetaExitStatusReport = {
  generatedAtUtc: string;
  reportKey: "current-beta-exit-status";
  currentHead: string;
  summary: {
    betaVersion: string;
    betaScore: number;
    betaStatus: string;
    scoreVersion?: string;
    healthScore?: number;
    launchGateStatus?: string;
    sourceHealthScore?: number;
    runtimeHealthScore?: number;
    evidenceCompletenessScore?: number;
    freshnessScore?: number;
    costRiskScore?: number;
    regressionRiskScore?: number;
    sourceCleanupP0: number;
    sourceCleanupP1: number;
    userCreatorP0: number;
    userCreatorP1: number;
    economyP0: number;
    economyP1: number;
    visualEvidenceStatus: string;
    providerSmokeStatus: string;
    operatorRevenueSmokeStatus: string;
    operatorRevenueSmokeAmountUsd: number | null;
    operatorRevenueSmokeProduct: string;
    operatorRevenueSmokeConfirmationSource: string;
    operatorRevenueSmokeProviderArtifactAttached: boolean;
    operatorRevenueSmokeFormalProviderSmokePassed: boolean;
    operatorRevenueSmokeBetaGateImpact: string;
    operatorRevenueSmokeNote: string;
    runtimeSmokeStatus: string;
    adminTruthSampleStatus: string;
    cloudRunCostReadiness: string;
    cloudSqlCostReadiness: string;
    geminiCloudAssistCostReadiness: string;
    route4xxReadiness: string;
    errorHandlingSourceStatus?: string;
    analyticsSemanticsSourceStatus?: string;
    speedSecurityStatus: string;
    releaseNotesStatus: string;
    canStartManualScreenshotQa: boolean;
    canStartProviderSmoke: boolean;
    canStartRuntimeSmoke: boolean;
    canStartBetaExitReview: boolean;
  };
  checksRun: CurrentBetaExitCheck[];
  refreshPlan: ArtifactRefreshStatus[];
  staleArtifacts: Array<{
    artifactPath: string;
    reportKey?: string;
    status: string;
    message: string;
    nextAction: string;
    refreshCommand: string | null;
  }>;
  exactRefreshCommands: string[];
  failedChecks: CurrentBetaExitCheck[];
  refreshedArtifacts: string[];
  remainingBlockers: Array<{
    id: string;
    severity: "P0" | "P1" | "P2";
    status: string;
    evidence: string[];
    nextAction: string;
  }>;
  deferredOwnerReview: Array<{
    id: string;
    owner: string;
    reason: string;
    nextAction: string;
  }>;
  nextExactSteps: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportRelativePath = "agent/state/current-beta-exit-status.generated.json";
const reportPath = join(repoRoot, reportRelativePath);

const requiredRepresentedChecks = [
  "npm run check:gumdrop-economy-accuracy",
  "npm run check:creator-experience-simplification",
  "npm run check:post-economy-creator-flow-qa",
  "npm run check:operator-revenue-smoke",
  "npm run check:release-notes",
] as const;

const requiredChecklistRefs = [
  "docs/agent-truth/manual-screenshot-qa-checklist.md",
  "docs/agent-truth/provider-smoke-evidence-checklist.md",
  "docs/agent-truth/runtime-smoke-evidence-checklist.md",
  "docs/agent-truth/admin-truth-sample-evidence-checklist.md",
] as const;

const evidenceCaptureStatusRelativePath = "agent/state/evidence-capture-status.generated.json";
const evidenceCaptureStatusPath = join(repoRoot, evidenceCaptureStatusRelativePath);
const operatorRevenueSmokeRelativePath = "agent/state/operator-revenue-smoke.generated.json";
const operatorRevenueSmokePath = join(repoRoot, operatorRevenueSmokeRelativePath);

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readReport() {
  if (!existsSync(reportPath)) {
    throw new Error(`Missing required report: ${reportRelativePath}`);
  }
  return JSON.parse(readFileSync(reportPath, "utf8")) as CurrentBetaExitStatusReport;
}

function changedInHead(relativePath: string) {
  try {
    const changed = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
    return changed.split(/\r?\n/u).includes(relativePath);
  } catch {
    return false;
  }
}

function parentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD^"], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function matchesCurrentOrSameCommitArtifact(reportHead: string | undefined, head: string) {
  if (reportHead === head) return true;
  return reportHead === parentHead() && changedInHead(reportRelativePath);
}

function evidenceMissing(status: string) {
  if (/\b(false|missing|unverified|unknown|source_only)\b/iu.test(status)) return true;
  return !/\b(pass|passed|attached|formal_.*_passed)\b/iu.test(status);
}

function validScore(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function readEvidenceCaptureStatus() {
  if (!existsSync(evidenceCaptureStatusPath)) return null;
  return JSON.parse(readFileSync(evidenceCaptureStatusPath, "utf8")) as {
    summary?: {
      manualScreenshotEvidence?: string;
      providerSmokeEvidence?: string;
      runtimeSmokeEvidence?: string;
      adminTruthSampleEvidence?: string;
      canStartBetaExitReview?: boolean;
    };
  };
}

function readOperatorRevenueSmoke() {
  if (!existsSync(operatorRevenueSmokePath)) return null;
  return JSON.parse(readFileSync(operatorRevenueSmokePath, "utf8")) as {
    summary?: {
      revenueSmokeStatus?: string;
      amountUsdConfirmed?: number;
      product?: string;
      confirmationSource?: string;
      providerArtifactAttached?: boolean;
      formalProviderSmokePassed?: boolean;
      betaGateImpact?: string;
      canStartBetaExitReview?: boolean;
    };
    plainLanguageNote?: string;
  };
}

export function validateCurrentBetaExitStatusReport(
  report: CurrentBetaExitStatusReport | null,
  head: string,
) {
  const failures: string[] = [];

  if (!report) return ["current-beta-exit-status artifact missing"];
  if (report.reportKey !== "current-beta-exit-status") {
    failures.push("reportKey must be current-beta-exit-status.");
  }
  if (!matchesCurrentOrSameCommitArtifact(report.currentHead, head)) {
    failures.push(`report currentHead must match git HEAD (${head}) or a same-commit generated artifact parent.`);
  }
  if (!report.summary || typeof report.summary !== "object") {
    failures.push("summary is required.");
    return failures;
  }

  const commands = new Set((report.checksRun ?? []).map((check) => check.command));
  for (const command of requiredRepresentedChecks) {
    if (!commands.has(command)) failures.push(`${command} must be represented in checksRun.`);
  }

  if (!report.summary.releaseNotesStatus) {
    failures.push("release notes status must be represented.");
  }
  if (report.summary.scoreVersion !== "beta_health_v2") {
    failures.push("scoreVersion beta_health_v2 must be represented in current beta exit status.");
  }
  for (const key of [
    "healthScore",
    "sourceHealthScore",
    "runtimeHealthScore",
    "evidenceCompletenessScore",
    "freshnessScore",
    "costRiskScore",
    "regressionRiskScore",
  ] as const) {
    if (!validScore(report.summary[key])) {
      failures.push(`${key} must be represented as a 0-100 beta health score.`);
    }
  }
  if (!["source_ready", "runtime_proven", "evidence_complete", "owner_review", "launch_ready", "blocked"].includes(String(report.summary.launchGateStatus))) {
    failures.push("launchGateStatus must be represented as a beta health v2 launch state.");
  }
  if (!report.summary.errorHandlingSourceStatus || !report.summary.errorHandlingSourceStatus.includes("error_handling_source_complete")) {
    failures.push("error handling source readiness must be represented.");
  }
  if (
    !report.summary.analyticsSemanticsSourceStatus
    || !report.summary.analyticsSemanticsSourceStatus.includes("analytics_semantics_source_ready")
    || !report.summary.analyticsSemanticsSourceStatus.includes("runtime_proof_required")
  ) {
    failures.push("analytics semantics source readiness and runtime proof requirement must be represented.");
  }
  const costLaneValues = [
    report.summary.cloudRunCostReadiness,
    report.summary.cloudSqlCostReadiness,
    report.summary.geminiCloudAssistCostReadiness,
    report.summary.route4xxReadiness,
  ];
  if (costLaneValues.some((value) => typeof value !== "string" || value.trim().length === 0)) {
    failures.push("cost readiness lanes must be represented.");
  }
  if (costLaneValues.some((value) => /\bpass(ed)?\b/iu.test(value) && /\bnot_detected_in_repo|config_not_in_repo|source_inventory\b/iu.test(value))) {
    failures.push("cost readiness lanes must not mark source-only or not-detected inventory as pass.");
  }

  const visualMissing = evidenceMissing(report.summary.visualEvidenceStatus);
  const providerMissing = evidenceMissing(report.summary.providerSmokeStatus);
  const runtimeMissing = evidenceMissing(report.summary.runtimeSmokeStatus);
  const operatorRevenueSmoke = readOperatorRevenueSmoke();
  if (operatorRevenueSmoke) {
    const summary = operatorRevenueSmoke.summary ?? {};
    if (report.summary.operatorRevenueSmokeStatus !== "operator_confirmed_revenue_smoke") {
      failures.push("operator-confirmed revenue smoke must be represented in current beta exit status.");
    }
    if (report.summary.operatorRevenueSmokeAmountUsd !== 50 || report.summary.operatorRevenueSmokeProduct !== "GumDrops") {
      failures.push("operator-confirmed revenue smoke amount/product must be represented.");
    }
    if (report.summary.operatorRevenueSmokeConfirmationSource !== "operator_confirmed") {
      failures.push("operator-confirmed revenue smoke source must be represented.");
    }
    if (
      report.summary.operatorRevenueSmokeProviderArtifactAttached
      || report.summary.operatorRevenueSmokeFormalProviderSmokePassed
      || summary.providerArtifactAttached
      || summary.formalProviderSmokePassed
    ) {
      failures.push("operator-confirmed revenue smoke must not clear formal provider evidence.");
    }
    if (report.summary.operatorRevenueSmokeBetaGateImpact !== "product_signal_only") {
      failures.push("operator-confirmed revenue smoke betaGateImpact must be product_signal_only.");
    }
    if (
      report.summary.operatorRevenueSmokeNote
      !== "A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate."
    ) {
      failures.push("operator-confirmed revenue smoke note must separate product signal from formal provider evidence.");
    }
    if (report.summary.providerSmokeStatus !== "missing_formal_evidence") {
      failures.push("provider smoke gate must remain missing_formal_evidence after operator confirmation.");
    }
    if (summary.canStartBetaExitReview === true || report.summary.canStartBetaExitReview) {
      failures.push("operator-confirmed revenue smoke alone must not mark beta exit ready.");
    }
  }

  if ((visualMissing || providerMissing || runtimeMissing) && report.summary.canStartBetaExitReview) {
    failures.push("canStartBetaExitReview must be false while visual/provider/runtime evidence is missing.");
  }
  if (report.summary.launchGateStatus !== "launch_ready" && report.summary.canStartBetaExitReview) {
    failures.push("canStartBetaExitReview must be false until launchGateStatus is launch_ready.");
  }
  if (visualMissing && /\b(pass|passed|complete|completed)\b/iu.test(report.summary.visualEvidenceStatus)) {
    failures.push("visual QA must not be marked passed while screenshot evidence is missing.");
  }
  if ((visualMissing || providerMissing || runtimeMissing) && (report.remainingBlockers?.length ?? 0) === 0) {
    failures.push("remainingBlockers must not be empty while required evidence is missing.");
  }
  if ((report.nextExactSteps?.length ?? 0) === 0) {
    failures.push("nextExactSteps must not be empty.");
  }
  if (!Array.isArray(report.refreshPlan) || report.refreshPlan.length === 0) {
    failures.push("refreshPlan must be represented in current beta exit status.");
  } else {
    const refreshText = JSON.stringify(report.refreshPlan);
    if (!refreshText.includes("agent/state/current-beta-exit-status.generated.json")) {
      failures.push("refreshPlan must include current beta exit status.");
    }
    if (!refreshText.includes("npm run check:current-beta-exit-status")) {
      failures.push("refreshPlan must include current beta exit status refresh command.");
    }
    if (/\bHEAD\b|currentHead/u.test(refreshText)) {
      failures.push("refreshPlan user-facing messages must avoid raw source-control jargon.");
    }
  }
  if (!Array.isArray(report.staleArtifacts)) {
    failures.push("staleArtifacts must be represented in current beta exit status.");
  } else if (report.staleArtifacts.some((entry) => !entry.nextAction || !entry.refreshCommand)) {
    failures.push("current beta staleArtifacts must include nextAction and refreshCommand.");
  }
  if (!Array.isArray(report.exactRefreshCommands) || !report.exactRefreshCommands.includes("npm run check:current-beta-exit-status")) {
    failures.push("exactRefreshCommands must include current beta exit refresh command.");
  }
  const nextSteps = (report.nextExactSteps ?? []).join("\n");
  for (const checklistRef of requiredChecklistRefs) {
    if (!nextSteps.includes(checklistRef)) {
      failures.push(`nextExactSteps must reference ${checklistRef}.`);
    }
  }
  if (!nextSteps.includes(evidenceCaptureStatusRelativePath)) {
    failures.push(`nextExactSteps must reference ${evidenceCaptureStatusRelativePath}.`);
  }
  if (!nextSteps.includes("Manual testing can focus on product behavior because user/creator raw error leaks are source-blocked.")) {
    failures.push("nextExactSteps must include the error handling source-ready manual testing note.");
  }

  const evidenceCaptureStatus = readEvidenceCaptureStatus();
  if (!evidenceCaptureStatus) {
    failures.push(`${evidenceCaptureStatusRelativePath} must exist for current beta exit status validation.`);
  } else {
    const captureSummary = evidenceCaptureStatus.summary ?? {};
    const evidenceCaptureMissing = [
      captureSummary.manualScreenshotEvidence,
      captureSummary.providerSmokeEvidence,
      captureSummary.runtimeSmokeEvidence,
      captureSummary.adminTruthSampleEvidence,
    ].some((status) => status !== "complete");
    if (evidenceCaptureMissing && report.summary.canStartBetaExitReview) {
      failures.push("canStartBetaExitReview must be false while evidence capture status has missing lanes.");
    }
  }

  return failures;
}

function main() {
  let report: CurrentBetaExitStatusReport | null = null;
  const failures: string[] = [];
  try {
    report = readReport();
  } catch (error) {
    failures.push((error as Error).message);
  }

  failures.push(...validateCurrentBetaExitStatusReport(report, currentHead()));

  if (failures.length > 0) {
    console.error("Current beta exit status validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  const summary = report?.summary;
  console.log(
    `Current beta exit status passed. beta=${summary?.betaScore}/${summary?.betaStatus} ` +
      `manualScreenshotQa=${summary?.canStartManualScreenshotQa} ` +
      `providerSmoke=${summary?.canStartProviderSmoke} runtimeSmoke=${summary?.canStartRuntimeSmoke}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
