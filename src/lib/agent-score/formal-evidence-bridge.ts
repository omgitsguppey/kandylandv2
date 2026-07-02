import {
  evidenceArtifactHasFormalPass,
  evidenceArtifactHasSourceConfidence,
  evidenceArtifactNumericValue,
  evidenceArtifactText,
} from "./evidence-quality";

export type FormalEvidenceClass =
  | "formal_provider_artifact"
  | "deployed_runtime_artifact"
  | "production_admin_truth_artifact"
  | "operator_confirmed_revenue"
  | "source_backed_runtime_confidence"
  | "real_usage_confidence"
  | "admin_source_sample"
  | "debug_runtime_source_evidence"
  | "runtime_substitute_matrix"
  | "missing_formal_artifact";

export type FormalEvidenceBridgeArtifact = {
  path: string;
  status: string;
  passed: boolean;
  detail: string;
  evidence: string[];
  generatedAtUtc?: string;
  currentHead?: string;
  sourceCommit?: string;
};

export type FormalEvidenceBridgeScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

export type FormalEvidenceBridgeGateCredit = {
  evidenceCredit: number;
  runtimeCredit: number;
  formalGateCleared: boolean;
  status: "formal" | "partial_source_confidence" | "missing_formal_artifact";
  nextAction: string;
  evidenceClasses: FormalEvidenceClass[];
};

export type FormalEvidenceBridgeReport = {
  generatedAtUtc: string;
  reportKey: "formal-evidence-bridge";
  currentHead: string;
  formalGateStatus: {
    providerSmoke: { cleared: boolean; status: string; nextAction: string };
    deployedRuntimeSmoke: { cleared: boolean; status: string; nextAction: string };
    adminProductionSample: { cleared: boolean; status: string; nextAction: string };
  };
  sourceConfidenceStatus: {
    runtimeConfidenceScore: number;
    realUsageConfidenceScore: number;
    adminSourceConfidenceScore: number;
    debugRuntimeConfidenceScore: number;
    runtimeSubstituteEvidenceScore: number;
  };
  operatorSignalStatus: {
    operatorConfirmedRevenue: boolean;
    formalProviderGateCleared: boolean;
    status: "operator_signal_only" | "formal_provider_artifact" | "missing";
  };
  gates: {
    runtimeProviderSmoke: FormalEvidenceBridgeGateCredit;
    adminTruthSamples: FormalEvidenceBridgeGateCredit;
    debugRuntimeEvidence: FormalEvidenceBridgeGateCredit;
  };
  evidenceClasses: FormalEvidenceClass[];
  sourceGapsRemaining: string[];
  formalGapsRemaining: string[];
  scoreBefore: FormalEvidenceBridgeScoreDimensions;
  scoreAfter: FormalEvidenceBridgeScoreDimensions;
  scoreDimensionImpact: {
    runtimeHealth: string;
    evidenceCompleteness: string;
  };
  nextExactSteps: string[];
  validationFailures: string[];
};

export type FormalEvidenceBridgeInput = {
  generatedAtUtc: string;
  currentHead: string;
  artifacts?: {
    providerSmoke?: FormalEvidenceBridgeArtifact;
    runtimeSmoke?: FormalEvidenceBridgeArtifact;
    adminSourceSample?: FormalEvidenceBridgeArtifact;
    operatorRevenueSmoke?: FormalEvidenceBridgeArtifact;
    sourceBackedRuntimeConfidence?: FormalEvidenceBridgeArtifact;
    realUsageConfidence?: FormalEvidenceBridgeArtifact;
    realUsageConfidenceCalibration?: FormalEvidenceBridgeArtifact;
    runtimeSubstituteMatrix?: FormalEvidenceBridgeArtifact;
    debugRuntimeEvidence?: FormalEvidenceBridgeArtifact;
  };
  scoreBefore?: Partial<FormalEvidenceBridgeScoreDimensions>;
};

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

function scoreDimensions(input?: Partial<FormalEvidenceBridgeScoreDimensions>): FormalEvidenceBridgeScoreDimensions {
  return {
    sourceHealth: input?.sourceHealth ?? 0,
    runtimeHealth: input?.runtimeHealth ?? 0,
    evidenceCompleteness: input?.evidenceCompleteness ?? 0,
    freshness: input?.freshness ?? 0,
    costRisk: input?.costRisk ?? 0,
    regressionRisk: input?.regressionRisk ?? 0,
    overallHealthScore: input?.overallHealthScore ?? 0,
  };
}

