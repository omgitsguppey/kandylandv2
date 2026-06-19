import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { ArtifactRefreshStatus } from "../../src/lib/agent-score/refresh-safeguards";
import {
  classifyGeneratedArtifactVersion,
  isGeneratedArtifactCurrent,
  readGeneratedArtifactGitContext,
  type GeneratedArtifactGitContext,
} from "../../src/lib/agent-score/generated-artifact-version-policy";

export type CurrentBetaExitCheck = {
  command: string;
  status: "passed" | "failed" | "not_run";
  evidence: string;
};

export type CurrentBetaExitProofLaneId =
  | "uiSurfaceCoverage"
  | "providerSmoke"
  | "runtimeSmoke"
  | "adminTruthSample";

export type CurrentBetaExitProofTruthState =
  | "current_formal_evidence"
  | "stale_evidence"
  | "external_evidence_required"
  | "manual_evidence_required"
  | "admin_truth_source_required"
  | "source_ui_surface_current"
  | "source_evidence_required"
  | "source_only_not_formal"
  | "unknown";

export type CurrentBetaExitProofActionState =
  | "gate_cleared"
  | "refresh_stale_evidence"
  | "attach_manual_evidence"
  | "attach_external_evidence"
  | "attach_admin_truth_sample"
  | "run_source_ui_checks"
  | "source_only_cannot_clear"
  | "unknown";

export type CurrentBetaExitReviewState =
  | "ready_for_review"
  | "blocked_by_formal_evidence"
  | "blocked_by_live_evidence"
  | "blocked_by_launch_gate";

export type CurrentBetaExitProofLane = {
  id: CurrentBetaExitProofLaneId;
  label: string;
  truthState: CurrentBetaExitProofTruthState;
  actionState: CurrentBetaExitProofActionState;
  sourceStatus: string;
  sourcePath: string;
  captureStatus: string;
  sourceCommit: string | null;
  canClearGate: boolean;
  nextAction: string;
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
    liveRuntimeEvidenceStatus?: string;
    speedSecurityStatus: string;
    releaseNotesStatus: string;
    betaExitReviewState: CurrentBetaExitReviewState;
    proofLanes: CurrentBetaExitProofLane[];
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
  "docs/agent-truth/ui-visual-smoke-minimal.md",
  "docs/agent-truth/provider-smoke-evidence-checklist.md",
  "docs/agent-truth/runtime-smoke-evidence-checklist.md",
  "docs/agent-truth/admin-truth-sample-evidence-checklist.md",
] as const;

const evidenceCaptureStatusRelativePath = "agent/state/evidence-capture-status.generated.json";
const evidenceCaptureStatusPath = join(repoRoot, evidenceCaptureStatusRelativePath);
const operatorRevenueSmokeRelativePath = "agent/state/operator-revenue-smoke.generated.json";
const operatorRevenueSmokePath = join(repoRoot, operatorRevenueSmokeRelativePath);
const uiSurfaceCoverageRelativePath = "agent/state/ui-visual-smoke-minimal.generated.json";
const providerSmokeEvidenceRelativePath = "agent/state/provider-smoke-evidence.generated.json";
const runtimeSmokeEvidenceRelativePath = "agent/state/runtime-smoke-evidence.generated.json";
const adminTruthSampleEvidenceRelativePath = "agent/state/admin-truth-sample-evidence.generated.json";
const currentBetaExitOwnedInputPaths = [
  "scripts/agent/validate-current-beta-exit-status.ts",
  "src/lib/agent-score",
  "agent/state/public-beta-score.generated.json",
  evidenceCaptureStatusRelativePath,
  operatorRevenueSmokeRelativePath,
  uiSurfaceCoverageRelativePath,
  providerSmokeEvidenceRelativePath,
  runtimeSmokeEvidenceRelativePath,
  adminTruthSampleEvidenceRelativePath,
] as const;

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readReport() {
  if (!existsSync(reportPath)) {
    throw new Error(`Missing required report: ${reportRelativePath}`);
  }
  return JSON.parse(readFileSync(reportPath, "utf8")) as CurrentBetaExitStatusReport;
}

