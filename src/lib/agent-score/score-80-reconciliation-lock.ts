export type Score80ProofType =
  | "algorithmic"
  | "source_fixable"
  | "runtime_required"
  | "formal_provider_required"
  | "admin_truth_required"
  | "owner_review";

export type Score80DimensionImpact =
  | "sourceHealth"
  | "runtimeHealth"
  | "evidenceCompleteness"
  | "freshness"
  | "costRisk"
  | "regressionRisk";

export type Score80ChangedFileClassification =
  | "current_generated_artifact_to_commit"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "test_artifact_expected"
  | "validator_artifact_expected"
  | "documentation_artifact_expected"
  | "deleted_obsolete_log"
  | "unrelated_agent_context_file_to_ignore"
  | "unsafe_unknown";

export type Score80PrClassification =
  | "external_evidence_required"
  | "deferred_unrelated"
  | "deferred_forbidden_surface"
  | "deferred_high_risk"
  | "merged_tiny_debug_backed"
  | "closed_stale_superseded"
  | "unsafe_unknown";

export type Score80RemainingItem = {
  id: string;
  label: string;
  proofType: Score80ProofType;
  scoreDimension: Score80DimensionImpact;
  scoreImpactEstimate: number;
  justification: string;
  nextAction: string;
};

export type Score80TopNextAction = Score80RemainingItem & {
  rank: number;
};

export type Score80ChangedFile = {
  path: string;
  classification: Score80ChangedFileClassification;
  reason: string;
};

export type Score80OpenPr = {
  number: number;
  title: string;
  url: string;
  classification: Score80PrClassification;
  reason: string;
};

export type Score80Dimensions = Record<Score80DimensionImpact, number>;

export type Score80ReconciliationInput = {
  generatedAtUtc: string;
  currentHead: string;
  previousScore?: number;
  currentScore: number;
  dimensions: Score80Dimensions;
  readinessStatus?: string;
  betaExitCanStart?: boolean;
  aiCritic?: {
    criticStatus?: string;
    p0Count?: number;
    p1Count?: number;
    p2Count?: number;
  };
  runtimeMatrix?: {
    formalRuntimeRequiredRows?: number;
    deployedRuntimeSmokeStillRequired?: boolean;
    formalGateImpact?: {
      clearsDeployedRuntime?: boolean;
      clearsFormalProvider?: boolean;
    };
  };
  realUsageConfidence?: {
    status?: string;
    runtimeHealthCredit?: number;
    formalGateImpact?: {
      clearsFormalProvider?: boolean;
      clearsDeployedRuntime?: boolean;
    };
  };
  refreshQueue?: {
    totalEntries?: number;
    automaticEntries?: number;
    blockedEntries?: number;
  };
  refreshSafeguards?: {
    staleArtifactsNeedingAction?: number;
  };
  dirtyFiles?: Score80ChangedFile[];
  openPrs?: Score80OpenPr[];
};

export type Score80ReconciliationLockReport = {
  reportKey: "score-80-reconciliation-lock";
  generatedAtUtc: string;
  currentHead: string;
  sourceCommit: string;
  status: "locked_with_formal_gates_remaining" | "blocked_reconciliation_lock";
  previousScore: number;
  currentScore: number;
  distanceTo80: number;
  scoreDropReason: "no_drop" | "formal_evidence_decay" | "stale_artifact_decay" | "source_regression" | "unknown";
  dimensions: Score80Dimensions;
  readinessStatus: string;
  remainingAlgorithmicItems: Score80RemainingItem[];
  remainingRuntimeRequiredItems: Score80RemainingItem[];
  remainingProviderRequiredItems: Score80RemainingItem[];
  remainingAdminTruthItems: Score80RemainingItem[];
  topNextActions: Score80TopNextAction[];
  p0Count: number;
  p1Count: number;
  p2Count: number;
  canStartBetaExitReview: boolean;
  formalGateImpact: {
    clearsDeployedRuntime: boolean;
    clearsFormalProvider: boolean;
    clearsFormalAdminTruth: boolean;
  };
  sourceEvidenceConsolidation: {
    nonUiAlgorithmicEvidenceAllowed: boolean;
    sourceBackedRuntimePartialCredit: boolean;
  };
  dirtyFiles: Score80ChangedFile[];
  openPrs: Score80OpenPr[];
  validationFailures: string[];
};

const roundScore = (value: number) => Math.round(value * 100) / 100;

function boundedScore(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, roundScore(value)))
    : 0;
}

