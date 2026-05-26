import { buildEventEnvelope, validateEventEnvelope } from "@/lib/analytics/event-envelope-builder";
import type {
  CanonicalEventEnvelope,
  EventEnvelopeInput,
  EventEnvelopeSource,
} from "@/lib/analytics/event-envelope-contract";
import { hydratePersonMetrics, type PersonMetricsHydrationReport } from "@/lib/analytics/person-metrics-hydration";
import {
  estimateCostLane,
  mapEventFactToGlobalSummary,
  mapEventFactToSqlRow,
  mapEventFactToUserSummary,
  mapJourneyToExport,
} from "@/lib/analytics/sql-database-parity-engine";
import type { BehavioralEventFact } from "@/lib/behavioral/event-fact-contract";
import { normalizeBehavioralEventFactWithDiagnostics } from "@/lib/behavioral/normalize-event-fact";
import { buildJourneyEvent } from "@/lib/behavioral/user-journey-builder";
import type { UserJourneyEvent } from "@/lib/behavioral/user-journey-contract";
import { getTelemetryEventExtensionMetadata, normalizeTelemetryEventName } from "@/lib/telemetry-catalog";
import { getProductBodySystemForFeature } from "@/lib/product-integrity/product-body-map";
import type { BodySystemId } from "@/lib/product-integrity/product-body-system-contract";
import {
  CENTRAL_NORMALIZER_CONTRACT_VERSION,
  type CentralCostSignal,
  type CentralDebugSignal,
  type CentralExportFact,
  type CentralLegacyPathwayClassification,
  type CentralMetricFact,
  type CentralNormalizerCostClass,
  type CentralNormalizerDebugLane,
  type CentralNormalizerDirtyClassification,
  type CentralNormalizerDirtyFile,
  type CentralNormalizerLegacyPathway,
  type CentralNormalizerOpenPullRequest,
  type CentralNormalizerOutput,
  type CentralNormalizerRequiredFields,
  type CentralNormalizerSourceTruth,
  type CentralNormalizerSpineReport,
  type CentralScoreSignal,
  type ProductSignal,
  type ProductSignalKind,
} from "./central-normalizer-contract";

export { CENTRAL_NORMALIZER_CONTRACT_VERSION };

const SIGNAL_KIND_BODY_SYSTEMS: Partial<Record<ProductSignalKind, BodySystemId>> = {
  AuthSignal: "identity_auth",
  NotificationSignal: "notifications_pwa",
  ChatSignal: "chat_messaging",
  TaskSignal: "daily_tasks_rewards",
  MediaSignal: "media_storage_access",
  TransactionSignal: "wallet_commerce",
  CreatorMonetizationSignal: "creator_monetization",
  PermissionSignal: "admin_debug_ops",
  ErrorSignal: "admin_debug_ops",
  BackendRouteSignal: "admin_debug_ops",
};

const VALID_SCORE_DIMENSIONS = new Set([
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
]);

