import { existsSync, readFileSync } from "node:fs";
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
import {
  classifyGeneratedArtifactVersion,
  readGeneratedArtifactGitContext,
} from "../../src/lib/agent-score/generated-artifact-version-policy";
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
import {
  TARGETED_VALIDATORS,
  validateTargetedBehaviorEvidenceReport,
  type TargetedBehaviorEvidenceReport,
} from "./validate-targeted-behavior-evidence";
import type {
  PublicBetaEvidenceArtifact,
  PublicBetaGeneratedReportEvidence,
} from "../../src/lib/agent-score/core";

const TRACKED_GENERATED_REPORTS = [
  "agent/state/targeted-behavior-evidence.generated.json",
] as const;

// Aggregate targeted-behavior evidence is an advisory rollup, not a universal
// prerequisite. Changed surfaces own their targeted validators; requiring this
// rollup for every commit turns unrelated source/config changes into a broad
// refresh marathon and duplicates the targetedBehaviorTests gate below.
const REQUIRED_EVIDENCE_REPORTS: readonly string[] = [];

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
  return parseJsonObjectOrNull(source) ?? {};
}

function parseJsonObjectOrNull(source: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(source) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
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
      ownedSourcePaths: entry.allowCurrentByImpact ? entry.ownedSourcePaths : undefined,
      exists: true,
    };
  });
}

function ownedSourcePathsForReport(reportPath: string) {
  if ((TRACKED_GENERATED_REPORTS as readonly string[]).includes(reportPath)) return undefined;
  const registryEntry = REFRESH_ARTIFACT_REGISTRY.find((entry) => entry.artifactPath === reportPath);
  return registryEntry?.allowCurrentByImpact ? registryEntry.ownedSourcePaths : undefined;
}

type EvidenceVersionMetadata = {
  currentHead?: string;
  versionStatus?: PublicBetaGeneratedReportEvidence["versionStatus"];
};

function evidenceVersionMetadata(
  root: string,
  artifactPath: string,
  artifactHead: string | undefined,
  currentHead?: string,
): EvidenceVersionMetadata {
  if (!artifactHead) return {};
  const resolvedCurrentHead = currentHead ?? readGitHead(root);
  let gitContext: ReturnType<typeof readGeneratedArtifactGitContext> | null = null;
  if (resolvedCurrentHead && artifactHead !== resolvedCurrentHead && existsSync(join(root, ".git"))) {
    try {
      gitContext = readGeneratedArtifactGitContext(root, artifactHead, artifactPath);
    } catch {
      gitContext = null;
    }
  }
  const version = classifyGeneratedArtifactVersion({
    artifactPath,
    artifactHead,
    currentHead: resolvedCurrentHead,
    parentHead: gitContext?.parentHead,
    changedFilesInHead: gitContext?.changedFilesInHead,
    changedFilesSinceArtifactHead: gitContext?.changedFilesSinceArtifactHead,
    ownedSourcePaths: ownedSourcePathsForReport(artifactPath),
  });
  return {
    currentHead: resolvedCurrentHead,
    versionStatus: version.status,
  };
}

function evidenceVersionIsAccepted(metadata: EvidenceVersionMetadata) {
  return metadata.versionStatus === "current_head"
    || metadata.versionStatus === "same_commit_snapshot"
    || metadata.versionStatus === "current_by_impact";
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
    return readGeneratedArtifactGitContext(root).currentHead;
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
  const artifactHead = readString(parsed.sourceCommit) ?? readString(parsed.currentHead);
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
    sourceCommit: artifactHead,
    ...evidenceVersionMetadata(root, filePath, artifactHead),
  };
}

