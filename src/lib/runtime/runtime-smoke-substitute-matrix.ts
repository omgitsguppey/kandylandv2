import type { TelemetryLaneId } from "@/lib/analytics/telemetry-dependency-graph";

export type RuntimeSmokeSubstituteRowId =
  | "route_loads"
  | "auth_state"
  | "wallet_balance_display"
  | "gumdrop_refill_source_readiness"
  | "creator_dashboard_load"
  | "creator_settings_save"
  | "creator_drop_manager_load"
  | "creator_drop_status_metrics"
  | "profile_timeline_source"
  | "broadcast_source"
  | "notification_queue_source"
  | "telemetry_ingest"
  | "behavior_math"
  | "bigquery_export_readiness"
  | "ga4_external_truth"
  | "admin_debug_control_tower"
  | "admin_truth_sample"
  | "watch_time_runtime_source"
  | "error_dictionary_route_diagnostics";

export const RUNTIME_SMOKE_SUBSTITUTE_ROW_IDS: readonly RuntimeSmokeSubstituteRowId[] = [
  "route_loads",
  "auth_state",
  "wallet_balance_display",
  "gumdrop_refill_source_readiness",
  "creator_dashboard_load",
  "creator_settings_save",
  "creator_drop_manager_load",
  "creator_drop_status_metrics",
  "profile_timeline_source",
  "broadcast_source",
  "notification_queue_source",
  "telemetry_ingest",
  "behavior_math",
  "bigquery_export_readiness",
  "ga4_external_truth",
  "admin_debug_control_tower",
  "admin_truth_sample",
  "watch_time_runtime_source",
  "error_dictionary_route_diagnostics",
] as const;

export type RuntimeSmokeProofType =
  | "source"
  | "telemetry"
  | "debug"
  | "operator"
  | "formal_runtime";

export type RuntimeSmokeProofLevel =
  | "source_proven"
  | "telemetry_proven"
  | "debug_proven"
  | "operator_confirmed"
  | "formal_runtime_required"
  | "unavailable"
  | "unknown";

export type RuntimeSmokeScoreDimension =
  | "runtimeHealth"
  | "evidenceCompleteness"
  | "sourceHealth"
  | "freshness";

export type RuntimeSmokeSubstituteInput = {
  currentHead: string;
  generatedAtUtc: string;
  debugRuntimeEvidence?: {
    status?: string;
    sourceBackedRuntimeConfidence?: number;
    deployedRuntimeSmokeCleared?: boolean;
  };
  sourceBackedRuntimeConfidence?: {
    status?: string;
    runtimeConfidenceScore?: number;
    deployedSmokePresent?: boolean;
  };
  realUsageConfidenceCalibration?: {
    status?: string;
    runtimeHealthCredit?: number;
    formalGateImpact?: {
      clearsDeployedRuntime?: boolean;
      clearsFormalProvider?: boolean;
    };
  };
  realUsageConfidence?: {
    status?: string;
    confidenceScore?: number;
    observedSignals?: number;
  };
  behaviorMath?: {
    status?: string;
    overallScore?: number;
  };
  adminTruthSample?: {
    status?: string;
    passed?: boolean;
  };
  telemetryClosure?: {
    lanes?: Partial<Record<TelemetryLaneId | string, string>>;
  };
};

export type RuntimeSmokeSubstituteRow = {
  id: RuntimeSmokeSubstituteRowId;
  label: string;
  canBeSourceProven: boolean;
  canBeTelemetryProven: boolean;
  canBeDebugProven: boolean;
  requiresFormalRuntime: boolean;
  currentProofLevel: RuntimeSmokeProofLevel;
  proofTypes: RuntimeSmokeProofType[];
  scoreDimension: RuntimeSmokeScoreDimension;
  sourceFiles: string[];
  evidencePaths: string[];
  sourceRoute?: string;
  scoreImpactEstimate: number;
  nextAction: string;
};

