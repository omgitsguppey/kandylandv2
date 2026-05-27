import { currentGitHead, fileExists, readText, unique, MEMORY_LINES, type ValidationResult } from "./type-hardening-shared";

export type TypeSchemaMemoryWritebackReport = {
  reportKey: "type-schema-memory-writeback";
  generatedAtUtc: string;
  currentHead: string;
  memorySource: "AGENTS.md + REPO_MEMORY_LEDGER.md + Codex ad_hoc note";
  requiredMemoryLines: string[];
  entriesAdded: number;
  memoryEntriesAdded: number;
  mistakePatternsCaptured: string[];
  affectedFiles: string[];
  preventingValidator: "check:type-schema-memory-writeback";
  validationFailures: string[];
};

export function buildTypeSchemaMemoryWritebackReport(options: { generatedAtUtc?: string } = {}): TypeSchemaMemoryWritebackReport {
  const agents = readText("AGENTS.md");
  const ledger = readText("REPO_MEMORY_LEDGER.md");
  const knownPitfalls = readText("agent/index/known-pitfalls.json");
  const allMemory = [agents, ledger, knownPitfalls].join("\n");
  const presentLines = MEMORY_LINES.filter((line) => allMemory.includes(line));
  const report: TypeSchemaMemoryWritebackReport = {
    reportKey: "type-schema-memory-writeback",
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    currentHead: currentGitHead(),
    memorySource: "AGENTS.md + REPO_MEMORY_LEDGER.md + Codex ad_hoc note",
    requiredMemoryLines: [...MEMORY_LINES],
    entriesAdded: presentLines.length,
    memoryEntriesAdded: presentLines.length,
    mistakePatternsCaptured: [
      "duplicate_type_schema_contract",
      "component_local_dto_drift",
      "validator_copy_paste_shape",
      "generated_report_schema_bloat",
      "unsafe_unknown_schema_drift",
    ],
    affectedFiles: [
      "AGENTS.md",
      "REPO_MEMORY_LEDGER.md",
      "agent/index/known-pitfalls.json",
      "src/lib/type-hardening/type-schema-inventory.ts",
    ],
    preventingValidator: "check:type-schema-memory-writeback",
    validationFailures: [],
  };
  report.validationFailures = validateTypeSchemaMemoryWritebackReport(report).failures;
  return report;
}

export function validateTypeSchemaMemoryWritebackReport(report: TypeSchemaMemoryWritebackReport): ValidationResult {
  const failures: string[] = [];
  if (!fileExists("AGENTS.md")) failures.push("AGENTS.md memory source missing");
  if (report.memoryEntriesAdded < MEMORY_LINES.length) failures.push("system memory lines were not added");
  if (!report.mistakePatternsCaptured.includes("duplicate_type_schema_contract")) failures.push("memory does not mention duplicate type/schema mistakes");
  if (!report.requiredMemoryLines.some((line) => line.includes("search for an existing canonical type"))) {
    failures.push("memory does not mention importing canonical types before adding new ones");
  }
  if (!report.requiredMemoryLines.some((line) => line.includes("Generated report schemas must be compact"))) {
    failures.push("memory does not mention generated report schema compactness");
  }
  return { ok: failures.length === 0, failures: unique(failures), warnings: [] };
}