function readUiVisualSmokeMinimalEvidence(root: string, filePath: string, parsed: Record<string, unknown>) {
  const surfaces = Array.isArray(parsed.surfaces) ? parsed.surfaces : [];
  const summary = readRecord(parsed.summary);
  const formalGateImpact = readRecord(parsed.formalGateImpact);
  const validationFailures = Array.isArray(parsed.validationFailures)
    ? parsed.validationFailures.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
  const validatorPassed = validationFailures.length === 0;
  const normalized: UiVisualSmokeMinimalReport = {
    status: (validatorPassed
      ? readString(parsed.status) ?? "source_surface_checks_failed"
      : "source_surface_checks_failed") as UiVisualSmokeReportStatus,
    passed: validatorPassed && readBoolean(parsed.passed) === true,
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt) ?? new Date(0).toISOString(),
    currentHead: readString(parsed.currentHead),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
    detail: readString(parsed.detail) ?? "UI source coverage evidence artifact was found.",
    nonUiLanesBlocked: readBoolean(parsed.nonUiLanesBlocked) === true,
    formalGateImpact: {
      clearsUiSurfaceCoverage: validatorPassed && readBoolean(formalGateImpact.clearsUiSurfaceCoverage) === true,
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
      ? [
          ...parsed.evidence.filter((value): value is string => typeof value === "string"),
          `uiVisualSmoke.validationFailureCount=${validationFailures.length}`,
          ...validationFailures.map((failure) => `uiVisualSmoke.validationFailure=${failure}`),
        ]
      : [`uiVisualSmoke.validationFailureCount=${validationFailures.length}`],
    nextExactSteps: Array.isArray(parsed.nextExactSteps)
      ? parsed.nextExactSteps.filter((value): value is string => typeof value === "string")
      : [],
  };
  const summarized = summarizeUiVisualSmokeEvidenceForScore(normalized);
  const artifactHead = normalized.sourceCommit ?? normalized.currentHead;
  return {
    ...summarized,
    path: filePath,
    evidence: [
      ...summarized.evidence,
      `uiVisualSmoke.artifactPath=${filePath}`,
      `uiVisualSmoke.artifactExists=${Boolean(readJsonFile(root, filePath))}`,
      `${UI_VISUAL_SMOKE_REQUIRED_SURFACES_EVIDENCE_KEY}=exact_surface_list_required`,
    ],
    ...evidenceVersionMetadata(root, filePath, artifactHead),
  };
}

export function collectGeneratedReportEvidence(root: string, currentHead?: string, now = Date.now()): PublicBetaGeneratedReportEvidence[] {
  return TRACKED_GENERATED_REPORTS.map((reportPath) => {
    const fullPath = join(root, reportPath);
    if (!existsSync(fullPath)) {
      return { path: reportPath, freshness: "missing" };
    }

    const parsed = parseJsonObjectOrNull(readFileSync(fullPath, "utf8"));
    if (!parsed) {
      return {
        path: reportPath,
        freshness: "unknown",
        currentHead,
        versionStatus: "missing_version",
      };
    }
    const generatedAt = typeof parsed.generatedAtUtc === "string"
      ? parsed.generatedAtUtc
      : typeof parsed.generatedAt === "string"
        ? parsed.generatedAt
        : undefined;
    const ageHours = generatedAt ? (now - Date.parse(generatedAt)) / (60 * 60 * 1000) : Number.NaN;
    const artifactHead = typeof parsed.sourceCommit === "string"
      ? parsed.sourceCommit
      : typeof parsed.currentHead === "string"
        ? parsed.currentHead
        : undefined;
    const gitContext = artifactHead && currentHead && artifactHead !== currentHead
      ? readGeneratedArtifactGitContext(root, artifactHead, reportPath)
      : null;
    const version = artifactHead && currentHead
      ? classifyGeneratedArtifactVersion({
        artifactPath: reportPath,
        artifactHead,
        currentHead,
        parentHead: gitContext?.parentHead,
        changedFilesInHead: gitContext?.changedFilesInHead,
        changedFilesSinceArtifactHead: gitContext?.changedFilesSinceArtifactHead,
        ownedSourcePaths: ownedSourcePathsForReport(reportPath),
      })
      : null;
    const embeddedFreshness = parsed.freshness === "fresh" || parsed.freshness === "stale" || parsed.freshness === "unknown"
      ? parsed.freshness
      : undefined;
    const reportStatus = (readString(parsed.status) ?? readString(parsed.overallStatus) ?? "").toLowerCase();
    const validationFailures = Array.isArray(parsed.validationFailures)
      ? parsed.validationFailures.filter((failure) => typeof failure === "string" && failure.trim().length > 0)
      : [];
    const validationState: PublicBetaGeneratedReportEvidence["validationState"] = validationFailures.length > 0
      || readBoolean(parsed.passed) === false
      || /fail|failed|blocked|error/u.test(reportStatus)
      ? "failed"
      : readBoolean(parsed.passed) === true && /pass|passed|ready|clean/u.test(reportStatus)
        ? "passed"
        : "unknown";
    let freshness: PublicBetaGeneratedReportEvidence["freshness"] = "unknown";
    if (version?.status === "stale_source_version") {
      freshness = "stale";
    } else if (version && !version.needsRefresh) {
      if (embeddedFreshness === "stale" || embeddedFreshness === "unknown") {
        freshness = embeddedFreshness;
      } else if (Number.isFinite(ageHours) && ageHours >= 0) {
        freshness = ageHours <= PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS ? "fresh" : "stale";
      }
    }

    return {
      path: reportPath,
      generatedAt,
      sourceCommit: artifactHead,
      freshness,
      ageHours: Number.isFinite(ageHours) ? ageHours : undefined,
      currentHead,
      versionStatus: version?.status ?? "missing_version",
      validationState,
      validationDetail: validationState === "failed"
        ? validationFailures[0] ?? `status=${reportStatus || "unknown"}; passed=${String(parsed.passed)}`
        : validationState === "passed"
          ? `status=${reportStatus}; passed=true`
          : "No explicit passing validation state was supplied.",
    };
  });
}

