import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import { CANONICAL_TYPE_OWNER_MAP } from "@/lib/type-hardening/canonical-type-owner-map";
import { classifyDomain, type SharedTypeDomain, type ValidationResult } from "@/lib/type-hardening/type-hardening-shared";

export type { SharedTypeDomain, ValidationResult };

export const TEST_HARDENING_ROOT = process.cwd();
export const TEST_HARDENING_GENERATED_AT_UTC = "2026-05-27T00:00:00.000Z";

export const TEST_MEMORY_LINES = [
  "Before adding a test fixture, mock, validator, or QA harness, search for the canonical production contract and import it. Do not create test-only shapes that drift from source truth.",
  "A green test is not proof if the test uses stale fixtures, fake DTOs, or mocked behavior that bypasses canonical math, telemetry, role, cost, or source-of-funds rules.",
  "Every validator must have an owner lane, a package script, a unit test, and a retirement rule. If a newer lock supersedes a validator, retire or alias the old one instead of keeping both active.",
  "Mocks must declare whether they simulate source-only, runtime-like, provider-like, admin-like, or operator-only evidence. Mocks must never be treated as provider/runtime/admin proof.",
  "End every test/fixture pass by searching for duplicate fixtures, stale sample JSON, fantasy DTOs, obsolete validators, and generated artifacts larger than needed.",
] as const;

const SKIP_DIRS = new Set([".git", ".next", "coverage", "node_modules", "playwright-report", "test-results"]);

export function repoPath(path: string) {
  return join(TEST_HARDENING_ROOT, path);
}

function normalizePath(path: string) {
  return path.replace(/\\/gu, "/");
}

export function readText(path: string) {
  const fullPath = repoPath(path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

export function readJson<T>(path: string, fallback: T): T {
  try {
    const raw = readText(path);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeText(path: string, value: string) {
  const fullPath = repoPath(path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

export function listFiles(paths: readonly string[], extensions: readonly string[] = [".ts", ".tsx", ".json", ".md"]) {
  const files: string[] = [];

  function walk(absPath: string) {
    if (!existsSync(absPath)) return;
    const stat = statSync(absPath);
    if (stat.isDirectory()) {
      const name = absPath.split(/[\\/]/u).pop() || "";
      if (SKIP_DIRS.has(name)) return;
      for (const entry of readdirSync(absPath)) walk(join(absPath, entry));
      return;
    }
    const rel = normalizePath(relative(TEST_HARDENING_ROOT, absPath));
    if (extensions.some((extension) => rel.endsWith(extension))) files.push(rel);
  }

  for (const path of paths) walk(repoPath(path));
  return files.sort();
}

export function lineCount(path: string) {
  const text = readText(path);
  return text ? text.split(/\r?\n/u).length : 0;
}

export function countMatches(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].length;
}

export function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

export function currentGitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: TEST_HARDENING_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

function gitOutput(args: readonly string[]) {
  try {
    return execFileSync("git", [...args], {
      cwd: TEST_HARDENING_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export function currentDiffStats() {
  let additions = 0;
  let deletions = 0;
  for (const args of [["diff", "--numstat"], ["diff", "--cached", "--numstat"]] as const) {
    for (const line of gitOutput(args).split(/\r?\n/u).filter(Boolean)) {
      const [added, deleted] = line.split(/\s+/u);
      additions += Number.isFinite(Number(added)) ? Number(added) : 0;
      deletions += Number.isFinite(Number(deleted)) ? Number(deleted) : 0;
    }
  }
  for (const file of gitOutput(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean)) {
    additions += lineCount(normalizePath(file));
  }
  return { additions, deletions };
}

export function readPackageScripts() {
  const pkg = readJson<{ scripts?: Record<string, string> }>("package.json", {});
  return pkg.scripts ?? {};
}

export function packageScriptForCommand(command: string) {
  const scripts = readPackageScripts();
  return Object.entries(scripts).find(([, value]) => value.includes(command))?.[0] ?? null;
}

export function canonicalFilesForDomain(domain: SharedTypeDomain) {
  return CANONICAL_TYPE_OWNER_MAP.find((entry) => entry.domain === domain)?.canonicalFiles ?? [];
}

export function classifyTestDomain(path: string, name = "") {
  const fromPath = classifyDomain(path, name);
  return fromPath === "unknown" ? classifyDomain(name, path) : fromPath;
}

export function hasCanonicalImport(text: string, domain: SharedTypeDomain) {
  if (/@\/(types|lib)\//u.test(text) || /\.\.\/\.\.\/src\/(types|lib)\//u.test(text)) return true;
  return canonicalFilesForDomain(domain).some((file) => text.includes(file) || text.includes(file.replace(/^src\//u, "@/")));
}

export function validation(ok: boolean, failures: string[] = [], warnings: string[] = []): ValidationResult {
  return { ok: ok && failures.length === 0, failures: unique(failures), warnings: unique(warnings) };
}

export function writeCompactJson(path: string, value: unknown) {
  writeText(path, `${JSON.stringify(value)}\n`);
}
