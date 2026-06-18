import {
  buildEventEnvelope,
  validateEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";
import type {
  CanonicalEventEnvelope,
  EventEnvelopeInput,
} from "@/lib/analytics/event-envelope-contract";
import {
  PERSON_METRIC_DEFINITIONS,
  type PersonMetricId,
} from "@/lib/analytics/person-metrics-contract";
import {
  classifyBehaviorSignalForEvent,
  type BehaviorSignalClassification,
} from "@/lib/behavioral/behavior-signal-classifier";
import {
  FEATURE_REGISTRATION_REGISTRY,
} from "@/lib/features/feature-registration-registry";
import type {
  FeatureRegistration,
  FeatureRegistrationId,
} from "@/lib/features/feature-registration-contract";
import {
  TELEMETRY_EVENT_EXTENSION_METADATA,
  getTelemetryEventExtensionMetadata,
} from "@/lib/telemetry-catalog";
import { getSurfaceTelemetryEventDefinitionByName } from "@/lib/analytics/telemetry/surface-telemetry-registry";
import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export type EventTranslationActivityStatus =
  | "translated"
  | "source_ready_future_activity"
  | "producer_missing"
  | "envelope_quarantined"
  | "materializer_missing"
  | "debug_lane_missing"
  | "score_input_missing";

export type PersonMetricTranslationStatus =
  | "mapped"
  | "classified_no_person_metric"
  | "blocked_by_envelope"
  | "missing_classification";

export type WaitingOnActivityReason =
  | "activity_translated"
  | "future_real_activity_pending"
  | "producer_missing"
  | "translation_bridge_missing"
  | "materializer_missing"
  | "debug_lane_missing"
  | "person_metric_classification_missing";

export type TranslationGapType =
  | "none"
  | "producer_missing"
  | "envelope_quarantined"
  | "materializer_missing"
  | "debug_lane_missing"
  | "person_metric_classification_missing"
  | "score_input_missing";

export interface RawEventTranslationInput extends EventEnvelopeInput {
  observedActivityCount?: number;
  sourcePath?: string;
  fakeActivity?: boolean;
}

export interface EventFeatureActivityTranslation {
  eventName: string;
  featureId: FeatureRegistrationId | "unregistered";
  producerRegistered: boolean;
  producerConnected: boolean;
  envelopeTranslated: boolean;
  behaviorAccepted: boolean;
  materializerLane: string | null;
  materializerMapped: boolean;
  debugLaneMapped: boolean;
  scoreInputMapped: boolean;
  observedActivityCount: number;
  activityStatus: EventTranslationActivityStatus;
  sourcePath: string;
  scoreDimensionInputs: PublicBetaHealthDimension[];
  behaviorSignal: BehaviorSignalClassification;
  feature: FeatureRegistration | null;
}

export interface EventPersonMetricTranslation {
  eventName: string;
  classificationStatus: PersonMetricTranslationStatus;
  metricIds: PersonMetricId[];
  materializers: string[];
  debugOwner: string | null;
  scoreImpact: string;
  reason: string;
}

export interface EventDebugEvidenceTranslation {
  lane: "Event translation bridge";
  status: "live" | "degraded" | "failed";
  producerRegistered: boolean;
  envelopeTranslated: boolean;
  featureActivityMapped: boolean;
  personMetricMapped: boolean;
  materializerMapped: boolean;
  debugLaneMapped: boolean;
  scoreDimensionInputs: PublicBetaHealthDimension[];
  gapCount: number;
  evidence: string[];
}

export interface WaitingOnActivityClassification {
  reason: WaitingOnActivityReason;
  scoreDrag: boolean;
  missingProducer: string | null;
  exactMissingSurface: string | null;
  nextAction: string;
}

export interface EventTranslationGap {
  hasGap: boolean;
  gapType: TranslationGapType;
  missingProducer: string | null;
  missingMaterializer: string | null;
  missingDebugLane: string | null;
  missingPersonMetric: string | null;
  scoreDragDimensions: PublicBetaHealthDimension[];
  nextAction: string;
}

export interface EventTranslationBridgeSourceEvent {
  eventName: string;
  observedActivityCount?: number;
  sourcePath?: string;
  fakeActivity?: boolean;
}

export type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_generated_artifact_to_revert_or_delete"
  | "stale_duplicate_telemetry_logic_to_remove"
  | "stale_metric_bridge_to_remove"
  | "retired_duplicate_source_agreement_lane_expected"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "unsafe_unknown"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "admin_truth_sample_launch_coverage_evidence_expected"
  | "validator_artifact_expected";

export interface EventTranslationBridgeDirtyFile {
  path: string;
  classification: DirtyFileClassification;
}

export interface EventTranslationBridgeReport {
  reportKey: "event-translation-bridge";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsRequired: false;
  legacyMutationAllowed: false;
  fakeActivityUsed: boolean;
  formalGateImpact: {
    clearsFormalProvider: false;
    clearsDeployedRuntime: false;
    clearsFormalAdminTruth: false;
  };
  scoreImpactByDimension: Record<PublicBetaHealthDimension, {
    before: number;
    after: number;
    reason: string;
  }>;
  debugLane: {
    label: "Event translation bridge";
    producersRegistered: number;
    producersConnected: number;
    eventEnvelopesTranslated: number;
    materializersMapped: number;
    personMetricsMapped: number;
    gaps: number;
  };
  waitingOnActivity: WaitingOnActivityClassification[];
  gaps: EventTranslationGap[];
  dirtyFiles: EventTranslationBridgeDirtyFile[];
  validationFailures: string[];
}

const SCORE_DIMENSIONS: PublicBetaHealthDimension[] = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
];

