import { describe, expect, it } from "vitest";

import { buildTaskGuidanceTelemetryContract } from "@/lib/tasks/task-guidance-telemetry-contract";

describe("task guidance telemetry contract", () => {
  it("requires emitters, catalog mappings, fact mappings, and an admin consumer while beta guidance is required", () => {
    const contract = buildTaskGuidanceTelemetryContract({
      lifecycleSampleCount: 2817,
      guidanceSampleCount: 0,
    });

    expect(contract.implemented).toBe(true);
    expect(contract.requiredInBeta).toBe(true);
    expect(contract.expectedEvents).toEqual(expect.arrayContaining([
      "task_guidance_viewed",
      "task_guidance_tapped",
      "task_guidance_dismissed",
      "task_guidance_completed",
      "task_card_expanded",
      "task_help_opened",
    ]));
    expect(contract.emitters.map((emitter) => emitter.eventName)).toEqual(expect.arrayContaining(contract.expectedEvents));
    expect(contract.eventEnvelopeMapping.status).toBe("mapped");
    expect(contract.eventFactMapping.status).toBe("mapped");
    expect(contract.rollupMapping.status).toBe("mapped");
    expect(contract.adminValidationConsumer.status).toBe("mapped");
    expect(contract.passPolicy.sampleCanPassWithZero).toBe(false);
    expect(contract.blockedReason).toBe("lifecycle_active_guidance_missing");
    expect(contract.nextAction).toContain("Fix task guidance UI emitters");
  });
});