export function readProviderSmokeEvidence(root: string): PublicBetaEvidenceArtifact {
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
  const providerPassedFlag = readBoolean(providerSmoke.passed);
  const readinessPassedFlag = readBoolean(readinessImpact.providerSmokeGatePassed);
  const validationFailures = Array.isArray(parsed.validationFailures)
    ? parsed.validationFailures.filter((failure) => typeof failure === "string" && failure.trim().length > 0)
    : [];
  const gateFieldsAgree = providerPassedFlag === readinessPassedFlag;
  const providerGatePassed = providerPassedFlag === true
    && readinessPassedFlag === true
    && validationFailures.length === 0;
  const status = validationFailures.length > 0 || !gateFieldsAgree ? "failed" : providerStatus;
  const passed = providerGatePassed
    && status !== "missing_formal_evidence"
    && status !== "operator_reported_not_formal_provider_smoke"
    && paypalStatus !== "operator_reported_not_formal_provider_smoke";
  const operatorContextNote = operatorSmokeNote && passed
    ? "Operator-confirmed revenue is retained as product context; the current provider-backed source artifact controls this gate."
    : operatorSmokeNote;
  const paypalNote = readString(paypalRefillSmoke.note);
  const providerRecommendedAction = readString(providerSmoke.recommendedAction);
  const artifactHead = readString(parsed.sourceCommit) ?? readString(parsed.currentHead);

  return {
    path: PROVIDER_SMOKE_EVIDENCE_PATH,
    status,
    passed,
    detail: [
      operatorContextNote,
      validationFailures[0],
      !gateFieldsAgree ? "Provider evidence gate fields disagree, so the artifact cannot clear the gate." : undefined,
      passed ? "Provider-backed source activity evidence passed." : "Provider-backed source activity evidence is missing.",
      paypalNote,
      providerRecommendedAction,
    ].filter(Boolean).join(" "),
    evidence: [
      `providerArtifactStatus=${status}`,
      `providerSmoke.status=${providerStatus}`,
      `providerSmoke.passed=${providerPassedFlag === true}`,
      `readinessImpact.providerSmokeGatePassed=${readinessPassedFlag === true}`,
      `providerSmoke.validationFailures=${validationFailures.length}`,
      ...operatorSmokeEvidence,
      ...(paypalStatus ? [`paypalRefillSmoke.status=${paypalStatus}`] : []),
      ...(paypalNote ? [`paypalRefillSmoke.note=${paypalNote}`] : []),
      `paypalRefillSmoke.providerBackedSourceArtifactAttached=${readBoolean(paypalRefillSmoke.formalRepoArtifactAttached) === true}`,
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: artifactHead,
    ...evidenceVersionMetadata(root, PROVIDER_SMOKE_EVIDENCE_PATH, artifactHead),
  };
}

export function readRuntimeSmokeEvidence(root: string): PublicBetaEvidenceArtifact {
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
  const reportedStatus = readString(parsed.overallStatus) ?? readString(parsed.status) ?? "runtime_unverified";
  const deploymentPassedFlag = readBoolean(parsed.runtimeDeploymentSmokePassed);
  const readinessPassedFlag = readBoolean(readinessImpact.runtimeGatePassed);
  const validationFailures = Array.isArray(parsed.validationFailures)
    ? parsed.validationFailures.filter((failure) => typeof failure === "string" && failure.trim().length > 0)
    : [];
  const gateFieldsAgree = deploymentPassedFlag === readinessPassedFlag;
  const runtimeGatePassed = deploymentPassedFlag === true
    && readinessPassedFlag === true
    && validationFailures.length === 0;
  const status = validationFailures.length > 0 || !gateFieldsAgree ? "failed" : reportedStatus;
  const passed = runtimeGatePassed && status !== "runtime_unverified" && status !== "missing_formal_evidence";
  const artifactHead = readString(parsed.sourceCommit) ?? readString(parsed.currentHead);

  return {
    path: RUNTIME_SMOKE_EVIDENCE_PATH,
    status,
    passed,
    detail: validationFailures[0]
      ?? (!gateFieldsAgree ? "Runtime evidence gate fields disagree, so the artifact cannot clear the gate." : undefined)
      ?? readString(readinessImpact.recommendedAction)
      ?? (passed ? "Deployed runtime route evidence passed." : "No deployed runtime route evidence was supplied."),
    evidence: [
      `runtimeArtifactStatus=${status}`,
      `runtimeDeploymentSmokePassed=${deploymentPassedFlag === true}`,
      `readinessImpact.runtimeGatePassed=${readinessPassedFlag === true}`,
      `runtimeSmoke.validationFailures=${validationFailures.length}`,
      ...evidenceLinesFromArray(parsed.evidenceItems, "runtimeEvidenceItems"),
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: artifactHead,
    ...evidenceVersionMetadata(root, RUNTIME_SMOKE_EVIDENCE_PATH, artifactHead),
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
  const artifactHead = readString(sourceSample.sourceCommit) ?? readString(sourceSample.currentHead);
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
    sourceCommit: artifactHead,
    ...evidenceVersionMetadata(root, ADMIN_TRUTH_SOURCE_SAMPLE_PATH, artifactHead),
  };
}

export function readAdminTruthSampleEvidence(root: string): PublicBetaEvidenceArtifact {
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
  const formalAdminTruthSamplePassed = readBoolean(parsed.formalAdminTruthSamplePassed) === true;
  const adminGatePassed = readBoolean(readinessImpact.adminTruthSampleGatePassed) === true;
  const passed = freshSampleAttached
    && formalAdminTruthSamplePassed
    && adminGatePassed
    && sampleCount > 0
    && status !== "missing_or_unknown";
  if (!passed) {
    const sourceSample = readAdminTruthSourceSampleEvidence(root);
    if (sourceSample) return sourceSample;
  }
  const artifactHead = readString(parsed.sourceCommit) ?? readString(parsed.currentHead);

  return {
    path: ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH,
    status,
    passed,
    detail: readString(readinessImpact.recommendedAction)
      ?? (passed ? "Fresh admin source activity evidence passed." : "No fresh admin source activity evidence was supplied."),
    evidence: [
      `adminTruthSampleArtifactStatus=${status}`,
      `freshAdminTruthSampleAttached=${freshSampleAttached}`,
      `formalAdminTruthSamplePassed=${formalAdminTruthSamplePassed}`,
      `readinessImpact.adminTruthSampleGatePassed=${adminGatePassed}`,
      `sampleCount=${sampleCount}`,
      ...evidenceLinesFromArray(parsed.adminTruthCommandEvidence, "adminTruthCommandEvidence"),
    ],
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
    sourceCommit: artifactHead,
    ...evidenceVersionMetadata(root, ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH, artifactHead),
  };
}

export function readTargetedBehaviorEvidence(
  root: string,
  currentHead = readGitHead(root),
  now = Date.now(),
): PublicBetaEvidenceArtifact {
  const parsed = readJsonFile(root, TARGETED_BEHAVIOR_EVIDENCE_PATH);
  if (!parsed) {
    return {
      path: TARGETED_BEHAVIOR_EVIDENCE_PATH,
      status: "missing_formal_evidence",
      passed: false,
      detail: "No valid targeted source validator evidence artifact was supplied.",
      evidence: [
        `artifactPath=${TARGETED_BEHAVIOR_EVIDENCE_PATH}`,
        "artifactExists=false_or_malformed",
        "strictTargetedBehaviorSchema=false",
      ],
    };
  }

  const generatedAtUtc = readString(parsed.generatedAtUtc);
  const generatedAtMs = generatedAtUtc ? Date.parse(generatedAtUtc) : Number.NaN;
  const artifactHead = readString(parsed.currentHead);
  const sourceCommit = readString(parsed.sourceCommit);
  const latestCodeVersion = readString(parsed.latestCodeVersion);
  const versionMetadata = evidenceVersionMetadata(
    root,
    TARGETED_BEHAVIOR_EVIDENCE_PATH,
    sourceCommit,
    currentHead,
  );
  const artifactVersionAccepted = evidenceVersionIsAccepted(versionMetadata);
  const validationFailures = Array.isArray(parsed.validationFailures)
    && parsed.validationFailures.every((value) => typeof value === "string")
    ? parsed.validationFailures as string[]
    : null;
  const validatorResultsAreRecords = Array.isArray(parsed.validatorResults)
    && parsed.validatorResults.every((value) => Boolean(value) && typeof value === "object" && !Array.isArray(value));
  const validatorResults = Array.isArray(parsed.validatorResults) && validatorResultsAreRecords
    ? parsed.validatorResults.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value))
    : [];
  const expectedValidatorIds = TARGETED_VALIDATORS.map((validator) => validator.id).sort();
  const actualValidatorIds = validatorResults
    .map((result) => readString(result.id))
    .filter((value): value is string => Boolean(value))
    .sort();
  const validatorSetMatches = validatorResults.length === TARGETED_VALIDATORS.length
    && actualValidatorIds.length === expectedValidatorIds.length
    && actualValidatorIds.every((id, index) => id === expectedValidatorIds[index]);
  const childResultsStrict = validatorSetMatches && validatorResults.every((result) => {
    const id = readString(result.id);
    const childGeneratedAtUtc = readString(result.artifactGeneratedAtUtc);
    const childGeneratedAtMs = childGeneratedAtUtc ? Date.parse(childGeneratedAtUtc) : Number.NaN;
    const childAgeHours = (now - childGeneratedAtMs) / (60 * 60 * 1000);
    return Boolean(
      id
      && result.status === "pass"
      && result.reportKey === id
      && result.currentHead === latestCodeVersion
      && result.sourceCommit === result.currentHead
      && result.canClearSourceGate === true
      && Array.isArray(result.childValidationFailures)
      && result.childValidationFailures.length === 0
      && Number.isFinite(childGeneratedAtMs)
      && childAgeHours >= 0
      && childAgeHours <= PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS
    );
  });
  const aggregateShapeSafe = validationFailures !== null
    && Array.isArray(parsed.doesNotClear)
    && parsed.doesNotClear.every((value) => typeof value === "string")
    && Array.isArray(parsed.surfacesCovered)
    && parsed.surfacesCovered.every((value) => typeof value === "string")
    && validatorResultsAreRecords;
  const aggregateValidationFailures = aggregateShapeSafe
    ? validateTargetedBehaviorEvidenceReport(parsed as TargetedBehaviorEvidenceReport)
    : ["targeted behavior aggregate shape is invalid."];
  const readinessImpact = readRecord(parsed.readinessImpact);
  const ageHours = (now - generatedAtMs) / (60 * 60 * 1000);
  const strictSchemaPassed = Boolean(
    parsed.reportKey === "targeted-behavior-evidence"
    && parsed.status === "passed"
    && parsed.overallStatus === "passed"
    && parsed.passed === true
    && parsed.canClearSourceGate === true
    && /^[0-9a-f]{40}$/iu.test(currentHead ?? "")
    && artifactHead === sourceCommit
    && sourceCommit === latestCodeVersion
    && artifactVersionAccepted
    && Number.isFinite(generatedAtMs)
    && ageHours >= 0
    && ageHours <= PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS
    && validationFailures?.length === 0
    && aggregateValidationFailures.length === 0
    && childResultsStrict
    && parsed.formalEvidenceImpact === "source_behavior_only"
    && readinessImpact.targetedBehaviorGatePassed === true
  );
  const status = strictSchemaPassed ? "passed" : "failed";

  return {
    path: TARGETED_BEHAVIOR_EVIDENCE_PATH,
    status,
    passed: strictSchemaPassed,
    detail: strictSchemaPassed
      ? "Targeted source behavior validators passed under the accepted generated-artifact version and source-only evidence contracts."
      : "Targeted behavior evidence failed strict identity, provenance, freshness, verdict, or source-only classification checks.",
    evidence: [
      `artifactPath=${TARGETED_BEHAVIOR_EVIDENCE_PATH}`,
      "artifactExists=true",
      `strictTargetedBehaviorSchema=${strictSchemaPassed}`,
      `reportKey=${readString(parsed.reportKey) ?? "missing"}`,
      `artifactHead=${artifactHead ?? "missing"}`,
      `sourceCommit=${sourceCommit ?? "missing"}`,
      `latestCodeVersion=${latestCodeVersion ?? "missing"}`,
      `artifactVersionStatus=${versionMetadata.versionStatus ?? "missing_version"}`,
      `formalEvidenceImpact=${readString(parsed.formalEvidenceImpact) ?? "missing"}`,
      `validationFailureCount=${validationFailures?.length ?? "missing"}`,
      `validatorSetMatches=${validatorSetMatches}`,
      `childResultsStrict=${childResultsStrict}`,
      `aggregateValidationFailureCount=${aggregateValidationFailures.length}`,
      ...evidenceLinesFromArray(parsed.evidence, "artifactEvidence"),
    ],
    generatedAtUtc,
    sourceCommit,
    ...versionMetadata,
  };
}

