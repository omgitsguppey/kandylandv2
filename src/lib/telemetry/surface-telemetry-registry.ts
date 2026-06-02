import { SURFACE_PARITY_REGISTRY } from "@/lib/parity/surface-parity-registry";
import type { SurfaceParityContract } from "@/lib/parity/surface-parity-contract";

import {
  SURFACE_TELEMETRY_EVENT_SPINE,
  isSurfaceTelemetryFailureKind,
  type SurfaceTelemetryDirtyClassification,
  type SurfaceTelemetryEventDefinition,
  type SurfaceTelemetryEventKind,
  type SurfaceTelemetryParityReport,
  type SurfaceTelemetrySurfaceRegistration,
  validateSurfaceTelemetryRegistry,
} from "./surface-telemetry-contract";
import {
  SURFACE_TELEMETRY_CATALOG_EVENT_OPTIONS,
  getSurfaceTelemetryCatalogEventOverride,
  type SurfaceTelemetryCatalogEventOption,
} from "./surface-telemetry-catalog-events";

const SURFACE_TELEMETRY_EVENT_OPTIONS_BY_NAME = Object.fromEntries(
  SURFACE_TELEMETRY_CATALOG_EVENT_OPTIONS.map((event) => [event.eventName, event]),
) as Record<string, SurfaceTelemetryCatalogEventOption>;

function eventTypeFor(kind: SurfaceTelemetryEventKind): SurfaceTelemetryEventDefinition["envelope"]["eventType"] {
  if (kind === "surface_viewed" || kind === "surface_loaded" || kind.endsWith("_viewed")) return "impression";
  if (kind === "surface_action_attempted") return "intent";
  if (kind === "surface_action_succeeded") return "conversion";
  if (kind === "surface_action_failed" || kind === "surface_error_viewed") return "system";
  return "interaction";
}

function consentFor(surface: SurfaceParityContract): SurfaceTelemetryEventDefinition["envelope"]["consentRequirement"] {
  if (surface.surfaceId === "wallet_purchase_modal" || surface.featureId === "auth_identity") return "required_integrity";
  if (surface.surfaceOwner.startsWith("admin") || surface.featureId === "admin_debug") return "full_analytics";
  return "minimal_analytics";
}

function identityFor(surface: SurfaceParityContract): SurfaceTelemetryEventDefinition["envelope"]["identityRequirement"] {
  if (surface.rolePermissionStatus === "admin_only" || surface.featureId === "admin_debug") return "admin_required";
  if (surface.rolePermissionStatus === "guest_allowed" || surface.roleVisibility.guest === "visible" || surface.roleVisibility.guest === "readonly") {
    return "anonymous_or_user";
  }
  if (surface.surfaceOwner.startsWith("creator")) return "creator_or_user";
  return "authenticated_user";
}

function privacyFor(surface: SurfaceParityContract): SurfaceTelemetryEventDefinition["envelope"]["privacyClass"] {
  if (surface.featureId === "admin_debug") return "admin_debug";
  if (surface.surfaceId === "wallet_purchase_modal" || surface.featureId === "auth_identity") return "required_integrity";
  return "minimal_product";
}

function costPriorityFor(surface: SurfaceParityContract): SurfaceTelemetryEventDefinition["costPriority"] {
  if (surface.featureId === "admin_debug" || surface.surfaceId === "wallet_purchase_modal") return "medium";
  return "low";
}

function definitionFor(surface: SurfaceParityContract, kind: SurfaceTelemetryEventKind): SurfaceTelemetryEventDefinition {
  const eventName = `${surface.surfaceId}_${kind}`;
  const option = SURFACE_TELEMETRY_EVENT_OPTIONS_BY_NAME[eventName];
  const override = getSurfaceTelemetryCatalogEventOverride(eventName);
  return {
    kind,
    eventName,
    legacyAliases: option?.aliases ?? [],
    legacyStatus: "canonical",
    envelope: {
      surface: surface.surfaceId,
      featureId: surface.featureId,
      eventType: eventTypeFor(kind),
      consentRequirement: consentFor(surface),
      identityRequirement: identityFor(surface),
      materializerLane: override?.materializerLane ?? `${surface.surfaceId}_surface_telemetry`,
      debugVisibility: "debug_visible",
      scoreEvidenceImpact: override?.scoreEvidenceImpact ?? "surface_telemetry_parity",
      privacyClass: privacyFor(surface),
    },
    debugLane: "Surface telemetry parity",
    scoreDimensions: [...surface.scoreDimensionImpact.dimensions],
    costPriority: costPriorityFor(surface),
    highFrequency: false,
    throttleMs: null,
    requiresSafeErrorCode: isSurfaceTelemetryFailureKind(kind),
    treatAsSystemFailure: kind === "surface_action_failed" || kind === "surface_error_viewed",
  };
}

