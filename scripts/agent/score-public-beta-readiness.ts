import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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
  summarizeUiVisualSmokeEvidenceForScore,
  type UiVisualSmokeMinimalReport,
  type UiVisualSmokeReportStatus,
  type UiVisualSmokeStatus,
} from "../../src/lib/evidence/ui-visual-smoke-contract";
import type { DeviceBand } from "../../src/lib/ui/mobile-scale-contract";
import { loadDebugEvidenceForAuditDomains } from "./load-debug-evidence-for-audit";
import { buildScore80CostReadinessFromRepo } from "./validate-score-80-cost-readiness";
import type {
  PublicBetaEvidenceArtifact,
  PublicBetaGeneratedReportEvidence,
} from "../../src/lib/agent-score/core";

const REQUIRED_EVIDENCE_REPORTS = [
  "agent/state/evidence-capture-status.generated.json",
  "agent/state/gumdrop-economy-accuracy.generated.json",
  "agent/state/creator-experience-simplification.generated.json",
  "agent/state/post-economy-creator-flow-qa.generated.json",
  "agent/state/user-creator-ui-parity.generated.json",
  "agent/state/user-facing-feature-connection-audit.generated.json",
  "agent/state/creator-dashboard-error-cost-inventory.generated.json",
] as const;

const PROVIDER_SMOKE_EVIDENCE_PATH = "agent/state/provider-smoke-evidence.generated.json";
const OPERATOR_REVENUE_SMOKE_PATH = "agent/state/operator-revenue-smoke.generated.json";
const RUNTIME_SMOKE_EVIDENCE_PATH = "agent/state/runtime-smoke-evidence.generated.json";
const SOURCE_BACKED_RUNTIME_CONFIDENCE_PATH = "agent/state/source-backed-runtime-confidence.generated.json";
const RUNTIME_SMOKE_SUBSTITUTE_MATRIX_PATH = "agent/state/runtime-smoke-substitute-matrix.generated.json";
const REAL_USAGE_CONFIDENCE_PATH = "agent/state/real-usage-confidence.generated.json";
const REAL_USAGE_CONFIDENCE_CALIBRATION_PATH = "agent/state/real-usage-confidence-calibration.generated.json";
const BEHAVIOR_MATH_VERIFICATION_PATH = "agent/state/behavior-math-verification.generated.json";
const DEBUG_RUNTIME_EVIDENCE_PATH = "agent/state/debug-runtime-evidence.generated.json";
const ADMIN_TRUTH_SAMPLE_EVIDENCE_PATH = "agent/state/admin-truth-sample-evidence.generated.json";
const ADMIN_TRUTH_SOURCE_SAMPLE_PATH = "agent/state/admin-truth-source-sample.generated.json";
const TARGETED_BEHAVIOR_EVIDENCE_PATH = "agent/state/targeted-behavior-evidence.generated.json";
const UI_VISUAL_SMOKE_MINIMAL_PATH = "agent/state/ui-visual-smoke-minimal.generated.json";
const UI_VISUAL_SMOKE_REQUIRED_SURFACES_EVIDENCE_KEY = "uiVisualSmoke.requiredSurfaces";
const VISUAL_MANUAL_EVIDENCE_PATHS = [
  UI_VISUAL_SMOKE_MINIMAL_PATH,
  "agent/state/manual-smoke-evidence.generated.json",
  "agent/state/visual-smoke-evidence.generated.json",
  "agent/state/screenshot-evidence.generated.json",
] as const;

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
    return {
      artifactPath: entry.artifactPath,
      generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
      sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
      currentCodeVersion: currentHead,
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
    status: (readString(parsed.status) ?? "operator_final_pending") as UiVisualSmokeReportStatus,
    passed: readBoolean(parsed.passed) === true,
    generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt) ?? new Date(0).toISOString(),
    currentHead: readString(parsed.currentHead),
    sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
    detail: readString(parsed.detail) ?? "UI-only visual smoke evidence artifact was found.",
    nonUiLanesBlocked: readBoolean(parsed.nonUiLanesBlocked) === true,
    formalGateImpact: {
      clearsVisualManualSmoke: readBoolean(formalGateImpact.clearsVisualManualSmoke) === true,
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
        screenshotArtifactPath: readString(record.screenshotArtifactPath),
        operatorConfirmed: readBoolean(record.operatorConfirmed) === true,
        operatorNote: readString(record.operatorNote),
        status: (readString(record.status) ?? "operator_final_pending") as UiVisualSmokeStatus,
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
      operatorConfirmedSurfaceIds: Array.isArray(summary.operatorConfirmedSurfaceIds)
        ? summary.operatorConfirmedSurfaceIds.filter((value): value is string => typeof value === "string")
        : [],
      screenshotAttachedSurfaceIds: Array.isArray(summary.screenshotAttachedSurfaceIds)
        ? summary.screenshotAttachedSurfaceIds.filter((value): value is string => typeof value === "string")
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
    const generatedAt = typeof parsed.generatedAt === "string" ? parsed.generatedAt : stats.mtime.toISOString();
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
  const operatorSmokeNote = operatorSmokeStatus === "operator_confirmed_revenue_smoke"
    ? "A real $50 GumDrop payment was operator-confirmed. Formal provider evidence is still separate."
    : undefined;
  if (!parsed) {
    const artifact = readEvidenceArtifact(
      root,
      PROVIDER_SMOKE_EVIDENCE_PATH,
      "missing_formal_evidence",
      "No formal provider smoke evidence artifact was supplied.",
    );
    if (operatorSmokeNote) {
      artifact.detail = `${operatorSmokeNote} ${artifact.detail}`;
      artifact.evidence.push(
        `operatorRevenueSmoke.status=${operatorSmokeStatus}`,
        "operatorRevenueSmoke.amountUsdConfirmed=50",
        "operatorRevenueSmoke.formalProviderSmokePassed=false",
        `operatorRevenueSmoke.note=${operatorSmokeNote}`,
      );
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
      passed ? "Formal provider smoke evidence passed." : "Formal provider smoke evidence is missing.",
      paypalNote,
      providerRecommendedAction,
    ].filter(Boolean).join(" "),
    evidence: [
      `providerArtifactStatus=${status}`,
      `providerSmoke.status=${providerStatus}`,
      `providerSmoke.passed=${readBoolean(providerSmoke.passed) === true}`,
      `readinessImpact.providerSmokeGatePassed=${readBoolean(readinessImpact.providerSmokeGatePassed) === true}`,
      ...(operatorSmokeNote
        ? [
          `operatorRevenueSmoke.status=${operatorSmokeStatus}`,
          "operatorRevenueSmoke.amountUsdConfirmed=50",
          "operatorRevenueSmoke.formalProviderSmokePassed=false",
          `operatorRevenueSmoke.note=${operatorSmokeNote}`,
        ]
        : []),
      ...(paypalStatus ? [`paypalRefillSmoke.status=${paypalStatus}`] : []),
      ...(paypalNote ? [`paypalRefillSmoke.note=${paypalNote}`] : []),
      `paypalRefillSmoke.formalRepoArtifactAttached=${readBoolean(paypalRefillSmoke.formalRepoArtifactAttached) === true}`,
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
      "No formal runtime smoke evidence artifact was supplied.",
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
      ?? (passed ? "Formal deployed runtime smoke passed." : "No deployed runtime smoke evidence was supplied."),
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
      ?? "Source-backed admin truth wiring is present; formal admin truth sample remains missing.",
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
      "No formal admin truth sample evidence artifact was supplied.",
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
      ?? (passed ? "Fresh admin truth sample evidence passed." : "No fresh admin truth sample evidence was supplied."),
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
    "No formal targeted behavior evidence artifact was supplied.",
  );
}

function readSourceBackedRuntimeConfidenceEvidence(root: string): PublicBetaEvidenceArtifact {
  return readEvidenceArtifact(
    root,
    SOURCE_BACKED_RUNTIME_CONFIDENCE_PATH,
    "missing_or_unknown",
    "No source-backed runtime confidence artifact was supplied.",
  );
}

function readRuntimeSmokeSubstituteMatrixEvidence(root: string): PublicBetaEvidenceArtifact {
  return readEvidenceArtifact(
    root,
    RUNTIME_SMOKE_SUBSTITUTE_MATRIX_PATH,
    "missing_or_unknown",
    "No runtime smoke substitute matrix artifact was supplied.",
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

function readDebugRuntimeEvidence(root: string): PublicBetaEvidenceArtifact {
  return readEvidenceArtifact(
    root,
    DEBUG_RUNTIME_EVIDENCE_PATH,
    "missing_or_unknown",
    "No source-backed debug/runtime evidence artifact was supplied.",
  );
}

function readVisualManualEvidence(root: string): PublicBetaEvidenceArtifact {
  const inspected: string[] = [];
  let structuredMissingArtifact: PublicBetaEvidenceArtifact | undefined;
  for (const evidencePath of VISUAL_MANUAL_EVIDENCE_PATHS) {
    const parsed = readJsonFile(root, evidencePath);
    if (!parsed) {
      inspected.push(`${evidencePath}:missing`);
      continue;
    }

    if (evidencePath === UI_VISUAL_SMOKE_MINIMAL_PATH) {
      const artifact = readUiVisualSmokeMinimalEvidence(root, evidencePath, parsed);
      inspected.push(`${evidencePath}:status=${artifact.status}:passed=${artifact.passed}`);
      if (artifact.passed) {
        return artifact;
      }
      structuredMissingArtifact = artifact;
      continue;
    }

    const status = readString(parsed.status) ?? readString(parsed.overallStatus) ?? "missing_or_unknown";
    const passed = (status === "passed" || status === "usable") && readBoolean(parsed.passed) !== false;
    inspected.push(`${evidencePath}:status=${status}:passed=${passed}`);
    if (passed) {
      return {
        path: evidencePath,
        status,
        passed: true,
        detail: readString(parsed.detail)
          ?? readString(parsed.summary)
          ?? "Schema-backed visual/manual evidence passed.",
        evidence: [
          `visualManualArtifactStatus=${status}`,
          `visualManualArtifactPath=${evidencePath}`,
          ...evidenceLinesFromArray(parsed.evidence, "visualManualEvidence"),
        ],
        generatedAtUtc: readString(parsed.generatedAtUtc) ?? readString(parsed.generatedAt),
        sourceCommit: readString(parsed.sourceCommit) ?? readString(parsed.currentHead),
      };
    }
  }

  if (structuredMissingArtifact) {
    return {
      ...structuredMissingArtifact,
      evidence: [
        ...structuredMissingArtifact.evidence,
        ...inspected,
      ],
    };
  }

  return {
    path: VISUAL_MANUAL_EVIDENCE_PATHS.join(","),
    status: "missing_formal_evidence",
    passed: false,
    detail: "No valid visual/manual evidence artifact was supplied.",
    evidence: [
      "visualManualArtifactStatus=missing_formal_evidence",
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
      debugRuntimeEvidenceArtifact: readDebugRuntimeEvidence(root),
      runtimeSmokeSubstituteMatrixEvidence: readRuntimeSmokeSubstituteMatrixEvidence(root),
      targetedBehaviorEvidence: readTargetedBehaviorEvidence(root),
      sourceBackedRuntimeConfidenceEvidence: readSourceBackedRuntimeConfidenceEvidence(root),
      realUsageConfidenceEvidence: readRealUsageConfidenceEvidence(root),
      realUsageConfidenceCalibrationEvidence: readRealUsageConfidenceCalibrationEvidence(root),
      behaviorMathEvidence: readBehaviorMathEvidence(root),
      visualManualEvidence: readVisualManualEvidence(root),
      providerSmokeEvidence: readProviderSmokeEvidence(root),
      runtimeSmokeEvidence: readRuntimeSmokeEvidence(root),
      adminTruthSampleEvidence: readAdminTruthSampleEvidence(root),
      costReadiness: buildScore80CostReadinessFromRepo(root).costReadiness,
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

const report = runPublicBetaReadinessScore();
printPublicBetaScoreSummary(report);
