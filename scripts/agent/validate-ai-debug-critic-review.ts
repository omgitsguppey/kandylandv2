import { assertBatch16, buildCriticReviewValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch16-shared";

const REPORT_PATH = "agent/state/ai-debug-critic-review.generated.json";
const DOC_PATH = "docs/agent-truth/ai-debug-critic-review.md";

export function validateAiDebugCriticReview() {
  const report = buildCriticReviewValidationReport();
  const failures: string[] = [];
  assertBatch16(report.criticStatus === "critic_required_for_source_patch", "Source patches must require critic.", failures);
  assertBatch16(report.securityPrivacyCostCoverage.includes("security"), "Critic must check security.", failures);
  assertBatch16(report.securityPrivacyCostCoverage.includes("privacy"), "Critic must check privacy.", failures);
  assertBatch16(report.securityPrivacyCostCoverage.includes("cost"), "Critic must check cost.", failures);
  assertBatch16(report.paymentGumdropMathBlocked, "Critic must block payment/GumDrop math changes.", failures);
  assertBatch16(report.autoApplyBlocked, "Critic must block unsafe auto-apply.", failures);
  assertBatch16(report.formalEvidenceRequestStaysEvidence, "Typed evidence must not become code patch.", failures);
  if (failures.length > 0) throw new Error(`AI debug critic review validation failed:\n- ${failures.join("\n- ")}`);

  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# AI Debug Critic Review",
    "",
    "Status: source-patch proposals require critic review.",
    `- Critic status: ${report.criticStatus}`,
    `- Unsafe payment/GumDrop math blocked: ${report.paymentGumdropMathBlocked}`,
    `- Auto-apply blocked: ${report.autoApplyBlocked}`,
    "- Checks include security, privacy, cost, correctness, and test coverage.",
  ]);
  return report;
}

if (require.main === module) {
  const report = validateAiDebugCriticReview();
  console.log(`AI debug critic review passed: ${report.criticStatus}.`);
}
