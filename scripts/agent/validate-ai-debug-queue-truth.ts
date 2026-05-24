import { assertBatch16, buildQueueTruthValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch16-shared";

const REPORT_PATH = "agent/state/ai-debug-queue-truth.generated.json";
const DOC_PATH = "docs/agent-truth/ai-debug-queue-truth.md";

export function validateAiDebugQueueTruth() {
  const report = buildQueueTruthValidationReport();
  const failures: string[] = [];
  assertBatch16(report.taskIssueStatus.status === "source_ready_no_sample_loaded", "Zero task issues without source window must not be healthy.", failures);
  assertBatch16(report.repairQueueStatus.status === "source_ready_no_sample_loaded", "Zero repairs without orchestration sample must not be healthy.", failures);
  assertBatch16(report.bugTriageStatus.status === "source_ready_no_sample_loaded", "Zero bug reports without intake sample must not be healthy.", failures);
  assertBatch16(report.manualUtilitiesAffectHealth === false, "Manual utilities must not affect live health.", failures);
  assertBatch16(report.contaminationRiskGate === "clear", "Repair queue must expose contamination-risk gate.", failures);
  if (failures.length > 0) throw new Error(`AI debug queue truth validation failed:\n- ${failures.join("\n- ")}`);

  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# AI Debug Queue Truth",
    "",
    "Status: zero-count task, bug, and repair lanes are no-sample until source windows load.",
    `- Task issue status: ${report.taskIssueStatus.status}`,
    `- Repair queue status: ${report.repairQueueStatus.status}`,
    `- Bug triage status: ${report.bugTriageStatus.status}`,
    `- Manual utilities affect health: ${report.manualUtilitiesAffectHealth}`,
  ]);
  return report;
}

if (require.main === module) {
  const report = validateAiDebugQueueTruth();
  console.log(`AI debug queue truth passed: task=${report.taskIssueStatus.status} repairs=${report.repairQueueStatus.status} bugs=${report.bugTriageStatus.status}.`);
}