function buildTopNextActions(items: Score80RemainingItem[]) {
  return [...items]
    .sort((a, b) => b.scoreImpactEstimate - a.scoreImpactEstimate)
    .slice(0, 8)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function buildScoreDropReason(previousScore: number, currentScore: number): Score80ReconciliationLockReport["scoreDropReason"] {
  if (currentScore >= previousScore) return "no_drop";
  return "unknown";
}

export function buildScore80ReconciliationLock(input: Score80ReconciliationInput): Score80ReconciliationLockReport {
  const currentScore = roundScore(input.currentScore);
  const previousScore = roundScore(input.previousScore ?? currentScore);
  const distanceTo80 = roundScore(Math.max(0, 80 - currentScore));
  const p0Count = input.aiCritic?.p0Count ?? 0;
  const p1Count = input.aiCritic?.p1Count ?? 0;
  const p2Count = input.aiCritic?.p2Count ?? 0;
  const runtimeRows = input.runtimeMatrix?.formalRuntimeRequiredRows ?? 0;
  const automaticRefreshes = input.refreshQueue?.automaticEntries ?? 0;
  const blockedRefreshes = input.refreshQueue?.blockedEntries ?? 0;
  const staleRefreshes = input.refreshSafeguards?.staleArtifactsNeedingAction ?? 0;

  const remainingRuntimeRequiredItems: Score80RemainingItem[] = [
    {
      id: "deployed_runtime_smoke",
      label: "Deployed route evidence",
      proofType: "runtime_required",
      scoreDimension: "runtimeHealth",
      scoreImpactEstimate: 15,
      justification: `${runtimeRows} deployed route substitute rows still require a deployed route artifact before the protected lane clears.`,
      nextAction: "Attach deployed route evidence; source/debug/telemetry proof remains partial only.",
    },
  ];

  const remainingProviderRequiredItems: Score80RemainingItem[] = [
    {
      id: "formal_provider_smoke",
      label: "Provider-backed site activity evidence",
      proofType: "formal_provider_required",
      scoreDimension: "runtimeHealth",
      scoreImpactEstimate: 15,
      justification: "Operator-confirmed revenue is product confidence only and does not clear the provider artifact gate.",
      nextAction: "Attach redacted provider-backed site activity artifact before clearing provider readiness.",
    },
  ];

  const remainingAdminTruthItems: Score80RemainingItem[] = [
    {
      id: "formal_admin_truth_sample",
      label: "Admin source sample evidence",
      proofType: "admin_truth_required",
      scoreDimension: "evidenceCompleteness",
      scoreImpactEstimate: 8,
      justification: "Admin source samples earn partial confidence, but current first-party admin source evidence is still missing.",
      nextAction: "Attach redacted first-party admin source sample evidence and rerun the admin source sample validator.",
    },
  ];

  const remainingAlgorithmicItems: Score80RemainingItem[] = ([
    {
      id: "refresh_stale_score_artifacts",
      label: "Refresh stale score-impact artifacts",
      proofType: "algorithmic",
      scoreDimension: "freshness",
      scoreImpactEstimate: Math.min(12, staleRefreshes || automaticRefreshes ? 12 : 1),
      justification: `${automaticRefreshes} automatic refresh queue entries and ${staleRefreshes} stale safeguard findings can be handled without external source artifacts.`,
      nextAction: "Run the self-healing refresh queue in dependency order and keep required evidence lanes separate.",
    },
    {
      id: "cost_owner_review_lanes",
      label: "Cost owner-review lanes",
      proofType: "owner_review",
      scoreDimension: "costRisk",
      scoreImpactEstimate: 6,
      justification: "Cost risk remains owner-review, not UI testing or provider-backed site activity evidence.",
      nextAction: "Complete owner review for cloud/runtime cost lanes without adding new cost paths.",
    },
    {
      id: "blocked_refresh_queue_entries",
      label: "Blocked refresh queue entries",
      proofType: "algorithmic",
      scoreDimension: "freshness",
      scoreImpactEstimate: Math.min(4, blockedRefreshes),
      justification: `${blockedRefreshes} refresh queue entries are blocked and need exact blocker resolution, not broad cleanup.`,
      nextAction: "Resolve blocked refresh queue entries only where the playbook allows source-safe refresh.",
    },
  ] satisfies Score80RemainingItem[]).filter((item) => item.scoreImpactEstimate > 0);

  const allItems = [
    ...remainingRuntimeRequiredItems,
    ...remainingProviderRequiredItems,
    ...remainingAdminTruthItems,
    ...remainingAlgorithmicItems,
  ];

  const formalGateImpact = {
    clearsDeployedRuntime: input.runtimeMatrix?.formalGateImpact?.clearsDeployedRuntime === true
      || input.realUsageConfidence?.formalGateImpact?.clearsDeployedRuntime === true,
    clearsFormalProvider: input.runtimeMatrix?.formalGateImpact?.clearsFormalProvider === true
      || input.realUsageConfidence?.formalGateImpact?.clearsFormalProvider === true,
    clearsFormalAdminTruth: false,
  };

  const report: Score80ReconciliationLockReport = {
    reportKey: "score-80-reconciliation-lock",
    generatedAtUtc: input.generatedAtUtc,
    currentHead: input.currentHead,
    sourceCommit: input.currentHead,
    status: "locked_with_formal_gates_remaining",
    previousScore,
    currentScore,
    distanceTo80,
    scoreDropReason: buildScoreDropReason(previousScore, currentScore),
    dimensions: {
      sourceHealth: boundedScore(input.dimensions.sourceHealth),
      runtimeHealth: boundedScore(input.dimensions.runtimeHealth),
      evidenceCompleteness: boundedScore(input.dimensions.evidenceCompleteness),
      freshness: boundedScore(input.dimensions.freshness),
      costRisk: boundedScore(input.dimensions.costRisk),
      regressionRisk: boundedScore(input.dimensions.regressionRisk),
    },
    readinessStatus: input.readinessStatus ?? "unknown",
    remainingAlgorithmicItems,
    remainingRuntimeRequiredItems,
    remainingProviderRequiredItems,
    remainingAdminTruthItems,
    topNextActions: buildTopNextActions(allItems),
    p0Count,
    p1Count,
    p2Count,
    canStartBetaExitReview: input.betaExitCanStart === true && currentScore >= 80,
    formalGateImpact,
    sourceEvidenceConsolidation: {
      nonUiAlgorithmicEvidenceAllowed: true,
      sourceBackedRuntimePartialCredit: (input.realUsageConfidence?.runtimeHealthCredit ?? 0) > 0,
    },
    dirtyFiles: input.dirtyFiles ?? [],
    openPrs: input.openPrs ?? [],
    validationFailures: [],
  };

  const validationFailures = validateScore80ReconciliationLock(report);
  return {
    ...report,
    status: validationFailures.length > 0 ? "blocked_reconciliation_lock" : "locked_with_formal_gates_remaining",
    validationFailures,
  };
}

export function validateScore80ReconciliationLock(report: Score80ReconciliationLockReport) {
  const failures: string[] = [];

  for (const item of [
    ...report.remainingAlgorithmicItems,
    ...report.remainingRuntimeRequiredItems,
    ...report.remainingProviderRequiredItems,
    ...report.remainingAdminTruthItems,
  ]) {
    if (!item.nextAction.trim()) {
      failures.push(`item ${item.id} lacks a ranked next action.`);
    }
  }

  if (report.formalGateImpact.clearsDeployedRuntime) {
    failures.push("reconciliation lock must not clear deployed route evidence lane.");
  }
  if (report.formalGateImpact.clearsFormalProvider) {
    failures.push("reconciliation lock must not clear provider-backed site activity lane.");
  }
  if (report.formalGateImpact.clearsFormalAdminTruth) {
    failures.push("reconciliation lock must not clear admin source sample lane.");
  }

  if (report.currentScore < report.previousScore && report.scoreDropReason === "no_drop") {
    failures.push("score dropped without an explicit reason.");
  }

  if (
    report.canStartBetaExitReview
    && (
      report.currentScore < 80
      || report.remainingRuntimeRequiredItems.length > 0
      || report.remainingProviderRequiredItems.length > 0
      || report.remainingAdminTruthItems.length > 0
    )
  ) {
    failures.push("cannot start beta exit review while score or required evidence lanes remain open.");
  }

  for (const file of report.dirtyFiles) {
    if (file.classification === "unsafe_unknown" || !file.reason.trim()) {
      failures.push(`dirty file ${file.path} is unclassified.`);
    }
  }

  for (const pr of report.openPrs) {
    if (pr.classification === "unsafe_unknown" || !pr.reason.trim()) {
      failures.push(`open PR #${pr.number} is unclassified.`);
    }
  }

  if (report.topNextActions.length === 0) {
    failures.push("ranked next actions are required.");
  }
  for (let index = 0; index < report.topNextActions.length; index += 1) {
    const action = report.topNextActions[index];
    if (action?.rank !== index + 1 || !action.nextAction.trim()) {
      failures.push(`ranked next action ${action?.id ?? index + 1} is missing rank or exact action.`);
    }
  }

  return failures;
}
