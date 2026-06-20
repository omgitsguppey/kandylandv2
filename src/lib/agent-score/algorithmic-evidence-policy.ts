import type {
  PublicBetaCostReadiness,
  PublicBetaEvidenceArtifact,
} from "./core";
import {
  evidenceArtifactHasFormalPass,
  evidenceArtifactHasSourceConfidence,
  evidenceArtifactNumericValue,
  evidenceArtifactStatusText,
} from "./evidence-quality";

export type AlgorithmicEvidenceGateCategory =
  | "visual_ui_gate"
  | "runtime_source_gate"
  | "telemetry_gate"
  | "admin_truth_gate"
  | "provider_gate"
  | "cost_gate"
  | "refresh_gate";

export type AlgorithmicEvidenceConfidence = "formal" | "partial" | "missing";

export type AlgorithmicEvidenceCoverageItem = {
  category: AlgorithmicEvidenceGateCategory;
  label: string;
  confidence: AlgorithmicEvidenceConfidence;
  score: number;
  sourcePath: string;
  sourceStatus: string;
  distinction: string;
  formalGateCleared: boolean;
  nextAction: string;
};

export type AlgorithmicEvidencePolicyInput = {
  uiChanged?: boolean;
  uiSurfaceCoverageEvidence?: PublicBetaEvidenceArtifact;
  runtimeSmokeEvidence?: PublicBetaEvidenceArtifact;
  providerSmokeEvidence?: PublicBetaEvidenceArtifact;
  debugRuntimeEvidence?: PublicBetaEvidenceArtifact;
  runtimeSmokeSubstituteMatrixEvidence?: PublicBetaEvidenceArtifact;
  sourceBackedRuntimeConfidenceEvidence?: PublicBetaEvidenceArtifact;
  realUsageConfidenceEvidence?: PublicBetaEvidenceArtifact;
  realUsageConfidenceCalibrationEvidence?: PublicBetaEvidenceArtifact;
  behaviorMathEvidence?: PublicBetaEvidenceArtifact;
  adminTruthSampleEvidence?: PublicBetaEvidenceArtifact;
  operatorRevenueSmokeEvidence?: PublicBetaEvidenceArtifact;
  costReadiness?: PublicBetaCostReadiness;
  costReadinessSourcePath?: string;
  refreshQueueEvidence?: PublicBetaEvidenceArtifact;
  refreshQueueSourcePath?: string;
};

export type AlgorithmicEvidencePolicyReport = {
  generatedAtUtc: string;
  reportKey: "algorithmic-evidence-policy";
  overallStatus: "algorithmic_evidence_policy_ready" | "algorithmic_evidence_policy_blocked";
  uiSurfaceCoverageScope: {
    uiSurfaceCoverageGate: {
      requiresSourceSurfaceCoverage: boolean;
      canClearFromAlgorithmicEvidence: boolean;
      status: AlgorithmicEvidenceConfidence;
      sourcePath: string;
      nextAction: string;
    };
    nonUiAlgorithmicEvidence: {
      blockedByUiSourceCoverage: false;
      coveredCategories: AlgorithmicEvidenceGateCategory[];
      score: number;
      note: string;
    };
  };
  runtimeSourceConfidence: AlgorithmicEvidenceCoverageItem;
  telemetryConfidence: AlgorithmicEvidenceCoverageItem;
  adminTruthConfidence: AlgorithmicEvidenceCoverageItem;
  providerConfidence: AlgorithmicEvidenceCoverageItem;
  costConfidence: AlgorithmicEvidenceCoverageItem;
  refreshConfidence: AlgorithmicEvidenceCoverageItem;
  nonUiAlgorithmicCoverageScore: number;
  formalGateImpact: {
    uiVisualGateCleared: boolean;
    deployedRuntimeSmokeCleared: boolean;
    formalProviderGateCleared: boolean;
    formalAdminRuntimeSampleCleared: boolean;
  };
  remainingFormalEvidenceGates: string[];
  coverage: AlgorithmicEvidenceCoverageItem[];
  validationFailures: string[];
};

