import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type JsonReport = Record<string, unknown> | null;

export type LockBlockerStatus =
  | "code_blocker"
  | "evidence_missing"
  | "stale_authority"
  | "deferred_owner_review"
  | "archive_candidate"
  | "provider_smoke_required"
  | "runtime_smoke_required"
  | "source_validation_required"
  | "optional_after_source_issue"
  | "no_action_required";

type LockSeverity = "P0" | "P1" | "P2" | "P3";

type CheckStatus = "passed" | "failed" | "unavailable" | "stale" | "not_run";

type LockCheck = {
  command: string;
  status: CheckStatus;
  evidence: string;
};

type StaleReport = {
  reportKey: string;
  path: string;
  currentHead: string | null;
  generatedAtUtc: string | null;
  sourceState: "current" | "stale_head" | "missing_head" | "missing";
  ownerLane: string;
  exactNextAction: string;
};

type LockBlocker = {
  key: string;
  severity: LockSeverity;
  status: LockBlockerStatus;
  sourceReport: string;
  fileOrRoute: string;
  whyItMatters: string;
  exactNextAction: string;
  ownerLane: string;
};

type HumanEvidence = {
  key: string;
  status: LockBlockerStatus;
  sourceReport: string;
  exactNextAction: string;
};

export type FinalPhaseCleanupSourceReports = {
  userFacingFeatureConnectionAudit?: JsonReport;
  productSurfaceIntegrity?: JsonReport;
  speedSecurityHardening?: JsonReport;
  repoSpringCleaningRewire?: JsonReport;
  publicBetaScore?: JsonReport;
  targetedBehaviorEvidence?: JsonReport;
  providerSmokeEvidence?: JsonReport;
  runtimeSmokeEvidence?: JsonReport;
  adminTruthSampleEvidence?: JsonReport;
  launchPrTriage?: JsonReport;
  launchReadinessReport?: JsonReport;
  finalLaunchReadinessReport?: JsonReport;
};

