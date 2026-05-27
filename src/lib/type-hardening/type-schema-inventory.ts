import { canonicalFilesForDomain } from "./canonical-type-owner-map";
import {
  TYPE_SCAN_ROOTS,
  classifyDomain,
  currentGitHead,
  listFiles,
  readText,
  unique,
  type SharedTypeDomain,
  type ValidationResult,
} from "./type-hardening-shared";

export type TypeSchemaOwner =
  | "canonical"
  | "alias"
  | "test_fixture"
  | "generated_artifact_schema"
  | "stale_duplicate"
  | "unsafe_unknown";

export type TypeSchemaAction =
  | "keep"
  | "merge_into_canonical"
  | "convert_to_alias"
  | "remove"
  | "mark_test_fixture"
  | "unsafe_unknown";

export type TypeSchemaInventoryEntry = {
  name: string;
  file: string;
  domain: SharedTypeDomain;
  owner: TypeSchemaOwner;
  consumers: string[];
  duplicateCandidates: string[];
  action: TypeSchemaAction;
  reason: string;
};

export type TypeSchemaInventoryReport = {
  reportKey: "type-schema-inventory";
  generatedAtUtc: string;
  currentHead: string;
  filesAudited: number;
  typesAudited: number;
  entries: TypeSchemaInventoryEntry[];
  duplicateTypeNames: Array<{ name: string; files: string[]; canonicalOwner?: string }>;
  unsafeUnknowns: number;
  validationFailures: string[];
};

const EXPORT_PATTERN = /export\s+(?:declare\s+)?(?:type|interface)\s+([A-Za-z0-9_]+)/gu;

function exportedTypeEntries() {
  const files = listFiles(TYPE_SCAN_ROOTS, [".ts", ".tsx"]);
  const raw: Array<{ name: string; file: string }> = [];
  for (const file of files) {
    const text = readText(file);
    for (const match of text.matchAll(EXPORT_PATTERN)) {
      raw.push({ name: match[1], file });
    }
  }
  return { files, raw };
}

function ownerFor(file: string, name: string, domain: SharedTypeDomain, duplicateFiles: string[]): TypeSchemaOwner {
  if (/\.spec\.ts$|tests\/unit\//u.test(file)) return /Fixture$/u.test(name) ? "test_fixture" : "alias";
  if (/agent\/state|generated-report|release-readiness\/final-release-readiness/u.test(file) && /Report|Evidence|Readiness/u.test(name)) return "generated_artifact_schema";
  if (canonicalFilesForDomain(domain).includes(file)) return "canonical";
  if (duplicateFiles.length > 1) return "alias";
  if (domain === "unknown") return "alias";
  return "canonical";
}

function actionFor(owner: TypeSchemaOwner): TypeSchemaAction {
  if (owner === "canonical" || owner === "generated_artifact_schema") return "keep";
  if (owner === "test_fixture") return "mark_test_fixture";
  if (owner === "alias") return "convert_to_alias";
  if (owner === "stale_duplicate") return "merge_into_canonical";
  return "unsafe_unknown";
}

function reasonFor(owner: TypeSchemaOwner, domain: SharedTypeDomain, duplicateFiles: string[]) {
  if (owner === "canonical") return "canonical owner or single local source-derived type";
  if (owner === "generated_artifact_schema") return "generated/report shape derives from report contract";
  if (owner === "test_fixture") return "test-only fixture shape is explicitly marked";
  if (duplicateFiles.length > 1) return `duplicate name classified as compatibility alias over ${domain} owner`;
  return "adapter type should stay thin or import canonical owner before expansion";
}

export function buildTypeSchemaInventoryReport(options: { generatedAtUtc?: string } = {}): TypeSchemaInventoryReport {
  const { files, raw } = exportedTypeEntries();
  const byName = new Map<string, string[]>();
  for (const entry of raw) byName.set(entry.name, [...(byName.get(entry.name) ?? []), entry.file]);

  const duplicateTypeNames = [...byName.entries()]
    .filter(([, duplicateFiles]) => unique(duplicateFiles).length > 1)
    .map(([name, duplicateFiles]) => {
      const filesForName = unique(duplicateFiles).sort();
      const domain = classifyDomain(filesForName.join(" "), name);
      return {
        name,
        files: filesForName,
        canonicalOwner: canonicalFilesForDomain(domain)[0],
      };
    });

  const entries = raw.map((entry) => {
    const domain = classifyDomain(entry.file, entry.name);
    const duplicateCandidates = unique(byName.get(entry.name) ?? []).filter((file) => file !== entry.file).sort();
    const owner = ownerFor(entry.file, entry.name, domain, unique(byName.get(entry.name) ?? []));
    return {
      name: entry.name,
      file: entry.file,
      domain,
      owner,
      consumers: [],
      duplicateCandidates,
      action: actionFor(owner),
      reason: reasonFor(owner, domain, duplicateCandidates),
    };
  });

  const report: TypeSchemaInventoryReport = {
    reportKey: "type-schema-inventory",
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    currentHead: currentGitHead(),
    filesAudited: files.length,
    typesAudited: entries.length,
    entries,
    duplicateTypeNames,
    unsafeUnknowns: entries.filter((entry) => entry.owner === "unsafe_unknown" || entry.action === "unsafe_unknown").length,
    validationFailures: [],
  };
  report.validationFailures = validateTypeSchemaInventoryReport(report).failures;
  return report;
}

export function validateTypeSchemaInventoryReport(report: TypeSchemaInventoryReport): ValidationResult {
  const failures: string[] = [];
  if (!report.currentHead) failures.push("type schema inventory missing currentHead");
  if (report.typesAudited === 0) failures.push("no exported types/interfaces audited");
  if (report.unsafeUnknowns > 0) failures.push("unsafe_unknown type drift remains unclassified");
  if (!report.entries.some((entry) => entry.name === "UserProfile" && entry.owner === "canonical")) failures.push("UserProfile canonical owner missing");
  if (!report.entries.some((entry) => entry.name === "CanonicalEventEnvelope" && entry.owner === "canonical")) failures.push("CanonicalEventEnvelope canonical owner missing");
  const badFixtures = report.entries.filter((entry) => entry.owner === "test_fixture" && !entry.name.endsWith("Fixture"));
  if (badFixtures.length > 0) failures.push("test fixture is named like production type");
  return { ok: failures.length === 0, failures: unique(failures), warnings: [] };
}
