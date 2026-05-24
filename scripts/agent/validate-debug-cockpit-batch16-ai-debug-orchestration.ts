import { assertBatch16, buildFinalBatch16ValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch16-shared";

const REPORT_PATH = "agent/state/debug-cockpit-batch16-ai-debug-orchestration.generated.json";
const DOC_PATH = "docs/agent-truth/debug-cockpit-batch16-ai-debug-orchestration.md";

export function validateDebugCockpitBatch16AiDebugOrchestration() {
  const report = buildFinalBatch16ValidationReport();
  const failures: string[] = [];
  assertBatch16(String(report.taskIssueAttributionStatusAfter) !== "healthy_current", "Task zero-sample lane must not be healthy.", failures);
  assertBatch16(String(report.repairQueueStatusAfter) !== "healthy_current", "Repair zero-sample lane must not be healthy.", failures);
  assertBatch16(String(report.bugTriageStatusAfter) !== "healthy_current", "Bug zero-sample lane must not be healthy.", failures);
  assertBatch16(report.manualUtilityStatus === "manual_utility_not_health", "Manual utility must not be live health.", failures);
  assertBatch16(report.aiPlannerStatus === "deterministic_fallback_ready", "AI planner must have deterministic fallback.", failures);
  assertBatch16(report.aiCriticStatus === "critic_required_for_source_patch", "AI source patches must require critic.", failures);
  assertBatch16(report.providerCallsInTests === false, "Provider calls must be blocked in tests.", failures);
  assertBatch16(report.privacyRedactionStatus === "raw_bodies_blocked", "Raw PII/support/user bodies must be blocked.", failures);
  assertBatch16(report.scoreDimensions.length >= 6, "Score dimensions missing.", failures);
  assertBatch16(report.openPrsClassified === true, "Open PRs must be classified.", failures);
  assertBatch16(report.dirtyFilesClassified === true, "Dirty files must be classified.", failures);
  if (failures.length > 0) throw new Error(`Debug cockpit Batch 16 validation failed:\n- ${failures.join("\n- ")}`);

  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Debug Cockpit Batch 16 AI Debug Orchestration",
    "",
    "Status: AI debug is modeled as bounded async work items, optional budgeted planning, critic review, and human-approved repair proposals.",
    `- Task issues: ${report.taskIssueAttributionStatusBefore} -> ${report.taskIssueAttributionStatusAfter}`,
    `- Repair queue: ${report.repairQueueStatusBefore} -> ${report.repairQueueStatusAfter}`,
    `- Bug triage: ${report.bugTriageStatusBefore} -> ${report.bugTriageStatusAfter}`,
    `- Manual utilities: ${report.manualUtilityStatus}`,
    `- AI planner: ${report.aiPlannerStatus}`,
    `- AI critic: ${report.aiCriticStatus}`,
    `- Provider calls in tests: ${report.providerCallsInTests}`,
    "",
    "## Release Notes",
    ...report.releaseNotes.map((note) => `- ${note}`),
  ]);
  return report;
}

if (require.main === module) {
  const report = validateDebugCockpitBatch16AiDebugOrchestration();
  console.log(`Debug cockpit Batch 16 passed: planner=${report.aiPlannerStatus}, critic=${report.aiCriticStatus}.`);
}
