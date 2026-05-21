import { describe, expect, it } from "vitest";

import {
  TELEMETRY_EVENT_EXTENSION_METADATA_BY_NAME,
  getTelemetryEventExtensionMetadata,
} from "@/lib/telemetry-catalog";
import {
  BEHAVIOR_FEATURE_REGISTRY,
  REQUIRED_BEHAVIOR_FEATURE_IDS,
  getBehaviorFeatureRegistration,
} from "@/lib/behavioral/behavior-feature-registry";
import {
  classifyBehaviorSignalForEvent,
  validateBehaviorEventRegistration,
} from "@/lib/behavioral/behavior-signal-classifier";

describe("behavioral algorithm extensibility layer", () => {
  it("registers the required behavior features with future-safe lanes", () => {
    for (const featureId of REQUIRED_BEHAVIOR_FEATURE_IDS) {
      const feature = getBehaviorFeatureRegistration(featureId);

      expect(feature, featureId).toBeDefined();
      expect(feature?.owner).toBeTruthy();
      expect(feature?.surface).toBeTruthy();
      expect(feature?.defaultPersistenceLane).toBeTruthy();
      expect(feature?.defaultMaterializerLane).toBeTruthy();
      expect(feature?.defaultAggregationLane).toBeTruthy();
      expect(feature?.debugVisibility).toBe("debug_visible");
      expect(feature?.futureFeatureSafe).toBe(true);
    }

    expect(BEHAVIOR_FEATURE_REGISTRY.length).toBeGreaterThanOrEqual(REQUIRED_BEHAVIOR_FEATURE_IDS.length);
  });

  it("derives extension metadata for cataloged behavior events", () => {
    const impression = getTelemetryEventExtensionMetadata("drop_card_impression");
    const profile = getTelemetryEventExtensionMetadata("creator_profile_viewed");
    const purchase = getTelemetryEventExtensionMetadata("purchase_verified");

    expect(impression).toMatchObject({
      feature: "drops",
      eventType: "impression",
      consentRequirement: "full_behavioral",
      identityRequirement: "anonymous_or_user",
      materializerLane: "drop_behavior_materializer",
      aggregationLane: "drop_interest_rollup",
      debugVisibility: "debug_visible",
      futureFeatureSafe: true,
    });
    expect(profile).toMatchObject({
      feature: "creator_profile",
      eventType: "profile_view",
      consentRequirement: "full_behavioral",
      identityRequirement: "anonymous_or_user",
    });
    expect(purchase).toMatchObject({
      feature: "wallet",
      eventType: "purchase",
      consentRequirement: "required_integrity",
      identityRequirement: "authenticated_user",
    });
  });

  it("classifies consent-gated, identity-aware, materializer-ready behavior signals", () => {
    const full = classifyBehaviorSignalForEvent("drop_card_impression", "full_behavioral");
    const minimal = classifyBehaviorSignalForEvent("drop_card_impression", "minimal_analytics");
    const purchase = classifyBehaviorSignalForEvent("purchase_verified", "necessary_only");

    expect(full).toMatchObject({
      accepted: true,
      signals: ["impression", "drop_interest"],
      consentAllowed: true,
      identityAware: true,
      materializerReady: true,
      debugVisible: true,
    });
    expect(minimal).toMatchObject({
      accepted: false,
      quarantineReason: "consent_blocked_behavioral_personalization",
      consentAllowed: false,
    });
    expect(purchase).toMatchObject({
      accepted: true,
      signals: ["conversion", "monetization_interest"],
      consentAllowed: true,
    });
  });

  it("rejects unregistered events instead of accepting orphaned telemetry", () => {
    expect(getTelemetryEventExtensionMetadata("new_feature_unregistered_click")).toBeNull();
    expect(classifyBehaviorSignalForEvent("new_feature_unregistered_click", "full_behavioral")).toMatchObject({
      accepted: false,
      quarantineReason: "unregistered_event",
    });
    expect(validateBehaviorEventRegistration("new_feature_unregistered_click").ok).toBe(false);
  });

  it("keeps every telemetry catalog extension entry owned and materializer-ready", () => {
    for (const metadata of Object.values(TELEMETRY_EVENT_EXTENSION_METADATA_BY_NAME)) {
      expect(metadata.feature, metadata.eventName).toBeTruthy();
      expect(metadata.surface, metadata.eventName).toBeTruthy();
      expect(metadata.consentRequirement, metadata.eventName).toBeTruthy();
      expect(metadata.identityRequirement, metadata.eventName).toBeTruthy();
      expect(metadata.persistenceLane, metadata.eventName).toBeTruthy();
      expect(metadata.materializerLane, metadata.eventName).toBeTruthy();
      expect(metadata.aggregationLane, metadata.eventName).toBeTruthy();
      expect(metadata.scoreEvidenceImpact, metadata.eventName).toBeTruthy();
      expect(metadata.owner, metadata.eventName).toBeTruthy();
      expect(metadata.futureFeatureSafe, metadata.eventName).toBe(true);
    }
  });
});