export function readRegressionRiskRefreshEvidence(root: string, currentHead = readGitHead(root), now = Date.now()) {
  const parsed = readJsonFile(root, REGRESSION_RISK_REFRESH_PATH);
  if (!parsed) return undefined;
  const scoreAfter = readRecord(parsed.scoreAfter);
  const generatedAtUtc = readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt);
  const generatedAtMs = generatedAtUtc ? Date.parse(generatedAtUtc) : Number.NaN;
  const sourceCommit = readString(parsed.sourceCommit) ?? readString(parsed.currentHead);
  const versionMetadata = evidenceVersionMetadata(
    root,
    REGRESSION_RISK_REFRESH_PATH,
    sourceCommit,
    currentHead,
  );
  const ageHours = (now - generatedAtMs) / (60 * 60 * 1000);
  const artifactIsFreshAndCurrent = Boolean(
    currentHead
    && evidenceVersionIsAccepted(versionMetadata)
    && Number.isFinite(ageHours)
    && ageHours >= 0
    && ageHours <= PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS,
  );
  const highBlastCoverageCurrent = readBoolean(parsed.highBlastCoverageCurrent) === true
    && artifactIsFreshAndCurrent;
  return {
    highBlastCoverageCurrent,
    regressionRiskScore: readNumber(scoreAfter.regressionRisk),
    failedLaneCount: Array.isArray(parsed.failedLanes) ? parsed.failedLanes.length : undefined,
    inFlightLaneCount: Array.isArray(parsed.inFlightLanes) ? parsed.inFlightLanes.length : undefined,
    sourceCommit,
    ...versionMetadata,
  };
}

