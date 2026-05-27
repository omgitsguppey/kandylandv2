import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type ValidationResult = {
  ok: boolean;
  failures: string[];
  warnings: string[];
};

export const CONFIG_HARDENING_ROOT = process.cwd();

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
]);

export function repoPath(path: string) {
  return join(CONFIG_HARDENING_ROOT, path);
}

export function readText(path: string) {
  const fullPath = repoPath(path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

export function readJson<T>(path: string, fallback: T): T {
  try {
    const text = readText(path);
    return text ? JSON.parse(text) as T : fallback;
  } catch {
    return fallback;
  }
}

export function fileExists(path: string) {
  return existsSync(repoPath(path));
}

export function listFiles(paths: readonly string[], extensions?: readonly string[]) {
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
    const rel = relative(CONFIG_HARDENING_ROOT, absPath).replace(/\\/gu, "/");
    if (!extensions || extensions.some((extension) => rel.endsWith(extension))) files.push(rel);
  }

  for (const path of paths) walk(repoPath(path));
  return files.sort();
}

export function shortHead() {
  return readText(".git/HEAD").trim().startsWith("ref:")
    ? "resolved_by_validator"
    : "unknown";
}

export function classifyOwnerFromName(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("firebase") || lower.includes("firestore") || lower.includes("storage")) return "firebase";
  if (lower.includes("paypal") || lower.includes("payment")) return "payments";
  if (lower.includes("analytics") || lower.includes("ga_") || lower.includes("posthog")) return "analytics";
  if (lower.includes("admin")) return "admin";
  if (lower.includes("notify") || lower.includes("push") || lower.includes("fcm")) return "notifications";
  if (lower.includes("pwa") || lower.includes("service-worker")) return "pwa";
  if (lower.includes("release") || lower.includes("beta")) return "release";
  if (lower.includes("auth") || lower.includes("session")) return "auth";
  if (lower.includes("media") || lower.includes("image")) return "storage";
  return "repo_governance";
}

export function hasSecretLikeName(name: string) {
  return /(SECRET|PRIVATE|TOKEN|PASSWORD|KEY|CREDENTIAL|WEBHOOK)/iu.test(name);
}

export function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}
