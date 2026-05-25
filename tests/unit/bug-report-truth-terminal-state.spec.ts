import { describe, expect, it } from "vitest";

import { buildBugReportTruthState } from "@/lib/debug/bug-report-truth-contract";

describe("bug report truth terminal state", () => {
  it("returns loaded_empty when an empty source window is loaded", () => {
    const state = buildBugReportTruthState({
      sourceLoaded: true,
      sourceExists: true,
      reports: [],
      sourceWindow: { fromUtc: "2026-05-01T00:00:00.000Z", toUtc: "2026-05-24T00:00:00.000Z", label: "30d" },
      generatedAtMs: 1_800_000_000_000,
    });

    expect(state.status).toBe("loaded_empty");
    expect(state.reportCount).toBe(0);
    expect(state.nextAction).toMatch(/No bug reports/i);
  });

  it("separates source-ready no-sample from missing source and failed route states", () => {
    expect(buildBugReportTruthState({ sourceLoaded: false, sourceExists: true }).status).toBe("source_ready_no_sample_loaded");
    expect(buildBugReportTruthState({ sourceLoaded: false, sourceExists: false }).status).toBe("source_missing_actionable");
    expect(buildBugReportTruthState({ sourceLoaded: false, sourceExists: true, loadError: new Error("raw private stack") }).status).toBe("failed");
    expect(buildBugReportTruthState({ sourceLoaded: false, sourceExists: true, loadError: new Error("raw private stack") }).loadError).not.toContain("raw private stack");
  });

  it("redacts report, reward, and operator bodies by default", () => {
    const state = buildBugReportTruthState({
      sourceLoaded: true,
      sourceExists: true,
      reports: [{
        id: "bug_1",
        createdAt: 1_800_000_000_000,
        status: "rewarded",
        rewardGd: 10,
        userMessage: "raw user body should not render",
        operatorMessage: "raw operator note should not render",
        translatedError: "raw translated error should not render",
      }],
      sourceWindow: { fromUtc: "2026-05-01T00:00:00.000Z", toUtc: "2026-05-24T00:00:00.000Z", label: "30d" },
      generatedAtMs: 1_800_000_000_000,
    });

    expect(state.status).toBe("loaded_with_reports");
    expect(state.rewardStateCount).toBe(1);
    expect(state.redactionStatus).toBe("summary_only_raw_bodies_redacted");
    expect(JSON.stringify(state)).not.toMatch(/raw user body|raw operator note|raw translated error/i);
    expect(state.nextAction).toMatch(/triage/i);
  });
});
