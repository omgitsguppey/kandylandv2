import { describe, expect, it } from "vitest";

import {
  coerceAdminTruthState,
  hasUsableAdminTruthValue,
  resolveAdminInputTruthState,
  resolveAdminTruthState,
  resolveAdminVerificationTruthState,
} from "@/lib/admin-truth-state";

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

  it("keeps natural missing-value copy from becoming live data", () => {
    expect(hasUsableAdminTruthValue("Not recorded")).toBe(false);
    expect(hasUsableAdminTruthValue("Not loaded")).toBe(false);
    expect(hasUsableAdminTruthValue("--")).toBe(false);
    expect(hasUsableAdminTruthValue("No sample")).toBe(false);
    expect(hasUsableAdminTruthValue("Unavailable")).toBe(false);
    expect(hasUsableAdminTruthValue("Waiting for verified route health from a real admin session")).toBe(false);
    expect(resolveAdminInputTruthState({
      value: "Not recorded",
    }).truthState).toBe("unavailable");
    expect(resolveAdminInputTruthState({
      value: "Not loaded",
    }).truthState).toBe("unavailable");
  });

  it("does not expose unavailable admin cards as having usable truth values", () => {
    expect(resolveAdminInputTruthState({
      truthState: "unavailable",
      value: "Waiting for verified system state from a real admin session",
    })).toMatchObject({
      truthState: "unavailable",
      hasUsableValue: false,
    });

    expect(resolveAdminVerificationTruthState({
      status: "unavailable",
      canonicalSource: "local admin UI test session",
    })).toMatchObject({
      truthState: "unavailable",
      hasUsableValue: false,
    });
  });
});
