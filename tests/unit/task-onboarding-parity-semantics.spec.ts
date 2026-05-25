import { describe, expect, it } from "vitest";

import { classifyTaskOnboardingParity } from "@/lib/analytics/task-onboarding-parity-semantics";

describe("task onboarding parity semantics", () => {
  it("keeps task activity and onboarding activity passing while guidance failure degrades overall parity", () => {
    const result = classifyTaskOnboardingParity({
      taskActivitySamples: 500,
      taskLifecycleEvents: 2817,
      onboardingSamples: 38,
      guidanceSamples: 0,
      guidanceImplemented: true,
      guidanceRequired: true,
    });

    expect(result.taskActivity.state).toBe("pass");
    expect(result.onboardingActivity.state).toBe("pass");
    expect(result.taskGuidance.state).toBe("fail");
    expect(result.overall.state).toBe("partial");
    expect(result.taskGuidance.copy).toBe("Lifecycle and onboarding are active, but guidance UI telemetry is missing.");
    expect(result.onboardingActivity.technicalEvidence).not.toBe("");
  });
});
