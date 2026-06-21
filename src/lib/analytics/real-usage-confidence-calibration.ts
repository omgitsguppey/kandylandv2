import type { TelemetryLaneId } from "@/lib/analytics/telemetry-dependency-graph";

export type RealUsageConfidenceClass =
  | "observed_telemetry_source_ready"
  | "inferred_from_validated_path"
  | "unavailable"
  | "unknown_legacy";

export type RealUsageCalibrationFlowId =
  | "wallet_refill"
  | "gumdrop_credit"
  | "user_dashboard"
  | "creator_dashboard"
  | "creator_settings"
  | "creator_drop_manager"
  | "creator_profile_timeline"
  | "broadcast_source"
  | "fan_pass_source"
  | "drops_unlock_open"
  | "runtime_watch_source";

export const REQUIRED_REAL_USAGE_CALIBRATION_FLOWS: readonly RealUsageCalibrationFlowId[] = [
  "wallet_refill",
  "gumdrop_credit",
  "user_dashboard",
  "creator_dashboard",
  "creator_settings",
  "creator_drop_manager",
  "creator_profile_timeline",
  "broadcast_source",
  "fan_pass_source",
  "drops_unlock_open",
  "runtime_watch_source",
] as const;

export type RealUsageCalibrationLimit =
  | "does_not_clear_formal_provider"
  | "does_not_clear_deployed_runtime";

export type RealUsageCalibrationSignalLike = {
  status?: string;
  operatorConfirmed?: boolean;
  confidenceContribution?: number;
  sourcePath?: string;
  telemetryLaneId?: TelemetryLaneId;
  evidence?: string[];
};

export type RealUsageConfidenceCalibrationInput = {
  currentHead: string;
  generatedAtUtc: string;
  realUsageConfidence?: {
    confidenceScore?: number;
    formalGateImpact?: {
      clearsFormalProvider?: boolean;
      clearsDeployedRuntime?: boolean;
    };
    signals?: Partial<Record<string, RealUsageCalibrationSignalLike | null>>;
  };
  behaviorMath?: {
    overallScore?: number;
    summary?: {
      disabledEventsExcluded?: number;
      legacyUnknownExcluded?: number;
      duplicateEventsDeduped?: number;
      linkedGuestEventsAttributedToUsers?: number;
    };
    debugOutput?: {
      perUserConfidence?: Record<string, string>;
      disabledTrackingHandling?: string;
      legacyRecoveryReadiness?: string;
      watchTimeTruth?: string;
    };
    recovery?: {
      startDate?: string;
      mode?: string;
      readsProduction?: boolean;
      mutationsAllowed?: boolean;
      summary?: {
        exact?: number;
        probable?: number;
        weak?: number;
        unknown?: number;
      };
    };
  };
  operatorRevenueSmoke?: {
    amountUsdConfirmed?: number;
    confirmationSource?: string;
    formalProviderSmokePassed?: boolean;
    providerArtifactAttached?: boolean;
  };
  telemetryClosure?: {
    laneStatus?: Partial<Record<TelemetryLaneId, string>>;
  };
  activityVerification?: {
    status?: string;
    fakeActivityUsed?: boolean;
    productionReadsRequired?: boolean;
    formalGateImpact?: {
      clearsFormalProvider?: boolean;
      clearsDeployedRuntime?: boolean;
      clearsFormalAdminTruth?: boolean;
    };
    summary?: {
      verifiedByActivity?: number;
      sourceReadyNoActivity?: number;
    };
    features?: Array<{
      featureId?: string;
      scoreEligible?: boolean;
      verificationStatus?: string;
      confidenceScore?: number;
      evidence?: string[];
    }>;
  };
};

export type RealUsagePerFlowConfidence = {
  flowId: RealUsageCalibrationFlowId;
  label: string;
  confidenceClass: RealUsageConfidenceClass;
  confidenceScore: number;
  observedCount: number;
  sourceActivityCount: number;
  sourceActivityStatus: "verified_by_activity" | "source_ready_no_activity" | "not_available";
  sourcePath: string;
  sourceStatus: string;
  telemetryLaneId: TelemetryLaneId;
  operatorConfirmed: boolean;
  behaviorMathLinked: boolean;
  evidence: string[];
  limitations: RealUsageCalibrationLimit[];
  nextAction: string;
};

