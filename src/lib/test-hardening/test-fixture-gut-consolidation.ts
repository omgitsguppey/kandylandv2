import { buildGeneratedArtifactSizePolicyReport } from "./generated-artifact-size-policy";
import { buildQaHarnessConsolidationReport } from "./qa-harness-map";
import { currentDiffStats, currentGitHead, readJson, TEST_HARDENING_GENERATED_AT_UTC, validation, type ValidationResult } from "./test-hardening-shared";
import { buildTestFixtureInventoryReport } from "./test-fixture-inventory";
import { buildTestFixtureMemoryWritebackReport } from "./test-fixture-memory-writeback";
import { buildTestQualityGuardsReport } from "./test-quality-guards";
import { buildValidatorOwnershipMapReport } from "./validator-ownership-map";

export type TestFixtureGutConsolidationReport = {
  reportKey: "test-fixture-gut-consolidation";
  generatedAtUtc: string;
  currentHead: string;
  testsAudited: number;
  fixturesAudited: number;
  duplicateFixturesFound: number;
  duplicateFixturesRemoved: number;
  canonicalFactoriesAddedOrReused: number;
  validatorsAudited: number;
  validatorsRetired: number;
  validatorsConsolidated: number;
  mockEvidenceClassesAdded: number;
  generatedArtifactsShrunk: number;
  skippedTestsFound: number;
  unsafeUnknowns: number;
  memoryEntriesAdded: number;
  netAdditions: number;
  netDeletions: number;
  scoreBefore: number;
  scoreAfter: number;
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
};

export function buildTestFixtureGutConsolidationReport(): TestFixtureGutConsolidationReport {
  const fixture = buildTestFixtureInventoryReport();
  const validators = buildValidatorOwnershipMapReport();
  const quality = buildTestQualityGuardsReport();
  const size = buildGeneratedArtifactSizePolicyReport();
  const qa = buildQaHarnessConsolidationReport();
  const memory = buildTestFixtureMemoryWritebackReport();
  const diffStats = currentDiffStats();
  const betaScore = readJson<{ healthScore?: number; overallScore?: number }>("agent/state/public-beta-score.generated.json", {});
  const score = betaScore.healthScore ?? betaScore.overallScore ?? 0;
  const report: TestFixtureGutConsolidationReport = {
    reportKey: "test-fixture-gut-consolidation",
    generatedAtUtc: TEST_HARDENING_GENERATED_AT_UTC,
    currentHead: currentGitHead(),
    testsAudited: fixture.testsAudited,
    fixturesAudited: fixture.fixturesAudited,
    duplicateFixturesFound: fixture.duplicateFixturesFound,
    duplicateFixturesRemoved: 0,
    canonicalFactoriesAddedOrReused: fixture.canonicalFactoriesAddedOrReused,
    validatorsAudited: validators.validatorsAudited,
    validatorsRetired: validators.validatorsRetired,
    validatorsConsolidated: validators.validatorsConsolidated,
    mockEvidenceClassesAdded: fixture.mockEvidenceClasses.length,
    generatedArtifactsShrunk: size.generatedArtifactsShrunk,
    skippedTestsFound: quality.skippedTestsFound,
    unsafeUnknowns: fixture.unsafeUnknowns + validators.unclassifiedValidators + quality.unsafeUnknowns + size.unsafeUnknowns + qa.unsafeUnknowns,
    memoryEntriesAdded: memory.entriesAdded,
    netAdditions: diffStats.additions,
    netDeletions: diffStats.deletions,
    scoreBefore: score,
    scoreAfter: score,
    remainingGaps: [...fixture.remainingGaps.slice(0, 4), ...validators.remainingGaps.slice(0, 3), ...size.remainingGaps.slice(0, 3)],
    nextExactSteps: [
      "Replace touched local fake DTOs with canonical test factories.",
      "Retire or alias superseded validators when their owner lane changes.",
      "Keep generated artifacts compact and evidence-classified.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateTestFixtureGutConsolidationReport(report).failures;
  return report;
}

export function validateTestFixtureGutConsolidationReport(report: TestFixtureGutConsolidationReport): ValidationResult {
  const failures: string[] = [];
  if (report.fixturesAudited === 0) failures.push("fixture gut report has no fixture inventory.");
  if (report.validatorsAudited === 0) failures.push("fixture gut report has no validator inventory.");
  if (report.unsafeUnknowns > 0) failures.push("fixture gut report has unsafe unknowns.");
  if (report.memoryEntriesAdded < 5) failures.push("fixture gut report missing memory writeback.");
  return validation(failures.length === 0, failures);
}