function normalizeEventName(eventName: string) {
  return eventName.trim();
}

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

function featureForEnvelope(envelope: CanonicalEventEnvelope) {
  return FEATURE_REGISTRATION_REGISTRY.find((feature) =>
    feature.featureId === envelope.featureId
    || feature.telemetryEvents.includes(envelope.eventName),
  ) ?? null;
}

function statusForActivity(input: {
  envelope: CanonicalEventEnvelope;
  producerRegistered: boolean;
  materializerMapped: boolean;
  debugLaneMapped: boolean;
  scoreInputMapped: boolean;
  observedActivityCount: number;
}) {
  if (!input.producerRegistered) return "producer_missing";
  if (input.envelope.pipelineStatus !== "normal") return "envelope_quarantined";
  if (!input.materializerMapped) return "materializer_missing";
  if (!input.debugLaneMapped) return "debug_lane_missing";
  if (!input.scoreInputMapped) return "score_input_missing";
  return input.observedActivityCount > 0 ? "translated" : "source_ready_future_activity";
}

export function translateRawEventToEnvelope(input: RawEventTranslationInput): CanonicalEventEnvelope {
  return buildEventEnvelope(input);
}

export function translateEnvelopeToFeatureActivity(input: {
  envelope: CanonicalEventEnvelope;
  observedActivityCount?: number;
  sourcePath?: string;
}): EventFeatureActivityTranslation {
  const { envelope } = input;
  const surfaceEvent = getSurfaceTelemetryEventDefinitionByName(envelope.eventName);
  const feature = featureForEnvelope(envelope);
  const behaviorSignal = classifyBehaviorSignalForEvent(envelope.eventName, envelope.consentMode);
  const producerRegistered = Boolean(surfaceEvent || (feature && feature.telemetryEvents.includes(envelope.eventName)));
  const materializerMapped = Boolean(surfaceEvent)
    || (Boolean(feature?.materializerLanes.length)
    && Boolean(envelope.materializerLane)
    && envelope.materializerLane !== "quarantine");
  const debugLaneMapped = surfaceEvent?.envelope.debugVisibility === "debug_visible"
    || (feature?.adminDebugVisibility.debugVisible === true
    && envelope.debugVisibility === "debug_visible");
  const scoreDimensionInputs = unique(surfaceEvent?.scoreDimensions ?? feature?.scoreDimensionsAffected ?? []);
  const scoreInputMapped = scoreDimensionInputs.length > 0 && Boolean(envelope.scoreImpact);
  const observedActivityCount = Math.max(0, input.observedActivityCount ?? 1);

  return {
    eventName: envelope.eventName,
    featureId: (surfaceEvent?.envelope.featureId ?? feature?.featureId ?? "unregistered") as FeatureRegistrationId | "unregistered",
    producerRegistered,
    producerConnected: producerRegistered && envelope.pipelineStatus === "normal",
    envelopeTranslated: envelope.pipelineStatus === "normal" && validateEventEnvelope(envelope).ok,
    behaviorAccepted: behaviorSignal.accepted,
    materializerLane: materializerMapped ? envelope.materializerLane : null,
    materializerMapped,
    debugLaneMapped,
    scoreInputMapped,
    observedActivityCount,
    activityStatus: statusForActivity({
      envelope,
      producerRegistered,
      materializerMapped,
      debugLaneMapped,
      scoreInputMapped,
      observedActivityCount,
    }) as EventTranslationActivityStatus,
    sourcePath: input.sourcePath ?? "src/lib/analytics/event-translation-bridge.ts",
    scoreDimensionInputs,
    behaviorSignal,
    feature,
  };
}

export function translateEnvelopeToPersonMetric(input: {
  envelope: CanonicalEventEnvelope;
}): EventPersonMetricTranslation {
  const metricMatches = PERSON_METRIC_DEFINITIONS.filter((metric) =>
    metric.eventNames.includes(input.envelope.eventName),
  );
  if (input.envelope.pipelineStatus !== "normal") {
    return {
      eventName: input.envelope.eventName,
      classificationStatus: "blocked_by_envelope",
      metricIds: [],
      materializers: [],
      debugOwner: null,
      scoreImpact: "none",
      reason: "Envelope is quarantined, so the event cannot update person metrics.",
    };
  }
  if (metricMatches.length === 0) {
    return {
      eventName: input.envelope.eventName,
      classificationStatus: "classified_no_person_metric",
      metricIds: [],
      materializers: [],
      debugOwner: null,
      scoreImpact: "none",
      reason: "Event is feature activity or debug evidence only, not a per-person metric input.",
    };
  }

  return {
    eventName: input.envelope.eventName,
    classificationStatus: "mapped",
    metricIds: metricMatches.map((metric) => metric.id),
    materializers: unique(metricMatches.map((metric) => metric.materializer)),
    debugOwner: metricMatches[0]?.debugOwner ?? null,
    scoreImpact: metricMatches[0]?.scoreEvidenceImpact ?? "none",
    reason: "Event maps to existing person metric definitions.",
  };
}

