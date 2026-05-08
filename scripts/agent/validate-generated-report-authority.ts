import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";

import {
  GENERATED_REPORT_AUTHORITY_STATE_PATH,
  GENERATED_REPORT_DEFAULT_STALE_HOURS,
  GENERATED_REPORT_RUNTIME_FORBIDDEN_ROOTS,
  GENERATED_REPORT_SCAN_ROOTS,
  deriveGeneratedReportFreshness,
  isGeneratedReportPath,
  type GeneratedReportFreshness,
  type GeneratedReportMetadataSource,
} from "../../src/lib/generated-reports/generated-report-contract";
import {
  ROOT,
  nowIso,
  readJsonFile,
  readText,
  toAbsoluteRepoPath,
  walkDirectoryFiles,
  writeJsonFile,
  type Json,
} from "./shared";

type JsonRecord = Record<string, Json>;

type DoctrineRegistryEntry = {
  path: string;
  authorityLevel?: number;
  status?: string;
};

type GeneratedReportAuthorityEntry = {
  path: string;
  generatedAt: string;
  sourceCommit: string;
  status: string;
  freshness: GeneratedReportFreshness;
  staleAfterHours: number;
  metadataSource: GeneratedReportMetadataSource;
  missingEmbeddedFields: string[];
};

type GeneratedReportAuthorityDocument = {
  generatedAt: string;
  sourceCommit: string;
  status: "pass" | "fail";
  freshness: GeneratedReportFreshness;
  defaultStaleAfterHours: number;
  summary: {
    reportCount: number;
    staleCount: number;
    unknownFreshnessCount: number;
    runtimeViolationCount: number;
    doctrineOverrideViolationCount: number;
  };
  reports: GeneratedReportAuthorityEntry[];
  runtimeViolations: string[];
  doctrineOverrideViolations: string[];
  guidance: string[];
  failures: string[];
};

const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function readGitHeadCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

function listGeneratedReportFiles() {
  return GENERATED_REPORT_SCAN_ROOTS
    .flatMap((root) => walkDirectoryFiles(root))
    .filter((repoPath) => isGeneratedReportPath(repoPath))
    .filter((repoPath) => repoPath !== GENERATED_REPORT_AUTHORITY_STATE_PATH)
    .sort((left, right) => left.localeCompare(right));
}

function readJsonRecord(repoPath: string): JsonRecord | null {
  try {
    const parsed = readJsonFile<Json>(repoPath);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as JsonRecord;
  } catch {
    return null;
  }
}