const ACTIVITY_FEATURE_TO_FLOW: Partial<Record<string, RealUsageCalibrationFlowId>> = {
  user_dashboard: "user_dashboard",
  drops: "drops_unlock_open",
  creator_dashboard: "creator_dashboard",
  creator_settings: "creator_settings",
  creator_drop_manager: "creator_drop_manager",
  creator_profile: "creator_profile_timeline",
  broadcasts: "broadcast_source",
  fan_pass: "fan_pass_source",
  wallet: "wallet_refill",
  behavior_tracking: "runtime_watch_source",
};

export type RealUsageConfidenceCalibrationReport = {
  reportKey: "real-usage-confidence-calibration";
  generatedAtUtc: string;
  currentHead: string;
  sourceCommit: string;
  status: "source_ready_real_usage_confidence_calibrated" | "blocked_real_usage_confidence";
  detail: string;
  productionReadsRequired: false;
  legacyMutationAllowed: false;
  fakeUsageCountsUsed: false;
  confidenceClasses: RealUsageConfidenceClass[];
  calibratedConfidenceScore: number;
  runtimeHealthCredit: number;
  evidenceCompletenessCredit: number;
  operatorConfirmedRevenueSmoke: {
    amountUsdConfirmed: number;
    recognized: boolean;
    sourceTruth: "operator_context_only" | "source_missing";
    sourceRole: "confidence_context_not_provider_truth";
    sourcePath: string;
    formalProviderGateCleared: boolean;
  };
  behaviorMathConnection: {
    perUserConfidence: "exact" | "probable" | "weak" | "unknown";
    linkedGuestUserNoDoubleCount: boolean;
    disabledTrackingSuppressed: boolean;
    unknownLegacyExcluded: boolean;
    legacyMarchFirstDryRun: boolean;
    watchTimeUsesRuntimeSource: boolean;
  };
  formalGateImpact: {
    clearsFormalProvider: boolean;
    clearsDeployedRuntime: boolean;
  };
  perFlowConfidence: Record<RealUsageCalibrationFlowId, RealUsagePerFlowConfidence>;
  evidence: string[];
  limitations: RealUsageCalibrationLimit[];
  nextAction: string;
  validationFailures: string[];
};

const LIMITS: RealUsageCalibrationLimit[] = [
  "does_not_clear_formal_provider",
  "does_not_clear_deployed_runtime",
];