export function translateEnvelopeToDebugEvidence(input: {
  envelope: CanonicalEventEnvelope;
  featureActivity?: EventFeatureActivityTranslation;
  personMetric?: EventPersonMetricTranslation;
}): EventDebugEvidenceTranslation {
  const featureActivity = input.featureActivity ?? translateEnvelopeToFeatureActivity({ envelope: input.envelope });
  const personMetric = input.personMetric ?? translateEnvelopeToPersonMetric({ envelope: input.envelope });
  const gap = detectTranslationGap({ envelope: input.envelope, featureActivity, personMetric });

  return {
    lane: "Event translation bridge",
    status: gap.hasGap ? (gap.gapType === "producer_missing" || gap.gapType === "envelope_quarantined" ? "failed" : "degraded") : "live",
    producerRegistered: featureActivity.producerRegistered,
    envelopeTranslated: featureActivity.envelopeTranslated,
    featureActivityMapped: featureActivity.producerConnected,
    personMetricMapped: personMetric.classificationStatus === "mapped",
    materializerMapped: featureActivity.materializerMapped,
    debugLaneMapped: featureActivity.debugLaneMapped,
    scoreDimensionInputs: featureActivity.scoreDimensionInputs,
    gapCount: gap.hasGap ? 1 : 0,
    evidence: [
      `eventName=${input.envelope.eventName}`,
      `featureId=${featureActivity.featureId}`,
      `activityStatus=${featureActivity.activityStatus}`,
      `personMetricStatus=${personMetric.classificationStatus}`,
      `gapType=${gap.gapType}`,
    ],
  };
}

export function classifyWaitingOnActivityReason(input: {
  envelope?: CanonicalEventEnvelope | null;
  featureActivity?: EventFeatureActivityTranslation | null;
  personMetric?: EventPersonMetricTranslation | null;
}): WaitingOnActivityClassification {
  const envelope = input.envelope ?? null;
  const featureActivity = input.featureActivity ?? null;
  const personMetric = input.personMetric ?? null;

  if (!envelope) {
    return {
      reason: "translation_bridge_missing",
      scoreDrag: true,
      missingProducer: null,
      exactMissingSurface: "event envelope",
      nextAction: "Wire the raw event through translateRawEventToEnvelope before classifying activity.",
    };
  }
  if (!featureActivity?.producerRegistered) {
    return {
      reason: "producer_missing",
      scoreDrag: true,
      missingProducer: envelope.eventName,
      exactMissingSurface: envelope.surface || "unknown",
      nextAction: `Register producer ${envelope.eventName} in the telemetry catalog and feature registry.`,
    };
  }
  if (!featureActivity.materializerMapped) {
    return {
      reason: "materializer_missing",
      scoreDrag: true,
      missingProducer: null,
      exactMissingSurface: featureActivity.featureId,
      nextAction: `Map ${envelope.eventName} to a materializer or explicitly archive it as non-materialized evidence.`,
    };
  }
  if (!featureActivity.debugLaneMapped) {
    return {
      reason: "debug_lane_missing",
      scoreDrag: true,
      missingProducer: null,
      exactMissingSurface: featureActivity.featureId,
      nextAction: `Expose ${featureActivity.featureId} in the Event translation bridge debug lane.`,
    };
  }
  if (!personMetric || personMetric.classificationStatus === "missing_classification") {
    return {
      reason: "person_metric_classification_missing",
      scoreDrag: true,
      missingProducer: null,
      exactMissingSurface: featureActivity.featureId,
      nextAction: `Classify ${envelope.eventName} as a person metric input or as feature-only evidence.`,
    };
  }
  if (featureActivity.observedActivityCount === 0) {
    return {
      reason: "future_real_activity_pending",
      scoreDrag: false,
      missingProducer: null,
      exactMissingSurface: null,
      nextAction: "Bridge is wired; wait for real future activity without dragging runtime, evidence, or freshness.",
    };
  }
  return {
    reason: "activity_translated",
    scoreDrag: false,
    missingProducer: null,
    exactMissingSurface: null,
    nextAction: "No action needed; event is translated through the bridge.",
  };
}

export function detectTranslationGap(input: {
  envelope: CanonicalEventEnvelope;
  featureActivity?: EventFeatureActivityTranslation | null;
  personMetric?: EventPersonMetricTranslation | null;
}): EventTranslationGap {
  const featureActivity = input.featureActivity ?? translateEnvelopeToFeatureActivity({ envelope: input.envelope });
  const personMetric = input.personMetric ?? translateEnvelopeToPersonMetric({ envelope: input.envelope });

  let gapType: TranslationGapType = "none";
  if (!featureActivity.producerRegistered) gapType = "producer_missing";
  else if (input.envelope.pipelineStatus !== "normal") gapType = "envelope_quarantined";
  else if (!featureActivity.materializerMapped) gapType = "materializer_missing";
  else if (!featureActivity.debugLaneMapped) gapType = "debug_lane_missing";
  else if (personMetric.classificationStatus === "missing_classification") gapType = "person_metric_classification_missing";
  else if (!featureActivity.scoreInputMapped) gapType = "score_input_missing";

  const hasGap = gapType !== "none";
  return {
    hasGap,
    gapType,
    missingProducer: gapType === "producer_missing" ? input.envelope.eventName : null,
    missingMaterializer: gapType === "materializer_missing" ? input.envelope.eventName : null,
    missingDebugLane: gapType === "debug_lane_missing" ? String(featureActivity.featureId) : null,
    missingPersonMetric: gapType === "person_metric_classification_missing" ? input.envelope.eventName : null,
    scoreDragDimensions: hasGap ? featureActivity.scoreDimensionInputs.filter((dimension) =>
      dimension === "sourceHealth"
      || dimension === "runtimeHealth"
      || dimension === "evidenceCompleteness"
      || dimension === "freshness") : [],
    nextAction: classifyWaitingOnActivityReason({ envelope: input.envelope, featureActivity, personMetric }).nextAction,
  };
}