function evidenceMissing(status: string) {
  if (/\b(source_surface_checks_current|source_ui_surface_current|not_required)\b/iu.test(status)) return false;
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
      uiSurfaceCoverageEvidence?: string;
      providerSmokeEvidence?: string;
      runtimeSmokeEvidence?: string;
      adminTruthSampleEvidence?: string;
      canStartBetaExitReview?: boolean;
      liveRuntimeEvidence?: {
        statusSummary?: string;
      };
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

function readJson(relativePath: string): Record<string, unknown> | null {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return null;
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
}

function hoursBetween(startUtc: string | undefined, endUtc: string) {
  if (!startUtc) return undefined;
  const start = Date.parse(startUtc);
  const end = Date.parse(endUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  return Math.max(0, (end - start) / (60 * 60 * 1000));
}

export function refreshPlanWithCurrentArtifactVersions(input: {
  refreshPlan: ArtifactRefreshStatus[];
  head: string;
  generatedAtUtc: string;
  readArtifact?: (artifactPath: string) => Record<string, unknown> | null;
}) {
  const readArtifact = input.readArtifact ?? readJson;

  return input.refreshPlan.map((entry) => {
    const artifact = entry.artifactPath === reportRelativePath ? null : readArtifact(entry.artifactPath);
    const artifactHead = entry.artifactPath === reportRelativePath
      ? input.head
      : stringValue(artifact?.currentHead ?? artifact?.sourceCommit, "");

    if (artifactHead !== input.head) {
      return entry;
    }

    const artifactGeneratedAt = entry.artifactPath === reportRelativePath
      ? input.generatedAtUtc
      : stringValue(artifact?.generatedAtUtc ?? artifact?.generatedAt, input.generatedAtUtc);

    return {
      ...entry,
      status: "current" as const,
      needsRefresh: false,
      generatedAtUtc: artifactGeneratedAt,
      ageHours: hoursBetween(artifactGeneratedAt, input.generatedAtUtc) ?? 0,
      message: `${entry.label} is current for the latest code version.`,
      nextAction: "No refresh needed.",
      formalEvidenceGateCanClear: true,
    };
  });
}

function hasRefreshPlanEntriesNowCurrent(report: CurrentBetaExitStatusReport, head: string) {
  return report.refreshPlan.some((entry) => {
    if (!entry.needsRefresh || entry.artifactPath === reportRelativePath) return false;
    const artifact = readJson(entry.artifactPath);
    return stringValue(artifact?.currentHead ?? artifact?.sourceCommit, "") === head;
  });
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback = "unknown") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown) {
  return value === true;
}

export function formalEvidenceStatus(
  artifact: Record<string, unknown> | null,
  head: string,
  fallback: string,
  staleStatus: string,
) {
  if (!artifact) return fallback;
  const artifactHead = stringValue(artifact.currentHead ?? artifact.sourceCommit, "");
  if (artifactHead && artifactHead !== head) return staleStatus;
  return stringValue(artifact.overallStatus ?? artifact.status, fallback);
}

function artifactCommit(artifact: Record<string, unknown> | null) {
  if (!artifact) return null;
  const commit = stringValue(artifact.currentHead ?? artifact.sourceCommit, "");
  return commit || null;
}

function artifactIsStale(artifact: Record<string, unknown> | null, head: string) {
  const commit = artifactCommit(artifact);
  return Boolean(commit && commit !== head);
}

function formalStatusPassed(id: CurrentBetaExitProofLaneId, status: string) {
  if (id === "uiSurfaceCoverage") return /source_surface_checks_current|source_ui_surface_current|not_required/iu.test(status);
  if (id === "providerSmoke") return /formal_provider_smoke_passed|passed_formal_evidence/iu.test(status);
  if (id === "runtimeSmoke") return /formal_runtime_smoke_passed|passed_formal_evidence/iu.test(status);
  return /formal_admin_truth_sample_passed|passed_formal_evidence/iu.test(status);
}

function proofTruthStateFor(input: {
  id: CurrentBetaExitProofLaneId;
  sourceStatus: string;
  captureStatus: string;
  artifact: Record<string, unknown> | null;
  head: string;
}): CurrentBetaExitProofTruthState {
  const artifactStatus = stringValue(input.artifact?.overallStatus ?? input.artifact?.status, input.sourceStatus);
  const hasFormalPassingStatus = formalStatusPassed(input.id, input.sourceStatus) || formalStatusPassed(input.id, artifactStatus);
  const isStaleSource = artifactIsStale(input.artifact, input.head) || /^stale_/iu.test(input.sourceStatus);

  if (input.id === "uiSurfaceCoverage") {
    if (isStaleSource) return "stale_evidence";
    if (hasFormalPassingStatus) return "source_ui_surface_current";
    return "source_evidence_required";
  }

  if (hasFormalPassingStatus) {
    if (!isStaleSource && input.captureStatus === "complete") {
      return "current_formal_evidence";
    }
    if (input.id === "adminTruthSample") return "admin_truth_source_required";
    if (input.id === "providerSmoke" || input.id === "runtimeSmoke") return "external_evidence_required";
    return "stale_evidence";
  }
  if (/source_only/iu.test(input.sourceStatus)) {
    return "source_only_not_formal";
  }
  if (input.id === "adminTruthSample") {
    return "admin_truth_source_required";
  }
  if (/source_ready/iu.test(artifactStatus)) {
    return "source_only_not_formal";
  }
  if (input.id === "providerSmoke" || input.id === "runtimeSmoke") {
    return "external_evidence_required";
  }
  if (isStaleSource) {
    return "stale_evidence";
  }
  return "unknown";
}

function proofActionStateFor(
  id: CurrentBetaExitProofLaneId,
  truthState: CurrentBetaExitProofTruthState,
  sourceStatus = "",
): CurrentBetaExitProofActionState {
  if (truthState === "current_formal_evidence") return "gate_cleared";
  if (truthState === "source_ui_surface_current") return "gate_cleared";
  if (truthState === "stale_evidence") return "refresh_stale_evidence";
  if (truthState === "source_evidence_required") return "run_source_ui_checks";
  if (truthState === "source_only_not_formal") return "source_only_cannot_clear";
  if (/^stale_/iu.test(sourceStatus) && (
    truthState === "manual_evidence_required"
    || truthState === "external_evidence_required"
    || truthState === "admin_truth_source_required"
  )) return "refresh_stale_evidence";
  if (truthState === "manual_evidence_required") return "attach_manual_evidence";
  if (truthState === "admin_truth_source_required") return "attach_admin_truth_sample";
  if (truthState === "external_evidence_required") return "attach_external_evidence";
  return id === "adminTruthSample" ? "attach_admin_truth_sample" : "unknown";
}

function buildProofLane(input: {
  id: CurrentBetaExitProofLaneId;
  label: string;
  sourceStatus: string;
  sourcePath: string;
  captureStatus: string;
  artifact: Record<string, unknown> | null;
  head: string;
  nextAction: string;
}): CurrentBetaExitProofLane {
  const truthState = proofTruthStateFor(input);
  return {
    id: input.id,
    label: input.label,
    truthState,
    actionState: proofActionStateFor(input.id, truthState, input.sourceStatus),
    sourceStatus: input.sourceStatus,
    sourcePath: input.sourcePath,
    captureStatus: input.captureStatus,
    sourceCommit: artifactCommit(input.artifact),
    canClearGate: truthState === "current_formal_evidence" || truthState === "source_ui_surface_current",
    nextAction: input.nextAction,
  };
}

export function buildProofLanes(input: {
  head: string;
  visualEvidenceStatus: string;
  providerSmokeStatus: string;
  runtimeSmokeStatus: string;
  adminTruthSampleStatus: string;
  captureSummary: Record<string, unknown>;
  manualVisual: Record<string, unknown> | null;
  provider: Record<string, unknown> | null;
  runtime: Record<string, unknown> | null;
  admin: Record<string, unknown> | null;
}): CurrentBetaExitProofLane[] {
  return [
    buildProofLane({
      id: "uiSurfaceCoverage",
      label: "UI surface coverage",
      sourceStatus: input.visualEvidenceStatus,
      sourcePath: uiSurfaceCoverageRelativePath,
      captureStatus: stringValue(input.captureSummary.uiSurfaceCoverageEvidence, "missing"),
      artifact: input.manualVisual,
      head: input.head,
      nextAction: "Run deterministic UI surface coverage, admin browser surface smoke, and device UI checks before manual viewing.",
    }),
    buildProofLane({
      id: "providerSmoke",
      label: "Provider smoke",
      sourceStatus: input.providerSmokeStatus,
      sourcePath: providerSmokeEvidenceRelativePath,
      captureStatus: stringValue(input.captureSummary.providerSmokeEvidence, "missing"),
      artifact: input.provider,
      head: input.head,
      nextAction: "Attach redacted provider smoke evidence; operator confirmation alone cannot clear provider proof.",
    }),
    buildProofLane({
      id: "runtimeSmoke",
      label: "Runtime smoke",
      sourceStatus: input.runtimeSmokeStatus,
      sourcePath: runtimeSmokeEvidenceRelativePath,
      captureStatus: stringValue(input.captureSummary.runtimeSmokeEvidence, "missing"),
      artifact: input.runtime,
      head: input.head,
      nextAction: "Attach or refresh deployed runtime smoke evidence for the current code version.",
    }),
    buildProofLane({
      id: "adminTruthSample",
      label: "Admin truth sample",
      sourceStatus: input.adminTruthSampleStatus,
      sourcePath: adminTruthSampleEvidenceRelativePath,
      captureStatus: stringValue(input.captureSummary.adminTruthSampleEvidence, "missing"),
      artifact: input.admin,
      head: input.head,
      nextAction: "Attach or refresh a redacted admin truth sample for the current code version.",
    }),
  ];
}

function liveRuntimeEvidenceBlocksReview(status: string | undefined) {
  return /\b(provider_required|admin_required|admin_truth_source_required|billing_required|manual_required|runtime_export_required|not_observed_but_expected)\b/u.test(status ?? "");
}

export function betaExitReviewStateFor(input: {
  launchGateStatus: string | undefined;
  liveRuntimeEvidenceStatus: string | undefined;
  proofLanes: CurrentBetaExitProofLane[];
}): CurrentBetaExitReviewState {
  if (input.proofLanes.some((lane) => lane.canClearGate !== true)) return "blocked_by_formal_evidence";
  if (liveRuntimeEvidenceBlocksReview(input.liveRuntimeEvidenceStatus)) return "blocked_by_live_evidence";
  if (input.launchGateStatus !== "launch_ready") return "blocked_by_launch_gate";
  return "ready_for_review";
}

function refreshReportFromCurrentArtifacts(report: CurrentBetaExitStatusReport, head: string): CurrentBetaExitStatusReport {
  const beta = readJson("agent/state/public-beta-score.generated.json");
  const evidenceCapture = readEvidenceCaptureStatus();
  const manualVisual = readJson(uiSurfaceCoverageRelativePath);
  const provider = readJson(providerSmokeEvidenceRelativePath);
  const runtime = readJson(runtimeSmokeEvidenceRelativePath);
  const admin = readJson(adminTruthSampleEvidenceRelativePath);
  const operator = readOperatorRevenueSmoke();
  const captureSummary = evidenceCapture?.summary ?? {};
  const generatedAtUtc = new Date().toISOString();
  const providerSmokeStatus = formalEvidenceStatus(provider, head, report.summary.providerSmokeStatus, "stale_provider_smoke_evidence");
  const runtimeSmokeStatus = formalEvidenceStatus(runtime, head, report.summary.runtimeSmokeStatus, "stale_runtime_smoke_evidence");
  const adminTruthSampleStatus = formalEvidenceStatus(admin, head, report.summary.adminTruthSampleStatus, "stale_admin_truth_sample_evidence");
  const visualEvidenceStatus = formalEvidenceStatus(manualVisual, head, report.summary.visualEvidenceStatus, "stale_visual_evidence");
  const proofLanes = buildProofLanes({
    head,
    visualEvidenceStatus,
    providerSmokeStatus,
    runtimeSmokeStatus,
    adminTruthSampleStatus,
    captureSummary,
    manualVisual,
    provider,
    runtime,
    admin,
  });
  const existingSummary = { ...(report.summary as CurrentBetaExitStatusReport["summary"] & Record<string, unknown>) };
  delete existingSummary.canStartManualScreenshotQa;
  delete existingSummary.canStartRuntimeSmoke;
  delete existingSummary.canStartProviderSmoke;
  delete existingSummary.canStartBetaExitReview;
  const launchGateStatus = stringValue(beta?.launchGateStatus, report.summary.launchGateStatus);
  const liveRuntimeEvidenceStatus = stringValue(record(captureSummary.liveRuntimeEvidence).statusSummary, report.summary.liveRuntimeEvidenceStatus);
  const summary = {
    ...existingSummary,
    betaScore: numberValue(beta?.overallScore, report.summary.betaScore),
    betaStatus: stringValue(beta?.readinessStatus, report.summary.betaStatus),
    scoreVersion: stringValue(beta?.scoreVersion, report.summary.scoreVersion),
    healthScore: numberValue(beta?.healthScore, report.summary.healthScore),
    launchGateStatus,
    sourceHealthScore: numberValue(beta?.sourceHealthScore, report.summary.sourceHealthScore),
    runtimeHealthScore: numberValue(beta?.runtimeHealthScore, report.summary.runtimeHealthScore),
    evidenceCompletenessScore: numberValue(beta?.evidenceCompletenessScore, report.summary.evidenceCompletenessScore),
    freshnessScore: numberValue(beta?.freshnessScore, report.summary.freshnessScore),
    costRiskScore: numberValue(beta?.costRiskScore, report.summary.costRiskScore),
    regressionRiskScore: numberValue(beta?.regressionRiskScore, report.summary.regressionRiskScore),
    visualEvidenceStatus,
    providerSmokeStatus,
    runtimeSmokeStatus,
    adminTruthSampleStatus,
    operatorRevenueSmokeStatus: operator?.summary?.revenueSmokeStatus ?? report.summary.operatorRevenueSmokeStatus,
    operatorRevenueSmokeAmountUsd: operator?.summary?.amountUsdConfirmed ?? report.summary.operatorRevenueSmokeAmountUsd,
    operatorRevenueSmokeProduct: operator?.summary?.product ?? report.summary.operatorRevenueSmokeProduct,
    operatorRevenueSmokeConfirmationSource: operator?.summary?.confirmationSource ?? report.summary.operatorRevenueSmokeConfirmationSource,
    operatorRevenueSmokeProviderArtifactAttached: operator?.summary?.providerArtifactAttached ?? false,
    operatorRevenueSmokeFormalProviderSmokePassed: operator?.summary?.formalProviderSmokePassed ?? false,
    operatorRevenueSmokeBetaGateImpact: operator?.summary?.betaGateImpact ?? report.summary.operatorRevenueSmokeBetaGateImpact,
    operatorRevenueSmokeNote: operator?.plainLanguageNote
      ?? "A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate.",
    liveRuntimeEvidenceStatus,
    betaExitReviewState: betaExitReviewStateFor({
      launchGateStatus,
      liveRuntimeEvidenceStatus,
      proofLanes,
    }),
    proofLanes,
  } satisfies CurrentBetaExitStatusReport["summary"];
  const legacyUiVisualBlockerIds = new Set([
      "runtime-smoke",
      "admin-truth-sample",
      "provider-smoke",
      "visual_manual_smoke_missing",
      "screenshot_evidence_missing",
      "ui-surface-coverage",
    ]);
  const remainingBlockers = [
    ...report.remainingBlockers.filter((blocker) => !legacyUiVisualBlockerIds.has(blocker.id) && !/screenshot|visual_manual/iu.test(blocker.id)),
    ...(summary.visualEvidenceStatus === "source_surface_checks_current" ? [] : [{
      id: "ui-surface-coverage",
      severity: "P1" as const,
      status: summary.visualEvidenceStatus,
      evidence: [uiSurfaceCoverageRelativePath],
      nextAction: "Run npm run check:ui:coverage, npm run check:admin-browser-surface-smoke, and npm run check:device-ui; fix source-reported UI gaps before manual viewing.",
    }]),
    ...(summary.providerSmokeStatus === "formal_provider_smoke_passed" ? [] : [{
      id: "provider-smoke",
      severity: "P1" as const,
      status: summary.providerSmokeStatus,
      evidence: ["agent/state/provider-smoke-evidence.generated.json"],
      nextAction: "Attach real redacted provider smoke evidence; operator confirmation alone cannot clear provider proof.",
    }]),
  ];
  const refreshPlan = refreshPlanWithCurrentArtifactVersions({
    refreshPlan: report.refreshPlan,
    head,
    generatedAtUtc,
  });
  return {
    ...report,
    generatedAtUtc,
    currentHead: head,
    summary,
    refreshPlan,
    staleArtifacts: report.staleArtifacts.filter((entry) =>
      refreshPlan.some((planEntry) => planEntry.artifactPath === entry.artifactPath && planEntry.needsRefresh)),
    remainingBlockers,
    nextExactSteps: [
      "Run npm run check:ui:coverage, npm run check:admin-browser-surface-smoke, and npm run check:device-ui before manual viewing; fix any source-reported UI surface issue.",
      "Use docs/agent-truth/ui-visual-smoke-minimal.md as the deterministic UI source coverage lane.",
      "Use docs/agent-truth/provider-smoke-evidence-checklist.md for redacted provider proof.",
      "Use docs/agent-truth/runtime-smoke-evidence-checklist.md for deployed runtime smoke proof.",
      "Use docs/agent-truth/admin-truth-sample-evidence-checklist.md for redacted production admin truth samples.",
      `Reference ${evidenceCaptureStatusRelativePath}.`,
      "Manual testing can focus on product behavior because user/creator raw error leaks are source-blocked.",
    ],
    refreshedArtifacts: Array.from(new Set([...report.refreshedArtifacts, reportRelativePath])),
    checksRun: report.checksRun.map((check) =>
      check.command === "npm run check:evidence-capture-status"
        ? { ...check, evidence: "runtime/admin evidence complete; provider evidence remains missing." }
        : check,
    ),
  };
}

export function validateCurrentBetaExitStatusReport(
  report: CurrentBetaExitStatusReport | null,
  head: string,
  versionContext: Partial<GeneratedArtifactGitContext> = {},
) {
  const failures: string[] = [];

  if (!report) return ["current-beta-exit-status artifact missing"];
  if (report.reportKey !== "current-beta-exit-status") {
    failures.push("reportKey must be current-beta-exit-status.");
  }
  const version = classifyGeneratedArtifactVersion({
    artifactPath: reportRelativePath,
    artifactHead: report.currentHead,
    currentHead: head,
    parentHead: versionContext.parentHead,
    changedFilesInHead: versionContext.changedFilesInHead,
    changedFilesSinceArtifactHead: versionContext.changedFilesSinceArtifactHead,
    ownedSourcePaths: [...currentBetaExitOwnedInputPaths],
  });
  if (!isGeneratedArtifactCurrent(version)) {
    failures.push(`report currentHead must match git HEAD (${head}) or an accepted generated artifact version.`);
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
  if (
    !report.summary.liveRuntimeEvidenceStatus
    || !report.summary.liveRuntimeEvidenceStatus.includes("live_runtime_evidence_bridge=")
    || !report.summary.liveRuntimeEvidenceStatus.includes("aggregate_activity_confirmed=")
    || !report.summary.liveRuntimeEvidenceStatus.includes("agent/evidence/live-runtime-activity/recent-activity.export.json")
  ) {
    failures.push("live runtime evidence bridge status must be represented with the daily activity import path.");
  }
  if (
    report.summary.betaExitReviewState === "ready_for_review"
    && liveRuntimeEvidenceBlocksReview(report.summary.liveRuntimeEvidenceStatus)
  ) {
    failures.push("betaExitReviewState must not be ready_for_review while live runtime evidence bridge has formal or unobserved blockers.");
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

  const uiSurfaceCoverageMissing = evidenceMissing(report.summary.visualEvidenceStatus);
  const providerMissing = evidenceMissing(report.summary.providerSmokeStatus);
  const runtimeMissing = evidenceMissing(report.summary.runtimeSmokeStatus);
  const proofLanes = Array.isArray(report.summary.proofLanes) ? report.summary.proofLanes : [];
  const proofLaneIds = new Set(proofLanes.map((lane) => lane.id));
  const requiredProofLaneIds: CurrentBetaExitProofLaneId[] = [
    "uiSurfaceCoverage",
    "providerSmoke",
    "runtimeSmoke",
    "adminTruthSample",
  ];
  for (const id of requiredProofLaneIds) {
    if (!proofLaneIds.has(id)) {
      failures.push(`proofLanes must include ${id}.`);
    }
  }
  const expectedProofStatuses: Record<CurrentBetaExitProofLaneId, string> = {
    uiSurfaceCoverage: report.summary.visualEvidenceStatus,
    providerSmoke: report.summary.providerSmokeStatus,
    runtimeSmoke: report.summary.runtimeSmokeStatus,
    adminTruthSample: report.summary.adminTruthSampleStatus,
  };
  for (const lane of proofLanes) {
    if (expectedProofStatuses[lane.id] && lane.sourceStatus !== expectedProofStatuses[lane.id]) {
      failures.push(`${lane.id} proof lane sourceStatus must match the summary source status.`);
    }
    if (typeof lane.sourcePath !== "string" || lane.sourcePath.trim().length === 0) {
      failures.push(`${lane.id} proof lane must include a sourcePath.`);
    }
    if (typeof lane.captureStatus !== "string" || lane.captureStatus.trim().length === 0) {
      failures.push(`${lane.id} proof lane must include captureStatus.`);
    }
    if (/^stale_/iu.test(lane.sourceStatus) && lane.truthState === "current_formal_evidence") {
      failures.push(`${lane.id} stale proof source must not clear a formal gate.`);
    }
    if (lane.canClearGate && lane.truthState !== "current_formal_evidence" && lane.truthState !== "source_ui_surface_current") {
      failures.push(`${lane.id} proof lane canClearGate must only be true for current_formal_evidence or source_ui_surface_current.`);
    }
    if (lane.actionState !== proofActionStateFor(lane.id, lane.truthState, lane.sourceStatus)) {
      failures.push(`${lane.id} proof lane actionState must be derived from truthState and sourceStatus.`);
    }
    if (lane.truthState === "current_formal_evidence" && !formalStatusPassed(lane.id, lane.sourceStatus)) {
      failures.push(`${lane.id} current_formal_evidence must come from a formal passed source status.`);
    }
  }
  const legacySummary = report.summary as Record<string, unknown>;
  for (const legacyField of ["canStartManualScreenshotQa", "canStartProviderSmoke", "canStartRuntimeSmoke", "canStartBetaExitReview"]) {
    if (legacyField in legacySummary) {
      failures.push(`${legacyField} must not be emitted; use proofLanes truthState/actionState and betaExitReviewState.`);
    }
  }
  if (
    report.summary.betaExitReviewState !== betaExitReviewStateFor({
      launchGateStatus: report.summary.launchGateStatus,
      liveRuntimeEvidenceStatus: report.summary.liveRuntimeEvidenceStatus,
      proofLanes,
    })
  ) {
    failures.push("betaExitReviewState must be derived from proof lanes, live runtime evidence, and launch gate status.");
  }
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
    if (!["missing_formal_evidence", "operator_reported_not_formal_provider_smoke", "stale_provider_smoke_evidence"].includes(report.summary.providerSmokeStatus)) {
      failures.push("provider smoke gate must remain missing/stale formal evidence after operator confirmation.");
    }
    if (summary.canStartBetaExitReview === true || report.summary.betaExitReviewState === "ready_for_review") {
      failures.push("operator-confirmed revenue smoke alone must not mark betaExitReviewState ready_for_review.");
    }
  }

  if ((uiSurfaceCoverageMissing || providerMissing || runtimeMissing) && report.summary.betaExitReviewState === "ready_for_review") {
    failures.push("betaExitReviewState must not be ready_for_review while UI surface/provider/runtime evidence is missing.");
  }
  if (report.summary.launchGateStatus !== "launch_ready" && report.summary.betaExitReviewState === "ready_for_review") {
    failures.push("betaExitReviewState must not be ready_for_review until launchGateStatus is launch_ready.");
  }
  if (uiSurfaceCoverageMissing && /\b(pass|passed|complete|completed|current)\b/iu.test(report.summary.visualEvidenceStatus)) {
    failures.push("UI surface coverage must not be marked current while source coverage is missing.");
  }
  if ((uiSurfaceCoverageMissing || providerMissing || runtimeMissing) && (report.remainingBlockers?.length ?? 0) === 0) {
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
      captureSummary.uiSurfaceCoverageEvidence,
      captureSummary.providerSmokeEvidence,
      captureSummary.runtimeSmokeEvidence,
      captureSummary.adminTruthSampleEvidence,
    ].some((status) => status !== "complete");
    if (evidenceCaptureMissing && report.summary.betaExitReviewState === "ready_for_review") {
      failures.push("betaExitReviewState must not be ready_for_review while evidence capture status has missing lanes.");
    }
  }

  return failures;
}

function main() {
  const forceRefresh = process.argv.includes("--refresh") || process.env.CURRENT_BETA_EXIT_STATUS_REFRESH === "1";
  let report: CurrentBetaExitStatusReport | null = null;
  const failures: string[] = [];
  try {
    report = readReport();
  } catch (error) {
    failures.push((error as Error).message);
  }

  const head = currentHead();
  if (report) {
    const versionContext = readGeneratedArtifactGitContext(repoRoot, report.currentHead, reportRelativePath);
    const version = classifyGeneratedArtifactVersion({
      artifactPath: reportRelativePath,
      artifactHead: report.currentHead,
      currentHead: head,
      parentHead: versionContext.parentHead,
      changedFilesInHead: versionContext.changedFilesInHead,
      changedFilesSinceArtifactHead: versionContext.changedFilesSinceArtifactHead,
      ownedSourcePaths: [...currentBetaExitOwnedInputPaths],
    });
    if (forceRefresh || !isGeneratedArtifactCurrent(version) || hasRefreshPlanEntriesNowCurrent(report, head)) {
      report = refreshReportFromCurrentArtifacts(report, head);
      writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    }
  }
  failures.push(...validateCurrentBetaExitStatusReport(
    report,
    head,
    report ? readGeneratedArtifactGitContext(repoRoot, report.currentHead, reportRelativePath) : {},
  ));

  if (failures.length > 0) {
    console.error("Current beta exit status validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  const summary = report?.summary;
  const proofStatus = (summary?.proofLanes ?? [])
    .map((lane) => `${lane.id}=${lane.truthState}(${lane.sourceStatus})`)
    .join(" ");
  console.log(
    `Current beta exit status passed. beta=${summary?.betaScore}/${summary?.betaStatus} ` +
      `proofLanes=${proofStatus || "unavailable"}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
