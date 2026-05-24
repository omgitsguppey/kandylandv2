import { describe, expect, it } from "vitest";

import { classifyBugIntakeTriageStatus } from "@/lib/debug/bug-intake-triage-status";
import { classifyRepairQueueStatus } from "@/lib/debug/repair-queue-status";
import { classifyTaskIssueAttributionStatus } from "@/lib/debug/task-issue-attribution-status";
import { buildAiDebugQueueTruthReport } from "@/lib/debug/ai-debug-queue-truth";

describe("ai debug queue truth", () => {
  it("does not mark zero task issues healthy without a source window", () => {
    const status = classifyTaskIssueAttributionStatus({
      impactedUsers: 0,
      sampleLoaded: false,
      sourceWindow: null,
    });

    expect(status.status).toBe("source_ready_no_sample_loaded");
    expect(status.provenZero).toBe(false);
    expect(status.nextAction).toContain("Load");
  });

  it("only treats zero task issues as healthy when source window proves zero", () => {
    const status = classifyTaskIssueAttributionStatus({
      impactedUsers: 0,
      sampleLoaded: true,
      sourceWindow: { from: "2026-05-24T00:00:00.000Z", to: "2026-05-24T01:00:00.000Z" },
    });

    expect(status.status).toBe("healthy_proven_zero");
    expect(status.provenZero).toBe(true);
  });

  it("keeps zero repair proposals and bug reports as no-sample without loaded sources", () => {
    expect(classifyRepairQueueStatus({
      actionableRepairs: 0,
      inspectOnly: 0,
      duplicatesCollapsed: 0,
      contaminationRisks: 0,
      orchestrationSampleLoaded: false,
    }).status).toBe("source_ready_no_sample_loaded");

    expect(classifyBugIntakeTriageStatus({
      loaded: 0,
      last7d: 0,
      olderBacklog: 3,
      needsTriage: 0,
      intakeSampleLoaded: false,
    })).toMatchObject({
      status: "source_ready_no_sample_loaded",
      currentIntakeCount: 0,
      olderBacklogCount: 3,
    });
  });

  it("builds work items only from loaded source samples and preserves contamination gates", () => {
    const report = buildAiDebugQueueTruthReport({
      taskIssues: { impactedUsers: 0, sampleLoaded: false, sourceWindow: null },
      repairs: {
        actionableRepairs: 1,
        inspectOnly: 1,
        duplicatesCollapsed: 2,
        contaminationRisks: 1,
        orchestrationSampleLoaded: true,
      },
      bugIntake: {
        loaded: 0,
        last7d: 0,
        olderBacklog: 0,
        needsTriage: 0,
        intakeSampleLoaded: false,
      },
      manualUtilityCount: 1,
    });

    expect(report.taskIssueStatus.status).toBe("source_ready_no_sample_loaded");
    expect(report.repairQueueStatus.status).toBe("degraded_current");
    expect(report.bugTriageStatus.status).toBe("source_ready_no_sample_loaded");
    expect(report.manualUtilitiesAffectHealth).toBe(false);
    expect(report.workItems.every((item) => item.source !== "manual_operator_note")).toBe(true);
    expect(report.contaminationRiskGate).toBe("review_required");
  });
});
