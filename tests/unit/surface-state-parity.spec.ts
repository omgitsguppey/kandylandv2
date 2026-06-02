import { describe, expect, it } from "vitest";

import { SURFACE_PARITY_REGISTRY } from "@/lib/parity/surface-parity-registry";
import {
  SURFACE_STATE_IDS,
  validateSurfaceStateRegistry,
} from "@/lib/parity/surface-state-contract";
import {
  SURFACE_STATE_REGISTRY,
  buildSurfaceStateCopy,
  buildSurfaceStateTelemetry,
  classifyRawSurfaceStateCopy,
  classifySurfaceStateDirtyFile,
  classifySurfaceStateSeverity,
  getSurfaceStateCta,
  resolveSurfaceState,
} from "@/lib/parity/surface-state-resolver";

describe("surface state parity", () => {
  it("registers loading, empty, ready, degraded, error, permission, configuration, locked, unavailable, and stale states for every major surface", () => {
    expect(SURFACE_STATE_REGISTRY.map((surface) => surface.surfaceId).sort()).toEqual(
      SURFACE_PARITY_REGISTRY.map((surface) => surface.surfaceId).sort(),
    );

    for (const surface of SURFACE_STATE_REGISTRY) {
      expect(Object.keys(surface.states).sort()).toEqual([...SURFACE_STATE_IDS].sort());
      expect(surface.scoreDimensionImpact.before).toBeTruthy();
      expect(surface.scoreDimensionImpact.after).toBeTruthy();

      for (const state of SURFACE_STATE_IDS) {
        const contract = surface.states[state];
        expect(contract.copy.title).toBeTruthy();
        expect(contract.copy.body).toBeTruthy();
        expect(contract.cta.label).toBeTruthy();
        expect(contract.telemetryEventName).toMatch(new RegExp(`^${surface.surfaceId}_surface_`, "u"));
        expect(contract.debugLane).toBe("Surface state parity");
        expect(contract.debugSeverity).toMatch(/info|review|warning|error|blocking/u);
        expect(Object.keys(contract.roleVisibility).sort()).toEqual(["admin", "creator", "guest", "user"]);
        expect(contract.sourceTruth).toMatch(/canonical|hot_cache|client_state|permission_guard|configuration|fallback|unavailable/u);
      }
    }
  });

  it("resolves copy, CTA, telemetry, severity, and retry policy from one canonical helper", () => {
    const resolved = resolveSurfaceState({
      surfaceId: "wallet_purchase_modal",
      state: "permission_denied",
      role: "guest",
      reason: "auth_required",
    });

    expect(resolved.state).toBe("permission_denied");
    expect(buildSurfaceStateCopy(resolved)).toMatchObject({
      title: "Sign in first",
      body: expect.stringContaining("sign in"),
    });
    expect(getSurfaceStateCta(resolved)).toMatchObject({
      label: "Sign in",
      action: "sign_in",
    });
    expect(buildSurfaceStateTelemetry(resolved)).toMatchObject({
      eventName: "wallet_purchase_modal_surface_permission_denied",
      surfaceId: "wallet_purchase_modal",
      state: "permission_denied",
      safeFingerprint: "auth_required",
    });
    expect(classifySurfaceStateSeverity(resolved)).toBe("blocking");
    expect(resolved.retryPolicy.canRetry).toBe(false);
  });

  it("requires loading to degrade instead of spinning forever and errors to include a next action", () => {
    for (const surface of SURFACE_STATE_REGISTRY) {
      expect(surface.states.loading.retryPolicy.degradeAfterMs).toBeGreaterThanOrEqual(8000);
      expect(surface.states.loading.retryPolicy.degradeToState).toBe("degraded");
      expect(surface.states.error.cta.action).not.toBe("none");
      expect(surface.states.error.requiresSafeFingerprint).toBe(true);
      expect(surface.states.degraded.telemetryEventName).toBe(`${surface.surfaceId}_surface_degraded_viewed`);
    }
  });

  it("classifies raw developer-facing state copy instead of allowing it into user-facing surfaces", () => {
    expect(classifyRawSurfaceStateCopy("Internal server error")).toBe("raw_developer_error_copy");
    expect(classifyRawSurfaceStateCopy("Something went wrong")).toBe("generic_error_copy");
    expect(classifyRawSurfaceStateCopy("Loading...")).toBe("generic_loading_copy");
    expect(classifyRawSurfaceStateCopy("Sign in first")).toBe("approved_surface_state_copy");
  });

  it("classifies Creator Spotlight state and parity artifacts for focused homepage work", () => {
    expect(classifySurfaceStateDirtyFile("src/components/CreatorDiscoveryRail.tsx")).toBe("real_source_change_needs_review");
    expect(classifySurfaceStateDirtyFile("src/lib/telemetry/surface-telemetry-registry.ts")).toBe("real_source_change_needs_review");
    expect(classifySurfaceStateDirtyFile("tests/unit/creator-discovery-rail.spec.tsx")).toBe("test_artifact_expected");
    expect(classifySurfaceStateDirtyFile("tests/unit/surface-telemetry-parity.spec.ts")).toBe("test_artifact_expected");
    expect(classifySurfaceStateDirtyFile("agent/state/frontend-telemetry-consolidation.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifySurfaceStateDirtyFile("docs/agent-truth/frontend-telemetry-consolidation.md")).toBe("documentation_artifact_expected");
  });

  it("validates without missing telemetry, debug, role, CTA, or score evidence", () => {
    expect(validateSurfaceStateRegistry(SURFACE_STATE_REGISTRY)).toEqual([]);
  });
});