function buildSurfaceRegistration(surface: SurfaceParityContract): SurfaceTelemetrySurfaceRegistration {
  const events = Object.fromEntries(
    SURFACE_TELEMETRY_EVENT_SPINE.map((kind) => [kind, definitionFor(surface, kind)]),
  ) as SurfaceTelemetrySurfaceRegistration["events"];
  return {
    surfaceId: surface.surfaceId,
    surfaceOwner: surface.surfaceOwner,
    featureId: surface.featureId,
    events,
    majorActionTriplet: {
      attempted: events.surface_action_attempted.eventName,
      succeeded: events.surface_action_succeeded.eventName,
      failed: events.surface_action_failed.eventName,
    },
    debugLane: "Surface telemetry parity",
    scoreDimensionImpact: {
      before: `Before parity cleanup, ${surface.surfaceId} telemetry used surface-specific event names and did not guarantee the full state/action spine.`,
      after: `${surface.surfaceId} now declares viewed, loaded, state, permission, configuration, and action triplet events through the canonical surface telemetry spine.`,
      dimensions: [...surface.scoreDimensionImpact.dimensions],
    },
  };
}

export const SURFACE_TELEMETRY_REGISTRY: SurfaceTelemetrySurfaceRegistration[] =
  SURFACE_PARITY_REGISTRY.map(buildSurfaceRegistration);

export const SURFACE_TELEMETRY_EVENTS_BY_NAME = Object.fromEntries(
  SURFACE_TELEMETRY_REGISTRY.flatMap((surface) =>
    Object.values(surface.events).map((event) => [event.eventName, event]),
  ),
) as Record<string, SurfaceTelemetryEventDefinition>;

export function getSurfaceTelemetryEventDefinitionByName(eventName: string) {
  return SURFACE_TELEMETRY_EVENTS_BY_NAME[eventName] ?? null;
}

export function listSurfaceTelemetryCatalogEvents() {
  return [...SURFACE_TELEMETRY_CATALOG_EVENT_OPTIONS];
}

export function classifySurfaceTelemetryDirtyFile(path: string): SurfaceTelemetryDirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/surface-telemetry-parity.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/frontend-telemetry-consolidation.generated.json") return "current_generated_artifact_to_commit";
  if (
    normalized === "agent/state/event-translation-bridge.generated.json"
    || normalized === "agent/state/person-metrics-hydration.generated.json"
    || normalized === "agent/state/feature-registration-gate.generated.json"
    || normalized === "agent/state/public-beta-score.generated.json"
  ) return "current_generated_artifact_to_commit";
  if (
    normalized === "docs/agent-truth/event-translation-bridge.md"
    || normalized === "docs/agent-truth/person-metrics-hydration.md"
    || normalized === "docs/agent-truth/feature-registration-gate.md"
  ) return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/frontend-telemetry-consolidation.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/surface-parity-doctrine.generated.json") return "stale_generated_artifact_to_regenerate";
  if (normalized === "docs/agent-truth/surface-telemetry-parity.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/surface-parity-doctrine.md") return "stale_generated_artifact_to_regenerate";
  if (normalized === "scripts/agent/validate-surface-telemetry-parity.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/surface-telemetry-parity.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/surface-state-parity.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/home-hero.spec.tsx") return "test_artifact_expected";
  if (normalized === "tests/unit/creator-discovery-rail.spec.tsx") return "test_artifact_expected";
  if (normalized === "README.md") return "documentation_artifact_expected";
  if (
    normalized === "src/components/Hero.tsx"
    || normalized === "src/components/Landing/HomeHeroActions.tsx"
    || normalized === "src/components/Landing/HomeHeroTelemetry.tsx"
    || normalized === "src/components/CreatorDiscoveryRail.tsx"
  ) return "real_source_change_needs_review";
  if (/^src\/lib\/telemetry\/surface-telemetry-(catalog-events|contract|registry)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/parity/surface-state-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts" || normalized === "src/lib/analytics/event-envelope-builder.ts" || normalized === "src/lib/analytics/event-translation-bridge.ts" || normalized === "src/lib/analytics/person-metrics-hydration.ts") {
    return "real_source_change_needs_review";
  }
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/telemetry.*parity|surface.*telemetry/u.test(normalized)) return "stale_surface_telemetry_logic_to_remove";
  return "unsafe_unknown";
}

