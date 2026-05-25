import { describe, expect, it } from "vitest";

import { buildDependencyInventoryDisplay } from "@/lib/debug/dependency-inventory-display";
import { buildCompleteDependencyInventory } from "@/lib/debug/dependency-inventory-engine";

describe("dependency inventory display cleanup", () => {
  it("shows complete drilldowns, separates runtime checks, and hides fake package timestamps", () => {
    const inventory = buildCompleteDependencyInventory({
      rootPackage: { dependencies: { next: "^16.2.4" }, devDependencies: { vitest: "^4.1.4" }, overrides: { "google-gax": "^5.0.6" } },
      functionsPackage: { dependencies: { "firebase-admin": "^13.8.0" }, devDependencies: {} },
      sourceFiles: { "package.json": true, "functions/package.json": true, "firebase.json": true, ".env.example": true },
      packageFreshness: {
        rootPackageUpdatedAtUtc: "1980-01-01T00:00:01.000Z",
        functionsPackageUpdatedAtUtc: null,
      },
    });
    const display = buildDependencyInventoryDisplay(inventory);

    expect(display.compactSummary.rootRuntimeDeps).toBe(1);
    expect(display.drilldowns.everyDependency.map((entry) => entry.name)).toEqual(expect.arrayContaining(["next", "vitest", "firebase-admin"]));
    expect(display.drilldowns.everyOverride.map((entry) => entry.name)).toContain("google-gax");
    expect(display.timestampLabels.rootPackage).toBe("timestamp unavailable");
    expect(JSON.stringify(display)).not.toContain("1980-01-01");
    expect(display.runtimeCopy).toContain("Package presence does not prove runtime use.");
    expect(display.drilldowns.expectedAbsentDependencies.length).toBeGreaterThan(0);
  });
});
