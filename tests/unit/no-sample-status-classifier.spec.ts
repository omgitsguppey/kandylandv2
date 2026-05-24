import { describe, expect, it } from "vitest";

import { classifyNoSampleStatus } from "@/lib/debug/no-sample-status-classifier";

describe("no-sample status classifier", () => {
  it("does not display zero loaded rows as LIVE without a current source window", () => {
    const status = classifyNoSampleStatus({
      lane: "diagnostics",
      loadedCount: 0,
      sampleLoaded: false,
      sourceReady: true,
      emptyStateText: "No recent diagnostic clusters are loaded.",
    });

    expect(status.status).toBe("source_ready_no_sample_loaded");
    expect(status.displayState).not.toBe("LIVE");
    expect(status.provenZero).toBe(false);
    expect(status.nextAction).toContain("Load a current diagnostics sample");
  });

  it("allows LIVE only when a current source window proves zero", () => {
    const status = classifyNoSampleStatus({
      lane: "panel_logs",
      loadedCount: 0,
      sampleLoaded: true,
      sourceReady: true,
      sourceWindow: {
        generatedAtUtc: "2026-05-24T20:00:00.000Z",
        windowLabel: "current debug panel window",
        provesZero: true,
      },
      emptyStateText: "No persisted panel logs are loaded yet.",
    });

    expect(status.status).toBe("healthy_proven_zero");
    expect(status.displayState).toBe("LIVE");
    expect(status.provenZero).toBe(true);
  });

  it("keeps missing sample sources actionable", () => {
    const status = classifyNoSampleStatus({
      lane: "downstream_writers",
      loadedCount: 0,
      sampleLoaded: false,
      sourceReady: false,
      sourceMissing: true,
    });

    expect(status.status).toBe("source_missing_actionable");
    expect(status.displayState).toBe("ACTION");
    expect(status.nextAction).toContain("Restore the downstream writers sample source");
  });
});