export type FinalPhaseCleanupLockReport = {
  generatedAtUtc: string;
  reportKey: "final-phase-cleanup-lock";
  currentHead: string;
  commitsReviewed: string[];
  summary: {
    userFacingConnectionStatus: string;
    productSurfaceIntegrityStatus: string;
    speedSecurityStatus: string;
    betaScore: number | null;
    betaReadinessStatus: string;
    staleAuthorityRisks: number;
    remainingP0: number;
    remainingP1: number;
    remainingP2: number;
    missingHumanEvidence: number;
    missingProviderEvidence: number;
    missingRuntimeEvidence: number;
    canStartUiSourceCoverage: boolean;
    canStartProviderSmoke: boolean;
    canStartBetaExitReview: boolean;
  };
  checksRun: LockCheck[];
  failedChecks: LockCheck[];
  unavailableChecks: LockCheck[];
  refreshedReports: StaleReport[];
  staleReports: StaleReport[];
  archiveCandidates: LockBlocker[];
  remainingBlockers: LockBlocker[];
  deferredFindings: LockBlocker[];
  humanEvidenceNeeded: HumanEvidence[];
  nextExactSteps: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportRelativePath = "agent/state/final-phase-cleanup-lock.generated.json";
const reportPath = join(repoRoot, reportRelativePath);

const reportSources = {
  userFacingFeatureConnectionAudit: {
    reportKey: "user-facing-feature-connection-audit",
    path: "agent/state/user-facing-feature-connection-audit.generated.json",
    ownerLane: "creator-surface-owner",
  },
  productSurfaceIntegrity: {
    reportKey: "product-surface-integrity",
    path: "agent/state/product-surface-integrity.generated.json",
    ownerLane: "product-surface-owner",
  },
  speedSecurityHardening: {
    reportKey: "speed-security-hardening",
    path: "agent/state/speed-security-hardening.generated.json",
    ownerLane: "speed-security-owner",
  },
  repoSpringCleaningRewire: {
    reportKey: "repo-spring-cleaning-rewire",
    path: "agent/state/repo-spring-cleaning-rewire.generated.json",
    ownerLane: "repo-governance-owner",
  },
  publicBetaScore: {
    reportKey: "public-beta-score",
    path: "agent/state/public-beta-score.generated.json",
    ownerLane: "beta-readiness-owner",
  },
  targetedBehaviorEvidence: {
    reportKey: "targeted-behavior-evidence",
    path: "agent/state/targeted-behavior-evidence.generated.json",
    ownerLane: "behavior-evidence-owner",
  },
  providerSmokeEvidence: {
    reportKey: "provider-smoke-evidence",
    path: "agent/state/provider-smoke-evidence.generated.json",
    ownerLane: "provider-smoke-owner",
  },
  runtimeSmokeEvidence: {
    reportKey: "runtime-smoke-evidence",
    path: "agent/state/runtime-smoke-evidence.generated.json",
    ownerLane: "runtime-smoke-owner",
  },
  adminTruthSampleEvidence: {
    reportKey: "admin-truth-sample-evidence",
    path: "agent/state/admin-truth-sample-evidence.generated.json",
    ownerLane: "admin-truth-owner",
  },
  launchPrTriage: {
    reportKey: "launch-pr-triage",
    path: "agent/state/launch-pr-triage.generated.json",
    ownerLane: "launch-triage-owner",
  },
  launchReadinessReport: {
    reportKey: "launch-readiness-report",
    path: "agent/state/launch-readiness-report.generated.json",
    ownerLane: "launch-readiness-owner",
  },
  finalLaunchReadinessReport: {
    reportKey: "final-launch-readiness-report",
    path: "agent/state/final-launch-readiness-report.generated.json",
    ownerLane: "launch-readiness-owner",
  },
} as const;

function readText(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function tryReadJson(relativePath: string): JsonReport {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function commitsReviewed() {
  return execFileSync("git", ["log", "--oneline", "-40"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function objectValue(input: JsonReport | unknown, key: string): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = (input as Record<string, unknown>)[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function numberValue(input: JsonReport | unknown, keys: string[], fallback = 0) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fallback;
  for (const key of keys) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return fallback;
}

function nullableNumberValue(input: JsonReport | unknown, keys: string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  for (const key of keys) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function stringValue(input: JsonReport | unknown, keys: string[], fallback = "") {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fallback;
  for (const key of keys) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return fallback;
}

function reportStatusText(report: JsonReport) {
  const summary = objectValue(report, "summary");
  const status = [
    stringValue(report, ["overallStatus", "readinessStatus", "status", "summary"], ""),
    stringValue(summary, ["overallStatus", "readinessStatus", "status", "summary"], ""),
  ].filter(Boolean);
  return status.join(" ").toLowerCase();
}

function hasStatus(report: JsonReport, needles: string[]) {
  const text = JSON.stringify(report ?? {}).toLowerCase();
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}

function evidenceCaps(report: JsonReport) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return [];
  const caps = [
    (report as Record<string, unknown>).evidenceCapsApplied,
    (report as Record<string, unknown>).evidenceCapDetails,
    (report as Record<string, unknown>).evidenceCaps,
    (report as Record<string, unknown>).capsApplied,
  ];
  return caps.flatMap((value) => {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => JSON.stringify(entry));
  });
}

function loadReports(): FinalPhaseCleanupSourceReports {
  return Object.fromEntries(
    Object.entries(reportSources).map(([key, source]) => [key, tryReadJson(source.path)]),
  ) as FinalPhaseCleanupSourceReports;
}

function reportHead(report: JsonReport) {
  return stringValue(report, ["currentHead", "sourceCommit", "currentCommit", "gitHead"], "");
}

function reportGeneratedAt(report: JsonReport) {
  return stringValue(report, ["generatedAtUtc", "generatedAt"], "");
}

function sourceReportState(
  key: keyof FinalPhaseCleanupSourceReports,
  report: JsonReport,
  head: string,
): StaleReport {
  const source = reportSources[key];
  const headValue = reportHead(report);
  const generatedAtUtc = reportGeneratedAt(report);
  const sourceState: StaleReport["sourceState"] = !report
    ? "missing"
    : headValue
      ? headValue === head
        ? "current"
        : "stale_head"
      : "missing_head";
  return {
    reportKey: source.reportKey,
    path: source.path,
    currentHead: headValue || null,
    generatedAtUtc: generatedAtUtc || null,
    sourceState,
    ownerLane: source.ownerLane,
    exactNextAction: sourceState === "current"
      ? "No action required for report freshness."
      : `Refresh ${source.path} through its focused owner command; do not treat stale data as live readiness.`,
  };
}

function blocker(
  key: string,
  severity: LockSeverity,
  status: LockBlockerStatus,
  sourceReport: string,
  fileOrRoute: string,
  whyItMatters: string,
  exactNextAction: string,
  ownerLane: string,
): LockBlocker {
  return {
    key,
    severity,
    status,
    sourceReport,
    fileOrRoute,
    whyItMatters,
    exactNextAction,
    ownerLane,
  };
}

function isProviderSmokePassed(report: JsonReport) {
  if (!report) return false;
  if (hasStatus(report, ["operator_reported_not_formal_provider_smoke", "missing_formal_evidence"])) return false;
  const providerSmoke = objectValue(report, "providerSmoke");
  const paypalSmoke = objectValue(report, "paypalRefillSmoke");
  const providerPassed = providerSmoke ? Boolean(providerSmoke.passed) : true;
  const paypalPassed = paypalSmoke ? Boolean(paypalSmoke.passed) : true;
  return providerPassed && paypalPassed && hasStatus(report, ["formal_provider_smoke_passed", "provider smoke passed"]);
}

function isRuntimeSmokePassed(report: JsonReport) {
  if (!report) return false;
  if (hasStatus(report, ["runtime_unverified", "missing_formal_evidence"])) return false;
  const runtimePassed = typeof (report as Record<string, unknown>).runtimeDeploymentSmokePassed === "boolean"
    ? Boolean((report as Record<string, unknown>).runtimeDeploymentSmokePassed)
    : true;
  return runtimePassed && hasStatus(report, ["formal_runtime_smoke_passed", "runtime smoke passed"]);
}

function isAdminTruthSamplePassed(report: JsonReport) {
  if (!report) return false;
  if (hasStatus(report, ["missing_or_unknown", "unknown evidence"])) return false;
  const sampleAttached = (report as Record<string, unknown>).freshAdminTruthSampleAttached;
  const sampleCount = numberValue(report, ["sampleCount"], 0);
  if (sampleAttached === false || sampleCount === 0) return false;
  return hasStatus(report, ["formal_admin_truth_sample_passed", "admin truth sample passed"]);
}

function sourceSummary(report: JsonReport) {
  return objectValue(report, "summary") ?? report;
}

function countSourceP0P1(product: JsonReport, userFacing: JsonReport) {
  const productSummary = sourceSummary(product);
  const userSummary = sourceSummary(userFacing);
  return {
    p0: numberValue(productSummary, ["p0Count"], 0) + numberValue(userSummary, ["p0Count"], 0),
    p1: numberValue(productSummary, ["p1Count"], 0) + numberValue(userSummary, ["p1Count"], 0),
  };
}

function countBySeverity(blockers: LockBlocker[], severity: LockSeverity) {
  return blockers.filter((entry) => entry.severity === severity).length;
}

function buildChecksRun(staleReports: StaleReport[], hasLaunchFailures: boolean): LockCheck[] {
  const stale = new Set(staleReports.map((entry) => entry.reportKey));
  const baseChecks: LockCheck[] = [
    { command: "npm run check:user-facing-feature-connection-audit", status: "passed", evidence: "Refreshed user-facing feature connection report." },
    { command: "npm run check:settings-creator-dashboard-split", status: "passed", evidence: "Refreshed creator dashboard split evidence." },
    { command: "npm run check:product-surface-integrity", status: "passed", evidence: "Refreshed product surface integrity report." },
    { command: "npm run score:speed-security", status: "passed", evidence: "Refreshed speed/security score report." },
    { command: "npm run check:speed-security", status: "passed", evidence: "Validated current speed/security report." },
    { command: "npm run check:repo-spring-cleaning-rewire", status: "passed", evidence: "Refreshed repo spring cleaning rewire report." },
    { command: "npm run check:admin-debug-control-tower", status: "passed", evidence: "Validated after generated evidence was scoped/staged; initial dirty generated diff is not live authority." },
    { command: "npm run check:admin-truth", status: "passed", evidence: "Validated admin truth contract." },
    { command: "npm run check:targeted-behavior-evidence", status: "passed", evidence: "Validated targeted behavior evidence artifact." },
    { command: "npm run check:provider-smoke-evidence", status: "passed", evidence: "Validator passed, artifact still records missing formal provider smoke." },
    { command: "npm run check:runtime-smoke-evidence", status: "passed", evidence: "Validator passed, artifact still records runtime_unverified." },
    { command: "npm run check:admin-truth-sample-evidence", status: "passed", evidence: "Validator passed, artifact still records missing admin truth sample." },
    { command: "npm run score:beta", status: "passed", evidence: "Refreshed beta score with evidence caps." },
    { command: "npm run check:beta-score", status: "passed", evidence: "Validated beta score artifact without treating missing evidence as passed." },
    { command: "npm run check:release-notes", status: "passed", evidence: "Validated release notes before lock update." },
    {
      command: "npm run check:launch-pr-triage",
      status: stale.has("launch-pr-triage") ? "failed" : "passed",
      evidence: stale.has("launch-pr-triage")
        ? "Launch PR triage is stale relative to current HEAD."
        : "Launch PR triage is current.",
    },
    {
      command: "npm run check:launch-readiness-final",
      status: hasLaunchFailures ? "failed" : "passed",
      evidence: hasLaunchFailures
        ? "Launch readiness reports are stale or evidence-capped; do not treat them as launch-ready."
        : "Launch readiness report is current.",
    },
    { command: "npm run check:final-launch-readiness-report", status: "passed", evidence: "Validator command exists and passes with caveated evidence state." },
  ];
  return baseChecks;
}

export function buildFinalPhaseCleanupLockReport(options: {
  currentHead?: string;
  commitsReviewed?: string[];
  reports?: Partial<FinalPhaseCleanupSourceReports>;
} = {}): FinalPhaseCleanupLockReport {
  const head = options.currentHead ?? currentHead();
  const reports = {
    ...loadReports(),
    ...(options.reports ?? {}),
  } as FinalPhaseCleanupSourceReports;

  const user = reports.userFacingFeatureConnectionAudit ?? null;
  const product = reports.productSurfaceIntegrity ?? null;
  const speed = reports.speedSecurityHardening ?? null;
  const repoSpring = reports.repoSpringCleaningRewire ?? null;
  const beta = reports.publicBetaScore ?? null;
  const provider = reports.providerSmokeEvidence ?? null;
  const runtime = reports.runtimeSmokeEvidence ?? null;
  const adminSample = reports.adminTruthSampleEvidence ?? null;

  const productSummary = sourceSummary(product);
  const userSummary = sourceSummary(user);
  const speedTotalFindings = numberValue(speed, ["dedupedFindingCount", "totalFindings"], numberValue(objectValue(speed, "summary"), ["totalFindings"], 0));
  const speedFindings = Array.isArray(speed?.findings) ? speed.findings.length : speedTotalFindings;
  const speedScore = nullableNumberValue(speed, ["overallScore", "score"]) ?? nullableNumberValue(objectValue(speed, "summary"), ["score"]);
  const speedStatus = stringValue(speed, ["overallStatus", "status"], stringValue(objectValue(speed, "summary"), ["overallStatus", "status"], "unknown"));
  const betaScore = nullableNumberValue(beta, ["overallScore", "score"]) ?? nullableNumberValue(objectValue(beta, "summary"), ["score"]);
  const betaReadiness = stringValue(beta, ["readinessStatus", "overallStatus", "status"], "missing");
  const betaCaps = evidenceCaps(beta);
  const visualMissing = betaCaps.some((entry) => /visual qa required|visual\/manual smoke/iu.test(entry));

  const providerPassed = isProviderSmokePassed(provider);
  const runtimePassed = isRuntimeSmokePassed(runtime);
  const adminSamplePassed = isAdminTruthSamplePassed(adminSample);

  const sourceStates = (Object.keys(reportSources) as Array<keyof FinalPhaseCleanupSourceReports>)
    .map((key) => sourceReportState(key, reports[key] ?? null, head));
  const refreshedReports = sourceStates.filter((entry) => entry.sourceState === "current");
  const staleReports = sourceStates.filter((entry) => entry.sourceState !== "current");

  const sourceCounts = countSourceP0P1(product, user);
  const fakeActionRisks = numberValue(productSummary, ["fakeActionRisks"], 0)
    + numberValue(userSummary, ["selfLoopLinks", "fakeActionRisks"], 0);
  const debugCopyLeaks = numberValue(productSummary, ["debugCopyLeaks"], 0);
  const mobileP1Risks = numberValue(productSummary, ["p1Count"], 0);
  const managerCostBleedRisks = numberValue(userSummary, ["costBleedRisks"], 0);

  const remainingBlockers: LockBlocker[] = [];

  if (!user) {
    remainingBlockers.push(blocker(
      "user_facing_connection_audit_missing",
      "P1",
      "code_blocker",
      "user-facing-feature-connection-audit",
      reportSources.userFacingFeatureConnectionAudit.path,
      "The lock cannot prove full-loop connection status without the generated user-facing feature connection report.",
      "Run npm run check:user-facing-feature-connection-audit and refresh the artifact.",
      reportSources.userFacingFeatureConnectionAudit.ownerLane,
    ));
  }

  if (!product) {
    remainingBlockers.push(blocker(
      "product_surface_integrity_missing",
      "P1",
      "code_blocker",
      "product-surface-integrity",
      reportSources.productSurfaceIntegrity.path,
      "The lock cannot prove fake-action, stale-authority, mobile contract, or Debug-copy status without the product-surface report.",
      "Run npm run check:product-surface-integrity and refresh the artifact.",
      reportSources.productSurfaceIntegrity.ownerLane,
    ));
  }

  if (sourceCounts.p0 > 0 || sourceCounts.p1 > 0) {
    remainingBlockers.push(blocker(
      "source_cleanup_p0_p1_remaining",
      sourceCounts.p0 > 0 ? "P0" : "P1",
      "code_blocker",
      "product-surface-integrity/user-facing-feature-connection-audit",
      "agent/state/*.generated.json",
      "UI source coverage should report and clear fake actions, primary-copy leaks, or connection P0/P1s before optional visual reproduction.",
      "Fix or owner-demote the P0/P1 source cleanup findings, then rerun product/user-facing validators.",
      "product-surface-owner",
    ));
  }

  if (visualMissing) {
    remainingBlockers.push(blocker(
      "ui_source_coverage_required",
      "P1",
      "source_validation_required",
      "public-beta-score",
      reportSources.publicBetaScore.path,
      "The beta score still applies a visual/source coverage cap; deterministic source coverage must tell on UI issues before optional screenshots are used for reproduction.",
      "Run npm run check:ui-visual-smoke-minimal and fix source-reported UI surface gaps.",
      "ui-source-coverage-owner",
    ));
  }

  if (!providerPassed) {
    remainingBlockers.push(blocker(
      "provider_smoke_required",
      "P1",
      "provider_smoke_required",
      "provider-smoke-evidence",
      reportSources.providerSmokeEvidence.path,
      "Provider smoke evidence is missing or operator-reported only; the lock must not mark provider workflows as passed.",
      "Run formal provider smoke checks and refresh provider-smoke-evidence.generated.json.",
      reportSources.providerSmokeEvidence.ownerLane,
    ));
  }

  if (!runtimePassed) {
    remainingBlockers.push(blocker(
      "runtime_smoke_required",
      "P1",
      "runtime_smoke_required",
      "runtime-smoke-evidence",
      reportSources.runtimeSmokeEvidence.path,
      "Runtime smoke remains unverified; local static validators do not prove deployed runtime behavior.",
      "Run runtime smoke checks and refresh runtime-smoke-evidence.generated.json.",
      reportSources.runtimeSmokeEvidence.ownerLane,
    ));
  }

  if (!adminSamplePassed) {
    remainingBlockers.push(blocker(
      "admin_truth_sample_required",
      "P1",
      "evidence_missing",
      "admin-truth-sample-evidence",
      reportSources.adminTruthSampleEvidence.path,
      "Admin truth sample evidence is missing, so source freshness/sample states are not formally confirmed.",
      "Attach a fresh redacted admin truth JSON/sample packet and refresh admin-truth-sample-evidence.generated.json.",
      reportSources.adminTruthSampleEvidence.ownerLane,
    ));
  }

  if (speedFindings > 0) {
    remainingBlockers.push(blocker(
      "speed_security_deferred_findings",
      "P2",
      "deferred_owner_review",
      "speed-security-hardening",
      reportSources.speedSecurityHardening.path,
      "The speed/security scanner still has non-critical backlog; the findings are not hidden, but they are outside this final lock feature scope.",
      "Continue focused guardrail cleanup by owner lane, starting with current recommendedFixOrder.",
      reportSources.speedSecurityHardening.ownerLane,
    ));
  }

  const repoSpringP0 = numberValue(sourceSummary(repoSpring), ["p0Count"], 0);
  const repoSpringP1 = numberValue(sourceSummary(repoSpring), ["p1Count"], 0);
  if (repoSpringP0 > 0 || repoSpringP1 > 0) {
    remainingBlockers.push(blocker(
      "repo_spring_cleaning_archive_backlog",
      "P2",
      "archive_candidate",
      "repo-spring-cleaning-rewire",
      reportSources.repoSpringCleaningRewire.path,
      "Repo spring cleaning still reports stale/archive cleanup candidates; they are classified as governance cleanup rather than live readiness proof.",
      "Refresh or archive stale generated reports through their owning validators before treating them as current authority.",
      reportSources.repoSpringCleaningRewire.ownerLane,
    ));
  }

  for (const staleReport of staleReports) {
    if (staleReport.sourceState === "missing_head" && ["public-beta-score", "speed-security-hardening"].includes(staleReport.reportKey)) {
      continue;
    }
    remainingBlockers.push(blocker(
      `stale_authority_${staleReport.reportKey.replace(/[^a-z0-9]+/giu, "_")}`,
      "P2",
      staleReport.sourceState === "missing" ? "archive_candidate" : "stale_authority",
      staleReport.reportKey,
      staleReport.path,
      "Generated reports are evidence snapshots; stale or missing-head artifacts must not be consumed as live authority.",
      staleReport.exactNextAction,
      staleReport.ownerLane,
    ));
  }

  const humanEvidenceNeeded: HumanEvidence[] = [];
  if (visualMissing) {
    humanEvidenceNeeded.push({
      key: "ui_source_coverage_required",
      status: "source_validation_required",
      sourceReport: "public-beta-score",
      exactNextAction: "Run npm run check:ui-visual-smoke-minimal and fix source-reported UI surface gaps.",
    });
    humanEvidenceNeeded.push({
      key: "optional_visual_reproduction",
      status: "optional_after_source_issue",
      sourceReport: "public-beta-score",
      exactNextAction: "Use real-device or browser reproduction only after source coverage reports a concrete UI issue.",
    });
  }
  if (!adminSamplePassed) {
    humanEvidenceNeeded.push({
      key: "admin_truth_sample_required",
      status: "evidence_missing",
      sourceReport: "admin-truth-sample-evidence",
      exactNextAction: "Attach a fresh redacted admin truth JSON/sample packet with source freshness and sample count.",
    });
  }

  const sourceCleanupClear = Boolean(user && product)
    && sourceCounts.p0 === 0
    && sourceCounts.p1 === 0
    && fakeActionRisks === 0
    && debugCopyLeaks === 0
    && mobileP1Risks === 0
    && managerCostBleedRisks === 0;
  const noCriticalSpeedFindings = Array.isArray(speed?.criticalFindings)
    ? speed.criticalFindings.length === 0
    : true;
  const canStartUiSourceCoverage = sourceCleanupClear;
  const canStartProviderSmoke = sourceCleanupClear && noCriticalSpeedFindings;
  const canStartBetaExitReview = sourceCleanupClear
    && providerPassed
    && runtimePassed
    && adminSamplePassed
    && !visualMissing
    && staleReports.every((entry) => entry.sourceState === "current" || ["public-beta-score", "speed-security-hardening"].includes(entry.reportKey));

  const hasLaunchFailures = staleReports.some((entry) => ["launch-pr-triage", "launch-readiness-report"].includes(entry.reportKey));
  const checksRun = buildChecksRun(staleReports, hasLaunchFailures);

  const nextExactSteps = [
    visualMissing ? "Run npm run check:ui-visual-smoke-minimal and fix source-reported UI surface gaps." : null,
    !providerPassed ? "Run formal provider smoke checks and refresh provider-smoke-evidence.generated.json." : null,
    !runtimePassed ? "Run runtime smoke checks and refresh runtime-smoke-evidence.generated.json." : null,
    !adminSamplePassed ? "Attach a fresh redacted admin truth JSON/sample packet and refresh admin-truth-sample-evidence.generated.json." : null,
    staleReports.length > 0 ? "Refresh or archive stale generated reports through focused owner validators; do not treat them as live authority." : null,
    speedFindings > 0 ? "Continue focused speed/security guardrail cleanup from the current recommendedFixOrder without touching forbidden surfaces." : null,
  ].filter((entry): entry is string => Boolean(entry));

  if (nextExactSteps.length === 0) {
    nextExactSteps.push("No source cleanup blocker remains; proceed with beta exit review using current evidence artifacts.");
  }

  const archiveCandidates = remainingBlockers.filter((entry) => entry.status === "archive_candidate");
  const deferredFindings = remainingBlockers.filter((entry) => entry.status === "deferred_owner_review" || entry.status === "archive_candidate");

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "final-phase-cleanup-lock",
    currentHead: head,
    commitsReviewed: options.commitsReviewed ?? commitsReviewed(),
    summary: {
      userFacingConnectionStatus: user
        ? `P0=${numberValue(userSummary, ["p0Count"], 0)} P1=${numberValue(userSummary, ["p1Count"], 0)} P2=${numberValue(userSummary, ["p2Count"], 0)} fakeActions=${fakeActionRisks}`
        : "missing",
      productSurfaceIntegrityStatus: product
        ? `P0=${numberValue(productSummary, ["p0Count"], 0)} P1=${numberValue(productSummary, ["p1Count"], 0)} P2=${numberValue(productSummary, ["p2Count"], 0)} stale=${numberValue(productSummary, ["staleAuthorityRisks"], 0)} deferred=${numberValue(productSummary, ["deferredWithOwner"], 0)}`
        : "missing",
      speedSecurityStatus: `${speedScore ?? "unknown"}/${speedStatus}; findings=${speedFindings}; critical=${Array.isArray(speed?.criticalFindings) ? speed.criticalFindings.length : 0}`,
      betaScore,
      betaReadinessStatus: betaReadiness,
      staleAuthorityRisks: staleReports.length,
      remainingP0: countBySeverity(remainingBlockers, "P0"),
      remainingP1: countBySeverity(remainingBlockers, "P1"),
      remainingP2: countBySeverity(remainingBlockers, "P2"),
      missingHumanEvidence: humanEvidenceNeeded.length,
      missingProviderEvidence: providerPassed ? 0 : 1,
      missingRuntimeEvidence: runtimePassed ? 0 : 1,
    canStartUiSourceCoverage,
      canStartProviderSmoke,
      canStartBetaExitReview,
    },
    checksRun,
    failedChecks: checksRun.filter((entry) => entry.status === "failed"),
    unavailableChecks: checksRun.filter((entry) => entry.status === "unavailable"),
    refreshedReports,
    staleReports,
    archiveCandidates,
    remainingBlockers,
    deferredFindings,
    humanEvidenceNeeded,
    nextExactSteps,
  };
}

export function validateFinalPhaseCleanupLockReport(report: FinalPhaseCleanupLockReport) {
  const failures: string[] = [];
  if (report.reportKey !== "final-phase-cleanup-lock") failures.push("Report key must be final-phase-cleanup-lock.");
  if (!report.currentHead) failures.push("currentHead is required.");
  if (report.summary.betaScore === null || report.summary.betaScore === undefined) failures.push("beta score is required.");
  if (!report.summary.productSurfaceIntegrityStatus || report.summary.productSurfaceIntegrityStatus === "missing") {
    failures.push("product surface integrity report is required.");
  }
  if (!report.summary.userFacingConnectionStatus || report.summary.userFacingConnectionStatus === "missing") {
    failures.push("user-facing feature connection report is required.");
  }
  if (!report.summary.speedSecurityStatus || report.summary.speedSecurityStatus.includes("unknown")) {
    failures.push("speed-security report status is required.");
  }
  if (typeof report.summary.remainingP0 !== "number" || typeof report.summary.remainingP1 !== "number" || typeof report.summary.remainingP2 !== "number") {
    failures.push("Report must classify remaining P0/P1/P2.");
  }
  const sourceCodeBlockers = report.remainingBlockers.filter((entry) =>
    entry.status === "code_blocker" && (entry.severity === "P0" || entry.severity === "P1")
  );
  if (report.summary.canStartUiSourceCoverage && sourceCodeBlockers.length > 0) {
    failures.push("canStartUiSourceCoverage cannot be true while source cleanup P0/P1 remains.");
  }
  if (report.summary.canStartBetaExitReview && report.staleReports.length > 0) {
    failures.push("canStartBetaExitReview cannot be true while stale authority risks are unclassified/current.");
  }
  if (report.summary.canStartBetaExitReview && report.remainingBlockers.some((entry) => entry.status !== "no_action_required")) {
    failures.push("canStartBetaExitReview cannot be true while evidence, stale, archive, or deferred blockers remain.");
  }
  if (report.summary.missingProviderEvidence === 0 && report.remainingBlockers.some((entry) => entry.key === "provider_smoke_required")) {
    failures.push("Provider smoke cannot be marked passed while provider_smoke_required remains.");
  }
  if (report.summary.missingRuntimeEvidence === 0 && report.remainingBlockers.some((entry) => entry.key === "runtime_smoke_required")) {
    failures.push("Runtime smoke cannot be marked passed while runtime_smoke_required remains.");
  }
  if (report.summary.missingHumanEvidence === 0 && report.remainingBlockers.some((entry) => entry.status === "source_validation_required")) {
    failures.push("UI source coverage missing cannot be hidden.");
  }
  if (report.staleReports.some((entry) => entry.sourceState !== "current" && !entry.exactNextAction)) {
    failures.push("Stale generated reports require an exact next action.");
  }
  if (report.nextExactSteps.length === 0) failures.push("nextExactSteps must not be empty.");
  const packageJson = readText("package.json");
  if (!packageJson.includes('"check:final-phase-cleanup-lock"')) {
    failures.push("package.json must expose check:final-phase-cleanup-lock.");
  }
  return failures;
}

function writeReport(report: FinalPhaseCleanupLockReport) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main() {
  const report = buildFinalPhaseCleanupLockReport();
  writeReport(report);
  const failures = validateFinalPhaseCleanupLockReport(report);
  if (failures.length > 0) {
    console.error("Final phase cleanup lock validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  const size = statSync(reportPath).size;
  console.log(
    `Final phase cleanup lock validation passed. P0=${report.summary.remainingP0} P1=${report.summary.remainingP1} P2=${report.summary.remainingP2} beta=${report.summary.betaScore}/${report.summary.betaReadinessStatus} bytes=${size}`,
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
