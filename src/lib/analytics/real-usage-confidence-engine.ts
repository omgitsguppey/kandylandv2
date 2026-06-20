import {
  TELEMETRY_DEPENDENCY_GRAPH,
  type TelemetryLaneId,
} from "@/lib/analytics/telemetry-dependency-graph";

export type RealUsageConfidenceSignalId =
  | "purchase_flow_seen"
  | "gumdrop_credit_flow_seen"
  | "user_dashboard_seen"
  | "creator_dashboard_seen"
  | "creator_drop_manager_seen"
  | "fan_pass_flow_seen"
  | "broadcast_flow_source_ready"
  | "wallet_flow_source_ready";

export type RealUsageSignalStatus = "observed" | "source_ready" | "unavailable" | "ignored_unknown";
export type RealUsageLaneStatus = "closed" | "source_ready" | "missing" | "unknown";
export type RealUsageFreshness = "fresh" | "stale" | "unknown";
export type RealUsageBehaviorConfidence = "exact" | "probable" | "weak" | "unknown";
export type RealUsageConfidenceLimit =
  | "does_not_clear_formal_provider"
  | "does_not_clear_deployed_runtime";

export interface OperatorConfirmedUsageEvent {
  signalId?: RealUsageConfidenceSignalId;
  eventName: string;
  confirmationSource: "operator_confirmed" | "unknown" | "inferred" | "debug_only";
  count: number;
  sourcePath: string;
}

export interface RealUsageConfidenceInput {
  currentHead: string;
  generatedAtUtc: string;
  operatorConfirmedEvents: OperatorConfirmedUsageEvent[];
  telemetryLaneStatus: Partial<Record<TelemetryLaneId, RealUsageLaneStatus>>;
  materializerPresence: Partial<Record<TelemetryLaneId, boolean>>;
  sourceTruthFreshness: RealUsageFreshness;
  behaviorMathConfidence: RealUsageBehaviorConfidence;
}

export interface RealUsageConfidenceSignal {
  id: RealUsageConfidenceSignalId;
  label: string;
  status: RealUsageSignalStatus;
  telemetryLaneId: TelemetryLaneId;
  sourcePath: string;
  sourcePathStatus: "validated" | "source_ready" | "missing" | "ignored_unknown";
  materializerPresent: boolean;
  operatorConfirmed: boolean;
  confidenceContribution: number;
  evidence: string[];
  limitations: RealUsageConfidenceLimit[];
  nextAction: string;
}

export type RealUsageSignalMap = Record<RealUsageConfidenceSignalId, RealUsageConfidenceSignal | null>;

export interface RealUsageConfidenceReport {
  reportKey: "real-usage-confidence";
  generatedAtUtc: string;
  currentHead: string;
  sourceCommit: string;
  status: "source_ready_real_usage_confidence" | "partial_real_usage_confidence" | "unavailable";
  passed: boolean;
  productionReadsRequired: false;
  confidenceScore: number;
  confidenceSignals: RealUsageConfidenceSignalId[];
  evidence: string[];
  limits: RealUsageConfidenceLimit[];
  formalGateImpact: {
    clearsFormalProvider: boolean;
    clearsDeployedRuntime: boolean;
  };
  ignoredUnknownUsage: OperatorConfirmedUsageEvent[];
  signals: RealUsageSignalMap;
  summary: {
    observedSignals: number;
    sourceReadySignals: number;
    ignoredUnknownUsage: number;
    confidenceScore: number;
  };
  nextAction: string;
}

const LIMITS: RealUsageConfidenceLimit[] = [
  "does_not_clear_formal_provider",
  "does_not_clear_deployed_runtime",
];

const SIGNAL_CONFIG: Record<RealUsageConfidenceSignalId, {
  label: string;
  lane: TelemetryLaneId;
  weight: number;
  sourceReadyOnly?: boolean;
  sourcePath: string;
}> = {
  purchase_flow_seen: {
    label: "Purchase flow seen",
    lane: "purchase",
    weight: 30,
    sourcePath: "agent/state/operator-revenue-smoke.generated.json",
  },
  gumdrop_credit_flow_seen: {
    label: "GumDrop credit flow seen",
    lane: "gumdrop_balance",
    weight: 10,
    sourceReadyOnly: true,
    sourcePath: "src/lib/analytics/materialization-contract.ts",
  },
  user_dashboard_seen: {
    label: "User dashboard seen",
    lane: "page_view",
    weight: 8,
    sourceReadyOnly: true,
    sourcePath: "src/lib/analytics/telemetry-dependency-graph.ts",
  },
  creator_dashboard_seen: {
    label: "Creator dashboard seen",
    lane: "creator_experience",
    weight: 8,
    sourceReadyOnly: true,
    sourcePath: "agent/state/creator-drop-status-metrics.generated.json",
  },
  creator_drop_manager_seen: {
    label: "Creator drop manager seen",
    lane: "creator_drop_submission",
    weight: 10,
    sourceReadyOnly: true,
    sourcePath: "agent/state/creator-drop-status-metrics.generated.json",
  },
  fan_pass_flow_seen: {
    label: "Fan Pass flow seen",
    lane: "creator_subscription",
    weight: 8,
    sourceReadyOnly: true,
    sourcePath: "src/lib/analytics/telemetry-dependency-graph.ts",
  },
  broadcast_flow_source_ready: {
    label: "Broadcast flow source ready",
    lane: "creator_experience",
    weight: 8,
    sourceReadyOnly: true,
    sourcePath: "src/lib/analytics/telemetry-dependency-graph.ts",
  },
  wallet_flow_source_ready: {
    label: "Wallet flow source ready",
    lane: "purchase",
    weight: 10,
    sourceReadyOnly: true,
    sourcePath: "agent/state/source-backed-runtime-confidence.generated.json",
  },
};

