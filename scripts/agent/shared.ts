import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const ROOT = process.cwd();
export const AGENT_DIR = path.join(ROOT, "agent");
export const AGENT_INDEX_DIR = path.join(AGENT_DIR, "index");
export const AGENT_SCHEMA_DIR = path.join(AGENT_DIR, "schemas");
export const AGENT_STATE_DIR = path.join(AGENT_DIR, "state");
export const AGENT_PROMPTS_DIR = path.join(AGENT_DIR, "prompts");

export const INTERNAL_DIRECTORIES = ["src", "functions/src", "scripts", "tests"] as const;
export const FILE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"] as const;
const FALLBACK_DISCOVERY_ROOTS = ["."] as const;
const FALLBACK_EXCLUDED_PARTS = [
  ".git",
  ".firebase",
  ".vercel",
  "node_modules",
  ".next",
  "coverage",
  "playwright-report",
  "test-results",
  "lighthouse-results",
  "storybook-static",
  "dist",
  "build",
  "out",
  ".turbo",
  ".cache",
  "logs",
  "tmp",
] as const;

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean";
  enum?: Array<string | number | boolean | null>;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  additionalProperties?: boolean;
  minItems?: number;
};

export type GitToolStatus = "available" | "missing" | "error";
export type SourceFileDiscovery = "git" | "repo_inventory" | "filesystem";
export type CurrentHeadSource = "git" | "repo_inventory" | "generated_artifact" | "unknown";

export type RepoToolchainState = {
  gitStatus: GitToolStatus;
  sourceFileDiscovery: SourceFileDiscovery;
  currentHead: string | null;
  currentHeadSource: CurrentHeadSource;
  workingTreeStatus: string[] | "unavailable_git_missing";
  toolingDegraded: boolean;
  degradationReason: string | null;
};

function summarizeCommandError(error: unknown) {
  const candidate = error as {
    code?: unknown;
    errno?: unknown;
    syscall?: unknown;
    path?: unknown;
    status?: unknown;
    message?: unknown;
    stderr?: unknown;
  };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const syscall = typeof candidate.syscall === "string" ? candidate.syscall : "";
  const executable = typeof candidate.path === "string" ? candidate.path : "git";
  const message = typeof candidate.message === "string" ? candidate.message : "";
  const stderr = Buffer.isBuffer(candidate.stderr) ? candidate.stderr.toString("utf8") : "";
  const status = typeof candidate.status === "number" ? `status ${candidate.status}` : "";
  const firstLine = (stderr || message || status || "command failed").split(/\r?\n/u)[0]?.trim() || "command failed";
  if (code || syscall) return [syscall || "spawnSync", executable, code || firstLine].filter(Boolean).join(" ");
  return firstLine;
}

export function runGit(args: string[]) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

export function tryRunGit(args: string[]) {
  if (process.env.KANDYDROPS_DISABLE_GIT === "1") {
    return { ok: false as const, stdout: "", errorSummary: "spawnSync git ENOENT" };
  }
  try {
    return { ok: true as const, stdout: runGit(args).trim(), errorSummary: null };
  } catch (error) {
    return { ok: false as const, stdout: "", errorSummary: summarizeCommandError(error) };
  }
}

function normalizeRepoPath(repoPath: string) {
  return repoPath.replace(/\\/g, "/").replace(/^\.\//u, "").trim();
}

function shouldSkipFallbackPath(repoPath: string) {
  const normalized = normalizeRepoPath(repoPath);
  return FALLBACK_EXCLUDED_PARTS.some((part) => normalized === part || normalized.includes(`/${part}/`) || normalized.startsWith(`${part}/`));
}

function repoInventoryFiles() {
  const inventoryPath = "agent/index/repo-inventory.json";
  if (!fileExists(inventoryPath)) return [];
  try {
    const parsed = readJsonFile<{
      reportCompleteness?: unknown;
      totalFindingCount?: unknown;
      omittedFindingCount?: unknown;
      items?: Array<{ path?: unknown }>;
    }>(inventoryPath);
    if (typeof parsed.reportCompleteness === "string") {
      const completeInventory = parsed.reportCompleteness === "complete"
        && parsed.omittedFindingCount === 0
        && typeof parsed.totalFindingCount === "number"
        && parsed.totalFindingCount === (parsed.items ?? []).length;
      if (!completeInventory) return [];
    }
    return (parsed.items ?? [])
      .map((item) => typeof item.path === "string" ? normalizeRepoPath(item.path) : "")
      .filter((repoPath) => repoPath && !shouldSkipFallbackPath(repoPath) && fileExists(repoPath))
      .sort();
  } catch {
    return [];
  }
}

function walkFallbackFilesFromRoot(directory: string, results: string[] = []) {
  const absoluteDirectory = toAbsoluteRepoPath(directory);
  if (!existsSync(absoluteDirectory)) return results;
  for (const entry of readdirSync(absoluteDirectory)) {
    const absolutePath = path.join(absoluteDirectory, entry);
    const repoPath = toRepoPath(absolutePath);
    if (shouldSkipFallbackPath(repoPath)) continue;
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walkFallbackFilesFromRoot(repoPath, results);
      continue;
    }
    results.push(repoPath);
  }
  return results;
}