export type RuntimeSmokeSubstituteMatrixReport = {
  reportKey: "runtime-smoke-substitute-matrix";
  generatedAtUtc: string;
  currentHead: string;
  sourceCommit: string;
  status: "source_ready_runtime_smoke_substitute_matrix" | "blocked_runtime_smoke_substitute_matrix";
  productionReadsRequired: false;
  deployRequired: false;
  formalGateImpact: {
    clearsDeployedRuntime: boolean;
    clearsFormalProvider: boolean;
  };
  deployedRuntimeSmokeStillRequired: boolean;
  rows: Record<RuntimeSmokeSubstituteRowId, RuntimeSmokeSubstituteRow>;
  formalRuntimeRowIds: RuntimeSmokeSubstituteRowId[];
  currentProofSummary: {
    sourceProvenRows: number;
    telemetryProvenRows: number;
    debugProvenRows: number;
    formalRuntimeRequiredRows: number;
  };
  realUsageObservedSignals: number;
  realUsageObservedActivityCredit: number;
  matrixRuntimeHealthCredit: number;
  matrixRuntimeProviderActivityCredit: number;
  matrixEvidenceCompletenessCredit: number;
  evidence: string[];
  nextAction: string;
  validationFailures: string[];
};

type RowConfig = Omit<
  RuntimeSmokeSubstituteRow,
  "currentProofLevel" | "proofTypes" | "scoreImpactEstimate"
>;

