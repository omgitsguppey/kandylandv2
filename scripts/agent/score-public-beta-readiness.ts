import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  printPublicBetaScoreSummary,
  writePublicBetaScoreReport,
} from "../../src/lib/agent-score/reporting";
import { buildPublicBetaReadinessReport } from "../../src/lib/agent-score/public-beta-scanner";
import {
  PUBLIC_BETA_DOMAIN_WEIGHTS,
  PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS,
} from "../../src/lib/agent-score/weights";
import {
  buildRefreshPlan,
  staleArtifactsFromPlan,
  uniqueRefreshCommands,
  type RefreshArtifactInput,
} from "../../src/lib/agent-score/refresh-safeguards";
import { REFRESH_ARTIFACT_REGISTRY } from "../../src/lib/agent-score/refresh-registry";
import { readGeneratedArtifactGitContext } from "../../src/lib/agent-score/generated-artifact-version-policy";
import {
  summarizeUiVisualSmokeEvidenceForScore,
  type UiVisualSmokeMinimalReport,
  type UiVisualSmokeReportStatus,
  type UiVisualSmokeStatus,
} from "../../src/lib/evidence/ui-visual-smoke-contract";
import { summarizeNonEventScorePolicy } from "../../src/lib/agent-score/non-event-score-policy";
import type { DeviceBand } from "../../src/lib/frontend-hardening/ui/mobile-scale-contract";
import { loadDebugEvidenceForAuditDomains } from "./load-debug-evidence-for-audit";
import { buildScore80CostReadinessFromRepo } from "./validate-score-80-cost-readiness";
import type {
  PublicBetaEvidenceArtifact,
  PublicBetaGeneratedReportEvidence,
} from "../../src/lib/agent-score/core";

const REQUIRED_EVIDENCE_REPORTS = [
  "agent/state/evidence-capture-status.generated.json",
  "agent/state/creator-experience-simplification.generated.json",
  "agent/state/user-creator-ui-parity.generated.json",
  "agent/state/targeted-behavior-evidence.generated.json",
  "agent/state/final-parity-telemetry-lock.generated.json",
  "agent/state/media-discovery-score-lock.generated.json",
  "agent/state/creator-monetization-readiness-lock.generated.json",
] as const;

const PROVIDER_SMOKE_EVIDENCE_PATH = "agent/state/provider-smoke-evidence.generated.json";
const OPERATOR_REVENUE_SMOKE_PATH = "agent/state/operator-revenue-smoke.generated.json";
const RUNTIME_SMOKE_EVIDENCE_PATH = "agent/state/runtime-smoke-evidence.generated.json";
const SOURCE_BACKED_RUNTIME_CONFIDENCE_PATH = "agent/state/source-backed-runtime-confidence.generated.json";
const RUNTIME_SMOKE_SUBSTITUTE_MATRIX_PATH = "agent/state/runtime-smoke-substitute-matrix.generated.json";
const LIVE_EVIDENCE_GATE_REPLACEMENT_PATH = "agent/state/live-evidence-gate-replacement.generated.json";
const REAL_USAGE_CONFIDENCE_PATH = "agent/state/real-usage-confidence.generated.json";
const REAL_USAGE_CONFIDENCE_CALIBRATION_PATH = "agent/state/real-usage-confidence-calibration.generated.json";
const BEHAVIOR_MATH_VERIFICATION_PATH = "agent/state/behavior-math-verification.generated.json";
const ACTIVITY_VERIFICATION_ENGINE_PATH = "agent/state/activity-verification-engine.generated.json";
const DEBUG_RUNTIME_EVIDENCE_PATH = "agent/state/debug-runtime-evidence.generated.json";
const DEBUG_SIGNAL_GROUPING_PATH = "agent/state/debug-signal-grouping.generated.json";
const EVENT_TRANSLATION_BRIDGE_PATH = "agent/state/event-translation-bridge.generated.json";
const PERSON_METRICS_HYDRATION_PATH = "agent/state/person-metrics-hydration.generated.json";
const TELEMETRY_TRIGGER_TEST_MATRIX_PATH = "agent/state/telemetry-trigger-test-matrix.generated.json";
const USER_MANAGEMENT_REFACTOR_PATH = "agent/state/user-management-refactor.generated.json";
const ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH = "agent/state/admin-truth-sample-evidence.generated.json";
const ADMIN_TRUTH_SOURCE_SAMPLE_PATH = "agent/state/admin-truth-source-sample.generated.json";
const TARGETED_BEHAVIOR_EVIDENCE_PATH = "agent/state/targeted-behavior-evidence.generated.json";
const REGRESSION_RISK_REFRESH_PATH = "agent/state/regression-risk-high-blast-refresh.generated.json";
const UI_VISUAL_SMOKE_MINIMAL_PATH = "agent/state/ui-visual-smoke-minimal.generated.json";
const UI_VISUAL_SMOKE_REQUIRED_SURFACES_EVIDENCE_KEY = "uiVisualSmoke.requiredSurfaces";

function parseJsonObject(source: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function readJsonFile(root: string, filePath: string) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) return null;
  return parseJsonObject(readFileSync(fullPath, "utf8"));
}

function collectRefreshArtifacts(root: string, currentHead: string, generatedAtUtc: string): RefreshArtifactInput[] {
  return REFRESH_ARTIFACT_REGISTRY.map((entry) => {
    if (entry.artifactPath === "agent/state/public-beta-score.generated.json") {
      return {
        artifactPath: entry.artifactPath,
        generatedAtUtc,
        sourceCommit: currentHead,
        currentCodeVersion: currentHead,
        exists: true,
      };
    }
    const parsed = readJsonFile(root, entry.artifactPath);
    if (!parsed) {
      return {
        artifactPath: entry.artifactPath,
        currentCodeVersion: currentHead,
        exists: false,
      };
    }
    const artifactHead = readString(parsed.sourceCommit) ?? readString(parsed.currentHead);
    const gitContext = artifactHead
      ? readGeneratedArtifactGitContext(root, artifactHead, entry.artifactPath)
      : null;
    return {
      artifactPath: entry.artifactPath,
      generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
      sourceCommit: artifactHead,
      currentHead: readString(parsed.currentHead),
      currentCodeVersion: currentHead,
      parentHead: gitContext?.parentHead,
      changedFilesInHead: gitContext?.changedFilesInHead,
      changedFilesSinceArtifactHead: gitContext?.changedFilesSinceArtifactHead,
      exists: true,
    };
  });
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readGitHead(root: string) {
  try {
    const gitDir = join(root, ".git");
    const headSource = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
    if (headSource.startsWith("ref: ")) {
      const refPath = headSource.slice("ref: ".length).trim();
      return readFileSync(join(gitDir, refPath), "utf8").trim();
    }
    return headSource;
  } catch {
    return undefined;
  }
}

function evidenceLinesFromArray(value: unknown, prefix: string) {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const parts = [
        readString(record.key),
        readString(record.command),
        readString(record.status),
        readString(record.proves),
      ].filter(Boolean);
      return parts.length > 0 ? `${prefix}[${index}]=${parts.join(" | ")}` : `${prefix}[${index}]=object`;
    }
    return `${prefix}[${index}]=${String(entry)}`;
  });
}