function filesystemFallbackFiles() {
  return Array.from(new Set(FALLBACK_DISCOVERY_ROOTS.flatMap((root) => walkFallbackFilesFromRoot(root))))
    .filter((repoPath) => !shouldSkipFallbackPath(repoPath))
    .sort();
}

function splitLines(output: string) {
  return output
    .split(/\r?\n/u)
    .map((entry) => normalizeRepoPath(entry))
    .filter(Boolean);
}

function readCurrentHeadFromArtifacts(): { currentHead: string | null; source: CurrentHeadSource } {
  for (const repoPath of [
    "agent/index/repo-inventory.json",
    "agent/state/public-beta-score.generated.json",
    "agent/state/generated-report-authority.generated.json",
  ]) {
    if (!fileExists(repoPath)) continue;
    try {
      const parsed = readJsonFile<Record<string, unknown>>(repoPath);
      const currentHead = typeof parsed.currentHead === "string"
        ? parsed.currentHead
        : typeof parsed.sourceCommit === "string"
          ? parsed.sourceCommit
          : null;
      if (currentHead) {
        return {
          currentHead,
          source: repoPath.startsWith("agent/index/") ? "repo_inventory" : "generated_artifact",
        };
      }
    } catch {
      // Ignore malformed generated artifacts; they cannot establish current-head truth.
    }
  }
  return { currentHead: null, source: "unknown" };
}

export function readRepoToolchainState(): RepoToolchainState {
  const gitHead = tryRunGit(["rev-parse", "HEAD"]);
  const gitStatus: GitToolStatus = gitHead.ok ? "available" : /ENOENT|not recognized|not found|spawnSync git|spawn git/iu.test(gitHead.errorSummary ?? "")
    ? "missing"
    : "error";
  const gitFiles = gitStatus === "available" ? tryRunGit(["ls-files"]) : { ok: false as const, stdout: "", errorSummary: gitHead.errorSummary };
  const inventoryFiles = gitFiles.ok ? [] : repoInventoryFiles();
  const filesystemFiles = gitFiles.ok || inventoryFiles.length > 0 ? [] : filesystemFallbackFiles();
  const sourceFileDiscovery: SourceFileDiscovery = gitFiles.ok ? "git" : inventoryFiles.length > 0 ? "repo_inventory" : "filesystem";
  const fallbackHead = gitHead.ok ? { currentHead: gitHead.stdout || null, source: "git" as const } : readCurrentHeadFromArtifacts();
  const statusOutput = gitStatus === "available"
    ? tryRunGit(["status", "--short"])
    : { ok: false as const, stdout: "", errorSummary: gitHead.errorSummary };
  const workingTreeStatus = statusOutput.ok ? splitLines(statusOutput.stdout) : "unavailable_git_missing";
  const degradationReason = gitStatus === "available"
    ? null
    : gitHead.errorSummary ?? "git unavailable";

  return {
    gitStatus,
    sourceFileDiscovery,
    currentHead: fallbackHead.currentHead,
    currentHeadSource: fallbackHead.source,
    workingTreeStatus,
    toolingDegraded: gitStatus !== "available" || sourceFileDiscovery !== "git",
    degradationReason,
  };
}

