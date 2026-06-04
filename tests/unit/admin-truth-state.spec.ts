import { describe, expect, it } from "vitest";

import { resolveAdminInputTruthState, resolveAdminTruthState } from "@/lib/admin-truth-state";

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
});
