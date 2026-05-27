import { buildTestFixtureInventoryReport, validateTestFixtureInventoryReport } from "@/lib/test-hardening/test-fixture-inventory";
import { writeCompactJson, writeText } from "@/lib/test-hardening/test-hardening-shared";

const report = buildTestFixtureInventoryReport();
const validation = validateTestFixtureInventoryReport(report);
const compact = {
  ...report,
  entries: report.entries.slice(0, 25),
  validation,
};

writeCompactJson("agent/state/test-fixture-inventory.generated.json", compact);
writeText("docs/agent-truth/test-fixture-inventory.md", [
  "# Test Fixture Inventory",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Fixtures audited: ${report.fixturesAudited}`,
  `Duplicate fixtures found: ${report.duplicateFixturesFound}`,
  `Unsafe unknowns: ${report.unsafeUnknowns}`,
  "",
  "## Top Fixture Risks",
  "",
  ...report.remainingGaps.slice(0, 10).map((gap) => `- ${gap}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Test fixture inventory passed: fixtures=${report.fixturesAudited} duplicates=${report.duplicateFixturesFound}`);
