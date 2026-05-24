import type { AiDebugWorkItem } from "./ai-debug-orchestration-contract";
import { classifyBugIntakeTriageStatus } from "./bug-intake-triage-status";
import { classifyRepairQueueStatus } from "./repair-queue-status";
import { classifyTaskIssueAttributionStatus } from "./task-issue-attribution-status";

export function buildAiDebugQueueTruthReport(input: {
  taskIssues: Parameters<typeof classifyTaskIssueAttributionStatus>[0];
  repairs: Parameters<typeof classifyRepairQueueStatus>[0];
  bugIntake: Parameters<typeof classifyBugIntakeTriageStatus>[0];
  manualUtilityCount: number;
}) {
  const taskIssueStatus = classifyTaskIssueAttributionStatus(input.taskIssues);
  const repairQueueStatus = classifyRepairQueueStatus(input.repairs);
  const bugTriageStatus = classifyBugIntakeTriageStatus(input.bugIntake);
  const workItems: AiDebugWorkItem[] = [];

  if (taskIssueStatus.status === "degraded_current") {
    workItems.push({
      workItemId: "task-issue-attribution",
      source: "task_issue",
      severity: "p2",
      owner: "tasks",
      status: "queued",
      scoreImpact: 1,
      privacyClass: "internal",
      sourceRefs: ["src/lib/tasks/daily-task-contract.ts"],
      redactionPolicy: "strip_user_bodies",
      contaminationRisk: "low",
      applyEligibility: "human_approval_required",
      nextAction: taskIssueStatus.nextAction,
    });
  }

  if (repairQueueStatus.status === "degraded_current") {
    workItems.push({
      workItemId: "repair-queue-review",
      source: "repair_proposal",
      severity: input.repairs.contaminationRisks > 0 ? "p1" : "p2",
      owner: "admin_debug",
      status: "critic_review_required",
      scoreImpact: input.repairs.actionableRepairs,
      privacyClass: "internal",
      sourceRefs: ["src/lib/debug/repair-queue-status.ts"],
      redactionPolicy: "metadata_only",
      contaminationRisk: input.repairs.contaminationRisks > 0 ? "medium" : "low",
      applyEligibility: "human_approval_required",
      nextAction: repairQueueStatus.nextAction,
    });
  }

  if (bugTriageStatus.status === "degraded_current") {
    workItems.push({
      workItemId: "bug-intake-triage",
      source: "bug_report",
      severity: "p2",
      owner: "support",
      status: "queued",
      scoreImpact: input.bugIntake.needsTriage,
      privacyClass: "sensitive",
      sourceRefs: ["src/lib/server/support-threads.ts"],
      redactionPolicy: "strip_user_bodies",
      contaminationRisk: "medium",
      applyEligibility: "human_approval_required",
      nextAction: bugTriageStatus.nextAction,
    });
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    taskIssueStatus,
    repairQueueStatus,
    bugTriageStatus,
    manualUtilityCount: input.manualUtilityCount,
    manualUtilitiesAffectHealth: false,
    workItems,
    contaminationRiskGate: input.repairs.contaminationRisks > 0 ? "review_required" as const : "clear" as const,
  };
}
