import { describe, expect, it } from "vitest";

import { FILTERS, resolveReportDisplay } from "@/app/admin/debug/components/DebugControlTowerCards";
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
  it("labels the stale report filter as refresh due for operators", () => {
    expect(FILTERS.find((filter) => filter.id === "stale")?.label).toBe("Refresh due");
  });

  it("shows zero-finding live reports as current source, not raw status", () => {
    const display = resolveReportDisplay(report({ status: "clean" }));

    expect(display.statusLabel).toBe("Source current");
    expect(display.findingLabel).toBe("No active findings");
    expect(display.badgeState).toBe("live");
    expect(display.sourceDetail).toBe("This source lane is current and has no active findings.");
    expect(display.sourceDetail).not.toContain("Source score");
    expect(display.sourceDetail).not.toContain("freshness");
  });

  it("shows zero-finding public beta failures as typed evidence gates", () => {
    const display = resolveReportDisplay(report({
      id: "public-beta-score",
      status: "error",
      truthState: "failed",
    }));

    expect(display.statusLabel).toBe("Site activity evidence required");
    expect(display.findingLabel).toBe("Evidence gate");
    expect(display.badgeLabel).toBe("Review");
    expect(display.sourceDetail).toBe("Source validators are not enough for provider-backed site activity, deployed route evidence, or admin source samples.");
  });

  it("shows counted public beta evidence gates instead of zero findings", () => {
    const display = resolveReportDisplay(report({
      id: "public-beta-score",
      status: "error",
      truthState: "failed",
      evidenceGateCount: 4,
    }));

    expect(display.statusLabel).toBe("Site activity evidence required");
    expect(display.findingLabel).toBe("4 evidence gates");
    expect(display.badgeLabel).toBe("Review");
  });

  it("shows source-only public beta evidence as source checks, not external proof", () => {
    const display = resolveReportDisplay(report({
      id: "public-beta-score",
      status: "error",
      truthState: "failed",
      evidenceGateCount: 1,
      topFindings: [{
        id: "source-only",
        reportId: "public-beta-score",
        section: "beta_readiness",
        severity: "moderate",
        title: "Source-only behavior evidence",
        domain: "beta_readiness",
        filePath: "agent/state/public-beta-score.generated.json",
        humanReadableWarning: "Implemented behavior checks passed.",
        suggestedValidator: "npm run check:beta-score",
        evidence: [],
        truthState: "live",
      }],
    }));

    expect(display.statusLabel).toBe("Source checks only");
    expect(display.findingLabel).toBe("1 evidence gate");
    expect(display.badgeLabel).toBe("Review");
    expect(display.sourceDetail).toBe("Source validators passed; deployed route evidence, provider-backed site activity, admin source samples, and UI source contract checks stay separate.");
  });

  it("shows evidence-gate-only failures as proof gates even when the producer omits evidenceGateCount", () => {
    const display = resolveReportDisplay(report({
      status: "error",
      truthState: "failed",
      topFindings: [{
        id: "provider-proof",
        reportId: "sample-report",
        section: "beta_readiness",
        severity: "major",
        title: "Provider and route evidence required",
        domain: "beta_readiness",
        filePath: "agent/state/sample.generated.json",
        humanReadableWarning: "Provider-backed site activity and deployed route evidence are required.",
        suggestedValidator: "npm run check:sample",
        evidence: [],
        truthState: "unknown",
      }],
    }));

    expect(display.statusLabel).toBe("Site activity evidence required");
    expect(display.findingLabel).toBe("Evidence gate");
    expect(display.sourceDetail).toBe("Source validators are not enough for provider-backed site activity, deployed route evidence, or admin source samples.");
  });

  it("shows refresh evidence gates as refresh due instead of provider proof", () => {
    const display = resolveReportDisplay(report({
      status: "warning",
      truthState: "stale",
      topFindings: [{
        id: "report-refresh",
        reportId: "sample-report",
        section: "beta_readiness",
        severity: "major",
        title: "Report refresh required",
        domain: "beta_readiness",
        filePath: "agent/state/sample.generated.json",
        humanReadableWarning: "Generated report metadata is outside the freshness window.",
        suggestedValidator: "npm run check:sample",
        evidence: [],
        truthState: "stale",
      }],
    }));

    expect(display.statusLabel).toBe("Refresh due");
    expect(display.findingLabel).toBe("Evidence gate");
    expect(display.badgeLabel).toBe("Refresh due");
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
    expect(display.sourceDetail).toBe("This lane is waiting for its source evidence to refresh.");
  });

  it("keeps stale generated state as refresh due", () => {
    const display = resolveReportDisplay(report({
      status: "clean",
      truthState: "stale",
      freshness: "stale_72h",
    }));

    expect(display.statusLabel).toBe("Refresh due");
    expect(display.badgeLabel).toBe("Refresh due");
    expect(display.sourceDetail).toBe("This evidence is older than its freshness window or current app version.");
  });
});
