import { describe, expect, it } from "vitest";

import { SURFACE_PARITY_REGISTRY } from "@/lib/parity/surface-parity-registry";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";
import {
  SURFACE_TELEMETRY_EVENT_SPINE,
  validateSurfaceTelemetryRegistry,
} from "@/lib/telemetry/surface-telemetry-contract";
import {
  SURFACE_TELEMETRY_REGISTRY,
  buildSurfaceTelemetryParityReport,
  classifySurfaceTelemetryDirtyFile,
  getSurfaceTelemetryEventDefinitionByName,
  listSurfaceTelemetryCatalogEvents,
} from "@/lib/telemetry/surface-telemetry-registry";

describe("surface telemetry parity", () => {
  it("registers the canonical event spine for every major surface", () => {
    expect(SURFACE_TELEMETRY_REGISTRY.map((surface) => surface.surfaceId).sort()).toEqual(
      SURFACE_PARITY_REGISTRY.map((surface) => surface.surfaceId).sort(),
    );

    for (const surface of SURFACE_TELEMETRY_REGISTRY) {
      expect(Object.keys(surface.events).sort()).toEqual([...SURFACE_TELEMETRY_EVENT_SPINE].sort());
      for (const kind of SURFACE_TELEMETRY_EVENT_SPINE) {
        const definition = surface.events[kind];
        expect(definition.eventName).toBe(`${surface.surfaceId}_${kind}`);
        expect(definition.envelope.surface).toBe(surface.surfaceId);
        expect(definition.envelope.featureId).toBe(surface.featureId);
        expect(definition.envelope.materializerLane).toBeTruthy();
        expect(definition.envelope.debugVisibility).toBe("debug_visible");
        expect(definition.envelope.scoreEvidenceImpact).toBeTruthy();
        expect(definition.costPriority).toMatch(/low|medium/u);
        expect(definition.highFrequency).toBe(false);
      }
    }
  });

  it("keeps action triplets and safe failure semantics explicit", () => {
    for (const surface of SURFACE_TELEMETRY_REGISTRY) {
      expect(surface.majorActionTriplet).toEqual({
        attempted: surface.events.surface_action_attempted.eventName,
        succeeded: surface.events.surface_action_succeeded.eventName,
        failed: surface.events.surface_action_failed.eventName,
      });

      expect(surface.events.surface_action_failed.requiresSafeErrorCode).toBe(true);
      expect(surface.events.surface_error_viewed.requiresSafeErrorCode).toBe(true);
      expect(surface.events.surface_permission_denied.requiresSafeErrorCode).toBe(true);
      expect(surface.events.surface_not_configured_viewed.requiresSafeErrorCode).toBe(true);
      expect(surface.events.surface_permission_denied.treatAsSystemFailure).toBe(false);
      expect(surface.events.surface_not_configured_viewed.treatAsSystemFailure).toBe(false);
    }
  });

  it("registers generated surface events in the telemetry catalog without duplicate random names", () => {
    const catalogEventNames = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
    for (const event of listSurfaceTelemetryCatalogEvents()) {
      expect(catalogEventNames.has(event.eventName)).toBe(true);
      expect(getSurfaceTelemetryEventDefinitionByName(event.eventName)?.eventName).toBe(event.eventName);
    }

    const duplicateNames = TELEMETRY_EVENT_OPTIONS
      .map((event) => event.eventName)
      .filter((eventName, index, names) => names.indexOf(eventName) !== index);
    expect(duplicateNames).toEqual([]);
  });

  it("reports debug-visible parity without fake activity or unsafe legacy aliases", () => {
    const report = buildSurfaceTelemetryParityReport({
      generatedAtUtc: "2026-05-25T00:00:00.000Z",
      currentHead: "test-head",
      dirtyFiles: [],
    });

    expect(validateSurfaceTelemetryRegistry(SURFACE_TELEMETRY_REGISTRY)).toEqual([]);
    expect(report.status).toBe("pass");
    expect(report.debugLane.label).toBe("Surface telemetry parity");
    expect(report.productionReadsPerformed).toBe(false);
    expect(report.providerCallsPerformed).toBe(false);
    expect(report.fakeEventsUsed).toBe(false);
    expect(report.highFrequencyEventsAdded).toBe(false);
    expect(report.scoreDimensionBeforeAfter.before).toBeTruthy();
    expect(report.scoreDimensionBeforeAfter.after).toBeTruthy();
    expect(report.oldEventNameClassification.every((entry) => entry.status !== "unsafe_unknown")).toBe(true);
  });

  it("classifies homepage hero telemetry files as reviewed source and test changes", () => {
    expect(classifySurfaceTelemetryDirtyFile("src/components/Hero.tsx")).toBe("real_source_change_needs_review");
    expect(classifySurfaceTelemetryDirtyFile("src/components/Landing/HomeHeroActions.tsx")).toBe("real_source_change_needs_review");
    expect(classifySurfaceTelemetryDirtyFile("src/components/Landing/HomeHeroTelemetry.tsx")).toBe("real_source_change_needs_review");
    expect(classifySurfaceTelemetryDirtyFile("src/components/CreatorDiscoveryRail.tsx")).toBe("real_source_change_needs_review");
    expect(classifySurfaceTelemetryDirtyFile("src/lib/parity/surface-state-resolver.ts")).toBe("real_source_change_needs_review");
    expect(classifySurfaceTelemetryDirtyFile("tests/unit/home-hero.spec.tsx")).toBe("test_artifact_expected");
    expect(classifySurfaceTelemetryDirtyFile("tests/unit/creator-discovery-rail.spec.tsx")).toBe("test_artifact_expected");
    expect(classifySurfaceTelemetryDirtyFile("tests/unit/surface-state-parity.spec.ts")).toBe("test_artifact_expected");
    expect(classifySurfaceTelemetryDirtyFile("agent/state/frontend-telemetry-consolidation.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifySurfaceTelemetryDirtyFile("docs/agent-truth/frontend-telemetry-consolidation.md")).toBe("documentation_artifact_expected");
    expect(classifySurfaceTelemetryDirtyFile("README.md")).toBe("documentation_artifact_expected");
  });
});
