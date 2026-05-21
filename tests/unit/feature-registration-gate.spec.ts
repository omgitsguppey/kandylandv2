import { describe, expect, it } from "vitest";

import {
  FEATURE_REGISTRATION_REGISTRY,
  buildFeatureRegistrationGateReport,
  validateFeatureRegistrationGate,
} from "@/lib/features/feature-registration-registry";
import { TELEMETRY_EVENT_EXTENSION_METADATA } from "@/lib/telemetry-catalog";

describe("feature registration gate", () => {
  it("registers major features with route, telemetry, consent, identity, debug, and score ownership", () => {
    const report = buildFeatureRegistrationGateReport({
      appRouteFiles: [
        "src/app/dashboard/page.tsx",
        "src/app/dashboard/creator/settings/page.tsx",
        "src/app/api/analytics/ingest/route.ts",
        "src/app/dashboard/chat/page.tsx",
      ],
    });

    expect(report.status).toBe("pass");
    expect(report.registryVersion).toBeTruthy();
    expect(report.features.length).toBeGreaterThanOrEqual(12);
    expect(report.routeCoverage.unmappedRoutes).toEqual([]);
    expect(report.systemInternalRoutes).toContain("src/app/dashboard/chat/page.tsx");

    for (const feature of report.features) {
      expect(feature.owner, feature.featureId).toBeTruthy();
      expect(feature.routes.length + feature.uiSurfaces.length, feature.featureId).toBeGreaterThan(0);
      expect(feature.consentModeRequirements.length, feature.featureId).toBeGreaterThan(0);
      expect(feature.identityRequirements.length, feature.featureId).toBeGreaterThan(0);
      expect(feature.materializerLanes.length, feature.featureId).toBeGreaterThan(0);
      expect(feature.adminDebugVisibility.debugVisible, feature.featureId).toBe(true);
      expect(feature.scoreDimensionsAffected.length, feature.featureId).toBeGreaterThan(0);
    }
  });

  it("maps every telemetry extension event to a registered feature", () => {
    const report = buildFeatureRegistrationGateReport();
    const registeredEvents = new Set(report.features.flatMap((feature) => feature.telemetryEvents));

    for (const metadata of TELEMETRY_EVENT_EXTENSION_METADATA) {
      expect(registeredEvents.has(metadata.eventName), metadata.eventName).toBe(true);
    }

    expect(report.telemetryCoverage.unmappedEvents).toEqual([]);
  });

  it("fails when a new app route is not registered or explicitly system/internal", () => {
    const report = buildFeatureRegistrationGateReport({
      appRouteFiles: ["src/app/new-social-feed/page.tsx"],
    });
    const failures = validateFeatureRegistrationGate(report);

    expect(report.status).toBe("fail");
    expect(failures).toContain("route src/app/new-social-feed/page.tsx lacks feature registration or system/internal classification.");
  });

  it("fails when a feature lacks required completion fields", () => {
    const [first] = FEATURE_REGISTRATION_REGISTRY;
    const report = buildFeatureRegistrationGateReport({
      registry: [{
        ...first,
        owner: "",
        telemetryEvents: [],
        consentModeRequirements: [],
        identityRequirements: [],
        materializerLanes: [],
        adminDebugVisibility: { debugVisible: false, owner: "", surfaces: [] },
        scoreDimensionsAffected: [],
      }],
    });
    const failures = validateFeatureRegistrationGate(report);

    expect(report.status).toBe("fail");
    expect(failures).toEqual(expect.arrayContaining([
      `${first.featureId} lacks owner.`,
      `${first.featureId} lacks telemetry events.`,
      `${first.featureId} lacks consent mode requirements.`,
      `${first.featureId} lacks identity requirements.`,
      `${first.featureId} lacks materializer lane.`,
      `${first.featureId} lacks debug visibility.`,
      `${first.featureId} lacks score impact classification.`,
    ]));
  });
});
