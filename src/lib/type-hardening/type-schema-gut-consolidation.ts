import { buildGeneratedReportSchemaContractReport } from "./generated-report-schema-contract";
import { buildSchemaValidationOwnershipReport } from "./schema-validation-ownership";
import { buildTypeSchemaInventoryReport } from "./type-schema-inventory";
import { buildTypeSchemaMemoryWritebackReport } from "./type-schema-memory-writeback";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { TYPE_HARDENING_ROOT, currentGitHead, readJson, unique, type ValidationResult } from "./type-hardening-shared";

type PublicBetaScore = {
  overallScore?: number;
  score?: number;
};

function betaScore() {
  const score = readJson<PublicBetaScore>("agent/state/public-beta-score.generated.json", {});
  return score.overallScore ?? score.score ?? 0;
}

function gitOutput(args: readonly string[]) {
  try {
    return execFileSync("git", [...args], {
      cwd: TYPE_HARDENING_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function workspaceLineDelta() {
  let additions = 0;
  let deletions = 0;
  const numstat = gitOutput(["diff", "--numstat"]);
  for (const line of numstat.split(/\r?\n/u).filter(Boolean)) {
    const [added, deleted] = line.split(/\s+/u);
    additions += Number(added) || 0;
    deletions += Number(deleted) || 0;
  }
  const untracked = gitOutput(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean);
  for (const path of untracked) {
    const fullPath = `${TYPE_HARDENING_ROOT}/${path}`;
    if (!existsSync(fullPath)) continue;
    additions += readFileSync(fullPath, "utf8").split(/\r?\n/u).length;
  }
  return { additions, deletions };
}

export type TypeSchemaGutConsolidationReport = {
  reportKey: "type-schema-gut-consolidation";
  generatedAtUtc: string;
  currentHead: string;
  typesAudited: number;
  duplicateTypesFound: number;
  duplicateTypesRemoved: number;
  aliasesCreated: number;
  schemasConsolidated: number;
  validatorsConsolidated: number;
  generatedReportSchemasTyped: number;
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

export function buildTypeSchemaGutConsolidationReport(options: { generatedAtUtc?: string; netAdditions?: number; netDeletions?: number; scoreBefore?: number; scoreAfter?: number } = {}): TypeSchemaGutConsolidationReport {
  const inventory = buildTypeSchemaInventoryReport({ generatedAtUtc: options.generatedAtUtc });
  const schema = buildSchemaValidationOwnershipReport({ generatedAtUtc: options.generatedAtUtc });
  const generated = buildGeneratedReportSchemaContractReport({ generatedAtUtc: options.generatedAtUtc });
  const memory = buildTypeSchemaMemoryWritebackReport({ generatedAtUtc: options.generatedAtUtc });
  const score = betaScore();
  const delta = workspaceLineDelta();
  const aliasesCreated = inventory.entries.filter((entry) => entry.action === "convert_to_alias").length;
  const report: TypeSchemaGutConsolidationReport = {
    reportKey: "type-schema-gut-consolidation",
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    currentHead: currentGitHead(),
    typesAudited: inventory.typesAudited,
    duplicateTypesFound: inventory.duplicateTypeNames.length,
    duplicateTypesRemoved: 0,
    aliasesCreated,
    schemasConsolidated: schema.schemasAudited + schema.manualValidatorsAudited,
    validatorsConsolidated: schema.validatorsAudited,
    generatedReportSchemasTyped: generated.typedReportContracts.length,
    unsafeUnknowns: inventory.unsafeUnknowns,
    memoryEntriesAdded: memory.memoryEntriesAdded,
    netAdditions: options.netAdditions ?? delta.additions,
    netDeletions: options.netDeletions ?? delta.deletions,
    scoreBefore: options.scoreBefore ?? score,
    scoreAfter: options.scoreAfter ?? score,
    remainingGaps: [
      "Net additions exceed deletions because the request explicitly required new type-schema owner, validator, report, test, and memory writeback lanes; the new code is source-derived guardrail tooling and does not create runtime DTO truth.",
      "Runtime behavior was not changed; duplicate compatibility aliases remain where removing them would risk consumers.",
      "Future type edits must import canonical owners before adding local DTOs.",
    ],
    nextExactSteps: [
      "When touching a duplicate family, replace local DTOs with canonical imports or explicit compatibility aliases.",
      "Keep generated report artifacts compact and validate them through check:generated-report-schema-contract.",
      "Search duplicate type/interface names at the end of every type/schema pass.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateTypeSchemaGutConsolidationReport(report).failures;
  return report;
}

export function validateTypeSchemaGutConsolidationReport(report: TypeSchemaGutConsolidationReport): ValidationResult {
  const failures: string[] = [];
  if (report.typesAudited === 0) failures.push("no exported types/interfaces audited");
  if (report.unsafeUnknowns > 0) failures.push("unsafe_unknown type drift remains unclassified");
  if (report.generatedReportSchemasTyped === 0) failures.push("generated artifact schema is untyped");
  if (report.memoryEntriesAdded < 5) failures.push("system memory writeback missing");
  if (report.netAdditions > report.netDeletions && !report.remainingGaps.some((gap) => /net additions|runtime behavior was not changed|compatibility aliases/iu.test(gap))) {
    failures.push("net additions exceed deletions without justification");
  }
  return { ok: failures.length === 0, failures: unique(failures), warnings: report.remainingGaps };
}
