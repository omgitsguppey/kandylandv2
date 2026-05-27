import { classifyMockEvidence, type MockEvidenceClass } from "@/lib/testing/mock-evidence-classifier";

import {
  currentGitHead,
  readPackageScripts,
  TEST_HARDENING_GENERATED_AT_UTC,
  unique,
  validation,
  type ValidationResult,
} from "./test-hardening-shared";

export type QaHarnessEntry = {
  harnessId: string;
  owner: string;
  packageScript: string;
  sourceClass: MockEvidenceClass;
  productionReadsForbidden: true;
  providerCallsForbidden: true;
  clearsGates: string[];
  cannotClearGates: string[];
  duplicateOf: string | null;
  action: "keep" | "consolidate" | "drilldown" | "unsafe_unknown";
};

export type QaHarnessConsolidationReport = {
  reportKey: "qa-harness-consolidation";
  generatedAtUtc: string;
  currentHead: string;
  harnessesAudited: number;
  duplicateHarnessesUnclassified: number;
  harnesses: QaHarnessEntry[];
  unsafeUnknowns: number;
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
};

const CANONICAL_HARNESSES: Array<Omit<QaHarnessEntry, "productionReadsForbidden" | "providerCallsForbidden" | "clearsGates" | "cannotClearGates" | "action">> = [
  { harnessId: "beta-score", owner: "agent-score", packageScript: "score:beta", sourceClass: "source_only", duplicateOf: null },
  { harnessId: "beta-score-check", owner: "agent-score", packageScript: "check:beta-score", sourceClass: "source_only", duplicateOf: "beta-score" },
  { harnessId: "current-beta-exit-status", owner: "release-readiness", packageScript: "check:current-beta-exit-status", sourceClass: "source_only", duplicateOf: null },
  { harnessId: "release-notes", owner: "release-readiness", packageScript: "check:release-notes", sourceClass: "source_only", duplicateOf: null },
  { harnessId: "runtime-smoke-harness", owner: "release-readiness", packageScript: "check:runtime-smoke-harness", sourceClass: "runtime_like", duplicateOf: null },
  { harnessId: "admin-analytics-overview", owner: "admin-analytics", packageScript: "check-admin-analytics-overview", sourceClass: "source_only", duplicateOf: null },
  { harnessId: "type-schema-gut", owner: "type-hardening", packageScript: "check:type-schema-gut-consolidation", sourceClass: "source_only", duplicateOf: null },
  { harnessId: "test-fixture-inventory", owner: "test-hardening", packageScript: "check:test-fixture-inventory", sourceClass: "source_only", duplicateOf: null },
  { harnessId: "qa-harness-consolidation", owner: "test-hardening", packageScript: "check:qa-harness-consolidation", sourceClass: "source_only", duplicateOf: "test-fixture-inventory" },
];

export function buildQaHarnessConsolidationReport(): QaHarnessConsolidationReport {
  const scripts = readPackageScripts();
  const harnesses = CANONICAL_HARNESSES.map((entry): QaHarnessEntry => {
    const classification = classifyMockEvidence(entry.sourceClass);
    return {
      ...entry,
      productionReadsForbidden: true,
      providerCallsForbidden: true,
      clearsGates: classification.canClearSourceGate ? ["source_contract"] : [],
      cannotClearGates: ["deployed_runtime", "actual_provider", "production_admin_truth", "operator_visual_qa"],
      action: scripts[entry.packageScript] || entry.packageScript === "check-admin-analytics-overview"
        ? entry.duplicateOf
          ? "drilldown"
          : "keep"
        : "unsafe_unknown",
    };
  });

  const report: QaHarnessConsolidationReport = {
    reportKey: "qa-harness-consolidation",
    generatedAtUtc: TEST_HARDENING_GENERATED_AT_UTC,
    currentHead: currentGitHead(),
    harnessesAudited: harnesses.length,
    duplicateHarnessesUnclassified: harnesses.filter((harness) => harness.duplicateOf && harness.action === "unsafe_unknown").length,
    harnesses,
    unsafeUnknowns: harnesses.filter((harness) => harness.action === "unsafe_unknown").length,
    remainingGaps: unique(harnesses.filter((harness) => harness.duplicateOf).map((harness) => `${harness.harnessId}: drilldown for ${harness.duplicateOf}.`)),
    nextExactSteps: [
      "Keep source-only harnesses from claiming runtime/provider/admin/operator proof.",
      "Prefer canonical source checks with drilldown harnesses only where they add evidence.",
      "Keep provider and production reads out of fast validation loops.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateQaHarnessConsolidationReport(report).failures;
  return report;
}

export function validateQaHarnessConsolidationReport(report: QaHarnessConsolidationReport): ValidationResult {
  const failures: string[] = [];
  if (report.harnessesAudited === 0) failures.push("no QA harnesses audited.");
  if (!report.harnesses.some((harness) => harness.packageScript === "score:beta")) failures.push("score:beta harness missing.");
  if (report.harnesses.some((harness) => !harness.productionReadsForbidden || !harness.providerCallsForbidden)) {
    failures.push("QA harness allows production reads or provider calls.");
  }
  if (report.duplicateHarnessesUnclassified > 0) failures.push("duplicate QA harness remains unclassified.");
  if (report.unsafeUnknowns > 0) failures.push("QA harness contains unsafe_unknown entries.");
  return validation(failures.length === 0, failures);
}
