import { assertBatch16, buildPlannerValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch16-shared";

const REPORT_PATH = "agent/state/ai-debug-planner.generated.json";
const DOC_PATH = "docs/agent-truth/ai-debug-planner.md";

export function validateAiDebugPlanner() {
  const report = buildPlannerValidationReport();
  const failures: string[] = [];
  assertBatch16(report.boundedContextPacket.deterministicPreflight === "pass", "Planner must run deterministic preflight.", failures);
  assertBatch16(report.providerCallAttempted === false, "Planner validator must not call provider.", failures);
  assertBatch16(report.deterministicFallbackStatus === "ready", "Planner must provide deterministic fallback.", failures);
  assertBatch16(report.proposalMode === "inspect_only", "Disabled planner must emit inspect-only proposal.", failures);
  assertBatch16(report.autoApplyAllowed === false, "Planner must not auto-apply.", failures);
  assertBatch16(report.boundedContextPacket.forbiddenPayloadFlags.length > 0, "Planner must redact raw bug/support/private payloads.", failures);
  assertBatch16(report.criticReviewRequiredForSourcePatch === true, "Source patches must require critic review.", failures);
  if (failures.length > 0) throw new Error(`AI debug planner validation failed:\n- ${failures.join("\n- ")}`);

  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# AI Debug Planner",
    "",
    "Status: bounded deterministic fallback and optional budgeted planner.",
    `- Planner status: ${report.plannerStatus}`,
    `- Provider call attempted in validator: ${report.providerCallAttempted}`,
    `- Token estimate: ${report.boundedContextPacket.tokenEstimate}/${report.boundedContextPacket.maxTokenBudget}`,
    `- Forbidden payload flags: ${report.boundedContextPacket.forbiddenPayloadFlags.join(", ")}`,
    "- Source patches require critic review and human approval.",
  ]);
  return report;
}

if (require.main === module) {
  const report = validateAiDebugPlanner();
  console.log(`AI debug planner passed: ${report.plannerStatus}, providerCallAttempted=${report.providerCallAttempted}.`);
}
