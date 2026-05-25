import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch31TaskGuidanceParityReport } from "@/lib/debug/debug-cockpit-batch31-task-guidance-parity";

describe("debug cockpit batch 31 task guidance parity", () => {
  it("locks lifecycle-guidance split and keeps zero guidance samples blocked after source repair", () => {
    const report = buildDebugCockpitBatch31TaskGuidanceParityReport({
      taskActivitySamples: 500,
      taskLifecycleEvents: 2817,
      onboardingSamples: 38,
      guidanceSamplesBefore: 0,
      guidanceSamplesAfter: 0,
    });

    expect(report.taskActivityStatus).toBe("pass");
    expect(report.onboardingStatus).toBe("pass");
    expect(report.guidanceStatusBefore).toBe("fail");
    expect(report.guidanceStatusAfter).toBe("source_ready_waiting_for_activity");
    expect(report.emittersFound).toEqual(expect.arrayContaining(report.expectedGuidanceEvents));
    expect(report.catalogMappings.status).toBe("mapped");
    expect(report.factMappings.status).toBe("mapped");
    expect(report.rollupMappings.status).toBe("mapped");
    expect(report.adminValidationConsumerStatus).toBe("mapped");
    expect(report.lifecycleGuidanceSplitStatus).toBe("lifecycle_active_guidance_missing");
    expect(report.remainingGaps).toEqual(expect.arrayContaining([
      "Guidance has zero live samples; keep parity blocked until real activity arrives.",
    ]));
    expect(report.scoreDimensions).toEqual(expect.arrayContaining([
      "taskGuidanceTelemetryContract",
      "taskGuidanceUiInstrumentation",
      "taskGuidanceEventNormalization",
      "taskOnboardingParitySemantics",
      "taskGuidanceHistoryRecovery",
    ]));
  });
});
