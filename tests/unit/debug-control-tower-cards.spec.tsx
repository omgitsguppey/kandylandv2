import { describe, expect, it } from "vitest";

import { resolveReportDisplay } from "@/app/admin/debug/components/DebugControlTowerCards";
import type { AdminDebugReportCard } from "@/lib/admin-debug-control-tower";

function report(overrides: Partial<AdminDebugReportCard>): AdminDebugReportCard {
  return {
    id: "sample-report",
    label: "Sample report",
    section: "beta_readiness",
    filePath: "agent/state/sample.generated.json",
    command: "npm run check:sample",
    score: 100,
    status: "clean",
    truthState: "live",
    freshness: "fresh",
    generatedAt: "2026-06-18T00:00:00.000Z",
    updatedAtMs: Date.UTC(2026, 5, 18),
    ageHours: 0,
    findingCount: 0,
    criticalCount: 0,
    majorCount: 0,
    required: true,
    sourceCommit: null,
    currentHead: null,
    sourceDrift: "unknown",
    topFindings: [],
    ...overrides,
  };
}

describe("resolveReportDisplay", () => {
  it("shows zero-finding live reports as current source, not raw status", () => {
    const display = resolveReportDisplay(report({ status: "clean" }));

    expect(display.statusLabel).toBe("Source current");
    expect(display.findingLabel).toBe("No active findings");
    expect(display.badgeState).toBe("live");
  });

  it("shows zero-finding public beta failures as proof gates", () => {
    const display = resolveReportDisplay(report({
      id: "public-beta-score",
      status: "error",
      truthState: "failed",
    }));

    expect(display.statusLabel).toBe("External proof required");
    expect(display.findingLabel).toBe("Proof gate");
    expect(display.badgeLabel).toBe("Review");
  });

  it("shows counted public beta evidence gates instead of zero findings", () => {
    const display = resolveReportDisplay(report({
      id: "public-beta-score",
      status: "error",
      truthState: "failed",
      evidenceGateCount: 4,
    }));

    expect(display.statusLabel).toBe("External proof required");
    expect(display.findingLabel).toBe("4 evidence gates");
    expect(display.badgeLabel).toBe("Review");
  });

  it("shows zero-finding delayed reports as waiting evidence instead of delayed errors", () => {
    const display = resolveReportDisplay(report({
      id: "self-healing-refresh-queue",
      status: "delayed",
      truthState: "unknown",
    }));

    expect(display.statusLabel).toBe("Waiting for evidence");
    expect(display.findingLabel).toBe("Evidence pending");
    expect(display.badgeLabel).toBe("Review");
  });

  it("keeps stale generated state as refresh due", () => {
    const display = resolveReportDisplay(report({
      status: "clean",
      truthState: "stale",
      freshness: "stale_72h",
    }));

    expect(display.statusLabel).toBe("Refresh due");
    expect(display.badgeLabel).toBe("Refresh due");
  });
});
