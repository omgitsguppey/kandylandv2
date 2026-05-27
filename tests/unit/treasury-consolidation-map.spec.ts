import { describe, expect, it } from "vitest";

import {
  TREASURY_CONSOLIDATION_MAP,
  validateTreasuryConsolidationMap,
} from "@/lib/treasury/treasury-consolidation-map";

describe("treasury consolidation map", () => {
  it("maps finance-like modules to existing canonical owners without duplicate math", () => {
    expect(validateTreasuryConsolidationMap()).toEqual([]);
    expect(TREASURY_CONSOLIDATION_MAP.some((entry) => entry.existingOwner.includes("platform-economy"))).toBe(true);
    expect(TREASURY_CONSOLIDATION_MAP.some((entry) => entry.existingOwner.includes("gumdrop-ledger-math"))).toBe(true);
    expect(TREASURY_CONSOLIDATION_MAP.every((entry) => entry.duplicatesMath)).toBe(false);
  });
});
