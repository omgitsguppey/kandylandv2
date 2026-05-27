import { buildTestFixtureMemoryWritebackReport, validateTestFixtureMemoryWritebackReport } from "@/lib/test-hardening/test-fixture-memory-writeback";
import { writeCompactJson, writeText } from "@/lib/test-hardening/test-hardening-shared";

const report = buildTestFixtureMemoryWritebackReport();
const validation = validateTestFixtureMemoryWritebackReport(report);

writeCompactJson("agent/state/test-fixture-memory-writeback.generated.json", { ...report, validation });
writeText("docs/agent-truth/test-fixture-memory-writeback.md", [
  "# Test Fixture Memory Writeback",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Memory source: ${report.memorySource}`,
  `Entries present: ${report.memoryEntriesPresent}/${report.memoryEntriesRequired}`,
  "",
  "## Patterns Captured",
  "",
  ...report.mistakePatternsCaptured.map((pattern) => `- ${pattern}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Test fixture memory writeback passed: entries=${report.memoryEntriesPresent}`);