export const CENTRAL_NORMALIZER_LEGACY_PATHWAYS: CentralNormalizerLegacyPathway[] = [
  {
    pathwayId: "event-envelope-builder",
    sourceFile: "src/lib/analytics/event-envelope-builder.ts",
    classification: "central_normalizer_adapter",
    reason: "Canonical event envelopes remain source-owned and are invoked by normalizeToEventEnvelope.",
    nextAction: "Keep direct envelope callers migrating through the central normalizer adapter when product limbs add new signals.",
  },
  {
    pathwayId: "behavioral-event-fact-normalizer",
    sourceFile: "src/lib/behavioral/normalize-event-fact.ts",
    classification: "central_normalizer_adapter",
    reason: "Behavioral facts remain source-owned and are invoked by normalizeToEventFact.",
    nextAction: "Keep source event fact behavior stable; do not fork fact math inside product limbs.",
  },
  {
    pathwayId: "person-metrics-hydration",
    sourceFile: "src/lib/analytics/person-metrics-hydration.ts",
    classification: "central_normalizer_adapter",
    reason: "Person/global metric hydration remains source-owned and is invoked by normalizeToMetrics.",
    nextAction: "Keep metric hydration behind the central normalizer metric adapter.",
  },
  {
    pathwayId: "user-journey-builder",
    sourceFile: "src/lib/behavioral/user-journey-builder.ts",
    classification: "central_normalizer_adapter",
    reason: "Journey intelligence remains source-owned and is invoked by normalizeToJourney.",
    nextAction: "Keep journey generation attached to normalized event facts.",
  },
  {
    pathwayId: "sql-database-parity-engine",
    sourceFile: "src/lib/analytics/sql-database-parity-engine.ts",
    classification: "central_normalizer_adapter",
    reason: "Export and SQL parity facts remain source-owned and are invoked by normalizeToExport.",
    nextAction: "Keep SQL/export parity derived from normalized facts only.",
  },
  {
    pathwayId: "debug-backlog-builder",
    sourceFile: "src/lib/debug/debug-backlog-builder.ts",
    classification: "central_normalizer_adapter",
    reason: "Debug lanes stay source-owned while central normalizer emits debug signals for admin summary visibility.",
    nextAction: "Keep admin debug summaries issue-first and drilldown-based.",
  },
  {
    pathwayId: "legacy-event-recovery",
    sourceFile: "src/lib/legacy/legacy-event-recovery-contract.ts",
    classification: "legacy_alias_still_required",
    reason: "Legacy recovery cannot be promoted to exact behavior without source identity and event truth.",
    nextAction: "Keep legacy recovery bucketed as legacy alias until source truth upgrades exist.",
  },
];