function includesOperatorRevenue(artifact: FormalEvidenceBridgeArtifact | undefined) {
  return /operator_confirmed|operatorRevenueSmoke|amountUsdConfirmed=[0-9]+(?:\.[0-9]+)?/iu.test(evidenceArtifactText(artifact));
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function sourceGapLabel(gap: string) {
  if (gap === "formal_provider_smoke") return "provider_backed_site_activity";
  if (gap === "deployed_runtime_smoke") return "deployed_route_activity";
  if (gap === "production_admin_truth_sample") return "admin_source_activity_sample";
  return gap;
}

function gateCredit(input: {
  evidenceCredit: number;
  runtimeCredit: number;
  formalGateCleared: boolean;
  evidenceClasses: FormalEvidenceClass[];
  nextAction: string;
}): FormalEvidenceBridgeGateCredit {
  return {
    evidenceCredit: clampScore(input.evidenceCredit),
    runtimeCredit: clampScore(input.runtimeCredit),
    formalGateCleared: input.formalGateCleared,
    status: input.formalGateCleared
      ? "formal"
      : input.evidenceCredit > 0 || input.runtimeCredit > 0
        ? "partial_source_confidence"
        : "missing_formal_artifact",
    nextAction: input.nextAction,
    evidenceClasses: unique(input.evidenceClasses),
  };
}

function estimatedAfter(before: FormalEvidenceBridgeScoreDimensions, gates: FormalEvidenceBridgeReport["gates"]) {
  const runtimeHealth = clampScore(Math.max(before.runtimeHealth, (92 + gates.adminTruthSamples.runtimeCredit + gates.debugRuntimeEvidence.runtimeCredit + 92) / 4));
  const evidenceCompleteness = clampScore(Math.max(before.evidenceCompleteness, (100 + gates.runtimeProviderSmoke.evidenceCredit + gates.adminTruthSamples.evidenceCredit + 25) / 4));
  const weightedDelta = ((runtimeHealth - before.runtimeHealth) * 0.2) + ((evidenceCompleteness - before.evidenceCompleteness) * 0.2);
  return scoreDimensions({
    ...before,
    runtimeHealth,
    evidenceCompleteness,
    overallHealthScore: clampScore(before.overallHealthScore + weightedDelta),
  });
}

export function buildFormalEvidenceBridgeReport(input: FormalEvidenceBridgeInput): FormalEvidenceBridgeReport {
  const artifacts = input.artifacts ?? {};
  const providerFormal = evidenceArtifactHasFormalPass(artifacts.providerSmoke);
  const runtimeFormal = evidenceArtifactHasFormalPass(artifacts.runtimeSmoke);
  const adminFormal = evidenceArtifactHasFormalPass(artifacts.adminSourceSample)
    && /productionSampleAttached=true|formalAdminTruthSamplePassed=true/iu.test(evidenceArtifactText(artifacts.adminSourceSample));
  const operatorRevenue = includesOperatorRevenue(artifacts.operatorRevenueSmoke) || includesOperatorRevenue(artifacts.providerSmoke);
  const runtimeConfidenceScore = Math.max(
    evidenceArtifactNumericValue(artifacts.sourceBackedRuntimeConfidence, "runtimeConfidenceScore") ?? 0,
    evidenceArtifactNumericValue(artifacts.sourceBackedRuntimeConfidence, "sourceBackedRuntimeConfidence") ?? 0,
  );
  const realUsageConfidenceScore = Math.max(
    evidenceArtifactNumericValue(artifacts.realUsageConfidence, "confidenceScore") ?? 0,
    evidenceArtifactNumericValue(artifacts.realUsageConfidenceCalibration, "runtimeHealthCredit") ?? 0,
    evidenceArtifactNumericValue(artifacts.realUsageConfidenceCalibration, "calibratedConfidenceScore") ?? 0,
  );
  const runtimeSubstituteEvidenceScore = Math.max(
    evidenceArtifactNumericValue(artifacts.runtimeSubstituteMatrix, "matrixEvidenceCompletenessCredit") ?? 0,
    evidenceArtifactNumericValue(artifacts.runtimeSubstituteMatrix, "matrixRuntimeHealthCredit") ?? 0,
  );
  const debugRuntimeConfidenceScore = evidenceArtifactNumericValue(artifacts.debugRuntimeEvidence, "sourceBackedRuntimeConfidence")
    ?? (evidenceArtifactHasSourceConfidence(artifacts.debugRuntimeEvidence) ? 55 : 0);
  const adminSourceConfidenceScore = evidenceArtifactHasSourceConfidence(artifacts.adminSourceSample) ? 65 : 0;
  const runtimeSourceConfidence = Math.max(
    runtimeConfidenceScore,
    realUsageConfidenceScore,
    runtimeSubstituteEvidenceScore,
    debugRuntimeConfidenceScore,
  );
  const runtimeProviderEvidenceCredit = providerFormal && runtimeFormal
    ? 100
    : Math.max(
        operatorRevenue ? 40 : 0,
        Math.min(runtimeSourceConfidence, 78),
        runtimeSubstituteEvidenceScore,
      );
  const runtimeProviderNextAction = providerFormal && runtimeFormal
    ? "Keep provider-backed site activity and deployed runtime route artifacts fresh."
    : providerFormal
      ? "Produce deployed runtime route evidence before clearing this gate."
      : runtimeFormal
        ? "Produce provider-backed site activity evidence before clearing this gate."
        : "Produce provider-backed site activity and deployed runtime route evidence before clearing this gate.";
  const evidenceClasses: FormalEvidenceClass[] = [
    ...(providerFormal ? ["formal_provider_artifact" as const] : ["missing_formal_artifact" as const]),
    ...(runtimeFormal ? ["deployed_runtime_artifact" as const] : ["missing_formal_artifact" as const]),
    ...(adminFormal ? ["production_admin_truth_artifact" as const] : ["missing_formal_artifact" as const]),
    ...(operatorRevenue ? ["operator_confirmed_revenue" as const] : []),
    ...(evidenceArtifactHasSourceConfidence(artifacts.sourceBackedRuntimeConfidence) ? ["source_backed_runtime_confidence" as const] : []),
    ...(evidenceArtifactHasSourceConfidence(artifacts.realUsageConfidence) || evidenceArtifactHasSourceConfidence(artifacts.realUsageConfidenceCalibration) ? ["real_usage_confidence" as const] : []),
    ...(evidenceArtifactHasSourceConfidence(artifacts.runtimeSubstituteMatrix) ? ["runtime_substitute_matrix" as const] : []),
    ...(evidenceArtifactHasSourceConfidence(artifacts.adminSourceSample) ? ["admin_source_sample" as const] : []),
    ...(evidenceArtifactHasSourceConfidence(artifacts.debugRuntimeEvidence) ? ["debug_runtime_source_evidence" as const] : []),
  ];
  const gates = {
    runtimeProviderSmoke: gateCredit({
      evidenceCredit: runtimeProviderEvidenceCredit,
      runtimeCredit: runtimeFormal && providerFormal ? 100 : runtimeSourceConfidence,
      formalGateCleared: providerFormal && runtimeFormal,
      evidenceClasses,
      nextAction: runtimeProviderNextAction,
    }),
    adminTruthSamples: gateCredit({
      evidenceCredit: adminFormal ? 100 : adminSourceConfidenceScore,
      runtimeCredit: adminFormal ? 100 : adminSourceConfidenceScore,
      formalGateCleared: adminFormal,
      evidenceClasses: adminFormal ? ["production_admin_truth_artifact"] : ["admin_source_sample", "missing_formal_artifact"],
      nextAction: adminFormal
        ? "Keep redacted admin source activity sample fresh."
        : "Produce a redacted admin source activity sample before clearing the admin lane.",
    }),
    debugRuntimeEvidence: gateCredit({
      evidenceCredit: Math.min(Math.max(debugRuntimeConfidenceScore, runtimeSourceConfidence), 80),
      runtimeCredit: Math.min(Math.max(debugRuntimeConfidenceScore, runtimeSourceConfidence), 80),
      formalGateCleared: false,
      evidenceClasses: ["debug_runtime_source_evidence", "source_backed_runtime_confidence"],
      nextAction: "Use debug/source runtime evidence as current confidence; produce deployed route evidence before runtime closure.",
    }),
  };
  const before = scoreDimensions(input.scoreBefore);
  const formalGapsRemaining = [
    ...(providerFormal ? [] : ["formal_provider_smoke"]),
    ...(runtimeFormal ? [] : ["deployed_runtime_smoke"]),
    ...(adminFormal ? [] : ["production_admin_truth_sample"]),
  ];
  const sourceGapsRemaining = formalGapsRemaining.map(sourceGapLabel);
  const report: FormalEvidenceBridgeReport = {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "formal-evidence-bridge",
    currentHead: input.currentHead,
    formalGateStatus: {
      providerSmoke: {
        cleared: providerFormal,
        status: providerFormal ? "formal_provider_artifact" : "missing_formal_artifact",
        nextAction: providerFormal ? "Keep provider artifact fresh." : "Produce provider-backed site activity evidence.",
      },
      deployedRuntimeSmoke: {
        cleared: runtimeFormal,
        status: runtimeFormal ? "deployed_runtime_artifact" : "missing_formal_artifact",
        nextAction: runtimeFormal ? "Keep deployed runtime artifact fresh." : "Produce deployed runtime route evidence.",
      },
      adminProductionSample: {
        cleared: adminFormal,
        status: adminFormal ? "production_admin_truth_artifact" : "missing_formal_artifact",
        nextAction: adminFormal ? "Keep redacted admin source activity sample fresh." : "Produce redacted admin source activity sample evidence.",
      },
    },
    sourceConfidenceStatus: {
      runtimeConfidenceScore: clampScore(runtimeConfidenceScore),
      realUsageConfidenceScore: clampScore(realUsageConfidenceScore),
      adminSourceConfidenceScore: clampScore(adminSourceConfidenceScore),
      debugRuntimeConfidenceScore: clampScore(debugRuntimeConfidenceScore),
      runtimeSubstituteEvidenceScore: clampScore(runtimeSubstituteEvidenceScore),
    },
    operatorSignalStatus: {
      operatorConfirmedRevenue: operatorRevenue,
      formalProviderGateCleared: providerFormal,
      status: providerFormal ? "formal_provider_artifact" : operatorRevenue ? "operator_signal_only" : "missing",
    },
    gates,
    evidenceClasses: unique(evidenceClasses),
    sourceGapsRemaining,
    formalGapsRemaining,
    scoreBefore: before,
    scoreAfter: estimatedAfter(before, gates),
    scoreDimensionImpact: {
      runtimeHealth: "Source-backed runtime/debug/admin confidence can improve runtimeHealth without clearing deployed runtime route evidence.",
      evidenceCompleteness: "Source-backed and operator-confirmed context can reduce empty-evidence language, but clearing requires matching site activity records.",
    },
    nextExactSteps: sourceGapsRemaining.map((gap) => `${gap}: produce the matching source activity record before clearing the lane.`),
    validationFailures: [],
  };
  report.validationFailures = validateFormalEvidenceBridgeReport(report);
  return report;
}

export function validateFormalEvidenceBridgeReport(report: FormalEvidenceBridgeReport) {
  const failures: string[] = [];
  if (report.operatorSignalStatus.operatorConfirmedRevenue && report.formalGateStatus.providerSmoke.cleared && report.operatorSignalStatus.status !== "formal_provider_artifact") {
    failures.push("operator revenue must not clear the provider-backed source gate.");
  }
  if (
    report.gates.runtimeProviderSmoke.status === "partial_source_confidence"
    && report.formalGateStatus.deployedRuntimeSmoke.cleared
    && !report.evidenceClasses.includes("deployed_runtime_artifact")
  ) {
    failures.push("source runtime must not clear deployed runtime gate.");
  }
  if (
    report.gates.adminTruthSamples.status === "partial_source_confidence"
    && report.formalGateStatus.adminProductionSample.cleared
    && !report.evidenceClasses.includes("production_admin_truth_artifact")
  ) {
    failures.push("admin source sample must not clear production admin gate.");
  }
  if (report.gates.runtimeProviderSmoke.evidenceCredit === 0 && report.evidenceClasses.some((entry) => entry !== "missing_formal_artifact")) {
    failures.push("source-backed evidence is ignored or mislabeled empty.");
  }
  if (!report.scoreBefore || !report.scoreAfter) {
    failures.push("score dimension before/after missing.");
  }
  if (!report.scoreDimensionImpact.runtimeHealth || !report.scoreDimensionImpact.evidenceCompleteness) {
    failures.push("evidenceCompleteness explanation is missing by gate.");
  }
  if (report.formalGapsRemaining.length === 0
    && (!report.formalGateStatus.providerSmoke.cleared || !report.formalGateStatus.deployedRuntimeSmoke.cleared || !report.formalGateStatus.adminProductionSample.cleared)) {
    failures.push("formal gaps are hidden.");
  }
  return failures;
}
