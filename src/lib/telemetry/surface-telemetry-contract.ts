import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

import {
  SURFACE_TELEMETRY_CATALOG_EVENT_KINDS,
  type SurfaceTelemetryCatalogEventKind,
} from "./surface-telemetry-catalog-events";

export const SURFACE_TELEMETRY_EVENT_SPINE = SURFACE_TELEMETRY_CATALOG_EVENT_KINDS;

export type SurfaceTelemetryEventKind = SurfaceTelemetryCatalogEventKind;

export type SurfaceTelemetryLegacyStatus =
  | "canonical"
  | "legacy_alias"
  | "retired"
  | "unsafe_unknown";

export type SurfaceTelemetryCostPriority = "low" | "medium" | "high";

export type SurfaceTelemetryConsentRequirement =
  | "required_integrity"
  | "minimal_analytics"
  | "full_analytics"
  | "full_behavioral";

export type SurfaceTelemetryIdentityRequirement =
  | "none"
  | "anonymous_or_user"
  | "authenticated_user"
  | "creator_or_user"
  | "admin_required"
  | "system";

export type SurfaceTelemetryDebugVisibility = "debug_visible" | "debug_only" | "hidden";

export interface SurfaceTelemetryEnvelopeRequirements {
  surface: string;
  featureId: string;
  eventType: "impression" | "intent" | "interaction" | "conversion" | "system";
  consentRequirement: SurfaceTelemetryConsentRequirement;
  identityRequirement: SurfaceTelemetryIdentityRequirement;
  materializerLane: string;
  debugVisibility: SurfaceTelemetryDebugVisibility;
  scoreEvidenceImpact: string;
  privacyClass: "required_integrity" | "minimal_product" | "behavioral" | "admin_debug" | "system";
}

export interface SurfaceTelemetryEventDefinition {
  kind: SurfaceTelemetryEventKind;
  eventName: string;
  legacyAliases: string[];
  legacyStatus: SurfaceTelemetryLegacyStatus;
  envelope: SurfaceTelemetryEnvelopeRequirements;
  debugLane: "Surface telemetry parity";
  scoreDimensions: PublicBetaHealthDimension[];
  costPriority: SurfaceTelemetryCostPriority;
  highFrequency: boolean;
  throttleMs: number | null;
  requiresSafeErrorCode: boolean;
  treatAsSystemFailure: boolean;
}

export interface SurfaceTelemetrySurfaceRegistration {
  surfaceId: string;
  surfaceOwner: string;
  featureId: string;
  events: Record<SurfaceTelemetryEventKind, SurfaceTelemetryEventDefinition>;
  majorActionTriplet: {
    attempted: string;
    succeeded: string;
    failed: string;
  };
  debugLane: "Surface telemetry parity";
  scoreDimensionImpact: {
    before: string;
    after: string;
    dimensions: PublicBetaHealthDimension[];
  };
}

export interface SurfaceTelemetryOldEventNameClassification {
  eventName: string;
  canonicalEventName: string;
  surfaceId: string;
  status: SurfaceTelemetryLegacyStatus;
  reason: string;
}

export type SurfaceTelemetryDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_surface_telemetry_logic_to_remove"
  | "duplicate_telemetry_validator_to_retire"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "documentation_artifact_expected"
  | "unsafe_unknown";

export interface SurfaceTelemetryDirtyFile {
  path: string;
  classification: SurfaceTelemetryDirtyClassification;
}

export interface SurfaceTelemetryParityReport {
  reportKey: "surface-telemetry-parity";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  fakeEventsUsed: false;
  highFrequencyEventsAdded: boolean;
  majorSurfacesRegistered: number;
  canonicalEventKinds: SurfaceTelemetryEventKind[];
  catalogEventsRegistered: number;
  eventEnvelopeMappings: number;
  actionTripletsRegistered: number;
  debugLane: {
    label: "Surface telemetry parity";
    groupedMissingSurfaceEvents: Record<string, string[]>;
    eventsDebugVisible: number;
  };
  scoreDimensionBeforeAfter: {
    before: string;
    after: string;
    dimensions: PublicBetaHealthDimension[];
  };
  surfaceScoreDimensionBeforeAfter: Record<string, SurfaceTelemetrySurfaceRegistration["scoreDimensionImpact"]>;
  oldEventNameClassification: SurfaceTelemetryOldEventNameClassification[];
  dirtyFiles: SurfaceTelemetryDirtyFile[];
  validationFailures: string[];
}