function classifyOldEventNames(registry: readonly SurfaceTelemetrySurfaceRegistration[]) {
  return registry.flatMap((surface) =>
    Object.values(surface.events).flatMap((event) =>
      event.legacyAliases.map((alias) => ({
        eventName: alias,
        canonicalEventName: event.eventName,
        surfaceId: surface.surfaceId,
        status: "legacy_alias" as const,
        reason: `${alias} remains accepted as a legacy alias for ${event.eventName}; new parity work should use the canonical surface spine name.`,
      })),
    ),
  );
}

export function buildSurfaceTelemetryParityReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: readonly string[];
  registry?: readonly SurfaceTelemetrySurfaceRegistration[];
} = {}): SurfaceTelemetryParityReport {
  const registry = [...(input.registry ?? SURFACE_TELEMETRY_REGISTRY)];
  const validationFailures = [
    ...validateSurfaceTelemetryRegistry(registry),
    ...(input.dirtyFiles ?? [])
      .map((path) => ({ path, classification: classifySurfaceTelemetryDirtyFile(path) }))
      .filter((file) => file.classification === "unsafe_unknown")
      .map((file) => `${file.path} is unclassified for surface telemetry parity.`),
  ];
  const groupedMissingSurfaceEvents = Object.fromEntries(
    registry.map((surface) => [
      surface.surfaceId,
      SURFACE_TELEMETRY_EVENT_SPINE
        .filter((kind) => !surface.events[kind])
        .map((kind) => `${surface.surfaceId}_${kind}`),
    ]).filter(([, missing]) => (missing as string[]).length > 0),
  ) as Record<string, string[]>;
  const highFrequencyEventsAdded = registry.some((surface) =>
    Object.values(surface.events).some((event) => event.highFrequency),
  );

  return {
    reportKey: "surface-telemetry-parity",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: validationFailures.length > 0 ? "fail" : "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    fakeEventsUsed: false,
    highFrequencyEventsAdded,
    majorSurfacesRegistered: registry.length,
    canonicalEventKinds: [...SURFACE_TELEMETRY_EVENT_SPINE],
    catalogEventsRegistered: SURFACE_TELEMETRY_CATALOG_EVENT_OPTIONS.length,
    eventEnvelopeMappings: registry.reduce((total, surface) => total + Object.keys(surface.events).length, 0),
    actionTripletsRegistered: registry.length,
    debugLane: {
      label: "Surface telemetry parity",
      groupedMissingSurfaceEvents,
      eventsDebugVisible: registry.reduce((total, surface) =>
        total + Object.values(surface.events).filter((event) => event.envelope.debugVisibility === "debug_visible").length, 0),
    },
    scoreDimensionBeforeAfter: {
      before: "Major surfaces had telemetry names, states, and action outcomes registered unevenly across feature-specific validators.",
      after: "All major surfaces share one viewed/loaded/state/action/permission/not-configured event spine mapped into the canonical envelope and debug lane.",
      dimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"],
    },
    surfaceScoreDimensionBeforeAfter: Object.fromEntries(
      registry.map((surface) => [surface.surfaceId, surface.scoreDimensionImpact]),
    ) as SurfaceTelemetryParityReport["surfaceScoreDimensionBeforeAfter"],
    oldEventNameClassification: classifyOldEventNames(registry),
    dirtyFiles: [...(input.dirtyFiles ?? [])].map((path) => ({
      path,
      classification: classifySurfaceTelemetryDirtyFile(path),
    })),
    validationFailures,
  };
}