export function exactRefreshCommandsForPlan(plan: ReturnType<typeof buildRefreshPlan>) {
  return uniqueRefreshCommands(plan.filter((entry) => entry.needsRefresh));
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
  const artifactHead = readString(parsed.sourceCommit) ?? readString(parsed.currentHead);

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
    sourceCommit: artifactHead,
    ...evidenceVersionMetadata(root, LIVE_EVIDENCE_GATE_REPLACEMENT_PATH, artifactHead),
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

export function readActivityVerificationEvidence(root: string): PublicBetaEvidenceArtifact {
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
  const artifactHead = readString(parsed.sourceCommit) ?? readString(parsed.currentHead);
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
    sourceCommit: artifactHead,
    ...evidenceVersionMetadata(root, ACTIVITY_VERIFICATION_ENGINE_PATH, artifactHead),
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

export function readPersonMetricsHydrationEvidence(
  root: string,
  currentHead = readGitHead(root),
  now = Date.now(),
): PublicBetaEvidenceArtifact | null {
  const parsed = readJsonFile(root, PERSON_METRICS_HYDRATION_PATH);
  if (!parsed) return null;

  const debugLane = readRecord(parsed.debugLane);
  const readLaneNumber = (key: string) => readNumber(debugLane[key]) ?? readNumber(parsed[key]) ?? 0;
  const status = readString(parsed.status) ?? "missing_or_unknown";
  const evidenceMode = readString(parsed.evidenceMode) ?? "missing_or_unknown";
  const gapCount = readLaneNumber("gaps");
  const generatedAtUtc = readString(parsed.generatedAtUtc);
  const generatedAtMs = generatedAtUtc ? Date.parse(generatedAtUtc) : Number.NaN;
  const artifactHead = readString(parsed.currentHead);
  const sourceCommit = readString(parsed.sourceCommit);
  const versionMetadata = evidenceVersionMetadata(
    root,
    PERSON_METRICS_HYDRATION_PATH,
    sourceCommit,
    currentHead,
  );
  const validationFailures = Array.isArray(parsed.validationFailures)
    && parsed.validationFailures.every((value) => typeof value === "string")
    ? parsed.validationFailures as string[]
    : null;
  const ageHours = (now - generatedAtMs) / (60 * 60 * 1000);
  const sourceReady = status === "pass"
    && parsed.reportKey === "person-metrics-hydration"
    && parsed.passed === true
    && parsed.canClearSourceGate === true
    && parsed.canClearRuntimeGate === false
    && parsed.canClearProviderGate === false
    && parsed.canClearAdminTruthGate === false
    && /^[0-9a-f]{40}$/iu.test(currentHead ?? "")
    && artifactHead === sourceCommit
    && evidenceVersionIsAccepted(versionMetadata)
    && Number.isFinite(generatedAtMs)
    && ageHours >= 0
    && ageHours <= PUBLIC_BETA_REQUIRED_REPORT_STALE_HOURS
    && validationFailures?.length === 0
    && gapCount === 0
    && readBoolean(parsed.productionReadsRequired) === false
    && readBoolean(parsed.legacyMutationAllowed) === false
    && evidenceMode === "source_validation_fixture"
    && readBoolean(parsed.fakeMetricsUsed) === true;

  return {
    path: PERSON_METRICS_HYDRATION_PATH,
    status: sourceReady ? "source_ready_person_metrics_hydration" : "failed",
    passed: sourceReady,
    detail: sourceReady
      ? "Person metrics hydration is source-ready for canonical envelopes, linked guest/user confidence, debug evidence, and score inputs without claiming future real activity as proven."
      : "Person metrics hydration evidence is missing required source-ready guardrails.",
    evidence: [
      `personMetricsHydration.status=${status}`,
      `personMetricsHydration.evidenceMode=${evidenceMode}`,
      `personMetricsHydration.fakeMetricsUsed=${readBoolean(parsed.fakeMetricsUsed) === true}`,
      `personMetricsHydration.producersRegistered=${readLaneNumber("producersRegistered")}`,
      `personMetricsHydration.producersConnected=${readLaneNumber("producersConnected")}`,
      `personMetricsHydration.eventEnvelopesHydrated=${readLaneNumber("eventEnvelopesHydrated")}`,
      `personMetricsHydration.personMetricsMapped=${readLaneNumber("personMetricsMapped")}`,
      `personMetricsHydration.lowConfidenceMetrics=${readLaneNumber("lowConfidenceMetrics")}`,
      `personMetricsHydration.gapCount=${gapCount}`,
      `personMetricsHydration.strictSourceEnvelope=${sourceReady}`,
      `personMetricsHydration.artifactVersionStatus=${versionMetadata.versionStatus ?? "missing_version"}`,
      "launchGateImpact=does_not_clear_deployed_runtime_smoke",
      "legacyImpact=unknown_legacy_never_exact_user_truth",
    ],
    generatedAtUtc,
    sourceCommit,
    ...versionMetadata,
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

export function readDebugRuntimeEvidenceForScore(root: string): PublicBetaEvidenceArtifact {
  return readDebugRuntimeEvidence(root);
}

export function readUiSurfaceCoverageEvidence(root: string): PublicBetaEvidenceArtifact {
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
  const generatedReportEvidence = collectGeneratedReportEvidence(root, currentHead);
  const requiredReports = generatedReportEvidence.filter((report) =>
    REQUIRED_EVIDENCE_REPORTS.includes(report.path));
  const debugEvidence = loadDebugEvidenceForAuditDomains([
    ...Object.keys(PUBLIC_BETA_DOMAIN_WEIGHTS),
    "support",
  ], root, 10);
  const providerSmokeEvidence = readProviderSmokeEvidence(root);
  const report = buildPublicBetaReadinessReport({
    root,
    generatedAt: generatedAtUtc,
    safeAutofixesApplied,
    currentHead,
    debugEvidence,
    evidence: {
      requiredReports,
      debugRuntimeEvidenceArtifact: readDebugRuntimeEvidenceForScore(root),
      runtimeSmokeSubstituteMatrixEvidence: readRuntimeSmokeSubstituteMatrixEvidence(root),
      targetedBehaviorEvidence: readTargetedBehaviorEvidence(root),
      sourceBackedRuntimeConfidenceEvidence: readSourceBackedRuntimeConfidenceEvidence(root),
      realUsageConfidenceEvidence: readRealUsageConfidenceEvidence(root),
      realUsageConfidenceCalibrationEvidence: readRealUsageConfidenceCalibrationEvidence(root),
      behaviorMathEvidence: readBehaviorMathEvidence(root),
      activityVerificationEvidence: readActivityVerificationEvidence(root),
      uiSurfaceCoverageEvidence: readUiSurfaceCoverageEvidence(root),
      providerSmokeEvidence,
      paymentSourceOfFundsEvidence: providerSmokeEvidence,
      runtimeSmokeEvidence: readRuntimeSmokeEvidence(root),
      adminTruthSampleEvidence: readAdminTruthSampleEvidence(root),
      costReadiness: buildScore80CostReadinessFromRepo(root).costReadiness,
      nonEventScorePolicy: readNonEventScorePolicyEvidence(root),
      regressionRiskRefreshEvidence: readRegressionRiskRefreshEvidence(root, currentHead),
    },
  });
  const refreshPlan = buildRefreshPlan(collectRefreshArtifacts(root, currentHead ?? "unknown", generatedAtUtc), {
    currentCodeVersion: currentHead,
    nowUtc: generatedAtUtc,
  });
  report.refreshPlan = refreshPlan;
  report.staleArtifacts = staleArtifactsFromPlan(refreshPlan);
  report.exactRefreshCommands = exactRefreshCommandsForPlan(refreshPlan);
  writePublicBetaScoreReport(report, root);
  return report;
}

if (process.env.VITEST !== "true" && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = runPublicBetaReadinessScore();
  printPublicBetaScoreSummary(report);
}