function telemetryLaneExists(laneId: TelemetryLaneId) {
  return TELEMETRY_DEPENDENCY_GRAPH.some((lane) => lane.id === laneId);
}

function isSourceReady(input: RealUsageConfidenceInput, laneId: TelemetryLaneId) {
  const laneStatus = input.telemetryLaneStatus[laneId];
  return telemetryLaneExists(laneId)
    && (laneStatus === "closed" || laneStatus === "source_ready")
    && input.materializerPresence[laneId] === true
    && input.sourceTruthFreshness !== "unknown"
    && input.behaviorMathConfidence !== "unknown";
}

function operatorEventForSignal(input: RealUsageConfidenceInput, signalId: RealUsageConfidenceSignalId) {
  return input.operatorConfirmedEvents.find((event) => event.signalId === signalId);
}

function ignoredUnknownEvents(input: RealUsageConfidenceInput) {
  return input.operatorConfirmedEvents.filter((event) =>
    event.confirmationSource !== "operator_confirmed" || event.count <= 0 || !event.signalId);
}

function buildSignal(input: RealUsageConfidenceInput, id: RealUsageConfidenceSignalId): RealUsageConfidenceSignal {
  const config = SIGNAL_CONFIG[id];
  const operatorEvent = operatorEventForSignal(input, id);
  const sourceReady = isSourceReady(input, config.lane);
  const operatorConfirmed = Boolean(operatorEvent && operatorEvent.confirmationSource === "operator_confirmed" && operatorEvent.count > 0);
  const unknownOperatorEvent = Boolean(operatorEvent && !operatorConfirmed);

  if (operatorConfirmed && sourceReady && !config.sourceReadyOnly) {
    return {
      id,
      label: config.label,
      status: "source_ready",
      telemetryLaneId: config.lane,
      sourcePath: operatorEvent?.sourcePath || config.sourcePath,
      sourcePathStatus: "source_ready",
      materializerPresent: input.materializerPresence[config.lane] === true,
      operatorConfirmed: true,
      confidenceContribution: Math.min(config.weight, 10),
      evidence: [
        `eventName=${operatorEvent?.eventName}`,
        "operatorContextOnly=true",
        `telemetryLane=${config.lane}`,
        `laneStatus=${input.telemetryLaneStatus[config.lane]}`,
        `materializerPresent=${input.materializerPresence[config.lane]}`,
      ],
      limitations: LIMITS,
      nextAction: "Use source-ready purchase telemetry as bounded confidence only; keep operator context separate from observed proof.",
    };
  }

  if (unknownOperatorEvent) {
    return {
      id,
      label: config.label,
      status: "ignored_unknown",
      telemetryLaneId: config.lane,
      sourcePath: operatorEvent?.sourcePath || config.sourcePath,
      sourcePathStatus: "ignored_unknown",
      materializerPresent: input.materializerPresence[config.lane] === true,
      operatorConfirmed: false,
      confidenceContribution: 0,
      evidence: [
        `eventName=${operatorEvent?.eventName}`,
        `confirmationSource=${operatorEvent?.confirmationSource}`,
        "unknownUsageCounted=false",
      ],
      limitations: LIMITS,
      nextAction: "Require operator confirmation and source path validation before counting this usage signal.",
    };
  }

  if (sourceReady) {
    return {
      id,
      label: config.label,
      status: "source_ready",
      telemetryLaneId: config.lane,
      sourcePath: config.sourcePath,
      sourcePathStatus: "source_ready",
      materializerPresent: true,
      operatorConfirmed: false,
      confidenceContribution: config.weight,
      evidence: [
        `telemetryLane=${config.lane}`,
        `laneStatus=${input.telemetryLaneStatus[config.lane]}`,
        `materializerPresent=${input.materializerPresence[config.lane]}`,
        `behaviorMathConfidence=${input.behaviorMathConfidence}`,
      ],
      limitations: LIMITS,
      nextAction: "Use source-ready status as confidence only until real observed usage is operator-confirmed or formally evidenced.",
    };
  }

  return {
    id,
    label: config.label,
    status: "unavailable",
    telemetryLaneId: config.lane,
    sourcePath: config.sourcePath,
    sourcePathStatus: "missing",
    materializerPresent: input.materializerPresence[config.lane] === true,
    operatorConfirmed: false,
    confidenceContribution: 0,
    evidence: [
      `telemetryLane=${config.lane}`,
      `laneStatus=${input.telemetryLaneStatus[config.lane] ?? "unknown"}`,
      `materializerPresent=${input.materializerPresence[config.lane] === true}`,
    ],
    limitations: LIMITS,
    nextAction: "Close the telemetry lane and materializer path before using this as confidence evidence.",
  };
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildRealUsageConfidenceReport(input: RealUsageConfidenceInput): RealUsageConfidenceReport {
  const signalEntries = Object.keys(SIGNAL_CONFIG).map((id) =>
    [id, buildSignal(input, id as RealUsageConfidenceSignalId)] as const);
  const signals = Object.fromEntries(signalEntries) as RealUsageSignalMap;
  const activeSignals = signalEntries.map(([, signal]) => signal).filter((signal) =>
    signal.status === "observed" || signal.status === "source_ready");
  const confidenceScore = roundScore(Math.min(100, activeSignals.reduce((sum, signal) => sum + signal.confidenceContribution, 0)));
  const observedSignals = activeSignals.filter((signal) => signal.status === "observed").length;
  const sourceReadySignals = activeSignals.filter((signal) => signal.status === "source_ready").length;
  const ignored = ignoredUnknownEvents(input);
  const status = confidenceScore > 0
    ? sourceReadySignals > 0
      ? "source_ready_real_usage_confidence"
      : "partial_real_usage_confidence"
    : "unavailable";

  return {
    reportKey: "real-usage-confidence",
    generatedAtUtc: input.generatedAtUtc,
    currentHead: input.currentHead,
    sourceCommit: input.currentHead,
    status,
    passed: confidenceScore > 0,
    productionReadsRequired: false,
    confidenceScore,
    confidenceSignals: activeSignals.map((signal) => signal.id),
    evidence: [
      `confidenceScore=${confidenceScore}`,
      `observedSignals=${observedSignals}`,
      `sourceReadySignals=${sourceReadySignals}`,
      "formalGatesCleared=false",
      "productionReadsRequired=false",
    ],
    limits: LIMITS,
    formalGateImpact: {
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
    },
    ignoredUnknownUsage: ignored,
    signals,
    summary: {
      observedSignals,
      sourceReadySignals,
      ignoredUnknownUsage: ignored.length,
      confidenceScore,
    },
    nextAction: "Use source-derived real usage confidence only; keep operator context, formal provider, and deployed runtime gates separate.",
  };
}

export function validateRealUsageConfidenceReport(report: RealUsageConfidenceReport): string[] {
  const failures: string[] = [];
  if (report.reportKey !== "real-usage-confidence") failures.push("reportKey must be real-usage-confidence.");
  if (report.sourceCommit !== report.currentHead) failures.push("sourceCommit must match currentHead.");
  if (report.productionReadsRequired !== false) failures.push("real usage confidence must not require production reads.");
  if (report.formalGateImpact.clearsFormalProvider) failures.push("real usage confidence must not clear formal provider.");
  if (report.formalGateImpact.clearsDeployedRuntime) failures.push("real usage confidence must not clear deployed runtime.");
  for (const limit of LIMITS) {
    if (!report.limits.includes(limit)) failures.push(`limits must include ${limit}.`);
  }

  for (const signal of Object.values(report.signals)) {
    if (!signal) continue;
    if (!signal.sourcePath) failures.push(`${signal.id} lacks source path.`);
    if (!signal.nextAction) failures.push(`${signal.id} lacks next action.`);
    if (signal.status === "observed" && signal.operatorConfirmed) failures.push(`${signal.id} turns operator context into observed proof.`);
    if (signal.status === "observed" && !signal.operatorConfirmed) failures.push(`${signal.id} is observed without formal runtime evidence.`);
    if (signal.status === "observed" && signal.confidenceContribution <= 0) failures.push(`${signal.id} observed signal lacks confidence contribution.`);
    if (signal.status === "ignored_unknown" && signal.confidenceContribution !== 0) failures.push(`${signal.id} unknown usage counted as proof.`);
    if (signal.limitations.length === 0) failures.push(`${signal.id} lacks limitations.`);
  }

  if (report.ignoredUnknownUsage.some((event) => event.confirmationSource === "unknown" && event.count > 0)
    && Object.values(report.signals).some((signal) => signal?.status === "observed" && signal.evidence.includes("confirmationSource=unknown"))) {
    failures.push("unknown usage was counted as proof.");
  }

  return failures;
}