function clean(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function numeric(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function nonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function occurredAt(input: ProductSignal): string {
  const timestampMs = numeric(input.when?.timestampMs);
  if (typeof timestampMs === "number") return new Date(timestampMs).toISOString();
  const occurredAtUtc = clean(input.when?.occurredAtUtc);
  if (occurredAtUtc) {
    const parsed = Date.parse(occurredAtUtc);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : occurredAtUtc;
  }
  return new Date(0).toISOString();
}

function timestampMs(input: ProductSignal): number {
  const explicit = numeric(input.when?.timestampMs);
  if (typeof explicit === "number") return explicit;
  const parsed = Date.parse(occurredAt(input));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSource(value: unknown): EventEnvelopeSource {
  const candidate = clean(value);
  if (
    candidate === "client"
    || candidate === "guest_client"
    || candidate === "identified_api_ingest"
    || candidate === "server"
    || candidate === "admin_debug"
    || candidate === "legacy"
    || candidate === "system"
  ) {
    return candidate;
  }
  if (candidate === "materialized" || candidate === "canonical") return "server";
  if (candidate === "local_projection") return "client";
  return "client";
}

function normalizeBehavioralSource(value: unknown): "client" | "server" | "materialized" | "legacy" {
  const candidate = clean(value);
  if (candidate === "server" || candidate === "identified_api_ingest" || candidate === "admin_debug" || candidate === "system") return "server";
  if (candidate === "materialized" || candidate === "canonical") return "materialized";
  if (candidate === "legacy") return "legacy";
  return "client";
}

function normalizeSourceTruth(value: unknown): CentralNormalizerSourceTruth | string {
  return clean(value) || "unknown";
}

function normalizeCostClass(value: unknown): CentralNormalizerCostClass {
  const candidate = clean(value);
  if (
    candidate === "hot_path_summary"
    || candidate === "batched_materializer"
    || candidate === "admin_debug_summary"
    || candidate === "export_batch"
    || candidate === "provider_api_blocked"
    || candidate === "unknown"
  ) {
    return candidate;
  }
  return "unknown";
}

function normalizeScoreDimensions(input: ProductSignal): CentralScoreSignal["dimensions"] {
  const candidates = Array.isArray(input.scoreImpact) ? input.scoreImpact : [];
  const normalized = candidates.filter((dimension): dimension is CentralScoreSignal["dimensions"][number] =>
    VALID_SCORE_DIMENSIONS.has(String(dimension)),
  );
  return normalized.length > 0 ? normalized : ["evidenceCompleteness"];
}

function identityPresent(input: ProductSignal): boolean {
  return Boolean(clean(input.who?.userId) || clean(input.who?.guestId) || clean(input.who?.sessionId));
}

function buildDedupeKey(input: ProductSignal): string {
  const explicit = clean(input.dedupeKey);
  if (explicit) return explicit;
  const sessionId = clean(input.who?.sessionId) || "unknown_session";
  const objectId = clean(input.what?.objectId) || clean(input.what?.dropId) || clean(input.what?.creatorId) || "unknown_object";
  return `${normalizeTelemetryEventName(input.eventName)}:${sessionId}:${objectId}:${timestampMs(input)}`;
}

function requiredFields(input: ProductSignal, bodySystem: BodySystemId | "missing"): CentralNormalizerRequiredFields {
  return {
    who: Boolean(input.who) && identityPresent(input),
    what: Boolean(input.what) && Boolean(clean(input.what?.objectType) || clean(input.what?.objectId) || clean(input.what?.dropId) || clean(input.what?.creatorId)),
    when: Boolean(input.when) && (Boolean(clean(input.when?.occurredAtUtc)) || typeof numeric(input.when?.timestampMs) === "number"),
    where: Boolean(input.where) && Boolean(clean(input.where?.surface) || clean(input.where?.route) || clean(input.surface)),
    how: Boolean(input.how) && Boolean(clean(input.how?.action) || clean(input.how?.source)),
    howLong: Boolean(input.howLong) && (
      typeof numeric(input.howLong?.durationMs) === "number"
      || typeof numeric(input.howLong?.activeMs) === "number"
      || typeof numeric(input.howLong?.passiveMs) === "number"
      || typeof numeric(input.howLong?.idleMs) === "number"
      || typeof numeric(input.howLong?.hiddenMs) === "number"
    ),
    identityState: Boolean(clean(input.identityState)),
    confidence: Boolean(clean(input.confidence)),
    sourceTruth: Boolean(clean(input.sourceTruth)),
    bodySystem: bodySystem !== "missing",
    dedupeKey: Boolean(clean(input.dedupeKey)),
    privacyClass: Boolean(clean(input.privacyClass)),
    costClass: Boolean(clean(input.costClass)),
    debugVisibility: Boolean(clean(input.debugVisibility)),
    scoreImpact: normalizeScoreDimensions(input).length > 0,
  };
}

function missingFieldList(required: CentralNormalizerRequiredFields): string[] {
  return Object.entries(required)
    .filter(([, present]) => !present)
    .map(([field]) => field);
}

function featureIdFor(input: ProductSignal): string {
  const explicit = clean(input.featureId);
  if (explicit) return explicit;
  const metadata = getTelemetryEventExtensionMetadata(input.eventName);
  return metadata?.feature ?? "unregistered";
}

export function routeSignalToBodySystem(input: ProductSignal): BodySystemId | "missing" {
  if (input.bodySystem) return input.bodySystem;
  const featureId = featureIdFor(input);
  const byFeature = getProductBodySystemForFeature(featureId);
  if (byFeature) return byFeature;
  const metadata = getTelemetryEventExtensionMetadata(input.eventName);
  if (metadata?.feature) {
    const metadataSystem = getProductBodySystemForFeature(metadata.feature);
    if (metadataSystem) return metadataSystem;
  }
  return SIGNAL_KIND_BODY_SYSTEMS[input.signalKind] ?? "telemetry_behavioral_intelligence";
}

function envelopeInput(input: ProductSignal, bodySystem: BodySystemId | "missing"): EventEnvelopeInput {
  const eventName = normalizeTelemetryEventName(input.eventName);
  return {
    eventId: clean(input.signalId) || buildDedupeKey(input),
    eventName,
    eventVersion: input.eventVersion ?? 1,
    timestamp: occurredAt(input),
    featureId: featureIdFor(input),
    surface: clean(input.where?.surface) || clean(input.surface) || "unknown",
    actorKind: clean(input.who?.actorKind) || (clean(input.who?.userId) ? "signed_in_user" : "guest"),
    identityState: clean(input.identityState) || (clean(input.who?.userId) ? "logged_in_unlinked" : "guest_unknown_consent"),
    identityConfidence: clean(input.confidence) || "unknown",
    sessionId: clean(input.who?.sessionId) || "unknown_session",
    guestId: clean(input.who?.guestId) || null,
    userId: clean(input.who?.userId) || null,
    linkId: clean(input.who?.linkId) || null,
    source: normalizeSource(input.how?.source ?? input.sourceTruth),
    debugVisibility: clean(input.debugVisibility) || "debug_visible",
    scoreImpact: normalizeScoreDimensions(input).join(","),
    privacyClass: input.privacyClass ?? "unknown",
    metadata: {
      ...(input.metadata ?? {}),
      body_system: bodySystem,
      source_truth: normalizeSourceTruth(input.sourceTruth),
      cost_class: normalizeCostClass(input.costClass),
      route: clean(input.where?.route),
      source_component: clean(input.where?.sourceComponent),
      object_type: clean(input.what?.objectType),
      object_id: clean(input.what?.objectId),
      drop_id: clean(input.what?.dropId),
      creator_id: clean(input.what?.creatorId),
      transaction_id: clean(input.what?.transactionId),
      action: clean(input.how?.action),
      method: clean(input.how?.method),
      reason_code: clean(input.how?.reasonCode),
      duration_ms: numeric(input.howLong?.durationMs),
      active_ms: numeric(input.howLong?.activeMs),
      dedupe_key: buildDedupeKey(input),
    },
  };
}

export function normalizeToEventEnvelope(input: ProductSignal): CanonicalEventEnvelope {
  return buildEventEnvelope(envelopeInput(input, routeSignalToBodySystem(input)));
}

export function normalizeToEventFact(input: ProductSignal, envelope: CanonicalEventEnvelope = normalizeToEventEnvelope(input)): BehavioralEventFact | null {
  const normalized = normalizeBehavioralEventFactWithDiagnostics({
    eventId: envelope.eventId,
    eventName: envelope.eventName,
    timestamp: envelope.timestamp,
    userId: envelope.userRef?.id ?? input.who?.userId ?? null,
    sessionId: envelope.sessionId,
    anonymousVisitorId: envelope.guestId ?? input.who?.guestId ?? null,
    pagePath: input.where?.route ?? input.where?.surface ?? input.surface,
    route: input.where?.route,
    dropId: input.what?.dropId,
    creatorId: input.what?.creatorId,
    source: normalizeBehavioralSource(input.how?.source ?? input.sourceTruth),
    valueUsd: input.what?.valueUsd,
    gumDropsAmount: input.what?.gumDropsAmount,
    confidence: input.confidence === "exact" ? 1 : input.confidence === "linked" ? 0.9 : input.confidence === "inferred" ? 0.7 : input.confidence === "weak" ? 0.4 : 0.2,
    params: {
      ...envelope.metadata,
      source_component: input.where?.sourceComponent,
      entity_type: input.what?.objectType,
      entity_id: input.what?.objectId,
      file_id: input.what?.fileId,
      transaction_id: input.what?.transactionId,
      duration_ms: input.howLong?.durationMs,
      active_ms: input.howLong?.activeMs,
      reason_code: input.how?.reasonCode,
      auth_state: input.identityState,
      dedupe_key: buildDedupeKey(input),
    },
  });
  return normalized.fact;
}

export function normalizeToMetrics(
  input: ProductSignal,
  envelope: CanonicalEventEnvelope = normalizeToEventEnvelope(input),
  fact: BehavioralEventFact | null = normalizeToEventFact(input, envelope),
): {
  globalMetricFact: CentralMetricFact | null;
  userMetricFact: CentralMetricFact | null;
  personMetricsReport: PersonMetricsHydrationReport;
} {
  const report = hydratePersonMetrics({ envelopes: [envelope], generatedAtUtc: occurredAt(input) });
  const bodySystem = routeSignalToBodySystem(input);
  const metricIds = Object.values(report.metricStatus)
    .filter((metric) => metric.count > 0 || metric.hydratedEventIds.includes(envelope.eventId))
    .map((metric) => metric.metricId);
  const base = fact && bodySystem !== "missing"
    ? {
      metricIds,
      bodySystem,
      sourceEventId: fact.eventId,
      dedupeKey: fact.dedupeKey,
      confidence: input.confidence ?? "unknown",
      sourceTruth: normalizeSourceTruth(input.sourceTruth),
    }
    : null;
  return {
    globalMetricFact: base ? { ...base, metricScope: "global" } : null,
    userMetricFact: base ? { ...base, metricScope: "user" } : null,
    personMetricsReport: report,
  };
}

export function normalizeToJourney(input: ProductSignal, fact: BehavioralEventFact | null = normalizeToEventFact(input)): UserJourneyEvent | null {
  if (!fact) return null;
  try {
    const journey = buildJourneyEvent({ fact });
    return {
      ...journey,
      journeyEventId: journey.journeyEventId.includes(fact.normalizedAction)
        ? journey.journeyEventId
        : `${journey.journeyEventId}:${fact.normalizedAction}`,
    };
  } catch {
    return null;
  }
}

export function normalizeToDebug(
  input: ProductSignal,
  context: {
    envelope?: CanonicalEventEnvelope | null;
    fact?: BehavioralEventFact | null;
    bodySystem?: BodySystemId | "missing";
    failures?: string[];
  } = {},
): CentralDebugSignal {
  const bodySystem = context.bodySystem ?? routeSignalToBodySystem(input);
  const required = requiredFields(input, bodySystem);
  const failures = context.failures ?? [];
  return {
    laneId: "central_normalizer",
    label: "Central normalizer",
    status: failures.length > 0 ? "failed" : "normalized",
    bodySystem,
    eventName: normalizeTelemetryEventName(input.eventName),
    missingFields: missingFieldList(required),
    normalizationFailures: failures,
    debugVisibility: clean(input.debugVisibility) || context.envelope?.debugVisibility || "debug_visible",
    scoreImpact: normalizeScoreDimensions(input),
    sourceOfTruth: "src/lib/product-integrity/central-normalizer.ts",
  };
}

export function normalizeToScore(input: ProductSignal, bodySystem: BodySystemId | "missing" = routeSignalToBodySystem(input)): CentralScoreSignal {
  const dimensions = normalizeScoreDimensions(input);
  const missingIdentity = !identityPresent(input);
  const missingBodySystem = bodySystem === "missing";
  return {
    canFeedScore: !missingIdentity && !missingBodySystem,
    dimensions,
    bodySystem,
    blockerType: missingBodySystem ? "missing_body_system" : missingIdentity ? "missing_identity" : "none",
    scoreImpact: dimensions,
  };
}

export function normalizeToExport(fact: BehavioralEventFact | null, journey: UserJourneyEvent | null = null): CentralExportFact | null {
  if (!fact) return null;
  return {
    exportRowKind: "event_fact",
    row: mapEventFactToSqlRow(fact),
    globalSummary: mapEventFactToGlobalSummary(fact),
    userSummary: mapEventFactToUserSummary(fact),
    journeyExport: journey ? mapJourneyToExport(journey) : null,
  };
}

function normalizeToCost(input: ProductSignal): CentralCostSignal {
  const costClass = normalizeCostClass(input.costClass);
  const costLane = estimateCostLane({ operation: costClass === "export_batch" ? "bigquery_export" : "hot_path_write" });
  return {
    costClass,
    costGuard: costClass === "provider_api_blocked" ? "provider_call_blocked" : costLane.costGuard,
    providerCallRequired: false,
    nextAction: costClass === "provider_api_blocked"
      ? "Keep provider calls blocked from normalizer validators and source-only reports."
      : costLane.nextAction,
  };
}

function normalizationFailures(
  input: ProductSignal,
  bodySystem: BodySystemId | "missing",
  envelope: CanonicalEventEnvelope,
  fact: BehavioralEventFact | null,
): string[] {
  const failures: string[] = [];
  if (bodySystem === "missing") failures.push("missing_body_system");
  if (!identityPresent(input)) failures.push("missing_identity");
  if (!clean(input.dedupeKey)) failures.push("missing_dedupeKey");
  if (envelope.pipelineStatus === "quarantined") failures.push("event_envelope_quarantined");
  if (!fact) failures.push("normalized_event_fact_missing");
  return failures;
}

export function normalizeProductSignal(input: ProductSignal): CentralNormalizerOutput {
  const bodySystem = routeSignalToBodySystem(input);
  const envelope = normalizeToEventEnvelope(input);
  const fact = normalizeToEventFact(input, envelope);
  const failures = normalizationFailures(input, bodySystem, envelope, fact);
  const journey = normalizeToJourney(input, fact);
  const metrics = normalizeToMetrics(input, envelope, fact);
  const debugSignal = normalizeToDebug(input, { envelope, fact, bodySystem, failures });
  const scoreSignal = normalizeToScore(input, bodySystem);

  return {
    status: failures.length > 0 ? "failed" : "normalized",
    signalKind: input.signalKind,
    eventName: envelope.eventName,
    bodySystem,
    requiredFields: requiredFields(input, bodySystem),
    normalizationFailures: failures,
    canonicalEventEnvelope: envelope,
    normalizedEventFact: fact,
    globalMetricFact: metrics.globalMetricFact,
    userMetricFact: metrics.userMetricFact,
    journeyEvent: journey,
    debugSignal,
    scoreSignal: failures.length > 0 ? { ...scoreSignal, canFeedScore: false, blockerType: scoreSignal.blockerType === "none" ? "normalization_failure" : scoreSignal.blockerType } : scoreSignal,
    exportFact: normalizeToExport(fact, journey),
    costSignal: normalizeToCost(input),
  };
}

export function explainNormalizationFailure(input: ProductSignal | CentralNormalizerOutput): string {
  const output = "normalizationFailures" in input ? input : normalizeProductSignal(input);
  if (output.normalizationFailures.length === 0) {
    return `${output.eventName} normalized through ${output.bodySystem}.`;
  }
  return `${output.eventName} normalization failed: ${output.normalizationFailures.join(", ")}.`;
}

export function validateCentralNormalizerOutput(output: CentralNormalizerOutput): string[] {
  const failures: string[] = [];
  const validation = validateEventEnvelope(output.canonicalEventEnvelope);
  if (!validation.ok) failures.push(...validation.findings.map((finding) => `event_envelope:${finding}`));
  for (const [field, present] of Object.entries(output.requiredFields)) {
    if (!present && field !== "howLong") failures.push(`missing_required_field:${field}`);
  }
  if (output.bodySystem === "missing") failures.push("missing_body_system");
  if (!output.canonicalEventEnvelope.identityConfidence) failures.push("missing_identity_confidence");
  if (!output.canonicalEventEnvelope.eventId) failures.push("missing_dedupe_key");
  if (!output.debugSignal || output.debugSignal.laneId !== "central_normalizer") failures.push("missing_debug_signal");
  if (!output.scoreSignal || output.scoreSignal.dimensions.length === 0) failures.push("missing_score_signal");
  if (output.status === "normalized") {
    for (const key of ["normalizedEventFact", "globalMetricFact", "userMetricFact", "journeyEvent", "exportFact"] as const) {
      if (!output[key]) failures.push(`missing_output:${key}`);
    }
  }
  return failures;
}

export function buildCentralNormalizerDebugLane(outputs: readonly CentralNormalizerOutput[] = []): CentralNormalizerDebugLane {
  const legacyAliasCount = CENTRAL_NORMALIZER_LEGACY_PATHWAYS.filter((pathway) => pathway.classification === "legacy_alias_still_required").length;
  const unsafeUnknownCount = CENTRAL_NORMALIZER_LEGACY_PATHWAYS.filter((pathway) => pathway.classification === "unsafe_unknown").length;
  return {
    label: "Central normalizer",
    signalsReceived: outputs.length,
    normalizedSuccessfully: outputs.filter((output) => output.status === "normalized").length,
    failedNormalization: outputs.filter((output) => output.status === "failed").length,
    missingBodySystem: outputs.filter((output) => output.bodySystem === "missing" || output.normalizationFailures.includes("missing_body_system")).length,
    missingIdentity: outputs.filter((output) => output.normalizationFailures.includes("missing_identity")).length,
    missingMetricRoute: outputs.filter((output) => !output.globalMetricFact || !output.userMetricFact).length,
    missingDebugRoute: outputs.filter((output) => !output.debugSignal).length,
    missingExportRoute: outputs.filter((output) => !output.exportFact).length,
    legacyAliasCount,
    unsafeUnknownCount,
    defaultView: "issues_only",
    rawCatalogDefaultOpen: false,
    sourceOfTruth: "src/lib/product-integrity/central-normalizer.ts",
  };
}

export function classifyCentralNormalizerDirtyFile(path: string): CentralNormalizerDirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/state/central-normalizer-spine.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/final-product-integrity-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/interpretive-brain-debug-triage.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/product-body-map.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/body-system-wiring-repair.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-translation-bridge.generated.json") {
    return "stale_generated_artifact_to_regenerate";
  }
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "docs/agent-truth/central-normalizer-spine.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/final-product-integrity-lock.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/interpretive-brain-debug-triage.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/product-body-map.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/body-system-wiring-repair.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") {
    return "stale_generated_artifact_to_regenerate";
  }
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) {
    return "stale_generated_artifact_to_regenerate";
  }
  if (normalized.startsWith("docs/agent-truth/")) {
    return "stale_generated_artifact_to_regenerate";
  }
  if (normalized === "scripts/agent/validate-central-normalizer-spine.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-product-integrity-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-interpretive-brain-debug-triage.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-body-system-wiring-repair.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/central-normalizer-spine.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/final-product-integrity-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/interpretive-brain-debug-triage.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/body-system-wiring-repair.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/product-integrity/central-normalizer.ts" || normalized === "src/lib/product-integrity/central-normalizer-contract.ts") {
    return "real_source_change_needs_review";
  }
  if (normalized === "src/lib/product-integrity/final-product-integrity-lock.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/body-system-wiring-repair.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/interpretive-brain.ts" || normalized === "src/lib/product-integrity/interpretive-brain-contract.ts") {
    return "real_source_change_needs_review";
  }
  if (normalized === "src/lib/analytics/event-translation-bridge.ts" || normalized === "src/lib/analytics/person-metrics-hydration.ts") {
    return "real_source_change_needs_review";
  }
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts" || normalized === "src/lib/product-integrity/product-body-map.ts") {
    return "real_source_change_needs_review";
  }
  if (normalized === "package.json") return "validator_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) {
    return "release_artifact_expected";
  }
  if (normalized.includes("wallet") || normalized.includes("paypal") || normalized.includes("gumdrop-ledger") || normalized.includes("Navbar") || normalized.includes("BottomNav")) {
    return "unsafe_unknown";
  }
  return "unsafe_unknown";
}