const MISSING_ARTIFACT_PATH = "missing";

function pathOf(artifact?: PublicBetaEvidenceArtifact, fallback = MISSING_ARTIFACT_PATH) {
  return artifact?.path || fallback;
}

function confidenceFromScore(score: number, formalGateCleared = false): AlgorithmicEvidenceConfidence {
  if (formalGateCleared) return "formal";
  return score > 0 ? "partial" : "missing";
}

function buildCoverageItem(input: {
  category: AlgorithmicEvidenceGateCategory;
  label: string;
  score: number;
  sourcePath: string;
  sourceStatus: string;
  distinction: string;
  formalGateCleared?: boolean;
  nextAction: string;
}): AlgorithmicEvidenceCoverageItem {
  const formalGateCleared = input.formalGateCleared === true;
  const score = Math.max(0, Math.min(100, Math.round(input.score * 100) / 100));
  return {
    category: input.category,
    label: input.label,
    confidence: confidenceFromScore(score, formalGateCleared),
    score,
    sourcePath: input.sourcePath,
    sourceStatus: input.sourceStatus,
    distinction: input.distinction,
    formalGateCleared,
    nextAction: input.nextAction,
  };
}

function scoreCostReadinessSource(costReadiness?: PublicBetaCostReadiness) {
  if (!costReadiness) return 0;
  const lanes = Object.values(costReadiness);
  if (lanes.length === 0) return 0;
  const laneScores: number[] = lanes.map((lane) => {
    const status = String(lane.status).toLowerCase();
    if (/source_inventory_complete|not_detected_in_repo|config_not_in_repo/u.test(status)) return 75;
    if (/owner_review|cost_review_required/u.test(status)) return 45;
    if (/blocked|missing/u.test(status)) return 0;
    return 25;
  });
  return laneScores.reduce((sum: number, score) => sum + score, 0) / laneScores.length;
}