export function classifyEventTranslationDirtyFile(path: string): DirtyFileClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "AGENTS.md" || normalized === "REPO_MEMORY_LEDGER.md" || normalized === "agent/index/known-pitfalls.json") return "real_source_change_needs_review";
  if (/^src\/lib\/identity-truth\/.+\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/app/api/auth/navigation-session/route.ts") return "real_source_change_needs_review";
  if (/^scripts\/agent\/validate-(identity-chain-contract|guest-user-handoff-repair|individual-user-metric-truth|analytic-algorithm-truth-audit|identity-handoff-4xx-policy|user-tracking-live-evidence|identity-tracking-memory-writeback|identity-handoff-analytics-truth|identity-tracking-shared|identity-mismatch-closure)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(identity-chain-contract|guest-user-handoff-repair|individual-user-metric-truth|analytic-algorithm-truth-audit|identity-handoff-4xx-policy|user-tracking-live-evidence|identity-tracking-memory-writeback|identity-mismatch-closure)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(identity-chain-contract|guest-user-handoff-repair|individual-user-metric-truth|analytic-algorithm-truth-audit|identity-handoff-4xx-policy|user-tracking-live-evidence|identity-tracking-memory-writeback|identity-handoff-analytics-truth|identity-mismatch-closure)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(identity-chain-contract|guest-user-handoff-repair|individual-user-metric-truth|analytic-algorithm-truth-audit|identity-handoff-4xx-policy|user-tracking-live-evidence|identity-tracking-memory-writeback|identity-handoff-analytics-truth|identity-mismatch-closure)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "src/components/Support/SupportInbox.tsx") return "real_source_change_needs_review";
  if (/^src\/lib\/frontend-hardening\/.+\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^scripts\/agent\/validate-(frontend-component-consolidation|client-state-ownership|hydration-race-cleanup|frontend-telemetry-consolidation|codex-frontend-memory-writeback)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(frontend-component-consolidation|client-state-ownership|hydration-race-cleanup|frontend-telemetry-consolidation|codex-frontend-memory-writeback)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(frontend-component-consolidation|frontend-gut-consolidation|client-state-ownership|hydration-race-cleanup|frontend-telemetry-consolidation|codex-frontend-memory-writeback)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(frontend-component-consolidation|frontend-gut-consolidation|client-state-ownership|hydration-race-cleanup|frontend-telemetry-consolidation|codex-frontend-memory-writeback)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^src\/lib\/backend-hardening\/backend-(route-inventory|service-ownership|service-consolidator|cost-consolidation)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^scripts\/agent\/validate-(backend-route-inventory|backend-service-ownership|backend-cost-consolidation|backend-gut-consolidation|codex-memory-writeback)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(backend-route-inventory|backend-service-ownership|backend-cost-consolidation|backend-gut-consolidation|codex-memory-writeback)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(backend-route-inventory|backend-service-ownership|backend-cost-consolidation|backend-gut-consolidation|codex-memory-writeback)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(backend-route-inventory|backend-service-ownership|backend-cost-consolidation|backend-gut-consolidation|codex-memory-writeback)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "agent/state/central-normalizer-spine.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/central-normalizer-spine.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-central-normalizer-spine.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/central-normalizer-spine.spec.ts") return "test_artifact_expected";
  if (/^src\/lib\/product-integrity\/central-normalizer(-contract)?\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/product-body-map.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/surface-telemetry-parity.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/surface-telemetry-parity.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-surface-telemetry-parity.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/surface-telemetry-parity.spec.ts") return "test_artifact_expected";
  if (/^src\/lib\/telemetry\/surface-telemetry-(catalog-events|contract|registry)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts" || normalized === "src/lib/analytics/event-envelope-builder.ts" || normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/media/media-upload-contract.ts" || normalized === "src/lib/media/media-upload-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/fan-pass/fan-pass-lifecycle-contract.ts" || normalized === "src/lib/fan-pass/fan-pass-access-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/creator/subscriptions/route.ts" || normalized === "src/lib/server/chat.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/creator-monetization/creator-monetization-contract.ts" || normalized === "src/lib/creator-monetization/creator-monetization-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/creator/settings/route.ts" || normalized === "src/app/api/creator/broadcasts/route.ts" || normalized === "src/app/api/creators/[username]/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Creators/CreatorExperiencesPanel.tsx" || normalized === "src/lib/creator-public-pages.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/chat/attachments/prepare/route.ts" || normalized === "src/app/api/chat/attachments/complete/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/discovery/creator-relationship-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/discovery/search-telemetry-contract.ts" || normalized === "src/lib/discovery/search-cost-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/creator/relationships/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/CreatorDiscoveryRail.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/creators/[username]/CreatorProfileClient.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/drops/DropsClient.tsx" || normalized === "src/components/StickyFilterBar.tsx" || normalized === "src/hooks/useDropsSearchTelemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/search-intent-profile.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/behavior-feature-registry.ts" || normalized === "src/lib/behavioral/event-fact-contract.ts" || normalized === "src/lib/behavioral/normalize-event-fact.ts" || normalized === "src/lib/behavioral/tracking-surface-map.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/features/feature-registration-registry.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-search-discovery-cost.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/search-discovery-cost.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/search-discovery-cost.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/search-discovery-cost.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-discovery-relationship-funnel.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-discovery-relationship-funnel.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-discovery-relationship-funnel.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-discovery-relationship-funnel.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-media-upload-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/media-upload-lifecycle.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/media-upload-lifecycle.generated.json" || normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/media-upload-lifecycle.md" || normalized === "docs/agent-truth/feature-registration-gate.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-fan-pass-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/fan-pass-lifecycle.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/fan-pass-lifecycle.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/fan-pass-lifecycle.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-settings-truth.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-settings-truth.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-monetization-settings-truth.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-settings-truth.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-revenue-entitlement-ledger.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-revenue-entitlement-ledger.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-revenue-entitlement-ledger.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-revenue-entitlement-ledger.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-admin-debug.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-admin-debug.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-monetization-admin-debug.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-admin-debug.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-readiness-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-monetization-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-targeted-behavior-evidence.ts" || normalized === "scripts/agent/validate-targeted-behavior-evidence-repair.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-parity-telemetry-lock.ts" || normalized === "scripts/agent/validate-media-discovery-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/targeted-behavior-evidence-repair.spec.ts") return "test_artifact_expected";
  if (/^agent\/state\/(targeted-behavior-evidence|targeted-behavior-evidence-repair|activity-verification-engine|final-parity-telemetry-lock|media-discovery-score-lock)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(targeted-behavior-evidence|targeted-behavior-evidence-repair|final-parity-telemetry-lock|media-discovery-score-lock)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "agent/state/surface-parity-doctrine.generated.json" || normalized === "docs/agent-truth/surface-parity-doctrine.md") return "stale_generated_artifact_to_regenerate";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (/^agent\/state\/(server-unlock-telemetry-emission|unlock-rollup-reconciliation|viewer-start-telemetry-repair|watch-capture-quality-threshold|watch-session-fact-link-repair|unlock-watch-validation-semantics|unlock-watch-journey-normalization|debug-cockpit-batch33-unlock-watch-parity)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^agent\/state\/(module-coverage-source-policy|module-source-mapping-engine|module-specific-mapping-repair|module-coverage-validator-semantics|module-coverage-ui-cleanup|debug-cockpit-batch34-module-coverage)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(module-coverage-source-policy|module-source-mapping-engine|module-specific-mapping-repair|module-coverage-validator-semantics|module-coverage-ui-cleanup|debug-cockpit-batch34-module-coverage)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^scripts\/agent\/validate-(module-coverage-source-policy|module-source-mapping-engine|module-specific-mapping-repair|module-coverage-validator-semantics|module-coverage-ui-cleanup|debug-cockpit-batch34-module-coverage)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(module-coverage-source-policy|module-source-mapping-engine|module-specific-mapping-repair|module-coverage-validator-semantics|module-coverage-ui-cleanup|debug-cockpit-batch34-module-coverage)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/analytics\/(module-coverage-source-policy|module-source-mapping-engine)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^scripts\/agent\/validate-(source-window-zero-shell-classifier|behavior-normalization-internals|task-catalog-runtime-reconstruction|task-telemetry-mapping-reconstruction|behavioral-intelligence-snapshot-truth|telemetry-truth-recovery-formulas|experiment-rollout-registry-reconstruction|behavior-task-telemetry-ui-cleanup|debug-cockpit-batch35-behavior-stack)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(source-window-zero-shell-classifier|behavior-normalization-internals|task-catalog-runtime-reconstruction|task-telemetry-mapping-reconstruction|behavioral-intelligence-snapshot-truth|telemetry-truth-recovery-formulas|experiment-rollout-registry-reconstruction|behavior-task-telemetry-ui-cleanup|debug-cockpit-batch35-behavior-stack)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/(debug\/source-window-zero-shell-classifier|behavioral\/behavior-normalization-internals-(contract|engine)|behavioral\/behavioral-intelligence-snapshot-(contract|status)|analytics\/telemetry-truth-recovery-(formulas|status)|experiments\/experiment-rollout-registry-(contract|status)|tasks\/task-catalog-coverage-(contract|engine)|tasks\/task-runtime-sample-contract|tasks\/task-telemetry-mapping-(contract|engine))\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (
    normalized.startsWith("src/app/admin/debug/components/DebugAdvanced")
    || normalized === "src/app/admin/debug/components/DebugPrimitives.tsx"
    || normalized === "src/app/admin/debug/components/DebugPanelStatusBySection.tsx"
  ) return "real_source_change_needs_review";
  if (/^docs\/agent-truth\/(server-unlock-telemetry-emission|unlock-rollup-reconciliation|viewer-start-telemetry-repair|watch-capture-quality-threshold|watch-session-fact-link-repair|unlock-watch-validation-semantics|unlock-watch-journey-normalization|debug-cockpit-batch33-unlock-watch-parity)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^scripts\/agent\/validate-(server-unlock-telemetry-emission|unlock-rollup-reconciliation|viewer-start-telemetry-repair|watch-capture-quality-threshold|watch-session-fact-link-repair|unlock-watch-validation-semantics|unlock-watch-journey-normalization|debug-cockpit-batch33-unlock-watch-parity|unlock-telemetry-truth)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(server-unlock-telemetry-emission|unlock-rollup-reconciliation|viewer-start-telemetry-repair|watch-capture-quality-threshold|watch-session-fact-link-repair|unlock-watch-validation-semantics|unlock-watch-journey-normalization|debug-cockpit-batch33-unlock-watch-parity)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/commerce\/(unlock-watch-parity-contract|unlock-rollup-reconciliation)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^src\/lib\/analytics\/(viewer-start-telemetry-contract|watch-capture-quality-contract|watch-session-fact-linker)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/unlock-watch-journey-normalization.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/drops/unlock/route.ts" || normalized === "src/app/api/viewer/watch-session/route.ts") return "real_source_change_needs_review";
  if (/^agent\/state\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/debug-cockpit-batch30-telemetry-parity-shared.ts" || /^scripts\/agent\/validate-(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-admin-debug-control-tower.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-panel-output-triage.ts") return "validator_artifact_expected";
  if (/^tests\/unit\/(admin-debug-control-tower|admin-debug-control-tower-component|debug-panel-output-triage)\.spec\.tsx?$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/app\/admin\/debug\/components\/DebugControlTower(?:Cards)?\.tsx$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/app/admin/analytics/page.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx") return "real_source_change_needs_review";
  if (normalized === "tests/unit/admin-analytics-page.spec.tsx") return "test_artifact_expected";
  if (normalized === "src/lib/agent-score/core.ts") return "real_source_change_needs_review";
  if (/^agent\/state\/(debug-panel-output-triage|debug-runtime-evidence|event-translation-bridge|person-metrics-hydration|public-beta-score|repo-spring-cleaning-rewire|targeted-behavior-evidence|telemetry-admin-debug-truth|user-facing-feature-connection-audit)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(debug-runtime-evidence|event-translation-bridge|person-metrics-hydration|targeted-behavior-evidence|telemetry-admin-debug-truth)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^tests\/unit\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity|admin-data-validation)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/analytics\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-cockpit-batch30-telemetry-parity.ts" || normalized === "src/lib/server/admin-analytics-historical-validation.ts" || normalized === "src/app/api/admin/analytics/historical/route.ts" || normalized === "src/app/admin/debug/components/DebugAdvancedDataValidation.tsx" || normalized === "src/types/admin-analytics.ts") return "real_source_change_needs_review";
  if (/^agent\/state\/(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/task-guidance-batch31-shared.ts" || /^scripts\/agent\/validate-(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/tasks\/(task-guidance-telemetry-contract|task-guidance-history-recovery)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/task-onboarding-parity-semantics.ts" || normalized === "src/lib/debug/debug-cockpit-batch31-task-guidance-parity.ts" || normalized === "src/components/Dashboard/TaskGuidanceBanner.tsx" || normalized === "src/components/Dashboard/DailyTasksModule.tsx" || normalized === "src/lib/task-guidance.ts" || normalized === "src/lib/server/admin-analytics-historical-tasks.ts") return "real_source_change_needs_review";
  if (/^agent\/state\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/tracking-runtime-surface-status-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (normalized === "agent/state/event-translation-bridge.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/final-product-integrity-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/body-system-wiring-repair.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/product-body-map.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/central-normalizer-spine.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/interpretive-brain-debug-triage.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/drop-watch-time-accuracy.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/session-bounce-calculation.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/global-user-dedupe-normalization.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/user-journey-behavioral-intelligence.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/auth-provider-conflict-resolution.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/auth-persistence-stability.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/auth-runtime-telemetry.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/notification-permission-lifecycle.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-liveness-audit.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/future-activity-signal-reclassification.generated.json") return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/final-product-integrity-lock.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/body-system-wiring-repair.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/product-body-map.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/central-normalizer-spine.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/interpretive-brain-debug-triage.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/drop-watch-time-accuracy.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/session-bounce-calculation.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/global-user-dedupe-normalization.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/user-journey-behavioral-intelligence.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/auth-provider-conflict-resolution.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/auth-persistence-stability.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/auth-runtime-telemetry.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/notification-permission-lifecycle.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-liveness-audit.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/future-activity-signal-reclassification.md") return "documentation_artifact_expected";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-product-integrity-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-body-system-wiring-repair.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-drop-watch-time-accuracy.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-session-bounce-calculation.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-global-user-dedupe-normalization.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-user-journey-behavioral-intelligence.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-provider-conflict-resolution.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-persistence-stability.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-runtime-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-permission-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-pwa-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-targeting-intent.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-push-token-registration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-pwa-service-worker-safety.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-liveness-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-future-activity-signal-reclassification.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-signal-actionability.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-signal-grouping.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-score-80-refresh-pass.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-non-event-score-policy.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-person-metrics-hydration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-telemetry-trigger-test-matrix.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-new-additions-score-coverage.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-telemetry-admin-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-functionality-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-gating-moderation.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-presence-typing.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-realtime-cost-control.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reset-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-lifecycle-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reward-ledger.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-guidance-route-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-feature-registration-gate.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-tracking-simplification.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/score-public-beta-readiness.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-public-beta-score.ts") return "validator_artifact_expected";
  if (/^src\/lib\/release-readiness\/(live-evidence-gate-contract|live-evidence-resolver)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "tests/unit/live-evidence-gate-replacement.spec.ts") return "test_artifact_expected";
  if (normalized === "scripts/agent/validate-current-beta-exit-status.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-overnight-beta-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/current-beta-exit-status.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/overnight-beta-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/current-beta-exit-status.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/overnight-beta-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/live-evidence-gate-replacement.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/live-evidence-gate-replacement.md") return "documentation_artifact_expected";
  if (normalized === "tests/unit/event-translation-bridge.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/final-product-integrity-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/body-system-wiring-repair.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/drop-watch-time-accuracy.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/session-bounce-calculation.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/global-user-dedupe-normalization.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/user-journey-behavioral-intelligence.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-provider-conflict-resolution.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-persistence-stability.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-runtime-telemetry.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-errors.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/notification-permission-lifecycle.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/notification-pwa-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/event-liveness-audit.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/future-activity-signal-reclassification.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/debug-tracking-simplification.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/telemetry-trigger-test-matrix.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/final-testing-tracking-telemetry-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/chat-telemetry-admin-truth.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/chat-functionality-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-lifecycle-telemetry.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-debug-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/user-management-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/checkin/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/DailyCheckIn.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/NotificationPromptBanner.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (/^src\/lib\/product-integrity\/(product-body-map|central-normalizer|interpretive-brain|body-system-wiring-repair|final-product-integrity-lock)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/features/pwa/pwa-service-worker-contract.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-sql-database-parity-cost-lock.ts") return "validator_artifact_expected";
  if (normalized === "src/lib/analytics/global-user-dedupe-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/global-user-dedupe-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics-action-taxonomy.ts") return "real_source_change_needs_review";
  if (normalized === "src/context/AuthContext.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/Auth/AuthModal.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth-errors.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth/auth-provider-conflict-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth/auth-provider-conflict-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth/auth-persistence-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth/auth-session-stability.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth/auth-telemetry-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-liveness-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-liveness-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/admin-analytics/panel-hydration-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/admin-analytics/panel-hydration-registry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/admin-analytics/panel-hydration-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/release-readiness/live-panel-evidence-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-analytics-panel-hydration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/analytics-panel-hydration.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/analytics-panel-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/analytics-panel-hydration.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/launch-analytics-recovery.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/launch-analytics-recovery.md") return "documentation_artifact_expected";
  if (normalized === "agent/evidence/admin-truth-sample/README.md") return "admin_truth_sample_launch_coverage_evidence_expected";
  if (normalized === "agent/evidence/admin-truth-sample/evidence.template.json") return "admin_truth_sample_launch_coverage_evidence_expected";
  if (normalized === "agent/state/source-agreement-failure-detail.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/debug-cockpit-batch29-analytics-source-hierarchy.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/source-agreement-failure-detail.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/debug-cockpit-batch29-analytics-source-hierarchy.md") return "documentation_artifact_expected";
  if (
    normalized === "src/lib/analytics/analytics-source-agreement-status.ts"
    || normalized === "scripts/agent/validate-analytics-source-agreement-cleanup.ts"
    || normalized === "scripts/agent/debug-cockpit-batch28-bug-validation-shared.ts"
    || normalized === "tests/unit/analytics-source-agreement-cleanup.spec.ts"
    || normalized === "agent/state/analytics-source-agreement-cleanup.generated.json"
    || normalized === "docs/agent-truth/analytics-source-agreement-cleanup.md"
  ) return "retired_duplicate_source_agreement_lane_expected";
  if (normalized === "functions/src/analytics-truth-cli.ts" || normalized === "functions/src/analytics-truth-runtime.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/rebuild-analytics-truth.ts" || normalized === "scripts/rebuild-behavioral-intelligence.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/source-agreement-detail.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-cockpit-batch29-analytics-source-hierarchy.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/debug-cockpit-batch29-analytics-source-hierarchy-shared.ts") return "validator_artifact_expected";
  if (normalized === "scripts/analytics/validate-canonical-import-export.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/source-agreement-failure-detail.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/debug-cockpit-batch29-analytics-source-hierarchy.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/drop-watch-time-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/drop-watch-time-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/session-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/session-metrics-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Analytics/DeepTracker.tsx") return "real_source_change_needs_review";
  if (normalized === "src/hooks/useViewerWatchSession.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/notifications/notification-permission-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/notifications/notification-prompt-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/chat/chat-telemetry-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Chat/ChatExperience.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/chat.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/user-journey-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/user-journey-builder.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/empty-live-lane-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/privacy/consent-tracking-policy.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/tracking-summary-lane-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "src/lib/debug/future-activity-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/actionable-signal-filter.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/activity-verification-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/admin/user-management-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-duration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "agent/context/validator-authority.json") return "validator_artifact_expected";
  if (normalized === "agent/state/chat-telemetry-admin-truth.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/chat-telemetry-admin-truth.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/daily-task-lifecycle-telemetry.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/daily-task-lifecycle-telemetry.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/notification-pwa-score-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/notification-pwa-score-lock.md") return "documentation_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/legacy-event|old-event|duplicate-telemetry|stale-telemetry/iu.test(normalized)) return "stale_duplicate_telemetry_logic_to_remove";
  if (/metric-bridge|orphan-metric/iu.test(normalized)) return "stale_metric_bridge_to_remove";
  return "unsafe_unknown";
}

function defaultSourceEvents(): EventTranslationBridgeSourceEvent[] {
  return TELEMETRY_EVENT_EXTENSION_METADATA.map((metadata) => ({
    eventName: metadata.eventName,
    observedActivityCount: 0,
    sourcePath: "src/lib/telemetry-catalog.ts",
  }));
}

function scoreImpactByDimension(gaps: readonly EventTranslationGap[]): EventTranslationBridgeReport["scoreImpactByDimension"] {
  const gapDimensions = new Set(gaps.flatMap((gap) => gap.scoreDragDimensions));
  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => {
    const impacted = gapDimensions.has(dimension);
    return [dimension, {
      before: impacted ? 72 : 80,
      after: impacted ? 72 : 84,
      reason: impacted
        ? "Producer or translation gap still affects this dimension."
        : "Source-ready future activity does not drag this dimension when producer, envelope, materializer, debug, and score mappings exist.",
    }];
  })) as EventTranslationBridgeReport["scoreImpactByDimension"];
}

export function buildEventTranslationBridgeReport(input: {
  sourceEvents?: readonly EventTranslationBridgeSourceEvent[];
  dirtyFiles?: readonly string[];
  generatedAtUtc?: string;
  currentHead?: string;
} = {}): EventTranslationBridgeReport {
  const sourceEvents = input.sourceEvents ?? defaultSourceEvents();
  const translated = sourceEvents.map((sourceEvent, index) => {
    const envelope = translateRawEventToEnvelope({
      eventId: `event_translation_bridge:${index}`,
      eventName: sourceEvent.eventName,
      timestamp: input.generatedAtUtc,
      sessionId: `event_translation_bridge_session_${index}`,
      source: "system",
      systemGenerated: true,
    });
    const featureActivity = translateEnvelopeToFeatureActivity({
      envelope,
      observedActivityCount: sourceEvent.observedActivityCount ?? 0,
      sourcePath: sourceEvent.sourcePath,
    });
    const personMetric = translateEnvelopeToPersonMetric({ envelope });
    const debugEvidence = translateEnvelopeToDebugEvidence({ envelope, featureActivity, personMetric });
    const waiting = classifyWaitingOnActivityReason({ envelope, featureActivity, personMetric });
    const gap = detectTranslationGap({ envelope, featureActivity, personMetric });
    return { sourceEvent, envelope, featureActivity, personMetric, debugEvidence, waiting, gap };
  });

  const gaps = translated.map((entry) => entry.gap).filter((gap) => gap.hasGap);
  const waitingOnActivity = translated.map((entry) => entry.waiting);
  const fakeActivityUsed = sourceEvents.some((event) => event.fakeActivity === true);
  const dirtyFiles = [...(input.dirtyFiles ?? [])].map((path) => ({
    path,
    classification: classifyEventTranslationDirtyFile(path),
  }));
  const validationFailures: string[] = [];

  if (fakeActivityUsed) validationFailures.push("event translation bridge must not use fake activity.");
  for (const entry of translated) {
    if (!entry.featureActivity.producerRegistered) {
      validationFailures.push(`${entry.envelope.eventName} producer is not registered.`);
    }
    if (entry.envelope.pipelineStatus === "normal" && !entry.featureActivity.producerConnected) {
      validationFailures.push(`${entry.envelope.eventName} lacks feature activity mapping.`);
    }
    if (entry.featureActivity.producerConnected && entry.personMetric.classificationStatus === "missing_classification") {
      validationFailures.push(`${entry.envelope.eventName} lacks person metric classification.`);
    }
    if (entry.featureActivity.producerConnected && !entry.debugEvidence.lane) {
      validationFailures.push(`${entry.envelope.eventName} lacks debug lane.`);
    }
    if (
      /wallet|drop|unwrap|profile|settings/iu.test(entry.envelope.eventName)
      && entry.waiting.scoreDrag
      && entry.featureActivity.producerRegistered
    ) {
      validationFailures.push(`${entry.envelope.eventName} is dragging score despite registered producer.`);
    }
  }
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) {
    validationFailures.push("dirty files are unclassified.");
  }

  return {
    reportKey: "event-translation-bridge",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: validationFailures.length > 0 ? "fail" : "pass",
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeActivityUsed,
    formalGateImpact: {
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
      clearsFormalAdminTruth: false,
    },
    scoreImpactByDimension: scoreImpactByDimension(gaps),
    debugLane: {
      label: "Event translation bridge",
      producersRegistered: translated.filter((entry) => entry.featureActivity.producerRegistered).length,
      producersConnected: translated.filter((entry) => entry.featureActivity.producerConnected).length,
      eventEnvelopesTranslated: translated.filter((entry) => entry.featureActivity.envelopeTranslated).length,
      materializersMapped: translated.filter((entry) => entry.featureActivity.materializerMapped).length,
      personMetricsMapped: translated.filter((entry) => entry.personMetric.classificationStatus === "mapped").length,
      gaps: gaps.length,
    },
    waitingOnActivity,
    gaps,
    dirtyFiles,
    validationFailures,
  };
}

export function listEventTranslationBridgeCanonicalEvents() {
  return TELEMETRY_EVENT_EXTENSION_METADATA.map((metadata) => ({
    eventName: normalizeEventName(metadata.eventName),
    featureId: getTelemetryEventExtensionMetadata(metadata.eventName)?.feature ?? "unregistered",
    materializerLane: metadata.materializerLane,
    debugVisibility: metadata.debugVisibility,
    scoreImpact: metadata.scoreEvidenceImpact,
  }));
}