function readStringField(record: JsonRecord | null, key: string) {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildReportEntry(
  repoPath: string,
  headCommit: string,
  nowMs: number,
): GeneratedReportAuthorityEntry {
  const record = readJsonRecord(repoPath);
  const modifiedAt = statSync(toAbsoluteRepoPath(repoPath)).mtime.toISOString();
  const embeddedGeneratedAt = readStringField(record, "generatedAt");
  const embeddedStatus = readStringField(record, "status");
  const embeddedSourceCommit = readStringField(record, "sourceCommit");
  const embeddedFreshness = readStringField(record, "freshness");

  const missingEmbeddedFields = [
    embeddedGeneratedAt ? null : "generatedAt",
    embeddedStatus ? null : "status",
    embeddedSourceCommit ? null : "sourceCommit",
    embeddedFreshness ? null : "freshness",
  ].filter((value): value is string => Boolean(value));

  const generatedAt = embeddedGeneratedAt ?? modifiedAt;
  const status = embeddedStatus ?? "snapshot";
  const sourceCommit = embeddedSourceCommit ?? headCommit;
  const freshness = embeddedFreshness === "fresh" || embeddedFreshness === "stale" || embeddedFreshness === "unknown"
    ? embeddedFreshness
    : deriveGeneratedReportFreshness({
      generatedAt,
      nowMs,
      staleAfterHours: GENERATED_REPORT_DEFAULT_STALE_HOURS,
    });

  let metadataSource: GeneratedReportMetadataSource = "embedded";
  if (missingEmbeddedFields.length > 0) {
    metadataSource = embeddedGeneratedAt || embeddedStatus ? "authority_manifest" : "filesystem_fallback";
  }

  return {
    path: repoPath,
    generatedAt,
    sourceCommit,
    status,
    freshness,
    staleAfterHours: GENERATED_REPORT_DEFAULT_STALE_HOURS,
    metadataSource,
    missingEmbeddedFields,
  };
}

function findRuntimeViolations() {
  const violations: string[] = [];
  const importPattern =
    /\b(?:import\s*\(\s*|require\(\s*|from\s+|readFileSync\(\s*|readText\(\s*|readJsonFile\(\s*)["'][^"']*agent\/(?:state|index|context)\//u;

  for (const root of GENERATED_REPORT_RUNTIME_FORBIDDEN_ROOTS) {
    for (const repoPath of walkDirectoryFiles(root).filter((candidate) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/u.test(candidate))) {
      const source = readText(repoPath);
      if (importPattern.test(source)) {
        violations.push(`${repoPath} must not import or read generated report artifacts from agent/.`);
      }
    }
  }

  return violations.sort((left, right) => left.localeCompare(right));
}

function findDoctrineOverrideViolations() {
  const violations: string[] = [];
  const doctrineRegistry = readJsonFile<{ entries?: DoctrineRegistryEntry[] }>("agent/context/doctrine-registry.json");
  for (const entry of doctrineRegistry.entries ?? []) {
    const normalizedPath = entry.path.replace(/\\/gu, "/");
    if (!isGeneratedReportPath(normalizedPath)) {
      continue;
    }

    if ((entry.authorityLevel ?? 99) < 6) {
      violations.push(`${normalizedPath} must remain authority level 6 or lower-priority snapshot evidence.`);
    }

    if (entry.status && entry.status !== "generated") {
      violations.push(`${normalizedPath} must stay classified as generated evidence, not ${entry.status}.`);
    }
  }

  return violations.sort((left, right) => left.localeCompare(right));
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} must include "${needle}".`);
  }
}

function main() {
  const headCommit = readGitHeadCommit();
  const now = nowIso();
  const nowMs = Date.parse(now);

  const reports = listGeneratedReportFiles().map((repoPath) => buildReportEntry(repoPath, headCommit, nowMs));
  const runtimeViolations = findRuntimeViolations();
  const doctrineOverrideViolations = findDoctrineOverrideViolations();

  for (const violation of runtimeViolations) {
    fail(violation);
  }
  for (const violation of doctrineOverrideViolations) {
    fail(violation);
  }

  const packageJson = readText("package.json");
  if (!packageJson.includes("\"check:generated-report-authority\": \"tsx scripts/agent/validate-generated-report-authority.ts\"")) {
    fail("package.json must expose check:generated-report-authority.");
  }

  const agentsSource = readText("AGENTS.md");
  requireIncludes(agentsSource, "Generated reports are evidence snapshots only", "AGENTS.md");
  requireIncludes(agentsSource, "check:generated-report-authority", "AGENTS.md");

  const readmeSource = readText("README.md");
  requireIncludes(readmeSource, "Generated reports are evidence snapshots only", "README.md");
  requireIncludes(readmeSource, "check:generated-report-authority", "README.md");

  const summary = {
    reportCount: reports.length,
    staleCount: reports.filter((report) => report.freshness === "stale").length,
    unknownFreshnessCount: reports.filter((report) => report.freshness === "unknown").length,
    runtimeViolationCount: runtimeViolations.length,
    doctrineOverrideViolationCount: doctrineOverrideViolations.length,
  };

  const document: GeneratedReportAuthorityDocument = {
    generatedAt: now,
    sourceCommit: headCommit,
    status: failures.length > 0 ? "fail" : "pass",
    freshness: "fresh",
    defaultStaleAfterHours: GENERATED_REPORT_DEFAULT_STALE_HOURS,
    summary,
    reports,
    runtimeViolations,
    doctrineOverrideViolations,
    guidance: [
      "Generated reports are evidence snapshots only and never runtime business truth.",
      "Reports older than 24 hours are stale unless a stricter or looser contract is explicitly added later.",
      "Runtime src/app, src/components, and src/lib/server business logic must not import or read agent-generated report artifacts.",
    ],
    failures,
  };

  writeJsonFile(GENERATED_REPORT_AUTHORITY_STATE_PATH, document as unknown as Json);

  if (failures.length > 0) {
    console.error("Generated report authority validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Generated report authority validation passed.");
}

main();
