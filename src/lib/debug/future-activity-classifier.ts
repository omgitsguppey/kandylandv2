export type FutureActivitySignalClassification =
  | "future_activity_placeholder"
  | "source_ready_waiting_for_real_user_event"
  | "source_ready_no_score_impact"
  | "missing_producer"
  | "missing_bridge"
  | "missing_materializer"
  | "missing_metric_consumer"
  | "stale_artifact"
  | "broken_debug_mapping"
  | "blocked_formal_evidence"
  | "unsafe_unknown";

export type FutureActivitySignalInput = {
  reason?: string | null;
  scoreDrag?: boolean | null;
  missingProducer?: string | null;
  exactMissingSurface?: string | null;
  nextAction?: string | null;
  gapType?: string | null;
  producerRegistered?: boolean | null;
  bridgeConnected?: boolean | null;
  materializerMapped?: boolean | null;
  metricConsumerMapped?: boolean | null;
  debugLaneMapped?: boolean | null;
  staleArtifact?: boolean | null;
  staleArtifactScoreImpacting?: boolean | null;
  formalEvidenceBlocked?: boolean | null;
  sourceReady?: boolean | null;
};

export type FutureActivitySignalClassificationResult = {
  classification: FutureActivitySignalClassification;
  actionable: boolean;
  warning: boolean;
  quiet: boolean;
  scoreImpact: boolean;
  evidenceGateOnly: boolean;
  reason: string;
  missingProducer: string | null;
  exactMissingSurface: string | null;
  nextAction: string;
};

const BROKEN_CLASSIFICATIONS = new Set<FutureActivitySignalClassification>([
  "missing_producer",
  "missing_bridge",
  "missing_materializer",
  "missing_metric_consumer",
  "broken_debug_mapping",
  "unsafe_unknown",
]);

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizedReason(input: FutureActivitySignalInput) {
  return text(input.reason || input.gapType).toLowerCase();
}

function defaultNextAction(classification: FutureActivitySignalClassification) {
  switch (classification) {
    case "future_activity_placeholder":
    case "source_ready_waiting_for_real_user_event":
    case "source_ready_no_score_impact":
      return "No action needed; source-ready activity stays quiet until real user activity arrives.";
    case "missing_producer":
      return "Register or wire the exact missing producer before marking this activity path source-ready.";
    case "missing_bridge":
      return "Wire the event through the canonical event translation bridge.";
    case "missing_materializer":
      return "Map the event to a materializer or explicitly archive it as non-materialized evidence.";
    case "missing_metric_consumer":
      return "Classify the event as a person metric input or feature-only evidence.";
    case "broken_debug_mapping":
      return "Expose the mapped event path in the owning debug lane.";
    case "blocked_formal_evidence":
      return "Keep this in the source evidence gate; do not list it as an activity signal issue.";
    case "stale_artifact":
      return "Refresh or retire the stale artifact only if it still impacts score.";
    case "unsafe_unknown":
      return "Classify the exact producer, bridge, materializer, metric consumer, or source evidence gate before hiding this signal.";
  }
}

function makeResult(
  input: FutureActivitySignalInput,
  classification: FutureActivitySignalClassification,
  options: {
    actionable?: boolean;
    warning?: boolean;
    scoreImpact?: boolean;
    evidenceGateOnly?: boolean;
  } = {},
): FutureActivitySignalClassificationResult {
  const broken = BROKEN_CLASSIFICATIONS.has(classification);
  const actionable = options.actionable ?? broken;
  const warning = options.warning ?? actionable;
  const scoreImpact = options.scoreImpact ?? actionable;
  const evidenceGateOnly = options.evidenceGateOnly ?? false;
  return {
    classification,
    actionable,
    warning,
    quiet: !actionable && !warning && !scoreImpact,
    scoreImpact,
    evidenceGateOnly,
    reason: text(input.reason || input.gapType || classification),
    missingProducer: text(input.missingProducer) || null,
    exactMissingSurface: text(input.exactMissingSurface) || null,
    nextAction: text(input.nextAction) || defaultNextAction(classification),
  };
}

export function classifyFutureActivitySignal(input: FutureActivitySignalInput): FutureActivitySignalClassificationResult {
  const reason = normalizedReason(input);

  if (input.formalEvidenceBlocked === true || /blocked[_ -]?formal[_ -]?evidence|formal[_ -]?evidence/iu.test(reason)) {
    return makeResult(input, "blocked_formal_evidence", {
      actionable: false,
      warning: false,
      scoreImpact: false,
      evidenceGateOnly: true,
    });
  }
  if (input.missingProducer || input.producerRegistered === false || /producer[_ -]?missing|missing[_ -]?producer/iu.test(reason)) {
    return makeResult(input, "missing_producer");
  }
  if (input.bridgeConnected === false || /translation[_ -]?bridge[_ -]?missing|bridge[_ -]?missing|missing[_ -]?bridge/iu.test(reason)) {
    return makeResult(input, "missing_bridge");
  }
  if (input.materializerMapped === false || /materializer[_ -]?missing|missing[_ -]?materializer/iu.test(reason)) {
    return makeResult(input, "missing_materializer");
  }
  if (input.metricConsumerMapped === false || /person[_ -]?metric[_ -]?classification[_ -]?missing|metric[_ -]?consumer[_ -]?missing|missing[_ -]?metric/iu.test(reason)) {
    return makeResult(input, "missing_metric_consumer");
  }
  if (input.debugLaneMapped === false || /debug[_ -]?lane[_ -]?missing|broken[_ -]?debug[_ -]?mapping|debug[_ -]?mapping/iu.test(reason)) {
    return makeResult(input, "broken_debug_mapping");
  }
  if (input.staleArtifact === true || /stale[_ -]?artifact/iu.test(reason)) {
    const scoreImpact = input.staleArtifactScoreImpacting === true || input.scoreDrag === true;
    return makeResult(input, "stale_artifact", {
      actionable: scoreImpact,
      warning: scoreImpact,
      scoreImpact,
    });
  }
  if (input.scoreDrag === true) {
    return makeResult(input, "unsafe_unknown", {
      actionable: true,
      warning: true,
      scoreImpact: true,
    });
  }
  if (/future[_ -]?real[_ -]?activity[_ -]?pending|future[_ -]?activity|activity[_ -]?pending/iu.test(reason)) {
    return makeResult(input, "future_activity_placeholder", {
      actionable: false,
      warning: false,
      scoreImpact: false,
    });
  }
  if (/source[_ -]?ready[_ -]?no[_ -]?activity|waiting[_ -]?for[_ -]?real[_ -]?user[_ -]?event/iu.test(reason)) {
    return makeResult(input, "source_ready_waiting_for_real_user_event", {
      actionable: false,
      warning: false,
      scoreImpact: false,
    });
  }
  if (input.sourceReady === true || input.scoreDrag === false || /source[_ -]?ready|activity[_ -]?translated/iu.test(reason)) {
    return makeResult(input, "source_ready_no_score_impact", {
      actionable: false,
      warning: false,
      scoreImpact: false,
    });
  }

  return makeResult(input, "unsafe_unknown", {
    actionable: true,
    warning: true,
    scoreImpact: true,
  });
}

export function isQuietFutureActivitySignal(input: FutureActivitySignalInput) {
  return classifyFutureActivitySignal(input).quiet;
}
