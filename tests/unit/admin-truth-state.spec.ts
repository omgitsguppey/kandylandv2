import { describe, expect, it } from "vitest";

import { coerceAdminTruthState, resolveAdminInputTruthState, resolveAdminTruthState } from "@/lib/admin-truth-state";

describe("admin truth state", () => {
  it("does not promote unavailable source labels to live just because display text exists", () => {
    expect(resolveAdminInputTruthState({
      truthState: "unavailable",
      value: "No sample",
    }).truthState).toBe("unavailable");

    expect(resolveAdminTruthState({
      hasUsableValue: true,
      transportState: "unavailable",
      valueState: "unavailable",
    })).toBe("unavailable");
  });

  it("keeps verified cache and fallback surface states distinct from stale truth", () => {
    expect(coerceAdminTruthState("cached")).toBe("cached");
    expect(coerceAdminTruthState("fallback")).toBe("cached");

    expect(resolveAdminTruthState({
      hasUsableValue: true,
      transportState: "cached",
      valueState: "cached",
    })).toBe("cached");

    expect(resolveAdminTruthState({
      hasUsableValue: true,
      transportState: "fallback",
      valueState: "fallback",
    })).toBe("cached");
  });
});