const FAILURE_EVENT_KINDS: SurfaceTelemetryEventKind[] = [
  "surface_error_viewed",
  "surface_action_failed",
  "surface_permission_denied",
  "surface_not_configured_viewed",
];

function hasEverySpineEvent(surface: SurfaceTelemetrySurfaceRegistration) {
  return SURFACE_TELEMETRY_EVENT_SPINE.every((kind) => Boolean(surface.events[kind]));
}

export function isSurfaceTelemetryFailureKind(kind: SurfaceTelemetryEventKind) {
  return FAILURE_EVENT_KINDS.includes(kind);
}

export function validateSurfaceTelemetryRegistry(registry: readonly SurfaceTelemetrySurfaceRegistration[]) {
  const failures: string[] = [];
  const seenEventNames = new Set<string>();

  for (const surface of registry) {
    if (!surface.surfaceId) failures.push("surface telemetry entry missing surfaceId.");
    if (!surface.featureId) failures.push(`${surface.surfaceId} missing featureId.`);
    if (!hasEverySpineEvent(surface)) failures.push(`${surface.surfaceId} missing canonical surface event spine.`);
    if (!surface.scoreDimensionImpact.before || !surface.scoreDimensionImpact.after || surface.scoreDimensionImpact.dimensions.length === 0) {
      failures.push(`${surface.surfaceId} missing score dimension before/after evidence.`);
    }

    for (const kind of SURFACE_TELEMETRY_EVENT_SPINE) {
      const definition = surface.events[kind];
      if (!definition) continue;
      if (seenEventNames.has(definition.eventName)) failures.push(`${definition.eventName} duplicates another surface telemetry event.`);
      seenEventNames.add(definition.eventName);
      if (definition.eventName !== `${surface.surfaceId}_${kind}`) {
        failures.push(`${definition.eventName} does not follow the ${surface.surfaceId}_${kind} pattern.`);
      }
      if (definition.envelope.surface !== surface.surfaceId) failures.push(`${definition.eventName} has wrong envelope surface.`);
      if (definition.envelope.featureId !== surface.featureId) failures.push(`${definition.eventName} has wrong envelope featureId.`);
      if (!definition.envelope.materializerLane) failures.push(`${definition.eventName} missing materializer lane.`);
      if (definition.envelope.debugVisibility !== "debug_visible") failures.push(`${definition.eventName} missing debug visibility.`);
      if (!definition.envelope.scoreEvidenceImpact) failures.push(`${definition.eventName} missing score evidence impact.`);
      if (definition.highFrequency && !definition.throttleMs) failures.push(`${definition.eventName} is high-frequency without throttle.`);
      if (definition.highFrequency) failures.push(`${definition.eventName} adds high-frequency telemetry to the surface spine.`);
      if (isSurfaceTelemetryFailureKind(kind) && !definition.requiresSafeErrorCode) {
        failures.push(`${definition.eventName} missing safe error code requirement.`);
      }
      if ((kind === "surface_permission_denied" || kind === "surface_not_configured_viewed") && definition.treatAsSystemFailure) {
        failures.push(`${definition.eventName} incorrectly treats expected state as system failure.`);
      }
      if (definition.legacyStatus === "unsafe_unknown") failures.push(`${definition.eventName} has unsafe unknown legacy status.`);
    }

    if (
      surface.majorActionTriplet.attempted !== surface.events.surface_action_attempted.eventName
      || surface.majorActionTriplet.succeeded !== surface.events.surface_action_succeeded.eventName
      || surface.majorActionTriplet.failed !== surface.events.surface_action_failed.eventName
    ) {
      failures.push(`${surface.surfaceId} action triplet does not map to attempted/succeeded/failed spine events.`);
    }
  }

  return failures;
}
