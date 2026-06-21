import { describe, expect, it } from "vitest";

import { classifyAdminSummaryLaneStatus } from "@/lib/debug/admin-summary-lane-status-classifier";

describe("admin summary lane status classifier", () => {
  it("does not mark no-sample or all-zero unproven lanes as live", () => {
    expect(classifyAdminSummaryLaneStatus({
      laneId: "user_management",
      sourceContractPresent: true,
      sampleLoaded: false,
      counts: [0, 0],
    }).status).toBe("source_ready_no_sample_loaded");

    expect(classifyAdminSummaryLaneStatus({
      laneId: "auth_runtime",
      sourceContractPresent: true,
      telemetryMapped: true,
      expectedRuntimeActivity: true,
      sampleLoaded: false,
      counts: [0, 0, 0],
    }).status).toBe("source_ready_collecting");
  });

  it("separates stale artifact freshness from source health", () => {
    expect(classifyAdminSummaryLaneStatus({
      laneId: "testing_coverage",
      sourceContractPresent: true,
      sampleLoaded: true,
      counts: [24],
      artifactCurrent: false,
      artifactRefreshCommand: "npm run check:telemetry-trigger-test-matrix",
    })).toMatchObject({
      status: "stale_artifact_refresh_required",
      displayState: "stale",
      nextAction: "npm run check:telemetry-trigger-test-matrix",
    });
  });

  it("keeps the compatibility status while rendering typed evidence gate copy", () => {
    const decision = classifyAdminSummaryLaneStatus({
      laneId: "admin_source_sample",
      sourceContractPresent: true,
      formalGateRequired: true,
    });

    expect(decision).toMatchObject({
      status: "formal_gate_required",
      displayState: "blocked",
      nextAction: "Attach the lane's required typed evidence artifact before clearing this gate.",
      liveDisplayAllowed: false,
    });
    expect(`${decision.reason} ${decision.nextAction}`).not.toMatch(/formal evidence artifact|manual proof|screenshot proof/iu);
  });
});
