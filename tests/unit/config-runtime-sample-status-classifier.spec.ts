import { describe, expect, it } from "vitest";

import { classifyConfigRuntimeSampleStatus } from "@/lib/debug/config-runtime-sample-status-classifier";

describe("config runtime sample status classifier", () => {
  it("keeps config health separate from all-zero runtime samples", () => {
    expect(classifyConfigRuntimeSampleStatus({
      laneId: "chat_gating_config",
      configSourceHealthy: true,
      laneKind: "config",
    }).status).toBe("config_healthy_current");

    expect(classifyConfigRuntimeSampleStatus({
      laneId: "chat_gating_runtime",
      configSourceHealthy: true,
      laneKind: "runtime_sample",
      sampleLoaded: false,
      counts: [0, 0, 0],
      sourceWindowPresent: false,
    }).status).toBe("source_ready_collecting");
  });

  it("separates stale artifact freshness from source or runtime failure", () => {
    expect(classifyConfigRuntimeSampleStatus({
      laneId: "future_catalog",
      configSourceHealthy: true,
      laneKind: "config",
      artifactCurrent: false,
      artifactRefreshCommand: "npm run check:final-signal-zero-lock",
    })).toMatchObject({
      status: "stale_artifact_refresh_required",
      artifactFreshness: "stale",
      nextAction: "npm run check:final-signal-zero-lock",
    });
  });
});

