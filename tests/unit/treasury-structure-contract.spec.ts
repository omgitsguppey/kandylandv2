import { describe, expect, it } from "vitest";

import {
  TREASURY_BUREAUS,
  validateTreasuryStructureContract,
} from "@/lib/treasury/treasury-structure-contract";

describe("treasury structure contract", () => {
  it("separates bureau ownership instead of mixing ledger, revenue, entitlement, and reporting truth", () => {
    expect(validateTreasuryStructureContract()).toEqual([]);
    expect(TREASURY_BUREAUS.map((bureau) => bureau.bureauId)).toEqual([
      "receipts",
      "ledger",
      "appropriations",
      "obligations",
      "outlays",
      "entitlements",
      "reconciliation",
      "inspector_general",
      "public_reporting",
    ]);
    expect(TREASURY_BUREAUS.every((bureau) => bureau.canonicalSource.length > 0)).toBe(true);
    expect(TREASURY_BUREAUS.find((bureau) => bureau.bureauId === "public_reporting")?.confidenceRules).toContain(
      "Unknown legacy money cannot display as exact revenue, exact balance, or exact entitlement.",
    );
  });
});