export function discoverRepoFiles() {
  const gitFiles = tryRunGit(["ls-files"]);
  if (gitFiles.ok) {
    return {
      files: splitLines(gitFiles.stdout).sort(),
      sourceFileDiscovery: "git" as const,
      gitStatus: "available" as const,
      toolingDegraded: false,
      degradationReason: null,
    };
  }
  const inventoryFiles = repoInventoryFiles();
  if (inventoryFiles.length > 0) {
    return {
      files: inventoryFiles,
      sourceFileDiscovery: "repo_inventory" as const,
      gitStatus: /ENOENT|not recognized|not found|spawnSync git|spawn git/iu.test(gitFiles.errorSummary ?? "") ? "missing" as const : "error" as const,
      toolingDegraded: true,
      degradationReason: gitFiles.errorSummary ?? "git unavailable",
    };
  }
  return {
    files: filesystemFallbackFiles(),
    sourceFileDiscovery: "filesystem" as const,
    gitStatus: /ENOENT|not recognized|not found|spawnSync git|spawn git/iu.test(gitFiles.errorSummary ?? "") ? "missing" as const : "error" as const,
    toolingDegraded: true,
    degradationReason: gitFiles.errorSummary ?? "git unavailable",
  };
}

export function listWorkingTreeFiles() {
  const state = readRepoToolchainState();
  return Array.isArray(state.workingTreeStatus)
    ? state.workingTreeStatus.map((line) => line.replace(/^[ MARCUD?!]{1,2}\s+/u, "").trim()).filter(Boolean)
    : [];
}

export function nowIso() {
  return new Date().toISOString();
}

export function ensureDirectory(directory: string) {
  mkdirSync(directory, { recursive: true });
}

export function toRepoPath(absolutePath: string) {
  return path.relative(ROOT, absolutePath).replace(/\\/g, "/");
}

export function toAbsoluteRepoPath(repoPath: string) {
  return path.resolve(ROOT, repoPath);
}

export function readText(repoPath: string) {
  return readFileSync(toAbsoluteRepoPath(repoPath), "utf8");
}

export function readFileHash(repoPath: string) {
  const content = readFileSync(toAbsoluteRepoPath(repoPath));
  return crypto.createHash("sha1").update(content).digest("hex").slice(0, 12);
}

export function readFileModifiedMarker(repoPath: string) {
  const absolutePath = toAbsoluteRepoPath(repoPath);
  if (!existsSync(absolutePath)) {
    return "missing";
  }

  const stats = statSync(absolutePath);
  return `${Math.round(stats.mtimeMs)}:${readFileHash(repoPath)}`;
}

export function readJsonFile<T>(repoPath: string) {
  return JSON.parse(readText(repoPath)) as T;
}

export function writeJsonFile(repoPath: string, value: Json) {
  const absolutePath = toAbsoluteRepoPath(repoPath);
  ensureDirectory(path.dirname(absolutePath));
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeTextFile(repoPath: string, value: string) {
  const absolutePath = toAbsoluteRepoPath(repoPath);
  ensureDirectory(path.dirname(absolutePath));
  writeFileSync(absolutePath, value, "utf8");
}

export function fileExists(repoPath: string) {
  return existsSync(toAbsoluteRepoPath(repoPath));
}

export function listRepoFiles() {
  const gitFiles = tryRunGit(["ls-files", "--cached", "--others", "--exclude-standard"]);
  const tracked = gitFiles.ok ? splitLines(gitFiles.stdout) : discoverRepoFiles().files;

  return Array.from(new Set(tracked)).sort();
}

export function listTrackedFiles() {
  return discoverRepoFiles().files;
}

export function listRootFiles() {
  return readdirSync(ROOT)
    .map((entry) => path.join(ROOT, entry))
    .filter((absolutePath) => existsSync(absolutePath) && statSync(absolutePath).isFile())
    .map((absolutePath) => toRepoPath(absolutePath))
    .sort();
}

export function walkDirectoryFiles(directory: string, results: string[] = []) {
  const absoluteDirectory = toAbsoluteRepoPath(directory);
  if (!existsSync(absoluteDirectory)) {
    return results;
  }

  for (const entry of readdirSync(absoluteDirectory)) {
    const absolutePath = path.join(absoluteDirectory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      walkDirectoryFiles(toRepoPath(absolutePath), results);
      continue;
    }

    results.push(toRepoPath(absolutePath));
  }

  return results.sort();
}

export function walkCodeFiles() {
  const nested = INTERNAL_DIRECTORIES.flatMap((directory) =>
    walkDirectoryFiles(directory).filter((repoPath) =>
      FILE_EXTENSIONS.some((extension) => repoPath.endsWith(extension)),
    ),
  );

  const rootCodeFiles = listRootFiles().filter((repoPath) =>
    FILE_EXTENSIONS.some((extension) => repoPath.endsWith(extension)),
  );

  return Array.from(new Set([...rootCodeFiles, ...nested])).sort();
}

export function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9/_-]+/)
        .flatMap((token) => token.split(/[/_-]+/))
        .map((token) => token.trim())
        .filter((token) => token.length > 1),
    ),
  );
}

