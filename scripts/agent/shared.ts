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

function runGit(args: string[]) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
  });
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
  const stats = statSync(toAbsoluteRepoPath(repoPath));
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
  const tracked = runGit(["ls-files", "--cached", "--others", "--exclude-standard"])
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set(tracked)).sort();
}

export function listTrackedFiles() {
  return runGit(["ls-files"])
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .sort();
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
  return unique(
    Array.from(
      value.matchAll(/`([^`\n]+(?:\/[^`\n]+)+[^`\n]*)`/g),
      (match) => match[1].replace(/\\/g, "/"),
    ).filter((candidate) => !candidate.startsWith("http")),
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