const FLOW_CONFIG: Record<RealUsageCalibrationFlowId, {
  label: string;
  lane: TelemetryLaneId;
  signalId?: string;
  sourcePath: string;
  defaultClass: RealUsageConfidenceClass;
  sourceReadyScore: number;
  nextAction: string;
}> = {
  wallet_refill: {
    label: "Wallet/refill",
    lane: "purchase",
    signalId: "purchase_flow_seen",
    sourcePath: "agent/state/operator-revenue-smoke.generated.json",
    defaultClass: "observed_telemetry_source_ready",
    sourceReadyScore: 72,
    nextAction: "Use source-ready purchase telemetry as bounded confidence; keep operator context separate from formal provider smoke.",
  },
  gumdrop_credit: {
    label: "GumDrop credit",
    lane: "gumdrop_balance",
    signalId: "gumdrop_credit_flow_seen",
    sourcePath: "src/lib/analytics/materialization-contract.ts",
    defaultClass: "observed_telemetry_source_ready",
    sourceReadyScore: 76,
    nextAction: "Keep ledger/materializer source readiness as confidence only.",
  },
  user_dashboard: {
    label: "User dashboard",
    lane: "page_view",
    signalId: "user_dashboard_seen",
    sourcePath: "src/lib/analytics/telemetry-dependency-graph.ts",
    defaultClass: "observed_telemetry_source_ready",
    sourceReadyScore: 72,
    nextAction: "Use source-backed dashboard telemetry as non-visual confidence.",
  },
  creator_dashboard: {
    label: "Creator dashboard",
    lane: "creator_experience",
    signalId: "creator_dashboard_seen",
    sourcePath: "agent/state/creator-drop-status-metrics.generated.json",
    defaultClass: "observed_telemetry_source_ready",
    sourceReadyScore: 72,
    nextAction: "Use creator dashboard source readiness as non-visual confidence.",
  },
  creator_settings: {
    label: "Creator settings",
    lane: "creator_experience",
    sourcePath: "src/lib/analytics/telemetry-dependency-graph.ts",
    defaultClass: "inferred_from_validated_path",
    sourceReadyScore: 58,
    nextAction: "Attach operator or telemetry evidence before treating creator settings as observed.",
  },
  creator_drop_manager: {
    label: "Creator drop manager",
    lane: "creator_drop_submission",
    signalId: "creator_drop_manager_seen",
    sourcePath: "agent/state/creator-drop-status-metrics.generated.json",
    defaultClass: "observed_telemetry_source_ready",
    sourceReadyScore: 76,
    nextAction: "Keep creator drop manager confidence tied to source telemetry and admin status metrics.",
  },
  creator_profile_timeline: {
    label: "Creator profile/timeline",
    lane: "creator_experience",
    sourcePath: "src/lib/behavioral/behavior-math-engine.ts",
    defaultClass: "unknown_legacy",
    sourceReadyScore: 0,
    nextAction: "Recover March 1 legacy profile/timeline records through dry-run mapping before counting them.",
  },
  broadcast_source: {
    label: "Broadcast source",
    lane: "creator_experience",
    signalId: "broadcast_flow_source_ready",
    sourcePath: "src/lib/analytics/telemetry-dependency-graph.ts",
    defaultClass: "inferred_from_validated_path",
    sourceReadyScore: 55,
    nextAction: "Keep broadcast as source-ready until a concrete observed event is confirmed.",
  },
  fan_pass_source: {
    label: "Fan Pass source",
    lane: "creator_subscription",
    signalId: "fan_pass_flow_seen",
    sourcePath: "src/lib/analytics/telemetry-dependency-graph.ts",
    defaultClass: "inferred_from_validated_path",
    sourceReadyScore: 55,
    nextAction: "Keep Fan Pass source readiness separate from subscription/payment runtime proof.",
  },
  drops_unlock_open: {
    label: "Drops unlock/open",
    lane: "behavior_signal",
    sourcePath: "src/lib/behavioral/behavior-math-engine.ts",
    defaultClass: "observed_telemetry_source_ready",
    sourceReadyScore: 70,
    nextAction: "Use behavior math confidence for non-payment drop-open evidence only.",
  },
  runtime_watch_source: {
    label: "Runtime watch source",
    lane: "runtime_watch",
    sourcePath: "src/lib/behavioral/behavior-math-engine.ts",
    defaultClass: "observed_telemetry_source_ready",
    sourceReadyScore: 78,
    nextAction: "Keep watch confidence tied to watch-session rollups, not page-open time.",
  },
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function signalFor(input: RealUsageConfidenceCalibrationInput, flowId: RealUsageCalibrationFlowId) {
  const signalId = FLOW_CONFIG[flowId].signalId;
  return signalId ? input.realUsageConfidence?.signals?.[signalId] ?? undefined : undefined;
}

function laneReady(input: RealUsageConfidenceCalibrationInput, lane: TelemetryLaneId) {
  return String(input.telemetryClosure?.laneStatus?.[lane] ?? "").includes("source_ready")
    || String(input.telemetryClosure?.laneStatus?.[lane] ?? "").includes("closed");
}

function sourceSignalReady(signal: RealUsageCalibrationSignalLike | null | undefined) {
  return signal?.status === "source_ready" || signal?.status === "observed";
}

function activityVerificationCanContribute(input: RealUsageConfidenceCalibrationInput) {
  const activity = input.activityVerification;
  if (!activity) return false;
  if (activity.status !== "pass" && activity.status !== "source_ready_activity_verification") return false;
  if (activity.fakeActivityUsed === true || activity.productionReadsRequired === true) return false;
  if (activity.formalGateImpact?.clearsFormalProvider === true) return false;
  if (activity.formalGateImpact?.clearsDeployedRuntime === true) return false;
  if (activity.formalGateImpact?.clearsFormalAdminTruth === true) return false;
  return true;
}

function activityForFlow(input: RealUsageConfidenceCalibrationInput, flowId: RealUsageCalibrationFlowId) {
  if (!activityVerificationCanContribute(input)) return [];
  return (input.activityVerification?.features ?? []).filter((feature) =>
    feature.scoreEligible === true
    && feature.verificationStatus === "verified_by_activity"
    && ACTIVITY_FEATURE_TO_FLOW[String(feature.featureId ?? "")] === flowId,
  );
}

function hasPositiveRevenueContext(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function operatorRevenueRecognized(input: RealUsageConfidenceCalibrationInput) {
  return input.operatorRevenueSmoke?.confirmationSource === "operator_confirmed"
    && hasPositiveRevenueContext(input.operatorRevenueSmoke.amountUsdConfirmed)
    && input.operatorRevenueSmoke.formalProviderSmokePassed !== true;
}

function perUserConfidence(input: RealUsageConfidenceCalibrationInput): RealUsageConfidenceCalibrationReport["behaviorMathConnection"]["perUserConfidence"] {
  const values = Object.values(input.behaviorMath?.debugOutput?.perUserConfidence ?? {});
  if (values.includes("exact")) return "exact";
  if (values.includes("probable")) return "probable";
  if (values.includes("weak")) return "weak";
  return "unknown";
}

function buildBehaviorConnection(input: RealUsageConfidenceCalibrationInput): RealUsageConfidenceCalibrationReport["behaviorMathConnection"] {
  const summary = input.behaviorMath?.summary ?? {};
  const recovery = input.behaviorMath?.recovery ?? {};
  const debug = input.behaviorMath?.debugOutput ?? {};
  return {
    perUserConfidence: perUserConfidence(input),
    linkedGuestUserNoDoubleCount: (summary.linkedGuestEventsAttributedToUsers ?? 0) > 0
      && (summary.duplicateEventsDeduped ?? 0) > 0,
    disabledTrackingSuppressed: (summary.disabledEventsExcluded ?? 0) > 0
      && debug.disabledTrackingHandling === "excluded_from_behavior_metrics",
    unknownLegacyExcluded: (summary.legacyUnknownExcluded ?? 0) > 0,
    legacyMarchFirstDryRun: recovery.startDate === "2026-03-01"
      && recovery.mode === "dry_run_only"
      && recovery.readsProduction === false
      && recovery.mutationsAllowed === false,
    watchTimeUsesRuntimeSource: debug.watchTimeTruth === "watch_session_rollups_only_not_page_time",
  };
}

function buildFlow(
  input: RealUsageConfidenceCalibrationInput,
  behaviorConnection: RealUsageConfidenceCalibrationReport["behaviorMathConnection"],
  flowId: RealUsageCalibrationFlowId,
): RealUsagePerFlowConfidence {
  const config = FLOW_CONFIG[flowId];
  const signal = signalFor(input, flowId);
  const operatorRecognized = operatorRevenueRecognized(input);
  const telemetryReady = laneReady(input, config.lane);
  const hasSourceSignal = sourceSignalReady(signal);
  const activityFeatures = activityForFlow(input, flowId);
  const activityConfidence = activityFeatures.length > 0
    ? Math.max(...activityFeatures.map((feature) => feature.confidenceScore ?? 0))
    : 0;
  const hasSourceActivity = activityFeatures.length > 0;
  const sourceActivityStatus: RealUsagePerFlowConfidence["sourceActivityStatus"] = hasSourceActivity
    ? "verified_by_activity"
    : activityVerificationCanContribute(input) && input.activityVerification?.summary?.sourceReadyNoActivity
      ? "source_ready_no_activity"
      : "not_available";
  const sourcePath = signal?.sourcePath || config.sourcePath;
  const unknownLegacy = config.defaultClass === "unknown_legacy" && behaviorConnection.unknownLegacyExcluded && !hasSourceActivity;
  const unavailable = !unknownLegacy && !telemetryReady && !hasSourceSignal && !hasSourceActivity;
  const activityBackedDefaultClass: RealUsageConfidenceClass = hasSourceActivity && config.defaultClass === "unknown_legacy"
    ? "inferred_from_validated_path"
    : config.defaultClass;
  const confidenceClass: RealUsageConfidenceClass = unknownLegacy
      ? "unknown_legacy"
      : unavailable
        ? "unavailable"
        : activityBackedDefaultClass;
  const confidenceScore = confidenceClass === "unknown_legacy" || confidenceClass === "unavailable"
      ? 0
      : Math.max(config.sourceReadyScore, activityConfidence);

  return {
    flowId,
    label: config.label,
    confidenceClass,
    confidenceScore: clampScore(confidenceScore),
    observedCount: 0,
    sourceActivityCount: activityFeatures.length,
    sourceActivityStatus,
    sourcePath,
    sourceStatus: hasSourceActivity
      ? "source_ready_activity_verification"
      : signal?.status ?? (telemetryReady ? "source_ready_graph_mapped" : "missing_or_unknown"),
    telemetryLaneId: config.lane,
    operatorConfirmed: Boolean(operatorRecognized && flowId === "wallet_refill"),
    behaviorMathLinked: config.lane === "behavior_signal"
      || config.lane === "runtime_watch"
      || flowId === "creator_profile_timeline",
    evidence: [
      `confidenceClass=${confidenceClass}`,
      `telemetryLane=${config.lane}`,
      `telemetryReady=${telemetryReady}`,
      `sourceSignalReady=${hasSourceSignal}`,
      `sourceActivityCount=${activityFeatures.length}`,
      `sourceActivityStatus=${sourceActivityStatus}`,
      "observedCount=0",
      ...(operatorRecognized && flowId === "wallet_refill" ? ["operatorContextOnly=true"] : []),
      ...(signal?.evidence ?? []),
    ],
    limitations: LIMITS,
    nextAction: config.nextAction,
  };
}

export function buildRealUsageConfidenceCalibration(
  input: RealUsageConfidenceCalibrationInput,
): RealUsageConfidenceCalibrationReport {
  const behaviorMathConnection = buildBehaviorConnection(input);
  const perFlowConfidence = Object.fromEntries(
    REQUIRED_REAL_USAGE_CALIBRATION_FLOWS.map((flowId) => [
      flowId,
      buildFlow(input, behaviorMathConnection, flowId),
    ]),
  ) as Record<RealUsageCalibrationFlowId, RealUsagePerFlowConfidence>;
  const flowScores = Object.values(perFlowConfidence).map((flow) => flow.confidenceScore);
  const calibratedConfidenceScore = clampScore(
    flowScores.reduce((sum, score) => sum + score, 0) / Math.max(flowScores.length, 1),
  );
  const validationProbe = {
    fakeUsageCountsUsed: false,
    formalGateImpact: {
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
    },
  } as const;
  const report: RealUsageConfidenceCalibrationReport = {
    reportKey: "real-usage-confidence-calibration",
    generatedAtUtc: input.generatedAtUtc,
    currentHead: input.currentHead,
    sourceCommit: input.currentHead,
    status: "source_ready_real_usage_confidence_calibrated",
    detail: "Real usage confidence is calibrated from source-ready telemetry, behavior math, identity transfer, and context-only operator signals without clearing formal gates.",
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeUsageCountsUsed: validationProbe.fakeUsageCountsUsed,
    confidenceClasses: [
      "observed_telemetry_source_ready",
      "inferred_from_validated_path",
      "unavailable",
      "unknown_legacy",
    ],
    calibratedConfidenceScore,
    runtimeHealthCredit: clampScore(Math.max(
      calibratedConfidenceScore,
      input.realUsageConfidence?.confidenceScore ?? 0,
    )),
    evidenceCompletenessCredit: calibratedConfidenceScore,
    operatorConfirmedRevenueSmoke: {
      amountUsdConfirmed: input.operatorRevenueSmoke?.amountUsdConfirmed ?? 0,
      recognized: operatorRevenueRecognized(input),
      sourceTruth: operatorRevenueRecognized(input) ? "operator_context_only" : "source_missing",
      sourceRole: "confidence_context_not_provider_truth",
      sourcePath: "agent/state/operator-revenue-smoke.generated.json",
      formalProviderGateCleared: false,
    },
    behaviorMathConnection,
    formalGateImpact: validationProbe.formalGateImpact,
    perFlowConfidence,
    evidence: [
      `calibratedConfidenceScore=${calibratedConfidenceScore}`,
      `runtimeHealthCredit=${clampScore(Math.max(calibratedConfidenceScore, input.realUsageConfidence?.confidenceScore ?? 0))}`,
      `operatorConfirmedRevenueRecognized=${operatorRevenueRecognized(input)}`,
      `activityVerification.verifiedByActivity=${input.activityVerification?.summary?.verifiedByActivity ?? 0}`,
      `activityVerification.fakeActivityUsed=${input.activityVerification?.fakeActivityUsed === true}`,
      `disabledTrackingSuppressed=${behaviorMathConnection.disabledTrackingSuppressed}`,
      `unknownLegacyExcluded=${behaviorMathConnection.unknownLegacyExcluded}`,
      "formalGatesCleared=false",
      "productionReadsRequired=false",
      "fakeUsageCountsUsed=false",
    ],
    limitations: LIMITS,
    nextAction: "Use calibrated real usage confidence for source/runtime scoring only; keep formal provider and deployed runtime gates separate.",
    validationFailures: [],
  };
  const validationFailures = validateRealUsageConfidenceCalibration(report);
  return {
    ...report,
    status: validationFailures.length > 0
      ? "blocked_real_usage_confidence"
      : "source_ready_real_usage_confidence_calibrated",
    validationFailures,
  };
}

export function validateRealUsageConfidenceCalibration(
  report: RealUsageConfidenceCalibrationReport,
): string[] {
  const failures: string[] = [];
  if (report.reportKey !== "real-usage-confidence-calibration") {
    failures.push("reportKey must be real-usage-confidence-calibration.");
  }
  if (report.sourceCommit !== report.currentHead) failures.push("sourceCommit must match currentHead.");
  if (report.productionReadsRequired !== false) failures.push("real usage calibration must not require production reads.");
  if (report.legacyMutationAllowed !== false) failures.push("real usage calibration must not mutate legacy data.");
  if (report.fakeUsageCountsUsed !== false) failures.push("real usage confidence uses fake counts.");
  if (report.operatorConfirmedRevenueSmoke.amountUsdConfirmed <= 0 || !report.operatorConfirmedRevenueSmoke.recognized) {
    failures.push("operator-confirmed revenue context is ignored.");
  }
  if (report.operatorConfirmedRevenueSmoke.sourceRole !== "confidence_context_not_provider_truth"
    || report.operatorConfirmedRevenueSmoke.sourceTruth !== "operator_context_only") {
    failures.push("operator revenue context is not labeled as confidence-only evidence.");
  }
  if (report.formalGateImpact.clearsFormalProvider) failures.push("real usage calibration must not clear formal provider.");
  if (report.formalGateImpact.clearsDeployedRuntime) failures.push("real usage calibration must not clear deployed runtime.");
  if (!report.behaviorMathConnection.disabledTrackingSuppressed) {
    failures.push("disabled tracking behavior contributes to confidence.");
  }
  if (!report.behaviorMathConnection.unknownLegacyExcluded) {
    failures.push("unknown legacy counts as known user behavior.");
  }
  if (!report.behaviorMathConnection.legacyMarchFirstDryRun) {
    failures.push("March 1 recovery lacks dry-run behavior connection.");
  }
  if (!report.behaviorMathConnection.linkedGuestUserNoDoubleCount) {
    failures.push("linked guest/user activity can double count.");
  }
  if (!report.behaviorMathConnection.watchTimeUsesRuntimeSource) {
    failures.push("watch time uses page time.");
  }
  for (const limit of LIMITS) {
    if (!report.limitations.includes(limit)) failures.push(`limitations must include ${limit}.`);
  }
  for (const flowId of REQUIRED_REAL_USAGE_CALIBRATION_FLOWS) {
    const flow = report.perFlowConfidence[flowId];
    if (!flow) {
      failures.push(`${flowId} lacks per-flow confidence.`);
      continue;
    }
    if (!flow.sourcePath) failures.push(`${flowId} lacks source path.`);
    if (!flow.nextAction) failures.push(`${flowId} lacks next action.`);
    if (flow.observedCount !== 0) failures.push(`${flowId} treats context/source-ready confidence as observed proof.`);
    if (flow.sourceActivityCount > 0 && flow.sourceActivityStatus !== "verified_by_activity") {
      failures.push(`${flowId} has source activity count without verified source activity status.`);
    }
    if (flow.confidenceClass === "unknown_legacy" && flow.confidenceScore !== 0) {
      failures.push(`${flowId} unknown legacy counts as known user behavior.`);
    }
    for (const limit of LIMITS) {
      if (!flow.limitations.includes(limit)) failures.push(`${flowId} lacks ${limit}.`);
    }
  }
  if (report.perFlowConfidence.creator_profile_timeline.confidenceClass === "unknown_legacy"
    && report.perFlowConfidence.creator_profile_timeline.confidenceScore > 0) {
    failures.push("unknown legacy counts as creator profile/timeline proof.");
  }
  return failures;
}
