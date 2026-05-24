import { describe, expect, it } from "vitest";

import {
  buildManualUtilityRegistry,
  validateManualUtilitySeparation,
} from "@/lib/debug/manual-utility-contract";

describe("manual utility separation", () => {
  it("keeps Add Gum Drops operator utility out of live health", () => {
    const registry = buildManualUtilityRegistry();
    const balanceUtility = registry.utilities.find((utility) => utility.id === "admin-balance-adjust-current-admin");

    expect(balanceUtility).toMatchObject({
      label: "Add Gum Drops to current admin user",
      kind: "manual_operator_action",
      adminOnly: true,
      audited: true,
      sourceOfFundsGuard: true,
      affectsHealth: false,
      affectsScore: false,
    });
    expect(balanceUtility?.copy).toContain("not live health");
    expect(registry.summary.healthImpactingUtilities).toBe(0);
  });

  it("fails validation when a manual utility affects health", () => {
    const registry = buildManualUtilityRegistry();
    const failures = validateManualUtilitySeparation({
      ...registry,
      utilities: [{ ...registry.utilities[0]!, affectsHealth: true }],
    });

    expect(failures.join(" ")).toContain("health");
  });
});