function readEvidenceArtifact(
  root: string,
  filePath: string,
  fallbackStatus: string,
  fallbackDetail: string,
): PublicBetaEvidenceArtifact {
  const parsed = readJsonFile(root, filePath);
  if (!parsed) {
    return {
      path: filePath,
      status: fallbackStatus,
      passed: false,
      detail: fallbackDetail,
      evidence: [`artifactPath=${filePath}`, `artifactStatus=${fallbackStatus}`, "artifactExists=false"],
    };
  }

  const status = readString(parsed.status) ?? readString(parsed.overallStatus) ?? fallbackStatus;
  return {
    path: filePath,
    status,
    passed: readBoolean(parsed.passed) === true,
    detail: readString(parsed.detail)
      ?? readString(parsed.summary)
      ?? readString(parsed.recommendedAction)
      ?? fallbackDetail,
    evidence: [
      `artifactPath=${filePath}`,
      `artifactStatus=${status}`,
      `artifactExists=true`,
      ...evidenceLinesFromArray(parsed.evidence, "artifactEvidence"),
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readUiVisualSmokeMinimalEvidence(root: string, filePath: string, parsed: Record<string, unknown>) {
  const surfaces = Array.isArray(parsed.surfaces) ? parsed.surfaces : [];
  const summary = readRecord(parsed.summary);
  const formalGateImpact = readRecord(parsed.formalGateImpact);
  const normalized: UiVisualSmokeMinimalReport = {
    status: (readString(parsed.status) ?? "source_surface_checks_failed") as UiVisualSmokeReportStatus,
    passed: readBoolean(parsed.passed) === true,
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt) ?? new Date(0).toISOString(),
    currentHead: readString(parsed.currentHead),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
    detail: readString(parsed.detail) ?? "UI source coverage evidence artifact was found.",
    nonUiLanesBlocked: readBoolean(parsed.nonUiLanesBlocked) === true,
    formalGateImpact: {
      clearsUiSurfaceCoverage: readBoolean(formalGateImpact.clearsUiSurfaceCoverage) === true,
      clearsProviderSmoke: readBoolean(formalGateImpact.clearsProviderSmoke) === true,
      clearsDeployedRuntimeSmoke: readBoolean(formalGateImpact.clearsDeployedRuntimeSmoke) === true,
      clearsAdminTruthSmoke: readBoolean(formalGateImpact.clearsAdminTruthSmoke) === true,
    },
    surfaces: surfaces.map((surface) => {
      const record = readRecord(surface);
      return {
        surfaceId: readString(record.surfaceId) ?? "unknown_surface",
        surfaceGroup: readString(record.surfaceGroup) ?? "unknown_group",
        route: readString(record.route) ?? "unknown_route",
        deviceBand: (readString(record.deviceBand) ?? "mobile") as DeviceBand,
        requiresVisualSmokeReason: readString(record.requiresVisualSmokeReason) ?? "Visual smoke reason missing.",
        status: (readString(record.status) ?? "source_surface_gap") as UiVisualSmokeStatus,
        blocksScoreForUiOnly: readBoolean(record.blocksScoreForUiOnly) === true,
        codexScoreBlocking: false,
      };
    }),
    summary: {
      requiredSurfaceCount: readNumber(summary.requiredSurfaceCount) ?? surfaces.length,
      surfaceGroupCount: readNumber(summary.surfaceGroupCount) ?? 0,
      missingSurfaceIds: Array.isArray(summary.missingSurfaceIds)
        ? summary.missingSurfaceIds.filter((value): value is string => typeof value === "string")
        : [],
      failedSurfaceIds: Array.isArray(summary.failedSurfaceIds)
        ? summary.failedSurfaceIds.filter((value): value is string => typeof value === "string")
        : [],
      notRequiredSurfaceIds: Array.isArray(summary.notRequiredSurfaceIds)
        ? summary.notRequiredSurfaceIds.filter((value): value is string => typeof value === "string")
        : [],
      statusCounts: readRecord(summary.statusCounts) as never,
    },
    evidence: Array.isArray(parsed.evidence)
      ? parsed.evidence.filter((value): value is string => typeof value === "string")
      : [],
    nextExactSteps: Array.isArray(parsed.nextExactSteps)
      ? parsed.nextExactSteps.filter((value): value is string => typeof value === "string")
      : [],
  };
  const summarized = summarizeUiVisualSmokeEvidenceForScore(normalized);
  return {
    ...summarized,
    path: filePath,
    evidence: [
      ...summarized.evidence,
      `uiVisualSmoke.artifactPath=${filePath}`,
      `uiVisualSmoke.artifactExists=${Boolean(readJsonFile(root, filePath))}`,
      `${UI_VISUAL_SMOKE_REQUIRED_SURFACES_EVIDENCE_KEY}=exact_surface_list_required`,
    ],
  };
}

function collectGeneratedReportEvidence(root: string, now = Date.now()): PublicBetaGeneratedReportEvidence[] {
  return REQUIRED_EVIDENCE_REPORTS.map((reportPath) => {
    const fullPath = join(root, reportPath);
    if (!existsSync(fullPath)) {
      return { path: reportPath, freshness: "missing" };
    }

    const parsed = parseJsonObject(readFileSync(fullPath, "utf8"));
    const stats = statSync(fullPath);
    const generatedAt = typeof parsed.generatedAtUtc === "string"
      ? parsed.generatedAtUtc
      : typeof parsed.generatedAt === "string"
        ? parsed.generatedAt
        : stats.mtime.toISOString();
    const ageHours = (now - Date.parse(generatedAt)) / (60 * 60 * 1000);
    const embeddedFreshness = parsed.freshness === "fresh" || parsed.freshness === "stale" || parsed.freshness === "unknown"
      ? parsed.freshness
      : undefined;
    const freshness = embeddedFreshness ?? (
      Number.isFinite(ageHours) && ageHours <= PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS ? "fresh" : "stale"
    );

    return {
      path: reportPath,
      generatedAt,
      sourceCommit: typeof parsed.sourceCommit === "string" ? parsed.sourceCommit : undefined,
      freshness,
      ageHours: Number.isFinite(ageHours) ? ageHours : undefined,
    };
  });
}

function readProviderSmokeEvidence(root: string): PublicBetaEvidenceArtifact {
  const parsed = readJsonFile(root, PROVIDER_SMOKE_EVIDENCE_PATH);
  const operatorSmoke = readJsonFile(root, OPERATOR_REVENUE_SMOKE_PATH);
  const operatorSummary = readRecord(operatorSmoke?.summary);
  const operatorSmokeStatus = readString(operatorSummary.revenueSmokeStatus);
  const operatorSmokeAmount = readNumber(operatorSummary.amountUsdConfirmed);
  const operatorSmokeNote = operatorSmokeStatus === "operator_confirmed_revenue_smoke"
    ? readString(operatorSmoke?.plainLanguageNote)
      ?? "Operator-confirmed GumDrop revenue was recorded as product context; provider-backed source activity evidence is still separate."
    : undefined;
  const operatorSmokeEvidence = operatorSmokeNote
    ? [
      `operatorRevenueSmoke.status=${operatorSmokeStatus}`,
      ...(operatorSmokeAmount ? [`operatorRevenueSmoke.amountUsdConfirmed=${operatorSmokeAmount}`] : []),
      "operatorRevenueSmoke.providerBackedSiteActivityPassed=false",
      `operatorRevenueSmoke.note=${operatorSmokeNote}`,
    ]
    : [];
  if (!parsed) {
    const artifact = readEvidenceArtifact(
      root,
      PROVIDER_SMOKE_EVIDENCE_PATH,
      "missing_formal_evidence",
      "No provider-backed source activity evidence artifact was supplied.",
    );
    if (operatorSmokeNote) {
      artifact.detail = `${operatorSmokeNote} ${artifact.detail}`;
      artifact.evidence.push(...operatorSmokeEvidence);
    }
    return artifact;
  }

  const providerSmoke = readRecord(parsed.providerSmoke);
  const paypalRefillSmoke = readRecord(parsed.paypalRefillSmoke);
  const readinessImpact = readRecord(parsed.readinessImpact);
  const providerStatus = readString(providerSmoke.status) ?? readString(parsed.overallStatus) ?? "missing_formal_evidence";
  const paypalStatus = readString(paypalRefillSmoke.status);
  const status = providerStatus;
  const providerGatePassed = readBoolean(providerSmoke.passed) === true
    || readBoolean(readinessImpact.providerSmokeGatePassed) === true;
  const passed = providerGatePassed
    && status !== "missing_formal_evidence"
    && status !== "operator_reported_not_formal_provider_smoke"
    && paypalStatus !== "operator_reported_not_formal_provider_smoke";
  const paypalNote = readString(paypalRefillSmoke.note);
  const providerRecommendedAction = readString(providerSmoke.recommendedAction);

  return {
    path: PROVIDER_SMOKE_EVIDENCE_PATH,
    status,
    passed,
    detail: [
      operatorSmokeNote,
      passed ? "Provider-backed source activity evidence passed." : "Provider-backed source activity evidence is missing.",
      paypalNote,
      providerRecommendedAction,
    ].filter(Boolean).join(" "),
    evidence: [
      `providerArtifactStatus=${status}`,
      `providerSmoke.status=${providerStatus}`,
      `providerSmoke.passed=${readBoolean(providerSmoke.passed) === true}`,
      `readinessImpact.providerSmokeGatePassed=${readBoolean(readinessImpact.providerSmokeGatePassed) === true}`,
      ...operatorSmokeEvidence,
      ...(paypalStatus ? [`paypalRefillSmoke.status=${paypalStatus}`] : []),
      ...(paypalNote ? [`paypalRefillSmoke.note=${paypalNote}`] : []),
      `paypalRefillSmoke.providerBackedSourceArtifactAttached=${readBoolean(paypalRefillSmoke.formalRepoArtifactAttached) === true}`,
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readRuntimeSmokeEvidence(root: string): PublicBetaEvidenceArtifact {
  const parsed = readJsonFile(root, RUNTIME_SMOKE_EVIDENCE_PATH);
  if (!parsed) {
    return readEvidenceArtifact(
      root,
      RUNTIME_SMOKE_EVIDENCE_PATH,
      "runtime_unverified",
      "No deployed runtime route evidence artifact was supplied.",
    );
  }

  const readinessImpact = readRecord(parsed.readinessImpact);
  const status = readString(parsed.overallStatus) ?? readString(parsed.status) ?? "runtime_unverified";
  const runtimeGatePassed = readBoolean(parsed.runtimeDeploymentSmokePassed) === true
    || readBoolean(readinessImpact.runtimeGatePassed) === true;
  const passed = runtimeGatePassed && status !== "runtime_unverified" && status !== "missing_formal_evidence";

  return {
    path: RUNTIME_SMOKE_EVIDENCE_PATH,
    status,
    passed,
    detail: readString(readinessImpact.recommendedAction)
      ?? (passed ? "Deployed runtime route evidence passed." : "No deployed runtime route evidence was supplied."),
    evidence: [
      `runtimeArtifactStatus=${status}`,
      `runtimeDeploymentSmokePassed=${readBoolean(parsed.runtimeDeploymentSmokePassed) === true}`,
      `readinessImpact.runtimeGatePassed=${readBoolean(readinessImpact.runtimeGatePassed) === true}`,
      ...evidenceLinesFromArray(parsed.evidenceItems, "runtimeEvidenceItems"),
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readAdminTruthSourceSampleEvidence(root: string): PublicBetaEvidenceArtifact | null {
  const sourceSample = readJsonFile(root, ADMIN_TRUTH_SOURCE_SAMPLE_PATH);
  if (!sourceSample) return null;
  const status = readString(sourceSample.status) ?? "source_ready_admin_truth_sample";
  const formalGatePassed = readBoolean(sourceSample.formalAdminTruthSamplePassed) === true;
  const productionSampleAttached = readBoolean(sourceSample.productionSampleAttached) === true;
  const sourceReady = status.includes("source_ready")
    && formalGatePassed === false
    && productionSampleAttached === false;
  return {
    path: ADMIN_TRUTH_SOURCE_SAMPLE_PATH,
    status: sourceReady ? status : "missing_or_unknown",
    passed: false,
    detail: readString(sourceSample.nextAction)
      ?? "Source-backed admin truth wiring is present; admin source activity evidence remains missing.",
    evidence: [
      `adminTruthSampleArtifactStatus=${status}`,
      `sourceSampleStatus=${status}`,
      `productionSampleAttached=${productionSampleAttached}`,
      `formalAdminTruthSamplePassed=${formalGatePassed}`,
      `formalRuntimeSampleAttached=${readBoolean(sourceSample.formalRuntimeSampleAttached) === true}`,
      `launchGateImpact=${readString(sourceSample.launchGateImpact) ?? "unknown"}`,
      ...evidenceLinesFromArray(sourceSample.evidence, "adminTruthSourceEvidence"),
    ],
    generatedAtUtc: readString(sourceSample.generatedAtUtc) ?? readString(sourceSample.generatedAt),
    sourceCommit: readString(sourceSample.sourceCommit) ?? readString(sourceSample.currentHead),
  };
}

function readAdminTruthSampleEvidence(root: string): PublicBetaEvidenceArtifact {
  const parsed = readJsonFile(root, ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH);
  if (!parsed) {
    const sourceSample = readAdminTruthSourceSampleEvidence(root);
    if (sourceSample) return sourceSample;
    return readEvidenceArtifact(
      root,
      ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH,
      "missing_or_unknown",
      "No admin source activity evidence artifact was supplied.",
    );
  }

  const readinessImpact = readRecord(parsed.readinessImpact);
  const status = readString(parsed.overallStatus) ?? readString(parsed.status) ?? "missing_or_unknown";
  const sampleCount = readNumber(parsed.sampleCount) ?? 0;
  const freshSampleAttached = readBoolean(parsed.freshAdminTruthSampleAttached) === true;
  const adminGatePassed = readBoolean(readinessImpact.adminTruthSampleGatePassed) === true;
  const passed = freshSampleAttached && adminGatePassed && sampleCount > 0 && status !== "missing_or_unknown";
  if (!passed) {
    const sourceSample = readAdminTruthSourceSampleEvidence(root);
    if (sourceSample) return sourceSample;
  }

  return {
    path: ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH,
    status,
    passed,
    detail: readString(readinessImpact.recommendedAction)
      ?? (passed ? "Fresh admin source activity evidence passed." : "No fresh admin source activity evidence was supplied."),
    evidence: [
      `adminTruthSampleArtifactStatus=${status}`,
      `freshAdminTruthSampleAttached=${freshSampleAttached}`,
      `readinessImpact.adminTruthSampleGatePassed=${adminGatePassed}`,
      `sampleCount=${sampleCount}`,
      ...evidenceLinesFromArray(parsed.adminTruthCommandEvidence, "adminTruthCommandEvidence"),
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readTargetedBehaviorEvidence(root: string): PublicBetaEvidenceArtifact {
  return readEvidenceArtifact(
    root,
    TARGETED_BEHAVIOR_EVIDENCE_PATH,
    "missing_formal_evidence",
    "No targeted source validator evidence artifact was supplied.",
  );
}

function readRegressionRiskRefreshEvidence(root: string) {
  const parsed = readJsonFile(root, REGRESSION_RISK_REFRESH_PATH);
  if (!parsed) return undefined;
  const scoreAfter = readRecord(parsed.scoreAfter);
  const highBlastCoverageCurrent = readBoolean(parsed.highBlastCoverageCurrent) === true;
  return {
    highBlastCoverageCurrent,
    regressionRiskScore: readNumber(scoreAfter.regressionRisk),
    failedLaneCount: Array.isArray(parsed.failedLanes) ? parsed.failedLanes.length : undefined,
    inFlightLaneCount: Array.isArray(parsed.inFlightLanes) ? parsed.inFlightLanes.length : undefined,
  };
}

function liveRuntimeEvidenceConfirmsActivity(artifact: PublicBetaEvidenceArtifact | null) {
  return artifact?.status === "source_ready_live_activity_confirmed"
    || artifact?.status === "source_ready_aggregate_activity_confirmed";
}

export function readSourceBackedRuntimeConfidenceEvidence(root: string): PublicBetaEvidenceArtifact {
  const sourceBacked = readEvidenceArtifact(
    root,
    SOURCE_BACKED_RUNTIME_CONFIDENCE_PATH,
    "missing_or_unknown",
    "No source-backed runtime confidence artifact was supplied.",
  );
  const liveRuntimeBridge = readLiveRuntimeEvidenceBridgeEvidence(root);
  if (liveRuntimeBridge && liveRuntimeEvidenceConfirmsActivity(liveRuntimeBridge)) return liveRuntimeBridge;
  const sourceBackedStatus = String(sourceBacked.status);
  if (sourceBackedStatus.includes("source_ready")) return sourceBacked;
  return liveRuntimeBridge ?? sourceBacked;
}

function readLiveRuntimeEvidenceBridgeEvidence(root: string): PublicBetaEvidenceArtifact | null {
  const parsed = readJsonFile(root, LIVE_EVIDENCE_GATE_REPLACEMENT_PATH);
  if (!parsed) return null;

  const systems = Array.isArray(parsed.liveEvidenceBySystem) ? parsed.liveEvidenceBySystem.map(readRecord) : [];
  const statuses = systems.map((system) => readString(system.liveRuntimeEvidenceStatus) ?? "source_missing");
  const liveActivityConfirmed = statuses.filter((status) => status === "live_activity_confirmed").length;
  const aggregateActivityConfirmed = statuses.filter((status) => status === "aggregate_activity_confirmed").length;
  const sourceReadyWaiting = statuses.filter((status) => status === "source_ready_waiting_for_activity" || status === "future_only_quiet").length;
  const notObservedButExpected = statuses.filter((status) => status === "not_observed_but_expected").length;
  const runtimeExportRequired = statuses.filter((status) => status === "runtime_export_required").length;
  const providerRequired = statuses.filter((status) => status === "provider_required").length;
  const adminTruthSourceRequired = statuses.filter((status) => status === "admin_truth_source_required").length;
  const billingRequired = statuses.filter((status) => status === "billing_required").length;
  const sourceMissing = statuses.filter((status) => status === "source_missing").length;
  const firstPartySiteActivityConfirmed = liveActivityConfirmed + aggregateActivityConfirmed;
  const blockedSiteActivityLanes = notObservedButExpected + runtimeExportRequired + adminTruthSourceRequired + sourceMissing;
  const externalSourceRequired = providerRequired + billingRequired;
  const firstDailyImport = systems.map((system) => readRecord(system.dailyActivityImport)).find((daily) => readString(daily.expectedPath));
  const foundPaths = Array.isArray(firstDailyImport?.foundPaths)
    ? firstDailyImport.foundPaths.filter((value): value is string => typeof value === "string")
    : [];
  const status = liveActivityConfirmed > 0
    ? "source_ready_live_activity_confirmed"
    : aggregateActivityConfirmed > 0
      ? "source_ready_aggregate_activity_confirmed"
      : sourceReadyWaiting > 0 || notObservedButExpected > 0
      ? "source_ready_waiting_for_activity"
      : "source_missing_live_runtime_evidence";

  return {
    path: LIVE_EVIDENCE_GATE_REPLACEMENT_PATH,
    status,
    passed: firstPartySiteActivityConfirmed > 0,
    detail: firstPartySiteActivityConfirmed > 0
      ? "First-party site activity is present and can clear connected site-activity/runtime lanes; provider, billing, admin truth, or route-health lanes only remain when their source status requires them."
      : "Live runtime evidence bridge is wired, but no local daily activity export currently confirms recent user activity.",
    evidence: [
      `liveRuntimeEvidenceArtifactStatus=${status}`,
      `liveRuntimeEvidence.liveActivityConfirmed=${liveActivityConfirmed}`,
      `liveRuntimeEvidence.aggregateActivityConfirmed=${aggregateActivityConfirmed}`,
      `liveRuntimeEvidence.firstPartySiteActivityConfirmed=${firstPartySiteActivityConfirmed}`,
      `liveRuntimeEvidence.sourceReadyWaitingForActivity=${sourceReadyWaiting}`,
      `liveRuntimeEvidence.notObservedButExpected=${notObservedButExpected}`,
      `liveRuntimeEvidence.runtimeExportRequired=${runtimeExportRequired}`,
      `liveRuntimeEvidence.providerRequired=${providerRequired}`,
      `liveRuntimeEvidence.adminTruthSourceRequired=${adminTruthSourceRequired}`,
      `liveRuntimeEvidence.billingRequired=${billingRequired}`,
      `liveRuntimeEvidence.sourceMissing=${sourceMissing}`,
      `liveRuntimeEvidence.blockedSiteActivityLanes=${blockedSiteActivityLanes}`,
      `liveRuntimeEvidence.externalSourceRequired=${externalSourceRequired}`,
      `dailyActivityImport.expectedPath=${readString(firstDailyImport?.expectedPath) ?? "agent/evidence/live-runtime-activity/recent-activity.export.json"}`,
      `dailyActivityImport.foundPaths=${foundPaths.join(",") || "none"}`,
      `dailyActivityImport.schema=${readString(firstDailyImport?.schema) ?? "live-runtime-activity-export"}`,
      firstPartySiteActivityConfirmed > 0
        ? "launchGateImpact=site_activity_can_clear_connected_site_activity_lanes"
        : "launchGateImpact=site_activity_missing_source_still_required",
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readRuntimeSmokeSubstituteMatrixEvidence(root: string): PublicBetaEvidenceArtifact {
  return readEvidenceArtifact(
    root,
    RUNTIME_SMOKE_SUBSTITUTE_MATRIX_PATH,
    "missing_or_unknown",
    "No source-backed runtime evidence matrix artifact was supplied.",
  );
}

function readRealUsageConfidenceEvidence(root: string): PublicBetaEvidenceArtifact {
  return readEvidenceArtifact(
    root,
    REAL_USAGE_CONFIDENCE_PATH,
    "missing_or_unknown",
    "No real usage confidence artifact was supplied.",
  );
}

function readRealUsageConfidenceCalibrationEvidence(root: string): PublicBetaEvidenceArtifact {
  return readEvidenceArtifact(
    root,
    REAL_USAGE_CONFIDENCE_CALIBRATION_PATH,
    "missing_or_unknown",
    "No calibrated real usage confidence artifact was supplied.",
  );
}

function readBehaviorMathEvidence(root: string): PublicBetaEvidenceArtifact {
  return readEvidenceArtifact(
    root,
    BEHAVIOR_MATH_VERIFICATION_PATH,
    "missing_or_unknown",
    "No behavior math verification artifact was supplied.",
  );
}

function readActivityVerificationEvidence(root: string): PublicBetaEvidenceArtifact {
  const parsed = readJsonFile(root, ACTIVITY_VERIFICATION_ENGINE_PATH);
  if (!parsed) {
    return {
      path: ACTIVITY_VERIFICATION_ENGINE_PATH,
      status: "missing_or_unknown",
      passed: false,
      detail: "No activity verification artifact was supplied.",
      evidence: [
        `artifactPath=${ACTIVITY_VERIFICATION_ENGINE_PATH}`,
        "artifactStatus=missing_or_unknown",
        "artifactExists=false",
      ],
    };
  }

  const summary = readRecord(parsed.summary);
  const formalGateImpact = readRecord(parsed.formalGateImpact);
  const features = Array.isArray(parsed.features) ? parsed.features.map(readRecord) : [];
  const scoreEligibleFeatures = features.filter((feature) => readBoolean(feature.scoreEligible) === true);
  const confidenceScores = scoreEligibleFeatures
    .map((feature) => readNumber(feature.confidenceScore) ?? 0)
    .filter((score) => score > 0);
  const confidenceScore = confidenceScores.length > 0
    ? Math.max(...confidenceScores)
    : readNumber(summary.verifiedByActivity) && readNumber(summary.verifiedByActivity)! > 0
      ? 58
      : 0;
  const status = readString(parsed.status) ?? "missing_or_unknown";
  const verifiedByActivity = readNumber(summary.verifiedByActivity) ?? 0;
  const sourceReadyNoActivity = readNumber(summary.sourceReadyNoActivity) ?? 0;
  const fakeActivityUsed = readBoolean(parsed.fakeActivityUsed) === true;
  const productionReadsRequired = readBoolean(parsed.productionReadsRequired) === true;
  const clearsFormalProvider = readBoolean(formalGateImpact.clearsFormalProvider) === true;
  const clearsDeployedRuntime = readBoolean(formalGateImpact.clearsDeployedRuntime) === true;
  const clearsFormalAdminTruth = readBoolean(formalGateImpact.clearsFormalAdminTruth) === true;
  const passed = status === "pass"
    && verifiedByActivity > 0
    && !fakeActivityUsed
    && !productionReadsRequired
    && !clearsFormalProvider
    && !clearsDeployedRuntime
    && !clearsFormalAdminTruth;

  return {
    path: ACTIVITY_VERIFICATION_ENGINE_PATH,
    status: passed ? "source_ready_activity_verification" : status,
    passed,
    detail: passed
      ? "Source-backed activity verification found score-eligible first-party activity; provider-backed source activity, deployed route evidence, and admin source activity gates remain separate."
      : "Activity verification did not find score-eligible source-backed activity.",
    evidence: [
      `activityVerification.status=${status}`,
      `activityVerification.verifiedByActivity=${verifiedByActivity}`,
      `activityVerification.sourceReadyNoActivity=${sourceReadyNoActivity}`,
      `activityVerification.scoreEligibleActivity=${scoreEligibleFeatures.length}`,
      `activityVerification.confidenceScore=${confidenceScore}`,
      `activityVerification.fakeActivityUsed=${fakeActivityUsed}`,
      `activityVerification.productionReadsRequired=${productionReadsRequired}`,
      `activityVerification.formalProviderCleared=${clearsFormalProvider}`,
      `activityVerification.deployedRuntimeCleared=${clearsDeployedRuntime}`,
      `activityVerification.formalAdminTruthCleared=${clearsFormalAdminTruth}`,
      `activityVerification.providerActivityCleared=${clearsFormalProvider}`,
      `activityVerification.adminSourceActivityCleared=${clearsFormalAdminTruth}`,
      "activityVerification.launchEvidenceCleared=false",
      "activityVerification.formalGatesCleared=false",
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readDebugRuntimeEvidence(root: string): PublicBetaEvidenceArtifact {
  return readEvidenceArtifact(
    root,
    DEBUG_RUNTIME_EVIDENCE_PATH,
    "missing_or_unknown",
    "No source-backed debug/runtime evidence artifact was supplied.",
  );
}

function readNonEventScorePolicyEvidence(root: string) {
  const parsed = readJsonFile(root, DEBUG_SIGNAL_GROUPING_PATH);
  const groups = Array.isArray(parsed?.groups) ? parsed.groups : [];
  return summarizeNonEventScorePolicy({
    groups: groups.map((entry) => {
      const record = readRecord(entry);
      return {
        groupId: readString(record.groupId) ?? "unknown-group",
        actionability: (readString(record.actionability) ?? "not_actionable") as never,
        count: readNumber(record.count) ?? 0,
        estimatedPointImpact: readNumber(record.estimatedPointImpact),
        scoreDimensionsAffected: Array.isArray(record.scoreDimensionsAffected)
          ? record.scoreDimensionsAffected.filter((value): value is string => typeof value === "string")
          : [],
        rootCause: readString(record.rootCause),
      };
    }),
  });
}

function readEventTranslationBridgeEvidence(root: string): PublicBetaEvidenceArtifact | null {
  const parsed = readJsonFile(root, EVENT_TRANSLATION_BRIDGE_PATH);
  if (!parsed) return null;

  const summary = readRecord(parsed.summary);
  const readSummaryNumber = (key: string) => readNumber(summary[key]) ?? readNumber(parsed[key]) ?? 0;
  const formalGateImpact = readRecord(parsed.formalGateImpact);
  const status = readString(parsed.status) ?? "missing_or_unknown";
  const gapCount = readSummaryNumber("gapCount");
  const sourceReady = status === "pass"
    && gapCount === 0
    && readBoolean(parsed.productionReadsRequired) === false
    && readBoolean(parsed.legacyMutationAllowed) === false
    && readBoolean(parsed.fakeActivityUsed) === false
    && readBoolean(formalGateImpact.clearsFormalProvider) === false
    && readBoolean(formalGateImpact.clearsDeployedRuntime) === false
    && readBoolean(formalGateImpact.clearsFormalAdminTruth) === false;

  return {
    path: EVENT_TRANSLATION_BRIDGE_PATH,
    status: sourceReady ? "source_ready_event_translation_bridge" : status,
    passed: false,
    detail: sourceReady
      ? "Event translation bridge is source-ready for raw events, envelopes, feature activity, person metrics, debug evidence, and score inputs without clearing deployed runtime truth."
      : "Event translation bridge evidence is missing required source-ready guardrails.",
    evidence: [
      `eventTranslationBridge.status=${status}`,
      `eventTranslationBridge.producersRegistered=${readSummaryNumber("producersRegistered")}`,
      `eventTranslationBridge.producersConnected=${readSummaryNumber("producersConnected")}`,
      `eventTranslationBridge.eventEnvelopesTranslated=${readSummaryNumber("eventEnvelopesTranslated")}`,
      `eventTranslationBridge.materializersMapped=${readSummaryNumber("materializersMapped")}`,
      `eventTranslationBridge.personMetricsMapped=${readSummaryNumber("personMetricsMapped")}`,
      `eventTranslationBridge.gapCount=${gapCount}`,
      "launchGateImpact=does_not_clear_deployed_runtime_smoke",
      `eventTranslationBridge.clearsFormalProvider=${readBoolean(formalGateImpact.clearsFormalProvider) === true}`,
      `eventTranslationBridge.clearsDeployedRuntime=${readBoolean(formalGateImpact.clearsDeployedRuntime) === true}`,
      `eventTranslationBridge.clearsFormalAdminTruth=${readBoolean(formalGateImpact.clearsFormalAdminTruth) === true}`,
      `eventTranslationBridge.clearsProviderActivity=${readBoolean(formalGateImpact.clearsFormalProvider) === true}`,
      `eventTranslationBridge.clearsAdminSourceActivity=${readBoolean(formalGateImpact.clearsFormalAdminTruth) === true}`,
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readPersonMetricsHydrationEvidence(root: string): PublicBetaEvidenceArtifact | null {
  const parsed = readJsonFile(root, PERSON_METRICS_HYDRATION_PATH);
  if (!parsed) return null;

  const debugLane = readRecord(parsed.debugLane);
  const readLaneNumber = (key: string) => readNumber(debugLane[key]) ?? readNumber(parsed[key]) ?? 0;
  const status = readString(parsed.status) ?? "missing_or_unknown";
  const gapCount = readLaneNumber("gaps");
  const sourceReady = status === "pass"
    && gapCount === 0
    && readBoolean(parsed.productionReadsRequired) === false
    && readBoolean(parsed.legacyMutationAllowed) === false
    && readBoolean(parsed.fakeMetricsUsed) === false;

  return {
    path: PERSON_METRICS_HYDRATION_PATH,
    status: sourceReady ? "source_ready_person_metrics_hydration" : status,
    passed: false,
    detail: sourceReady
      ? "Person metrics hydration is source-ready for canonical envelopes, linked guest/user confidence, debug evidence, and score inputs without claiming future real activity as proven."
      : "Person metrics hydration evidence is missing required source-ready guardrails.",
    evidence: [
      `personMetricsHydration.status=${status}`,
      `personMetricsHydration.producersRegistered=${readLaneNumber("producersRegistered")}`,
      `personMetricsHydration.producersConnected=${readLaneNumber("producersConnected")}`,
      `personMetricsHydration.eventEnvelopesHydrated=${readLaneNumber("eventEnvelopesHydrated")}`,
      `personMetricsHydration.personMetricsMapped=${readLaneNumber("personMetricsMapped")}`,
      `personMetricsHydration.lowConfidenceMetrics=${readLaneNumber("lowConfidenceMetrics")}`,
      `personMetricsHydration.gapCount=${gapCount}`,
      "launchGateImpact=does_not_clear_deployed_runtime_smoke",
      "legacyImpact=unknown_legacy_never_exact_user_truth",
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readTelemetryTriggerTestMatrixEvidence(root: string): PublicBetaEvidenceArtifact | null {
  const parsed = readJsonFile(root, TELEMETRY_TRIGGER_TEST_MATRIX_PATH);
  if (!parsed) return null;

  const debugLane = readRecord(parsed.debugLane);
  const readLaneNumber = (key: string) => readNumber(debugLane[key]) ?? readNumber(parsed[key]) ?? 0;
  const formalGateImpact = readRecord(parsed.formalGateImpact);
  const status = readString(parsed.status) ?? "missing_or_unknown";
  const missingTriggerTests = readLaneNumber("missingTriggerTests");
  const uiOnlyTests = readLaneNumber("uiOnlyTests");
  const waitingGaps = readLaneNumber("waitingOnActivityDeterministicGaps");
  const sourceReady = status === "pass"
    && missingTriggerTests === 0
    && uiOnlyTests === 0
    && waitingGaps === 0
    && readBoolean(parsed.productionReadsRequired) === false
    && readBoolean(parsed.liveDataMutationAllowed) === false
    && readBoolean(formalGateImpact.clearsFormalProvider) === false
    && readBoolean(formalGateImpact.clearsDeployedRuntime) === false
    && readBoolean(formalGateImpact.clearsFormalAdminTruth) === false;

  return {
    path: TELEMETRY_TRIGGER_TEST_MATRIX_PATH,
    status: sourceReady ? "source_ready_telemetry_trigger_test_matrix" : status,
    passed: false,
    detail: sourceReady
      ? "Telemetry trigger test matrix is source-ready for user action, envelope, feature activity, person metric, debug lane, and score input coverage without clearing deployed runtime truth."
      : "Telemetry trigger test matrix evidence is missing required deterministic coverage guardrails.",
    evidence: [
      `telemetryTriggerTestMatrix.status=${status}`,
      `telemetryTriggerTestMatrix.totalTriggers=${readLaneNumber("totalTriggers")}`,
      `telemetryTriggerTestMatrix.coveredTriggers=${readLaneNumber("coveredTriggers")}`,
      `telemetryTriggerTestMatrix.missingTriggerTests=${missingTriggerTests}`,
      `telemetryTriggerTestMatrix.uiOnlyTests=${uiOnlyTests}`,
      `telemetryTriggerTestMatrix.waitingOnActivityDeterministicGaps=${waitingGaps}`,
      "launchGateImpact=does_not_clear_deployed_runtime_smoke",
      `telemetryTriggerTestMatrix.clearsFormalProvider=${readBoolean(formalGateImpact.clearsFormalProvider) === true}`,
      `telemetryTriggerTestMatrix.clearsDeployedRuntime=${readBoolean(formalGateImpact.clearsDeployedRuntime) === true}`,
      `telemetryTriggerTestMatrix.clearsFormalAdminTruth=${readBoolean(formalGateImpact.clearsFormalAdminTruth) === true}`,
      `telemetryTriggerTestMatrix.clearsProviderActivity=${readBoolean(formalGateImpact.clearsFormalProvider) === true}`,
      `telemetryTriggerTestMatrix.clearsAdminSourceActivity=${readBoolean(formalGateImpact.clearsFormalAdminTruth) === true}`,
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readUserManagementRefactorEvidence(root: string): PublicBetaEvidenceArtifact | null {
  const parsed = readJsonFile(root, USER_MANAGEMENT_REFACTOR_PATH);
  if (!parsed) return null;

  const debugLane = readRecord(parsed.debugLane);
  const routePolicy = readRecord(parsed.routePolicy);
  const validation = readRecord(parsed.validation);
  const readLaneNumber = (key: string) => readNumber(debugLane[key]) ?? readNumber(parsed[key]) ?? 0;
  const status = readString(parsed.status) ?? "missing_or_unknown";
  const sourceReady = status === "pass"
    && readBoolean(parsed.productionReadsRequired) === false
    && readBoolean(parsed.liveDataMutationAllowed) === false
    && readBoolean(routePolicy.summaryFirstMode) === true
    && readBoolean(routePolicy.broadRawReadsDefault) === false
    && readBoolean(validation.chatNavPaymentRuntimeChanged) === false
    && readBoolean(debugLane.rawDumpsBeforeSummary) === false
    && readLaneNumber("duplicateUserMetricSections") === 0;

  return {
    path: USER_MANAGEMENT_REFACTOR_PATH,
    status: sourceReady ? "source_ready_user_management_refactor" : status,
    passed: false,
    detail: sourceReady
      ? "User management is source-ready for compact identity, account, consent, activity, person metric confidence, debug lane, and summary-first route evidence without clearing deployed runtime truth."
      : "User management refactor evidence is missing required source-ready guardrails.",
    evidence: [
      `userManagementRefactor.status=${status}`,
      `userManagementRefactor.usersSummarized=${readLaneNumber("usersSummarized")}`,
      `userManagementRefactor.lowConfidenceMetrics=${readLaneNumber("lowConfidenceMetrics")}`,
      `userManagementRefactor.rawDumpsBeforeSummary=${readBoolean(debugLane.rawDumpsBeforeSummary) === true}`,
      `userManagementRefactor.duplicateUserMetricSections=${readLaneNumber("duplicateUserMetricSections")}`,
      `userManagementRefactor.summaryFirstRoute=${readBoolean(routePolicy.summaryFirstMode) === true}`,
      "launchGateImpact=does_not_clear_deployed_runtime_smoke",
      "protectedRuntime=chat_nav_payment_gumdrop_untouched",
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
  };
}

function readDebugRuntimeOrEventTranslationEvidence(root: string): PublicBetaEvidenceArtifact {
  const debugRuntime = readDebugRuntimeEvidence(root);
  const currentHead = readGitHead(root);
  const debugSourceReady = String(debugRuntime.status).includes("source_ready")
    && (!debugRuntime.sourceCommit || !currentHead || debugRuntime.sourceCommit === currentHead);
  if (debugSourceReady) return debugRuntime;
  const personMetricsHydration = readPersonMetricsHydrationEvidence(root);
  if (personMetricsHydration?.status === "source_ready_person_metrics_hydration") return personMetricsHydration;
  const telemetryTriggerTestMatrix = readTelemetryTriggerTestMatrixEvidence(root);
  if (telemetryTriggerTestMatrix?.status === "source_ready_telemetry_trigger_test_matrix") return telemetryTriggerTestMatrix;
  const userManagementRefactor = readUserManagementRefactorEvidence(root);
  if (userManagementRefactor?.status === "source_ready_user_management_refactor") return userManagementRefactor;
  return readEventTranslationBridgeEvidence(root) ?? debugRuntime;
}

function readUiSurfaceCoverageEvidence(root: string): PublicBetaEvidenceArtifact {
  const inspected: string[] = [];
  for (const evidencePath of [UI_VISUAL_SMOKE_MINIMAL_PATH] as const) {
    const parsed = readJsonFile(root, evidencePath);
    if (!parsed) {
      inspected.push(`${evidencePath}:missing`);
      continue;
    }

    const artifact = readUiVisualSmokeMinimalEvidence(root, evidencePath, parsed);
    inspected.push(`${evidencePath}:status=${artifact.status}:passed=${artifact.passed}`);
    return {
      ...artifact,
      evidence: [
        ...artifact.evidence,
        ...inspected,
      ],
    };
  }

  return {
    path: UI_VISUAL_SMOKE_MINIMAL_PATH,
    status: "missing_or_unknown",
    passed: false,
    detail: "No valid UI source coverage artifact was supplied.",
    evidence: [
      "uiSurfaceCoverageArtifactStatus=missing_or_unknown",
      ...inspected,
    ],
  };
}

export function runPublicBetaReadinessScore(root = process.cwd(), safeAutofixesApplied = 0) {
  const currentHead = readGitHead(root);
  const generatedAtUtc = new Date().toISOString();
  const debugEvidence = loadDebugEvidenceForAuditDomains([
    ...Object.keys(PUBLIC_BETA_DOMAIN_WEIGHTS),
    "support",
  ], root, 10);
  const report = buildPublicBetaReadinessReport({
    root,
    generatedAt: generatedAtUtc,
    safeAutofixesApplied,
    currentHead,
    debugEvidence,
    evidence: {
      requiredReports: collectGeneratedReportEvidence(root),
      debugRuntimeEvidenceArtifact: readDebugRuntimeOrEventTranslationEvidence(root),
      runtimeSmokeSubstituteMatrixEvidence: readRuntimeSmokeSubstituteMatrixEvidence(root),
      targetedBehaviorEvidence: readTargetedBehaviorEvidence(root),
      sourceBackedRuntimeConfidenceEvidence: readSourceBackedRuntimeConfidenceEvidence(root),
      realUsageConfidenceEvidence: readRealUsageConfidenceEvidence(root),
      realUsageConfidenceCalibrationEvidence: readRealUsageConfidenceCalibrationEvidence(root),
      behaviorMathEvidence: readBehaviorMathEvidence(root),
      activityVerificationEvidence: readActivityVerificationEvidence(root),
      uiSurfaceCoverageEvidence: readUiSurfaceCoverageEvidence(root),
      providerSmokeEvidence: readProviderSmokeEvidence(root),
      runtimeSmokeEvidence: readRuntimeSmokeEvidence(root),
      adminTruthSampleEvidence: readAdminTruthSampleEvidence(root),
      costReadiness: buildScore80CostReadinessFromRepo(root).costReadiness,
      nonEventScorePolicy: readNonEventScorePolicyEvidence(root),
      regressionRiskRefreshEvidence: readRegressionRiskRefreshEvidence(root),
      openPrTriageFresh: true,
    },
  });
  const refreshPlan = buildRefreshPlan(collectRefreshArtifacts(root, currentHead ?? "unknown", generatedAtUtc), {
    currentCodeVersion: currentHead,
    nowUtc: generatedAtUtc,
  });
  report.refreshPlan = refreshPlan;
  report.staleArtifacts = staleArtifactsFromPlan(refreshPlan);
  report.exactRefreshCommands = uniqueRefreshCommands(refreshPlan);
  writePublicBetaScoreReport(report, root);
  return report;
}

if (process.env.VITEST !== "true" && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = runPublicBetaReadinessScore();
  printPublicBetaScoreSummary(report);
}