export function classifyCentralNormalizerOpenPullRequest(input: { number: number; title: string; url: string; mergeStateStatus?: string; isDraft?: boolean }): CentralNormalizerOpenPullRequest {
  const title = input.title.toLowerCase();
  let classification = "external_review_required";
  if (title.includes("depend") || title.includes("knip") || title.includes("syncpack") || title.includes("npm") || title.includes("puppeteer")) {
    classification = "dependency_update_external_review_required";
  } else if (title.includes("math.random") || title.includes("security")) {
    classification = "security_patch_external_review_required";
  } else if (title.includes("palette") || title.includes("loading")) {
    classification = "accessibility_patch_external_review_required";
  } else if (title.includes("map lookup") || title.includes("debug route")) {
    classification = "performance_patch_external_review_required";
  } else if (title.includes("doctrine")) {
    classification = "doctrine_governance_external_review_required";
  } else if (title.includes("monolith")) {
    classification = "architecture_refactor_external_review_required";
  } else if (title.includes("onboarding")) {
    classification = "onboarding_telemetry_external_review_required";
  }
  return { ...input, classification };
}

export function buildCentralNormalizerSpineReport(input: {
  sample: CentralNormalizerOutput;
  currentHead?: string;
  dirtyFiles?: readonly string[];
  openPullRequests?: ReadonlyArray<{ number: number; title: string; url: string; mergeStateStatus?: string; isDraft?: boolean }>;
  generatedAtUtc?: string;
}): CentralNormalizerSpineReport {
  const dirtyFiles: CentralNormalizerDirtyFile[] = (input.dirtyFiles ?? []).map((path) => ({
    path,
    classification: classifyCentralNormalizerDirtyFile(path),
  }));
  const openPullRequests = (input.openPullRequests ?? []).map(classifyCentralNormalizerOpenPullRequest);
  const sampleFailures = validateCentralNormalizerOutput(input.sample);
  const unsafePathways = CENTRAL_NORMALIZER_LEGACY_PATHWAYS.filter((pathway) => pathway.classification === "unsafe_unknown");
  const unsafeDirty = dirtyFiles.filter((file) => file.classification === "unsafe_unknown");
  const validationFailures = [
    ...sampleFailures,
    ...unsafePathways.map((pathway) => `${pathway.pathwayId} remains unsafe_unknown.`),
    ...unsafeDirty.map((file) => `${file.path} is unsafe_unknown.`),
  ];

  return {
    reportKey: "central-normalizer-spine",
    contractVersion: CENTRAL_NORMALIZER_CONTRACT_VERSION,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: validationFailures.length === 0 ? "pass" : "fail",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    signalKindsCovered: [
      "RawProductSignal",
      "SurfaceStateSignal",
      "UserActionSignal",
      "BackendRouteSignal",
      "LifecycleSignal",
      "ErrorSignal",
      "PermissionSignal",
      "TransactionSignal",
      "MediaSignal",
      "AuthSignal",
      "NotificationSignal",
      "ChatSignal",
      "TaskSignal",
      "CreatorMonetizationSignal",
    ],
    outputChannelsCovered: [
      "canonicalEventEnvelope",
      "normalizedEventFact",
      "globalMetricFact",
      "userMetricFact",
      "journeyEvent",
      "debugSignal",
      "scoreSignal",
      "exportFact",
      "costSignal",
    ],
    sampleStatus: input.sample.status,
    sampleBodySystem: input.sample.bodySystem,
    adaptersConnected: CENTRAL_NORMALIZER_LEGACY_PATHWAYS
      .filter((pathway) => pathway.classification === "central_normalizer_adapter")
      .map((pathway) => pathway.pathwayId),
    legacyPathways: CENTRAL_NORMALIZER_LEGACY_PATHWAYS,
    debugLane: buildCentralNormalizerDebugLane([input.sample]),
    scoreDimensions: input.sample.scoreSignal.dimensions,
    dirtyFiles,
    openPullRequests,
    remainingGaps: unsafePathways.length > 0 ? ["Unsafe normalizer pathway classification remains."] : [],
    nextExactSteps: [
      "Route new product limbs through normalizeProductSignal or document an exemption.",
      "Keep legacy direct pathways classified until their adapters are fully adopted.",
      "Do not promote source-only normalizer evidence into runtime/provider beta gates.",
    ],
    validationFailures,
  };
}
