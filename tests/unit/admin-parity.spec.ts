import { describe, expect, it } from "vitest";

import {
  buildAdminModuleVerification,
  coerceAdminSurfaceState,
} from "@/lib/admin-parity";

describe("admin parity contracts", () => {
  it("normalizes legacy admin states into the canonical status set", () => {
    expect(coerceAdminSurfaceState("realtime")).toBe("live");
    expect(coerceAdminSurfaceState("partial")).toBe("degraded");
    expect(coerceAdminSurfaceState("connecting")).toBe("loading");
    expect(coerceAdminSurfaceState("hydrating")).toBe("loading");
    expect(coerceAdminSurfaceState("polled")).toBe("fallback");
    expect(coerceAdminSurfaceState("unknown")).toBe("unavailable");
  });

  it("marks stale canonical sources without claiming live", () => {
    const verification = buildAdminModuleVerification({
      module: "admin_users",
      canonicalSource: "analytics_users_rollup",
      freshnessTimestamp: Date.now() - (10 * 60 * 1000),
      staleAfterMs: 60_000,
    });

    expect(verification.status).toBe("stale");
    expect(verification.verificationState).toBe("stale");
  });

  it("rejects live claims with no canonical source", () => {
    expect(() => buildAdminModuleVerification({
      module: "broken_surface",
      canonicalSource: "",
      status: "live",
    })).toThrow();
  });
});
