import { CANONICAL_TEST_FACTORY_NAMES } from "@/lib/testing/canonical-test-factories";
import { MOCK_EVIDENCE_CLASSES, type MockEvidenceClass } from "@/lib/testing/mock-evidence-classifier";

import {
  classifyTestDomain,
  countMatches,
  currentGitHead,
  hasCanonicalImport,
  listFiles,
  readText,
  TEST_HARDENING_GENERATED_AT_UTC,
  unique,
  validation,
  type SharedTypeDomain,
  type ValidationResult,
} from "./test-hardening-shared";

export type TestFixtureAction =
  | "keep"
  | "consolidate"
  | "replace_with_factory"
  | "remove"
  | "mark_fixture_only"
  | "unsafe_unknown";

export type TestFixtureInventoryEntry = {
  fixtureName: string;
  file: string;
  domain: SharedTypeDomain;
  canonicalTypeUsed: boolean;
  canonicalSchemaUsed: boolean;
  mockEvidenceClass: MockEvidenceClass;
  driftRisk: "low" | "medium" | "high";
  duplicateCandidates: string[];
  action: TestFixtureAction;
  deferredOwner?: string;
  deferredReason?: string;
};

export type TestFixtureInventoryReport = {
  reportKey: "test-fixture-inventory";
  generatedAtUtc: string;
  currentHead: string;
  testsAudited: number;
  fixturesAudited: number;
  duplicateFixturesFound: number;
  duplicateFixturesRemoved: number;
  canonicalFactories: readonly string[];
  canonicalFactoriesAddedOrReused: number;
  mockEvidenceClasses: readonly MockEvidenceClass[];
  entries: TestFixtureInventoryEntry[];
  severityCounts: Record<TestFixtureInventoryEntry["driftRisk"], number>;
  actionCounts: Record<TestFixtureAction, number>;
  unsafeUnknowns: number;
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
};

const FIXTURE_PATTERN = /\b(fixture|mock|sample|fake|stub|dummy|testData)\b/giu;

function evidenceClassFor(path: string, text: string): MockEvidenceClass {
  if (/operator/i.test(path) || /operator_like/iu.test(text)) return "operator_like";
  if (/provider|paypal|stripe|google-cloud|vertexai/iu.test(path) || /provider_like/iu.test(text)) return "provider_like";
  if (/admin/iu.test(path) || /admin_like/iu.test(text)) return "admin_like";
  if (/runtime|route|smoke/iu.test(path) || /runtime_like/iu.test(text)) return "runtime_like";
  if (/source_only|source-only|source schema/iu.test(text)) return "source_only";
  return "fixture_only";
}

function fixtureNameFromPath(path: string) {
  return path.split("/").pop()?.replace(/\.(spec|test)\.(ts|tsx)$/u, "").replace(/\.(ts|tsx|json|md)$/u, "") ?? path;
}

function countDirectFixtureDoubles(text: string) {
  const withoutDisplaySafetyTerms = text.replace(/\bfakeZero[A-Za-z_]*\b/gu, "");
  return countMatches(withoutDisplaySafetyTerms, /\bfake[A-Z_]|\bmock[A-Z_]|\bas any\b/gu);
}

function deferredOwnerFor(domain: SharedTypeDomain, file: string) {
  if (/support/iu.test(file)) return "support";
  if (/route|request|guardApiRequest|adminDb|firestore/iu.test(file)) return "route_fixture";
  if (domain === "analytics" || domain === "person_metrics") return "telemetry";
  if (domain === "debug" || domain === "release_readiness") return "admin_truth";
  if (domain === "payment" || domain === "gumdrop") return "gumdrop";
  if (domain === "creator") return "creator";
  if (domain === "user") return "user";
  return "test-hardening";
}

function deferredReasonFor(entry: {
  file: string;
  domain: SharedTypeDomain;
  canonicalTypeUsed: boolean;
  driftRisk: TestFixtureInventoryEntry["driftRisk"];
}) {
  if (entry.canonicalTypeUsed) return undefined;
  if (/route|request|guardApiRequest|adminDb|firestore/iu.test(entry.file)) {
    return "Route and Firestore harnesses still use local test doubles; defer until a canonical route/request factory is introduced.";
  }
  if (entry.driftRisk === "high") {
    return "Local fake/mock shape should be replaced with the canonical factory for this domain when the owning validator is touched.";
  }
  return "Fixture is source-only evidence and should stay explicitly fixture-only until an owning canonical factory exists.";
}

