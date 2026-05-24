import { describe, expect, it } from "vitest";

import { classifyLegacyQueueAdapterUsage } from "@/lib/debug/legacy-queue-adapter-policy";

describe("legacy queue adapter policy", () => {
  it("treats legacy adapter usage without dispatch outcome as blocking drift", () => {
    const policy = classifyLegacyQueueAdapterUsage({
      usageCount: 1,
      missingDispatchOutcomeCount: 1,
      sourceLoaded: true,
    });

    expect(policy.status).toBe("blocking_runtime_continuity_drift");
    expect(policy.blockingDriftCount).toBe(2);
    expect(policy.blocksContinuity).toBe(true);
    expect(policy.nextAction).toContain("Remove or migrate legacy queue adapter usage");
  });

  it("does not let zero adapter usage hide an unloaded source", () => {
    const policy = classifyLegacyQueueAdapterUsage({
      usageCount: 0,
      missingDispatchOutcomeCount: 0,
      sourceLoaded: false,
    });

    expect(policy.status).toBe("unknown");
    expect(policy.blocksContinuity).toBe(false);
    expect(policy.nextAction).toContain("Load runtime warning source");
  });
});
