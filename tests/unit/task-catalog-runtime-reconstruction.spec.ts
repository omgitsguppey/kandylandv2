import { describe, expect, it } from "vitest";
import { buildTaskCatalogRuntimeReconstruction } from "@/lib/tasks/task-catalog-coverage-engine";

describe("task catalog runtime reconstruction", () => {
  it("flags a zero built-in catalog as missing source/config instead of loaded truth", () => {
    const report = buildTaskCatalogRuntimeReconstruction({
      builtInCount: 0,
      sourcePath: "src/lib/tasks/task-catalog.ts",
      generatedAtUtc: "2026-05-25T12:00:00.000Z",
    });

    expect(report.status.status).toBe("formula_missing_actionable");
    expect(report.nextAction).toContain("built-in task definitions");
  });

  it("keeps reward configuration explicit when catalog data is loaded", () => {
    const report = buildTaskCatalogRuntimeReconstruction({
      builtInCount: 40,
      readyCount: 10,
      rewardVersion: 3,
      multiplierPct: 60,
      builtInAvgGd: 240,
      sourcePath: "src/lib/tasks/task-catalog.ts",
      generatedAtUtc: "2026-05-25T12:00:00.000Z",
    });

    expect(report.status.status).toBe("loaded_with_data");
    expect(report.rewardVersion).toBe(3);
    expect(report.multiplierPct).toBe(60);
    expect(report.builtInAvgGd).toBe(240);
  });
});
