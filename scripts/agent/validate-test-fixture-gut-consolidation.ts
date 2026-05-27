import { buildTestFixtureGutConsolidationReport, validateTestFixtureGutConsolidationReport } from "@/lib/test-hardening/test-fixture-gut-consolidation";
import { writeCompactJson, writeText } from "@/lib/test-hardening/test-hardening-shared";

const report = buildTestFixtureGutConsolidationReport();
const validation = validateTestFixtureGutConsolidationReport(report);

writeCompactJson("agent/state/test-fixture-gut-consolidation.generated.json", { ...report, validation });
writeText("docs/agent-truth/test-fixture-gut-consolidation.md", [
  "# Test Fixture Gut Consolidation",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Tests audited: ${report.testsAudited}`,
  `Fixtures audited: ${report.fixturesAudited}`,
  `Validators audited: ${report.validatorsAudited}`,
  `Mock evidence classes added: ${report.mockEvidenceClassesAdded}`,
  `Unsafe unknowns: ${report.unsafeUnknowns}`,
  "",
  "## Remaining Gaps",
  "",
  ...report.remainingGaps.slice(0, 10).map((gap) => `- ${gap}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Test fixture gut consolidation passed: fixtures=${report.fixturesAudited} validators=${report.validatorsAudited}`);
