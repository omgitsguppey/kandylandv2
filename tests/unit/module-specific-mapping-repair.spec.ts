import { describe, expect, it } from "vitest";

import { buildModuleCoverageEvidence } from "@/lib/server/admin-analytics-historical-validation";

const timestamp = Date.parse("2026-05-24T15:57:48.000Z");

describe("module-specific mapping repair", () => {
  it("counts canonical internal evidence for task, engagement, admin, runtime, and unlock/watch modules", () => {
    const evidence = buildModuleCoverageEvidence({
      gaEventCounts: {},
      telemetryEventCounts: {},
      canonicalEventCounts: {
        task_completed: 20,
        page_viewed: 100,
      },
      gaLastSeenAtMs: timestamp,
      snapshotLastSeenAtMs: timestamp,
      legacyLastSeenAtMs: timestamp,
      normalizedTaskEventCount: 500,
      firstPartyTaskLifecycleEvents: 2817,
      taskPipeline: [{ label: "Task guidance", count: 376 }],
      pageRollupViewCount: 0,
      guestInteractionCount: 0,
      completedPurchaseTransactionsCount: 5,
      firstPartyPurchaseCount: 13,
      telemetryPurchaseCount: 0,
      unlockTransactionsCount: 47,
      firstPartyUnlockCount: 145,
      telemetryUnlockCount: 0,
      watchSessionCount: 200,
      viewerSessionFactCount: 370,
      filteredSessionFactsLength: 370,
      viewerSessionStartedLogsLength: 0,
      pipelineFailureCount: 2,
      pipelineFailureClusters: [],
      truthStateScore: 80,
      generatedAtUtc: "2026-05-24T15:57:48.000Z",
    });

    expect(evidence.daily_tasks?.task_lifecycle?.count).toBe(500);
    expect(evidence.task_guidance?.task_pipeline?.count).toBe(376);
    expect(evidence.unlock_watch?.unlock_transactions?.count).toBe(47);
    expect(evidence.unlock_watch?.watch_sessions?.count).toBe(200);
    expect(evidence.unlock_watch?.session_facts?.count).toBe(370);
    expect(evidence.engagement?.event_facts?.count).toBeGreaterThan(0);
    expect(evidence.admin?.admin_truth_snapshot?.count).toBe(1);
    expect(evidence.runtime?.route_runtime?.count).toBeGreaterThan(0);
  });
});
