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

  it("separates stale artifact freshness from source health and deployed route evidence", () => {
    const decision = classifyConfigRuntimeSampleStatus({
      laneId: "future_catalog",
      configSourceHealthy: true,
      laneKind: "config",
      artifactCurrent: false,
      artifactRefreshCommand: "npm run check:final-signal-zero-lock",
    });

    expect(decision).toMatchObject({
      status: "stale_artifact_refresh_required",
      artifactFreshness: "stale",
      reason: "Artifact freshness is stale; this is not source health or deployed route evidence.",
      nextAction: "npm run check:final-signal-zero-lock",
    });
    expect(decision.reason).not.toMatch(/runtime proof|manual proof|screenshot proof/iu);
  });

  it("keeps the compatibility status while rendering typed evidence gate copy", () => {
    const decision = classifyConfigRuntimeSampleStatus({
      laneId: "runtime_site_activity",
      laneKind: "mixed",
      sourceContractPresent: true,
      formalGateRequired: true,
    });

    expect(decision).toMatchObject({
      status: "formal_gate_required",
      displayState: "blocked",
      nextAction: "Attach the lane's required typed evidence artifact before clearing this gate.",
      runtimeLiveAllowed: false,
    });
    expect(`${decision.reason} ${decision.nextAction}`).not.toMatch(/formal evidence artifact|runtime proof|manual proof|screenshot proof/iu);
  });
});
