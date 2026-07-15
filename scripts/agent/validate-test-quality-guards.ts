import { buildTestQualityGuardsReport, validateTestQualityGuardsReport } from "@/lib/test-hardening/test-quality-guards";
import { writeCompactJson, writeText } from "@/lib/test-hardening/test-hardening-shared";
import { withGeneratedReportEnvelope } from "./generated-report-envelope";

const report = buildTestQualityGuardsReport({ generatedAtUtc: new Date().toISOString() });
const validation = validateTestQualityGuardsReport(report);
const compact = withGeneratedReportEnvelope({
  ...report,
  findingCount: report.findings.length,
  findings: report.findings.slice(0, 40),
  validation,
}, {
  reportKey: "test-quality-guards",
  status: validation.ok ? "pass" : "fail",
  evidenceClass: "source_snapshot",
  canClearSourceGate: validation.ok,
  nextExactSteps: report.nextExactSteps,
  validationFailures: validation.failures,
  doesNotProve: [
    "Does not prove runtime behavior.",
    "Does not prove provider availability.",
    "Does not clear release proof gates for documented provider_call or production_read exceptions.",
  ],
});

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
  "- Documented provider_call / production_read exceptions are source hygiene signals only and cannot clear release/proof gates.",
  "- New deterministic tests must use stable clocks and IDs.",
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Test quality guards passed: files=${report.filesAudited} only=${report.onlyTestsFound}`);