export function buildAlgorithmicEvidencePolicyReport(
  input: AlgorithmicEvidencePolicyInput,
): AlgorithmicEvidencePolicyReport {
  const uiSurfaceCoverageEvidence = input.uiSurfaceCoverageEvidence;
  const uiSurfaceCoverageGateCleared = evidenceArtifactHasFormalPass(uiSurfaceCoverageEvidence);
  const deployedRuntimeSmokeCleared = evidenceArtifactHasFormalPass(input.runtimeSmokeEvidence);
  const formalProviderGateCleared = evidenceArtifactHasFormalPass(input.providerSmokeEvidence);
  const formalAdminRuntimeSampleCleared = evidenceArtifactHasFormalPass(input.adminTruthSampleEvidence);

  const sourceBackedRuntimeScore = evidenceArtifactNumericValue(input.debugRuntimeEvidence, "sourceBackedRuntimeConfidence")
    ?? evidenceArtifactNumericValue(input.sourceBackedRuntimeConfidenceEvidence, "sourceBackedRuntimeConfidence")
    ?? (evidenceArtifactHasSourceConfidence(input.sourceBackedRuntimeConfidenceEvidence) ? 55 : 0);
  const runtimeSmokeSubstituteMatrixScore = evidenceArtifactNumericValue(input.runtimeSmokeSubstituteMatrixEvidence, "matrixRuntimeHealthCredit")
    ?? (evidenceArtifactHasSourceConfidence(input.runtimeSmokeSubstituteMatrixEvidence) ? 55 : 0);
  const realUsageScore = evidenceArtifactNumericValue(input.realUsageConfidenceEvidence, "confidenceScore")
    ?? (evidenceArtifactHasSourceConfidence(input.realUsageConfidenceEvidence) ? 55 : 0);
  const realUsageCalibrationScore = evidenceArtifactNumericValue(input.realUsageConfidenceCalibrationEvidence, "runtimeHealthCredit")
    ?? evidenceArtifactNumericValue(input.realUsageConfidenceCalibrationEvidence, "calibratedConfidenceScore")
    ?? (evidenceArtifactHasSourceConfidence(input.realUsageConfidenceCalibrationEvidence) ? 55 : 0);
  const runtimeSourceScore = deployedRuntimeSmokeCleared
    ? 100
    : Math.max(
        sourceBackedRuntimeScore,
        runtimeSmokeSubstituteMatrixScore,
        realUsageScore,
        realUsageCalibrationScore,
        evidenceArtifactHasSourceConfidence(input.debugRuntimeEvidence) ? 55 : 0,
      );

  const behaviorMathScore = evidenceArtifactHasSourceConfidence(input.behaviorMathEvidence) ? 85 : 0;
  const telemetryScore = Math.max(behaviorMathScore, realUsageScore, realUsageCalibrationScore);
  const adminTruthScore = formalAdminRuntimeSampleCleared
    ? 100
    : evidenceArtifactHasSourceConfidence(input.adminTruthSampleEvidence) ? 55 : 0;
  const providerScore = formalProviderGateCleared
    ? 100
    : evidenceArtifactHasSourceConfidence(input.operatorRevenueSmokeEvidence) || evidenceArtifactHasSourceConfidence(input.providerSmokeEvidence) ? 40 : 0;
  const costScore = input.costReadinessSourcePath && !input.costReadiness
    ? 75
    : scoreCostReadinessSource(input.costReadiness);
  const refreshScore = evidenceArtifactHasSourceConfidence(input.refreshQueueEvidence) || input.refreshQueueSourcePath ? 75 : 0;

  const runtimeSourceConfidence = buildCoverageItem({
    category: "runtime_source_gate",
    label: "Runtime source confidence",
    score: runtimeSourceScore,
    sourcePath: [
      pathOf(input.debugRuntimeEvidence),
      pathOf(input.runtimeSmokeSubstituteMatrixEvidence),
      pathOf(input.sourceBackedRuntimeConfidenceEvidence),
      pathOf(input.realUsageConfidenceEvidence),
      pathOf(input.realUsageConfidenceCalibrationEvidence),
    ].filter((path) => path !== MISSING_ARTIFACT_PATH).join(",") || MISSING_ARTIFACT_PATH,
    sourceStatus: [
      evidenceArtifactStatusText(input.debugRuntimeEvidence, "missing_or_unknown"),
      evidenceArtifactStatusText(input.runtimeSmokeSubstituteMatrixEvidence, "missing_or_unknown"),
      evidenceArtifactStatusText(input.sourceBackedRuntimeConfidenceEvidence, "missing_or_unknown"),
      evidenceArtifactStatusText(input.realUsageConfidenceEvidence, "missing_or_unknown"),
      evidenceArtifactStatusText(input.realUsageConfidenceCalibrationEvidence, "missing_or_unknown"),
    ].join(";"),
    distinction: deployedRuntimeSmokeCleared
      ? "formal deployed runtime smoke is attached"
      : "source-backed runtime confidence improves runtime health but does not clear deployed runtime smoke",
    formalGateCleared: deployedRuntimeSmokeCleared,
    nextAction: deployedRuntimeSmokeCleared
      ? "Keep runtime smoke artifact fresh."
      : "Attach deployed runtime smoke before clearing the formal runtime gate.",
  });

  const telemetryConfidence = buildCoverageItem({
    category: "telemetry_gate",
    label: "Telemetry and behavior confidence",
    score: telemetryScore,
    sourcePath: [
      pathOf(input.behaviorMathEvidence),
      pathOf(input.realUsageConfidenceEvidence),
      pathOf(input.realUsageConfidenceCalibrationEvidence),
    ].filter((path) => path !== MISSING_ARTIFACT_PATH).join(",") || MISSING_ARTIFACT_PATH,
    sourceStatus: [
      evidenceArtifactStatusText(input.behaviorMathEvidence, "missing_or_unknown"),
      evidenceArtifactStatusText(input.realUsageConfidenceEvidence, "missing_or_unknown"),
      evidenceArtifactStatusText(input.realUsageConfidenceCalibrationEvidence, "missing_or_unknown"),
    ].join(";"),
    distinction: "telemetry and behavior math can satisfy non-UI confidence without becoming visual proof",
    nextAction: "Keep behavior math and real usage confidence artifacts current.",
  });

  const adminTruthConfidence = buildCoverageItem({
    category: "admin_truth_gate",
    label: "Admin truth source confidence",
    score: adminTruthScore,
    sourcePath: pathOf(input.adminTruthSampleEvidence),
    sourceStatus: evidenceArtifactStatusText(input.adminTruthSampleEvidence, "missing_or_unknown"),
    distinction: formalAdminRuntimeSampleCleared
      ? "formal admin truth runtime sample is attached"
      : "admin source sample earns partial confidence but does not clear formal admin runtime sample",
    formalGateCleared: formalAdminRuntimeSampleCleared,
    nextAction: formalAdminRuntimeSampleCleared
      ? "Keep admin truth sample fresh."
      : "Attach a redacted production admin truth sample before clearing the formal admin gate.",
  });

  const providerConfidence = buildCoverageItem({
    category: "provider_gate",
    label: "Provider confidence",
    score: providerScore,
    sourcePath: formalProviderGateCleared
      ? pathOf(input.providerSmokeEvidence)
      : pathOf(input.operatorRevenueSmokeEvidence, pathOf(input.providerSmokeEvidence)),
    sourceStatus: formalProviderGateCleared
      ? evidenceArtifactStatusText(input.providerSmokeEvidence, "missing_or_unknown")
      : evidenceArtifactStatusText(input.operatorRevenueSmokeEvidence, "missing_or_unknown"),
    distinction: formalProviderGateCleared
      ? "formal provider smoke is attached"
      : "operator-confirmed revenue smoke is partial product confidence only",
    formalGateCleared: formalProviderGateCleared,
    nextAction: formalProviderGateCleared
      ? "Keep provider artifact fresh."
      : "Attach formal provider evidence before clearing provider smoke.",
  });

  const costConfidence = buildCoverageItem({
    category: "cost_gate",
    label: "Cost source confidence",
    score: costScore,
    sourcePath: input.costReadinessSourcePath ?? "src/lib/server/global-cost-surface-contract.ts",
    sourceStatus: input.costReadiness ? "source_cost_readiness_present" : "missing_or_unknown",
    distinction: "source cost readiness can improve cost confidence; external billing review remains separate",
    nextAction: "Keep source cost inventory current and attach owner billing review when required.",
  });

  const refreshConfidence = buildCoverageItem({
    category: "refresh_gate",
    label: "Refresh queue confidence",
    score: refreshScore,
    sourcePath: input.refreshQueueSourcePath ?? pathOf(input.refreshQueueEvidence, "agent/state/self-healing-refresh-queue.generated.json"),
    sourceStatus: input.refreshQueueEvidence ? evidenceArtifactStatusText(input.refreshQueueEvidence, "missing_or_unknown") : input.refreshQueueSourcePath ? "source_path_available" : "missing_or_unknown",
    distinction: "current refresh queue can satisfy source freshness ordering without creating runtime proof",
    nextAction: "Run the self-healing refresh queue when stale score-impact artifacts are detected.",
  });

  const coverage = [
    runtimeSourceConfidence,
    telemetryConfidence,
    adminTruthConfidence,
    providerConfidence,
    costConfidence,
    refreshConfidence,
  ];
  const nonUiAlgorithmicCoverageScore = Math.round(
    (coverage.reduce((sum, item) => sum + item.score, 0) / coverage.length) * 100,
  ) / 100;
  const remainingFormalEvidenceGates = [
    ...(deployedRuntimeSmokeCleared ? [] : ["Deployed runtime smoke requires a formal runtime artifact."]),
    ...(formalProviderGateCleared ? [] : ["Provider smoke requires a formal provider artifact."]),
    ...(formalAdminRuntimeSampleCleared ? [] : ["Admin truth sample requires a formal runtime/sample artifact."]),
  ];
  const uiSurfaceCoverageScope = {
    uiSurfaceCoverageGate: {
      requiresSourceSurfaceCoverage: input.uiChanged === true || !uiSurfaceCoverageGateCleared,
      canClearFromAlgorithmicEvidence: uiSurfaceCoverageGateCleared,
      status: confidenceFromScore(uiSurfaceCoverageGateCleared ? 100 : 0, uiSurfaceCoverageGateCleared),
      sourcePath: pathOf(uiSurfaceCoverageEvidence),
      nextAction: uiSurfaceCoverageGateCleared
        ? "Deterministic UI surface coverage is current; browser reproduction is optional only after source-reported UI issues."
        : "Run deterministic UI source coverage and device UI source checks; use browser reproduction only for concrete source-reported UI issues.",
    },
    nonUiAlgorithmicEvidence: {
      blockedByUiSourceCoverage: false as const,
      coveredCategories: coverage
        .filter((item) => item.score > 0)
        .map((item) => item.category),
      score: nonUiAlgorithmicCoverageScore,
      note: "UI source coverage is the default readiness evidence; optional browser reproduction must follow a source-reported UI issue and must not block telemetry, admin, cost, refresh, or source-runtime confidence.",
    },
  };
  const report: AlgorithmicEvidencePolicyReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "algorithmic-evidence-policy",
    overallStatus: "algorithmic_evidence_policy_ready",
    uiSurfaceCoverageScope,
    runtimeSourceConfidence,
    telemetryConfidence,
    adminTruthConfidence,
    providerConfidence,
    costConfidence,
    refreshConfidence,
    nonUiAlgorithmicCoverageScore,
    formalGateImpact: {
      uiVisualGateCleared: uiSurfaceCoverageGateCleared,
      deployedRuntimeSmokeCleared,
      formalProviderGateCleared,
      formalAdminRuntimeSampleCleared,
    },
    remainingFormalEvidenceGates,
    coverage,
    validationFailures: [],
  };
  const validationFailures = validateAlgorithmicEvidencePolicyReport(report);
  return {
    ...report,
    overallStatus: validationFailures.length > 0
      ? "algorithmic_evidence_policy_blocked"
      : "algorithmic_evidence_policy_ready",
    validationFailures,
  };
}

