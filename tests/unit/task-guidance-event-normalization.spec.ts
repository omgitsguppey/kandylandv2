import { describe, expect, it } from "vitest";

import { buildHistoricalTaskAnalytics } from "@/lib/server/admin-analytics-historical-tasks";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import { classifyTrackingCapability } from "@/lib/privacy/consent-tracking-policy";

describe("task guidance event normalization", () => {
  it("maps guidance events through facts, consent policy, and historical rollups without counting as rewards", () => {
    expect(normalizeBehavioralEventFact({
      eventId: "fact-1",
      eventName: "daily_task_guidance_opened",
      timestamp: 1,
      params: { task_id: "task-1", route: "/experiences" },
    })?.normalizedAction).toBe("task_guidance_viewed");
    expect(normalizeBehavioralEventFact({
      eventId: "fact-2",
      eventName: "task_guidance_completed",
      timestamp: 2,
      params: { task_id: "task-1", route: "/experiences" },
    })?.normalizedAction).toBe("task_guidance_completed");
    expect(classifyTrackingCapability("task_guidance_viewed")).toBe("product_usage_minimal");

    const analytics = buildHistoricalTaskAnalytics({
      eventsData: {
        daily_task_guidance_opened: 2,
        task_guidance_viewed: 3,
        task_guidance_tapped: 1,
        task_guidance_dismissed: 1,
        task_guidance_completed: 1,
        task_card_expanded: 4,
        task_help_opened: 4,
      },
      normalizedTaskEvents: [],
    });

    expect(analytics.taskGuidance.guidanceViews).toBe(5);
    expect(analytics.taskGuidance.taskCardExpansions).toBe(4);
    expect(analytics.taskGuidance.taskHelpOpens).toBe(4);
    expect(analytics.taskGuidance.guidanceCompletions).toBe(1);
    expect(analytics.taskLeaderboard).toEqual([]);
  });
});
