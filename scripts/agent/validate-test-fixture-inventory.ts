import { buildTestFixtureInventoryReport, validateTestFixtureInventoryReport } from "@/lib/test-hardening/test-fixture-inventory";
import { writeCompactJson, writeText } from "@/lib/test-hardening/test-hardening-shared";
import { withGeneratedReportEnvelope } from "./generated-report-envelope";

const report = buildTestFixtureInventoryReport();
const validation = validateTestFixtureInventoryReport(report);
const compact = withGeneratedReportEnvelope({
  ...report,
  entries: [
    ...report.entries.filter((entry) => entry.driftRisk === "high").slice(0, 30),
    ...report.entries.filter((entry) => entry.driftRisk !== "high").slice(0, 30),
  ].slice(0, 60),
  remainingGapCount: report.remainingGaps.length,
  remainingGaps: report.remainingGaps.slice(0, 40),
  validation,
}, {
  reportKey: "test-fixture-inventory",
  status: validation.ok ? "pass" : "fail",
  evidenceClass: "source_snapshot",
  canClearSourceGate: validation.ok,
  nextExactSteps: report.nextExactSteps,
  validationFailures: validation.failures,
  doesNotProve: [
    "Does not prove fixture behavior in deployed runtime.",
    "Does not prove provider/admin/runtime truth.",
    "Does not allow raw live user activity as fixture content.",
  ],
});

writeCompactJson("agent/state/test-fixture-inventory.generated.json", compact);
writeText("docs/agent-truth/test-fixture-inventory.md", [
  "# Test Fixture Inventory",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Fixtures audited: ${report.fixturesAudited}`,
  `Duplicate fixtures found: ${report.duplicateFixturesFound}`,
  `Unsafe unknowns: ${report.unsafeUnknowns}`,
  `Severity counts: low=${report.severityCounts.low}, medium=${report.severityCounts.medium}, high=${report.severityCounts.high}`,
  `Action counts: ${Object.entries(report.actionCounts).map(([key, value]) => `${key}=${value}`).join(", ")}`,
  `Remaining gap count: ${report.remainingGaps.length}`,
  "",
  "## Top Fixture Risks",
  "",
  ...report.remainingGaps.slice(0, 40).map((gap) => `- ${gap}`),
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Test fixture inventory passed: fixtures=${report.fixturesAudited} duplicates=${report.duplicateFixturesFound}`);
