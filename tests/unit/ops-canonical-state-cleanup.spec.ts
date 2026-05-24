import { describe, expect, it } from "vitest";

import { deriveOpsHealthCanonicalState } from "@/lib/debug/ops-health-canonical-state";

describe("ops canonical state cleanup", () => {
  it("uses recent samples and no active failures instead of awaiting canonical state", () => {
    const result = deriveOpsHealthCanonicalState({
      canonicalStateStatus: undefined,
      newestSampleAgeMs: 10_000,
      activeRouteFailures: 0,
      currentOpenActionGroups: 0,
      routeListenerFailed: false,
      aiFallbackAccepted: true,
      aiFeedFailed: false,
    });

    expect(result.status).toBe("healthy_current");
    expect(result.sourceExplanation).toContain("recent sample");
    expect(result.nextAction).toBe("No action needed.");
  });

  it("separates route listener delay from whole-system failure", () => {
    const result = deriveOpsHealthCanonicalState({
      canonicalStateStatus: undefined,
      newestSampleAgeMs: 30_000,
      activeRouteFailures: 0,
      currentOpenActionGroups: 0,
      routeListenerFailed: true,
      canTrustLastVerifiedRouteSample: true,
      aiFallbackAccepted: true,
      aiFeedFailed: true,
    });

    expect(result.status).toBe("route_listener_delayed_with_last_verified_sample");
    expect(result.degradesSystemSafety).toBe(false);
    expect(result.nextAction).toContain("route listener");
  });
});