export function validateAlgorithmicEvidencePolicyReport(report: AlgorithmicEvidencePolicyReport) {
  const failures: string[] = [];
  if (report.formalGateImpact.uiVisualGateCleared && report.uiSurfaceCoverageScope.uiSurfaceCoverageGate.canClearFromAlgorithmicEvidence !== true) {
    failures.push("UI source coverage must clear the UI source gate when deterministic UI evidence is current.");
  }
  if (report.uiSurfaceCoverageScope.nonUiAlgorithmicEvidence.blockedByUiSourceCoverage !== false) {
    failures.push("UI source coverage must not block non-UI algorithmic evidence.");
  }
  if (report.providerConfidence.confidence === "partial" && report.formalGateImpact.formalProviderGateCleared) {
    failures.push("operator-confirmed provider confidence must not clear formal provider gate.");
  }
  if (report.runtimeSourceConfidence.confidence === "partial" && report.formalGateImpact.deployedRuntimeSmokeCleared) {
    failures.push("source-backed runtime confidence must not clear deployed runtime smoke.");
  }
  if (report.adminTruthConfidence.confidence === "partial" && report.formalGateImpact.formalAdminRuntimeSampleCleared) {
    failures.push("admin source sample must not clear formal admin runtime sample.");
  }
  for (const item of report.coverage) {
    if (!item.sourcePath || item.sourcePath === MISSING_ARTIFACT_PATH) {
      failures.push(`${item.category} lacks algorithmic evidence source path.`);
    }
    if (!item.distinction || !/formal|partial|source|visual|runtime|confidence/u.test(item.distinction)) {
      failures.push(`${item.category} lacks partial-vs-formal distinction.`);
    }
  }
  return failures;
}
