import { describe, expect, it } from "vitest";

import {
  MAJOR_SURFACE_PARITY_IDS,
  SURFACE_PARITY_REQUIRED_STATES,
  validateSurfaceParityRegistry,
} from "@/lib/parity/surface-parity-contract";
import {
  SURFACE_PARITY_REGISTRY,
  buildSurfaceParityDoctrineReport,
} from "@/lib/parity/surface-parity-registry";

describe("surface parity doctrine", () => {
  it("registers every major user, creator, admin, and public surface", () => {
    expect(SURFACE_PARITY_REGISTRY.map((surface) => surface.surfaceId).sort()).toEqual(
      [...MAJOR_SURFACE_PARITY_IDS].sort(),
    );
  });

  it("requires role visibility, state, telemetry, debug, feature, data, and score contracts", () => {
    for (const surface of SURFACE_PARITY_REGISTRY) {
      expect(Object.keys(surface.roleVisibility).sort()).toEqual(["admin", "creator", "guest", "user"]);
      expect(surface.requiredStates).toEqual(SURFACE_PARITY_REQUIRED_STATES);
      expect(surface.canonicalRoute).toMatch(/^\/|^native:/u);
      expect(surface.featureId).toBeTruthy();
      expect(surface.dataSources.length).toBeGreaterThan(0);
      expect(surface.backendRoutesOrActions.length).toBeGreaterThan(0);
      expect(surface.telemetryEvents.length).toBeGreaterThan(0);
      expect(surface.debugLane).toBeTruthy();
      expect(surface.scoreDimensionImpact.before).toBeTruthy();
      expect(surface.scoreDimensionImpact.after).toBeTruthy();
      expect(surface.scoreDimensionImpact.dimensions.length).toBeGreaterThan(0);
      expect(surface.mobileDensityStatus).toBeTruthy();
      expect(surface.rolePermissionStatus).toBeTruthy();
      expect(surface.oldLogicStatus).toBeTruthy();
    }
  });

  it("validates without duplicate parity authority or ambiguous role visibility", () => {
    const report = buildSurfaceParityDoctrineReport({
      generatedAtUtc: "2026-05-25T00:00:00.000Z",
      currentHead: "test-head",
      dirtyFiles: [],
    });

    expect(validateSurfaceParityRegistry(SURFACE_PARITY_REGISTRY, report.supersededParityValidators)).toEqual([]);
    expect(report.status).toBe("pass");
    expect(report.duplicateParityValidatorsRetired.length).toBeGreaterThan(0);
    expect(report.activeSupportingParityValidators).toContain("check:feature-registration-gate");
    expect(report.productionReadsPerformed).toBe(false);
    expect(report.providerCallsPerformed).toBe(false);
  });
});
