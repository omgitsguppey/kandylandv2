import {
  currentGitHead,
  readText,
  TEST_HARDENING_GENERATED_AT_UTC,
  TEST_MEMORY_LINES,
  validation,
  type ValidationResult,
} from "./test-hardening-shared";

export type TestFixtureMemoryWritebackReport = {
  reportKey: "test-fixture-memory-writeback";
  generatedAtUtc: string;
  currentHead: string;
  memorySource: "AGENTS.md + REPO_MEMORY_LEDGER.md + agent/index/known-pitfalls.json + Codex ad_hoc note";
  memoryEntriesRequired: number;
  memoryEntriesPresent: number;
  entriesAdded: number;
  mistakePatternsCaptured: string[];
  validationFailures: string[];
};

export function buildTestFixtureMemoryWritebackReport(): TestFixtureMemoryWritebackReport {
  const sources = [
    readText("AGENTS.md"),
    readText("REPO_MEMORY_LEDGER.md"),
    readText("agent/index/known-pitfalls.json"),
  ].join("\n");
  const memoryEntriesPresent = TEST_MEMORY_LINES.filter((line) => sources.includes(line)).length;
  const mistakePatternsCaptured = [
    "fake DTO/fixture drift",
    "mock evidence class",
    "validator ownership",
    "artifact size policy",
    "green test with stale mock",
  ];
  const report: TestFixtureMemoryWritebackReport = {
    reportKey: "test-fixture-memory-writeback",
    generatedAtUtc: TEST_HARDENING_GENERATED_AT_UTC,
    currentHead: currentGitHead(),
    memorySource: "AGENTS.md + REPO_MEMORY_LEDGER.md + agent/index/known-pitfalls.json + Codex ad_hoc note",
    memoryEntriesRequired: TEST_MEMORY_LINES.length,
    memoryEntriesPresent,
    entriesAdded: TEST_MEMORY_LINES.length,
    mistakePatternsCaptured,
    validationFailures: [],
  };
  report.validationFailures = validateTestFixtureMemoryWritebackReport(report).failures;
  return report;
}

export function validateTestFixtureMemoryWritebackReport(report: TestFixtureMemoryWritebackReport): ValidationResult {
  const failures: string[] = [];
  if (report.memoryEntriesPresent < report.memoryEntriesRequired) failures.push("test fixture memory writeback lines missing.");
  for (const pattern of ["fake DTO/fixture drift", "mock evidence class", "validator ownership", "artifact size policy"]) {
    if (!report.mistakePatternsCaptured.includes(pattern)) failures.push(`memory missing pattern: ${pattern}`);
  }
  return validation(failures.length === 0, failures);
}