export function includesAnyToken(haystack: string, tokens: string[]) {
  const normalized = haystack.toLowerCase();
  return tokens.some((token) => normalized.includes(token));
}

export function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function toStableId(namespace: string, value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/[\\/]+/g, "__")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return `${namespace}__${normalized}`;
}

export function compact<T>(values: Array<T | null | undefined | false>) {
  return values.filter((value): value is T => Boolean(value));
}

export function stableSortBy<T>(values: T[], ranker: (value: T) => string | number) {
  return [...values].sort((left, right) => {
    const leftRank = ranker(left);
    const rightRank = ranker(right);
    if (leftRank < rightRank) return -1;
    if (leftRank > rightRank) return 1;
    return 0;
  });
}

export function extractRepoPaths(value: string) {
  const inlineCodeSpans = Array.from(
    value.matchAll(/`([^`\r\n]+)`/gu),
    (match) => match[1].trim(),
  );

  return unique(
    inlineCodeSpans
      .filter((candidate) => /[\\/]/u.test(candidate))
      .filter((candidate) => !candidate.toLowerCase().startsWith("http"))
      .map((candidate) => normalizeRepoPath(candidate).replace(/^\/+/, ""))
      .filter((candidate) => {
        if (!candidate || /\s/u.test(candidate)) return false;
        const [rootSegment] = candidate.split("/");
        return Boolean(rootSegment)
          && rootSegment !== "."
          && rootSegment !== ".."
          && rootSegment !== ".git"
          && !FALLBACK_EXCLUDED_PARTS.some((excluded) => excluded === rootSegment)
          && fileExists(rootSegment);
      }),
  ).sort();
}

export function getPackageScripts(repoPath: string) {
  const packageJson = readJsonFile<{ scripts?: Record<string, string> }>(repoPath);
  return packageJson.scripts ?? {};
}

function validateSchemaNode(schema: JsonSchema, value: unknown, pointer: string, errors: string[]) {
  if (schema.enum && !schema.enum.includes(value as never)) {
    errors.push(`${pointer}: expected one of ${schema.enum.join(", ")}`);
    return;
  }

  if (!schema.type) {
    return;
  }

  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${pointer}: expected array`);
      return;
    }

    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push(`${pointer}: expected at least ${schema.minItems} items`);
    }

    if (schema.items) {
      value.forEach((entry, index) => validateSchemaNode(schema.items as JsonSchema, entry, `${pointer}[${index}]`, errors));
    }
    return;
  }

  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${pointer}: expected object`);
      return;
    }

    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in record)) {
        errors.push(`${pointer}.${key}: missing required property`);
      }
    }

    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in record) {
        validateSchemaNode(childSchema, record[key], `${pointer}.${key}`, errors);
      }
    }

    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(record)) {
        if (!(key in schema.properties)) {
          errors.push(`${pointer}.${key}: additional properties are not allowed`);
        }
      }
    }

    return;
  }

  if (schema.type === "string") {
    if (typeof value !== "string") {
      errors.push(`${pointer}: expected string`);
    }
    return;
  }

  if (schema.type === "boolean") {
    if (typeof value !== "boolean") {
      errors.push(`${pointer}: expected boolean`);
    }
    return;
  }

  if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`${pointer}: expected number`);
    }
    return;
  }

  if (schema.type === "integer") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      errors.push(`${pointer}: expected integer`);
    }
  }
}

export function validateWithSchema(schemaRepoPath: string, value: Json) {
  const schema = readJsonFile<JsonSchema>(schemaRepoPath);
  const errors: string[] = [];
  validateSchemaNode(schema, value, "$", errors);

  if (errors.length > 0) {
    throw new Error(`Schema validation failed for ${schemaRepoPath}\n${errors.join("\n")}`);
  }
}

export function readSchema(schemaName: string) {
  return readJsonFile<JsonSchema>(`agent/schemas/${schemaName}.schema.json`);
}

export function createMetadata(source: string[]) {
  return {
    generatedAt: nowIso(),
    truthOrder: [
      "verified_runtime_code",
      "verified_configuration",
      "verified_command_output",
      "FULL_SCALE_CODEBASE_AUDIT.md",
      "REPO_MEMORY_LEDGER.md",
      "EVERY_FILE_FUNCTION_CHECKLIST.md",
      "AGENTS.md_and_workflow_notes",
      "prior_chat_context",
    ],
    source,
  };
}
