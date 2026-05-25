import { describe, expect, it } from "vitest";

import { buildTaskGuidanceHistoryRecoveryPlan } from "@/lib/tasks/task-guidance-history-recovery";

describe("task guidance history recovery", () => {
  it("proposes aliases for known historical guidance names and never backfills production", () => {
    const plan = buildTaskGuidanceHistoryRecoveryPlan({
      observedEventNames: [
        "daily_task_guidance_opened",
        "task_guidance_banner_viewed",
        "task_guidance_cta_clicked",
      ],
    });

    expect(plan.status).toBe("legacy_alias_candidate");
    expect(plan.productionMutationAllowed).toBe(false);
    expect(plan.aliasProposal).toEqual(expect.arrayContaining([
      { legacyEventName: "daily_task_guidance_opened", canonicalEventName: "task_guidance_viewed" },
      { legacyEventName: "task_guidance_cta_clicked", canonicalEventName: "task_guidance_tapped" },
    ]));
    expect(plan.nextAction).toContain("Keep the alias map");
  });
});
