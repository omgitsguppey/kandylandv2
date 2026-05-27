import { buildTestQualityGuardsReport, validateTestQualityGuardsReport } from "@/lib/test-hardening/test-quality-guards";
import { writeCompactJson, writeText } from "@/lib/test-hardening/test-hardening-shared";

const report = buildTestQualityGuardsReport();
const validation = validateTestQualityGuardsReport(report);
const compact = {
  ...report,
  findings: report.findings.slice(0, 40),
  validation,
};

writeCompactJson("agent/state/test-quality-guards.generated.json", compact);
writeText("docs/agent-truth/test-quality-guards.md", [
  "# Test Quality Guards",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Files audited: ${report.filesAudited}`,
  `Focused tests found: ${report.onlyTestsFound}`,
  `Skipped tests found: ${report.skippedTestsFound}`,
  `Unsafe unknowns: ${report.unsafeUnknowns}`,
  "",
  "## Guardrails",
  "",
  "- Provider calls are forbidden in source/unit harnesses.",
  "- Production reads are forbidden in source/unit harnesses.",
  "- New deterministic tests must use stable clocks and IDs.",
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Test quality guards passed: files=${report.filesAudited} only=${report.onlyTestsFound}`);