export function buildTestFixtureInventoryReport(): TestFixtureInventoryReport {
  const files = listFiles(["tests", "scripts/agent", "src/lib/testing"], [".ts", ".tsx", ".json"]);
  const testFiles = files.filter((file) => /(^tests\/|\.spec\.|\.test\.)/u.test(file));
  const candidateFiles = files.filter((file) => {
    const text = readText(file);
    return FIXTURE_PATTERN.test(text) || /(^tests\/(fixtures|mocks|support|setup)\/|src\/lib\/testing\/)/u.test(file);
  });
  const names = candidateFiles.map(fixtureNameFromPath);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);

  const entries: TestFixtureInventoryEntry[] = candidateFiles.map((file) => {
    const text = readText(file);
    const fixtureName = fixtureNameFromPath(file);
    const domain = classifyTestDomain(file, text.slice(0, 800));
    const canonicalTypeUsed = hasCanonicalImport(text, domain) || /src\/lib\/testing\/canonical-test-factories\.ts$/u.test(file);
    const canonicalSchemaUsed = canonicalTypeUsed || /z\.object|validate[A-Z]|schema/iu.test(text);
    const mockEvidenceClass = evidenceClassFor(file, text);
    const directFakeCount = countDirectFixtureDoubles(text);
    const driftRisk: TestFixtureInventoryEntry["driftRisk"] = !canonicalTypeUsed && directFakeCount > 0 ? "high" : !canonicalTypeUsed ? "medium" : "low";
    const duplicateCandidates = duplicateNames.includes(fixtureName) ? candidateFiles.filter((candidate) => fixtureNameFromPath(candidate) === fixtureName && candidate !== file) : [];
    const action: TestFixtureAction = driftRisk === "high"
      ? "replace_with_factory"
      : duplicateCandidates.length > 0
        ? "consolidate"
        : mockEvidenceClass === "fixture_only"
          ? "mark_fixture_only"
          : "keep";
    const deferredReason = deferredReasonFor({ file, domain, canonicalTypeUsed, driftRisk });
    return {
      fixtureName,
      file,
      domain,
      canonicalTypeUsed,
      canonicalSchemaUsed,
      mockEvidenceClass,
      driftRisk,
      duplicateCandidates,
      action,
      ...(deferredReason ? {
        deferredOwner: deferredOwnerFor(domain, file),
        deferredReason,
      } : {}),
    };
  });
  const severityCounts = {
    low: entries.filter((entry) => entry.driftRisk === "low").length,
    medium: entries.filter((entry) => entry.driftRisk === "medium").length,
    high: entries.filter((entry) => entry.driftRisk === "high").length,
  };
  const actionCounts = {
    keep: entries.filter((entry) => entry.action === "keep").length,
    consolidate: entries.filter((entry) => entry.action === "consolidate").length,
    replace_with_factory: entries.filter((entry) => entry.action === "replace_with_factory").length,
    remove: entries.filter((entry) => entry.action === "remove").length,
    mark_fixture_only: entries.filter((entry) => entry.action === "mark_fixture_only").length,
    unsafe_unknown: entries.filter((entry) => entry.action === "unsafe_unknown").length,
  };

  const report: TestFixtureInventoryReport = {
    reportKey: "test-fixture-inventory",
    generatedAtUtc: TEST_HARDENING_GENERATED_AT_UTC,
    currentHead: currentGitHead(),
    testsAudited: testFiles.length,
    fixturesAudited: entries.length,
    duplicateFixturesFound: entries.filter((entry) => entry.duplicateCandidates.length > 0).length,
    duplicateFixturesRemoved: 0,
    canonicalFactories: CANONICAL_TEST_FACTORY_NAMES,
    canonicalFactoriesAddedOrReused: CANONICAL_TEST_FACTORY_NAMES.length,
    mockEvidenceClasses: MOCK_EVIDENCE_CLASSES.filter((evidenceClass) => evidenceClass !== "unsafe_unknown"),
    entries,
    severityCounts,
    actionCounts,
    unsafeUnknowns: entries.filter((entry) => entry.action === "unsafe_unknown" || entry.mockEvidenceClass === "unsafe_unknown").length,
    remainingGaps: unique(entries.filter((entry) => entry.deferredReason).map((entry) => `${entry.file}: ${entry.deferredReason}`)),
    nextExactSteps: [
      "Use src/lib/testing/canonical-test-factories.ts before adding new fixture DTOs.",
      "Classify every mock evidence boundary before it can feed release/readiness checks.",
      "Retire duplicate fixtures when touched by their owning validator or domain test.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateTestFixtureInventoryReport(report).failures;
  return report;
}

export function validateTestFixtureInventoryReport(report: TestFixtureInventoryReport): ValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  if (report.fixturesAudited === 0) failures.push("fixture inventory found no fixtures.");
  if (!report.canonicalFactories.includes("buildCanonicalEventEnvelopeFixture")) failures.push("canonical event envelope fixture missing.");
  if (!report.canonicalFactories.includes("buildCanonicalGumDropLedgerFixture")) failures.push("canonical GumDrop ledger fixture missing.");
  if (!report.canonicalFactories.includes("buildCanonicalSupportThreadFixture")) failures.push("canonical support fixture missing.");
  if (!report.mockEvidenceClasses.includes("fixture_only")) failures.push("fixture_only mock evidence class missing.");
  if (report.unsafeUnknowns > 0) failures.push("fixture inventory contains unsafe_unknown entries.");
  const unownedDeferred = report.entries.filter((entry) => entry.deferredReason && !entry.deferredOwner);
  if (unownedDeferred.length > 0) failures.push(`fixture inventory has unowned deferred fixtures: ${unownedDeferred.length}`);
  if (report.entries.some((entry) => entry.mockEvidenceClass === "source_only" && entry.action === "keep" && !entry.canonicalTypeUsed)) {
    warnings.push("source_only mock exists without canonical type import.");
  }
  return validation(failures.length === 0, failures, warnings);
}
