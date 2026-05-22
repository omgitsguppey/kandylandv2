import { TELEMETRY_EVENT_EXTENSION_METADATA } from "@/lib/telemetry-catalog";
import { EVENT_ENVELOPE_REQUIRED_FIELDS, EVENT_ENVELOPE_CONTRACT_VERSION } from "@/lib/analytics/event-envelope-contract";

export function buildEventEnvelopeDebugSummary() {
  const missingEnvelopeFieldsByFeature = new Map<string, Set<string>>();

  for (const metadata of TELEMETRY_EVENT_EXTENSION_METADATA) {
    const missing = new Set<string>();
    if (!metadata.feature) missing.add("featureId");
    if (!metadata.surface) missing.add("surface");
    if (!metadata.materializerLane) missing.add("materializerLane");
    if (!metadata.debugVisibility) missing.add("debugVisibility");
    if (!metadata.scoreEvidenceImpact) missing.add("scoreImpact");
    if (!metadata.consentRequirement) missing.add("consentMode");

    if (missing.size > 0) {
      const featureMissing = missingEnvelopeFieldsByFeature.get(metadata.feature) ?? new Set<string>();
      missing.forEach((field) => featureMissing.add(field));
      missingEnvelopeFieldsByFeature.set(metadata.feature, featureMissing);
    }
  }

  return {
    lane: "Event envelope",
    contractVersion: EVENT_ENVELOPE_CONTRACT_VERSION,
    status: missingEnvelopeFieldsByFeature.size === 0 ? "live" : "degraded",
    sourceState: "source",
    currentIdentityAwareEnvelope: true,
    unregisteredEventsQuarantined: true,
    forbiddenMetadataStripped: true,
    rawEventDumpsCollapsed: true,
    duplicateEventCatalogTelemetryBehaviorLanesConsolidated: true,
    requiredFields: EVENT_ENVELOPE_REQUIRED_FIELDS,
    registeredEventCount: TELEMETRY_EVENT_EXTENSION_METADATA.length,
    missingEnvelopeFieldsByFeature: Array.from(missingEnvelopeFieldsByFeature.entries()).map(([featureId, fields]) => ({
      featureId,
      missingFields: Array.from(fields).sort(),
    })),
  };
}