const ROW_CONFIG: Record<RuntimeSmokeSubstituteRowId, RowConfig & {
  lane?: TelemetryLaneId | string;
  preferredProof: RuntimeSmokeProofLevel;
  sourceCredit: number;
}> = {
  route_loads: {
    id: "route_loads",
    label: "Route loads",
    canBeSourceProven: true,
    canBeTelemetryProven: false,
    canBeDebugProven: true,
    requiresFormalRuntime: true,
    preferredProof: "debug_proven",
    scoreDimension: "runtimeHealth",
    sourceFiles: ["src/lib/server/route-diagnostics.ts", "src/lib/route-runtime-health.ts"],
    evidencePaths: ["agent/state/debug-runtime-evidence.generated.json"],
    sourceRoute: "src/app/api/admin/debug/route.ts",
    sourceCredit: 84,
    nextAction: "Attach deployed route-load evidence before clearing the deployed route evidence lane.",
  },
  auth_state: {
    id: "auth_state",
    label: "Auth state",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: true,
    requiresFormalRuntime: true,
    preferredProof: "debug_proven",
    scoreDimension: "runtimeHealth",
    sourceFiles: ["src/lib/analytics/identity-transfer.ts", "src/lib/debug-evidence-contract.ts"],
    evidencePaths: ["agent/state/identity-transfer-telemetry-closure.generated.json", "agent/state/debug-runtime-evidence.generated.json"],
    lane: "identity_link",
    sourceCredit: 80,
    nextAction: "Attach deployed auth-state evidence before clearing the deployed route evidence lane.",
  },
  wallet_balance_display: {
    id: "wallet_balance_display",
    label: "Wallet balance display",
    canBeSourceProven: true,
    canBeTelemetryProven: false,
    canBeDebugProven: false,
    requiresFormalRuntime: false,
    preferredProof: "source_proven",
    scoreDimension: "evidenceCompleteness",
    sourceFiles: ["src/components/PurchaseModal.tsx", "src/lib/gumdrop-formatting.ts"],
    evidencePaths: ["agent/state/source-backed-runtime-confidence.generated.json"],
    sourceCredit: 45,
    nextAction: "Keep wallet balance display covered by deterministic source/UI coverage; do not change wallet runtime or GumDrop math.",
  },
  gumdrop_refill_source_readiness: {
    id: "gumdrop_refill_source_readiness",
    label: "GumDrop refill source readiness",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: false,
    requiresFormalRuntime: true,
    preferredProof: "operator_confirmed",
    scoreDimension: "runtimeHealth",
    sourceFiles: ["src/lib/analytics/real-usage-confidence-calibration.ts", "src/lib/analytics/materialization-contract.ts"],
    evidencePaths: ["agent/state/operator-revenue-smoke.generated.json", "agent/state/real-usage-confidence-calibration.generated.json"],
    lane: "purchase",
    sourceCredit: 92,
    nextAction: "Attach provider-backed refill evidence and deployed route evidence before clearing protected source-evidence lanes.",
  },
  creator_dashboard_load: {
    id: "creator_dashboard_load",
    label: "Creator dashboard load",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: true,
    requiresFormalRuntime: true,
    preferredProof: "telemetry_proven",
    scoreDimension: "runtimeHealth",
    sourceFiles: ["src/lib/analytics/telemetry-dependency-graph.ts"],
    evidencePaths: ["agent/state/real-usage-confidence-calibration.generated.json"],
    lane: "creator_experience",
    sourceCredit: 72,
    nextAction: "Attach deployed creator dashboard evidence before clearing the deployed route evidence lane.",
  },
  creator_settings_save: {
    id: "creator_settings_save",
    label: "Creator settings save",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: true,
    requiresFormalRuntime: true,
    preferredProof: "source_proven",
    scoreDimension: "runtimeHealth",
    sourceFiles: ["src/app/api/creator/settings/route.ts", "src/lib/telemetry-catalog.ts"],
    evidencePaths: ["agent/state/real-usage-confidence-calibration.generated.json"],
    lane: "creator_experience",
    sourceRoute: "/api/creator/settings",
    sourceCredit: 58,
    nextAction: "Attach deployed creator settings save evidence before clearing the deployed route evidence lane.",
  },
  creator_drop_manager_load: {
    id: "creator_drop_manager_load",
    label: "Creator drop manager load",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: true,
    requiresFormalRuntime: true,
    preferredProof: "telemetry_proven",
    scoreDimension: "runtimeHealth",
    sourceFiles: ["src/lib/analytics/telemetry-dependency-graph.ts"],
    evidencePaths: ["agent/state/creator-drop-status-metrics.generated.json", "agent/state/real-usage-confidence-calibration.generated.json"],
    lane: "creator_drop_submission",
    sourceCredit: 76,
    nextAction: "Attach deployed creator drop manager evidence before clearing the deployed route evidence lane.",
  },
  creator_drop_status_metrics: {
    id: "creator_drop_status_metrics",
    label: "Creator drop status metrics",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: false,
    requiresFormalRuntime: false,
    preferredProof: "telemetry_proven",
    scoreDimension: "evidenceCompleteness",
    sourceFiles: ["src/lib/analytics/telemetry-dependency-graph.ts"],
    evidencePaths: ["agent/state/creator-drop-status-metrics.generated.json"],
    lane: "creator_drop_submission",
    sourceCredit: 76,
    nextAction: "Keep creator drop status metrics refreshed through source telemetry evidence.",
  },
  profile_timeline_source: {
    id: "profile_timeline_source",
    label: "Profile timeline source",
    canBeSourceProven: true,
    canBeTelemetryProven: false,
    canBeDebugProven: false,
    requiresFormalRuntime: false,
    preferredProof: "source_proven",
    scoreDimension: "sourceHealth",
    sourceFiles: ["src/lib/behavioral/behavior-math-engine.ts"],
    evidencePaths: ["agent/state/real-usage-confidence-calibration.generated.json"],
    lane: "creator_experience",
    sourceCredit: 45,
    nextAction: "Keep unknown legacy profile/timeline data excluded until dry-run recovery maps it with confidence.",
  },
  broadcast_source: {
    id: "broadcast_source",
    label: "Broadcast source",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: false,
    requiresFormalRuntime: false,
    preferredProof: "source_proven",
    scoreDimension: "sourceHealth",
    sourceFiles: ["src/lib/analytics/telemetry-dependency-graph.ts"],
    evidencePaths: ["agent/state/real-usage-confidence-calibration.generated.json"],
    lane: "creator_experience",
    sourceCredit: 55,
    nextAction: "Keep broadcast source readiness separate from observed runtime proof until a concrete event is confirmed.",
  },
  notification_queue_source: {
    id: "notification_queue_source",
    label: "Notification queue source",
    canBeSourceProven: true,
    canBeTelemetryProven: false,
    canBeDebugProven: true,
    requiresFormalRuntime: true,
    preferredProof: "source_proven",
    scoreDimension: "runtimeHealth",
    sourceFiles: ["src/lib/release-tracking.ts", "src/lib/debug-evidence-contract.ts"],
    evidencePaths: ["agent/state/debug-runtime-evidence.generated.json"],
    sourceCredit: 55,
    nextAction: "Attach deployed notification queue evidence before clearing the deployed route evidence lane.",
  },
  telemetry_ingest: {
    id: "telemetry_ingest",
    label: "Telemetry ingest",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: true,
    requiresFormalRuntime: false,
    preferredProof: "telemetry_proven",
    scoreDimension: "evidenceCompleteness",
    sourceFiles: ["src/lib/analytics/telemetry-dependency-graph.ts", "src/lib/analytics/materialization-contract.ts"],
    evidencePaths: ["agent/state/final-telemetry-closure-lock.generated.json"],
    lane: "ingest",
    sourceCredit: 85,
    nextAction: "Keep telemetry ingest closure refreshed and source-labelled.",
  },
  behavior_math: {
    id: "behavior_math",
    label: "Behavior math",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: false,
    requiresFormalRuntime: false,
    preferredProof: "telemetry_proven",
    scoreDimension: "evidenceCompleteness",
    sourceFiles: ["src/lib/behavioral/behavior-math-engine.ts"],
    evidencePaths: ["agent/state/behavior-math-verification.generated.json"],
    lane: "behavior_signal",
    sourceCredit: 100,
    nextAction: "Keep behavior math confidence current and exclude disabled/legacy unknown events.",
  },
  bigquery_export_readiness: {
    id: "bigquery_export_readiness",
    label: "BigQuery export readiness",
    canBeSourceProven: true,
    canBeTelemetryProven: false,
    canBeDebugProven: true,
    requiresFormalRuntime: true,
    preferredProof: "source_proven",
    scoreDimension: "freshness",
    sourceFiles: ["src/lib/analytics/bigquery-export-contract.ts"],
    evidencePaths: ["agent/state/final-telemetry-closure-lock.generated.json"],
    lane: "bigquery_export",
    sourceCredit: 55,
    nextAction: "Attach deployed BigQuery export evidence before clearing protected source-evidence lanes.",
  },
  ga4_external_truth: {
    id: "ga4_external_truth",
    label: "GA4 external truth",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: true,
    requiresFormalRuntime: false,
    preferredProof: "telemetry_proven",
    scoreDimension: "evidenceCompleteness",
    sourceFiles: ["src/lib/analytics/ga4-truth.ts", "src/lib/telemetry.ts"],
    evidencePaths: ["agent/state/final-telemetry-closure-lock.generated.json"],
    lane: "external_ga4_evidence",
    sourceCredit: 60,
    nextAction: "Keep GA4 labelled as vendor evidence only; never promote it over first-party truth.",
  },
  admin_debug_control_tower: {
    id: "admin_debug_control_tower",
    label: "Admin debug control tower",
    canBeSourceProven: true,
    canBeTelemetryProven: false,
    canBeDebugProven: true,
    requiresFormalRuntime: false,
    preferredProof: "debug_proven",
    scoreDimension: "runtimeHealth",
    sourceFiles: ["src/lib/admin-debug-control-tower.ts", "src/app/admin/debug/page.tsx"],
    evidencePaths: ["agent/state/debug-runtime-evidence.generated.json"],
    sourceCredit: 85,
    nextAction: "Keep admin debug control tower source evidence fresh and do not show unknown as healthy.",
  },
  admin_truth_sample: {
    id: "admin_truth_sample",
    label: "Admin truth sample",
    canBeSourceProven: true,
    canBeTelemetryProven: false,
    canBeDebugProven: true,
    requiresFormalRuntime: true,
    preferredProof: "source_proven",
    scoreDimension: "evidenceCompleteness",
    sourceFiles: ["src/lib/admin-debug-control-tower.ts"],
    evidencePaths: ["agent/state/admin-truth-source-sample.generated.json"],
    lane: "admin_evidence",
    sourceCredit: 55,
    nextAction: "Attach deployed admin source sample evidence before clearing the deployed route evidence lane.",
  },
  watch_time_runtime_source: {
    id: "watch_time_runtime_source",
    label: "Watch-time runtime source",
    canBeSourceProven: true,
    canBeTelemetryProven: true,
    canBeDebugProven: false,
    requiresFormalRuntime: true,
    preferredProof: "telemetry_proven",
    scoreDimension: "runtimeHealth",
    sourceFiles: ["src/lib/viewer-watch-session.ts", "src/lib/behavioral/watch-time-truth.ts"],
    evidencePaths: ["agent/state/runtime-watch-time-v2.generated.json", "agent/state/real-usage-confidence-calibration.generated.json"],
    lane: "runtime_watch",
    sourceCredit: 78,
    nextAction: "Attach deployed watch-time evidence before clearing the deployed route evidence lane.",
  },
  error_dictionary_route_diagnostics: {
    id: "error_dictionary_route_diagnostics",
    label: "Error dictionary/route diagnostics",
    canBeSourceProven: true,
    canBeTelemetryProven: false,
    canBeDebugProven: true,
    requiresFormalRuntime: false,
    preferredProof: "debug_proven",
    scoreDimension: "sourceHealth",
    sourceFiles: ["src/lib/server/route-diagnostics.ts", "src/lib/errors/error-dictionary.ts"],
    evidencePaths: ["agent/state/debug-runtime-evidence.generated.json"],
    sourceCredit: 88,
    nextAction: "Keep route diagnostics and error dictionary mapped before deployed route evidence triage.",
  },
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function laneReady(input: RuntimeSmokeSubstituteInput, lane: string | undefined) {
  if (!lane) return false;
  const status = String(input.telemetryClosure?.lanes?.[lane] ?? "");
  return /source_ready|closed|configured/u.test(status);
}

function debugReady(input: RuntimeSmokeSubstituteInput) {
  return String(input.debugRuntimeEvidence?.status ?? "").includes("source_ready")
    && (input.debugRuntimeEvidence?.sourceBackedRuntimeConfidence ?? 0) > 0;
}

function sourceReady(input: RuntimeSmokeSubstituteInput) {
  return String(input.sourceBackedRuntimeConfidence?.status ?? "").includes("source_ready")
    || String(input.adminTruthSample?.status ?? "").includes("source_ready");
}

function realUsageObservedSignals(input: RuntimeSmokeSubstituteInput) {
  return Math.max(0, input.realUsageConfidence?.observedSignals ?? 0);
}

function realUsageObservedActivityCredit(input: RuntimeSmokeSubstituteInput) {
  if (realUsageObservedSignals(input) <= 0) return 0;
  const confidenceReady = String(input.realUsageConfidence?.status ?? "").includes("source_ready");
  const calibrationReady = String(input.realUsageConfidenceCalibration?.status ?? "").includes("source_ready");
  return clampScore(Math.max(
    confidenceReady ? input.realUsageConfidence?.confidenceScore ?? 0 : 0,
    calibrationReady ? input.realUsageConfidenceCalibration?.runtimeHealthCredit ?? 0 : 0,
  ));
}

function behaviorReady(input: RuntimeSmokeSubstituteInput) {
  return String(input.behaviorMath?.status ?? "").includes("live")
    && (input.behaviorMath?.overallScore ?? 0) >= 80;
}

function proofLevel(config: typeof ROW_CONFIG[RuntimeSmokeSubstituteRowId], input: RuntimeSmokeSubstituteInput): RuntimeSmokeProofLevel {
  if (config.preferredProof === "debug_proven" && config.canBeDebugProven && debugReady(input)) return "debug_proven";
  if (config.preferredProof === "telemetry_proven" && config.canBeTelemetryProven && (laneReady(input, config.lane) || behaviorReady(input))) {
    return "telemetry_proven";
  }
  if (config.preferredProof === "operator_confirmed"
    && String(input.realUsageConfidenceCalibration?.status ?? "").includes("source_ready")
    && realUsageObservedSignals(input) > 0
    && input.realUsageConfidenceCalibration?.formalGateImpact?.clearsFormalProvider !== true) {
    return "operator_confirmed";
  }
  if (config.canBeSourceProven && sourceReady(input)) return "source_proven";
  if (config.requiresFormalRuntime) return "formal_runtime_required";
  return "unavailable";
}

function proofTypesFor(row: RuntimeSmokeSubstituteRow): RuntimeSmokeProofType[] {
  const proofTypes: RuntimeSmokeProofType[] = [];
  if (row.canBeSourceProven) proofTypes.push("source");
  if (row.canBeTelemetryProven) proofTypes.push("telemetry");
  if (row.canBeDebugProven) proofTypes.push("debug");
  if (row.currentProofLevel === "operator_confirmed") proofTypes.push("operator");
  if (row.requiresFormalRuntime) proofTypes.push("formal_runtime");
  return [...new Set(proofTypes)];
}

function buildRow(input: RuntimeSmokeSubstituteInput, id: RuntimeSmokeSubstituteRowId): RuntimeSmokeSubstituteRow {
  const config = ROW_CONFIG[id];
  const currentProofLevel = proofLevel(config, input);
  const row: RuntimeSmokeSubstituteRow = {
    ...config,
    currentProofLevel,
    proofTypes: [],
    scoreImpactEstimate: currentProofLevel === "formal_runtime_required"
      ? Math.round(config.sourceCredit * 0.45)
      : config.sourceCredit,
  };
  return {
    ...row,
    proofTypes: proofTypesFor(row),
  };
}

export function buildRuntimeSmokeSubstituteMatrix(input: RuntimeSmokeSubstituteInput): RuntimeSmokeSubstituteMatrixReport {
  const rows = Object.fromEntries(
    RUNTIME_SMOKE_SUBSTITUTE_ROW_IDS.map((id) => [id, buildRow(input, id)]),
  ) as Record<RuntimeSmokeSubstituteRowId, RuntimeSmokeSubstituteRow>;
  const rowValues = Object.values(rows);
  const sourceCreditRows = rowValues.filter((row) =>
    row.currentProofLevel === "source_proven"
    || row.currentProofLevel === "telemetry_proven"
    || row.currentProofLevel === "debug_proven"
    || row.currentProofLevel === "operator_confirmed");
  const matrixRuntimeHealthCredit = clampScore(
    sourceCreditRows
      .filter((row) => row.scoreDimension === "runtimeHealth")
      .reduce((sum, row) => sum + row.scoreImpactEstimate, 0)
      / Math.max(1, rowValues.filter((row) => row.scoreDimension === "runtimeHealth").length),
  );
  const observedSignals = realUsageObservedSignals(input);
  const observedActivityCredit = realUsageObservedActivityCredit(input);
  const matrixRuntimeProviderActivityCredit = clampScore(Math.min(matrixRuntimeHealthCredit, observedActivityCredit));
  const matrixEvidenceCompletenessCredit = clampScore(
    sourceCreditRows
      .filter((row) => row.scoreDimension === "evidenceCompleteness")
      .reduce((sum, row) => sum + row.scoreImpactEstimate, 0)
      / Math.max(1, rowValues.filter((row) => row.scoreDimension === "evidenceCompleteness").length),
  );
  const report: RuntimeSmokeSubstituteMatrixReport = {
    reportKey: "runtime-smoke-substitute-matrix",
    generatedAtUtc: input.generatedAtUtc,
    currentHead: input.currentHead,
    sourceCommit: input.currentHead,
    status: "source_ready_runtime_smoke_substitute_matrix",
    productionReadsRequired: false,
    deployRequired: false,
    formalGateImpact: {
      clearsDeployedRuntime: false,
      clearsFormalProvider: false,
    },
    deployedRuntimeSmokeStillRequired: true,
    rows,
    formalRuntimeRowIds: rowValues.filter((row) => row.requiresFormalRuntime).map((row) => row.id),
    currentProofSummary: {
      sourceProvenRows: rowValues.filter((row) => row.currentProofLevel === "source_proven").length,
      telemetryProvenRows: rowValues.filter((row) => row.currentProofLevel === "telemetry_proven").length,
      debugProvenRows: rowValues.filter((row) => row.currentProofLevel === "debug_proven").length,
      formalRuntimeRequiredRows: rowValues.filter((row) => row.requiresFormalRuntime).length,
    },
    realUsageObservedSignals: observedSignals,
    realUsageObservedActivityCredit: observedActivityCredit,
    matrixRuntimeHealthCredit,
    matrixRuntimeProviderActivityCredit,
    matrixEvidenceCompletenessCredit,
    evidence: [
      `matrixRuntimeHealthCredit=${matrixRuntimeHealthCredit}`,
      `matrixRuntimeProviderActivityCredit=${matrixRuntimeProviderActivityCredit}`,
      `realUsageObservedSignals=${observedSignals}`,
      `realUsageObservedActivityCredit=${observedActivityCredit}`,
      `matrixEvidenceCompletenessCredit=${matrixEvidenceCompletenessCredit}`,
      `formalRuntimeRequiredRows=${rowValues.filter((row) => row.requiresFormalRuntime).length}`,
      "deployedRuntimeSmokeStillRequired=true",
      "productionReadsRequired=false",
      "deployRequired=false",
    ],
    nextAction: "Use this matrix to substitute source/debug/telemetry checks only where truthfully supported; attach deployed route evidence before clearing the deployed route lane.",
    validationFailures: [],
  };
  const validationFailures = validateRuntimeSmokeSubstituteMatrix(report);
  return {
    ...report,
    status: validationFailures.length > 0
      ? "blocked_runtime_smoke_substitute_matrix"
      : "source_ready_runtime_smoke_substitute_matrix",
    validationFailures,
  };
}

export function validateRuntimeSmokeSubstituteMatrix(report: RuntimeSmokeSubstituteMatrixReport): string[] {
  const failures: string[] = [];
  if (report.reportKey !== "runtime-smoke-substitute-matrix") failures.push("reportKey must be runtime-smoke-substitute-matrix.");
  if (report.sourceCommit !== report.currentHead) failures.push("sourceCommit must match currentHead.");
  if (report.productionReadsRequired !== false) failures.push("runtime smoke substitute matrix must not require production reads.");
  if (report.deployRequired !== false) failures.push("runtime smoke substitute matrix must not require deploy.");
  if (report.formalGateImpact.clearsDeployedRuntime) failures.push("matrix must not clear deployed route evidence lane.");
  if (report.formalGateImpact.clearsFormalProvider) failures.push("matrix must not clear formal provider gate.");
  if (!report.deployedRuntimeSmokeStillRequired) failures.push("deployed route evidence must remain required.");
  if (report.realUsageObservedSignals <= 0 && report.matrixRuntimeProviderActivityCredit > 0) {
    failures.push("matrix runtime/provider activity credit requires observed real-usage signals.");
  }
  if (report.matrixRuntimeProviderActivityCredit > report.matrixRuntimeHealthCredit) {
    failures.push("matrix runtime/provider activity credit cannot exceed matrix runtime health credit.");
  }
  for (const id of RUNTIME_SMOKE_SUBSTITUTE_ROW_IDS) {
    const row = report.rows[id];
    if (!row) {
      failures.push(`${id} missing from matrix.`);
      continue;
    }
    if (row.proofTypes.length === 0) failures.push(`${id} lacks proof type.`);
    if (row.currentProofLevel === "unknown") failures.push(`${id} has unknown proof level.`);
    if (!row.scoreDimension) failures.push(`${id} lacks score dimension.`);
    if (!row.nextAction) failures.push(`${id} lacks next action.`);
    if (row.requiresFormalRuntime && !/deployed /u.test(row.nextAction)) {
      failures.push(`${id} requires deployed route evidence but lacks next action.`);
    }
  }
  return failures;
}
