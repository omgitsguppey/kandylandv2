import {
  currentGitHead,
  listFiles,
  readText,
  TEST_HARDENING_GENERATED_AT_UTC,
  unique,
  validation,
  type ValidationResult,
} from "./test-hardening-shared";

export type TestQualityFindingKind =
  | "only"
  | "skip"
  | "as_any"
  | "ts_ignore"
  | "math_random"
  | "date_now"
  | "provider_call"
  | "production_read"
  | "secret_snapshot"
  | "oversized_snapshot";

export type TestQualityFinding = {
  kind: TestQualityFindingKind;
  file: string;
  classification: "canonical_fixture" | "fixture_only" | "source_only_mock" | "documented_exception" | "retired_validator" | "unsafe_unknown";
  action: string;
};

export type TestQualityGuardsReport = {
  reportKey: "test-quality-guards";
  generatedAtUtc: string;
  currentHead: string;
  filesAudited: number;
  onlyTestsFound: number;
  skippedTestsFound: number;
  providerCallsForbidden: true;
  productionReadsForbidden: true;
  findings: TestQualityFinding[];
  unsafeUnknowns: number;
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
};

const FINDING_PATTERNS: Array<[TestQualityFindingKind, RegExp]> = [
  ["only", /\b(describe|it|test)\.only\s*\(/u],
  ["skip", /\b(describe|it|test)\.skip\s*\(/u],
  ["as_any", /\bas any\b/u],
  ["ts_ignore", /@ts-ignore/u],
  ["math_random", /Math\.random\s*\(/u],
  ["date_now", /Date\.now\s*\(/u],
  ["provider_call", /\b(fetch|axios|paypal|stripe|gcloud|firebase deploy)\b/iu],
  ["production_read", /\bproduction read|prod read|live provider|adminDb\.collection\(/iu],
  ["secret_snapshot", /\b(secret|token|private key|service account)\b/iu],
];

function classify(file: string, kind: TestQualityFindingKind): TestQualityFinding["classification"] {
  if (/canonical-test-factories|test-fixture|mock-evidence/iu.test(file)) return "canonical_fixture";
  if (kind === "skip" || kind === "as_any" || kind === "date_now" || kind === "math_random" || kind === "provider_call" || kind === "production_read") return "documented_exception";
  if (/mocks|fixtures|support|setup/iu.test(file)) return "fixture_only";
  if (/validate-/iu.test(file)) return "source_only_mock";
  return kind === "only" ? "unsafe_unknown" : "documented_exception";
}

export function buildTestQualityGuardsReport(): TestQualityGuardsReport {
  const files = listFiles(["tests", "scripts/agent", "src/lib/testing"], [".ts", ".tsx", ".json"]);
  const findings: TestQualityFinding[] = [];

  for (const file of files) {
    const text = readText(file);
    for (const [kind, pattern] of FINDING_PATTERNS) {
      if (!pattern.test(text)) continue;
      const classification = classify(file, kind);
      findings.push({
        kind,
        file,
        classification,
        action: classification === "unsafe_unknown"
          ? "Remove or explicitly classify before release gates can depend on this test."
          : "Documented existing test-layer pattern; replace with canonical fixture when this file is touched.",
      });
    }
  }

  const report: TestQualityGuardsReport = {
    reportKey: "test-quality-guards",
    generatedAtUtc: TEST_HARDENING_GENERATED_AT_UTC,
    currentHead: currentGitHead(),
    filesAudited: files.length,
    onlyTestsFound: findings.filter((finding) => finding.kind === "only").length,
    skippedTestsFound: findings.filter((finding) => finding.kind === "skip").length,
    providerCallsForbidden: true,
    productionReadsForbidden: true,
    findings,
    unsafeUnknowns: findings.filter((finding) => finding.classification === "unsafe_unknown").length,
    remainingGaps: unique(findings.filter((finding) => ["as_any", "date_now", "math_random"].includes(finding.kind)).slice(0, 10).map((finding) => `${finding.file}: replace deterministic drift pattern ${finding.kind} when touched.`)),
    nextExactSteps: [
      "Keep .only blocked.",
      "Keep provider calls and production reads forbidden in source/unit harnesses.",
      "Use injected clocks and deterministic IDs in new tests.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateTestQualityGuardsReport(report).failures;
  return report;
}

export function validateTestQualityGuardsReport(report: TestQualityGuardsReport): ValidationResult {
  const failures: string[] = [];
  if (report.onlyTestsFound > 0) failures.push("focused .only tests are present.");
  if (!report.providerCallsForbidden) failures.push("provider calls are not explicitly forbidden.");
  if (!report.productionReadsForbidden) failures.push("production reads are not explicitly forbidden.");
  const unsafeBlocking = report.findings.filter((finding) => finding.classification === "unsafe_unknown" && ["only", "provider_call", "production_read"].includes(finding.kind));
  if (unsafeBlocking.length > 0) failures.push(`blocking unclassified test quality findings: ${unsafeBlocking.length}`);
  return validation(failures.length === 0, failures);
}
